/**
 * Formula IntelliSense Engine
 * Provides autocomplete suggestions for measures, columns, rows, functions, and shortcuts
 */

import { MeasureInfo } from "../model/pivot";
import { FlattenedNode } from "../model/tree";

export type SuggestionType = 
  | "measure" 
  | "calculatedMeasure"
  | "column" 
  | "row" 
  | "rowPath"
  | "function" 
  | "shortcut"
  | "operator";

export interface Suggestion {
  type: SuggestionType;
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  snippet?: boolean;
  cursorOffset?: number;
}

export interface FunctionSignature {
  name: string;
  signature: string;
  description: string;
  parameters: { name: string; description: string; optional?: boolean }[];
  returnType: string;
  category: "aggregation" | "time" | "helper" | "reference";
}

export interface IntelliSenseContext {
  measures: MeasureInfo[];
  calculatedMeasures: { name: string; formula: string }[];
  columns: FlattenedNode[];
  rows: FlattenedNode[];
  rowHierarchyLevels: string[];
  columnHierarchyLevels: string[];
}

export interface ValidationError {
  message: string;
  position: number;
  length: number;
  severity: "error" | "warning";
}

export const FORMULA_FUNCTIONS: FunctionSignature[] = [
  { name: "SUM", signature: "SUM(range)", description: "Sums values across the specified range", parameters: [{ name: "range", description: "Range of values to sum" }], returnType: "number", category: "aggregation" },
  { name: "AVG", signature: "AVG(range)", description: "Calculates the average of values", parameters: [{ name: "range", description: "Range of values" }], returnType: "number", category: "aggregation" },
  { name: "MIN", signature: "MIN(range)", description: "Returns the minimum value", parameters: [{ name: "range", description: "Range of values" }], returnType: "number", category: "aggregation" },
  { name: "MAX", signature: "MAX(range)", description: "Returns the maximum value", parameters: [{ name: "range", description: "Range of values" }], returnType: "number", category: "aggregation" },
  { name: "COUNT", signature: "COUNT(range)", description: "Counts non-null values", parameters: [{ name: "range", description: "Range of values" }], returnType: "number", category: "aggregation" },
  { name: "YTD", signature: "YTD(measure?)", description: "Year-to-date cumulative value", parameters: [{ name: "measure", description: "Measure to accumulate", optional: true }], returnType: "number", category: "time" },
  { name: "MTD", signature: "MTD(measure?)", description: "Month-to-date cumulative value", parameters: [{ name: "measure", description: "Measure to accumulate", optional: true }], returnType: "number", category: "time" },
  { name: "QTD", signature: "QTD(measure?)", description: "Quarter-to-date cumulative value", parameters: [{ name: "measure", description: "Measure to accumulate", optional: true }], returnType: "number", category: "time" },
  { name: "RUNNING_TOTAL", signature: "RUNNING_TOTAL(measure?)", description: "Running total across columns", parameters: [{ name: "measure", description: "Measure", optional: true }], returnType: "number", category: "time" },
  { name: "ROLLING", signature: "ROLLING(n, measure?)", description: "Rolling window over n periods", parameters: [{ name: "n", description: "Number of periods" }, { name: "measure", description: "Measure", optional: true }], returnType: "number", category: "time" },
  { name: "PREV", signature: "PREV(n?)", description: "Value from n periods ago", parameters: [{ name: "n", description: "Periods back (default: 1)", optional: true }], returnType: "number", category: "time" },
  { name: "NEXT", signature: "NEXT(n?)", description: "Value from n periods ahead", parameters: [{ name: "n", description: "Periods forward (default: 1)", optional: true }], returnType: "number", category: "time" },
  { name: "IF", signature: "IF(cond, then, else)", description: "Conditional expression", parameters: [{ name: "cond", description: "Condition" }, { name: "then", description: "Value if true" }, { name: "else", description: "Value if false" }], returnType: "any", category: "helper" },
  { name: "COALESCE", signature: "COALESCE(v1, v2, ...)", description: "First non-null value", parameters: [{ name: "v1", description: "First value" }, { name: "v2", description: "Fallback" }], returnType: "any", category: "helper" },
  { name: "ABS", signature: "ABS(value)", description: "Absolute value", parameters: [{ name: "value", description: "Numeric value" }], returnType: "number", category: "helper" },
  { name: "ROUND", signature: "ROUND(value, decimals?)", description: "Rounds to decimal places", parameters: [{ name: "value", description: "Value" }, { name: "decimals", description: "Decimals", optional: true }], returnType: "number", category: "helper" },
  { name: "ISNULL", signature: "ISNULL(value)", description: "Returns true if null", parameters: [{ name: "value", description: "Value to check" }], returnType: "boolean", category: "helper" },
  { name: "MEASURE", signature: "MEASURE(\"name\")", description: "References a measure by name", parameters: [{ name: "name", description: "Measure name" }], returnType: "number", category: "reference" },
  { name: "COL", signature: "COL(\"member\")", description: "References a column member", parameters: [{ name: "member", description: "Column member name" }], returnType: "column", category: "reference" },
  { name: "RANGE", signature: "RANGE(\"start\", \"end\")", description: "Defines a column range", parameters: [{ name: "start", description: "Start column" }, { name: "end", description: "End column" }], returnType: "range", category: "reference" },
  { name: "ROW", signature: "ROW(\"member\")", description: "References a row member", parameters: [{ name: "member", description: "Row member name" }], returnType: "row", category: "reference" },
  { name: "ROWPATH", signature: "ROWPATH(\"path\")", description: "References row by absolute path", parameters: [{ name: "path", description: "Full path (e.g., \"Project A⟂Revenue\")" }], returnType: "row", category: "reference" },
  { name: "CELL", signature: "CELL(row, col, measure?)", description: "References a specific cell", parameters: [{ name: "row", description: "Row reference" }, { name: "col", description: "Column reference" }, { name: "measure", description: "Measure name", optional: true }], returnType: "number", category: "reference" },
];

