/**
 * Statistical Functions Library
 * Advanced statistical calculations for data analysis
 * Comparable to Excel's statistical functions and Google Sheets analytics
 */

import { getPerformanceMonitor } from "../performance";

export interface StatisticalResult {
  value: number;
  formatted: string;
  confidence?: number;
  sampleSize: number;
}

export interface DistributionStats {
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  range: number;
  quartiles: [number, number, number]; // Q1, Q2 (median), Q3
  iqr: number; // Interquartile range
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
  standardError: number;
  predictions: number[];
  confidence: number[];
}

export interface ForecastResult {
  values: number[];
  confidenceLower: number[];
  confidenceUpper: number[];
  trend: 'up' | 'down' | 'stable';
  seasonality: boolean;
}

/**
 * Calculate mean (average)
 * Excel equivalent: AVERAGE()
 */
export function mean(values: number[]): StatisticalResult {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  if (validValues.length === 0) return { value: NaN, formatted: "#DIV/0!", sampleSize: 0 };
  
  const sum = validValues.reduce((a, b) => a + b, 0);
  const result = sum / validValues.length;
  
  return {
    value: result,
    formatted: result.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sampleSize: validValues.length,
  };
}

/**
 * Calculate median
 * Excel equivalent: MEDIAN()
 */
export function median(values: number[]): StatisticalResult {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined).sort((a, b) => a - b);
  if (validValues.length === 0) return { value: NaN, formatted: "#N/A", sampleSize: 0 };
  
  const mid = Math.floor(validValues.length / 2);
  const result = validValues.length % 2 !== 0
    ? validValues[mid]
    : (validValues[mid - 1] + validValues[mid]) / 2;
  
  return {
    value: result,
    formatted: result.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sampleSize: validValues.length,
  };
}

/**
 * Calculate mode (most frequent value)
 * Excel equivalent: MODE.SNGL() or MODE.MULT()
 */
export function mode(values: number[]): { values: number[]; formatted: string; sampleSize: number } {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  if (validValues.length === 0) return { values: [], formatted: "#N/A", sampleSize: 0 };
  
  const frequency = new Map<number, number>();
  let maxFreq = 0;
  
  for (const v of validValues) {
    const count = (frequency.get(v) || 0) + 1;
    frequency.set(v, count);
    maxFreq = Math.max(maxFreq, count);
  }
  
  const modes: number[] = [];
  for (const [value, count] of frequency) {
    if (count === maxFreq && count > 1) {
      modes.push(value);
    }
  }
  
  return {
    values: modes.sort((a, b) => a - b),
    formatted: modes.length > 0 ? modes.join(", ") : "#N/A",
    sampleSize: validValues.length,
  };
}

/**
 * Calculate standard deviation
 * Excel equivalent: STDEV.S() (sample) or STDEV.P() (population)
 */
export function stdDev(values: number[], sample = true): StatisticalResult {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  if (validValues.length < 2) return { value: NaN, formatted: "#N/A", sampleSize: validValues.length };
  
  const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const squaredDiffs = validValues.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (sample ? validValues.length - 1 : validValues.length);
  const result = Math.sqrt(variance);
  
  return {
    value: result,
    formatted: result.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sampleSize: validValues.length,
  };
}

/**
 * Calculate variance
 * Excel equivalent: VAR.S() or VAR.P()
 */
export function variance(values: number[], sample = true): StatisticalResult {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  if (validValues.length < 2) return { value: NaN, formatted: "#N/A", sampleSize: validValues.length };
  
  const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const squaredDiffs = validValues.map(v => Math.pow(v - avg, 2));
  const result = squaredDiffs.reduce((a, b) => a + b, 0) / (sample ? validValues.length - 1 : validValues.length);
  
  return {
    value: result,
    formatted: result.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sampleSize: validValues.length,
  };
}

/**
 * Calculate percentile
 * Excel equivalent: PERCENTILE.EXC() or PERCENTILE.INC()
 */
export function percentile(values: number[], p: number): StatisticalResult {
  if (p < 0 || p > 1) return { value: NaN, formatted: "#NUM!", sampleSize: 0 };
  
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined).sort((a, b) => a - b);
  if (validValues.length === 0) return { value: NaN, formatted: "#N/A", sampleSize: 0 };
  
  const index = p * (validValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  const result = validValues[lower] * (1 - weight) + validValues[upper] * weight;
  
  return {
    value: result,
    formatted: result.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sampleSize: validValues.length,
  };
}

/**
 * Calculate correlation coefficient
 * Excel equivalent: CORREL()
 */
export function correl(x: number[], y: number[]): StatisticalResult {
  if (x.length !== y.length || x.length < 2) {
    return { value: NaN, formatted: "#N/A", sampleSize: 0 };
  }
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return { value: NaN, formatted: "#DIV/0!", sampleSize: n };
  
  const result = numerator / denominator;
  
  return {
    value: result,
    formatted: result.toFixed(4),
    confidence: Math.abs(result),
    sampleSize: n,
  };
}

/**
 * Linear regression
 * Excel equivalent: LINEST() or TREND()
 */
export function regression(x: number[], y: number[]): RegressionResult {
  if (x.length !== y.length || x.length < 2) {
    throw new Error("Arrays must have same length and at least 2 elements");
  }
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R-squared
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Correlation
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  // Standard error
  const standardError = Math.sqrt(ssResidual / (n - 2));
  
  // Predictions
  const predictions = x.map(xi => slope * xi + intercept);
  
  // Confidence intervals (95%)
  const confidence = x.map(xi => {
    const prediction = slope * xi + intercept;
    return 1.96 * standardError; // Approximate 95% CI
  });
  
  return {
    slope,
    intercept,
    rSquared,
    correlation,
    standardError,
    predictions,
    confidence,
  };
}

