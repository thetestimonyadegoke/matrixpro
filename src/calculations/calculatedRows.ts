/**
 * Calculated Rows System
 * Manages visual-level computed rows for financial statements
 * (e.g., Gross Profit = Revenue - COGS, EBITDA, Net Profit)
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { generateCellKey } from "../model/keys";
import { FormulaEngine } from "./FormulaEngine";

export type RowFormulaType = "sum" | "subtract" | "custom";

export interface RowStyle {
  bold: boolean;
  italic: boolean;
  backgroundColor: string;
  textColor: string;
  borderTop: "none" | "single" | "double";
  borderBottom: "none" | "single" | "double";
  indentOverride: number | null;
}

export interface CalculatedRowDefinition {
  id: string;
  name: string;
  formulaType: RowFormulaType;
  rowReferences: string[];
  customFormula: string;
  placement?: "before" | "after" | "child";
  targetRowKey?: string;
  parentRowKey: string | null;
  insertAfterRowKey: string | null;
  insertAtTop: boolean;
  style: RowStyle;
  includeInTotals: boolean;
  isSubtotal: boolean;
  enabled: boolean;
  order: number;
  /**
   * When true (or unset — legacy default), this row's formula is evaluated
   * against the merged cellMap (base cells + calculated column measures).
   * When false, it uses the pre-calc-measure base cellMap — column calc
   * measures are not visible to this row.
   */
  evaluateColumnsBeforeRows?: boolean;
  // ──────────────────────────────────────────────────────────────────────────
  // Inserted-row discriminator. Legacy rows have `undefined` which is treated
  // as `"calculated"`. New kinds ("blank" / "group" / "child" / "divider")
  // skip formula evaluation (see applyCalculatedRows) but still produce a
  // virtual FlattenedNode so the Row renderer can draw the appropriate chrome.
  // ──────────────────────────────────────────────────────────────────────────
  kind?: "calculated" | "blank" | "group" | "child" | "divider";
  /** Group only — persisted collapsed state. */
  collapsed?: boolean;
  /** Blank only — row height in px. */
  height?: number;
  /** Divider only — line style + colour. */
  lineStyle?: "single" | "double" | "dashed";
  lineColor?: string;
  /** Child / group hierarchy — references the parent group's `id`. */
  parentGroupId?: string;
}

export interface CalculatedRowsConfig {
  rows: CalculatedRowDefinition[];
}

export const defaultRowStyle: RowStyle = {
  bold: true,
  italic: false,
  backgroundColor: "",
  textColor: "",
  borderTop: "none",
  borderBottom: "single",
  indentOverride: null,
};

export const defaultCalculatedRowsConfig: CalculatedRowsConfig = {
  rows: [],
};

/**
 * Generate a unique ID for a new calculated row
 */
export function generateCalcRowId(): string {
  const randomBytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 4; i++) {
      randomBytes[i] = (Date.now() + i * 17) % 256;
    }
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `calcrow_${Date.now()}_${hex}`;
}

/**
 * Create a default calculated row definition
 */
export function createDefaultCalcRow(order: number): CalculatedRowDefinition {
  return {
    id: generateCalcRowId(),
    name: `Calculated Row ${order + 1}`,
    formulaType: "sum",
    rowReferences: [],
    customFormula: "",
    parentRowKey: null,
    insertAfterRowKey: null,
    insertAtTop: false,
    style: { ...defaultRowStyle },
    includeInTotals: true,
    isSubtotal: false,
    enabled: true,
    order,
  };
}

/**
 * Create a virtual FlattenedNode for a calculated (or blank/group/child/divider) row.
 *
 * The returned node is ALWAYS marked `isCalculatedRow: true` so downstream
 * code paths that gate calc-row behaviour still work; the `calcRowKind`
 * discriminator lets Row.tsx branch on the specific rendering variant.
 */
