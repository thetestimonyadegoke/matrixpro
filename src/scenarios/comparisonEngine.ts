/**
 * Scenario Comparison Engine
 * Compares scenarios and generates variance analysis
 */

import { Scenario, ScenarioVariance, calculateScenarioVariance } from "./scenarioManager";
import { CellValue } from "../model/pivot";

export interface ComparisonConfig {
  baseScenarioId: string;
  compareScenarioId: string;
  includeZeroVariances: boolean;
  highlightThreshold: number; // Percentage threshold for highlighting
}

export interface ComparisonResult {
  baseScenario: Scenario;
  compareScenario: Scenario;
  variances: ScenarioVariance[];
  summary: ComparisonSummary;
}

export interface ComparisonSummary {
  totalCells: number;
  cellsWithVariance: number;
  cellsWithPositiveVariance: number;
  cellsWithNegativeVariance: number;
  totalVariance: number;
  averageVariancePercent: number | null;
  maxPositiveVariance: ScenarioVariance | null;
  maxNegativeVariance: ScenarioVariance | null;
}

export interface WaterfallDataPoint {
  label: string;
  value: number;
  isTotal: boolean;
  category: "start" | "positive" | "negative" | "end";
}

/**
 * Compare two scenarios and calculate variances
 */
export function compareScenarios(
  baseCells: Map<string, CellValue>,
  compareCells: Map<string, CellValue>,
  baseScenario: Scenario,
  compareScenario: Scenario,
  config: Partial<ComparisonConfig> = {}
): ComparisonResult {
  const { includeZeroVariances = false, highlightThreshold = 5 } = config;

  const variances: ScenarioVariance[] = [];

  // Get all unique cell keys from both scenarios
  const allKeys = new Set([...baseCells.keys(), ...compareCells.keys()]);

  for (const key of allKeys) {
    const baseCell = baseCells.get(key);
    const compareCell = compareCells.get(key);

    const baseValue = baseCell?.value ?? null;
    const compareValue = compareCell?.value ?? null;

    // Skip if both are null
    if (baseValue === null && compareValue === null) continue;

    const { variance, variancePercent } = calculateScenarioVariance(baseValue, compareValue);

    // Skip zero variances if not including them
    if (!includeZeroVariances && (variance === null || variance === 0)) continue;

    // Parse key to get row/col/measure info
    const [rowKey, colKey, measureKey] = key.split("|");

    variances.push({
      rowKey,
      colKey,
      measureKey,
      baseValue,
      compareValue,
      variance,
      variancePercent,
    });
  }

  const summary = calculateComparisonSummary(variances, highlightThreshold);

  return {
    baseScenario,
    compareScenario,
    variances,
    summary,
  };
}

/**
 * Calculate summary statistics for comparison
 */
function calculateComparisonSummary(
  variances: ScenarioVariance[],
  highlightThreshold: number
): ComparisonSummary {
  let totalCells = variances.length;
  let cellsWithVariance = 0;
  let cellsWithPositiveVariance = 0;
  let cellsWithNegativeVariance = 0;
  let totalVariance = 0;
  let variancePercentSum = 0;
  let variancePercentCount = 0;

  let maxPositiveVariance: ScenarioVariance | null = null;
  let maxNegativeVariance: ScenarioVariance | null = null;

  for (const v of variances) {
    if (v.variance !== null && v.variance !== 0) {
      cellsWithVariance++;
      totalVariance += v.variance;

      if (v.variance > 0) {
        cellsWithPositiveVariance++;
        if (!maxPositiveVariance || v.variance > maxPositiveVariance.variance!) {
          maxPositiveVariance = v;
        }
      } else {
        cellsWithNegativeVariance++;
        if (!maxNegativeVariance || v.variance < maxNegativeVariance.variance!) {
          maxNegativeVariance = v;
        }
      }
    }

    if (v.variancePercent !== null) {
      variancePercentSum += v.variancePercent;
      variancePercentCount++;
    }
  }

  return {
    totalCells,
    cellsWithVariance,
    cellsWithPositiveVariance,
    cellsWithNegativeVariance,
    totalVariance,
    averageVariancePercent: variancePercentCount > 0 ? variancePercentSum / variancePercentCount : null,
    maxPositiveVariance,
    maxNegativeVariance,
  };
}