export const NAMED_SHORTCUTS: Suggestion[] = [
  { type: "shortcut", label: "THIS()", insertText: "THIS()", detail: "Current cell value", documentation: "Returns the value of the current cell context" },
  { type: "shortcut", label: "MODEL()", insertText: "MODEL()", detail: "Base model value", documentation: "Returns the original model value before any overrides" },
  { type: "shortcut", label: "INPUT()", insertText: "INPUT()", detail: "User input value", documentation: "Returns user-entered override if present, else model value" },
  { type: "shortcut", label: "ROW_TOTAL()", insertText: "ROW_TOTAL()", detail: "Row total", documentation: "Returns the total for the current row across all columns" },
  { type: "shortcut", label: "COL_TOTAL()", insertText: "COL_TOTAL()", detail: "Column total", documentation: "Returns the total for the current column across all rows" },
];

export class FormulaIntelliSense {
  private context: IntelliSenseContext;

  constructor(context: IntelliSenseContext) {
    this.context = context;
  }

  updateContext(context: Partial<IntelliSenseContext>): void {
    this.context = { ...this.context, ...context };
  }

  getSuggestions(formula: string, cursorPosition: number): Suggestion[] {
    const textBeforeCursor = formula.substring(0, cursorPosition);
    const trigger = this.detectTrigger(textBeforeCursor);

    switch (trigger.type) {
      case "measure":
        return this.getMeasureSuggestions(trigger.filter);
      case "rowScoped":
        return this.getRowScopedSuggestions(trigger.scope, trigger.filter);
      case "column":
        return this.getColumnSuggestions(trigger.filter);
      case "function":
        return this.getFunctionSuggestions(trigger.filter);
      case "general":
      default:
        return this.getAllSuggestions(trigger.filter);
    }
  }

  private detectTrigger(text: string): { type: string; filter: string; scope?: string } {
    // Check for [MeasureName pattern
    const measureMatch = text.match(/\[([^\]]*?)$/);
    if (measureMatch) {
      return { type: "measure", filter: measureMatch[1] };
    }

    // Check for Scope[Member pattern (e.g., Project[Revenue)
    const scopedMatch = text.match(/(\w+)\[([^\]]*?)$/);
    if (scopedMatch) {
      return { type: "rowScoped", scope: scopedMatch[1], filter: scopedMatch[2] };
    }

    // Check for COL(" or RANGE(" pattern
    const colMatch = text.match(/(?:COL|RANGE)\s*\(\s*"([^"]*?)$/i);
    if (colMatch) {
      return { type: "column", filter: colMatch[1] };
    }

