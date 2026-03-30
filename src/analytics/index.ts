/**
 * Analytics Module - Index
 * Exports all analytics, statistical functions, and AI-powered insights
 */

// Quick Calculations
export {
  createQuickCalcView,
} from "./quickCalcs";

export type {
  QuickCalcView,
  CellMapLike,
} from "./quickCalcs";

// Statistical Functions
export {
  StatisticalFunctions,
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
} from "./statisticalFunctions";

export type {
  StatisticalResult,
  DistributionStats,
  RegressionResult,
  ForecastResult,
} from "./statisticalFunctions";

// Advanced Filtering (Top N, Exceptions, Outliers)
export {
  AdvancedFiltering,
  applyTopNFilter,
  applyTopNByParent,
  generateExceptionReport,
  detectOutliers,
  TopNPresets,
  ExceptionPresets,
  OutlierPresets,
} from "./advancedFiltering";

export type {
  TopNFilter,
  FilterDirection,
  FilterScope,
  RankedRow,
  TopNResult,
  ExceptionThreshold,
  ExceptionReport,
  OutlierMethod,
  OutlierResult,
} from "./advancedFiltering";

// AI-Powered Insights
export {
  AIInsights,
  generateInsights,
  generateSmartSummary,
} from "./aiInsights";

export type {
  InsightType,
  InsightPriority,
  Insight,
  TrendAnalysis,
  AnomalyDetection,
  PatternDetection,
} from "./aiInsights";

// Conditional Formatting Presets
export * from "./conditionalPresets";
