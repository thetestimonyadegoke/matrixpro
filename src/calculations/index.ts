/**
 * Calculations Module - Index
 * Exports all formula and calculation functionality
 */

// Parser exports
export * from "./formulaParser";

// Evaluator exports (excluding duplicates)
export {
  evaluateFormula,
  detectCircularReferences,
  type EvaluationContext,
  type EvaluationResult as EvaluatorResult,
} from "./formulaEvaluator";

// Formula Engine exports
export {
  FormulaEngine,
  createFormulaEngine,
  type FormulaContext,
  type EvaluationResult as FormulaEngineResult,
  type RowMatch,
} from "./FormulaEngine";

// Other modules
export * from "./calculatedMeasures";
export * from "./calculatedRows";
export * from "./formulaPersistence";

