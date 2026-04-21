import React, { useState, useMemo } from "react";
import { MeasureInfo } from "../model/pivot";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";
import { secureRandomId } from "../model/keys";

export interface FilterRule {
  id: string;
  measureIndex: number;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "between";
  value: number;
  value2?: number;
}

interface FilterPanelProps {
  settings: VisualSettings;
  measures: MeasureInfo[];
  rows: FlattenedNode[];
  onClose: () => void;
  onApply: (rules: FilterRule[]) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ settings, measures, onClose, onApply }) => {
  const initial = useMemo(() => {
    try {
      const parsed = JSON.parse(settings.manualData.filterRules || "[]");
      return Array.isArray(parsed) ? parsed as FilterRule[] : [];
    } catch { return []; }
  }, [settings.manualData.filterRules]);

  const [rules, setRules] = useState<FilterRule[]>(initial);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: `r_${Date.now()}_${secureRandomId(5)}`,
        measureIndex: 0,
        operator: "gt",
        value: 0,
      },
    ]);
  };

  const removeRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };
  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 110px 1fr 28px",
    gap: 8, padding: "8px 10px", marginBottom: 6,
    background: "#f8f9fa", borderRadius: 6, border: "1px solid #e5e7eb",
    alignItems: "center",
  };
  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: 4, padding: "5px 7px",
    fontSize: 12, background: "#fff", outline: "none",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Value Filters</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Hide rows where measure values don't meet the criteria</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {rules.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", fontSize: 13 }}>
              No filter rules. Click "Add Filter" to get started.
            </div>
          )}
          {rules.map(rule => (
            <div key={rule.id} style={rowStyle}>
              <select
                style={selectStyle}
                value={rule.measureIndex}
                onChange={(e) => updateRule(rule.id, { measureIndex: parseInt(e.target.value, 10) })}
              >
                {measures.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
                {measures.length === 0 && <option value={0}>No measures</option>}
              </select>
              <select
                style={selectStyle}
                value={rule.operator}
                onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterRule["operator"] })}
              >
                <option value="gt">{">"}</option>
                <option value="gte">{"≥"}</option>
                <option value="lt">{"<"}</option>
                <option value="lte">{"≤"}</option>
                <option value="eq">{"="}</option>
                <option value="neq">{"≠"}</option>
                <option value="between">between</option>
              </select>
              {rule.operator === "between" ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="number"
                    style={{ ...inputStyle, flex: 1 }}
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                    placeholder="min"
                  />
                  <input
                    type="number"
                    style={{ ...inputStyle, flex: 1 }}
                    value={rule.value2 ?? 0}
                    onChange={(e) => updateRule(rule.id, { value2: parseFloat(e.target.value) || 0 })}
                    placeholder="max"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  style={inputStyle}
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                />
              )}
              <button
                onClick={() => removeRule(rule.id)}
                style={{ padding: "2px 7px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                title="Remove rule"
              >✕</button>
            </div>
          ))}

          <button
            onClick={addRule}
            style={{ padding: "8px 14px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 12, width: "100%", marginTop: 8 }}
          >+ Add Filter</button>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button
            onClick={() => { setRules([]); onApply([]); onClose(); }}
            style={{ padding: "7px 14px", background: "transparent", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
          >Clear All</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
            >Cancel</button>
            <button
              onClick={() => { onApply(rules); onClose(); }}
              style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
};
