/**
 * AI-Powered Insights Engine
 * Smart analytics and anomaly detection for matrix data
 * Provides actionable insights similar to modern BI tools
 */

import { FlattenedNode } from "../model/tree";
import { CellValue } from "../model/pivot";
import { distributionStats, yoyGrowth, correl } from "./statisticalFunctions";
import { detectOutliers, OutlierMethod } from "./advancedFiltering";

export type InsightType = 
  | 'trend' 
  | 'anomaly' 
  | 'comparison' 
  | 'correlation' 
  | 'pattern' 
  | 'forecast' 
  | 'recommendation';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: InsightPriority;
  affectedCells: string[];
  suggestedAction?: string;
  confidence: number; // 0-1
  metadata: {
    value?: number;
    change?: number;
    benchmark?: number;
    trend?: 'up' | 'down' | 'stable';
  };
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
  slope: number;
  rSquared: number;
  periods: number;
  forecast: number[];
  confidence: number;
}

export interface AnomalyDetection {
  anomalies: Array<{
    row: FlattenedNode;
    value: number;
    expected: number;
    deviation: number;
    severity: 'critical' | 'warning';
  }>;
  totalAnomalies: number;
  anomalyRate: number;
  method: OutlierMethod;
}

export interface PatternDetection {
  pattern: string;
  confidence: number;
  description: string;
  examples: string[];
}

/**
 * Generate AI-powered insights from matrix data
 */
export function generateInsights(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measureIndex: number = 0
): Insight[] {
  const insights: Insight[] = [];
  const targetColKey = columns[measureIndex]?.key || columns[0]?.key;
  
  if (!targetColKey) return insights;

  // Collect data
  const data = collectData(rows, cellMap, targetColKey, measureIndex);
  if (data.length < 3) return insights;

  // Run analyses
  const trends = analyzeTrends(data);
  const anomalies = detectAnomalies(data);
  const patterns = detectPatterns(data);
  const correlations = findCorrelations(rows, cellMap, columns, measureIndex);

  // Generate insights from analyses
  insights.push(...generateTrendInsights(trends, data));
  insights.push(...generateAnomalyInsights(anomalies));
  insights.push(...generatePatternInsights(patterns, data));
  insights.push(...generateCorrelationInsights(correlations));
  insights.push(...generateRecommendations(data, trends, anomalies));

  // Sort by priority and confidence
  insights.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });

  return insights.slice(0, 20); // Limit to top 20 insights
}

/**
 * Analyze trends in time-series data
 */
function analyzeTrends(data: Array<{ row: FlattenedNode; value: number }>): TrendAnalysis {
  if (data.length < 2) {
    return { direction: 'stable', strength: 'weak', slope: 0, rSquared: 0, periods: 0, forecast: [], confidence: 0 };
  }

  const values = data.map(d => d.value);
  const x = Array.from({ length: values.length }, (_, i) => i);
  
  // Linear regression
  const n = values.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // R-squared
  const yMean = sumY / n;
  const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = values.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + (sumY - slope * sumX) / n), 2), 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  // Determine direction and strength
  const direction: TrendAnalysis['direction'] = slope > 0.001 ? 'up' : slope < -0.001 ? 'down' : 'stable';
  const strength: TrendAnalysis['strength'] = rSquared > 0.7 ? 'strong' : rSquared > 0.4 ? 'moderate' : 'weak';

  // Forecast next 3 periods
  const intercept = (sumY - slope * sumX) / n;
  const forecast = [1, 2, 3].map(i => slope * (n + i - 1) + intercept);

  return {
    direction,
    strength,
    slope,
    rSquared,
    periods: n,
    forecast,
    confidence: rSquared,
  };
}

/**
 * Detect anomalies using statistical methods
 */
function detectAnomalies(
  data: Array<{ row: FlattenedNode; value: number }>
): AnomalyDetection {
  const values = data.map(d => d.value);
  const rows = data.map(d => d.row);
  
  // Use Z-score method for simplicity
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );

  if (stdDev === 0) {
    return { anomalies: [], totalAnomalies: 0, anomalyRate: 0, method: 'zscore' };
  }

  const anomalies: AnomalyDetection['anomalies'] = [];
  
  for (let i = 0; i < values.length; i++) {
    const zScore = Math.abs((values[i] - mean) / stdDev);
    
    if (zScore > 2.5) { // More than 2.5 standard deviations
      const expected = mean;
      const deviation = values[i] - expected;
      
      anomalies.push({
        row: rows[i],
        value: values[i],
        expected,
        deviation,
        severity: zScore > 3.5 ? 'critical' : 'warning',
      });
    }
  }

  return {
    anomalies,
    totalAnomalies: anomalies.length,
    anomalyRate: anomalies.length / values.length,
    method: 'zscore',
  };
}

