/**
 * Formula Engine - evaluates formulas with scoped row/column/measure references.
 * Supports scalar arithmetic, comparisons, helper functions, row/column/cell
 * references, and aggregate helpers over rows/columns/ranges.
 */

import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { generateCellKey } from "../model/keys";

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

type MathToken =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" }
  | { type: "eof" };

const BUILTIN_FUNCTIONS = new Set([
  "ABS", "ROUND", "MIN", "MAX", "SUM", "AVG", "COUNT",
  "IF", "COALESCE", "ISNULL", "FLOOR", "CEIL",
]);

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
      let processedFormula = formula;

      // Aggregations over row/column/range references must run before the
      // scalar reference expansion below.
      processedFormula = this.expandAggregateReferences(processedFormula, referencedCells, warnings);
      processedFormula = this.expandTimeFunctions(processedFormula, referencedCells, warnings);
      processedFormula = this.expandMeasureRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandMeasureFunctionRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandScopedRowRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandColRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandRowRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandRowPathRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandCellRefs(processedFormula, referencedCells, warnings);
      processedFormula = this.expandShortcuts(processedFormula, referencedCells);

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

  private getCellNumericValue(rowKey: string, colKey: string, measureIndex: number, refs?: string[]): number | null {
    const cellKey = generateCellKey(rowKey, colKey, measureIndex);
    refs?.push(cellKey);
    const cell = this.context.cellMap.get(cellKey);
    return cell?.value ?? null;
  }

  private getLeafRows(): FlattenedNode[] {
    return this.context.rows.filter(r => !r.isSubtotal && !r.isGrandTotal && !r.hasChildren);
  }

  private getLeafColumns(): FlattenedNode[] {
    return this.context.columns.filter(c => c.isLeaf && !c.isSubtotal && !c.isGrandTotal);
  }

  private findRowByLabel(rowLabel: string, warnings?: string[]): FlattenedNode | null {
    const member = rowLabel.toLowerCase().trim();
    const candidates: RowMatch[] = [];

    // Common path separators used in financial modeling and user requests
    const pathSeparators = /\s*(?:\||>|›|→|\/|—|-)\s*/;

    for (const row of this.context.rows) {
      const labelLower = row.label.toLowerCase();
      
      // 1. Exact Label Match
      if (labelLower === member) {
        candidates.push({ row, matchType: "exact", confidence: 1.0 });
        continue;
      }

      // 2. Path Match (e.g. "Parent > Child" or "Parent - Child")
      // Check original path joiners
      const standardPath = row.path.join(" > ").toLowerCase();
      if (standardPath === member) {
        candidates.push({ row, matchType: "path", confidence: 1.0 });
        continue;
      }

      // Check alternate joiners if the input label contains a separator
      if (member.match(pathSeparators)) {
        const altPath = row.path.join(" - ").toLowerCase();
        if (altPath === member) {
          candidates.push({ row, matchType: "path", confidence: 0.98 });
          continue;
        }
        
        // General separator-normalized path check
        const normalizedMember = member.split(pathSeparators).join("|");
        const normalizedPath = row.path.map(s => String(s).toLowerCase()).join("|");
        if (normalizedPath === normalizedMember) {
          candidates.push({ row, matchType: "path", confidence: 0.95 });
          continue;
        }
      }

      // 3. Contains Match (Lower Confidence)
      if (labelLower.includes(member) || member.includes(labelLower)) {
        candidates.push({ row, matchType: "contains", confidence: 0.7 });
      }
    }

    if (candidates.length === 0) return null;
    
    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    if (warnings && candidates.length > 1 && candidates[0].confidence === candidates[1].confidence) {
      // If we have multiple exact matches (e.g. "Sales" appearing in different branches)
      // and haven't used a path, warn the user.
      warnings.push(`Multiple rows matched "${rowLabel}". Try using a full path (e.g. [Parent - ${rowLabel}])`);
    }
    
    return candidates[0].row;
  }

  private findColumnByLabel(colLabel: string): FlattenedNode | null {
    const member = colLabel.toLowerCase().trim();
    for (const col of this.context.columns) {
      const colPath = col.path.join(" > ").toLowerCase();
      if (col.label.toLowerCase() === member || colPath === member) {
        return col;
      }
    }
    return null;
  }

  private findMeasureByName(measureName: string): MeasureInfo | null {
    return this.context.measures.find(
      m => m.name.toLowerCase() === measureName.toLowerCase().trim()
    ) ?? null;
  }

  private aggregate(values: Array<number | null>, fn: string): number | null {
    const valid = values.filter((v): v is number => v !== null && !Number.isNaN(v));
    if (valid.length === 0) return null;

    switch (fn) {
      case "SUM": return valid.reduce((acc, value) => acc + value, 0);
      case "AVG": return valid.reduce((acc, value) => acc + value, 0) / valid.length;
      case "MIN": return Math.min(...valid);
      case "MAX": return Math.max(...valid);
      case "COUNT": return valid.length;
      default: return null;
    }
  }

  private expandAggregateReferences(formula: string, refs: string[], warnings: string[]): string {
    let result = formula;

    // RANGE aggregations across columns for the current row/measure.
    result = result.replace(
      /\b(SUM|AVG|MIN|MAX|COUNT)\s*\(\s*RANGE\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*\)/gi,
      (_match, fn, startLabel, endLabel) => {
        const leafColumns = this.getLeafColumns();
        const startIndex = leafColumns.findIndex(c => c.label.toLowerCase() === String(startLabel).toLowerCase());
        const endIndex = leafColumns.findIndex(c => c.label.toLowerCase() === String(endLabel).toLowerCase());
        if (startIndex === -1 || endIndex === -1) {
          warnings.push(`Invalid range: "${startLabel}" to "${endLabel}"`);
          return "0";
        }

        const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const values: Array<number | null> = [];
        for (let i = from; i <= to; i++) {
          values.push(this.getCellNumericValue(
            this.context.currentRowKey,
            leafColumns[i].key,
            this.context.currentMeasureIndex,
            refs
          ));
        }
        return String(this.aggregate(values, String(fn).toUpperCase()) ?? 0);
      }
    );

    // Whole-row aggregations across columns.
    result = result.replace(
      /\b(SUM|AVG|MIN|MAX|COUNT)\s*\(\s*ROW\s*\(\s*"([^"]+)"\s*\)\s*\)/gi,
      (_match, fn, rowLabel) => {
        const row = this.findRowByLabel(String(rowLabel), warnings);
        if (!row) {
          warnings.push(`Unknown row: "${rowLabel}"`);
          return "0";
        }

        const values = this.getLeafColumns().map(col =>
          this.getCellNumericValue(row.key, col.key, this.context.currentMeasureIndex, refs)
        );
        return String(this.aggregate(values, String(fn).toUpperCase()) ?? 0);
      }
    );

    // Whole-column aggregations across rows.
    result = result.replace(
      /\b(SUM|AVG|MIN|MAX|COUNT)\s*\(\s*COL\s*\(\s*"([^"]+)"\s*\)\s*\)/gi,
      (_match, fn, colLabel) => {
        const col = this.findColumnByLabel(String(colLabel));
        if (!col) {
          warnings.push(`Unknown column: "${colLabel}"`);
          return "0";
        }

        const values = this.getLeafRows().map(row =>
          this.getCellNumericValue(row.key, col.key, this.context.currentMeasureIndex, refs)
        );
        return String(this.aggregate(values, String(fn).toUpperCase()) ?? 0);
      }
    );

    return result;
  }

  private expandMeasureRefs(formula: string, refs: string[], warnings: string[]): string {
    let result = formula;
    const measurePattern = /\[([^\]]+)\]/g;
    const matches = Array.from(formula.matchAll(measurePattern));

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const tokenValue = match[1];
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      const beforeMatch = formula.substring(0, matchStart);

      if (/\w$/.test(beforeMatch)) {
        continue;
      }

      let replacement = "0";
      const measure = this.findMeasureByName(tokenValue);
      if (measure) {
        const current = this.getCellNumericValue(this.context.currentRowKey, this.context.currentColKey, measure.index, refs);
        replacement = String(current ?? 0);
      } else {
        const calcFormula = this.context.calculatedMeasures.get(tokenValue.toLowerCase());
        if (calcFormula) {
          const cycleKey = `calc:${tokenValue.toLowerCase()}`;
          if (this.evaluationStack.has(cycleKey)) {
            warnings.push(`Circular reference detected in [${tokenValue}]`);
          } else {
            this.evaluationStack.add(cycleKey);
            const evaluated = this.evaluate(calcFormula);
            this.evaluationStack.delete(cycleKey);
            replacement = String(evaluated.value ?? 0);
            warnings.push(...evaluated.warnings);
          }
        } else {
          // In calculated-row formulas, bracket references are typically rows.
          const row = this.findRowByLabel(tokenValue, warnings);
          if (row) {
            replacement = String(
              this.getCellNumericValue(row.key, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0
            );
          } else {
            warnings.push(`Unknown measure or row: [${tokenValue}]`);
          }
        }
      }

      result = result.substring(0, matchStart) + replacement + result.substring(matchEnd);
    }

    return result;
  }

  private expandMeasureFunctionRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/MEASURE\s*\(\s*"([^"]+)"\s*\)/gi, (_match, measureName) => {
      const measure = this.findMeasureByName(String(measureName));
      if (!measure) {
        warnings.push(`Unknown measure: "${measureName}"`);
        return "0";
      }
      return String(
        this.getCellNumericValue(this.context.currentRowKey, this.context.currentColKey, measure.index, refs) ?? 0
      );
    });
  }

  private expandScopedRowRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/(\w+)\[([^\]]+)\]/g, (_match, scope, member) => {
      const scopeLower = String(scope).toLowerCase();
      const memberLower = String(member).toLowerCase();
      const currentRow = this.context.rows.find(r => r.key === this.context.currentRowKey);
      if (!currentRow) {
        warnings.push(`Cannot resolve scope ${scope}: current row not found`);
        return "0";
      }

      const matchedRow = this.findRowInScope(currentRow, scopeLower, memberLower, warnings);
      if (!matchedRow) {
        warnings.push(`Row "${member}" not found in scope "${scope}"`);
        return "0";
      }

      return String(
        this.getCellNumericValue(matchedRow.key, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0
      );
    });
  }

  private findRowInScope(currentRow: FlattenedNode, scope: string, member: string, warnings: string[]): FlattenedNode | null {
    const currentLevel = currentRow.level;
    const currentIndex = this.context.rows.findIndex(r => r.key === currentRow.key);
    const candidates: RowMatch[] = [];
    let parentIndex = -1;

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (this.context.rows[i].level < currentLevel) {
        parentIndex = i;
        break;
      }
    }

    for (let i = parentIndex + 1; i < this.context.rows.length; i++) {
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

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.confidence - a.confidence);
    if (candidates.length > 1 && candidates[0].confidence === candidates[1].confidence) {
      warnings.push(`Multiple matches for "${member}" in scope "${scope}"`);
    }
    return candidates[0].row;
  }

  private expandColRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/COL\s*\(\s*"([^"]+)"\s*\)/gi, (_match, colMember) => {
      const col = this.findColumnByLabel(String(colMember));
      if (!col) {
        warnings.push(`Unknown column: "${colMember}"`);
        return "0";
      }
      return String(
        this.getCellNumericValue(this.context.currentRowKey, col.key, this.context.currentMeasureIndex, refs) ?? 0
      );
    });
  }

  private expandRowRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/ROW\s*\(\s*"([^"]+)"\s*\)/gi, (_match, rowMember) => {
      const row = this.findRowByLabel(String(rowMember), warnings);
      if (!row) {
        warnings.push(`Unknown row: "${rowMember}"`);
        return "0";
      }
      return String(
        this.getCellNumericValue(row.key, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0
      );
    });
  }

  private expandRowPathRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/ROWPATH\s*\(\s*"([^"]+)"\s*\)/gi, (_match, path) => {
      const pathParts = String(path)
        .split(/\s*(?:\||>|›|→|\/|âŸ‚)\s*/)
        .map(part => part.trim().toLowerCase())
        .filter(Boolean);

      const row = this.context.rows.find(r =>
        r.path.length === pathParts.length &&
        r.path.every((segment, index) => String(segment).toLowerCase() === pathParts[index])
      );

      if (!row) {
        warnings.push(`Row path not found: "${path}"`);
        return "0";
      }

      return String(
        this.getCellNumericValue(row.key, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0
      );
    });
  }

  private parseCellArguments(argumentSource: string): { row?: string; col?: string; measure?: string } {
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < argumentSource.length; i++) {
      const ch = argumentSource[i];
      if (ch === "\"") {
        inQuotes = !inQuotes;
        current += ch;
        continue;
      }
      if (ch === "," && !inQuotes) {
        parts.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());

    const out: { row?: string; col?: string; measure?: string } = {};
    const normalize = (value: string): string => {
      const trimmed = value.trim();
      if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
        return trimmed.slice(1, -1).replace(/""/g, "\"");
      }
      return trimmed;
    };

    const positional: string[] = [];
    for (const part of parts) {
      const namedMatch = part.match(/^(row|col|measure)\s*=\s*(.+)$/i);
      if (namedMatch) {
        const key = namedMatch[1].toLowerCase() as "row" | "col" | "measure";
        out[key] = normalize(namedMatch[2]);
      } else {
        positional.push(normalize(part));
      }
    }

    if (!out.row && positional[0]) out.row = positional[0];
    if (!out.col && positional[1]) out.col = positional[1];
    if (!out.measure && positional[2]) out.measure = positional[2];

    return out;
  }

  private expandCellRefs(formula: string, refs: string[], warnings: string[]): string {
    return formula.replace(/CELL\s*\(([^)]*)\)/gi, (_match, args) => {
      const parsed = this.parseCellArguments(String(args));
      const row = parsed.row ? this.findRowByLabel(parsed.row, warnings) : null;
      const col = parsed.col ? this.findColumnByLabel(parsed.col) : null;
      let measureIndex = this.context.currentMeasureIndex;

      if (parsed.measure) {
        const measure = this.findMeasureByName(parsed.measure);
        if (measure) {
          measureIndex = measure.index;
        } else {
          warnings.push(`Unknown measure in CELL: "${parsed.measure}"`);
        }
      }

      if (!row) {
        warnings.push(`Unknown row in CELL: "${parsed.row ?? ""}"`);
      }
      if (!col) {
        warnings.push(`Unknown column in CELL: "${parsed.col ?? ""}"`);
      }
      if (!row || !col) return "0";

      return String(this.getCellNumericValue(row.key, col.key, measureIndex, refs) ?? 0);
    });
  }

  private expandShortcuts(formula: string, refs: string[]): string {
    let result = formula;

    result = result.replace(/THIS\s*\(\s*\)/gi, () =>
      String(this.getCellNumericValue(this.context.currentRowKey, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0)
    );
    result = result.replace(/MODEL\s*\(\s*\)/gi, () =>
      String(this.getCellNumericValue(this.context.currentRowKey, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0)
    );
    result = result.replace(/INPUT\s*\(\s*\)/gi, () =>
      String(this.getCellNumericValue(this.context.currentRowKey, this.context.currentColKey, this.context.currentMeasureIndex, refs) ?? 0)
    );

    result = result.replace(/ROW_TOTAL\s*\(\s*(?:"([^"]+)")?\s*\)/gi, (_match, optionalRow) => {
      const rowKey = optionalRow
        ? this.findRowByLabel(String(optionalRow))?.key ?? this.context.currentRowKey
        : this.context.currentRowKey;
      const total = this.getLeafColumns().reduce((acc, col) => {
        const value = this.getCellNumericValue(rowKey, col.key, this.context.currentMeasureIndex, refs);
        return acc + (value ?? 0);
      }, 0);
      return String(total);
    });

    result = result.replace(/COL_TOTAL\s*\(\s*(?:"([^"]+)")?\s*\)/gi, (_match, optionalCol) => {
      const colKey = optionalCol
        ? this.findColumnByLabel(String(optionalCol))?.key ?? this.context.currentColKey
        : this.context.currentColKey;
      const total = this.getLeafRows().reduce((acc, row) => {
        const value = this.getCellNumericValue(row.key, colKey, this.context.currentMeasureIndex, refs);
        return acc + (value ?? 0);
      }, 0);
      return String(total);
    });

    return result;
  }

  private expandTimeFunctions(formula: string, refs: string[], warnings: string[]): string {
    let result = formula;
    const leafColumns = this.getLeafColumns();

    result = result.replace(/PREV\s*\(\s*([^)]*)\s*\)/gi, (_match, args) => {
      const trimmed = args.trim();
      let periods = 1;
      let targetMeasureIndex = this.context.currentMeasureIndex;

      if (trimmed) {
        // Handle PREV(n)
        if (/^\d+$/.test(trimmed)) {
          periods = parseInt(trimmed, 10);
        } else {
          // Handle PREV([Measure])
          const mMatch = trimmed.match(/^\[(.*)\]$/);
          if (mMatch) {
            const measure = this.findMeasureByName(mMatch[1]);
            if (measure) targetMeasureIndex = measure.index;
          }
        }
      }

      const currentColIndex = leafColumns.findIndex(c => c.key === this.context.currentColKey);
      const targetIndex = currentColIndex - periods;
      if (targetIndex < 0 || targetIndex >= leafColumns.length) return "0";
      return String(
        this.getCellNumericValue(this.context.currentRowKey, leafColumns[targetIndex].key, targetMeasureIndex, refs) ?? 0
      );
    });

    result = result.replace(/NEXT\s*\(\s*(\d*)\s*\)/gi, (_match, n) => {
      const periods = parseInt(String(n), 10) || 1;
      const currentColIndex = leafColumns.findIndex(c => c.key === this.context.currentColKey);
      const targetIndex = currentColIndex + periods;
      if (targetIndex < 0 || targetIndex >= leafColumns.length) return "0";
      return String(
        this.getCellNumericValue(this.context.currentRowKey, leafColumns[targetIndex].key, this.context.currentMeasureIndex, refs) ?? 0
      );
    });

    result = result.replace(/RUNNING_TOTAL\s*\(\s*\)/gi, () => {
      const currentColIndex = leafColumns.findIndex(c => c.key === this.context.currentColKey);
      let total = 0;
      for (let i = 0; i <= currentColIndex; i++) {
        total += this.getCellNumericValue(this.context.currentRowKey, leafColumns[i].key, this.context.currentMeasureIndex, refs) ?? 0;
      }
      return String(total);
    });

    result = result.replace(/(?:YTD|MTD|QTD)\s*\(\s*\)/gi, () => {
      const currentColIndex = leafColumns.findIndex(c => c.key === this.context.currentColKey);
      let total = 0;
      for (let i = 0; i <= currentColIndex; i++) {
        total += this.getCellNumericValue(this.context.currentRowKey, leafColumns[i].key, this.context.currentMeasureIndex, refs) ?? 0;
      }
      return String(total);
    });

    result = result.replace(/ROLLING\s*\(\s*(\d+)\s*\)/gi, (_match, n) => {
      const windowSize = Math.max(1, parseInt(String(n), 10) || 1);
      const currentColIndex = leafColumns.findIndex(c => c.key === this.context.currentColKey);
      if (currentColIndex < 0) return "0";
      const from = Math.max(0, currentColIndex - windowSize + 1);
      let total = 0;
      let count = 0;
      for (let i = from; i <= currentColIndex; i++) {
        const value = this.getCellNumericValue(this.context.currentRowKey, leafColumns[i].key, this.context.currentMeasureIndex, refs);
        if (value !== null) {
          total += value;
          count++;
        }
      }
      return String(count > 0 ? total : 0);
    });

    // Preserve the current user-facing syntax while warning on unsupported arg shapes.
    if (/\b(?:YTD|MTD|QTD|ROLLING)\s*\(/i.test(result)) {
      warnings.push("Some time-intelligence functions are evaluated using the current measure context.");
    }

    return result;
  }

  private safeEval(expression: string): number | null {
    try {
      return this.parseAndEvaluate(expression);
    } catch {
      return null;
    }
  }

  private tokenizeExpression(expression: string): MathToken[] {
    const tokens: MathToken[] = [];
    let pos = 0;

    while (pos < expression.length) {
      const ch = expression[pos];
      if (/\s/.test(ch)) {
        pos++;
        continue;
      }

      if (/[0-9.]/.test(ch)) {
        let raw = "";
        let hasDecimal = false;
        while (pos < expression.length && /[0-9.]/.test(expression[pos])) {
          if (expression[pos] === ".") {
            if (hasDecimal) break;
            hasDecimal = true;
          }
          raw += expression[pos++];
        }
        tokens.push({ type: "number", value: parseFloat(raw) });
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        let ident = "";
        while (pos < expression.length && /[A-Za-z0-9_]/.test(expression[pos])) {
          ident += expression[pos++];
        }
        if (ident === "Infinity") {
          tokens.push({ type: "number", value: Infinity });
        } else {
          tokens.push({ type: "identifier", value: ident.toUpperCase() });
        }
        continue;
      }

      if (expression.startsWith(">=", pos) || expression.startsWith("<=", pos) || expression.startsWith("==", pos) || expression.startsWith("!=", pos)) {
        tokens.push({ type: "operator", value: expression.slice(pos, pos + 2) });
        pos += 2;
        continue;
      }

      if ("+-*/><".includes(ch)) {
        tokens.push({ type: "operator", value: ch });
        pos++;
        continue;
      }

      if (ch === "(") {
        tokens.push({ type: "lparen" });
        pos++;
        continue;
      }
      if (ch === ")") {
        tokens.push({ type: "rparen" });
        pos++;
        continue;
      }
      if (ch === ",") {
        tokens.push({ type: "comma" });
        pos++;
        continue;
      }

      throw new Error(`Unexpected character: ${ch}`);
    }

    tokens.push({ type: "eof" });
    return tokens;
  }

  private parseAndEvaluate(expression: string): number | null {
    const tokens = this.tokenizeExpression(expression);
    let index = 0;

    const current = (): MathToken => tokens[index] ?? { type: "eof" };
    const consume = (): MathToken => tokens[index++] ?? { type: "eof" };

    const parsePrimary = (): number | null => {
      const token = current();

      if (token.type === "number") {
        consume();
        return token.value;
      }

      if (token.type === "identifier") {
        const name = token.value;
        consume();
        if (current().type !== "lparen") {
          if (name === "TRUE") return 1;
          if (name === "FALSE") return 0;
          return 0;
        }

        consume(); // (
        const args: Array<number | null> = [];
        if (current().type !== "rparen") {
          args.push(parseComparison());
          while (current().type === "comma") {
            consume();
            args.push(parseComparison());
          }
        }
        if (current().type !== "rparen") {
          throw new Error("Expected closing parenthesis");
        }
        consume();
        return this.evaluateBuiltinFunction(name, args);
      }

      if (token.type === "operator" && token.value === "-") {
        consume();
        const value = parsePrimary();
        return value === null ? null : -value;
      }

      if (token.type === "lparen") {
        consume();
        const value = parseComparison();
        if (current().type !== "rparen") {
          throw new Error("Expected closing parenthesis");
        }
        consume();
        return value;
      }

      throw new Error("Invalid expression");
    };

    const parseMulDiv = (): number | null => {
      let left = parsePrimary();
      while (current().type === "operator" && (current() as { type: "operator"; value: string }).value.match(/[*/]/)) {
        const op = (consume() as { type: "operator"; value: string }).value;
        const right = parsePrimary();
        if (left === null || right === null) return null;
        left = op === "*" ? left * right : (right === 0 ? (left >= 0 ? Infinity : -Infinity) : left / right);
      }
      return left;
    };

    const parseAddSub = (): number | null => {
      let left = parseMulDiv();
      while (current().type === "operator" && (current() as { type: "operator"; value: string }).value.match(/[+-]/)) {
        const op = (consume() as { type: "operator"; value: string }).value;
        const right = parseMulDiv();
        if (left === null || right === null) return null;
        left = op === "+" ? left + right : left - right;
      }
      return left;
    };

    const parseComparison = (): number | null => {
      let left = parseAddSub();
      while (current().type === "operator" && [">", "<", ">=", "<=", "==", "!="].includes((current() as { type: "operator"; value: string }).value)) {
        const op = (consume() as { type: "operator"; value: string }).value;
        const right = parseAddSub();
        if (left === null || right === null) return null;
        switch (op) {
          case ">": left = left > right ? 1 : 0; break;
          case "<": left = left < right ? 1 : 0; break;
          case ">=": left = left >= right ? 1 : 0; break;
          case "<=": left = left <= right ? 1 : 0; break;
          case "==": left = left === right ? 1 : 0; break;
          case "!=": left = left !== right ? 1 : 0; break;
        }
      }
      return left;
    };

    const value = parseComparison();
    if (current().type !== "eof") {
      throw new Error("Unexpected trailing input");
    }
    return value;
  }

  private evaluateBuiltinFunction(name: string, args: Array<number | null>): number | null {
    const valid = args.filter((value): value is number => value !== null && !Number.isNaN(value));

    switch (name) {
      case "ABS": return args[0] === null || args[0] === undefined ? null : Math.abs(args[0]);
      case "ROUND": {
        if (args[0] === null || args[0] === undefined) return null;
        const decimals = args[1] ?? 0;
        const factor = Math.pow(10, decimals);
        return Math.round(args[0] * factor) / factor;
      }
      case "FLOOR": return args[0] === null || args[0] === undefined ? null : Math.floor(args[0]);
      case "CEIL": return args[0] === null || args[0] === undefined ? null : Math.ceil(args[0]);
      case "MIN": return valid.length ? Math.min(...valid) : null;
      case "MAX": return valid.length ? Math.max(...valid) : null;
      case "SUM": return valid.length ? valid.reduce((acc, value) => acc + value, 0) : null;
      case "AVG": return valid.length ? valid.reduce((acc, value) => acc + value, 0) / valid.length : null;
      case "COUNT": return valid.length;
      case "COALESCE": return valid.length ? valid[0] : null;
      case "ISNULL": return args.length < 1 ? null : (args[0] === null ? 1 : 0);
      case "IF":
        return args.length < 3 ? null : ((args[0] ?? 0) !== 0 ? args[1] : args[2]);
      default:
        if (BUILTIN_FUNCTIONS.has(name)) return null;
        return null;
    }
  }

  evaluateForRow(formula: string, rowKey: string, colKey: string, measureIndex: number): EvaluationResult {
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
