import { CellValue, MeasureInfo, formatValue } from "./pivot";
import { generateCellKey } from "./keys";
import { FlattenedNode, TreeNode } from "./tree";

export type AggregationOverride = "sum" | "avg" | "min" | "max" | "count" | "none";

export interface CellMapLike {
  get: (key: string) => CellValue | undefined;
  values: () => IterableIterator<CellValue>;
}

function isPathPrefix(prefix: readonly unknown[], path: readonly unknown[] | undefined): boolean {
  if (prefix.length === 0) return true;
  if (!path || path.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false;
  }
  return true;
}

function collectLeafRows(rowTree: TreeNode | null | undefined, fallbackRows: FlattenedNode[]): Array<{ key: string; path: readonly unknown[] }> {
  if (!rowTree) {
    return fallbackRows
      .filter(row => row.isLeaf && !row.isSubtotal && !row.isGrandTotal)
      .map(row => ({ key: row.key, path: row.path || [] }));
  }
  const leaves: Array<{ key: string; path: readonly unknown[] }> = [];
  const visit = (node: TreeNode) => {
    if (node.isSubtotal || node.isGrandTotal) return;
    const realChildren = node.children.filter(child => !child.isSubtotal && !child.isGrandTotal);
    if (node.level > 0 && realChildren.length === 0) {
      leaves.push({ key: node.key, path: node.path || [] });
      return;
    }
    for (const child of realChildren) visit(child);
  };
  visit(rowTree);
  return leaves;
}

function aggregate(values: number[], override: AggregationOverride): number | null {
  switch (override) {
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return values.reduce((a, b) => (b < a ? b : a), values[0]);
    case "max": return values.reduce((a, b) => (b > a ? b : a), values[0]);
    case "count": return values.length;
    case "none": return null;
    default: return values.reduce((a, b) => a + b, 0);
  }
}

/**
 * Recomputes subtotal / grand-total cells for measures whose aggregation was
 * overridden (avg, min, max, count, none). Each total row aggregates only the
 * leaf rows beneath it in the full row tree, so collapsed groups still count
 * and a category subtotal never mixes in other categories. Non-total cells are
 * served unchanged from the base cell map.
 */
export function applyAggregationOverrides(
  base: CellMapLike,
  displayRows: FlattenedNode[],
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  rowTree: TreeNode | null | undefined,
  overrides: Record<number, string>
): CellMapLike {
  const activeMeasures = measures
    .map((measure, position) => ({ measure, position, override: overrides[measure.index ?? position] as AggregationOverride | undefined }))
    .filter(item => item.override && item.override !== "sum");
  if (activeMeasures.length === 0) return base;

  const totalRows = displayRows.filter(row => row.isSubtotal || row.isGrandTotal);
  if (totalRows.length === 0) return base;

  const columnKeys = Array.from(new Set(columns.map(col => col.key)));
  const leaves = collectLeafRows(rowTree, displayRows);
  const patched = new Map<string, CellValue>();

  for (const totalRow of totalRows) {
    const prefix = totalRow.isGrandTotal ? [] : (totalRow.path || []);
    const sourceRows = leaves.filter(leaf => isPathPrefix(prefix, leaf.path));
    if (sourceRows.length === 0) continue;

    for (const colKey of columnKeys) {
      for (const { measure, position, override } of activeMeasures) {
        const values: number[] = [];
        for (const leaf of sourceRows) {
          const value = base.get(generateCellKey(leaf.key, colKey, position))?.value;
          if (value !== null && value !== undefined && !Number.isNaN(value)) values.push(value);
        }
        if (values.length === 0) continue;

        const result = aggregate(values, override!);
        const cellKey = generateCellKey(totalRow.key, colKey, position);
        const existing = base.get(cellKey);
        patched.set(cellKey, {
          ...(existing ?? { measureIndex: position, rowKey: totalRow.key, colKey }),
          value: result,
          formattedValue: result === null ? "" : formatValue(result, override === "count" ? "" : measure.format || ""),
        });
      }
    }
  }

  if (patched.size === 0) return base;

  return {
    get: (key: string) => patched.get(key) ?? base.get(key),
    values: function* (): IterableIterator<CellValue> {
      const emitted = new Set<string>();
      for (const cell of base.values()) {
        const key = generateCellKey(cell.rowKey, cell.colKey, cell.measureIndex);
        const replacement = patched.get(key);
        if (replacement) emitted.add(key);
        yield replacement ?? cell;
      }
      for (const [key, cell] of patched) {
        if (!emitted.has(key)) yield cell;
      }
    },
  };
}
