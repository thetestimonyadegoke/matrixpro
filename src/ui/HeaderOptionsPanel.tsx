import React, { memo, useEffect, useMemo, useState } from "react";
import { FlattenedNode } from "../model/tree";
import { HeaderSettings, TitleSettings, VisualSettings } from "../settings/settings";
import { ColorWell, Field, Overlay, Section, Segmented, Switch } from "./overlayKit";

interface HeaderOptionsPanelProps {
  settings: VisualSettings;
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  selectedRowKeys?: string[];
  selectedColumnKeys?: string[];
  visualWidth?: number;
  visualHeight?: number;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onClose: () => void;
}

const TITLE_STYLE_OPTIONS: Array<{ value: TitleSettings["stylePreset"]; label: string }> = [
  { value: "classic", label: "Studio classic" },
  { value: "editorial", label: "Editorial masthead" },
  { value: "hero", label: "SaaS hero" },
  { value: "capsule", label: "Capsule nav" },
  { value: "mono", label: "Terminal mono" },
  { value: "glow", label: "Aurora glow" },
  { value: "product", label: "Product launch" },
  { value: "executive", label: "Executive slate" },
  { value: "spotlight", label: "Spotlight deck" },
  { value: "glass", label: "Glass console" },
  { value: "pill", label: "Command pill" },
  { value: "dashboard", label: "Metrics board" },
  { value: "serif", label: "Serif luxe" },
  { value: "banner", label: "Launch banner" },
  { value: "minimal", label: "Minimal app" },
];

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((value || "").trim());
}

