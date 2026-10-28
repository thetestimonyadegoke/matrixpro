import powerbi from "powerbi-visuals-api";
import { TreeNode, FlattenedNode, buildRowTree, buildColumnTree, flattenTree, flattenColumnTree } from "./tree";
import { generateCellKey, generateRowKey } from "./keys";

// Compute the key of the parent row for a given FlattenedNode. The parent of
// a level-1 row is the synthetic "root"; otherwise rebuild the rowKey from
// path.slice(0, -1) using the same encoding as the original tree.
function computeParentKey(row: FlattenedNode): string {
  if (!row.path || row.path.length <= 1) return "root";
  return generateRowKey(row.path.slice(0, -1) as (string | number)[]);
}
import { VisualSettings } from "../settings/settings";
import { parseCalculatedMeasures, computeCalculatedMeasures, CalculatedMeasureDefinition } from "../calculations/calculatedMeasures";
import { applyCalculatedRows, CalculatedRowDefinition } from "../calculations/calculatedRows";
import { FormulaEngine } from "../calculations/FormulaEngine";
import { parseManualEditNumber } from "../utils/manualEditValue";

export interface MeasureInfo {
  index: number;
  name: string;
  format: string;
  queryName: string;
  id?: string;
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
  rowLevelNames: string[];
  columnLevelNames: string[];
  sparklineMeasureIndex: number;
  // Store full tree data for rollup calculations when collapsed
  fullRowTree?: TreeNode | null;
  fullColumnTree?: TreeNode | null;
}

export interface DataModelBuilderOptions {
  dataView: powerbi.DataView | undefined;
  settings: VisualSettings;
  // Relax identity and selection id typing to avoid dependency on SDK-internal types
  selectionIdBuilder: (identity: any, levels?: powerbi.DataViewHierarchyLevel[]) => any | undefined;
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
    rowLevelNames: [],
    columnLevelNames: [],
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
  const columnLevelSources = columns?.levels?.map((l: powerbi.DataViewHierarchyLevel) => l.sources[0])
    .filter(s => s && !s.isMeasure && !s.roles?.["Values"]) || [];

  const rowTree = buildRowTree(rows.root, rowLevelSources, selectionIdBuilder, [], 0, rows.levels || []);
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

  // Snapshot the pre-merge cell map so calculated rows with
  // `evaluateColumnsBeforeRows === false` can evaluate against base values
  // only (i.e., without seeing calculated column measures).
  const baseCellMapSnapshot = new Map(cellMap);

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
    calcRowDefs,
    baseCellMapSnapshot
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
    rowLevelNames: rowLevelSources.map((s: powerbi.DataViewMetadataColumn) => s?.displayName || ""),
    columnLevelNames: columnLevelSources.map((s: powerbi.DataViewMetadataColumn) => s?.displayName || ""),
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
  const leafColumns = getLeafColumnsWithIndex(columnTree);
  traverseRowsForCells(rowRoot, leafColumns, measures, cellMap, []);
  return cellMap;
}

function traverseRowsForCells(
  rowNode: powerbi.DataViewMatrixNode,
  leafColumns: TreeNode[],
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
    extractCellValues(rowNode.values, rowKey, leafColumns, measures, cellMap);
  }

  if (rowNode.children) {
    for (const child of rowNode.children) {
      traverseRowsForCells(child, leafColumns, measures, cellMap, currentRowPath as powerbi.PrimitiveValue[]);
    }
  }
}

