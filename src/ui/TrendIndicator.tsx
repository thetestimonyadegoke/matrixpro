import React, { memo, useMemo } from "react";

export type TrendDirection = "up" | "down" | "flat";

export interface TrendIndicatorProps {
  values: (number | null)[];
  periodsToAnalyze?: number;
  showIcon?: boolean;
  showMiniSparkline?: boolean;
  size?: "small" | "medium";
}

export interface TrendAnalysis {
  direction: TrendDirection;
  percentChange: number | null;
  momentum: number;
  isSignificant: boolean;
}

export function analyzeTrend(
  values: (number | null)[],
  periodsToAnalyze: number = 3
): TrendAnalysis {
  const numericValues = values.filter((v): v is number => v !== null);
  
  if (numericValues.length < 2) {
    return { direction: "flat", percentChange: null, momentum: 0, isSignificant: false };
  }

  const recentValues = numericValues.slice(-Math.min(periodsToAnalyze, numericValues.length));
  
  if (recentValues.length < 2) {
    return { direction: "flat", percentChange: null, momentum: 0, isSignificant: false };
  }

  const first = recentValues[0];
  const last = recentValues[recentValues.length - 1];
  
  const change = last - first;
  const percentChange = first !== 0 ? (change / Math.abs(first)) * 100 : null;
  
  // Calculate momentum (average rate of change)
  let totalChange = 0;
  for (let i = 1; i < recentValues.length; i++) {
    totalChange += recentValues[i] - recentValues[i - 1];
  }
  const momentum = totalChange / (recentValues.length - 1);
  
  // Determine direction with threshold
  const threshold = 0.5; // 0.5% threshold for significance
  let direction: TrendDirection = "flat";
  let isSignificant = false;
  
  if (percentChange !== null) {
    if (percentChange > threshold) {
      direction = "up";
      isSignificant = Math.abs(percentChange) > 5;
    } else if (percentChange < -threshold) {
      direction = "down";
      isSignificant = Math.abs(percentChange) > 5;
    }
  }

  return { direction, percentChange, momentum, isSignificant };
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = memo(({
  values,
  periodsToAnalyze = 3,
  showIcon = true,
  showMiniSparkline = false,
  size = "small",
}) => {
  const trend = useMemo(() => {
    return analyzeTrend(values, periodsToAnalyze);
  }, [values, periodsToAnalyze]);

  const iconClass = useMemo(() => {
    switch (trend.direction) {
      case "up": return "trend-up";
      case "down": return "trend-down";
      default: return "trend-flat";
    }
  }, [trend.direction]);

  const icon = useMemo(() => {
    switch (trend.direction) {
      case "up": return "↑";
      case "down": return "↓";
      default: return "→";
    }
  }, [trend.direction]);

  // Mini sparkline for compact display
  const miniSparklinePath = useMemo(() => {
    if (!showMiniSparkline) return null;
    
    const numericValues = values.filter((v): v is number => v !== null);
    if (numericValues.length < 2) return null;
    
    const recentValues = numericValues.slice(-5);
    const min = Math.min(...recentValues);
    const max = Math.max(...recentValues);
    const range = max - min || 1;
    
    const width = size === "small" ? 20 : 30;
    const height = size === "small" ? 8 : 12;
    
    const points = recentValues.map((v, i) => {
      const x = (i / (recentValues.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    });
    
    return {
      path: `M ${points.join(" L ")}`,
      width,
      height,
    };
  }, [values, showMiniSparkline, size]);

  if (trend.direction === "flat" && !trend.isSignificant) {
    return null;
  }

  return (
    <span className={`trend-indicator ${iconClass} ${size} ${trend.isSignificant ? "significant" : ""}`}>
      {showIcon && (
        <span className="trend-icon" aria-label={`Trend: ${trend.direction}`}>
          {icon}
        </span>
      )}
      {showMiniSparkline && miniSparklinePath && (
        <svg
          className="trend-mini-sparkline"
          width={miniSparklinePath.width}
          height={miniSparklinePath.height}
          viewBox={`0 0 ${miniSparklinePath.width} ${miniSparklinePath.height}`}
        >
          <path
            d={miniSparklinePath.path}
            fill="none"
            strokeWidth={1}
            className="trend-mini-line"
          />
        </svg>
      )}
      {trend.percentChange !== null && trend.isSignificant && (
        <span className="trend-percent">
          {trend.percentChange > 0 ? "+" : ""}{trend.percentChange.toFixed(1)}%
        </span>
      )}
    </span>
  );
});

TrendIndicator.displayName = "TrendIndicator";