export const HeaderOptionsPanel: React.FC<HeaderOptionsPanelProps> = memo(({
  settings,
  rows,
  columns,
  selectedRowKeys = [],
  selectedColumnKeys = [],
  visualWidth = 1200,
  visualHeight = 700,
  onPersistProperty,
  onClose,
}) => {
  const h = settings.headers;
  const a = settings.appearance;
  const compact = visualWidth < 980 || visualHeight < 620;
  const sheetWidth = compact ? 400 : Math.max(420, Math.min(480, Math.round(visualWidth * 0.36)));

  const [titleDraft, setTitleDraft] = useState(settings.title.text);
  const [backgroundImageDraft, setBackgroundImageDraft] = useState(a.backgroundImage || "");
  const [colorDrafts, setColorDrafts] = useState<Record<string, string>>({});

  useEffect(() => setTitleDraft(settings.title.text), [settings.title.text]);
  useEffect(() => setBackgroundImageDraft(a.backgroundImage || ""), [a.backgroundImage]);
  useEffect(() => {
    setColorDrafts({
      "title.color": settings.title.color,
      "title.backgroundColor": settings.title.backgroundColor,
      "appearance.gradientStart": a.gradientStart || "#f8fbff",
      "appearance.gradientEnd": a.gradientEnd || "#e8f1ff",
      "appearance.overlayColor": a.overlayColor || "#0f172a",
      "appearance.surfaceColor": a.surfaceColor,
      "appearance.toolbarBackgroundColor": a.toolbarBackgroundColor,
      "headers.backgroundColor": h.backgroundColor,
      "headers.textColor": h.textColor,
      "headers.rowHeaderParentColor": h.rowHeaderParentColor,
      "headers.rowHeaderChildColor": h.rowHeaderChildColor,
      "headers.colHeaderLevel0Color": h.colHeaderLevel0Color,
      "headers.colHeaderLevel1Color": h.colHeaderLevel1Color,
      "headers.colHeaderLeafColor": h.colHeaderLeafColor,
      "values.borderColor": settings.values.borderColor || "#d0d0d0",
    });
  }, [
    a.gradientEnd, a.gradientStart, a.overlayColor, a.surfaceColor, a.toolbarBackgroundColor,
    h.backgroundColor, h.colHeaderLeafColor, h.colHeaderLevel0Color, h.colHeaderLevel1Color,
    h.rowHeaderChildColor, h.rowHeaderParentColor, h.textColor,
    settings.title.backgroundColor, settings.title.color, settings.values.borderColor,
  ]);

  const updateHeader = (key: keyof HeaderSettings, value: any) => onPersistProperty("headers", key, value);
  const updateTitle = (key: keyof TitleSettings, value: any) => {
    onPersistProperty("title", key === "stylePreset" ? "titleStyle" : key, value);
  };
  const updateAppearance = (key: string, value: any) => onPersistProperty("appearance", key, value);

  const labelOverrides = useMemo(
    () => parseJSON<Record<string, string>>(settings.manualData.labelOverrides, {}),
    [settings.manualData.labelOverrides]
  );

  const selectedRow = useMemo(() => {
    const firstKey = selectedRowKeys[0];
    return firstKey ? rows.find((row) => row.key === firstKey) || null : null;
  }, [rows, selectedRowKeys]);

  const selectedColumnTarget = useMemo(() => {
    const firstKey = selectedColumnKeys[0];
    if (!firstKey) return null as null | { overrideKey: string; label: string; scope: string };
    if (firstKey.startsWith("m:") || firstKey.startsWith("m_")) {
      const id = firstKey.startsWith("m:") ? `m_${Number(firstKey.slice(2))}` : firstKey;
      return { overrideKey: id, label: labelOverrides[id] || "Measure", scope: "Measure label" };
    }
    const columnKey = firstKey.includes("::m") ? firstKey.split("::m")[0] : firstKey;
    const targetColumn = columns.find((col) => col.key === columnKey);
    return targetColumn
      ? {
          overrideKey: columnKey,
          label: labelOverrides[columnKey] || targetColumn.label || "Column header",
          scope: targetColumn.isGrandTotal ? "Grand total label" : "Column header",
        }
      : null;
  }, [columns, labelOverrides, selectedColumnKeys]);

  const updateLabelOverride = (overrideKey: string, value: string) => {
    const next = { ...labelOverrides, [overrideKey]: value };
    onPersistProperty("manualData", "labelOverrides", JSON.stringify(next));
  };

  const rangeRow = (label: string, value: number, min: number, max: number, onChange: (value: number) => void) => (
    <Field inline label={label}>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 0, accentColor: "var(--mx-accent)" }}
      />
      <span className="mx-num mx-muted" style={{ width: 28, textAlign: "right", fontSize: 12 }}>{value}</span>
    </Field>
  );

  const colorRow = (label: string, objectName: string, propertyName: string, value: string, onCommit: (value: string) => void) => {
    const key = `${objectName}.${propertyName}`;
    const draft = colorDrafts[key] ?? value;
    return (
      <Field inline label={label}>
        <ColorWell
          label={label}
          value={isHexColor(draft) ? draft : value}
          onChange={(next) => {
            setColorDrafts((current) => ({ ...current, [key]: next }));
            onCommit(next);
          }}
        />
        <input
          type="text"
          className="mx-input is-sm is-num"
          aria-label={`${label} hex`}
          value={draft}
          onChange={(e) => setColorDrafts((current) => ({ ...current, [key]: e.target.value }))}
          onBlur={() => {
            const next = (colorDrafts[key] ?? "").trim();
            if (isHexColor(next)) onCommit(next);
            else setColorDrafts((current) => ({ ...current, [key]: value }));
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Field>
    );
  };

  const backgroundEffect = a.backgroundEffect || "none";

  return (
    <Overlay kind="sheet" title="Visual design" width={sheetWidth} onClose={onClose}>
      <Section title="Title">
        <Switch label="Show title" checked={settings.title.show} onChange={(v) => updateTitle("show", v)} />
        <Field label="Text">
          <input
            type="text"
            className="mx-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => updateTitle("text", titleDraft)}
          />
        </Field>
        <Field inline label="Style">
          <select className="mx-select" value={settings.title.stylePreset} onChange={(e) => updateTitle("stylePreset", e.target.value)}>
            {TITLE_STYLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field inline label="Alignment">
          <Segmented
            size="sm"
            ariaLabel="Title alignment"
            value={settings.title.alignment}
            onChange={(v) => updateTitle("alignment", v)}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
        {rangeRow("Font size", settings.title.fontSize, 10, 32, (value) => updateTitle("fontSize", value))}
        {rangeRow("Height", settings.title.height, 28, 88, (value) => updateTitle("height", value))}
        {colorRow("Text color", "title", "color", settings.title.color, (value) => updateTitle("color", value))}
        {colorRow("Background", "title", "backgroundColor", settings.title.backgroundColor, (value) => updateTitle("backgroundColor", value))}
      </Section>

      <hr className="mx-divider" />

      <Section title="Header labels" description="Rename the selected row or column header.">
        <Field label="Row header">
          <input
            type="text"
            className="mx-input"
            value={selectedRow ? (labelOverrides[selectedRow.key] || selectedRow.label) : ""}
            onChange={(e) => selectedRow && updateLabelOverride(selectedRow.key, e.target.value)}
            placeholder="Select a row header first"
            disabled={!selectedRow}
          />
        </Field>
        <Field label="Column header" hint={selectedColumnTarget?.scope || "No column header selected"}>
          <input
            type="text"
            className="mx-input"
            value={selectedColumnTarget?.label || ""}
            onChange={(e) => selectedColumnTarget && updateLabelOverride(selectedColumnTarget.overrideKey, e.target.value)}
            placeholder="Select a column or measure header first"
            disabled={!selectedColumnTarget}
          />
        </Field>
      </Section>

      <hr className="mx-divider" />

      <Section title="Canvas">
        <Field inline label="Background">
          <select className="mx-select" value={backgroundEffect} onChange={(e) => updateAppearance("backgroundEffect", e.target.value)}>
            <option value="none">None</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image</option>
            <option value="hybrid">Gradient and image</option>
          </select>
        </Field>
        <Field inline label="Layout">
          <select className="mx-select" value={a.layoutStyle || "standard"} onChange={(e) => updateAppearance("layoutStyle", e.target.value)}>
            <option value="standard">Standard</option>
            <option value="floating">Floating canvas</option>
            <option value="framed">Framed studio</option>
            <option value="spotlight">Spotlight</option>
          </select>
        </Field>
        <Field label="Background image URL">
          <input
            type="text"
            className="mx-input"
            value={backgroundImageDraft}
            onChange={(e) => setBackgroundImageDraft(e.target.value)}
            onBlur={() => updateAppearance("backgroundImage", backgroundImageDraft)}
            placeholder="https://… or data URL"
          />
        </Field>
        {colorRow("Canvas surface", "appearance", "surfaceColor", a.surfaceColor, (value) => updateAppearance("surfaceColor", value))}
        {colorRow("Header surface", "appearance", "toolbarBackgroundColor", a.toolbarBackgroundColor, (value) => updateAppearance("toolbarBackgroundColor", value))}
        {colorRow("Gradient start", "appearance", "gradientStart", a.gradientStart || "#f8fbff", (value) => updateAppearance("gradientStart", value))}
        {colorRow("Gradient end", "appearance", "gradientEnd", a.gradientEnd || "#e8f1ff", (value) => updateAppearance("gradientEnd", value))}
        {rangeRow("Gradient angle", a.gradientAngle || 135, 0, 360, (value) => updateAppearance("gradientAngle", value))}
        {colorRow("Overlay", "appearance", "overlayColor", a.overlayColor || "#0f172a", (value) => updateAppearance("overlayColor", value))}
        {rangeRow("Overlay opacity", a.overlayOpacity || 0, 0, 100, (value) => updateAppearance("overlayOpacity", value))}
        {rangeRow("Surface opacity", a.surfaceOpacity || 92, 35, 100, (value) => updateAppearance("surfaceOpacity", value))}
        {rangeRow("Backdrop blur", a.backgroundBlur || 0, 0, 28, (value) => updateAppearance("backgroundBlur", value))}
        <Switch label="Glass surface" checked={!!a.glassmorphism} onChange={(v) => updateAppearance("glassmorphism", v)} />
      </Section>

      <hr className="mx-divider" />

      <Section title="Headers and grid">
        {rangeRow("Header font size", h.fontSize, 8, 24, (value) => updateHeader("fontSize", value))}
        <Switch label="Bold headers" checked={h.bold} onChange={(v) => updateHeader("bold", v)} />
        {colorRow("Header background", "headers", "backgroundColor", h.backgroundColor, (value) => updateHeader("backgroundColor", value))}
        {colorRow("Header text", "headers", "textColor", h.textColor, (value) => updateHeader("textColor", value))}
        {colorRow("Parent rows", "headers", "rowHeaderParentColor", h.rowHeaderParentColor, (value) => updateHeader("rowHeaderParentColor", value))}
        {colorRow("Child rows", "headers", "rowHeaderChildColor", h.rowHeaderChildColor, (value) => updateHeader("rowHeaderChildColor", value))}
        {colorRow("Column level 1", "headers", "colHeaderLevel0Color", h.colHeaderLevel0Color, (value) => updateHeader("colHeaderLevel0Color", value))}
        {colorRow("Column level 2", "headers", "colHeaderLevel1Color", h.colHeaderLevel1Color, (value) => updateHeader("colHeaderLevel1Color", value))}
        {colorRow("Leaf columns", "headers", "colHeaderLeafColor", h.colHeaderLeafColor, (value) => updateHeader("colHeaderLeafColor", value))}
        {colorRow("Grid border", "values", "borderColor", settings.values.borderColor || "#d0d0d0", (value) => onPersistProperty("values", "borderColor", value))}
        <Field inline label="Borders">
          <select className="mx-select" value={settings.values.borderStyle} onChange={(e) => onPersistProperty("values", "borderStyle", e.target.value)}>
            <option value="none">None</option>
            <option value="all">Full grid</option>
            <option value="horizontal">Horizontal only</option>
            <option value="vertical">Vertical only</option>
            <option value="outline">Outline only</option>
          </select>
        </Field>
      </Section>
    </Overlay>
  );
});

HeaderOptionsPanel.displayName = "HeaderOptionsPanel";
