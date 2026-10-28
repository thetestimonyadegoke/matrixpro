import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { Button, Field, Overlay, Segmented } from "./overlayKit";

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

  return (
    <Overlay
      title="Top N"
      subtitle="Show only the top or bottom rows by a measure."
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </>
      }
    >
      <div className="mx-stack">
        <Field label="Show">
          <Segmented
            block
            ariaLabel="Direction"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </Field>
        <Field label="Number of rows" hint="0 shows all rows." htmlFor="mx-topn-count">
          <input
            id="mx-topn-count"
            type="number"
            className="mx-input is-num"
            value={n}
            onChange={(e) => setN(e.target.value)}
            placeholder="10"
            min={0}
          />
        </Field>
        <Field label="Rank by" htmlFor="mx-topn-measure">
          <select
            id="mx-topn-measure"
            className="mx-select"
            value={measureIndex}
            onChange={(e) => setMeasureIndex(parseInt(e.target.value, 10))}
          >
            {measures.map((m, i) => (
              <option key={i} value={i}>{m.name}</option>
            ))}
            {measures.length === 0 && <option value={0}>No measures available</option>}
          </select>
        </Field>
      </div>
    </Overlay>
  );
};
