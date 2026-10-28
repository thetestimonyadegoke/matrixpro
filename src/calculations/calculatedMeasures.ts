/**
 * Calculated Measures System
 * Manages visual-level computed measures that don't affect the semantic model
 */

import { CellValue, MeasureInfo, formatValue } from "../model/pivot";
import { generateCellKey } from "../model/keys";
import { ColumnFormat, resolveColumnFormat } from "../format/directFormats";
import { VisualSettings } from "../settings/settings";
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
  aggregationType?: "none" | "formula" | "sum" | "first" | "last" | "average" | "min" | "max";
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
  const calcNameToId = new Map(
    definitions.map(def => [def.name.trim().toLowerCase(), def.id])
  );
  const availableNameSet = new Set([
    ...availableMeasures.map(name => name.trim().toLowerCase()),
    ...definitions.map(def => def.name.trim().toLowerCase()),
  ]);

  for (const def of definitions) {
    const { ast, errors } = parseFormula(def.formula);
    
    const rawMeasureRefs: string[] = [];
    const referencedMeasures: string[] = [];
    const referencedCalcs: string[] = [];
    
    if (ast) {
      collectReferences(ast, rawMeasureRefs, referencedCalcs);
    }

    for (const ref of rawMeasureRefs) {
      const normalized = ref.trim().toLowerCase();
      const calcId = calcNameToId.get(normalized);
      if (calcId && calcId !== def.id) {
        referencedCalcs.push(calcId);
      } else {
        referencedMeasures.push(ref);
      }
    }

    // Validate measure references
    const unknownMeasures = referencedMeasures.filter(
      m => !availableNameSet.has(m.trim().toLowerCase())
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
  colKeys: string[],
  settings?: VisualSettings,
  colFormats?: Record<string, ColumnFormat>
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
      id: calc.definition.id,
    });
  }

  // Build a map from measure name to index for quick lookup
  const measureNameToIndex = new Map<string, number>();
  for (const m of baseMeasures) {
    measureNameToIndex.set(m.name.toLowerCase(), m.index);
  }
  const calcNameToOffset = new Map<string, number>();
  validCalcs.forEach((calc, index) => {
    calcNameToOffset.set(calc.definition.name.trim().toLowerCase(), index);
  });

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
            const normalized = name.trim().toLowerCase();
            const idx = measureNameToIndex.get(normalized);
            if (idx !== undefined) {
              const cellKey = generateCellKey(rowKey, colKey, idx);
              const cell = baseCellMap.get(cellKey);
              return cell?.value ?? null;
            }
            const calcOffset = calcNameToOffset.get(normalized);
            if (calcOffset !== undefined && calcOffset < i) {
              const calcMeasure = validCalcs[calcOffset];
              return calcCache.get(calcMeasure.definition.name.trim().toLowerCase()) ?? null;
            }
            return null;
          },
          getCalculatedValue: (name: string) => {
            // Look up in cache (for chained calcs)
            const cached = calcCache.get(name.toLowerCase());
            if (cached !== undefined) return cached;
            return null;
          },
        };

        const result = calc.ast ? evaluateFormula(calc.ast, context) : { value: null };
        const value = typeof result.value === "number" && Number.isFinite(result.value)
          ? result.value
          : null;

        // Store in cache for chaining
        calcCache.set(calc.definition.name.toLowerCase(), value);

        // Create cell value
        const cellKey = generateCellKey(rowKey, colKey, measureIndex);
        const colFormat = colFormats ? resolveColumnFormat(colFormats, colKey, measureIndex) : undefined;
        
        calculatedCellMap.set(cellKey, {
          value,
          formattedValue: formatValue(
            value, 
            colFormat?.numberFormat || calc.definition.format || "", 
            settings,
            colFormat
          ),
          measureIndex,
          rowKey,
          colKey,
        });
      }
    }
  }

  return { calculatedCellMap, calculatedMeasures };
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
