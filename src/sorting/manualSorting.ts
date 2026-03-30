/**
 * Manual Sorting System
 * Enables user-defined row ordering with drag-and-drop support
 */

import { FlattenedNode, TreeNode } from "../model/tree";

export type SortMode = "automatic" | "manual";

export interface ManualSortConfig {
  enabled: boolean;
  mode: SortMode;
  rowOrder: Record<string, string[]>;
}

export const defaultManualSortConfig: ManualSortConfig = {
  enabled: false,
  mode: "automatic",
  rowOrder: {},
};

/**
 * Apply manual sorting to a tree's children based on stored order
 */
export function applyManualOrderToTree(
  node: TreeNode,
  manualOrder: Record<string, string[]>
): TreeNode {
  if (!node.children || node.children.length === 0) {
    return node;
  }

  const orderForNode = manualOrder[node.key];
  let sortedChildren: TreeNode[];

  if (orderForNode && orderForNode.length > 0) {
    const orderMap = new Map<string, number>();
    orderForNode.forEach((key, index) => {
      orderMap.set(key, index);
    });

    sortedChildren = [...node.children].sort((a, b) => {
      const aOrder = orderMap.get(a.key);
      const bOrder = orderMap.get(b.key);

      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return 0;
    });
  } else {
    sortedChildren = node.children;
  }

  return {
    ...node,
    children: sortedChildren.map(child => applyManualOrderToTree(child, manualOrder)),
  };
}

/**
 * Apply manual sorting to flattened rows
 * This reorders siblings within the same parent group
 */
export function applyManualOrderToFlattenedRows(
  rows: FlattenedNode[],
  manualOrder: Record<string, string[]>
): FlattenedNode[] {
  if (Object.keys(manualOrder).length === 0) {
    return rows;
  }

  const result: FlattenedNode[] = [];
  const processed = new Set<string>();

  // Build parent-to-children mapping
  const groupByParent = new Map<string, FlattenedNode[]>();
  
  for (const row of rows) {
    const parentKey = getParentKey(row);
    if (!groupByParent.has(parentKey)) {
      groupByParent.set(parentKey, []);
    }
    groupByParent.get(parentKey)!.push(row);
  }

  // Build row lookup map
  const rowMap = new Map(rows.map(r => [r.key, r]));

  function addRowsRecursively(parentKey: string, indent: number): void {
    const siblings = groupByParent.get(parentKey) || [];
    const orderForParent = manualOrder[parentKey];
    
    let orderedSiblings: FlattenedNode[];
    
    if (orderForParent && orderForParent.length > 0) {
      // Sort siblings according to stored order
      const orderMap = new Map<string, number>();
      orderForParent.forEach((key, index) => {
        orderMap.set(key, index);
      });

      // Separate ordered and unordered siblings
      const ordered: FlattenedNode[] = [];
      const unordered: FlattenedNode[] = [];
      
      for (const sibling of siblings) {
        if (orderMap.has(sibling.key)) {
          ordered.push(sibling);
        } else {
          unordered.push(sibling);
        }
      }
      
      // Sort ordered siblings by their position
      ordered.sort((a, b) => {
        const aPos = orderMap.get(a.key)!;
        const bPos = orderMap.get(b.key)!;
        return aPos - bPos;
      });
      
      // Combine: ordered first, then unordered
      orderedSiblings = [...ordered, ...unordered];
    } else {
      orderedSiblings = siblings;
    }
    
    for (const row of orderedSiblings) {
      if (processed.has(row.key)) continue;
      processed.add(row.key);
      result.push({ ...row, visibleIndex: result.length });

      if (row.hasChildren && row.isExpanded) {
        addRowsRecursively(row.key, indent + 1);
      }
    }
  }

  addRowsRecursively("root", 0);

  // Add any remaining rows not processed
  for (const row of rows) {
    if (!processed.has(row.key)) {
      result.push({ ...row, visibleIndex: result.length });
    }
  }

  return result;
}

function getParentKey(row: FlattenedNode): string {
  if (row.path.length <= 1) {
    return "root";
  }
  return row.path.slice(0, -1).join("⟂");
}

/**
 * Move a row to a new position within its sibling group
 */
export function moveRowInOrder(
  currentOrder: Record<string, string[]>,
  rowKey: string,
  parentKey: string,
  newIndex: number,
  siblings: string[]
): Record<string, string[]> {
  const currentSiblingOrder = currentOrder[parentKey] || [...siblings];
  
  const currentIndex = currentSiblingOrder.indexOf(rowKey);
  if (currentIndex === -1) {
    const newOrder = [...currentSiblingOrder];
    newOrder.splice(newIndex, 0, rowKey);
    return { ...currentOrder, [parentKey]: newOrder };
  }

  const newOrder = [...currentSiblingOrder];
  newOrder.splice(currentIndex, 1);
  newOrder.splice(newIndex, 0, rowKey);

  return { ...currentOrder, [parentKey]: newOrder };
}

/**
 * Get the current order for a parent's children
 */
export function getOrderForParent(
  manualOrder: Record<string, string[]>,
  parentKey: string,
  defaultChildren: string[]
): string[] {
  const stored = manualOrder[parentKey];
  if (stored && stored.length > 0) {
    const storedSet = new Set(stored);
    const newChildren = defaultChildren.filter(k => !storedSet.has(k));
    return [...stored, ...newChildren];
  }
  return defaultChildren;
}

/**
 * Reset manual order for a specific parent
 */
export function resetOrderForParent(
  currentOrder: Record<string, string[]>,
  parentKey: string
): Record<string, string[]> {
  const newOrder = { ...currentOrder };
  delete newOrder[parentKey];
  return newOrder;
}

/**
 * Reset all manual ordering
 */
export function resetAllManualOrder(): Record<string, string[]> {
  return {};
}

export interface DragState {
  isDragging: boolean;
  draggedRowKey: string | null;
  draggedRowParentKey: string | null;
  targetIndex: number | null;
  targetParentKey: string | null;
}

export const initialDragState: DragState = {
  isDragging: false,
  draggedRowKey: null,
  draggedRowParentKey: null,
  targetIndex: null,
  targetParentKey: null,
};

/**
 * Calculate drop target index from mouse position
 */
export function calculateDropIndex(
  mouseY: number,
  scrollTop: number,
  rowHeight: number,
  headerHeight: number,
  totalRows: number
): number {
  const adjustedY = mouseY + scrollTop - headerHeight;
  const rawIndex = Math.floor(adjustedY / rowHeight);
  return Math.max(0, Math.min(rawIndex, totalRows));
}

/**
 * Check if a drop is valid (same parent in v1)
 */
export function isValidDrop(
  draggedParentKey: string | null,
  targetParentKey: string | null
): boolean {
  return draggedParentKey === targetParentKey;
}
