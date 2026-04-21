import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

interface TopNPanelProps {
  settings: VisualSettings;
  measures: MeasureInfo[];
  onClose: () => void;
  onApply: (n: number, measureIndex: number, direction: "top" | "bottom") => void;
}

export const TopNPanel: React.FC<TopNPanelProps> = ({ settings, measures, onClose, onApply }) => {
  const [n, setN] = useState<string>(String(settings.general.topN || 10));
  const [measureIndex, setMeasureIndex] = useState<number>(0);
  const [direction, setDirection] = useState<"top" | "bottom">("top");

  const handleApply = () => {
    const parsed = parseInt(n, 10);
    const count = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onApply(count, measureIndex, direction);
    onClose();
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
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#374151" };
  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px",
    fontSize: 13, background: "#fff", outline: "none",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Top N Analysis</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Show only the top or bottom N rows</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={fieldRow}>
            <span style={label}>Direction</span>
            <select
              style={selectStyle}
              value={direction}
              onChange={(e) => setDirection(e.target.value as "top" | "bottom")}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>

          <div style={fieldRow}>
            <span style={label}>Number of rows (0 = show all)</span>
            <input
              type="number"
              style={inputStyle}
              value={n}
              onChange={(e) => setN(e.target.value)}
              placeholder="e.g. 10"
              min={0}
            />
          </div>

          <div style={fieldRow}>
            <span style={label}>Rank by measure</span>
            <select
              style={selectStyle}
              value={measureIndex}
              onChange={(e) => setMeasureIndex(parseInt(e.target.value, 10))}
            >
              {measures.map((m, i) => (
                <option key={i} value={i}>{m.name}</option>
              ))}
              {measures.length === 0 && <option value={0}>No measures available</option>}
            </select>
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={handleApply}
            style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >Apply</button>
        </div>
      </div>
    </div>
  );
};
