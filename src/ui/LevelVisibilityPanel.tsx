import React, { useState } from "react";
import { VisualSettings } from "../settings/settings";
import { Button, Overlay, Section } from "./overlayKit";

interface LevelVisibilityPanelProps {
  rowLevels: string[];
  colLevels: string[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

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

  const levelSection = (title: string, prefix: string, levels: string[], hidden: number[], setHidden: (a: number[]) => void, emptyText: string) => (
    <Section title={title}>
      {levels.length === 0 ? (
        <p className="mx-muted" style={{ margin: 0, fontSize: 12 }}>{emptyText}</p>
      ) : (
        <div className="mx-stack is-tight">
          {levels.map((name, i) => (
            <label key={`${prefix}_${i}`} className="mx-check">
              <input
                type="checkbox"
                checked={!hidden.includes(i)}
                onChange={() => toggle(hidden, setHidden, i)}
              />
              <span className="mx-muted mx-num" style={{ minWidth: 50 }}>Level {i + 1}</span>
              <span style={{ flex: 1 }}>{name || <span className="mx-muted">(unnamed)</span>}</span>
              {hidden.includes(i) && <span className="mx-badge">Hidden</span>}
            </label>
          ))}
        </div>
      )}
    </Section>
  );

  return (
    <Overlay
      kind="dialog"
      title="Hierarchy levels"
      subtitle="Hidden levels are removed from the matrix."
      width={460}
      onClose={onClose}
      footerStart={<Button variant="ghost" size="sm" onClick={reset}>Show all</Button>}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={apply}>Apply</Button>
        </>
      }
    >
      {levelSection("Row levels", "r", rowLevels, hiddenRows, setHiddenRows, "No row hierarchy available.")}
      {levelSection("Column levels", "c", colLevels, hiddenCols, setHiddenCols, "No column hierarchy available.")}
    </Overlay>
  );
};
