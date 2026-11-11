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

/** The calculated measures that actually render, in display order (same filter as computeCalculatedMeasures). */
export function getActiveCalcStates(calcStates: CalculatedMeasureState[]): CalculatedMeasureState[] {
  return calcStates
    .filter(s => s.isValid && s.definition.enabled)
    .sort((a, b) => a.definition.order - b.definition.order);
}

/**
 * How a calculated measure is combined on parent rows, subtotals and grand totals.
 * "formula" re-evaluates the formula on the totalled inputs (right for ratios);
 * the other kinds combine the already-computed child values.
 */
export type CalcRollupKind = "formula" | "none" | "sum" | "first" | "last" | "average" | "min" | "max";

export function resolveCalcRollupKind(def: CalculatedMeasureDefinition): CalcRollupKind {
  if (def.aggregationType) return def.aggregationType;
  const mode = def.aggregationMode as string | undefined;
  return mode === "beforeTotals" || mode === "calc-then-aggregate" ? "sum" : "formula";
}

/** What a year-to-date column needs to value a calculated measure from the columns it covers. */
export interface YtdContext {
  /** Number of measures that come from the data (calculated measures follow them). */
  baseCount: number;
  measures: MeasureInfo[];
  /** Active calculated measures, in display order (measure index = baseCount + position). */
  states: CalculatedMeasureState[];
}

/**
 * The year-to-date value of one measure on one row, over the given source columns.
 * Data measures add up. A formula-style calculated measure is re-evaluated on the
 * year-to-date totals (so a ratio is total ÷ total, never a sum of ratios); the other
 * aggregation types combine the per-column calculated values.
 */
export function computeYtdValue(
  measureIndex: number,
  rowKey: string,
  sourceColumnKeys: string[],
  ctx: YtdContext,
  cellMap: { get: (key: string) => CellValue | undefined },
  depth = 0
): number | null {
  const valuesFor = (index: number): number[] => {
    const values: number[] = [];
    for (const colKey of sourceColumnKeys) {
      const v = cellMap.get(generateCellKey(rowKey, colKey, index))?.value;
      if (typeof v === "number" && Number.isFinite(v)) values.push(v);
    }
    return values;
  };
  const sum = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) : null);

  if (measureIndex < ctx.baseCount) return sum(valuesFor(measureIndex));

  const state = ctx.states[measureIndex - ctx.baseCount];
  if (!state) return null;
  const kind = resolveCalcRollupKind(state.definition);

  if (kind === "formula") {
    if (!state.ast || depth > 8) return null;
    const nameToIndex = new Map<string, number>();
    ctx.measures.forEach((m, i) => nameToIndex.set(m.name.trim().toLowerCase(), i));
    const read = (name: string): number | null => {
      const index = nameToIndex.get(name.trim().toLowerCase());
      // A calculated measure may only read measures that come before it.
      if (index === undefined || index >= measureIndex) return null;
      return computeYtdValue(index, rowKey, sourceColumnKeys, ctx, cellMap, depth + 1);
    };
    const result = evaluateFormula(state.ast, { getMeasureValue: read, getCalculatedValue: read });
    return typeof result.value === "number" && Number.isFinite(result.value) ? result.value : null;
  }

  const values = valuesFor(measureIndex);
  if (kind === "none" || values.length === 0) return null;
  switch (kind) {
    case "first": return values[0];
    case "last": return values[values.length - 1];
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
    case "average": return values.reduce((a, b) => a + b, 0) / values.length;
    default: return sum(values);
  }
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
