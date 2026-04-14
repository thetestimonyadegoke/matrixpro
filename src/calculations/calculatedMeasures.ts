/**
 * Calculated Measures System
 * Manages visual-level computed measures that don't affect the semantic model
 */

import { CellValue, MeasureInfo } from "../model/pivot";
import { generateCellKey } from "../model/keys";
import { parseFormula, ASTNode, ParseError } from "./formulaParser";
import { evaluateFormula, EvaluationContext, detectCircularReferences } from "./formulaEvaluator";

export type AggregationMode = "aggregate-then-calc" | "calc-then-aggregate";

export interface CalculatedMeasureDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  format: string;
  aggregationMode: AggregationMode;
  enabled: boolean;
  order: number;
}

export interface CalculatedMeasureState {
  definition: CalculatedMeasureDefinition;
  ast: ASTNode | null;
  errors: ParseError[];
  isValid: boolean;
  referencedMeasures: string[];
  referencedCalcs: string[];
}

export interface CalculatedMeasuresConfig {
  measures: CalculatedMeasureDefinition[];
}

export const defaultCalculatedMeasuresConfig: CalculatedMeasuresConfig = {
  measures: [],
};

/**
 * Parse and validate all calculated measure definitions
 */
export function parseCalculatedMeasures(
  definitions: CalculatedMeasureDefinition[],
  availableMeasures: string[]
): CalculatedMeasureState[] {
  const states: CalculatedMeasureState[] = [];

  for (const def of definitions) {
    const { ast, errors } = parseFormula(def.formula);
    
    const referencedMeasures: string[] = [];
    const referencedCalcs: string[] = [];
    
    if (ast) {
      collectReferences(ast, referencedMeasures, referencedCalcs);
    }

    // Validate measure references
    const measureSet = new Set(availableMeasures.map(m => m.toLowerCase()));
    const unknownMeasures = referencedMeasures.filter(
      m => !measureSet.has(m.toLowerCase())
    );

    const validationErrors = [...errors];
    for (const unknown of unknownMeasures) {
      validationErrors.push({
        message: `Unknown measure: ${unknown}`,
        position: 0,
      });
    }

    states.push({
      definition: def,
      ast,
      errors: validationErrors,
      isValid: validationErrors.length === 0 && ast !== null,
      referencedMeasures,
      referencedCalcs,
    });
  }

  // Check for circular references
  const circularErrors = detectCircularReferences(
    states.map(s => ({
      id: s.definition.id,
      formula: s.definition.formula,
      referencedCalcs: s.referencedCalcs,
    }))
  );

  if (circularErrors.length > 0) {
    // Mark all measures involved in circular refs as invalid
    for (const state of states) {
      if (circularErrors.some(e => e.includes(state.definition.id))) {
        state.isValid = false;
        state.errors.push({
          message: "Circular reference detected",
          position: 0,
        });
      }
    }
  }

  return states;
}

function collectReferences(
  node: ASTNode,
  measures: string[],
  calcs: string[]
): void {
  if (node.type === "MeasureRef" && typeof node.value === "string") {
    measures.push(node.value);
  }
  if (node.type === "CalcRef" && typeof node.value === "string") {
    calcs.push(node.value);
  }
  if (node.left) collectReferences(node.left, measures, calcs);
  if (node.right) collectReferences(node.right, measures, calcs);
  if (node.args) node.args.forEach(arg => collectReferences(arg, measures, calcs));
  if (node.condition) collectReferences(node.condition, measures, calcs);
  if (node.thenBranch) collectReferences(node.thenBranch, measures, calcs);
  if (node.elseBranch) collectReferences(node.elseBranch, measures, calcs);
}

/**
 * Compute calculated measures for all cells
 */
export function computeCalculatedMeasures(
  calcStates: CalculatedMeasureState[],
  baseMeasures: MeasureInfo[],
  baseCellMap: Map<string, CellValue>,
  rowKeys: string[],
  colKeys: string[]
): {
  calculatedCellMap: Map<string, CellValue>;
  calculatedMeasures: MeasureInfo[];
} {
  const calculatedCellMap = new Map<string, CellValue>();
  const calculatedMeasures: MeasureInfo[] = [];

  // Sort by order and filter enabled + valid
  const validCalcs = calcStates
    .filter(s => s.isValid && s.definition.enabled)
    .sort((a, b) => a.definition.order - b.definition.order);

  // Create measure info for each calculated measure
  for (let i = 0; i < validCalcs.length; i++) {
    const calc = validCalcs[i];
    calculatedMeasures.push({
      index: baseMeasures.length + i,
      name: calc.definition.name,
      format: calc.definition.format,
      queryName: `__calc__${calc.definition.id}`,
    });
  }

  // Build a map from measure name to index for quick lookup
  const measureNameToIndex = new Map<string, number>();
  for (const m of baseMeasures) {
    measureNameToIndex.set(m.name.toLowerCase(), m.index);
  }

  // Compute values for each cell
  for (const rowKey of rowKeys) {
    for (const colKey of colKeys) {
      // Cache of calculated values for this cell (for chaining)
      const calcCache = new Map<string, number | null>();

      for (let i = 0; i < validCalcs.length; i++) {
        const calc = validCalcs[i];
        const measureIndex = baseMeasures.length + i;

        const context: EvaluationContext = {
          getMeasureValue: (name: string) => {
            const idx = measureNameToIndex.get(name.toLowerCase());
            if (idx === undefined) return null;
            const cellKey = generateCellKey(rowKey, colKey, idx);
            const cell = baseCellMap.get(cellKey);
            return cell?.value ?? null;
          },
          getCalculatedValue: (name: string) => {
            // Look up in cache (for chained calcs)
            const cached = calcCache.get(name.toLowerCase());
            if (cached !== undefined) return cached;
            return null;
          },
        };

        const result = calc.ast ? evaluateFormula(calc.ast, context) : { value: null };
        const value = result.value;

        // Store in cache for chaining
        calcCache.set(calc.definition.name.toLowerCase(), value);

        // Create cell value
        const cellKey = generateCellKey(rowKey, colKey, measureIndex);
        calculatedCellMap.set(cellKey, {
          value,
          formattedValue: formatValue(value, calc.definition.format),
          measureIndex,
          rowKey,
          colKey,
        });
      }
    }
  }

  return { calculatedCellMap, calculatedMeasures };
}

function formatValue(value: number | null, format: string): string {
  if (value === null) return "—";
  
  if (format === "percent" || format === "%") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === "currency" || format === "$") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format.startsWith("decimal:")) {
    const decimals = parseInt(format.split(":")[1], 10) || 2;
    return value.toFixed(decimals);
  }
  
  // Default: auto format
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Generate a unique ID for a new calculated measure
 */
export function generateCalcMeasureId(): string {
  const randomBytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 4; i++) {
      randomBytes[i] = (Date.now() + i * 17) % 256;
    }
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `calc_${Date.now()}_${hex}`;
}

/**
 * Create a default calculated measure definition
 */
export function createDefaultCalcMeasure(order: number): CalculatedMeasureDefinition {
  return {
    id: generateCalcMeasureId(),
    name: `Calculated ${order + 1}`,
    description: "",
    formula: "",
    format: "",
    aggregationMode: "aggregate-then-calc",
    enabled: true,
    order,
  };
}
