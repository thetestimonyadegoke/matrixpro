import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export interface SortRule {
  measureIndex: number;
  direction: "asc" | "desc";
  priority: number;
}

interface SortPanelProps {
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onApply: (rules: SortRule[]) => void;
}

export const SortPanel: React.FC<SortPanelProps> = ({ measures, settings, onClose, onApply }) => {
  const initialRules: SortRule[] = (() => {
    try {
      const parsed = JSON.parse(settings.manualData.sortRules || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const [rules, setRules] = useState<SortRule[]>(initialRules);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      { measureIndex: 0, direction: "asc", priority: prev.length },
    ]);
  };

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, priority: i })));
  };

  const updateRule = (idx: number, patch: Partial<SortRule>) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const movePriority = (idx: number, dir: -1 | 1) => {
    const next = [...rules];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRules(next.map((r, i) => ({ ...r, priority: i })));
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };
  const header: React.CSSProperties = {
    padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };
  const body: React.CSSProperties = {
    padding: "16px 20px", overflowY: "auto", flex: 1,
  };
  const footer: React.CSSProperties = {
    padding: "12px 20px", borderTop: "1px solid #e5e7eb",
    display: "flex", justifyContent: "flex-end", gap: 8,
  };
  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
    background: "#f8f9fa", borderRadius: 6, marginBottom: 6,
    border: "1px solid #e5e7eb",
  };
  const selectStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 6px",
    fontSize: 12, background: "#fff", cursor: "pointer",
  };
  const btnPrimary: React.CSSProperties = {
    padding: "7px 18px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
  };
  const btnSecondary: React.CSSProperties = {
    padding: "7px 18px", background: "#f3f4f6", color: "#374151",
    border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13,
  };
  const arrowBtn: React.CSSProperties = {
    padding: "2px 6px", background: "#e5e7eb", border: "none",
    borderRadius: 3, cursor: "pointer", fontSize: 11, lineHeight: 1,
  };
  const deleteBtn: React.CSSProperties = {
    padding: "2px 7px", background: "#fee2e2", color: "#dc2626",
    border: "none", borderRadius: 3, cursor: "pointer", fontSize: 12, fontWeight: 700,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={header}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Sort Configuration</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Add and prioritize sort rules for the matrix</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
        </div>

        <div style={body}>
          {rules.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", fontSize: 13 }}>
              No sort rules. Click "Add Rule" to get started.
            </div>
          )}
          {rules.map((rule, idx) => (
            <div key={idx} style={rowStyle}>
              <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 18, textAlign: "center" }}>{idx + 1}</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>Measure:</label>
                <select
                  style={{ ...selectStyle, flex: 1 }}
                  value={rule.measureIndex}
                  onChange={(e) => updateRule(idx, { measureIndex: parseInt(e.target.value, 10) })}
                >
                  {measures.map((m, mi) => (
                    <option key={mi} value={mi}>{m.name}</option>
                  ))}
                  {measures.length === 0 && <option value={0}>No measures</option>}
                </select>
                <label style={{ fontSize: 11, color: "#6b7280" }}>Order:</label>
                <select
                  style={selectStyle}
                  value={rule.direction}
                  onChange={(e) => updateRule(idx, { direction: e.target.value as "asc" | "desc" })}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                <button style={arrowBtn} onClick={() => movePriority(idx, -1)} disabled={idx === 0} title="Move up">▲</button>
                <button style={arrowBtn} onClick={() => movePriority(idx, 1)} disabled={idx === rules.length - 1} title="Move down">▼</button>
                <button style={deleteBtn} onClick={() => removeRule(idx)} title="Remove rule">✕</button>
              </div>
            </div>
          ))}

          <button
            style={{ ...btnSecondary, marginTop: 8, width: "100%", textAlign: "center" }}
            onClick={addRule}
          >
            + Add Rule
          </button>
        </div>

        <div style={footer}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={() => onApply(rules)}>Apply</button>
        </div>
      </div>
    </div>
  );
};
