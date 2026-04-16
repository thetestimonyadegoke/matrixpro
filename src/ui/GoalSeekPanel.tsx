import React, { useState, useMemo } from "react";
import { MeasureInfo, CellValue } from "../model/pivot";
import { FlattenedNode } from "../model/tree";

interface GoalSeekPanelProps {
  measures: MeasureInfo[];
  rows?: FlattenedNode[];
  columns?: FlattenedNode[];
  cellMap?: { get: (k: string) => CellValue | undefined };
  onClose: () => void;
  onApply: (targetMeasureIndex: number, targetValue: number, variableMeasureIndex: number) => void;
}

export const GoalSeekPanel: React.FC<GoalSeekPanelProps> = ({
  measures, rows, columns, cellMap, onClose, onApply,
}) => {
  const [targetMeasureIndex, setTargetMeasureIndex] = useState(0);
  const [targetValue, setTargetValue] = useState("");
  const [variableMeasureIndex, setVariableMeasureIndex] = useState(measures.length > 1 ? 1 : 0);
  const [result, setResult] = useState<string | null>(null);

  const currentTargetSum = useMemo(() => {
    if (!rows || !columns || !cellMap) return null;
    let sum = 0;
    let count = 0;
    const m = measures[targetMeasureIndex];
    if (!m) return null;
    rows.forEach((row) => {
      columns.forEach((col) => {
        const key = `${row.key}__${col.key}__${m.index}`;
        const cell = cellMap.get(key);
        if (cell && cell.value !== null && cell.value !== undefined) {
          sum += cell.value;
          count++;
        }
      });
      if (columns.length === 0) {
        const key = `${row.key}____${m.index}`;
        const cell = cellMap.get(key);
        if (cell && cell.value !== null && cell.value !== undefined) {
          sum += cell.value;
          count++;
        }
      }
    });
    return { sum, count };
  }, [rows, columns, cellMap, measures, targetMeasureIndex]);

  const handleSolve = () => {
    const tv = parseFloat(targetValue);
    if (isNaN(tv)) {
      setResult("Please enter a valid numeric target value.");
      return;
    }
    if (!currentTargetSum || currentTargetSum.count === 0) {
      setResult("No data available to compute required change.");
      return;
    }
    const delta = tv - currentTargetSum.sum;
    const perCell = delta / currentTargetSum.count;
    const pct = currentTargetSum.sum !== 0
      ? ((delta / currentTargetSum.sum) * 100).toFixed(2) + "%"
      : "N/A";
    setResult(
      `Current sum: ${currentTargetSum.sum.toFixed(2)}\n` +
      `Target sum: ${tv.toFixed(2)}\n` +
      `Required change: ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${pct})\n` +
      `Per-cell adjustment: ${perCell >= 0 ? "+" : ""}${perCell.toFixed(4)}`
    );
    onApply(targetMeasureIndex, tv, variableMeasureIndex);
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 420, display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };
  const fieldRow: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 4, marginBottom: 14,
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#374151",
  };
  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px",
    fontSize: 13, background: "#fff", outline: "none",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: "pointer",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Goal Seek</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Find what input achieves a target value</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={fieldRow}>
            <span style={label}>Set cell (target measure)</span>
            <select
              style={selectStyle}
              value={targetMeasureIndex}
              onChange={(e) => { setTargetMeasureIndex(parseInt(e.target.value, 10)); setResult(null); }}
            >
              {measures.map((m, i) => (
                <option key={i} value={i}>{m.name}</option>
              ))}
              {measures.length === 0 && <option value={0}>No measures</option>}
            </select>
          </div>

          <div style={fieldRow}>
            <span style={label}>To value (desired target)</span>
            <input
              type="number"
              style={inputStyle}
              value={targetValue}
              onChange={(e) => { setTargetValue(e.target.value); setResult(null); }}
              placeholder="e.g. 1000000"
            />
          </div>

          <div style={fieldRow}>
            <span style={label}>By changing (variable measure)</span>
            <select
              style={selectStyle}
              value={variableMeasureIndex}
              onChange={(e) => { setVariableMeasureIndex(parseInt(e.target.value, 10)); setResult(null); }}
            >
              {measures.map((m, i) => (
                <option key={i} value={i}>{m.name}</option>
              ))}
              {measures.length === 0 && <option value={0}>No measures</option>}
            </select>
          </div>

          {currentTargetSum !== null && (
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
              Current sum of <strong>{measures[targetMeasureIndex]?.name || "—"}</strong>: {currentTargetSum.sum.toFixed(2)} ({currentTargetSum.count} data points)
            </div>
          )}

          {result !== null && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
              padding: "10px 14px", marginBottom: 12, whiteSpace: "pre-line",
              fontSize: 12, color: "#166534", fontFamily: "monospace",
            }}>
              {result}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSolve}
            style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Solve
          </button>
        </div>
      </div>
    </div>
  );
};
