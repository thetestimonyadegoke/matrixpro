import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { Button, EmptyNote, Overlay } from "./overlayKit";

type AggType = "none" | "formula" | "sum" | "first" | "last" | "average" | "min" | "max";
const AGG_OPTIONS: Array<{ value: AggType; label: string }> = [
  { value: "none", label: "None" },
  { value: "formula", label: "Formula" },
  { value: "sum", label: "Sum" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "average", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

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

  return (
    <Overlay
      kind="dialog"
      title="Aggregation"
      subtitle="How each measure rolls up into totals and subtotals."
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </>
      }
    >
      {measures.length === 0 ? (
        <EmptyNote title="No measures available" hint="Add a measure to the visual to set how it aggregates." />
      ) : (
        <ul className="mx-list">
          {measures.map((m) => (
            <li key={m.index} className="mx-item">
              <div className="mx-item-main">
                <span className="mx-item-title" title={m.name}>{m.name}</span>
              </div>
              <select
                className="mx-select is-sm"
                style={{ width: 150 }}
                aria-label={`${m.name} aggregation`}
                value={overrides[String(m.index)] || "sum"}
                onChange={(e) => setAgg(m.index, e.target.value as AggType)}
              >
                {AGG_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  );
};
