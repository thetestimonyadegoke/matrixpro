import React, { useMemo, useState } from "react";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";

interface SmartAnalysisPanelProps {
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  cellMap: { get: (k: string) => CellValue | undefined };
  measures: MeasureInfo[];
  onClose: () => void;
}

interface MeasureStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  median: number;
}

function computeStats(values: number[]): MeasureStats {
  if (values.length === 0) {
    return { sum: 0, avg: 0, min: 0, max: 0, count: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return {
    sum,
    avg: sum / values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length,
    median,
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

export const SmartAnalysisPanel: React.FC<SmartAnalysisPanelProps> = ({
  rows, columns, cellMap, measures, onClose,
}) => {
  const [focusMeasureIndex, setFocusMeasureIndex] = useState<number | null>(null);

  const statsByMeasure: MeasureStats[] = useMemo(() => {
    return measures.map((m) => {
      const vals: number[] = [];
      rows.forEach((row) => {
        columns.forEach((col) => {
          const key = `${row.key}__${col.key}__${m.index}`;
          const cell = cellMap.get(key);
          if (cell && cell.value !== null && cell.value !== undefined) {
            vals.push(cell.value);
          }
        });
        // Also check measure-only key pattern (no column dimension)
        if (columns.length === 0) {
          const key = `${row.key}____${m.index}`;
          const cell = cellMap.get(key);
          if (cell && cell.value !== null && cell.value !== undefined) {
            vals.push(cell.value);
          }
        }
      });
      return computeStats(vals);
    });
  }, [rows, columns, cellMap, measures]);

  const displayedMeasures = focusMeasureIndex !== null
    ? measures.filter((_, i) => i === focusMeasureIndex)
    : measures;
  const displayedStats = focusMeasureIndex !== null
    ? statsByMeasure.filter((_, i) => i === focusMeasureIndex)
    : statsByMeasure;

  const statNames = ["Sum", "Average", "Min", "Max", "Count", "Median"] as const;
  const statKeys: (keyof MeasureStats)[] = ["sum", "avg", "min", "max", "count", "median"];

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: Math.min(720, 180 + displayedMeasures.length * 120),
    maxWidth: "90vw", maxHeight: "80vh",
    display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Smart Analysis</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Computed from {rows.length} rows × {columns.length || 1} columns
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        {/* Measure chip selector */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            style={{
              padding: "3px 10px", borderRadius: 12, border: "1px solid #d1d5db",
              background: focusMeasureIndex === null ? "#2563eb" : "#f3f4f6",
              color: focusMeasureIndex === null ? "#fff" : "#374151",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
            }}
            onClick={() => setFocusMeasureIndex(null)}
          >
            All
          </button>
          {measures.map((m, i) => (
            <button
              key={i}
              style={{
                padding: "3px 10px", borderRadius: 12, border: "1px solid #d1d5db",
                background: focusMeasureIndex === i ? "#2563eb" : "#f3f4f6",
                color: focusMeasureIndex === i ? "#fff" : "#374151",
                cursor: "pointer", fontSize: 11,
              }}
              onClick={() => setFocusMeasureIndex(focusMeasureIndex === i ? null : i)}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div style={{ padding: "16px 20px", overflowX: "auto", flex: 1 }}>
          {measures.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>No measures available.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 10px", background: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: "#374151", fontWeight: 700 }}>
                    Statistic
                  </th>
                  {displayedMeasures.map((m, i) => (
                    <th key={i} style={{ textAlign: "right", padding: "6px 10px", background: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: "#1d4ed8", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statNames.map((statName, si) => (
                  <tr key={si} style={{ background: si % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>
                      {statName}
                    </td>
                    {displayedStats.map((stats, mi) => (
                      <td key={mi} style={{ padding: "6px 10px", textAlign: "right", color: "#111827", borderBottom: "1px solid #f3f4f6", fontVariantNumeric: "tabular-nums" }}>
                        {statKeys[si] === "count"
                          ? stats[statKeys[si]].toString()
                          : fmt(stats[statKeys[si]] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "10px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
