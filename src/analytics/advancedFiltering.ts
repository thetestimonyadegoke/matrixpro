/**
 * Top N / Bottom N Filtering
 * Advanced ranking and filtering for matrix data analysis
 * Supports dynamic recalculation and exception highlighting
 */

import { FlattenedNode } from "../model/tree";
import { CellValue } from "../model/pivot";

export type FilterDirection = 'top' | 'bottom';
export type FilterScope = 'all' | 'byParent' | 'byLevel';

export interface TopNFilter {
  n: number;
  direction: FilterDirection;
  measureIndex: number;
  scope: FilterScope;
  includeOthers: boolean; // Group remaining as "Others"
  othersLabel?: string;
  tieHandling: 'keep' | 'remove' | 'all'; // How to handle ties at cutoff
}

export interface RankedRow {
  row: FlattenedNode;
  value: number;
  rank: number;
  isTie: boolean;
  isInFilter: boolean;
}

export interface TopNResult {
  rows: FlattenedNode[];
  rankings: Map<string, RankedRow>;
  othersRow?: FlattenedNode;
  totalRows: number;
  filteredRows: number;
  applied: boolean;
}

/**
 * Apply Top N / Bottom N filter to matrix rows
 */
export function applyTopNFilter(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  filter: TopNFilter
): TopNResult {
  const startTime = performance.now();
  
  // Get target measure column
  const targetColKey = columns[filter.measureIndex]?.key || columns[0]?.key;
  if (!targetColKey) {
    return { rows, rankings: new Map(), totalRows: rows.length, filteredRows: rows.length, applied: false };
  }

  // Calculate values and ranks
  const rankings: Map<string, RankedRow> = new Map();
  const rowValues: Array<{ row: FlattenedNode; value: number; key: string }> = [];

  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const cellKey = `${row.key}|${targetColKey}|${filter.measureIndex}`;
    const cell = cellMap.get(cellKey);
    const value = cell?.value ?? 0;
    
    rowValues.push({ row, value, key: row.key });
    rankings.set(row.key, {
      row,
      value,
      rank: 0,
      isTie: false,
      isInFilter: false,
    });
  }

  // Sort by value
  rowValues.sort((a, b) => 
    filter.direction === 'top' ? b.value - a.value : a.value - b.value
  );

  // Assign ranks with tie handling
  let currentRank = 0;
  let lastValue: number | null = null;
  const tiesAtCutoff: string[] = [];

  for (let i = 0; i < rowValues.length; i++) {
    const { row, value, key } = rowValues[i];
    
    if (lastValue === null || value !== lastValue) {
      currentRank = i + 1;
    }
    
    const rankedRow = rankings.get(key)!;
    rankedRow.rank = currentRank;
    rankedRow.isTie = value === lastValue;
    
    // Check if at cutoff
    if (currentRank === filter.n) {
      tiesAtCutoff.push(key);
    } else if (currentRank > filter.n && value === lastValue && filter.tieHandling !== 'all') {
      tiesAtCutoff.push(key);
    }
    
    lastValue = value;
  }

  // Determine which rows are in filter
  const inFilterKeys = new Set<string>();
  
  for (const { key } of rowValues) {
    const rankedRow = rankings.get(key)!;
    
    if (rankedRow.rank <= filter.n) {
      rankedRow.isInFilter = true;
      inFilterKeys.add(key);
    } else if (filter.tieHandling === 'all' && rankedRow.isTie && tiesAtCutoff.length > 0) {
      // Include all ties
      rankedRow.isInFilter = true;
      inFilterKeys.add(key);
    }
  }

  // Build filtered rows
  let filteredRows: FlattenedNode[] = [];
  let othersValue = 0;
  let othersCount = 0;

  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) {
      filteredRows.push(row);
    } else if (inFilterKeys.has(row.key)) {
      filteredRows.push(row);
    } else if (filter.includeOthers) {
      // Accumulate others
      const cellKey = `${row.key}|${targetColKey}|${filter.measureIndex}`;
      const cell = cellMap.get(cellKey);
      othersValue += cell?.value ?? 0;
      othersCount++;
    }
  }

  // Create others row if needed
  let othersRow: FlattenedNode | undefined;
  if (filter.includeOthers && othersCount > 0) {
    othersRow = {
      key: '__others__',
      label: filter.othersLabel || 'Others',
      value: othersValue,
      level: 0,
      isLeaf: true,
      isSubtotal: false,
      isGrandTotal: false,
      hasChildren: false,
      isExpanded: false,
      path: ['__others__'],
      children: [],
      indent: 0,
      visibleIndex: filteredRows.length,
    } as FlattenedNode;
    filteredRows.push(othersRow);
  }

  const duration = performance.now() - startTime;
  console.log(`[TopN] Filtered ${rowValues.length} rows to ${inFilterKeys.size} in ${duration.toFixed(2)}ms`);

  return {
    rows: filteredRows,
    rankings,
    othersRow,
    totalRows: rows.length,
    filteredRows: inFilterKeys.size,
    applied: true,
  };
}

