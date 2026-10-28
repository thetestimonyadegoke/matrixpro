import React, { useState, useMemo } from 'react';
import { VisualSettings } from '../settings/settings';
import { ColorWell, Field, Overlay, Section, Switch, Tabs } from './overlayKit';

export interface TotalsControlPanelProps {
  settings: VisualSettings;
  rowLevels: string[];
  columnLevels: string[];
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

type TotalsTab = "rows" | "columns" | "styling";

export const TotalsControlPanel: React.FC<TotalsControlPanelProps> = ({
  settings,
  rowLevels,
  columnLevels,
  onClose,
  onPersistProperty
}) => {
  const [activeTab, setActiveTab] = useState<TotalsTab>("rows");

  const hiddenRowLevels = useMemo(() => {
    try {
      return JSON.parse(settings.totals.rowSubtotalLevels || "[]") as string[];
    } catch {
      return [];
    }
  }, [settings.totals.rowSubtotalLevels]);

  const hiddenColLevels = useMemo(() => {
    try {
      return JSON.parse(settings.totals.colSubtotalLevels || "[]") as string[];
    } catch {
      return [];
    }
  }, [settings.totals.colSubtotalLevels]);

  const toggleRowLevel = (levelIndex: number) => {
    const levelStr = String(levelIndex);
    const newHidden = hiddenRowLevels.includes(levelStr)
      ? hiddenRowLevels.filter(l => l !== levelStr)
      : [...hiddenRowLevels, levelStr];
    onPersistProperty("totals", "rowSubtotalLevels", JSON.stringify(newHidden));
  };

  const toggleColLevel = (levelIndex: number) => {
    const levelStr = String(levelIndex);
    const newHidden = hiddenColLevels.includes(levelStr)
      ? hiddenColLevels.filter(l => l !== levelStr)
      : [...hiddenColLevels, levelStr];
    onPersistProperty("totals", "colSubtotalLevels", JSON.stringify(newHidden));
  };

  const levelList = (prefix: string, levels: string[], hidden: string[], onToggle: (idx: number) => void) => (
    <Section title="Show per level">
      <div className="mx-stack is-tight">
        {levels.map((levelName, idx) => (
          <label key={`${prefix}-${idx}`} className="mx-check">
            <input
              type="checkbox"
              checked={!hidden.includes(String(idx))}
              onChange={() => onToggle(idx)}
            />
            <span className="mx-muted mx-num">Level {idx + 1}</span>
            <span>{levelName}</span>
          </label>
        ))}
      </div>
    </Section>
  );

  const colorField = (label: string, objectName: string, propertyName: string, value: string) => (
    <Field inline label={label}>
      <ColorWell label={label} value={value} onChange={(v) => onPersistProperty(objectName, propertyName, v)} />
    </Field>
  );

  return (
    <Overlay
      kind="sheet"
      title="Totals"
      onClose={onClose}
      toolbar={
        <Tabs<TotalsTab>
          ariaLabel="Totals view"
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: "rows", label: "Row subtotals" },
            { value: "columns", label: "Column subtotals" },
            { value: "styling", label: "Styling" },
          ]}
        />
      }
    >
      {activeTab === "rows" ? (
        <>
          <Switch
            label="Show row subtotals"
            checked={settings.totals.showRowSubtotals}
            onChange={() => onPersistProperty("totals", "showRowSubtotals", !settings.totals.showRowSubtotals)}
          />
          {settings.totals.showRowSubtotals && levelList("row", rowLevels, hiddenRowLevels, toggleRowLevel)}
        </>
      ) : activeTab === "columns" ? (
        <>
          <Switch
            label="Show column subtotals"
            checked={settings.totals.showColumnSubtotals}
            onChange={() => onPersistProperty("totals", "showColumnSubtotals", !settings.totals.showColumnSubtotals)}
          />
          {settings.totals.showColumnSubtotals && levelList("col", columnLevels, hiddenColLevels, toggleColLevel)}
        </>
      ) : (
        <>
          <Section title="Grand totals">
            <Switch label="Bold" checked={settings.totals.grandTotalBold} onChange={(v) => onPersistProperty("totals", "grandTotalBold", v)} />
            {colorField("Text", "totals", "grandTotalTextColor", settings.totals.grandTotalTextColor)}
            {colorField("Background", "totals", "grandTotalBackgroundColor", settings.totals.grandTotalBackgroundColor)}
          </Section>
          <hr className="mx-divider" />
          <Section title="Subtotals">
            <Switch label="Bold" checked={settings.totals.subtotalBold} onChange={(v) => onPersistProperty("totals", "subtotalBold", v)} />
            {colorField("Text", "totals", "subtotalTextColor", settings.totals.subtotalTextColor)}
            {colorField("Background", "totals", "subtotalBackgroundColor", settings.totals.subtotalBackgroundColor)}
          </Section>
          <hr className="mx-divider" />
          <Section title="Row headers">
            <Switch label="Bold parent rows" checked={settings.headers.rowHeaderParentBold} onChange={(v) => onPersistProperty("headers", "rowHeaderParentBold", v)} />
            {colorField("Parent text", "headers", "rowHeaderParentColor", settings.headers.rowHeaderParentColor)}
            {colorField("Child text", "headers", "rowHeaderChildColor", settings.headers.rowHeaderChildColor)}
          </Section>
          <hr className="mx-divider" />
          <Section title="Column headers">
            {colorField("Level 1 text", "headers", "colHeaderLevel0Color", settings.headers.colHeaderLevel0Color)}
            {colorField("Level 2 text", "headers", "colHeaderLevel1Color", settings.headers.colHeaderLevel1Color)}
            {colorField("Measure text", "headers", "colHeaderLeafColor", settings.headers.colHeaderLeafColor)}
          </Section>
        </>
      )}
    </Overlay>
  );
};