/**
 * Detect patterns in data
 */
function detectPatterns(
  data: Array<{ row: FlattenedNode; value: number }>
): PatternDetection {
  const values = data.map(d => d.value);
  
  if (values.length < 4) {
    return { pattern: 'insufficient_data', confidence: 0, description: 'Not enough data to detect patterns', examples: [] };
  }

  // Check for seasonality (simple version - repeating every N periods)
  const periods = [4, 7, 12]; // Quarterly, weekly, monthly
  
  for (const period of periods) {
    if (values.length >= period * 2) {
      const correlations: number[] = [];
      
      for (let lag = 1; lag <= period; lag++) {
        const x = values.slice(0, values.length - lag);
        const y = values.slice(lag);
        
        if (x.length > 1) {
          const corr = correl(x.slice(0, Math.min(x.length, y.length)), y.slice(0, Math.min(x.length, y.length)));
          if (!isNaN(corr.value)) {
            correlations.push(Math.abs(corr.value));
          }
        }
      }
      
      const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
      
      if (avgCorrelation > 0.7) {
        return {
          pattern: 'seasonal',
          confidence: avgCorrelation,
          description: `Data shows ${period === 4 ? 'quarterly' : period === 7 ? 'weekly' : 'monthly'} seasonality pattern`,
          examples: [`Repeating pattern every ${period} periods`, 'Strong correlation with lagged values'],
        };
      }
    }
  }

  // Check for growth pattern
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const growthRate = (secondAvg - firstAvg) / Math.abs(firstAvg);
  
  if (Math.abs(growthRate) > 0.2) {
    return {
      pattern: growthRate > 0 ? 'growth' : 'decline',
      confidence: Math.min(Math.abs(growthRate), 1),
      description: growthRate > 0 ? 'Data shows consistent growth pattern' : 'Data shows consistent decline pattern',
      examples: [`${(Math.abs(growthRate) * 100).toFixed(1)}% change between periods`],
    };
  }

  return {
    pattern: 'stable',
    confidence: 0.5,
    description: 'Data shows stable pattern without significant trends',
    examples: ['Values remain relatively consistent over time'],
  };
}

/**
 * Find correlations between measures
 */
