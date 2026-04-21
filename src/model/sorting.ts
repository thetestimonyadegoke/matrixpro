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

/**
 * Multi-column sort: applies an array of SortConfigs in priority order.
 * Each config sorts siblings that compare equal under all higher-priority configs.
 */
export function sortFlattenedRowsMulti(
  rows: FlattenedNode[],
  model: MatrixModel,
  configs: SortConfig[]
): FlattenedNode[] {
  const active = configs.filter(c => c.direction !== "none" && c.columnKey);
  if (active.length === 0) return rows;
  // Apply primary sort, then for ties apply secondary etc.
  // We do a single pass using a composite comparator.
  const result: FlattenedNode[] = [];
  const processed = new Set<number>();
  const minIndent = Math.min(...rows.map(r => r.indent));

  // Re-use existing single-config infrastructure but with composite comparator injected via the first config
  // For true multi-sort we override the comparator at the sibling level:
  function compareSiblings(a: FlattenedNode, b: FlattenedNode): number {
    if (a.isSubtotal && !b.isSubtotal) return 1;
    if (!a.isSubtotal && b.isSubtotal) return -1;
    if (a.isGrandTotal && !b.isGrandTotal) return 1;
    if (!a.isGrandTotal && b.isGrandTotal) return -1;
    for (const cfg of active) {
      const cellA = getCellValue(model.cellMap, a.key, cfg.columnKey!, cfg.measureIndex);
      const cellB = getCellValue(model.cellMap, b.key, cfg.columnKey!, cfg.measureIndex);
      const valA = cellA?.value ?? (cfg.direction === "asc" ? Infinity : -Infinity);
      const valB = cellB?.value ?? (cfg.direction === "asc" ? Infinity : -Infinity);
      const diff = cfg.direction === "asc" ? valA - valB : valB - valA;
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function processLevelMulti(startIndex: number, parentIndent: number): void {
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
    const sorted = [...siblings].sort((a, b) => compareSiblings(a.node, b.node));
    for (const s of sorted) {
      result.push({ ...s.node, visibleIndex: result.length });
      if (s.children.length > 0) {
        const childRows = s.children.map(idx => rows[idx]);
        s.children.forEach(idx => processed.add(idx));
        const childIndent = childRows[0]?.indent ?? parentIndent + 1;
        sortChildRowsMulti(childRows, childIndent);
      }
    }
  }

  function sortChildRowsMulti(childRows: FlattenedNode[], currentIndent: number): void {
    const siblings: { node: FlattenedNode; children: FlattenedNode[] }[] = [];
    let i = 0;
    while (i < childRows.length) {
      const row = childRows[i];
      if (row.indent === currentIndent) {
        const children: FlattenedNode[] = [];
        let j = i + 1;
        while (j < childRows.length && childRows[j].indent > currentIndent) {
          children.push(childRows[j++]);
        }
        siblings.push({ node: row, children });
        i = j;
      } else { i++; }
    }
    const sorted = [...siblings].sort((a, b) => compareSiblings(a.node, b.node));
    for (const s of sorted) {
      result.push({ ...s.node, visibleIndex: result.length });
      if (s.children.length > 0) {
        sortChildRowsMulti(s.children, s.children[0].indent);
      }
    }
  }

  processLevelMulti(0, minIndent);
  for (let i = 0; i < rows.length; i++) {
    if (!processed.has(i)) result.push({ ...rows[i], visibleIndex: result.length });
  }
  return result;
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
