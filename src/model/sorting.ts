import { FlattenedNode } from "./tree";
import { MatrixModel, getCellValue } from "./pivot";

export type SortDirection = "asc" | "desc" | "none";

export interface SortConfig {
  columnKey: string | null;
  measureIndex: number;
  direction: SortDirection;
}

function processLevel(
  rows: FlattenedNode[],
  result: FlattenedNode[],
  processed: Set<number>,
  startIndex: number,
  parentIndent: number,
  sortConfig: SortConfig,
  model: MatrixModel
): void {
  const siblings: { node: FlattenedNode; originalIndex: number; children: number[] }[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    if (processed.has(i)) continue;

    const row = rows[i];
    if (row.indent < parentIndent) break;
    if (row.indent === parentIndent) {
      const childIndices: number[] = [];
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].indent <= parentIndent) break;
        childIndices.push(j);
      }
      siblings.push({ node: row, originalIndex: i, children: childIndices });
      processed.add(i);
    }
  }

  const sortedSiblings = sortSiblings(siblings.map(s => s.node), model, sortConfig);

  for (const sortedNode of sortedSiblings) {
    const original = siblings.find(s => s.node.key === sortedNode.key)!;
    result.push({
      ...sortedNode,
      visibleIndex: result.length,
    });

    if (original.children.length > 0) {
      const childRows = original.children.map(idx => rows[idx]);
      const firstChildIndent = childRows[0]?.indent ?? parentIndent + 1;

      for (const idx of original.children) {
        processed.add(idx);
      }

      const tempRows = childRows;
      const childResult = sortChildRows(tempRows, model, sortConfig, firstChildIndent);
      for (const child of childResult) {
        result.push({
          ...child,
          visibleIndex: result.length,
        });
      }
    }
  }
}

function sortSiblings(
  siblingsToSort: FlattenedNode[],
  model: MatrixModel,
  sortConfig: SortConfig
): FlattenedNode[] {
  return [...siblingsToSort].sort((a, b) => {
    if (a.isSubtotal && !b.isSubtotal) return 1;
    if (!a.isSubtotal && b.isSubtotal) return -1;
    if (a.isGrandTotal && !b.isGrandTotal) return 1;
    if (!a.isGrandTotal && b.isGrandTotal) return -1;

    const cellA = getCellValue(model.cellMap, a.key, sortConfig.columnKey!, sortConfig.measureIndex);
    const cellB = getCellValue(model.cellMap, b.key, sortConfig.columnKey!, sortConfig.measureIndex);

    const valA = cellA?.value ?? (sortConfig.direction === "asc" ? Infinity : -Infinity);
    const valB = cellB?.value ?? (sortConfig.direction === "asc" ? Infinity : -Infinity);

    if (sortConfig.direction === "asc") {
      return valA - valB;
    } else {
      return valB - valA;
    }
  });
}

export function sortFlattenedRows(
  rows: FlattenedNode[],
  model: MatrixModel,
  sortConfig: SortConfig
): FlattenedNode[] {
  if (sortConfig.direction === "none" || !sortConfig.columnKey) {
    return rows;
  }

  const result: FlattenedNode[] = [];
  const processed = new Set<number>();

  const minIndent = Math.min(...rows.map(r => r.indent));
  processLevel(rows, result, processed, 0, minIndent, sortConfig, model);

  for (let i = 0; i < rows.length; i++) {
    if (!processed.has(i)) {
      result.push({
        ...rows[i],
        visibleIndex: result.length,
      });
    }
  }

  return result;
}

function sortChildRows(
  rows: FlattenedNode[],
  model: MatrixModel,
  sortConfig: SortConfig,
  currentIndent: number
): FlattenedNode[] {
  if (rows.length === 0) return [];

  const result: FlattenedNode[] = [];
  const siblings: { node: FlattenedNode; children: FlattenedNode[] }[] = [];

  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row.indent === currentIndent) {
      const children: FlattenedNode[] = [];
      let j = i + 1;
      while (j < rows.length && rows[j].indent > currentIndent) {
        children.push(rows[j]);
        j++;
      }
      siblings.push({ node: row, children });
      i = j;
    } else {
      i++;
    }
  }

  const sortedSiblings = [...siblings].sort((a, b) => {
    if (a.node.isSubtotal && !b.node.isSubtotal) return 1;
    if (!a.node.isSubtotal && b.node.isSubtotal) return -1;
    if (a.node.isGrandTotal && !b.node.isGrandTotal) return 1;
    if (!a.node.isGrandTotal && b.node.isGrandTotal) return -1;

    const cellA = getCellValue(model.cellMap, a.node.key, sortConfig.columnKey!, sortConfig.measureIndex);
    const cellB = getCellValue(model.cellMap, b.node.key, sortConfig.columnKey!, sortConfig.measureIndex);

    const valA = cellA?.value ?? (sortConfig.direction === "asc" ? Infinity : -Infinity);
    const valB = cellB?.value ?? (sortConfig.direction === "asc" ? Infinity : -Infinity);

    return sortConfig.direction === "asc" ? valA - valB : valB - valA;
  });

  for (const sibling of sortedSiblings) {
    result.push(sibling.node);
    if (sibling.children.length > 0) {
      const childIndent = sibling.children[0].indent;
      const sortedChildren = sortChildRows(sibling.children, model, sortConfig, childIndent);
      result.push(...sortedChildren);
    }
  }

  return result;
}

export function toggleSortDirection(current: SortDirection): SortDirection {
  switch (current) {
    case "none":
      return "asc";
    case "asc":
      return "desc";
    case "desc":
      return "none";
    default:
      return "asc";
  }
}

export function createSortConfig(
  columnKey: string | null,
  measureIndex: number,
  direction: SortDirection
): SortConfig {
  return { columnKey, measureIndex, direction };
}