function createVirtualRowNode(
  def: CalculatedRowDefinition,
  indent: number,
  visibleIndex: number
): FlattenedNode {
  const kind = def.kind ?? "calculated";
  const safeStyle = def.style ?? defaultRowStyle;
  const childIndent = (safeStyle.indentOverride ?? indent) + (kind === "child" ? 1 : 0);
  return {
    key: `__calcrow__${def.id}`,
    label: def.name,
    value: def.name,
    level: 1,
    path: [def.name],
    children: [],
    isExpanded: false,
    isLeaf: true,
    isSubtotal: def.isSubtotal,
    isGrandTotal: false,
    indent: childIndent,
    hasChildren: false,
    visibleIndex,
    isCalculatedRow: true,
    calcRowKind: kind,
    calcRowDefId: def.id,
    groupCollapsed: kind === "group" ? def.collapsed === true : undefined,
    calcRowGroupId: def.parentGroupId,
    dividerProps: kind === "divider" ? {
      lineStyle: def.lineStyle ?? "single",
      lineColor: def.lineColor ?? "#d1d5db",
    } : undefined,
    blankHeight: kind === "blank" ? def.height : undefined,
    calculatedRowStyle: {
      bold: safeStyle.bold,
      italic: safeStyle.italic,
      backgroundColor: safeStyle.backgroundColor,
      textColor: safeStyle.textColor,
      borderTop: safeStyle.borderTop,
      borderBottom: safeStyle.borderBottom,
    },
  };
}

/**
 * Compute values for a calculated row across all columns and measures
 */
function computeCalculatedRowValues(
  def: CalculatedRowDefinition,
  referencedRows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  rowHierarchyLevels: string[] = []
): Map<string, CellValue> {
  const result = new Map<string, CellValue>();
  const virtualRowKey = `__calcrow__${def.id}`;
  const engine = new FormulaEngine({
    currentRowKey: virtualRowKey,
    currentColKey: "",
    currentMeasureIndex: 0,
    rows,
    columns,
    measures,
    cellMap,
    rowHierarchyLevels,
    calculatedMeasures: new Map<string, string>(),
    calculatedRows: new Map<string, string>(),
  });

  for (const col of columns) {
    for (const measure of measures) {
      let value: number | null = null;

      if (def.formulaType === "sum") {
        value = 0;
        for (const row of referencedRows) {
          const cellKey = generateCellKey(row.key, col.key, measure.index);
          const cell = cellMap.get(cellKey);
          if (cell?.value !== null && cell?.value !== undefined) {
            value += cell.value;
          }
        }
      } else if (def.formulaType === "subtract") {
        if (referencedRows.length >= 1) {
          const firstCellKey = generateCellKey(referencedRows[0].key, col.key, measure.index);
          const firstCell = cellMap.get(firstCellKey);
          value = firstCell?.value ?? 0;

          for (let i = 1; i < referencedRows.length; i++) {
            const cellKey = generateCellKey(referencedRows[i].key, col.key, measure.index);
            const cell = cellMap.get(cellKey);
            if (cell?.value !== null && cell?.value !== undefined) {
              value -= cell.value;
            }
          }
        }
      } else if (def.formulaType === "custom") {
        const formula = def.customFormula.trim();
        if (formula) {
          engine.updateContext({
            currentRowKey: virtualRowKey,
            currentColKey: col.key,
            currentMeasureIndex: measure.index,
            rows,
            cellMap,
          });
          const evaluation = engine.evaluate(formula.startsWith("=") ? formula.slice(1) : formula);
          value = evaluation.value;
        }
      }

      const cellKey = generateCellKey(virtualRowKey, col.key, measure.index);
      result.set(cellKey, {
        value,
        formattedValue: value !== null ? value.toLocaleString() : "—",
        measureIndex: measure.index,
        rowKey: virtualRowKey,
        colKey: col.key,
      });
    }
  }

  return result;
}

/**
 * Insert calculated rows into the flattened row list and compute their values
 */
