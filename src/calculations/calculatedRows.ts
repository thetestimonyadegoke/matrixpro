/**
 * Calculated Rows System
 * Manages visual-level computed rows for financial statements
 * (e.g., Gross Profit = Revenue - COGS, EBITDA, Net Profit)
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";

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
  parentRowKey: string | null;
  insertAfterRowKey: string | null;
  insertAtTop: boolean;
  style: RowStyle;
  includeInTotals: boolean;
  isSubtotal: boolean;
  enabled: boolean;
  order: number;
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
 * Create a virtual FlattenedNode for a calculated row
 */
function createVirtualRowNode(
  def: CalculatedRowDefinition,
  indent: number,
  visibleIndex: number
): FlattenedNode {
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
    indent: def.style.indentOverride ?? indent,
    hasChildren: false,
    visibleIndex,
  };
}

/**
 * Compute values for a calculated row across all columns and measures
 */
function computeCalculatedRowValues(
  def: CalculatedRowDefinition,
  referencedRows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measures: MeasureInfo[]
): Map<string, CellValue> {
  const result = new Map<string, CellValue>();
  const virtualRowKey = `__calcrow__${def.id}`;

  for (const col of columns) {
    for (const measure of measures) {
      let value: number | null = null;

      if (def.formulaType === "sum") {
        value = 0;
        for (const row of referencedRows) {
          const cellKey = `${row.key}|${col.key}|${measure.index}`;
          const cell = cellMap.get(cellKey);
          if (cell?.value !== null && cell?.value !== undefined) {
            value += cell.value;
          }
        }
      } else if (def.formulaType === "subtract") {
        if (referencedRows.length >= 1) {
          const firstCellKey = `${referencedRows[0].key}|${col.key}|${measure.index}`;
          const firstCell = cellMap.get(firstCellKey);
          value = firstCell?.value ?? 0;

          for (let i = 1; i < referencedRows.length; i++) {
            const cellKey = `${referencedRows[i].key}|${col.key}|${measure.index}`;
            const cell = cellMap.get(cellKey);
            if (cell?.value !== null && cell?.value !== undefined) {
              value -= cell.value;
            }
          }
        }
      }

      const cellKey = `${virtualRowKey}|${col.key}|${measure.index}`;
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
  calcRowDefs: CalculatedRowDefinition[]
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

  for (const def of enabledDefs) {
    // Resolve referenced rows
    const referencedRows: FlattenedNode[] = [];
    for (const ref of def.rowReferences) {
      const row = rowKeyMap.get(ref) || rowKeyMap.get(ref.toLowerCase());
      if (row) {
        referencedRows.push(row);
      }
    }

    // Compute values
    const calcValues = computeCalculatedRowValues(
      def,
      referencedRows,
      mergedCellMap,
      columns,
      measures
    );

    // Merge computed values
    for (const [key, value] of calcValues) {
      mergedCellMap.set(key, value);
    }

    // Determine insertion position
    let insertIndex = resultRows.length;
    let indent = 0;

    if (def.insertAfterRowKey) {
      const afterRow = rowKeyMap.get(def.insertAfterRowKey);
      if (afterRow) {
        const idx = resultRows.findIndex(r => r.key === afterRow.key);
        if (idx >= 0) {
          insertIndex = idx + 1;
          indent = afterRow.indent;
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
