/**
 * Formula Engine - Evaluates formulas with scoped row/column/measure references
 * Supports: [Measure], Scope[Member], COL("x"), ROW("x"), ROWPATH("x"), CELL(...)
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";

export interface FormulaContext {
  currentRowKey: string;
  currentColKey: string;
  currentMeasureIndex: number;
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  cellMap: Map<string, CellValue>;
  rowHierarchyLevels: string[];
  calculatedMeasures: Map<string, string>;
  calculatedRows: Map<string, string>;
}

export interface EvaluationResult {
  value: number | null;
  error?: string;
  warnings: string[];
  referencedCells: string[];
}

export interface RowMatch {
  row: FlattenedNode;
  matchType: "exact" | "contains" | "path";
  confidence: number;
}

export class FormulaEngine {
  private context: FormulaContext;
  private evaluationStack: Set<string> = new Set();

  constructor(context: FormulaContext) {
    this.context = context;
  }

  updateContext(context: Partial<FormulaContext>): void {
    this.context = { ...this.context, ...context };
  }

  evaluate(formula: string): EvaluationResult {
    const warnings: string[] = [];
    const referencedCells: string[] = [];

    try {
      // Preprocess formula - expand references
      let processedFormula = formula;

      // Expand [MeasureName] references
      processedFormula = this.expandMeasureRefs(processedFormula, referencedCells, warnings);

      // Expand Scope[Member] references (e.g., Project[Revenue])
      processedFormula = this.expandScopedRowRefs(processedFormula, referencedCells, warnings);

      // Expand COL("member") references
      processedFormula = this.expandColRefs(processedFormula, referencedCells, warnings);

      // Expand ROW("member") references
      processedFormula = this.expandRowRefs(processedFormula, referencedCells, warnings);

      // Expand ROWPATH("path") references
      processedFormula = this.expandRowPathRefs(processedFormula, referencedCells, warnings);

      // Expand CELL(...) references
      processedFormula = this.expandCellRefs(processedFormula, referencedCells, warnings);

      // Expand shortcuts
      processedFormula = this.expandShortcuts(processedFormula, referencedCells);

      // Expand time functions
      processedFormula = this.expandTimeFunctions(processedFormula, referencedCells, warnings);

      // Evaluate the processed formula
      const value = this.safeEval(processedFormula);

      return { value, warnings, referencedCells };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : String(error),
        warnings,
        referencedCells,
      };
    }
  }

  private expandMeasureRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    // Track position as we process to handle multiple occurrences correctly
    let result = formula;
    let offset = 0;
    
    // Find all [MeasureName] patterns
    const measurePattern = /\[([^\]]+)\]/g;
    const matches = Array.from(formula.matchAll(measurePattern));
    
    // Process from end to start to maintain correct positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const measureName = match[1];
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      
      // Check if this is a scoped reference (has word character before it)
      const beforeMatch = formula.substring(0, matchStart);
      if (/\w$/.test(beforeMatch)) {
        continue; // Part of Scope[Member], skip
      }

      const measure = this.context.measures.find(
        m => m.name.toLowerCase() === measureName.toLowerCase()
      );

      let replacement: string;
      
      if (measure) {
        const cellKey = `${this.context.currentRowKey}|${this.context.currentColKey}|${measure.index}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        replacement = cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      } else {
        // Check calculated measures with cycle detection
        const calcFormula = this.context.calculatedMeasures.get(measureName.toLowerCase());
        if (calcFormula) {
          const cycleKey = `calc:${measureName.toLowerCase()}`;
          if (this.evaluationStack.has(cycleKey)) {
            warnings.push(`Circular reference detected in [${measureName}]`);
            replacement = "#CIRCULAR!";
          } else {
            this.evaluationStack.add(cycleKey);
            const result = this.evaluate(calcFormula);
            this.evaluationStack.delete(cycleKey);
            
            if (result.error) {
              warnings.push(`Error in calculated measure [${measureName}]: ${result.error}`);
              replacement = "0";
            } else {
              replacement = String(result.value ?? 0);
            }
          }
        } else {
          warnings.push(`Unknown measure: [${measureName}]`);
          replacement = "0";
        }
      }
      
      // Apply replacement
      result = result.substring(0, matchStart) + replacement + result.substring(matchEnd);
    }
    
    return result;
  }

  private expandScopedRowRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    // Match Scope[Member] pattern
    return formula.replace(/(\w+)\[([^\]]+)\]/g, (match, scope, member) => {
      const scopeLower = scope.toLowerCase();
      const memberLower = member.toLowerCase();

      // Find the scope level
      const scopeLevelIndex = this.context.rowHierarchyLevels.findIndex(
        level => level.toLowerCase() === scopeLower
      );

      // Find current row's parent at scope level
      const currentRow = this.context.rows.find(r => r.key === this.context.currentRowKey);
      if (!currentRow) {
        warnings.push(`Cannot resolve scope ${scope}: current row not found`);
        return "0";
      }

      // Find the member row within the scope
      const matchedRow = this.findRowInScope(currentRow, scopeLower, memberLower, warnings);

      if (matchedRow) {
        const cellKey = `${matchedRow.key}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      warnings.push(`Row "${member}" not found in scope "${scope}"`);
      return "0";
    });
  }

  private findRowInScope(
    currentRow: FlattenedNode,
    scope: string,
    member: string,
    warnings: string[]
  ): FlattenedNode | null {
    // Strategy 1: Find sibling rows at same level with matching label
    const currentLevel = currentRow.level;
    const candidates: RowMatch[] = [];

    // Find parent group boundary
    let parentIndex = -1;
    const currentIndex = this.context.rows.findIndex(r => r.key === currentRow.key);

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (this.context.rows[i].level < currentLevel) {
        parentIndex = i;
        break;
      }
    }

    // Find siblings within parent group
    const startIndex = parentIndex + 1;
    for (let i = startIndex; i < this.context.rows.length; i++) {
      const row = this.context.rows[i];
      if (row.level < currentLevel) break;
      if (row.level === currentLevel) {
        const labelLower = row.label.toLowerCase();
        if (labelLower === member) {
          candidates.push({ row, matchType: "exact", confidence: 1.0 });
        } else if (labelLower.includes(member) || member.includes(labelLower)) {
          candidates.push({ row, matchType: "contains", confidence: 0.7 });
        }
      }
    }

    // Return best match
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.confidence - a.confidence);
      if (candidates.length > 1 && candidates[0].confidence === candidates[1].confidence) {
        warnings.push(`Multiple matches for "${member}" in scope "${scope}"`);
      }
      return candidates[0].row;
    }

    return null;
  }

  private expandColRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    return formula.replace(/COL\s*\(\s*"([^"]+)"\s*\)/gi, (match, colMember) => {
      const col = this.context.columns.find(
        c => c.label.toLowerCase() === colMember.toLowerCase()
      );

      if (col) {
        const cellKey = `${this.context.currentRowKey}|${col.key}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      warnings.push(`Unknown column: "${colMember}"`);
      return "0";
    });
  }

  private expandRowRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    return formula.replace(/ROW\s*\(\s*"([^"]+)"\s*\)/gi, (match, rowMember) => {
      const row = this.context.rows.find(
        r => r.label.toLowerCase() === rowMember.toLowerCase()
      );

      if (row) {
        const cellKey = `${row.key}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      warnings.push(`Unknown row: "${rowMember}"`);
      return "0";
    });
  }

  private expandRowPathRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    return formula.replace(/ROWPATH\s*\(\s*"([^"]+)"\s*\)/gi, (match, path) => {
      const pathParts = path.split("⟂").map((p: string) => p.trim().toLowerCase());

      const row = this.context.rows.find(r => {
        if (r.path.length !== pathParts.length) return false;
        return r.path.every((p, i) => p.toLowerCase() === pathParts[i]);
      });

      if (row) {
        const cellKey = `${row.key}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      warnings.push(`Row path not found: "${path}"`);
      return "0";
    });
  }

  private expandCellRefs(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    // CELL(row="X", col="Y", measure="Z")
    return formula.replace(
      /CELL\s*\(\s*row\s*=\s*"([^"]+)"\s*,\s*col\s*=\s*"([^"]+)"(?:\s*,\s*measure\s*=\s*"([^"]+)")?\s*\)/gi,
      (match, rowLabel, colLabel, measureName) => {
        const row = this.context.rows.find(
          r => r.label.toLowerCase() === rowLabel.toLowerCase()
        );
        const col = this.context.columns.find(
          c => c.label.toLowerCase() === colLabel.toLowerCase()
        );

        let measureIndex = this.context.currentMeasureIndex;
        if (measureName) {
          const measure = this.context.measures.find(
            m => m.name.toLowerCase() === measureName.toLowerCase()
          );
          if (measure) {
            measureIndex = measure.index;
          } else {
            warnings.push(`Unknown measure in CELL: "${measureName}"`);
          }
        }

        if (row && col) {
          const cellKey = `${row.key}|${col.key}|${measureIndex}`;
          refs.push(cellKey);
          const cell = this.context.cellMap.get(cellKey);
          return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
        }

        if (!row) warnings.push(`Unknown row in CELL: "${rowLabel}"`);
        if (!col) warnings.push(`Unknown column in CELL: "${colLabel}"`);
        return "0";
      }
    );
  }

  private expandShortcuts(formula: string, refs: string[]): string {
    let result = formula;

    // THIS() - current cell value
    result = result.replace(/THIS\s*\(\s*\)/gi, () => {
      const cellKey = `${this.context.currentRowKey}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
      refs.push(cellKey);
      const cell = this.context.cellMap.get(cellKey);
      return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
    });

    // MODEL() - same as THIS for now (base model value)
    result = result.replace(/MODEL\s*\(\s*\)/gi, () => {
      const cellKey = `${this.context.currentRowKey}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
      refs.push(cellKey);
      const cell = this.context.cellMap.get(cellKey);
      return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
    });

    // INPUT() - user override if present, else model
    result = result.replace(/INPUT\s*\(\s*\)/gi, () => {
      const cellKey = `${this.context.currentRowKey}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
      refs.push(cellKey);
      const cell = this.context.cellMap.get(cellKey);
      return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
    });

    // ROW_TOTAL() - sum across all columns for current row
    result = result.replace(/ROW_TOTAL\s*\(\s*\)/gi, () => {
      let total = 0;
      for (const col of this.context.columns) {
        const cellKey = `${this.context.currentRowKey}|${col.key}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        if (cell?.value !== null && cell?.value !== undefined) {
          total += cell.value;
        }
      }
      return String(total);
    });

    // COL_TOTAL() - sum across all rows for current column
    result = result.replace(/COL_TOTAL\s*\(\s*\)/gi, () => {
      let total = 0;
      for (const row of this.context.rows) {
        if (!row.hasChildren) { // Only leaf rows
          const cellKey = `${row.key}|${this.context.currentColKey}|${this.context.currentMeasureIndex}`;
          refs.push(cellKey);
          const cell = this.context.cellMap.get(cellKey);
          if (cell?.value !== null && cell?.value !== undefined) {
            total += cell.value;
          }
        }
      }
      return String(total);
    });

    return result;
  }

  private expandTimeFunctions(
    formula: string,
    refs: string[],
    warnings: string[]
  ): string {
    let result = formula;

    // PREV(n) - value from n periods ago
    result = result.replace(/PREV\s*\(\s*(\d*)\s*\)/gi, (match, n) => {
      const periods = parseInt(n) || 1;
      const currentColIndex = this.context.columns.findIndex(
        c => c.key === this.context.currentColKey
      );
      const targetIndex = currentColIndex - periods;

      if (targetIndex >= 0 && targetIndex < this.context.columns.length) {
        const targetCol = this.context.columns[targetIndex];
        const cellKey = `${this.context.currentRowKey}|${targetCol.key}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      return "0";
    });

    // NEXT(n) - value from n periods ahead
    result = result.replace(/NEXT\s*\(\s*(\d*)\s*\)/gi, (match, n) => {
      const periods = parseInt(n) || 1;
      const currentColIndex = this.context.columns.findIndex(
        c => c.key === this.context.currentColKey
      );
      const targetIndex = currentColIndex + periods;

      if (targetIndex >= 0 && targetIndex < this.context.columns.length) {
        const targetCol = this.context.columns[targetIndex];
        const cellKey = `${this.context.currentRowKey}|${targetCol.key}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        return cell?.value !== null && cell?.value !== undefined ? String(cell.value) : "0";
      }

      return "0";
    });

    // RUNNING_TOTAL() - cumulative sum up to current column
    result = result.replace(/RUNNING_TOTAL\s*\(\s*\)/gi, () => {
      const currentColIndex = this.context.columns.findIndex(
        c => c.key === this.context.currentColKey
      );
      let total = 0;

      for (let i = 0; i <= currentColIndex; i++) {
        const col = this.context.columns[i];
        const cellKey = `${this.context.currentRowKey}|${col.key}|${this.context.currentMeasureIndex}`;
        refs.push(cellKey);
        const cell = this.context.cellMap.get(cellKey);
        if (cell?.value !== null && cell?.value !== undefined) {
          total += cell.value;
        }
      }

      return String(total);
    });

    // RANGE("start", "end") with SUM
    result = result.replace(
      /SUM\s*\(\s*RANGE\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*\)/gi,
      (match, start, end) => {
        const startIndex = this.context.columns.findIndex(
          c => c.label.toLowerCase() === start.toLowerCase()
        );
        const endIndex = this.context.columns.findIndex(
          c => c.label.toLowerCase() === end.toLowerCase()
        );

        if (startIndex === -1 || endIndex === -1) {
          warnings.push(`Invalid range: "${start}" to "${end}"`);
          return "0";
        }

        let total = 0;
        const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

        for (let i = from; i <= to; i++) {
          const col = this.context.columns[i];
          const cellKey = `${this.context.currentRowKey}|${col.key}|${this.context.currentMeasureIndex}`;
          refs.push(cellKey);
          const cell = this.context.cellMap.get(cellKey);
          if (cell?.value !== null && cell?.value !== undefined) {
            total += cell.value;
          }
        }

        return String(total);
      }
    );

    return result;
  }

  private safeEval(expression: string): number | null {
    // Use a safe math expression evaluator instead of Function constructor
    try {
      const result = this.evaluateMathExpression(expression);
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }

  private evaluateMathExpression(expr: string): number {
    // Tokenize and evaluate safely without using Function constructor
    // Remove any non-math characters for security
    const sanitized = expr.replace(/[^0-9+\-*/.()\s]/g, "");
    
    // Use a simple recursive descent parser for math expressions
    return this.parseExpression(sanitized.trim());
  }

  private parseExpression(expr: string): number {
    // Handle parentheses first
    while (expr.includes("(")) {
      const openIdx = expr.lastIndexOf("(");
      const closeIdx = expr.indexOf(")", openIdx);
      if (closeIdx === -1) throw new Error("Mismatched parentheses");
      
      const inner = expr.substring(openIdx + 1, closeIdx);
      const innerValue = this.parseExpression(inner);
      expr = expr.substring(0, openIdx) + String(innerValue) + expr.substring(closeIdx + 1);
    }
    
    // Handle addition and subtraction
    const addSubPattern = /([\d.]+)\s*([+-])\s*([\d.]+)/;
    while (addSubPattern.test(expr)) {
      expr = expr.replace(addSubPattern, (match, a, op, b) => {
        const valA = parseFloat(a);
        const valB = parseFloat(b);
        return String(op === "+" ? valA + valB : valA - valB);
      });
    }
    
    // Handle multiplication and division
    const mulDivPattern = /([\d.]+)\s*([*/])\s*([\d.]+)/;
    while (mulDivPattern.test(expr)) {
      expr = expr.replace(mulDivPattern, (match, a, op, b) => {
        const valA = parseFloat(a);
        const valB = parseFloat(b);
        if (op === "*") {
          return String(valA * valB);
        } else {
          // Division - handle division by zero per Excel behavior
          if (valB === 0) {
            return valA >= 0 ? "Infinity" : "-Infinity";
          }
          return String(valA / valB);
        }
      });
    }
    
    const result = parseFloat(expr);
    if (isNaN(result)) throw new Error("Invalid expression");
    return result;
  }

  evaluateForRow(
    formula: string,
    rowKey: string,
    colKey: string,
    measureIndex: number
  ): EvaluationResult {
    const originalContext = { ...this.context };
    this.context.currentRowKey = rowKey;
    this.context.currentColKey = colKey;
    this.context.currentMeasureIndex = measureIndex;

    const result = this.evaluate(formula);

    this.context = originalContext;
    return result;
  }
}

export function createFormulaEngine(context: FormulaContext): FormulaEngine {
  return new FormulaEngine(context);
}