export function applyCalculatedRows(
  flattenedRows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  calcRowDefs: CalculatedRowDefinition[],
  /**
   * Optional pre-calc-measure cell map. When provided, rows with
   * `evaluateColumnsBeforeRows === false` compute against this map
   * instead of the merged one. When omitted, all rows use the merged map
   * (preserving historical behavior for callers that haven't been updated).
   */
  baseCellMap?: Map<string, CellValue>
): {
  rows: FlattenedNode[];
  cellMap: Map<string, CellValue>;
} {
  if (calcRowDefs.length === 0) {
    return { rows: flattenedRows, cellMap };
  }

  // Filter enabled and sort by order
  const enabledDefs = calcRowDefs
    .filter(d => d.enabled)
    .sort((a, b) => a.order - b.order);

  if (enabledDefs.length === 0) {
    return { rows: flattenedRows, cellMap };
  }

  // Build row key map for reference lookup
  const rowKeyMap = new Map<string, FlattenedNode>();
  for (const row of flattenedRows) {
    rowKeyMap.set(row.key, row);
    rowKeyMap.set(row.label.toLowerCase(), row);
  }

  // Merge cell map
  const mergedCellMap = new Map(cellMap);
  const resultRows: FlattenedNode[] = [...flattenedRows];

  // Track ids of groups whose children should be skipped during flattening.
  const collapsedGroupIds = new Set<string>();
  const calcRowKeyById = new Map<string, string>();
  const calcRowIdByKey = new Map<string, string>();

  const findLastDescendantIndex = (targetKey: string): number => {
    const startIndex = resultRows.findIndex(r => r.key === targetKey);
    if (startIndex < 0) return -1;

    const targetRow = resultRows[startIndex];
    let endIndex = startIndex;
    for (let i = startIndex + 1; i < resultRows.length; i++) {
      if (resultRows[i].indent <= targetRow.indent) {
        break;
      }
      endIndex = i;
    }

    return endIndex;
  };

  for (const def of enabledDefs) {
    const kind = def.kind ?? "calculated";

    // Child rows whose parent group is collapsed are emitted but their
    // FlattenedNode is NOT added to the visible output. We still create the
    // node (so collapse toggling doesn't require re-flattening from scratch)
    // but we skip the splice.
    const parentCollapsed = kind === "child" && def.parentGroupId
      ? collapsedGroupIds.has(def.parentGroupId)
      : false;

    // -------------------------------------------------------------------
    // Formula evaluation
    // "calculated" and "child" → full formula evaluation.
    // "group" → aggregate by summing all direct child-kind rows whose
    //            parentGroupId matches this group's id. This runs after
    //            children because enabledDefs is sorted by `order` and
    //            children should be ordered after their parent group;
    //            if a user places children before the group (unusual) they
    //            won't be aggregated on this pass — that's acceptable for v1.
    // "blank" / "divider" → no numeric cells.
    // -------------------------------------------------------------------
    if (kind === "calculated" || kind === "child") {
      // Resolve referenced rows
      const referencedRows: FlattenedNode[] = [];
      for (const ref of def.rowReferences) {
        const row = rowKeyMap.get(ref) || rowKeyMap.get(ref.toLowerCase());
        if (row) {
          referencedRows.push(row);
        }
      }

      // Pick the cell-map layer this row should evaluate against.
      // - Undefined or true (the historical default): merged cellMap —
      //   calculated column measures are visible.
      // - false (explicit opt-out): base cellMap when provided, so column
      //   calc measures are NOT visible to this row's formula.
      const evalCellMap =
        def.evaluateColumnsBeforeRows === false && baseCellMap
          ? baseCellMap
          : mergedCellMap;

      // Compute values
      const calcValues = computeCalculatedRowValues(
        def,
        referencedRows,
        evalCellMap,
        resultRows,
        columns,
        measures,
        []
      );

      // Merge computed values
      for (const [key, value] of calcValues) {
        mergedCellMap.set(key, value);
      }
    }

    if (kind === "group") {
      // Sum all child rows that declare this group as their parent.
      const groupVirtualKey = `__calcrow__${def.id}`;
      const childDefs = enabledDefs.filter(
        d => (d.kind === "child" || d.kind === "calculated") && d.parentGroupId === def.id
      );
      if (childDefs.length > 0) {
        for (const col of columns) {
          for (const measure of measures) {
            let total = 0;
            let hasAny = false;
            for (const child of childDefs) {
              const childKey = `__calcrow__${child.id}`;
              const cellKey = generateCellKey(childKey, col.key, measure.index);
              const cell = mergedCellMap.get(cellKey);
              if (cell?.value !== null && cell?.value !== undefined) {
                total += cell.value;
                hasAny = true;
              }
            }
            const cellKey = generateCellKey(groupVirtualKey, col.key, measure.index);
            mergedCellMap.set(cellKey, {
              value: hasAny ? total : null,
              formattedValue: hasAny ? total.toLocaleString() : "—",
              measureIndex: measure.index,
              rowKey: groupVirtualKey,
              colKey: col.key,
            });
          }
        }
      }
    }

    // Track collapsed groups so their children get hidden on this pass.
    if (kind === "group" && def.collapsed === true) {
      collapsedGroupIds.add(def.id);
    }

    // Skip visibility for children of collapsed groups.
    if (parentCollapsed) {
      // Still register in rowKeyMap for formula references / chaining.
      const ghost = createVirtualRowNode(def, 0, -1);
      rowKeyMap.set(ghost.key, ghost);
      rowKeyMap.set(def.name.toLowerCase(), ghost);
      calcRowKeyById.set(def.id, ghost.key);
      calcRowIdByKey.set(ghost.key, def.id);
      continue;
    }

    // Determine insertion position
    let insertIndex = resultRows.length;
    let indent = 0;

    const placement = def.placement ?? (def.parentRowKey ? "child" : def.insertAfterRowKey ? "after" : def.insertAtTop ? "before" : "after");
    const targetRowKey =
      def.targetRowKey ??
      def.parentRowKey ??
      def.insertAfterRowKey ??
      null;

    if (placement === "before" && !targetRowKey) {
      insertIndex = 0;
    } else if (targetRowKey) {
      const normalizedTargetKey = calcRowKeyById.get(targetRowKey) ?? targetRowKey;
      const targetRow = rowKeyMap.get(normalizedTargetKey);
      if (targetRow) {
        if (placement === "before") {
          const idx = resultRows.findIndex(r => r.key === targetRow.key);
          if (idx >= 0) {
            insertIndex = idx;
            indent = targetRow.indent;
          }
        } else if (placement === "child") {
          const lastDescendantIndex = findLastDescendantIndex(targetRow.key);
          if (lastDescendantIndex >= 0) {
            insertIndex = lastDescendantIndex + 1;
            indent = targetRow.indent + 1;
          }

          if (!def.parentGroupId) {
            const targetGroupId = calcRowIdByKey.get(targetRow.key);
            if (targetGroupId) {
              def.parentGroupId = targetGroupId;
            }
          }
        } else {
          const idx = findLastDescendantIndex(targetRow.key);
          if (idx >= 0) {
            insertIndex = idx + 1;
            indent = targetRow.indent;
          }
        }
      }
    } else if (def.insertAtTop) {
      insertIndex = 0;
    }

    // Create virtual node
    const virtualNode = createVirtualRowNode(def, indent, insertIndex);

    // Insert into result
    resultRows.splice(insertIndex, 0, virtualNode);

    // Update visible indices
    for (let i = insertIndex; i < resultRows.length; i++) {
      resultRows[i].visibleIndex = i;
    }

    // Add to lookup for chaining
    rowKeyMap.set(virtualNode.key, virtualNode);
    rowKeyMap.set(def.name.toLowerCase(), virtualNode);
    calcRowKeyById.set(def.id, virtualNode.key);
    calcRowIdByKey.set(virtualNode.key, def.id);
  }

  return { rows: resultRows, cellMap: mergedCellMap };
}