/**
 * Calculate all distribution statistics at once
 */
export function distributionStats(values: number[]): DistributionStats {
  const monitor = getPerformanceMonitor();
  monitor.mark("distribution-stats");
  
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  const sorted = [...validValues].sort((a, b) => a - b);
  
  const n = validValues.length;
  if (n === 0) {
    throw new Error("No valid values");
  }
  
  // Basic stats
  const sum = validValues.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  
  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  
  // Mode
  const modeResult = mode(validValues);
  
  // Variance and StdDev
  const squaredDiffs = validValues.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Quartiles
  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q2 = sorted[q2Index];
  const q3 = sorted[q3Index];
  
  // Skewness
  const cubedDiffs = validValues.map(v => Math.pow(v - mean, 3));
  const sumCubedDiffs = cubedDiffs.reduce((a, b) => a + b, 0);
  const skewness = (sumCubedDiffs / n) / Math.pow(stdDev, 3);
  
  // Kurtosis
  const fourthDiffs = validValues.map(v => Math.pow(v - mean, 4));
  const sumFourthDiffs = fourthDiffs.reduce((a, b) => a + b, 0);
  const kurtosis = (sumFourthDiffs / n) / Math.pow(variance, 2) - 3;
  
  monitor.measure("distribution-stats", "formulaEvaluationTime");
  
  return {
    mean,
    median,
    mode: modeResult.values,
    stdDev,
    variance,
    skewness,
    kurtosis,
    min,
    max,
    range: max - min,
    quartiles: [q1, q2, q3],
    iqr: q3 - q1,
  };
}

/**
 * Calculate moving average
 * Excel equivalent: Not direct, but similar to trend analysis
 */
export function movingAverage(values: number[], window: number): number[] {
  if (window <= 0 || window > values.length) return [];
  
  const result: number[] = [];
  
  for (let i = 0; i <= values.length - window; i++) {
    const windowValues = values.slice(i, i + window);
    const avg = windowValues.reduce((a, b) => a + b, 0) / window;
    result.push(avg);
  }
  
  return result;
}

/**
 * Calculate exponential moving average
 */
export function exponentialMovingAverage(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(ema);
  }
  
  return result;
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * Excel equivalent: RRI()
 */
export function cagr(beginValue: number, endValue: number, periods: number): StatisticalResult {
  if (beginValue <= 0 || endValue <= 0 || periods <= 0) {
    return { value: NaN, formatted: "#NUM!", sampleSize: periods };
  }
  
  const result = Math.pow(endValue / beginValue, 1 / periods) - 1;
  
  return {
    value: result,
    formatted: (result * 100).toFixed(2) + "%",
    sampleSize: periods,
  };
}

/**
 * Calculate growth rate year-over-year
 */
export function yoyGrowth(current: number, previous: number): StatisticalResult {
  if (previous === 0) return { value: NaN, formatted: "#DIV/0!", sampleSize: 2 };
  
  const result = (current - previous) / Math.abs(previous);
  
  return {
    value: result,
    formatted: (result * 100).toFixed(1) + "%",
    sampleSize: 2,
  };
}

/**
 * Forecast future values using linear trend
 * Excel equivalent: FORECAST.LINEAR() or TREND()
 */
export function forecastLinear(
  historicalValues: number[],
  periods: number
): ForecastResult {
  const n = historicalValues.length;
  if (n < 2) {
    return { values: [], confidenceLower: [], confidenceUpper: [], trend: 'stable', seasonality: false };
  }
  
  const x = Array.from({ length: n }, (_, i) => i);
  const reg = regression(x, historicalValues);
  
  const forecasts: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  
  for (let i = 0; i < periods; i++) {
    const xFuture = n + i;
    const prediction = reg.slope * xFuture + reg.intercept;
    const margin = 1.96 * reg.standardError;
    
    forecasts.push(prediction);
    lower.push(prediction - margin);
    upper.push(prediction + margin);
  }
  
  const trend: 'up' | 'down' | 'stable' = reg.slope > 0.01 ? 'up' : reg.slope < -0.01 ? 'down' : 'stable';
  
  return {
    values: forecasts,
    confidenceLower: lower,
    confidenceUpper: upper,
    trend,
    seasonality: false,
  };
}

/**
 * Z-score normalization
 */
export function zScore(values: number[]): number[] {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const std = Math.sqrt(
    validValues.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / validValues.length
  );
  
  if (std === 0) return values.map(() => 0);
  
  return values.map(v => (v - avg) / std);
}

/**
 * Calculate confidence interval
 */
export function confidenceInterval(values: number[], confidence = 0.95): { lower: number; upper: number; margin: number } {
  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  const n = validValues.length;
  
  if (n < 2) return { lower: NaN, upper: NaN, margin: NaN };
  
  const avg = validValues.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    validValues.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / (n - 1)
  );
  
  // Z-score for confidence level
  const zScores: Record<number, number> = { 0.9: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const z = zScores[confidence] || 1.96;
  
  const margin = z * (std / Math.sqrt(n));
  
  return {
    lower: avg - margin,
    upper: avg + margin,
    margin,
  };
}

// Export all functions
export const StatisticalFunctions = {
  mean,
  median,
  mode,
  stdDev,
  variance,
  percentile,
  correl,
  regression,
  distributionStats,
  movingAverage,
  exponentialMovingAverage,
  cagr,
  yoyGrowth,
  forecastLinear,
  zScore,
  confidenceInterval,
};

export default StatisticalFunctions;