/**
 * Apply Top N filter by parent group (hierarchical)
 */
export function applyTopNByParent(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  filter: TopNFilter
): TopNResult {
  // Group rows by parent
  const byParent = new Map<string, FlattenedNode[]>();
  
  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const parentKey = row.path.length > 1 
      ? row.path.slice(0, -1).join('→')
      : 'root';
    
    if (!byParent.has(parentKey)) {
      byParent.set(parentKey, []);
    }
    byParent.get(parentKey)!.push(row);
  }

  // Apply Top N to each group
  const allRankings = new Map<string, RankedRow>();
  const inFilterKeys = new Set<string>();

  for (const [parentKey, parentRows] of byParent) {
    const result = applyTopNFilter(parentRows, cellMap, columns, filter);
    
    // Merge rankings
    for (const [key, ranked] of result.rankings) {
      allRankings.set(key, ranked);
      if (ranked.isInFilter) {
        inFilterKeys.add(key);
      }
    }
  }

  // Build final row list
  const filteredRows = rows.filter(row => 
    row.isSubtotal || 
    row.isGrandTotal || 
    inFilterKeys.has(row.key)
  );

  return {
    rows: filteredRows,
    rankings: allRankings,
    totalRows: rows.length,
    filteredRows: inFilterKeys.size,
    applied: true,
  };
}

/**
 * Exception Reporting - Find values outside thresholds
 */
export interface ExceptionThreshold {
  type: 'absolute' | 'percentile' | 'stdDev' | 'custom';
  lower?: number;
  upper?: number;
  percentileLower?: number;
  percentileUpper?: number;
  stdDevMultiplier?: number;
}

export interface ExceptionReport {
  aboveThreshold: Array<{ row: FlattenedNode; value: number; threshold: number }>;
  belowThreshold: Array<{ row: FlattenedNode; value: number; threshold: number }>;
  withinThreshold: number;
  totalChecked: number;
  thresholdDescription: string;
}

