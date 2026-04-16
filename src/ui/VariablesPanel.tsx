import React, { useState } from "react";
import { VisualSettings } from "../settings/settings";

interface Variable {
  id: string;
  name: string;
  value: number;
  description: string;
}

interface VariablesPanelProps {
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (obj: string, prop: string, val: unknown) => void;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({ settings, onClose, onPersistProperty }) => {
  const parseVars = (): Variable[] => {
    try {
      const parsed = JSON.parse(settings.manualData.variables || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [vars, setVars] = useState<Variable[]>(parseVars);

  const addVariable = () => {
    setVars(prev => [
      ...prev,
      { id: `var_${Date.now()}`, name: "New Variable", value: 0, description: "" },
    ]);
  };

  const updateVar = (idx: number, patch: Partial<Variable>) => {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v));
  };

  const removeVar = (idx: number) => {
    setVars(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onPersistProperty("manualData", "variables", JSON.stringify(vars));
    onClose();
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 580, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };
  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 7px",
    fontSize: 12, background: "#fff", outline: "none",
  };
  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
    background: "#f8f9fa", borderRadius: 6, marginBottom: 6,
    border: "1px solid #e5e7eb",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Variables</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Manage named parameters for use in formulas</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ padding: "6px 20px 4px 20px", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 32px", gap: 6, padding: "4px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>NAME</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>VALUE</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>DESCRIPTION</span>
            <span />
          </div>
        </div>

        <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
          {vars.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0", fontSize: 13 }}>
              No variables yet. Click "Add Variable" to create one.
            </div>
          )}
          {vars.map((v, idx) => (
            <div key={v.id} style={rowStyle}>
              <input
                style={{ ...inputStyle, flex: 2 }}
                value={v.name}
                onChange={(e) => updateVar(idx, { name: e.target.value })}
                placeholder="Variable name"
              />
              <input
                type="number"
                style={{ ...inputStyle, flex: 1 }}
                value={v.value}
                onChange={(e) => updateVar(idx, { value: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
              <input
                style={{ ...inputStyle, flex: 2 }}
                value={v.description}
                onChange={(e) => updateVar(idx, { description: e.target.value })}
                placeholder="Description (optional)"
              />
              <button
                onClick={() => removeVar(idx)}
                style={{ padding: "2px 7px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                title="Remove variable"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            onClick={addVariable}
            style={{ width: "100%", marginTop: 8, padding: "8px", background: "#f3f4f6", color: "#374151", border: "1px dashed #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            + Add Variable
          </button>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
