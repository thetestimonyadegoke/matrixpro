import powerbi from "powerbi-visuals-api";
import { generateRowKey, generateColumnKey } from "./keys";

export interface TreeNode {
  key: string;
  label: string;
  value: powerbi.PrimitiveValue;
  level: number;
  // Store raw values from the matrix node; type is kept loose here to avoid SDK typing issues
  path: any[];
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
  calculatedRowStyle?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    textColor?: string;
    borderTop?: "none" | "single" | "double";
    borderBottom?: "none" | "single" | "double";
  };
}

export function buildRowTree(
  matrixNode: powerbi.DataViewMatrixNode,
  levelSources: powerbi.DataViewMetadataColumn[],
  // Relax identity and selection id typing
  selectionIdBuilder: (identity: any) => any | undefined,
  path: any[] = [],
  level: number = 0
): TreeNode {
  const nodeValue = matrixNode.value;
  const label = nodeValue !== undefined && nodeValue !== null ? String(nodeValue) : "";
  const currentPath: any[] = nodeValue !== undefined
    ? [...path, nodeValue]
    : path;

  const isSubtotal = matrixNode.isSubtotal === true;
  const isGrandTotal = level === 0 && isSubtotal;

  const baseKeyPath: any[] = currentPath.length > 0 ? currentPath : ["root"];
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
    for (const child of matrixNode.children) {
      children.push(
        buildRowTree(
          child,
          levelSources,
          selectionIdBuilder,
          currentPath,
          level + 1
        )
      );
    }
  }

  const isLeaf = children.length === 0;

  let selectionId: any | undefined;
  if (matrixNode.identity) {
    selectionId = selectionIdBuilder(matrixNode.identity);
  }

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
  result: FlattenedNode[] = [],
  indent: number = 0,
  seenKeys: Set<string> = new Set<string>()
): FlattenedNode[] {
  const isExpanded = expandedState.get(node.key) ?? node.isExpanded;
  const hasChildren = node.children.length > 0;

  if (node.isSubtotal && !showSubtotals && !node.isGrandTotal) {
    return result;
  }

  // Prevent duplicate nodes
  if (seenKeys.has(node.key)) {
    return result;
  }

  if (node.level > 0 || node.isGrandTotal) {
    seenKeys.add(node.key);
    result.push({
      ...node,
      isExpanded,
      indent,
      hasChildren,
      visibleIndex: result.length,
    });
  }

  if (hasChildren && isExpanded) {
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
        flattenTree(subtotal, expandedState, showSubtotals, subtotalPosition, result, indent, seenKeys);
      }
    }

    for (const child of regularNodes) {
      flattenTree(child, expandedState, showSubtotals, subtotalPosition, result, indent + 1, seenKeys);
    }

    if (subtotalPosition === "bottom") {
      for (const subtotal of subtotalNodes) {
        flattenTree(subtotal, expandedState, showSubtotals, subtotalPosition, result, indent, seenKeys);
      }
    }
  }

  return result;
}

export function flattenColumnTree(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean,
  subtotalPosition: "top" | "bottom",
  measureCount: number
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  flattenColumnTreeRecursive(node, expandedState, showSubtotals, subtotalPosition, result, 0);
  return result;
}

function flattenColumnTreeRecursive(
  node: TreeNode,
  expandedState: Map<string, boolean>,
  showSubtotals: boolean,
  subtotalPosition: "top" | "bottom",
  result: FlattenedNode[],
  indent: number
): void {
  const isExpanded = expandedState.get(node.key) ?? node.isExpanded;
  const hasChildren = node.children.length > 0;

  if (node.isSubtotal && !showSubtotals && !node.isGrandTotal) {
    return;
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

  if (hasChildren && isExpanded) {
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
        flattenColumnTreeRecursive(subtotal, expandedState, showSubtotals, subtotalPosition, result, indent);
      }
    }

    for (const child of regularNodes) {
      flattenColumnTreeRecursive(child, expandedState, showSubtotals, subtotalPosition, result, indent + 1);
    }

    if (subtotalPosition === "bottom") {
      for (const subtotal of subtotalNodes) {
        flattenColumnTreeRecursive(subtotal, expandedState, showSubtotals, subtotalPosition, result, indent);
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
