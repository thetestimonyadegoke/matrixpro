import React, { useState } from "react";
import { VisualSettings } from "../settings/settings";

interface LevelVisibilityPanelProps {
  rowLevels: string[];
  colLevels: string[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const panel: React.CSSProperties = {
  background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
  width: 460, display: "flex", flexDirection: "column",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  maxHeight: "82vh",
};
const header: React.CSSProperties = {
  padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};
const body: React.CSSProperties = { padding: "14px 20px 8px", overflowY: "auto" };
const section: React.CSSProperties = { marginBottom: 16 };
const h4: React.CSSProperties = {
  fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em",
  color: "#6b7280", margin: "0 0 8px 0", fontWeight: 700,
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", padding: "6px 0", gap: 10 };
const footer: React.CSSProperties = {
  padding: "12px 20px", borderTop: "1px solid #e5e7eb",
  display: "flex", justifyContent: "flex-end", gap: 8,
};
const btn: React.CSSProperties = {
  padding: "7px 18px", border: "1px solid #d1d5db", borderRadius: 6,
  cursor: "pointer", fontSize: 13, background: "#f3f4f6", color: "#374151",
};
const btnPrimary: React.CSSProperties = {
  ...btn, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600,
};

export const LevelVisibilityPanel: React.FC<LevelVisibilityPanelProps> = ({
  rowLevels, colLevels, settings, onClose, onPersistProperty,
}) => {
  const [hiddenRows, setHiddenRows] = useState<number[]>(() => {
    try {
      const v = JSON.parse(settings.manualData.hiddenRowLevels || "[]");
      return Array.isArray(v) ? v as number[] : [];
    } catch { return []; }
  });
  const [hiddenCols, setHiddenCols] = useState<number[]>(() => {
    try {
      const v = JSON.parse(settings.manualData.hiddenColumnLevels || "[]");
      return Array.isArray(v) ? v as number[] : [];
    } catch { return []; }
  });

  const toggle = (arr: number[], setter: (a: number[]) => void, idx: number) => {
    setter(arr.includes(idx) ? arr.filter(i => i !== idx) : [...arr, idx]);
  };

  const apply = () => {
    onPersistProperty("manualData", "hiddenRowLevels", JSON.stringify(hiddenRows));
    onPersistProperty("manualData", "hiddenColumnLevels", JSON.stringify(hiddenCols));
    onClose();
  };

  const reset = () => {
    setHiddenRows([]);
    setHiddenCols([]);
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={header}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Hierarchy Levels</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Toggle visibility of each level. Hidden levels are removed from the matrix.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={body}>
          <div style={section}>
            <h4 style={h4}>Row levels</h4>
            {rowLevels.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No row hierarchy available.</div>
            )}
            {rowLevels.map((name, i) => (
              <label key={`r_${i}`} style={row}>
                <input
                  type="checkbox"
                  checked={!hiddenRows.includes(i)}
                  onChange={() => toggle(hiddenRows, setHiddenRows, i)}
                />
                <span style={{ color: "#9ca3af", fontSize: 11, minWidth: 50 }}>Level {i + 1}</span>
                <span style={{ flex: 1 }}>{name || <em style={{ color: "#9ca3af" }}>(unnamed)</em>}</span>
                {hiddenRows.includes(i) && (
                  <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>HIDDEN</span>
                )}
              </label>
            ))}
          </div>

          <div style={section}>
            <h4 style={h4}>Column levels</h4>
            {colLevels.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No column hierarchy available.</div>
            )}
            {colLevels.map((name, i) => (
              <label key={`c_${i}`} style={row}>
                <input
                  type="checkbox"
                  checked={!hiddenCols.includes(i)}
                  onChange={() => toggle(hiddenCols, setHiddenCols, i)}
                />
                <span style={{ color: "#9ca3af", fontSize: 11, minWidth: 50 }}>Level {i + 1}</span>
                <span style={{ flex: 1 }}>{name || <em style={{ color: "#9ca3af" }}>(unnamed)</em>}</span>
                {hiddenCols.includes(i) && (
                  <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>HIDDEN</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div style={footer}>
          <button onClick={reset} style={btn}>Show all</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btn}>Cancel</button>
          <button onClick={apply} style={btnPrimary}>Apply</button>
        </div>
      </div>
    </div>
  );
};