    // Check for ROW(" or ROWPATH(" pattern
    const rowMatch = text.match(/(?:ROW|ROWPATH)\s*\(\s*"([^"]*?)$/i);
    if (rowMatch) {
      return { type: "row", filter: rowMatch[1] };
    }

    // Check for function start
    const funcMatch = text.match(/(\w*)$/);
    if (funcMatch && funcMatch[1].length > 0) {
      return { type: "function", filter: funcMatch[1] };
    }

    return { type: "general", filter: "" };
  }

  private getMeasureSuggestions(filter: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const filterLower = filter.toLowerCase();

    // Base measures
    for (const measure of this.context.measures) {
      if (measure.name.toLowerCase().includes(filterLower)) {
        suggestions.push({
          type: "measure",
          label: measure.name,
          insertText: `[${measure.name}]`,
          detail: "Measure",
          documentation: `Base measure: ${measure.name}`,
        });
      }
    }

    // Calculated measures
    for (const calc of this.context.calculatedMeasures) {
      if (calc.name.toLowerCase().includes(filterLower)) {
        suggestions.push({
          type: "calculatedMeasure",
          label: calc.name,
          insertText: `[${calc.name}]`,
          detail: "Calculated Measure",
          documentation: `Formula: ${calc.formula}`,
        });
      }
    }

    return suggestions;
  }

  private getRowScopedSuggestions(scope: string, filter: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const filterLower = filter.toLowerCase();
    const scopeLower = scope.toLowerCase();

    // Find rows that match the scope level
    const scopeLevel = this.context.rowHierarchyLevels.findIndex(
      level => level.toLowerCase() === scopeLower
    );

    for (const row of this.context.rows) {
      // Match rows at the appropriate level or children of scope
      if (row.label.toLowerCase().includes(filterLower)) {
        suggestions.push({
          type: "row",
          label: row.label,
          insertText: `${scope}[${row.label}]`,
          detail: `Row at level ${row.level}`,
          documentation: `Path: ${row.path.join(" > ")}`,
        });
      }
    }

    return suggestions;
  }

  private getColumnSuggestions(filter: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const filterLower = filter.toLowerCase();
    const seen = new Set<string>();

    for (const col of this.context.columns) {
      if (!seen.has(col.label) && col.label.toLowerCase().includes(filterLower)) {
        seen.add(col.label);
        suggestions.push({
          type: "column",
          label: col.label,
          insertText: `"${col.label}"`,
          detail: `Column member`,
          documentation: col.path.length > 1 ? `Path: ${col.path.join(" > ")}` : undefined,
        });
      }
    }

    return suggestions;
  }

  private getFunctionSuggestions(filter: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const filterLower = filter.toLowerCase();

    for (const func of FORMULA_FUNCTIONS) {
      if (func.name.toLowerCase().startsWith(filterLower)) {
        suggestions.push({
          type: "function",
          label: func.name,
          insertText: `${func.name}()`,
          detail: func.signature,
          documentation: func.description,
          snippet: true,
          cursorOffset: -1,
        });
      }
    }

    return suggestions;
  }

  private getAllSuggestions(filter: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const filterLower = filter.toLowerCase();

    // Functions
    suggestions.push(...this.getFunctionSuggestions(filter));

    // Shortcuts
    for (const shortcut of NAMED_SHORTCUTS) {
      if (shortcut.label.toLowerCase().includes(filterLower)) {
        suggestions.push(shortcut);
      }
    }

    // Measures (if filter starts with [)
    if (filter === "" || filter.startsWith("[")) {
      suggestions.push(...this.getMeasureSuggestions(filter.replace("[", "")));
    }

    return suggestions;
  }

  getFunctionSignature(functionName: string): FunctionSignature | undefined {
    return FORMULA_FUNCTIONS.find(f => f.name.toUpperCase() === functionName.toUpperCase());
  }

  validateFormula(formula: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for unmatched brackets
    let bracketCount = 0;
    let parenCount = 0;
    for (let i = 0; i < formula.length; i++) {
      if (formula[i] === "[") bracketCount++;
      if (formula[i] === "]") bracketCount--;
      if (formula[i] === "(") parenCount++;
      if (formula[i] === ")") parenCount--;

      if (bracketCount < 0) {
        errors.push({ message: "Unexpected ]", position: i, length: 1, severity: "error" });
        bracketCount = 0;
      }
      if (parenCount < 0) {
        errors.push({ message: "Unexpected )", position: i, length: 1, severity: "error" });
        parenCount = 0;
      }
    }

    if (bracketCount > 0) {
      errors.push({ message: "Missing closing ]", position: formula.length - 1, length: 1, severity: "error" });
    }
    if (parenCount > 0) {
      errors.push({ message: "Missing closing )", position: formula.length - 1, length: 1, severity: "error" });
    }

    // Check for unknown measure references
    const measureRefs = formula.match(/\[([^\]]+)\]/g) || [];
    const knownMeasures = new Set([
      ...this.context.measures.map(m => m.name.toLowerCase()),
      ...this.context.calculatedMeasures.map(m => m.name.toLowerCase()),
    ]);

    for (const ref of measureRefs) {
      const name = ref.slice(1, -1).toLowerCase();
      if (!knownMeasures.has(name)) {
        const pos = formula.indexOf(ref);
        errors.push({
          message: `Unknown measure: ${ref.slice(1, -1)}`,
          position: pos,
          length: ref.length,
          severity: "error",
        });
      }
    }

    // Check for divide by zero patterns
    if (/\/\s*0(?!\d)/.test(formula)) {
      const pos = formula.search(/\/\s*0(?!\d)/);
      errors.push({
        message: "Potential divide by zero",
        position: pos,
        length: 2,
        severity: "warning",
      });
    }

    return errors;
  }
}

export function createCellReference(
  rowKey: string,
  rowLabel: string,
  colKey: string,
  colLabel: string,
  measureName?: string
): string {
  const rowPart = `row="${rowLabel}"`;
  const colPart = `col="${colLabel}"`;
  const measurePart = measureName ? `, measure="${measureName}"` : "";
  return `CELL(${rowPart}, ${colPart}${measurePart})`;
}