export function generateExceptionReport(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measureIndex: number,
  threshold: ExceptionThreshold
): ExceptionReport {
  const startTime = performance.now();
  
  const targetColKey = columns[measureIndex]?.key || columns[0]?.key;
  if (!targetColKey) {
    return { aboveThreshold: [], belowThreshold: [], withinThreshold: 0, totalChecked: 0, thresholdDescription: '' };
  }

  // Collect all values
  const values: number[] = [];
  const valueMap = new Map<string, number>();
  
  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const cellKey = `${row.key}|${targetColKey}|${measureIndex}`;
    const cell = cellMap.get(cellKey);
    const value = cell?.value;
    
    if (value !== null && value !== undefined && !isNaN(value)) {
      values.push(value);
      valueMap.set(row.key, value);
    }
  }

  if (values.length === 0) {
    return { aboveThreshold: [], belowThreshold: [], withinThreshold: 0, totalChecked: 0, thresholdDescription: '' };
  }

  // Calculate thresholds
  let lowerBound: number;
  let upperBound: number;
  let description: string;

  switch (threshold.type) {
    case 'absolute':
      lowerBound = threshold.lower ?? -Infinity;
      upperBound = threshold.upper ?? Infinity;
      description = `Outside [${lowerBound}, ${upperBound}]`;
      break;
      
    case 'percentile': {
      const sorted = [...values].sort((a, b) => a - b);
      const pLower = threshold.percentileLower ?? 0.05;
      const pUpper = threshold.percentileUpper ?? 0.95;
      lowerBound = percentile(sorted, pLower);
      upperBound = percentile(sorted, pUpper);
      description = `Outside ${(pLower * 100).toFixed(0)}-${(pUpper * 100).toFixed(0)} percentile range`;
      break;
    }
    
    case 'stdDev': {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const multiplier = threshold.stdDevMultiplier ?? 2;
      lowerBound = mean - multiplier * stdDev;
      upperBound = mean + multiplier * stdDev;
      description = `Outside ${multiplier}σ from mean`;
      break;
    }
    
    case 'custom':
    default:
      lowerBound = threshold.lower ?? -Infinity;
      upperBound = threshold.upper ?? Infinity;
      description = 'Custom thresholds';
  }

  // Find exceptions
  const above: ExceptionReport['aboveThreshold'] = [];
  const below: ExceptionReport['belowThreshold'] = [];
  let within = 0;

  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const value = valueMap.get(row.key);
    if (value === undefined) continue;
    
    if (value > upperBound) {
      above.push({ row, value, threshold: upperBound });
    } else if (value < lowerBound) {
      below.push({ row, value, threshold: lowerBound });
    } else {
      within++;
    }
  }

  // Sort by severity (distance from threshold)
  above.sort((a, b) => b.value - a.value);
  below.sort((a, b) => a.value - b.value);

  const duration = performance.now() - startTime;
  console.log(`[Exception] Found ${above.length} above, ${below.length} below threshold in ${duration.toFixed(2)}ms`);

  return {
    aboveThreshold: above,
    belowThreshold: below,
    withinThreshold: within,
    totalChecked: values.length,
    thresholdDescription: description,
  };
}

/**
 * Outlier Detection using multiple algorithms
 */
export type OutlierMethod = 'iqr' | 'zscore' | 'mad' | 'grubbs';

export interface OutlierResult {
  outliers: Array<{ row: FlattenedNode; value: number; score: number; method: OutlierMethod }>;
  inliers: FlattenedNode[];
  outlierCount: number;
  outlierRate: number; // Percentage
  method: OutlierMethod;
  threshold: number;
}

