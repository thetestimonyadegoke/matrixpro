import powerbi from "powerbi-visuals-api";
import { generateRowKey, generateColumnKey } from "./keys";

export interface TreeNode {
  key: string;
  parentKey?: string;
  label: string;
  value: powerbi.PrimitiveValue;
  level: number;
  // Store raw values from the matrix node; type is kept loose here to avoid SDK typing issues
  path: any[];
  keyPath?: any[];
  children: TreeNode[];
  isExpanded: boolean;
  isLeaf: boolean;
  isSubtotal: boolean;
  isGrandTotal: boolean;
  // Relax selection id and identity types to avoid tight coupling to SDK internals
  selectionId?: any;
  identity?: any;
}

export interface FlattenedNode extends TreeNode {
  indent: number;
  hasChildren: boolean;
  visibleIndex: number;
  isCalculatedRow?: boolean;
  isSpacer?: boolean;
  isDivider?: boolean;
  customHeight?: number;
  calculatedRowStyle?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    textColor?: string;
    borderTop?: "none" | "single" | "double";
    borderBottom?: "none" | "single" | "double";
  };
  /** Discriminator for inserted rows that are not the default "calculated". */
  calcRowKind?: "calculated" | "blank" | "group" | "child" | "divider";
  /** Group row only — whether its children are hidden. */
  groupCollapsed?: boolean;
  /** Group / child row back-reference to parent group id. */
  calcRowGroupId?: string;
  /** Divider row presentation. */
  dividerProps?: { lineStyle: "single" | "double" | "dashed"; lineColor: string };
  /** Blank row height override (px). */
  blankHeight?: number;
  /** Original inserted-row definition id (used for collapse-toggle persistence). */
  calcRowDefId?: string;
}

export type SubtotalPositionResolver = "top" | "bottom" | ((node: TreeNode) => "top" | "bottom");

export function buildRowTree(
  matrixNode: powerbi.DataViewMatrixNode,
  levelSources: powerbi.DataViewMetadataColumn[],
  // Relax identity and selection id typing
  selectionIdBuilder: (node: any, levels?: powerbi.DataViewHierarchyLevel[]) => any | undefined,
  path: any[] = [],
  level: number = 0,
  hierarchyLevels: powerbi.DataViewHierarchyLevel[] = [],
  keyPath: any[] = [],
  siblingOrdinal: number = 0,
  parentKey?: string
): TreeNode {
  const nodeValue = matrixNode.value;
  const label = nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : "";
  const currentPath: any[] = nodeValue !== undefined
    ? [...path, nodeValue]
    : path;
  const rawKeyPath: any[] = nodeValue !== undefined
    ? [...keyPath, nodeValue]
    : keyPath;
  const currentKeyPath = siblingOrdinal > 0
    ? [...rawKeyPath, `__duplicate_${siblingOrdinal}`]
    : rawKeyPath;

  const isSubtotal = matrixNode.isSubtotal === true;
  const isGrandTotal = level === 0 && isSubtotal;

  const baseKeyPath: any[] = currentKeyPath.length > 0 ? currentKeyPath : ["root"];
  const keyedPath: any[] = isGrandTotal
    ? [...baseKeyPath, "__grand_total"]
    : isSubtotal
      ? [...baseKeyPath, "__subtotal"]
      : baseKeyPath;

  const key = generateRowKey(
    keyedPath as (string | number)[]
  );

  const children: TreeNode[] = [];
  if (matrixNode.children) {
    const siblingCounts = new Map<string, number>();
    for (const child of matrixNode.children) {
      const childKeyBase = JSON.stringify([
        child.value === undefined ? "__undefined__" : child.value,
        child.isSubtotal === true ? "subtotal" : "regular",
      ]);
      const childOrdinal = siblingCounts.get(childKeyBase) ?? 0;
      siblingCounts.set(childKeyBase, childOrdinal + 1);
      children.push(
        buildRowTree(
          child,
          levelSources,
          selectionIdBuilder,
          currentPath,
          level + 1,
          hierarchyLevels,
          currentKeyPath,
          childOrdinal,
          level === 0 ? "root" : key
        )
      );
    }
  }

  const isLeaf = children.length === 0;

  let selectionId: any | undefined;
  if (matrixNode.identity) {
    selectionId = selectionIdBuilder(matrixNode, hierarchyLevels);
  }

  return {
    key,
    parentKey,
    label: isGrandTotal ? "Grand Total" : isSubtotal ? `${label} Total` : label,
    value: nodeValue,
    level,
    path: currentPath,
    keyPath: currentKeyPath,
    children,
    isExpanded: true,
    isLeaf,
    isSubtotal,
    isGrandTotal,
    selectionId,
    identity: matrixNode.identity,
  };
}

export function buildColumnTree(
  matrixNode: powerbi.DataViewMatrixNode,
  levelSources: powerbi.DataViewMetadataColumn[],
  // Use a loose path type here; TreeNode.path is powerbi.PrimitiveValue[]
  path: any[] = [],
  level: number = 0
): TreeNode {
  const nodeValue = matrixNode.value;
  const label = nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : "";
  const currentPath = nodeValue !== undefined ? [...path, nodeValue] : path;

  const isSubtotal = matrixNode.isSubtotal === true;
  const isGrandTotal = level === 0 && isSubtotal;
  const baseKeyPath: any[] = currentPath.length > 0 ? currentPath : ["root"];
  const keyedPath: any[] = isGrandTotal
    ? [...baseKeyPath, "__grand_total"]
    : isSubtotal
      ? [...baseKeyPath, "__subtotal"]
      : baseKeyPath;

  const key = generateColumnKey(
    keyedPath as (string | number)[]
  );

  const children: TreeNode[] = [];
  if (matrixNode.children) {
    for (const child of matrixNode.children) {
      children.push(
        buildColumnTree(
          child,
          levelSources,
          currentPath,
          level + 1
        )
      );
    }
  }

  const isLeaf = children.length === 0;

  return {
    key,
    label: isGrandTotal ? "Grand Total" : isSubtotal ? `${label} Total` : label,
    value: nodeValue,
    level,
    path: currentPath,
    children,
    isExpanded: true,
    isLeaf,
    isSubtotal,
    isGrandTotal,
  };
}

