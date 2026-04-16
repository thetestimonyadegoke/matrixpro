import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

type AggType = "Sum" | "Average" | "Min" | "Max" | "Count" | "None";
const AGG_OPTIONS: AggType[] = ["Sum", "Average", "Min", "Max", "Count", "None"];

interface AggregationPanelProps {
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (obj: string, prop: string, val: unknown) => void;
}

export const AggregationPanel: React.FC<AggregationPanelProps> = ({
  measures, settings, onClose, onPersistProperty,
}) => {
  const parseOverrides = (): Record<string, AggType> => {
    try {
      const parsed = JSON.parse(settings.manualData.aggregationOverrides || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const [overrides, setOverrides] = useState<Record<string, AggType>>(parseOverrides);

  const setAgg = (measureIndex: number, agg: AggType) => {
    setOverrides(prev => ({ ...prev, [String(measureIndex)]: agg }));
  };

  const handleApply = () => {
    onPersistProperty("manualData", "aggregationOverrides", JSON.stringify(overrides));
    onClose();
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 480, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Aggregation Overrides</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Customize how each measure aggregates totals and subtotals</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ padding: "6px 20px 4px 20px", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, padding: "4px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>MEASURE</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>AGGREGATION</span>
          </div>
        </div>

        <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1 }}>
          {measures.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 13 }}>No measures available.</div>
          )}
          {measures.map((m) => (
            <div
              key={m.index}
              style={{
                display: "grid", gridTemplateColumns: "1fr 160px", gap: 10,
                alignItems: "center", padding: "8px 12px", marginBottom: 4,
                background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb",
              }}
            >
              <span style={{ fontSize: 13, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.name}
              </span>
              <select
                style={{
                  border: "1px solid #d1d5db", borderRadius: 4, padding: "5px 8px",
                  fontSize: 12, background: "#fff", cursor: "pointer",
                }}
                value={overrides[String(m.index)] || "Sum"}
                onChange={(e) => setAgg(m.index, e.target.value as AggType)}
              >
                {AGG_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