function findCorrelations(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  primaryMeasure: number
): Array<{ measureIndex: number; correlation: number; strength: string }> {
  if (columns.length < 2) return [];

  const correlations: Array<{ measureIndex: number; correlation: number; strength: string }> = [];
  
  // Get primary measure values
  const primaryColKey = columns[primaryMeasure]?.key;
  if (!primaryColKey) return [];

  const primaryValues: number[] = [];
  for (const row of rows) {
    const cellKey = `${row.key}|${primaryColKey}|${primaryMeasure}`;
    const cell = cellMap.get(cellKey);
    if (cell?.value !== null && cell?.value !== undefined) {
      primaryValues.push(cell.value);
    }
  }

  // Compare with other measures
  for (let m = 0; m < columns.length; m++) {
    if (m === primaryMeasure) continue;
    
    const colKey = columns[m]?.key;
    if (!colKey) continue;

    const otherValues: number[] = [];
    for (const row of rows) {
      const cellKey = `${row.key}|${colKey}|${m}`;
      const cell = cellMap.get(cellKey);
      if (cell?.value !== null && cell?.value !== undefined) {
        otherValues.push(cell.value);
      }
    }

    if (otherValues.length === primaryValues.length && otherValues.length > 2) {
      const corr = correl(primaryValues, otherValues);
      if (!isNaN(corr.value) && Math.abs(corr.value) > 0.5) {
        const absCorr = Math.abs(corr.value);
        correlations.push({
          measureIndex: m,
          correlation: corr.value,
          strength: absCorr > 0.8 ? 'strong' : absCorr > 0.6 ? 'moderate' : 'weak',
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Generate insights from trend analysis
 */
function generateTrendInsights(
  trends: TrendAnalysis,
  data: Array<{ row: FlattenedNode; value: number }>
): Insight[] {
  const insights: Insight[] = [];

  if (trends.strength === 'strong') {
    insights.push({
      id: `trend-${Date.now()}`,
      type: 'trend',
      title: `Strong ${trends.direction}ward Trend Detected`,
      description: `Data shows a strong ${trends.direction}ward trend over ${trends.periods} periods (R² = ${(trends.rSquared * 100).toFixed(1)}%)`,
      priority: trends.direction === 'up' ? 'medium' : 'high',
      affectedCells: data.map(d => d.row.key),
      confidence: trends.rSquared,
      metadata: {
        trend: trends.direction,
        change: trends.slope,
      },
    });

    // Add forecast insight
    if (trends.forecast.length > 0) {
      const lastValue = data[data.length - 1]?.value ?? 0;
      const nextForecast = trends.forecast[0];
      const change = ((nextForecast - lastValue) / lastValue) * 100;
      
      insights.push({
        id: `forecast-${Date.now()}`,
        type: 'forecast',
        title: 'Forecast Available',
        description: `Based on current trend, next value is projected to be ${nextForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`,
        priority: 'low',
        affectedCells: [data[data.length - 1].row.key],
        confidence: trends.rSquared,
        metadata: {
          value: nextForecast,
          trend: trends.direction,
        },
      });
    }
  }

  return insights;
}

/**
 * Generate insights from anomaly detection
 */
function generateAnomalyInsights(anomalies: AnomalyDetection): Insight[] {
  const insights: Insight[] = [];

  if (anomalies.totalAnomalies > 0) {
    const criticalCount = anomalies.anomalies.filter(a => a.severity === 'critical').length;
    
    insights.push({
      id: `anomaly-${Date.now()}`,
      type: 'anomaly',
      title: `${anomalies.totalAnomalies} Anomal${anomalies.totalAnomalies === 1 ? 'y' : 'ies'} Detected`,
      description: criticalCount > 0 
        ? `Found ${criticalCount} critical and ${anomalies.totalAnomalies - criticalCount} warning anomalies in your data`
        : `Found ${anomalies.totalAnomalies} data points that deviate significantly from expected values`,
      priority: criticalCount > 0 ? 'critical' : 'high',
      affectedCells: anomalies.anomalies.map(a => a.row.key),
      suggestedAction: 'Review these values for data entry errors or investigate the underlying cause',
      confidence: Math.min(anomalies.anomalyRate * 5, 1), // Scale up for visibility
      metadata: {
        value: anomalies.totalAnomalies,
      },
    });

    // Individual anomaly insights for critical ones
    for (const anomaly of anomalies.anomalies.filter(a => a.severity === 'critical').slice(0, 3)) {
      insights.push({
        id: `anomaly-detail-${anomaly.row.key}`,
        type: 'anomaly',
        title: `Critical Anomaly: ${anomaly.row.label}`,
        description: `Value ${anomaly.value.toLocaleString()} is ${(Math.abs(anomaly.deviation) / anomaly.expected * 100).toFixed(1)}% higher than expected (${anomaly.expected.toLocaleString()})`,
        priority: 'critical',
        affectedCells: [anomaly.row.key],
        confidence: 0.95,
        metadata: {
          value: anomaly.value,
          benchmark: anomaly.expected,
          change: anomaly.deviation / anomaly.expected,
        },
      });
    }
  }

  return insights;
}

/**
 * Generate insights from pattern detection
 */
function generatePatternInsights(
  pattern: PatternDetection,
  data: Array<{ row: FlattenedNode; value: number }>
): Insight[] {
  const insights: Insight[] = [];

  if (pattern.confidence > 0.6) {
    insights.push({
      id: `pattern-${Date.now()}`,
      type: 'pattern',
      title: `${pattern.pattern.charAt(0).toUpperCase() + pattern.pattern.slice(1)} Pattern Detected`,
      description: pattern.description,
      priority: pattern.pattern === 'decline' ? 'high' : 'medium',
      affectedCells: data.map(d => d.row.key),
      confidence: pattern.confidence,
      metadata: {
        trend: pattern.pattern === 'growth' ? 'up' : pattern.pattern === 'decline' ? 'down' : 'stable',
      },
    });
  }

  return insights;
}

/**
 * Generate correlation insights
 */
function generateCorrelationInsights(
  correlations: Array<{ measureIndex: number; correlation: number; strength: string }>
): Insight[] {
  const insights: Insight[] = [];

  for (const corr of correlations.slice(0, 2)) { // Top 2 correlations
    const isPositive = corr.correlation > 0;
    
    insights.push({
      id: `correlation-${corr.measureIndex}`,
      type: 'correlation',
      title: `${isPositive ? 'Positive' : 'Negative'} Correlation with Measure ${corr.measureIndex + 1}`,
      description: `Measure ${corr.measureIndex + 1} shows a ${corr.strength} ${isPositive ? 'positive' : 'negative'} correlation (${(corr.correlation * 100).toFixed(1)}%) with the primary measure`,
      priority: corr.strength === 'strong' ? 'medium' : 'low',
      affectedCells: [],
      confidence: Math.abs(corr.correlation),
      metadata: {
        value: corr.correlation,
      },
    });
  }

  return insights;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  data: Array<{ row: FlattenedNode; value: number }>,
  trends: TrendAnalysis,
  anomalies: AnomalyDetection
): Insight[] {
  const insights: Insight[] = [];
  
  const values = data.map(d => d.value);
  const stats = distributionStats(values);

  // Recommendation: High variance
  if (stats.stdDev / stats.mean > 0.5) {
    insights.push({
      id: `recommendation-variance`,
      type: 'recommendation',
      title: 'High Variance Detected',
      description: 'Your data shows high variability. Consider applying smoothing or investigating the factors causing large swings.',
      priority: 'medium',
      affectedCells: data.map(d => d.row.key),
      suggestedAction: 'Apply moving average or review data collection process',
      confidence: 0.8,
      metadata: {
        value: stats.stdDev / stats.mean,
      },
    });
  }

  // Recommendation: Declining trend
  if (trends.direction === 'down' && trends.strength !== 'weak') {
    insights.push({
      id: `recommendation-decline`,
      type: 'recommendation',
      title: 'Address Declining Trend',
      description: `Values have declined by ${(Math.abs(trends.slope) * 100).toFixed(1)}% per period on average. Consider reviewing business drivers.`,
      priority: 'high',
      affectedCells: data.map(d => d.row.key),
      suggestedAction: 'Investigate root causes and develop mitigation strategies',
      confidence: trends.rSquared,
      metadata: {
        trend: 'down',
        change: trends.slope,
      },
    });
  }

  return insights;
}

// Helper functions
function collectData(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  colKey: string,
  measureIndex: number
): Array<{ row: FlattenedNode; value: number }> {
  const data: Array<{ row: FlattenedNode; value: number }> = [];
  
  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const cellKey = `${row.key}|${colKey}|${measureIndex}`;
    const cell = cellMap.get(cellKey);
    
    if (cell?.value !== null && cell?.value !== undefined && !isNaN(cell.value)) {
      data.push({ row, value: cell.value });
    }
  }
  
  return data;
}

// Export smart insight generator
export function generateSmartSummary(
  insights: Insight[]
): string {
  const critical = insights.filter(i => i.priority === 'critical');
  const high = insights.filter(i => i.priority === 'high');
  const trends = insights.filter(i => i.type === 'trend');
  const anomalies = insights.filter(i => i.type === 'anomaly');

  let summary = `Analysis complete. Found ${insights.length} insights.`;
  
  if (critical.length > 0) {
    summary += ` ${critical.length} critical issue${critical.length === 1 ? '' : 's'} require${critical.length === 1 ? 's' : ''} immediate attention.`;
  }
  
  if (trends.length > 0) {
    const trend = trends[0];
    summary += ` Data shows a ${trend.metadata?.trend}ward trend.`;
  }
  
  if (anomalies.length > 0) {
    summary += ` ${anomalies[0].metadata?.value} anomal${anomalies[0].metadata?.value === 1 ? 'y' : 'ies'} detected.`;
  }

  return summary;
}

// Export all
export const AIInsights = {
  generateInsights,
  generateSmartSummary,
  analyzeTrends,
  detectAnomalies,
  detectPatterns,
};

export default AIInsights;
