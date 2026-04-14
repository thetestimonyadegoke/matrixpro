import powerbi from "powerbi-visuals-api";
import { TreeNode, FlattenedNode, buildRowTree, buildColumnTree, flattenTree, flattenColumnTree } from "./tree";
import { generateCellKey, generateRowKey } from "./keys";
import { VisualSettings } from "../settings/settings";
import { parseCalculatedMeasures, computeCalculatedMeasures, CalculatedMeasureDefinition } from "../calculations/calculatedMeasures";
import { applyCalculatedRows, CalculatedRowDefinition } from "../calculations/calculatedRows";
import { FormulaEngine } from "../calculations/FormulaEngine";

export interface MeasureInfo {
  index: number;
  name: string;
  format: string;
  queryName: string;
}

export interface CellValue {
  value: number | null;
  formattedValue: string;
  measureIndex: number;
  rowKey: string;
  colKey: string;
  isCalculated?: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface MatrixModel {
  rowTree: TreeNode | null;
  columnTree: TreeNode | null;
  flattenedRows: FlattenedNode[];
  flattenedColumns: FlattenedNode[];
  measures: MeasureInfo[];
  cellMap: Map<string, CellValue>;
  rowExpandedState: Map<string, boolean>;
  columnExpandedState: Map<string, boolean>;
  hasData: boolean;
  hasRows: boolean;
  hasValues: boolean;
  rowLevelCount: number;
  columnLevelCount: number;
  sparklineMeasureIndex: number;
  // Store full tree data for rollup calculations when collapsed
  fullRowTree?: TreeNode | null;
  fullColumnTree?: TreeNode | null;
}

export interface DataModelBuilderOptions {
  dataView: powerbi.DataView | undefined;
  settings: VisualSettings;
  // Relax identity and selection id typing to avoid dependency on SDK-internal types
  selectionIdBuilder: (identity: any) => any | undefined;
  rowExpandedState: Map<string, boolean>;
  columnExpandedState: Map<string, boolean>;
}

export function buildMatrixModel(options: DataModelBuilderOptions): MatrixModel {
  const { dataView, settings, selectionIdBuilder, rowExpandedState, columnExpandedState } = options;

  const emptyModel: MatrixModel = {
    rowTree: null,
    columnTree: null,
    flattenedRows: [],
    flattenedColumns: [],
    measures: [],
    cellMap: new Map(),
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
    hasData: false,
    hasRows: false,
    hasValues: false,
    rowLevelCount: 0,
    columnLevelCount: 0,
    sparklineMeasureIndex: 0,
  };

  if (!dataView || !dataView.matrix) {
    return emptyModel;
  }

  const matrix = dataView.matrix;
  const rows = matrix.rows;
  const columns = matrix.columns;
  const valueSources = matrix.valueSources || [];

  const hasRows = rows && rows.root && rows.root.children && rows.root.children.length > 0;
  const hasValues = valueSources.length > 0;

  if (!hasRows || !hasValues) {
    return {
      ...emptyModel,
      hasRows,
      hasValues,
    };
  }

  const measures: MeasureInfo[] = valueSources.map((source: powerbi.DataViewMetadataColumn, index: number) => ({
    index,
    name: source.displayName || `Measure ${index + 1}`,
    format: source.format || "",
    queryName: source.queryName || "",
  }));

  let sparklineMeasureIndex = 0;
  const sparklineRole = dataView.metadata.columns.find((c: powerbi.DataViewMetadataColumn) => c.roles && c.roles["SparklineMeasure"]);
  if (sparklineRole) {
    const idx = valueSources.findIndex((v: powerbi.DataViewMetadataColumn) => v.queryName === sparklineRole.queryName);
    if (idx >= 0) sparklineMeasureIndex = idx;
  }

  const rowLevelSources = rows.levels?.map((l: powerbi.DataViewHierarchyLevel) => l.sources[0]) || [];
  const columnLevelSources = columns?.levels?.map((l: powerbi.DataViewHierarchyLevel) => l.sources[0]) || [];

  const rowTree = buildRowTree(rows.root, rowLevelSources, selectionIdBuilder);
  const columnTree = columns?.root
    ? buildColumnTree(columns.root, columnLevelSources)
    : createDefaultColumnTree();

  const hiddenRowLevels = JSON.parse(settings.totals.rowSubtotalLevels || "[]");
  const flattenedRows = flattenTree(
    rowTree,
    rowExpandedState,
    settings.totals.showRowSubtotals,
    settings.totals.subtotalPosition,
    hiddenRowLevels
  );

  const hiddenColLevels = JSON.parse(settings.totals.colSubtotalLevels || "[]");
  const flattenedColumns = flattenColumnTree(
    columnTree,
    columnExpandedState,
    settings.totals.showColumnSubtotals,
    settings.totals.subtotalPosition,
    measures.length,
    hiddenColLevels
  );

  const cellMap = buildCellMap(rows.root, columnTree, measures);

  // 1. Calculate Measures (Step 1: Parse and Validate)
  const calcMeasureDefs: CalculatedMeasureDefinition[] = JSON.parse(settings.calculations.measures || "[]");
  const baseMeasureNames = measures.map(m => m.name);
  const calcMeasureStates = parseCalculatedMeasures(calcMeasureDefs, baseMeasureNames);

  // 2. Compute Measures
  const { calculatedCellMap, calculatedMeasures } = computeCalculatedMeasures(
    calcMeasureStates,
    measures,
    cellMap,
    flattenedRows.map(r => r.key),
    flattenedColumns.map(c => c.key)
  );

  // Merge base cells with calculated cells
  for (const [key, value] of calculatedCellMap) {
    cellMap.set(key, value);
  }

  // Combine measures lists
  const allMeasures = [...measures, ...calculatedMeasures];

  // 3. Calculate Rows
  const calcRowDefs: CalculatedRowDefinition[] = JSON.parse(settings.calculations.rows || "[]");

  const { rows: finalRows, cellMap: finalCellMap } = applyCalculatedRows(
    flattenedRows,
    cellMap,
    flattenedColumns,
    allMeasures,
    calcRowDefs
  );

  // 4. Apply Manual Overrides (Edits, Renames, Order)
  const { rows: overridenRows, cellMap: overridenCellMap } = applyManualOverrides(
    finalRows,
    finalCellMap,
    settings,
    allMeasures,
    flattenedColumns
  );

  // 5. Hierarchy Rollups: ensure parent nodes aggregate child values from FULL tree
  applyHierarchyRollupsFromTree(overridenRows, overridenCellMap, allMeasures, rowTree, columnTree, flattenedColumns);

  return {
    rowTree,
    columnTree,
    flattenedRows: overridenRows,
    flattenedColumns,
    measures: allMeasures,
    cellMap: overridenCellMap,
    rowExpandedState,
    columnExpandedState,
    hasData: true,
    hasRows: true,
    hasValues: true,
    rowLevelCount: rowLevelSources.length,
    columnLevelCount: columnLevelSources.length,
    sparklineMeasureIndex,
    // Store full trees for client-side rollup access
    fullRowTree: rowTree,
    fullColumnTree: columnTree,
  };
}

function createDefaultColumnTree(): TreeNode {
  const implicit: TreeNode = {
    key: "col:implicit",
    label: "",
    value: "",
    level: 1,
    path: [],
    children: [] as TreeNode[],
    isExpanded: true,
    isLeaf: true,
    isSubtotal: false,
    isGrandTotal: false,
  };

  return {
    key: "col:root",
    label: "",
    value: undefined,
    level: 0,
    path: [],
    children: [implicit],
    isExpanded: true,
    isLeaf: false,
    isSubtotal: false,
    isGrandTotal: false,
  };
}

function buildCellMap(
  rowRoot: powerbi.DataViewMatrixNode,
  columnTree: TreeNode,
  measures: MeasureInfo[]
): Map<string, CellValue> {
  const cellMap = new Map<string, CellValue>();
  traverseRowsForCells(rowRoot, columnTree, measures, cellMap, []);
  return cellMap;
}

function traverseRowsForCells(
  rowNode: powerbi.DataViewMatrixNode,
  columnTree: TreeNode,
  measures: MeasureInfo[],
  cellMap: Map<string, CellValue>,
  rowPath: powerbi.PrimitiveValue[]
): void {
  const currentRowPath = rowNode.value !== undefined ? [...rowPath, rowNode.value] : rowPath;

  const isSubtotal = (rowNode as any).isSubtotal === true;
  const baseKeyPath: any[] = currentRowPath.length > 0 ? (currentRowPath as any[]) : ["root"];
  const keyedPath: any[] = isSubtotal
    ? [...baseKeyPath, (currentRowPath.length === 0 ? "__grand_total" : "__subtotal")]
    : baseKeyPath;

  const rowKey = generateRowKey(keyedPath as (string | number)[]);

  if (rowNode.values) {
    extractCellValues(rowNode.values, rowKey, columnTree, measures, cellMap);
  }

  if (rowNode.children) {
    for (const child of rowNode.children) {
      traverseRowsForCells(child, columnTree, measures, cellMap, currentRowPath as powerbi.PrimitiveValue[]);
    }
  }
}

function extractCellValues(
  values: { [id: number]: powerbi.DataViewMatrixNodeValue },
  rowKey: string,
  columnTree: TreeNode,
  measures: MeasureInfo[],
  cellMap: Map<string, CellValue>
): void {
  const leafColumns = getLeafColumnsWithIndex(columnTree);

  for (const [valueIndex, nodeValue] of Object.entries(values)) {
    const idx = parseInt(valueIndex, 10);
    const measureIndex = idx % measures.length;
    const columnIndex = Math.floor(idx / measures.length);
    if (leafColumns.length === 0 || columnIndex < 0 || columnIndex >= leafColumns.length) {
      // Safety: do not create cells for columns that have no header representation
      continue;
    }

    const colKey = leafColumns[columnIndex].key;

    const rawValue = nodeValue.value;
    const numValue = typeof rawValue === "number" ? rawValue : null;
    const formattedValue = nodeValue.valueSourceIndex !== undefined
      ? formatValue(numValue, measures[measureIndex]?.format || "")
      : formatValue(numValue, measures[measureIndex]?.format || "");

    const cellKey = generateCellKey(rowKey, colKey, measureIndex);
    cellMap.set(cellKey, {
      value: numValue,
      formattedValue,
      measureIndex,
      rowKey,
      colKey,
    });
  }
}

function getLeafColumnsWithIndex(node: TreeNode): TreeNode[] {
  if (node.isLeaf && node.level > 0) {
    return [node];
  }
  const leaves: TreeNode[] = [];
  for (const child of node.children) {
    leaves.push(...getLeafColumnsWithIndex(child));
  }
  return leaves;
}

function formatValue(value: number | null, format: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  if (!format) {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (format.includes("%")) {
    return (value * 100).toFixed(1) + "%";
  }

  if (format.includes("$") || format.toLowerCase().includes("currency")) {
    return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (format.includes("0.00")) {
    return value.toFixed(2);
  }

  if (format.includes("0.0")) {
    return value.toFixed(1);
  }

  if (format.includes("#,##0") || format.includes(",0")) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  return value.toLocaleString();
}

export function getCellValue(
  cellMap: { get: (key: string) => CellValue | undefined },
  rowKey: string,
  colKey: string,
  measureIndex: number
): CellValue | undefined {
  const cellKey = generateCellKey(rowKey, colKey, measureIndex);
  return cellMap.get(cellKey);
}

export function getColumnMeasureValues(
  cellMap: Map<string, CellValue>,
  flattenedRows: FlattenedNode[],
  colKey: string,
  measureIndex: number
): (number | null)[] {
  return flattenedRows.map(row => {
    const cell = getCellValue(cellMap, row.key, colKey, measureIndex);
    return cell?.value ?? null;
  });
}

export function getRowMeasureValues(
  cellMap: Map<string, CellValue>,
  flattenedColumns: FlattenedNode[],
  rowKey: string,
  measureIndex: number
): (number | null)[] {
  return flattenedColumns.map(col => {
    const cell = getCellValue(cellMap, rowKey, col.key, measureIndex);
    return cell?.value ?? null;
  });
}

export function computeColumnStats(
  cellMap: Map<string, CellValue>,
  flattenedRows: FlattenedNode[],
  colKey: string,
  measureIndex: number
): { min: number; max: number; sum: number; count: number } {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;

  for (const row of flattenedRows) {
    const cell = getCellValue(cellMap, row.key, colKey, measureIndex);
    if (cell?.value !== null && cell?.value !== undefined) {
      min = Math.min(min, cell.value);
      max = Math.max(max, cell.value);
      sum += cell.value;
      count++;
    }
  }

  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    sum,
    count,
  };
}

export function computeGlobalStats(
  cellMap: { values: () => IterableIterator<CellValue> },
  measureIndex: number
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (const cell of cellMap.values()) {
    if (cell.measureIndex === measureIndex && cell.value !== null) {
      min = Math.min(min, cell.value);
      max = Math.max(max, cell.value);
    }
  }

  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,

  };
}
export function applyManualOverrides(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  settings: VisualSettings,
  allMeasures: MeasureInfo[],
  columns: FlattenedNode[],
): { rows: FlattenedNode[]; cellMap: Map<string, CellValue> } {
  const overrides = settings.manualData;

  // 1. Cell Edits (Values & Formulas)
  const edits = JSON.parse(overrides.edits || "{}");

  // Use FormulaEngine so manual formulas support CELL(), ROW(), COL(), etc.
  const baseFormulaContext = {
    currentRowKey: "",
    currentColKey: "",
    currentMeasureIndex: 0,
    rows,
    columns,
    measures: allMeasures,
    cellMap,
    rowHierarchyLevels: [] as string[],
    calculatedMeasures: new Map<string, string>(),
    calculatedRows: new Map<string, string>(),
  };

  const engine = new FormulaEngine(baseFormulaContext);

  for (const [key, rawValue] of Object.entries(edits)) {
    const editStr = String(rawValue);
    const [rowKey, colKey, mIdxStr] = key.split("|");
    const measureIndex = parseInt(mIdxStr, 10);
    // The edit key uses "|" separator but cellMap uses generateCellKey format ("::" with "m" prefix)
    const cellMapKey = generateCellKey(rowKey, colKey, isNaN(measureIndex) ? 0 : measureIndex);

    if (editStr.startsWith("=")) {
      const formula = editStr.slice(1);

      engine.updateContext({
        currentRowKey: rowKey,
        currentColKey: colKey,
        currentMeasureIndex: isNaN(measureIndex) ? 0 : measureIndex,
      });

      const result = engine.evaluate(formula);
      if (result.value !== null) {
        const existing = cellMap.get(cellMapKey);
        if (existing) {
          cellMap.set(cellMapKey, {
            ...existing,
            value: result.value,
            formattedValue: formatValue(result.value, existing.measureIndex !== undefined ? allMeasures[existing.measureIndex]?.format ?? "" : ""),
            isCalculated: true,
          });
        }
      }
    } else {
      // Direct value
      const value = parseFloat(editStr);
      if (!isNaN(value)) {
        const existing = cellMap.get(cellMapKey);
        if (existing) {
          cellMap.set(cellMapKey, {
            ...existing,
            value,
            formattedValue: formatValue(value, existing.measureIndex !== undefined ? allMeasures[existing.measureIndex]?.format ?? "" : ""),
          });
        }
      }
    }
  }

  // 2. Label Overrides
  const labels = JSON.parse(overrides.labelOverrides || "{}");
  const updatedRows = rows.map(r => {
    if (labels[r.key]) {
      return { ...r, label: labels[r.key] };
    }
    return r;
  });

  // 3. Row Order
  const rowOrder = JSON.parse(overrides.rowOrder || "[]");
  let reorderedRows = updatedRows;
  
  // Helper function to add rows in order (hoisted to function body root)
  function addRowsInOrder(
    parentKey: string,
    indent: number,
    updatedRows: FlattenedNode[],
    rowOrder: string[],
    rowMap: Map<string, FlattenedNode>,
    result: FlattenedNode[],
    processed: Set<string>
  ): void {
    // Get all direct children of this parent
    const children = updatedRows.filter(r => {
      const pKey = r.path.length <= 1 ? "root" : r.path.slice(0, -1).join("⟂");
      return pKey === parentKey && !processed.has(r.key);
    });
    
    if (children.length === 0) return;
    
    // Sort children according to rowOrder if available
    const parentOrder: string[] = rowOrder.filter((key: string) => children.some(c => c.key === key));
    const orderedChildren = parentOrder.length > 0 
      ? parentOrder.map((key: string) => rowMap.get(key)!).filter(Boolean)
      : children;
    
    // Add any new children not in the order
    const orderedSet = new Set(parentOrder);
    const newChildren = children.filter(c => !orderedSet.has(c.key));
    const allChildren = [...orderedChildren, ...newChildren];
    
    for (const row of allChildren) {
      if (processed.has(row.key)) continue;
      processed.add(row.key);
      result.push({ ...row, visibleIndex: result.length });
      
      // Recursively add children if expanded
      if (row.hasChildren && row.isExpanded) {
        addRowsInOrder(row.key, indent + 1, updatedRows, rowOrder, rowMap, result, processed);
      }
    }
  }
  
  if (rowOrder && rowOrder.length > 0) {
    // Build a map of key to row for quick lookup
    const rowMap = new Map(updatedRows.map(r => [r.key, r]));
    const orderedKeys = new Set(rowOrder);
    
    // Reconstruct rows maintaining hierarchy but respecting order
    const result: FlattenedNode[] = [];
    const processed = new Set<string>();
    
    // Start from root
    addRowsInOrder("root", 0, updatedRows, rowOrder, rowMap, result, processed);
    
    // Add any remaining rows not processed
    for (const row of updatedRows) {
      if (!processed.has(row.key)) {
        result.push({ ...row, visibleIndex: result.length });
      }
    }
    
    reorderedRows = result;
  }

  return { rows: reorderedRows, cellMap };
}

function applyHierarchyRollupsFromTree(
  flattenedRows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  measures: MeasureInfo[],
  rowTree: TreeNode | null,
  columnTree: TreeNode | null,
  flattenedColumns?: FlattenedNode[],
): void {
  if (!rowTree || !columnTree || measures.length === 0) {
    return;
  }

  // Build a map of row keys to tree nodes for quick lookup
  const rowKeyToNode = new Map<string, TreeNode>();
  const indexRowTree = (node: TreeNode): void => {
    rowKeyToNode.set(node.key, node);
    for (const child of node.children) {
      indexRowTree(child);
    }
  };
  for (const child of rowTree.children) {
    indexRowTree(child);
  }

  // Get all leaf columns from the full column tree
  const leafColumns: TreeNode[] = [];
  const collectLeafColumns = (node: TreeNode): void => {
    if (node.isLeaf && node.level > 0) {
      leafColumns.push(node);
    }
    for (const child of node.children) {
      collectLeafColumns(child);
    }
  };
  for (const child of columnTree.children) {
    collectLeafColumns(child);
  }

  // For each visible (flattened) row that has children, compute rollups from the full tree
  for (const parent of flattenedRows) {
    if (parent.isSubtotal || parent.isGrandTotal) continue;

    const treeNode = rowKeyToNode.get(parent.key);
    if (!treeNode || treeNode.children.length === 0) continue;

    // Collect all leaf descendants from the full tree (not just flattened)
    const leafDescendants: TreeNode[] = [];
    const collectLeaves = (node: TreeNode): void => {
      if (node.isLeaf || node.children.length === 0) {
        leafDescendants.push(node);
      } else {
        for (const child of node.children) {
          collectLeaves(child);
        }
      }
    }
    collectLeaves(treeNode);

    if (leafDescendants.length === 0) continue;

    // Aggregate values for each column and measure
    for (const col of leafColumns) {
      const colKey = col.key;
      for (let m = 0; m < measures.length; m++) {
        const values: number[] = [];
        for (const child of leafDescendants) {
          const childCell = getCellValue(cellMap, child.key, colKey, m);
          const v = childCell?.value;
          if (v !== null && v !== undefined && !Number.isNaN(v)) {
            values.push(v);
          }
        }

        if (values.length === 0) continue;

        const sum = values.reduce((acc, v) => acc + v, 0);
        const cellKey = generateCellKey(parent.key, colKey, m);
        const existing = cellMap.get(cellKey);
        const base: CellValue = existing || {
          value: null,
          formattedValue: "—",
          measureIndex: m,
          rowKey: parent.key,
          colKey: colKey,
        };

        cellMap.set(cellKey, {
          ...base,
          value: sum,
          formattedValue: formatValue(sum, measures[m]?.format || ""),
        });
      }
    }
  }

  // Do the same for column rollups (when columns are collapsed)
  const colKeyToNode = new Map<string, TreeNode>();
  function indexColTree(node: TreeNode): void {
    colKeyToNode.set(node.key, node);
    for (const child of node.children) {
      indexColTree(child);
    }
  }
  for (const child of columnTree.children) {
    indexColTree(child);
  }

  // Get all leaf rows from the full row tree
  const leafRows: TreeNode[] = [];
  function collectLeafRows(node: TreeNode): void {
    if (node.isLeaf && node.level > 0) {
      leafRows.push(node);
    }
    for (const child of node.children) {
      collectLeafRows(child);
    }
  }
  for (const child of rowTree.children) {
    collectLeafRows(child);
  }

  // For each visible (flattened) column that has children, compute rollups
  if (flattenedColumns && flattenedColumns.length > 0) {
    for (const parentCol of flattenedColumns) {
      if (parentCol.isSubtotal || parentCol.isGrandTotal) continue;

      const treeNode = colKeyToNode.get(parentCol.key);
      if (!treeNode || treeNode.children.length === 0) continue;

      // Collect all leaf descendants from the full tree
      const leafDescendants: TreeNode[] = [];
      function collectColLeaves(node: TreeNode): void {
        if (node.isLeaf || node.children.length === 0) {
          leafDescendants.push(node);
        } else {
          for (const child of node.children) {
            collectColLeaves(child);
          }
        }
      }
      collectColLeaves(treeNode);

      if (leafDescendants.length === 0) continue;

      // Aggregate values for each row and measure
      for (const row of leafRows) {
        const rowKey = row.key;
        for (let m = 0; m < measures.length; m++) {
          const values: number[] = [];
          for (const child of leafDescendants) {
            const childCell = getCellValue(cellMap, rowKey, child.key, m);
            const v = childCell?.value;
            if (v !== null && v !== undefined && !Number.isNaN(v)) {
              values.push(v);
            }
          }

          if (values.length === 0) continue;

          const sum = values.reduce((acc, v) => acc + v, 0);
          const cellKey = generateCellKey(rowKey, parentCol.key, m);
          const existing = cellMap.get(cellKey);
          const base: CellValue = existing || {
            value: null,
            formattedValue: "—",
            measureIndex: m,
            rowKey: rowKey,
            colKey: parentCol.key,
          };

          cellMap.set(cellKey, {
            ...base,
            value: sum,
            formattedValue: formatValue(sum, measures[m]?.format || ""),
          });
        }
      }
    }
  }
}

