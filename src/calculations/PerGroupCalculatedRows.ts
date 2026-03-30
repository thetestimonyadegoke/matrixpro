/**
 * Per-Group Calculated Rows Engine
 * Handles "Gross Profit per Project" style calculations using Project[Revenue] - Project[COGS] syntax
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { FormulaEngine, FormulaContext } from "./FormulaEngine";

export interface PerGroupCalcRowDefinition {
  id: string;
  name: string;
  formula: string;
  scopeLevel: string;
  placement: "after-last-child" | "before-first-child" | "after-specific";
  placementRowLabel?: string;
  style: {
    bold: boolean;
    italic: boolean;
    backgroundColor?: string;
    textColor?: string;
    borderTop?: "none" | "single" | "double";
    borderBottom?: "none" | "single" | "double";
  };
  includeInTotals: boolean;
  enabled: boolean;
  missingRefBehavior: "zero" | "null" | "warn";
}

export interface PerGroupCalcResult {
  virtualRows: FlattenedNode[];
  cellValues: Map<string, CellValue>;
  warnings: Map<string, string[]>;
}

export interface GroupNode {
  row: FlattenedNode;
  children: FlattenedNode[];
  startIndex: number;
  endIndex: number;
}

export function findGroupsAtLevel(
  rows: FlattenedNode[],
  scopeLevel: string,
  hierarchyLevels: string[]
): GroupNode[] {
  const groups: GroupNode[] = [];
  const levelIndex = hierarchyLevels.findIndex(
    l => l.toLowerCase() === scopeLevel.toLowerCase()
  );

  if (levelIndex === -1) {
    // Try matching by row level number
    const targetLevel = parseInt(scopeLevel) || 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.level === targetLevel && row.hasChildren) {
        const children: FlattenedNode[] = [];
        let endIndex = i;

        for (let j = i + 1; j < rows.length; j++) {
          if (rows[j].level <= targetLevel) {
            break;
          }
          if (rows[j].level === targetLevel + 1) {
            children.push(rows[j]);
          }
          endIndex = j;
        }

        groups.push({ row, children, startIndex: i, endIndex });
      }
    }
  } else {
    // Match by hierarchy level name
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.level === levelIndex && row.hasChildren) {
        const children: FlattenedNode[] = [];
        let endIndex = i;

        for (let j = i + 1; j < rows.length; j++) {
          if (rows[j].level <= levelIndex) {
            break;
          }
          if (rows[j].level === levelIndex + 1) {
            children.push(rows[j]);
          }
          endIndex = j;
        }

        groups.push({ row, children, startIndex: i, endIndex });
      }
    }
  }

  return groups;
}

export function resolveRowReference(
  refLabel: string,
  group: GroupNode,
  allRows: FlattenedNode[],
  missingBehavior: "zero" | "null" | "warn"
): { row: FlattenedNode | null; warning?: string } {
  const labelLower = refLabel.toLowerCase().trim();

  // First try exact match in group children
  for (const child of group.children) {
    if (child.label.toLowerCase() === labelLower) {
      return { row: child };
    }
  }

  // Try contains match
  for (const child of group.children) {
    if (child.label.toLowerCase().includes(labelLower) || 
        labelLower.includes(child.label.toLowerCase())) {
      return { row: child, warning: `Fuzzy match: "${refLabel}" matched "${child.label}"` };
    }
  }

  // Try common aliases
  const aliases: Record<string, string[]> = {
    "revenue": ["revenues", "total revenue", "sales", "net sales", "gross sales"],
    "cogs": ["cost of goods", "cost of goods sold", "cost of sales", "cos"],
    "expenses": ["operating expenses", "opex", "total expenses"],
    "profit": ["net profit", "net income", "earnings"],
  };

  for (const [canonical, aliasList] of Object.entries(aliases)) {
    if (labelLower === canonical || aliasList.includes(labelLower)) {
      for (const child of group.children) {
        const childLower = child.label.toLowerCase();
        if (childLower === canonical || aliasList.includes(childLower)) {
          return { row: child, warning: `Alias match: "${refLabel}" matched "${child.label}"` };
        }
      }
    }
  }

  return {
    row: null,
    warning: `Row "${refLabel}" not found in group "${group.row.label}"`,
  };
}

export function applyPerGroupCalculatedRows(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  definitions: PerGroupCalcRowDefinition[],
  hierarchyLevels: string[]
): PerGroupCalcResult {
  const virtualRows: FlattenedNode[] = [];
  const cellValues = new Map<string, CellValue>();
  const warnings = new Map<string, string[]>();

  const enabledDefs = definitions.filter(d => d.enabled);
  if (enabledDefs.length === 0) {
    return { virtualRows, cellValues, warnings };
  }

  for (const def of enabledDefs) {
    const groups = findGroupsAtLevel(rows, def.scopeLevel, hierarchyLevels);
    const defWarnings: string[] = [];

    for (const group of groups) {
      // Create virtual row for this group
      const virtualRowKey = `__calcrow_${def.id}_${group.row.key}`;
      const virtualRow: FlattenedNode = {
        key: virtualRowKey,
        label: def.name,
        value: def.name,
        level: group.row.level + 1,
        path: [...group.row.path, def.name],
        children: [],
        isExpanded: false,
        isLeaf: true,
        isSubtotal: false,
        isGrandTotal: false,
        indent: group.row.indent + 1,
        hasChildren: false,
        visibleIndex: -1,
        isCalculatedRow: true,
        calculatedRowStyle: def.style,
      };

      virtualRows.push(virtualRow);

      // Parse formula and resolve references for this group
      const formulaContext: FormulaContext = {
        currentRowKey: virtualRowKey,
        currentColKey: "",
        currentMeasureIndex: 0,
        rows: [...rows, virtualRow],
        columns,
        measures,
        cellMap,
        rowHierarchyLevels: hierarchyLevels,
        calculatedMeasures: new Map(),
        calculatedRows: new Map(),
      };

      const engine = new FormulaEngine(formulaContext);

      // Compute values for each column and measure
      for (const col of columns) {
        for (let m = 0; m < measures.length; m++) {
          // Transform formula: replace Scope[Member] with actual values
          let transformedFormula = def.formula;

          // Find all Scope[Member] patterns
          const scopedRefs = def.formula.match(/(\w+)\[([^\]]+)\]/g) || [];
          for (const ref of scopedRefs) {
            const match = ref.match(/(\w+)\[([^\]]+)\]/);
            if (match) {
              const [, scope, member] = match;
              const resolved = resolveRowReference(member, group, rows, def.missingRefBehavior);

              if (resolved.warning) {
                defWarnings.push(`${group.row.label}: ${resolved.warning}`);
              }

              if (resolved.row) {
                const cellKey = `${resolved.row.key}|${col.key}|${m}`;
                const cell = cellMap.get(cellKey);
                const value = cell?.value ?? 0;
                transformedFormula = transformedFormula.replace(ref, String(value));
              } else {
                if (def.missingRefBehavior === "null") {
                  transformedFormula = transformedFormula.replace(ref, "null");
                } else {
                  transformedFormula = transformedFormula.replace(ref, "0");
                }
              }
            }
          }

          // Evaluate the transformed formula
          engine.updateContext({
            currentColKey: col.key,
            currentMeasureIndex: m,
          });

          const result = engine.evaluate(transformedFormula);

          const cellKey = `${virtualRowKey}|${col.key}|${m}`;
          cellValues.set(cellKey, {
            value: result.value,
            formattedValue: result.value !== null ? result.value.toLocaleString() : "—",
            measureIndex: m,
            rowKey: virtualRowKey,
            colKey: col.key,
            isCalculated: true,
            hasWarning: result.warnings.length > 0 || result.error !== undefined,
            warningMessage: result.error || result.warnings.join("; "),
          });

          if (result.warnings.length > 0) {
            defWarnings.push(...result.warnings);
          }
          if (result.error) {
            defWarnings.push(result.error);
          }
        }
      }
    }

    if (defWarnings.length > 0) {
      warnings.set(def.id, [...new Set(defWarnings)]);
    }
  }

  return { virtualRows, cellValues, warnings };
}

export function insertVirtualRowsIntoFlattenedList(
  rows: FlattenedNode[],
  virtualRows: FlattenedNode[],
  definitions: PerGroupCalcRowDefinition[],
  hierarchyLevels: string[]
): FlattenedNode[] {
  if (virtualRows.length === 0) {
    return rows;
  }

  const result: FlattenedNode[] = [...rows];
  const insertions: { index: number; row: FlattenedNode }[] = [];

  for (const def of definitions.filter(d => d.enabled)) {
    const groups = findGroupsAtLevel(rows, def.scopeLevel, hierarchyLevels);

    for (const group of groups) {
      const virtualRowKey = `__calcrow_${def.id}_${group.row.key}`;
      const virtualRow = virtualRows.find(r => r.key === virtualRowKey);

      if (!virtualRow) continue;

      let insertIndex: number;

      switch (def.placement) {
        case "before-first-child":
          insertIndex = group.startIndex + 1;
          break;
        case "after-specific":
          if (def.placementRowLabel) {
            const specificRow = group.children.find(
              c => c.label.toLowerCase() === def.placementRowLabel!.toLowerCase()
            );
            if (specificRow) {
              insertIndex = result.findIndex(r => r.key === specificRow.key) + 1;
            } else {
              insertIndex = group.endIndex + 1;
            }
          } else {
            insertIndex = group.endIndex + 1;
          }
          break;
        case "after-last-child":
        default:
          insertIndex = group.endIndex + 1;
          break;
      }

      insertions.push({ index: insertIndex, row: virtualRow });
    }
  }

  // Sort insertions by index descending to avoid index shifting issues
  insertions.sort((a, b) => b.index - a.index);

  for (const { index, row } of insertions) {
    result.splice(index, 0, row);
  }

  // Update visible indices
  result.forEach((row, i) => {
    row.visibleIndex = i;
  });

  return result;
}

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
  return `pgcr_${Date.now()}_${hex}`;
}

export function createPerGroupCalcRow(
  name: string,
  formula: string,
  scopeLevel: string
): PerGroupCalcRowDefinition {
  return {
    id: generateCalcRowId(),
    name,
    formula,
    scopeLevel,
    placement: "after-last-child",
    style: {
      bold: true,
      italic: false,
      borderBottom: "single",
    },
    includeInTotals: true,
    enabled: true,
    missingRefBehavior: "zero",
  };
}
