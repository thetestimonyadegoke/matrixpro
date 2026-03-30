import React, { memo, useMemo, useState, useCallback } from "react";

export interface SparklineProps {
  values: (number | null)[];
  labels?: string[];
  width: number;
  height: number;
  lineColor: string;
  markerColor: string;
  showMinMaxMarkers: boolean;
  normalizePerRow: boolean;
  nullHandling: "gap" | "zero";
  globalMin?: number;
  globalMax?: number;
  onInspect?: (values: (number | null)[], labels?: string[]) => void;
}

interface SparklineTooltipData {
  x: number;
  y: number;
  value: number | null;
  label?: string;
  isMin: boolean;
  isMax: boolean;
}

export const Sparkline: React.FC<SparklineProps> = memo(({
  values,
  labels,
  width,
  height,
  lineColor,
  markerColor,
  showMinMaxMarkers,
  normalizePerRow,
  nullHandling,
  globalMin,
  globalMax,
  onInspect,
}) => {
  const [hoverData, setHoverData] = useState<SparklineTooltipData | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pointIndex = Math.round((x / width) * (values.length - 1));
    
    if (pointIndex >= 0 && pointIndex < values.length) {
      const value = values[pointIndex];
      const numericValues = values.filter((v): v is number => v !== null);
      const minVal = Math.min(...numericValues);
      const maxVal = Math.max(...numericValues);
      
      setHoverData({
        x: e.clientX,
        y: e.clientY,
        value,
        label: labels?.[pointIndex],
        isMin: value === minVal,
        isMax: value === maxVal,
      });
    }
  }, [values, labels, width]);

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
  }, []);

  const handleClick = useCallback(() => {
    if (onInspect) {
      onInspect(values, labels);
    }
  }, [onInspect, values, labels]);
  const { points, minIndex, maxIndex, min, max } = useMemo(() => {
    const validValues = values.map((v, i) => ({
      value: v === null ? (nullHandling === "zero" ? 0 : null) : v,
      index: i,
    }));

    const numericValues = validValues
      .filter((v): v is { value: number; index: number } => v.value !== null)
      .map(v => v.value);

    if (numericValues.length === 0) {
      return { points: [], minIndex: -1, maxIndex: -1, min: 0, max: 0 };
    }

    const localMin = Math.min(...numericValues);
    const localMax = Math.max(...numericValues);

    const min = normalizePerRow ? localMin : (globalMin ?? localMin);
    const max = normalizePerRow ? localMax : (globalMax ?? localMax);

    const range = max - min || 1;
    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const pointsArr: { x: number; y: number; isNull: boolean }[] = [];
    let minIdx = -1;
    let maxIdx = -1;
    let minVal = Infinity;
    let maxVal = -Infinity;

    validValues.forEach((v, i) => {
      const x = padding + (i / (values.length - 1 || 1)) * effectiveWidth;

      if (v.value === null) {
        pointsArr.push({ x, y: 0, isNull: true });
      } else {
        const y = padding + effectiveHeight - ((v.value - min) / range) * effectiveHeight;
        pointsArr.push({ x, y, isNull: false });

        if (v.value < minVal) {
          minVal = v.value;
          minIdx = i;
        }
        if (v.value > maxVal) {
          maxVal = v.value;
          maxIdx = i;
        }
      }
    });

    return { points: pointsArr, minIndex: minIdx, maxIndex: maxIdx, min, max };
  }, [values, width, height, normalizePerRow, nullHandling, globalMin, globalMax]);

  if (points.length === 0) {
    return null;
  }

  const pathSegments: string[] = [];
  let currentPath = "";

  points.forEach((point, i) => {
    if (point.isNull) {
      if (currentPath) {
        pathSegments.push(currentPath);
        currentPath = "";
      }
    } else {
      if (!currentPath) {
        currentPath = `M ${point.x} ${point.y}`;
      } else {
        currentPath += ` L ${point.x} ${point.y}`;
      }
    }
  });

  if (currentPath) {
    pathSegments.push(currentPath);
  }

  return (
    <>
      <svg
        className={`sparkline-svg ${onInspect ? "clickable" : ""}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: onInspect ? "pointer" : "default" }}
      >
        {pathSegments.map((d, i) => (
          <path
            key={i}
            d={d}
            className="sparkline-line"
            stroke={lineColor}
            fill="none"
            strokeWidth={1.5}
          />
        ))}
        {showMinMaxMarkers && minIndex >= 0 && !points[minIndex].isNull && (
          <circle
            cx={points[minIndex].x}
            cy={points[minIndex].y}
            r={2}
            fill={markerColor}
            className="sparkline-marker"
          />
        )}
        {showMinMaxMarkers && maxIndex >= 0 && !points[maxIndex].isNull && maxIndex !== minIndex && (
          <circle
            cx={points[maxIndex].x}
            cy={points[maxIndex].y}
            r={2}
            fill={lineColor}
            className="sparkline-marker"
          />
        )}
      </svg>
      {hoverData && (
        <div
          className="sparkline-tooltip"
          style={{
            position: "fixed",
            left: hoverData.x + 10,
            top: hoverData.y - 30,
          }}
        >
          {hoverData.label && <span className="sparkline-tooltip-label">{hoverData.label}: </span>}
          <span className="sparkline-tooltip-value">
            {hoverData.value !== null ? hoverData.value.toLocaleString() : "—"}
          </span>
          {hoverData.isMin && <span className="sparkline-tooltip-tag min">Min</span>}
          {hoverData.isMax && <span className="sparkline-tooltip-tag max">Max</span>}
        </div>
      )}
    </>
  );
});

Sparkline.displayName = "Sparkline";