/**
 * Financial statement templates
 */
export interface FinancialTemplate {
  id: string;
  name: string;
  description: string;
  rows: Omit<CalculatedRowDefinition, "id" | "order">[];
}

export const financialTemplates: FinancialTemplate[] = [
  {
    id: "pnl-basic",
    name: "P&L Statement (Basic)",
    description: "Basic Profit & Loss structure with Gross Profit and Net Profit",
    rows: [
      {
        name: "Gross Profit",
        formulaType: "subtract",
        rowReferences: ["Revenue", "COGS"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "COGS",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "single" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
      {
        name: "Operating Income",
        formulaType: "subtract",
        rowReferences: ["Gross Profit", "Operating Expenses"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "Operating Expenses",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "single" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
      {
        name: "Net Profit",
        formulaType: "subtract",
        rowReferences: ["Operating Income", "Tax"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "Tax",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "double" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
    ],
  },
  {
    id: "pnl-ebitda",
    name: "P&L with EBITDA",
    description: "P&L structure including EBITDA calculation",
    rows: [
      {
        name: "Gross Profit",
        formulaType: "subtract",
        rowReferences: ["Revenue", "COGS"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "COGS",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "single" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
      {
        name: "EBITDA",
        formulaType: "subtract",
        rowReferences: ["Gross Profit", "Operating Expenses"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "Operating Expenses",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "single" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
      {
        name: "EBIT",
        formulaType: "subtract",
        rowReferences: ["EBITDA", "Depreciation", "Amortization"],
        customFormula: "",
        parentRowKey: null,
        insertAfterRowKey: "Amortization",
        insertAtTop: false,
        style: { ...defaultRowStyle, bold: true, borderBottom: "single" },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
      },
    ],
  },
];

export function applyFinancialTemplate(
  template: FinancialTemplate
): CalculatedRowDefinition[] {
  return template.rows.map((row, index) => ({
    ...row,
    id: generateCalcRowId(),
    order: index,
  }));
}