function extractCellValues(
  values: { [id: number]: powerbi.DataViewMatrixNodeValue },
  rowKey: string,
  leafColumns: TreeNode[],
  measures: MeasureInfo[],
  cellMap: Map<string, CellValue>
): void {

  for (const [valueIndex, nodeValue] of Object.entries(values)) {
    const idx = parseInt(valueIndex, 10);
    const measureIndex = idx % measures.length;
    const columnIndex = idx;
    if (leafColumns.length === 0 || columnIndex < 0 || columnIndex >= leafColumns.length) {
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
  for (const child of node.children || []) {
    leaves.push(...getLeafColumnsWithIndex(child));
  }
  return leaves;
}

// Number#toLocaleString with an options bag constructs a new Intl.NumberFormat
// on every call, which dominated model-build time (one call per cell). These
// cached instances produce identical output.
let defaultNumberFormat: Intl.NumberFormat | null = null;
let twoDecimalNumberFormat: Intl.NumberFormat | null = null;
let integerNumberFormat: Intl.NumberFormat | null = null;

function formatDefault(value: number): string {
  if (!defaultNumberFormat) defaultNumberFormat = new Intl.NumberFormat();
  return defaultNumberFormat.format(value);
}

function formatTwoDecimals(value: number): string {
  if (!twoDecimalNumberFormat) {
    twoDecimalNumberFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return twoDecimalNumberFormat.format(value);
}

function formatInteger(value: number): string {
  if (!integerNumberFormat) integerNumberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  return integerNumberFormat.format(value);
}

const numberFormatCache = new Map<string, Intl.NumberFormat>();

/** Cached default-locale formatter for the given precision and grouping. */
export function getNumberFormat(minDecimals: number, maxDecimals: number, grouping = true): Intl.NumberFormat {
  const key = `${minDecimals}|${maxDecimals}|${grouping ? 1 : 0}`;
  let nf = numberFormatCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
      useGrouping: grouping,
    });
    numberFormatCache.set(key, nf);
  }
  return nf;
}

interface CurrencySection {
  prefix: string;
  suffix: string;
  minDecimals: number;
  maxDecimals: number;
  grouping: boolean;
  /** Divisor from trailing thousands-scaling commas (`#,0,` = 1000). */
  divisor: number;
}

interface CurrencyFormatSpec {
  positive: CurrencySection;
  /** Explicit negative section (`;(...)`); rendered with the absolute value. */
  negative?: CurrencySection;
}

const CURRENCY_SYMBOL = /[$€£¥₦₹₩₽₺₫₱₪₴₵₸₲₡¢฿₭₮₼₾]/;
const currencySpecCache = new Map<string, CurrencyFormatSpec | null>();

/** Split a format string on unescaped, unquoted `;`. */
function splitFormatSections(format: string): string[] {
  const sections: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === "\\" && !inQuote && i + 1 < format.length) {
      current += ch + format[++i];
    } else if (ch === "\"") {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === ";" && !inQuote) {
      sections.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  sections.push(current);
  return sections;
}

/**
 * Parse one Power BI / Excel format section into the literal text around its
 * number and the number's precision. `isCurrency` reports whether the section
 * carries a currency symbol (bare, `\`-escaped, quoted or `[$sym-lcid]`).
 */
