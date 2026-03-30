/**
 * Formula Evaluator for Calculated Measures
 * Evaluates parsed AST nodes against cell data
 */

import { ASTNode } from "./formulaParser";

export interface EvaluationContext {
  getMeasureValue: (measureName: string) => number | null;
  getCalculatedValue?: (calcName: string) => number | null;
  getCellValue?: (ref: string) => number | null;
}

export interface EvaluationResult {
  value: number | null;
  error?: string;
}

export function evaluateFormula(
  ast: ASTNode,
  context: EvaluationContext
): EvaluationResult {
  try {
    const value = evaluate(ast, context);
    return { value };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : "Evaluation error"
    };
  }
}

function evaluate(node: ASTNode, context: EvaluationContext): number | null {
  switch (node.type) {
    case "Number":
      return typeof node.value === "number" ? node.value : null;

    case "MeasureRef": {
      if (typeof node.value !== "string") return null;
      return context.getMeasureValue(node.value);
    }

    case "CalcRef": {
      if (typeof node.value !== "string") return null;
      if (!context.getCalculatedValue) return null;
      return context.getCalculatedValue(node.value);
    }

    case "CellRef": {
      if (typeof node.value !== "string") return null;
      if (!context.getCellValue) return null;
      return context.getCellValue(node.value);
    }

    case "UnaryOp": {
      if (node.operator === "-" && node.right) {
        const val = evaluate(node.right, context);
        return val !== null ? -val : null;
      }
      return null;
    }

    case "BinaryOp": {
      if (!node.left || !node.right || !node.operator) return null;
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);

      // Comparison operators return 1 or 0
      if (["==", "!=", ">", "<", ">=", "<="].includes(node.operator)) {
        if (left === null || right === null) return null;
        switch (node.operator) {
          case "==": return left === right ? 1 : 0;
          case "!=": return left !== right ? 1 : 0;
          case ">": return left > right ? 1 : 0;
          case "<": return left < right ? 1 : 0;
          case ">=": return left >= right ? 1 : 0;
          case "<=": return left <= right ? 1 : 0;
        }
      }

      // Arithmetic operators
      if (left === null || right === null) return null;
      switch (node.operator) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return right !== 0 ? left / right : (left >= 0 ? Infinity : -Infinity);
        default: return null;
      }
    }

    case "Conditional": {
      if (!node.condition || !node.thenBranch || !node.elseBranch) return null;
      const condition = evaluate(node.condition, context);
      if (condition === null) return null;
      return condition !== 0
        ? evaluate(node.thenBranch, context)
        : evaluate(node.elseBranch, context);
    }

    case "FunctionCall": {
      if (typeof node.value !== "string" || !node.args) return null;
      return evaluateFunction(node.value, node.args, context);
    }

    default:
      return null;
  }
}

function evaluateFunction(
  funcName: string,
  args: ASTNode[],
  context: EvaluationContext
): number | null {
  const evaluatedArgs = args.map(arg => evaluate(arg, context));

  switch (funcName) {
    case "ABS": {
      if (evaluatedArgs.length < 1 || evaluatedArgs[0] === null) return null;
      return Math.abs(evaluatedArgs[0]);
    }

    case "ROUND": {
      if (evaluatedArgs.length < 1 || evaluatedArgs[0] === null) return null;
      const decimals = evaluatedArgs[1] ?? 0;
      if (decimals === null) return null;
      const factor = Math.pow(10, decimals);
      return Math.round(evaluatedArgs[0] * factor) / factor;
    }

    case "FLOOR": {
      if (evaluatedArgs.length < 1 || evaluatedArgs[0] === null) return null;
      return Math.floor(evaluatedArgs[0]);
    }

    case "CEIL": {
      if (evaluatedArgs.length < 1 || evaluatedArgs[0] === null) return null;
      return Math.ceil(evaluatedArgs[0]);
    }

    case "MIN": {
      const validArgs = evaluatedArgs.filter((v): v is number => v !== null);
      if (validArgs.length === 0) return null;
      return Math.min(...validArgs);
    }

    case "MAX": {
      const validArgs = evaluatedArgs.filter((v): v is number => v !== null);
      if (validArgs.length === 0) return null;
      return Math.max(...validArgs);
    }

    case "SUM": {
      const validArgs = evaluatedArgs.filter((v): v is number => v !== null);
      if (validArgs.length === 0) return null;
      return validArgs.reduce((a, b) => a + b, 0);
    }

    case "AVG": {
      const validArgs = evaluatedArgs.filter((v): v is number => v !== null);
      if (validArgs.length === 0) return null;
      return validArgs.reduce((a, b) => a + b, 0) / validArgs.length;
    }

    case "COALESCE": {
      for (const val of evaluatedArgs) {
        if (val !== null) return val;
      }
      return null;
    }

    case "ISNULL": {
      if (evaluatedArgs.length < 1) return null;
      return evaluatedArgs[0] === null ? 1 : 0;
    }

    default:
      return null;
  }
}

/**
 * Detect circular references in calculated measure definitions
 */
export function detectCircularReferences(
  measures: Array<{ id: string; formula: string; referencedCalcs: string[] }>
): string[] {
  const errors: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(measureId: string, path: string[]): boolean {
    if (recursionStack.has(measureId)) {
      errors.push(`Circular reference detected: ${[...path, measureId].join(" → ")}`);
      return true;
    }
    if (visited.has(measureId)) return false;

    visited.add(measureId);
    recursionStack.add(measureId);

    const measure = measures.find(m => m.id === measureId);
    if (measure) {
      for (const ref of measure.referencedCalcs) {
        if (dfs(ref, [...path, measureId])) {
          return true;
        }
      }
    }

    recursionStack.delete(measureId);
    return false;
  }

  for (const measure of measures) {
    dfs(measure.id, []);
  }

  return errors;
}