/**
 * Generate waterfall data for bridge chart
 */
export function generateWaterfallData(
  variances: ScenarioVariance[],
  baseTotal: number,
  categories: string[]
): WaterfallDataPoint[] {
  const dataPoints: WaterfallDataPoint[] = [];

  // Starting point
  dataPoints.push({
    label: "Base",
    value: baseTotal,
    isTotal: true,
    category: "start",
  });

  // Group variances by category
  const variancesByCategory = new Map<string, number>();
  for (const v of variances) {
    if (v.variance === null) continue;

    // Extract category from row key or use measure name
    const category = v.measureKey || "Other";
    const current = variancesByCategory.get(category) || 0;
    variancesByCategory.set(category, current + v.variance);
  }

  // Add variance categories
  for (const [category, value] of variancesByCategory) {
    dataPoints.push({
      label: category,
      value,
      isTotal: false,
      category: value >= 0 ? "positive" : "negative",
    });
  }

  // Calculate ending total
  const endingTotal = baseTotal + Array.from(variancesByCategory.values()).reduce((a, b) => a + b, 0);

  // Ending point
  dataPoints.push({
    label: "Total",
    value: endingTotal,
    isTotal: true,
    category: "end",
  });

  return dataPoints;
}

/**
 * Get variance color based on value and threshold
 */
export function getVarianceColor(
  variance: number | null,
  variancePercent: number | null,
  threshold: number = 5
): { background: string; text: string; icon: string } {
  if (variance === null) {
    return { background: "transparent", text: "inherit", icon: "" };
  }

  const isSignificant = variancePercent !== null && Math.abs(variancePercent) >= threshold;

  if (variance > 0) {
    return {
      background: isSignificant ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.08)",
      text: "#16a34a",
      icon: "▲",
    };
  } else if (variance < 0) {
    return {
      background: isSignificant ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
      text: "#dc2626",
      icon: "▼",
    };
  }

  return { background: "transparent", text: "inherit", icon: "●" };
}

/**
 * Format variance for display
 */
export function formatVariance(
  variance: number | null,
  variancePercent: number | null,
  format: "absolute" | "percentage" | "both" = "both"
): string {
  if (variance === null) return "—";

  let result = "";

  if (format === "absolute" || format === "both") {
    const prefix = variance > 0 ? "+" : "";
    result += `${prefix}${variance.toLocaleString()}`;
  }

  if (format === "percentage" || format === "both") {
    if (variancePercent !== null) {
      const prefix = variancePercent > 0 ? "+" : "";
      if (result) result += " ";
      result += `(${prefix}${variancePercent.toFixed(1)}%)`;
    }
  }

  return result || "—";
}

/**
 * Compare multiple scenarios against base
 */
export function compareMultipleScenarios(
  baseCells: Map<string, CellValue>,
  scenarioCells: Map<string, Map<string, CellValue>>,
  baseScenario: Scenario,
  scenariosToCompare: Scenario[]
): ComparisonResult[] {
  return scenariosToCompare.map((compareScenario) => {
    const compareCells = scenarioCells.get(compareScenario.id) || new Map();
    return compareScenarios(baseCells, compareCells, baseScenario, compareScenario);
  });
}

/**
 * Find significant variances (above threshold)
 */
export function findSignificantVariances(
  variances: ScenarioVariance[],
  threshold: number = 5
): ScenarioVariance[] {
  return variances.filter(
    (v) => v.variancePercent !== null && Math.abs(v.variancePercent) >= threshold
  );
}

/**
 * Export comparison to CSV
 */
export function exportComparisonToCSV(result: ComparisonResult): string {
  const headers = [
    "Row",
    "Column",
    "Measure",
    result.baseScenario.name,
    result.compareScenario.name,
    "Variance",
    "Variance %",
  ].join(",");

  const rows = result.variances.map((v) =>
    [
      v.rowKey,
      v.colKey,
      v.measureKey,
      v.baseValue ?? "",
      v.compareValue ?? "",
      v.variance ?? "",
      v.variancePercent?.toFixed(2) ?? "",
    ].join(",")
  );

  return [headers, ...rows].join("\n");
}
