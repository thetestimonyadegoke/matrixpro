/**
 * Rollup Engine for Parent Category Aggregation
 * Handles hierarchical sum calculations with configurable modes
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";

export type RollupMode = "strict" | "inclusive" | "direct-only";
export type RollupScope = "view-based" | "full-tree";
export type ParentEditPolicy = "disallow" | "allow-override" | "distribute";

export interface RollupSettings {
  mode: RollupMode;
  scope: RollupScope;
  parentEditPolicy: ParentEditPolicy;
  includeCalculatedRows: boolean;
  includeCalculatedMeasures: boolean;
}

export const DEFAULT_ROLLUP_SETTINGS: RollupSettings = {
  mode: "strict",
  scope: "view-based",
  parentEditPolicy: "disallow",
  includeCalculatedRows: true,
  includeCalculatedMeasures: true,
};

export interface RollupResult {
  value: number | null;
  childCount: number;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface RollupContext {
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  cellMap: Map<string, CellValue>;
  settings: RollupSettings;
}

export class RollupEngine {
  private context: RollupContext;
  private rollupCache: Map<string, RollupResult> = new Map();

  constructor(context: RollupContext) {
    this.context = context;
  }

  updateContext(context: Partial<RollupContext>): void {
    this.context = { ...this.context, ...context };
    this.rollupCache.clear();
  }

  clearCache(): void {
    this.rollupCache.clear();
  }

  computeRollup(
    parentRow: FlattenedNode,
    colKey: string,
    measureIndex: number
  ): RollupResult {
    const cacheKey = `${parentRow.key}:${colKey}:${measureIndex}`;

    if (this.rollupCache.has(cacheKey)) {
      return this.rollupCache.get(cacheKey)!;
    }

    const result = this.calculateRollup(parentRow, colKey, measureIndex);
    this.rollupCache.set(cacheKey, result);
    return result;
  }

  private calculateRollup(
    parentRow: FlattenedNode,
    colKey: string,
    measureIndex: number
  ): RollupResult {
    const { mode, scope } = this.context.settings;

    // Get children based on scope
    const children = this.getChildRows(parentRow, scope);

    if (children.length === 0) {
      // No children, return direct value
      const directValue = this.getCellValue(parentRow.key, colKey, measureIndex);
      return {
        value: directValue,
        childCount: 0,
        hasWarning: false,
      };
    }

    // Calculate sum of children
    let sum = 0;
    let hasNullChild = false;
    let validChildCount = 0;

    for (const child of children) {
      // Recursively get rollup for child if it has children
      const childValue = child.hasChildren
        ? this.computeRollup(child, colKey, measureIndex).value
        : this.getCellValue(child.key, colKey, measureIndex);

      if (childValue !== null) {
        sum += childValue;
        validChildCount++;
      } else {
        hasNullChild = true;
      }
    }

    // Apply rollup mode
    let finalValue: number | null;
    let warningMessage: string | undefined;

    switch (mode) {
      case "strict":
        // Parent = sum of children only
        finalValue = validChildCount > 0 ? sum : null;
        break;

      case "inclusive": {
        // Parent = direct value + sum of children
        const directValue = this.getCellValue(parentRow.key, colKey, measureIndex);
        if (directValue !== null) {
          finalValue = directValue + sum;
        } else {
          finalValue = validChildCount > 0 ? sum : null;
        }
        break;
      }

      case "direct-only":
        // Parent = direct value only (ignore children)
        finalValue = this.getCellValue(parentRow.key, colKey, measureIndex);
        break;

      default:
        finalValue = sum;
    }

    if (hasNullChild) {
      warningMessage = `Some child values are missing (${validChildCount}/${children.length} available)`;
    }

    return {
      value: finalValue,
      childCount: children.length,
      hasWarning: hasNullChild,
      warningMessage,
    };
  }

  private getChildRows(parent: FlattenedNode, scope: RollupScope): FlattenedNode[] {
    const children: FlattenedNode[] = [];
    const parentLevel = parent.level;

    if (scope === "view-based") {
      // Only include visible rows in the flattened view
      let foundParent = false;
      for (const row of this.context.rows) {
        if (row.key === parent.key) {
          foundParent = true;
          continue;
        }
        if (foundParent) {
          if (row.level <= parentLevel) {
            break; // Exited parent's scope
          }
          if (row.level === parentLevel + 1) {
            children.push(row);
          }
        }
      }
    } else {
      // Full tree - would need access to full tree structure
      // For now, use same logic as view-based
      let foundParent = false;
      for (const row of this.context.rows) {
        if (row.key === parent.key) {
          foundParent = true;
          continue;
        }
        if (foundParent) {
          if (row.level <= parentLevel) {
            break;
          }
          if (row.level === parentLevel + 1) {
            children.push(row);
          }
        }
      }
    }

    return children;
  }

  private getCellValue(rowKey: string, colKey: string, measureIndex: number): number | null {
    const cellKey = `${rowKey}:${colKey}:${measureIndex}`;
    const cell = this.context.cellMap.get(cellKey);
    return cell?.value ?? null;
  }

  getAllLeafDescendants(parent: FlattenedNode): FlattenedNode[] {
    const leaves: FlattenedNode[] = [];
    const parentLevel = parent.level;
    let foundParent = false;

    for (const row of this.context.rows) {
      if (row.key === parent.key) {
        foundParent = true;
        continue;
      }
      if (foundParent) {
        if (row.level <= parentLevel) {
          break;
        }
        if (!row.hasChildren) {
          leaves.push(row);
        }
      }
    }

    return leaves;
  }

  computeAllRollups(): Map<string, RollupResult> {
    const results = new Map<string, RollupResult>();

    for (const row of this.context.rows) {
      if (row.hasChildren) {
        for (const col of this.context.columns) {
          for (let m = 0; m < this.context.measures.length; m++) {
            const key = `${row.key}:${col.key}:${m}`;
            results.set(key, this.computeRollup(row, col.key, m));
          }
        }
      }
    }

    return results;
  }

  canEditCell(row: FlattenedNode): boolean {
    const { parentEditPolicy } = this.context.settings;

    if (!row.hasChildren) {
      return true; // Leaf cells are always editable
    }

    return parentEditPolicy !== "disallow";
  }

  distributeParentEdit(
    parentRow: FlattenedNode,
    colKey: string,
    measureIndex: number,
    newValue: number,
    distributionMode: "proportional" | "even" | "custom",
    customWeights?: Map<string, number>
  ): Map<string, number> {
    const distributions = new Map<string, number>();
    const children = this.getChildRows(parentRow, "view-based");

    if (children.length === 0) {
      return distributions;
    }

    const currentTotal = this.computeRollup(parentRow, colKey, measureIndex).value || 0;
    const delta = newValue - currentTotal;

    switch (distributionMode) {
      case "even": {
        const evenShare = delta / children.length;
        for (const child of children) {
          const currentValue = this.getCellValue(child.key, colKey, measureIndex) || 0;
          distributions.set(child.key, currentValue + evenShare);
        }
        break;
      }

      case "proportional":
        for (const child of children) {
          const currentValue = this.getCellValue(child.key, colKey, measureIndex) || 0;
          const proportion = currentTotal !== 0 ? currentValue / currentTotal : 1 / children.length;
          distributions.set(child.key, currentValue + delta * proportion);
        }
        break;

      case "custom":
        if (customWeights) {
          let totalWeight = 0;
          for (const weight of customWeights.values()) {
            totalWeight += weight;
          }
          for (const child of children) {
            const weight = customWeights.get(child.key) || 0;
            const currentValue = this.getCellValue(child.key, colKey, measureIndex) || 0;
            const share = totalWeight > 0 ? (weight / totalWeight) * delta : 0;
            distributions.set(child.key, currentValue + share);
          }
        }
        break;
    }

    return distributions;
  }
}

export function createRollupEngine(context: RollupContext): RollupEngine {
  return new RollupEngine(context);
}