export function detectOutliers(
  rows: FlattenedNode[],
  cellMap: Map<string, CellValue>,
  columns: FlattenedNode[],
  measureIndex: number,
  method: OutlierMethod = 'iqr',
  threshold: number = 1.5
): OutlierResult {
  const startTime = performance.now();
  
  const targetColKey = columns[measureIndex]?.key || columns[0]?.key;
  if (!targetColKey) {
    return { outliers: [], inliers: [], outlierCount: 0, outlierRate: 0, method, threshold };
  }

  // Collect values
  const entries: Array<{ row: FlattenedNode; value: number }> = [];
  
  for (const row of rows) {
    if (row.isSubtotal || row.isGrandTotal) continue;
    
    const cellKey = `${row.key}|${targetColKey}|${measureIndex}`;
    const cell = cellMap.get(cellKey);
    const value = cell?.value;
    
    if (value !== null && value !== undefined && !isNaN(value)) {
      entries.push({ row, value });
    }
  }

  if (entries.length < 4) {
    return { outliers: [], inliers: rows, outlierCount: 0, outlierRate: 0, method, threshold };
  }

  const values = entries.map(e => e.value);
  const outliers: OutlierResult['outliers'] = [];

  switch (method) {
    case 'iqr': {
      const sorted = [...values].sort((a, b) => a - b);
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;

      for (const entry of entries) {
        if (entry.value < lowerBound || entry.value > upperBound) {
          const distance = entry.value < lowerBound 
            ? lowerBound - entry.value 
            : entry.value - upperBound;
          outliers.push({ ...entry, score: distance / iqr, method });
        }
      }
      break;
    }
    
    case 'zscore': {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );

      for (const entry of entries) {
        const zScore = Math.abs((entry.value - mean) / stdDev);
        if (zScore > threshold) {
          outliers.push({ ...entry, score: zScore, method });
        }
      }
      break;
    }
    
    case 'mad': {
      const median = percentile([...values].sort((a, b) => a - b), 0.5);
      const deviations = values.map(v => Math.abs(v - median));
      const mad = percentile([...deviations].sort((a, b) => a - b), 0.5);
      
      if (mad === 0) break;
      
      for (const entry of entries) {
        const modifiedZScore = 0.6745 * (entry.value - median) / mad;
        if (Math.abs(modifiedZScore) > threshold) {
          outliers.push({ ...entry, score: Math.abs(modifiedZScore), method });
        }
      }
      break;
    }
    
    case 'grubbs': {
      // Grubbs' test for outliers (single outlier detection)
      const n = values.length;
      let maxDev = 0;
      let candidate: typeof entries[0] | null = null;
      
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
      );
      
      for (const entry of entries) {
        const dev = Math.abs(entry.value - mean) / stdDev;
        if (dev > maxDev) {
          maxDev = dev;
          candidate = entry;
        }
      }
      
      // Critical value for Grubbs test (approximate for 95% confidence)
      const criticalValue = (n - 1) / Math.sqrt(n) * Math.sqrt(
        Math.pow(threshold, 2) / (n - 2 + Math.pow(threshold, 2))
      );
      
      if (candidate && maxDev > criticalValue) {
        outliers.push({ ...candidate, score: maxDev, method });
      }
      break;
    }
  }

  // Sort outliers by severity
  outliers.sort((a, b) => b.score - a.score);

  // Get inlier rows
  const outlierKeys = new Set(outliers.map(o => o.row.key));
  const inliers = rows.filter(row => !outlierKeys.has(row.key));

  const duration = performance.now() - startTime;
  console.log(`[Outlier] Found ${outliers.length} outliers (${(outliers.length / entries.length * 100).toFixed(1)}%) using ${method} in ${duration.toFixed(2)}ms`);

  return {
    outliers,
    inliers,
    outlierCount: outliers.length,
    outlierRate: outliers.length / entries.length,
    method,
    threshold,
  };
}

// Helper function
function percentile(sorted: number[], p: number): number {
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Export filter presets
export const TopNPresets = {
  top10: (): TopNFilter => ({ n: 10, direction: 'top', measureIndex: 0, scope: 'all', includeOthers: false, tieHandling: 'keep' }),
  bottom10: (): TopNFilter => ({ n: 10, direction: 'bottom', measureIndex: 0, scope: 'all', includeOthers: false, tieHandling: 'keep' }),
  top5WithOthers: (): TopNFilter => ({ n: 5, direction: 'top', measureIndex: 0, scope: 'all', includeOthers: true, othersLabel: 'Others', tieHandling: 'keep' }),
  topNByParent: (n: number): TopNFilter => ({ n, direction: 'top', measureIndex: 0, scope: 'byParent', includeOthers: false, tieHandling: 'keep' }),
};

export const ExceptionPresets = {
  outside95Percentile: (): ExceptionThreshold => ({ type: 'percentile', percentileLower: 0.025, percentileUpper: 0.975 }),
  outside2StdDev: (): ExceptionThreshold => ({ type: 'stdDev', stdDevMultiplier: 2 }),
  outside3StdDev: (): ExceptionThreshold => ({ type: 'stdDev', stdDevMultiplier: 3 }),
  customRange: (lower: number, upper: number): ExceptionThreshold => ({ type: 'absolute', lower, upper }),
};

export const OutlierPresets = {
  conservative: (): { method: OutlierMethod; threshold: number } => ({ method: 'iqr', threshold: 3 }), // 3 * IQR
  moderate: (): { method: OutlierMethod; threshold: number } => ({ method: 'iqr', threshold: 1.5 }), // Standard 1.5 * IQR
  aggressive: (): { method: OutlierMethod; threshold: number } => ({ method: 'zscore', threshold: 2 }), // Z-score > 2
};

// Export all
export const AdvancedFiltering = {
  applyTopNFilter,
  applyTopNByParent,
  generateExceptionReport,
  detectOutliers,
  TopNPresets,
  ExceptionPresets,
  OutlierPresets,
};

export default AdvancedFiltering;
