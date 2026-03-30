import { CellValue, MatrixModel, getCellValue } from "./pivot";
import { FlattenedNode } from "./tree";
import { generateCellKey } from "./keys";

export type AggregationType = "sum" | "avg" | "min" | "max" | "count";

export interface SubtotalConfig {
  aggregationType: AggregationType;
  showRowSubtotals: boolean;
  showColumnSubtotals: boolean;
  showGrandTotals: boolean;
}

export function computeSubtotal(
  values: (number | null)[],
  aggregationType: AggregationType = "sum"
): number | null {
  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));

  if (validValues.length === 0) {
    return null;
  }

  switch (aggregationType) {
    case "sum":
      return validValues.reduce((acc, v) => acc + v, 0);
    case "avg":
      return validValues.reduce((acc, v) => acc + v, 0) / validValues.length;
    case "min":
      return Math.min(...validValues);
    case "max":
      return Math.max(...validValues);
    case "count":
      return validValues.length;
    default:
      return validValues.reduce((acc, v) => acc + v, 0);
  }
}

export function computeRowSubtotals(
  model: MatrixModel,
  parentRowKey: string,
  childRows: FlattenedNode[],
  measureIndex: number,
  aggregationType: AggregationType = "sum"
): Map<string, CellValue> {
  const subtotals = new Map<string, CellValue>();

  for (const col of model.flattenedColumns) {
    if (col.isSubtotal) continue;

    const values: (number | null)[] = [];
    for (const row of childRows) {
      if (!row.isSubtotal) {
        const cell = getCellValue(model.cellMap, row.key, col.key, measureIndex);
        values.push(cell?.value ?? null);
      }
    }

    const subtotalValue = computeSubtotal(values, aggregationType);
    const cellKey = generateCellKey(parentRowKey, col.key, measureIndex);

    subtotals.set(cellKey, {
      value: subtotalValue,
      formattedValue: formatSubtotalValue(subtotalValue),
      measureIndex,
      rowKey: parentRowKey,
      colKey: col.key,
    });
  }

  return subtotals;
}

export function computeColumnSubtotals(
  model: MatrixModel,
  parentColKey: string,
  childCols: FlattenedNode[],
  measureIndex: number,
  aggregationType: AggregationType = "sum"
): Map<string, CellValue> {
  const subtotals = new Map<string, CellValue>();

  for (const row of model.flattenedRows) {
    if (row.isSubtotal) continue;

    const values: (number | null)[] = [];
    for (const col of childCols) {
      if (!col.isSubtotal) {
        const cell = getCellValue(model.cellMap, row.key, col.key, measureIndex);
        values.push(cell?.value ?? null);
      }
    }

    const subtotalValue = computeSubtotal(values, aggregationType);
    const cellKey = generateCellKey(row.key, parentColKey, measureIndex);

    subtotals.set(cellKey, {
      value: subtotalValue,
      formattedValue: formatSubtotalValue(subtotalValue),
      measureIndex,
      rowKey: row.key,
      colKey: parentColKey,
    });
  }

  return subtotals;
}

export function computeGrandTotal(
  model: MatrixModel,
  measureIndex: number,
  aggregationType: AggregationType = "sum"
): number | null {
  const values: (number | null)[] = [];

  for (const row of model.flattenedRows) {
    if (row.isSubtotal || row.isGrandTotal) continue;

    for (const col of model.flattenedColumns) {
      if (col.isSubtotal || col.isGrandTotal) continue;

      const cell = getCellValue(model.cellMap, row.key, col.key, measureIndex);
      if (cell?.value !== null) {
        values.push(cell?.value ?? null);
      }
    }
  }

  return computeSubtotal(values, aggregationType);
}

function formatSubtotalValue(value: number | null): string {
  if (value === null || isNaN(value)) {
    return "—";
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getChildRowsForSubtotal(
  flattenedRows: FlattenedNode[],
  parentIndex: number
): FlattenedNode[] {
  const parent = flattenedRows[parentIndex];
  if (!parent) return [];

  const children: FlattenedNode[] = [];
  const parentIndent = parent.indent;

  for (let i = parentIndex + 1; i < flattenedRows.length; i++) {
    const row = flattenedRows[i];
    if (row.indent <= parentIndent) break;
    if (row.indent === parentIndent + 1 && !row.isSubtotal) {
      children.push(row);
    }
  }

  return children;
}

export function getChildColumnsForSubtotal(
  flattenedColumns: FlattenedNode[],
  parentIndex: number
): FlattenedNode[] {
  const parent = flattenedColumns[parentIndex];
  if (!parent) return [];

  const children: FlattenedNode[] = [];
  const parentIndent = parent.indent;

  for (let i = parentIndex + 1; i < flattenedColumns.length; i++) {
    const col = flattenedColumns[i];
    if (col.indent <= parentIndent) break;
    if (col.indent === parentIndent + 1 && !col.isSubtotal) {
      children.push(col);
    }
  }

  return children;
}