export function flattenTree(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean,
  subtotalPosition: "top" | "bottom",
  hiddenLevels: string[] = [],
  result: FlattenedNode[] = [],
  indent: number = 0
): FlattenedNode[] {
  const isExpanded = expandedState.get(node.key) ?? node.isExpanded;
  const hasChildren = node.children.length > 0;

  if (node.isSubtotal && !node.isGrandTotal) {
    if (!showSubtotals) return result;
    if (hiddenLevels && hiddenLevels.includes(String(Math.max(0, node.level - 1)))) return result;
  }

  if (node.level > 0 || node.isGrandTotal) {
    result.push({
      ...node,
      isExpanded,
      indent,
      hasChildren,
      visibleIndex: result.length,
    });
  }

  if ((isExpanded && hasChildren) || node.level === 0) {
    const subtotalNodes: TreeNode[] = [];
    const regularNodes: TreeNode[] = [];

    for (const child of node.children) {
      if (child.isSubtotal) {
        subtotalNodes.push(child);
      } else {
        regularNodes.push(child);
      }
    }

    if (subtotalPosition === "top") {
      for (const subtotal of subtotalNodes) {
        flattenTree(subtotal, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent);
      }
    }

    for (const child of regularNodes) {
      flattenTree(child, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent + 1);
    }

    if (subtotalPosition === "bottom") {
      for (const subtotal of subtotalNodes) {
        flattenTree(subtotal, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent);
      }
    }
  }

  return result;
}

function findTreeNodeByKey(node: TreeNode | null, key: string): TreeNode | null {
  if (!node) return null;
  if (node.key === key) return node;

  for (const child of node.children) {
    const match = findTreeNodeByKey(child, key);
    if (match) return match;
  }

  return null;
}

function collectTreeKeys(node: TreeNode, out: string[]): void {
  out.push(node.key);
  for (const child of node.children) {
    collectTreeKeys(child, out);
  }
}

export function getNodeAndDescendantKeys(root: TreeNode | null, key: string): string[] {
  const target = findTreeNodeByKey(root, key);
  if (!target) return key ? [key] : [];

  const keys: string[] = [];
  collectTreeKeys(target, keys);
  return keys;
}

export function flattenColumnTree(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean,
  subtotalPosition: SubtotalPositionResolver,
  measureCount: number,
  hiddenLevels: string[] = []
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  flattenColumnTreeRecursive(node, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, 0);
  return result;
}

function flattenColumnTreeRecursive(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean,
  subtotalPosition: SubtotalPositionResolver,
  hiddenLevels: string[],
  result: FlattenedNode[],
  indent: number
): void {
  const isExpanded = expandedState.get(node.key) ?? node.isExpanded;
  const hasChildren = node.children.length > 0;

  if (node.isSubtotal && !node.isGrandTotal) {
    if (!showSubtotals) return;
    if (hiddenLevels && hiddenLevels.includes(String(Math.max(0, node.level - 1)))) return;
  }

  if (node.level > 0 || node.isGrandTotal) {
    result.push({
      ...node,
      isExpanded,
      indent,
      hasChildren,
      visibleIndex: result.length,
    });
  }

  if ((isExpanded && hasChildren) || node.level === 0) {
    const subtotalNodes: TreeNode[] = [];
    const regularNodes: TreeNode[] = [];

    for (const child of node.children) {
      if (child.isSubtotal) {
        subtotalNodes.push(child);
      } else {
        regularNodes.push(child);
      }
    }

    const resolvedSubtotalPosition = typeof subtotalPosition === "function" ? subtotalPosition(node) : subtotalPosition;

    if (resolvedSubtotalPosition === "top") {
      for (const subtotal of subtotalNodes) {
        flattenColumnTreeRecursive(subtotal, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent);
      }
    }

    for (const child of regularNodes) {
      flattenColumnTreeRecursive(child, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent + 1);
    }

    if (resolvedSubtotalPosition === "bottom") {
      for (const subtotal of subtotalNodes) {
        flattenColumnTreeRecursive(subtotal, expandedState, showSubtotals, subtotalPosition, hiddenLevels, result, indent);
      }
    }
  }
}

export function toggleNodeExpansion(
  expandedState: Map<string, boolean>,
  nodeKey: string,
  currentState: boolean
): Map<string, boolean> {
  const newState = new Map(expandedState);
  newState.set(nodeKey, !currentState);
  return newState;
}

export function getLeafNodes(node: TreeNode): TreeNode[] {
  if (node.isLeaf) {
    return [node];
  }
  const leaves: TreeNode[] = [];
  for (const child of node.children) {
    leaves.push(...getLeafNodes(child));
  }
  return leaves;
}

export function countVisibleNodes(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean
): number {
  let count = 0;

  if (node.isSubtotal && !showSubtotals && !node.isGrandTotal) {
    return 0;
  }

  if (node.level > 0 || node.isGrandTotal) {
    count = 1;
  }

  const isExpanded = expandedState.get(node.key) ?? node.isExpanded;
  if (node.children.length > 0 && isExpanded) {
    for (const child of node.children) {
      count += countVisibleNodes(child, expandedState, showSubtotals);
    }
  }

  return count;
}