function parseCurrencySection(section: string): { spec: CurrencySection; isCurrency: boolean } {
  let prefix = "";
  let suffix = "";
  let numeric = "";
  let isCurrency = false;
  const addLiteral = (text: string) => {
    if (CURRENCY_SYMBOL.test(text)) isCurrency = true;
    if (numeric) suffix += text;
    else prefix += text;
  };

  for (let i = 0; i < section.length; i++) {
    const ch = section[i];
    if (ch === "\\") {
      if (i + 1 < section.length) addLiteral(section[++i]);
    } else if (ch === "\"") {
      const end = section.indexOf("\"", i + 1);
      const stop = end === -1 ? section.length : end;
      addLiteral(section.slice(i + 1, stop));
      i = stop;
    } else if (ch === "[") {
      const end = section.indexOf("]", i + 1);
      const stop = end === -1 ? section.length : end;
      const body = section.slice(i + 1, stop);
      // `[$€-466]` → "€"; `[$-409]` is a locale tag only; `[Red]` etc. ignored.
      if (body.startsWith("$")) {
        const dash = body.indexOf("-");
        const symbol = dash === -1 ? body.slice(1) : body.slice(1, dash);
        if (symbol) {
          isCurrency = true;
          if (numeric) suffix += symbol;
          else prefix += symbol;
        }
      }
      i = stop;
    } else if (ch === "_" || ch === "*") {
      i++; // padding / fill directives take the next char; no output.
    } else if ("0#?,.".includes(ch) && (numeric === "" || !suffix)) {
      // A `.` or `,` with no number yet is literal text (e.g. "Rs.").
      if (numeric === "" && (ch === "," || ch === ".")) addLiteral(ch);
      else numeric += ch;
    } else {
      addLiteral(ch);
    }
  }

  // A bare symbol with no digit placeholders (e.g. "$") keeps the legacy
  // grouped two-decimal rendering.
  if (numeric === "") numeric = "#,0.00";

  const dot = numeric.indexOf(".");
  let intPart = dot === -1 ? numeric : numeric.slice(0, dot);
  const fracPart = dot === -1 ? "" : numeric.slice(dot + 1);
  let divisor = 1;
  if (dot === -1) {
    while (intPart.endsWith(",")) {
      intPart = intPart.slice(0, -1);
      divisor *= 1000;
    }
  } else {
    let trailing = fracPart.length;
    while (trailing > 0 && fracPart[trailing - 1] === ",") trailing--;
    for (let k = trailing; k < fracPart.length; k++) divisor *= 1000;
  }
  const minDecimals = (fracPart.match(/0/g) || []).length;
  const maxDecimals = minDecimals + (fracPart.match(/[#?]/g) || []).length;

  return {
    spec: { prefix, suffix, minDecimals, maxDecimals, grouping: intPart.includes(","), divisor },
    isCurrency,
  };
}

function getCurrencySpec(format: string): CurrencyFormatSpec | null {
  const cached = currencySpecCache.get(format);
  if (cached !== undefined) return cached;

  const sections = splitFormatSections(format);
  const positive = parseCurrencySection(sections[0]);
  const spec: CurrencyFormatSpec | null = positive.isCurrency
    ? {
        positive: positive.spec,
        negative: sections.length > 1 && sections[1].trim() !== ""
          ? parseCurrencySection(sections[1]).spec
          : undefined,
      }
    : null;
  // Format strings come from a small, fixed set of measures and columns;
  // the bound only guards against unbounded growth from free-text input.
  if (currencySpecCache.size > 500) currencySpecCache.clear();
  currencySpecCache.set(format, spec);
  return spec;
}

/**
 * Render `value` with the currency symbol, position, grouping, decimals and
 * negative pattern of a Power BI format string (`\$#,0.00;(\$#,0.00)`,
 * `€#,0.00`, `[$₦-466]#,0.00`, `#,0.00 €`, …). Returns null when the format
 * has no currency symbol. `decimalsOverride` replaces the format's precision.
 */
export function formatCurrency(value: number, format: string, decimalsOverride?: number): string | null {
  const spec = getCurrencySpec(format);
  if (!spec) return null;
  const negative = value < 0;
  const section = negative && spec.negative ? spec.negative : spec.positive;
  const minDec = decimalsOverride ?? section.minDecimals;
  const maxDec = decimalsOverride ?? section.maxDecimals;
  const body = getNumberFormat(minDec, maxDec, section.grouping).format(Math.abs(value) / section.divisor);
  const sign = negative && !spec.negative ? "-" : "";
  return sign + section.prefix + body + section.suffix;
}

export function formatValue(
  value: number | null,
  format: string,
  settings?: any,
  colFormat?: any
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  if (!format) {
    if (Number.isInteger(value)) {
      return formatDefault(value);
    }
    return formatTwoDecimals(value);
  }

  if (format.includes("%")) {
    return (value * 100).toFixed(1) + "%";
  }

  const currency = formatCurrency(value, format);
  if (currency !== null) return currency;

  if (format.toLowerCase().includes("currency")) {
    return "$" + formatTwoDecimals(value);
  }

  if (format.includes("0.00")) {
    return value.toFixed(2);
  }

  if (format.includes("0.0")) {
    return value.toFixed(1);
  }

  if (format.includes("#,##0") || format.includes(",0")) {
    return formatInteger(value);
  }

  return formatDefault(value);
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

export function parseManualEditKey(key: string): { rowKey: string; colKey: string; measureIndex: number } | null {
  const lastSeparator = key.lastIndexOf("|");
  if (lastSeparator < 0) {
    return null;
  }

  const measureIndex = parseInt(key.slice(lastSeparator + 1), 10);
  if (Number.isNaN(measureIndex)) {
    return null;
  }

  const withoutMeasure = key.slice(0, lastSeparator);
  const columnSeparator = withoutMeasure.lastIndexOf("|col:");
  if (columnSeparator < 0) {
    return null;
  }

  return {
    rowKey: withoutMeasure.slice(0, columnSeparator),
    colKey: withoutMeasure.slice(columnSeparator + 1),
    measureIndex,
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
    const parsedKey = parseManualEditKey(key);
    if (!parsedKey) {
      continue;
    }

    const { rowKey, colKey, measureIndex } = parsedKey;
    // The edit key uses "|" separator but cellMap uses generateCellKey format ("::" with "m" prefix)
    const cellMapKey = generateCellKey(rowKey, colKey, measureIndex);

    if (editStr.startsWith("=")) {
      const formula = editStr.slice(1);

      engine.updateContext({
        currentRowKey: rowKey,
        currentColKey: colKey,
        currentMeasureIndex: measureIndex,
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
      const value = parseManualEditNumber(editStr);
      if (value !== null) {
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
    // Get all direct children of this parent. Use the same row-key encoding
    // as the tree (generateRowKey of path.slice(0, -1)) so that recursion
    // by parent row.key actually matches child rows — otherwise children
    // become orphaned and the hierarchy structure breaks.
    const children = updatedRows.filter(r => {
      const pKey = computeParentKey(r);
      return pKey === parentKey && !processed.has(r.key);
    });

    if (children.length === 0) return;

    const totalChildren = children.filter(child => child.isSubtotal || child.isGrandTotal);
    const regularChildren = children.filter(child => !child.isSubtotal && !child.isGrandTotal);

    // Sort children according to rowOrder if available
    const parentOrder: string[] = rowOrder.filter((key: string) => regularChildren.some(c => c.key === key));
    const orderedChildren = parentOrder.length > 0
      ? parentOrder.map((key: string) => rowMap.get(key)!).filter(Boolean)
      : regularChildren;

    // Add any new children not in the order
    const orderedSet = new Set(parentOrder);
    const newChildren = regularChildren.filter(c => !orderedSet.has(c.key));
    const allChildren = [...orderedChildren, ...newChildren];

    for (const row of allChildren) {
      if (processed.has(row.key)) continue;
      processed.add(row.key);
      result.push({ ...row, visibleIndex: result.length });

      // Recursively add children if expanded
      if (row.hasChildren && row.isExpanded) {
        addRowsInOrder(row.key, indent + 1, updatedRows, rowOrder, rowMap, result, processed);
      }

      // Keep attached subtotal / grand-total rows with their parent group.
      const attachedTotals = totalChildren.filter(candidate => {
        if (processed.has(candidate.key) || (!candidate.isSubtotal && !candidate.isGrandTotal)) {
          return false;
        }

        if ((candidate.level ?? 0) !== (row.level ?? 0)) {
          return false;
        }

        const rowPath = Array.isArray(row.path) ? row.path : [];
        const candidatePath = Array.isArray(candidate.path) ? candidate.path : [];
        return rowPath.length > 0 &&
          candidatePath.length >= rowPath.length &&
          rowPath.every((part, index) => candidatePath[index] === part);
      });

      for (const totalRow of attachedTotals) {
        if (processed.has(totalRow.key)) continue;
        processed.add(totalRow.key);
        result.push({ ...totalRow, visibleIndex: result.length });
      }
    }

    for (const totalRow of totalChildren) {
      if (!processed.has(totalRow.key)) {
        processed.add(totalRow.key);
        result.push({ ...totalRow, visibleIndex: result.length });
      }
    }
  }

  if (rowOrder && rowOrder.length > 0) {
    // Build a map of key to row for quick lookup
    const rowMap = new Map(updatedRows.map(r => [r.key, r]));

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

/**
 * Power BI emits one measure-level leaf per measure beneath each column member,
 * and those leaves share the member's key. Aggregations iterate measures
 * separately, so source lists must contain each column key only once.
 */
function uniqueByKey<T extends { key: string }>(nodes: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const node of nodes) {
    if (seen.has(node.key)) continue;
    seen.add(node.key);
    result.push(node);
  }
  return result;
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

  // Get all leaf columns from the full column tree (exclude subtotal/grand total nodes)
  const allLeafColumns: TreeNode[] = [];
  const collectLeafColumns = (node: TreeNode): void => {
    if (node.isSubtotal || node.isGrandTotal) return;
    if (node.isLeaf && node.level > 0) {
      allLeafColumns.push(node);
    }
    for (const child of node.children) {
      collectLeafColumns(child);
    }
  };
  for (const child of columnTree.children) {
    collectLeafColumns(child);
  }
  const leafColumns = uniqueByKey(allLeafColumns);

  // For each visible (flattened) row that has children, compute rollups from the full tree
  for (const parent of flattenedRows) {
    if (parent.isSubtotal || parent.isGrandTotal) continue;

    const treeNode = rowKeyToNode.get(parent.key);
    if (!treeNode || treeNode.children.length === 0) continue;

    // Collect all leaf descendants from the full tree (not just flattened).
    // Critical: skip subtotal/grand-total nodes — PowerBI injects them as
    // sibling children with pre-aggregated values; including them here would
    // double-count the parent's rollup (real leaves PLUS their aggregate).
    const leafDescendants: TreeNode[] = [];
    const collectLeaves = (node: TreeNode): void => {
      if (node.isSubtotal || node.isGrandTotal) return;
      if (node.isLeaf || node.children.every(c => c.isSubtotal || c.isGrandTotal)) {
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

  // Get all leaf rows from the full row tree (exclude subtotal/grand total nodes)
  const leafRows: TreeNode[] = [];
  function collectLeafRows(node: TreeNode): void {
    if (node.isSubtotal || node.isGrandTotal) return;
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

      // Collect all leaf descendants from the full tree (skip PowerBI-injected
      // subtotal/grand-total siblings — their pre-aggregated values would
      // double-count parent rollups).
      const leafDescendants: TreeNode[] = [];
      const collectColLeaves = (node: TreeNode): void => {
        if (node.isSubtotal || node.isGrandTotal) return;
        if (node.isLeaf || node.children.every(c => c.isSubtotal || c.isGrandTotal)) {
          leafDescendants.push(node);
        } else {
          for (const child of node.children) {
            collectColLeaves(child);
          }
        }
      };
      collectColLeaves(treeNode);
      const uniqueLeafDescendants = uniqueByKey(leafDescendants);

      if (uniqueLeafDescendants.length === 0) continue;

      // Aggregate values for each row and measure
      for (const row of leafRows) {
        const rowKey = row.key;
        for (let m = 0; m < measures.length; m++) {
          const values: number[] = [];
          for (const child of uniqueLeafDescendants) {
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

  const isSamePathPrefix = (prefix: any[], path: any[] | undefined): boolean => {
    if (prefix.length === 0) return true;
    if (!path || path.length < prefix.length) return false;
    return prefix.every((part, index) => path[index] === part);
  };

  // Mirror the row subtotal repair for column subtotal nodes. Normal column
  // rollups intentionally skip these synthetic nodes, so populate them from
  // real leaf columns only and let the row-subtotal pass below aggregate them.
  const allColumnNodes: TreeNode[] = [];
  const collectAllColumns = (node: TreeNode): void => {
    allColumnNodes.push(node);
    for (const child of node.children) {
      collectAllColumns(child);
    }
  };
  for (const child of columnTree.children) {
    collectAllColumns(child);
  }

  const subtotalColumns = allColumnNodes.filter(col => col.isSubtotal || col.isGrandTotal);
  const rowTargetsForColumnSubtotals = flattenedRows.filter(row => !row.isSubtotal && !row.isGrandTotal);

  for (const subtotalCol of subtotalColumns) {
    const subtotalBasePath = subtotalCol.isGrandTotal ? [] : (subtotalCol.path || []);
    const sourceColumns = uniqueByKey(allColumnNodes.filter(col => {
      if (col.isSubtotal || col.isGrandTotal) return false;
      if (!isSamePathPrefix(subtotalBasePath, col.path)) return false;
      return col.isLeaf || col.children.every(child => child.isSubtotal || child.isGrandTotal);
    }));

    if (sourceColumns.length === 0) continue;

    for (const row of rowTargetsForColumnSubtotals) {
      for (let m = 0; m < measures.length; m++) {
        const values: number[] = [];
        for (const sourceCol of sourceColumns) {
          const sourceCell = getCellValue(cellMap, row.key, sourceCol.key, m);
          const value = sourceCell?.value;
          if (value !== null && value !== undefined && !Number.isNaN(value)) {
            values.push(value);
          }
        }

        if (values.length === 0) continue;

        const sum = values.reduce((acc, value) => acc + value, 0);
        const cellKey = generateCellKey(row.key, subtotalCol.key, m);
        const existing = cellMap.get(cellKey);
        const base: CellValue = existing || {
          value: null,
          formattedValue: "—",
          measureIndex: m,
          rowKey: row.key,
          colKey: subtotalCol.key,
        };

        cellMap.set(cellKey, {
          ...base,
          value: sum,
          formattedValue: formatValue(sum, measures[m]?.format || ""),
        });
      }
    }
  }

  // Power BI exposes subtotal rows as synthetic nodes. We deliberately exclude
  // them from the normal rollup passes above to avoid double-counting, so fill
  // their displayed cells in a final pass from the real leaf rows only.
  const allRowNodes: TreeNode[] = [];
  const collectAllRows = (node: TreeNode): void => {
    allRowNodes.push(node);
    for (const child of node.children) {
      collectAllRows(child);
    }
  };
  for (const child of rowTree.children) {
    collectAllRows(child);
  }

  const subtotalRows = allRowNodes.filter(row => row.isSubtotal || row.isGrandTotal);
  const columnsForSubtotalRows = flattenedColumns && flattenedColumns.length > 0
    ? uniqueByKey(flattenedColumns)
    : leafColumns;

  for (const subtotalRow of subtotalRows) {
    const subtotalBasePath = subtotalRow.isGrandTotal ? [] : (subtotalRow.keyPath || subtotalRow.path || []);
    const sourceRows = allRowNodes.filter(row => {
      if (row.isSubtotal || row.isGrandTotal) return false;
      if (!isSamePathPrefix(subtotalBasePath, row.keyPath || row.path)) return false;
      return row.isLeaf || row.children.every(child => child.isSubtotal || child.isGrandTotal);
    });

    if (sourceRows.length === 0) continue;

    for (const col of columnsForSubtotalRows) {
      for (let m = 0; m < measures.length; m++) {
        const values: number[] = [];
        for (const sourceRow of sourceRows) {
          const sourceCell = getCellValue(cellMap, sourceRow.key, col.key, m);
          const value = sourceCell?.value;
          if (value !== null && value !== undefined && !Number.isNaN(value)) {
            values.push(value);
          }
        }

        if (values.length === 0) continue;

        const sum = values.reduce((acc, value) => acc + value, 0);
        const cellKey = generateCellKey(subtotalRow.key, col.key, m);
        const existing = cellMap.get(cellKey);
        const base: CellValue = existing || {
          value: null,
          formattedValue: "—",
          measureIndex: m,
          rowKey: subtotalRow.key,
          colKey: col.key,
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

