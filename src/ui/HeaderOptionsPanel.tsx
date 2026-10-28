import React, { memo, useEffect, useMemo, useState } from "react";
import { FlattenedNode } from "../model/tree";
import { HeaderSettings, TitleSettings, VisualSettings } from "../settings/settings";

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
  { value: "classic", label: "Studio Classic" },
  { value: "editorial", label: "Editorial Masthead" },
  { value: "hero", label: "SaaS Hero" },
  { value: "capsule", label: "Capsule Nav" },
  { value: "mono", label: "Terminal Mono" },
  { value: "glow", label: "Aurora Glow" },
  { value: "product", label: "Product Launch" },
  { value: "executive", label: "Executive Slate" },
  { value: "spotlight", label: "Spotlight Deck" },
  { value: "glass", label: "Glass Console" },
  { value: "pill", label: "Command Pill" },
  { value: "dashboard", label: "Metrics Board" },
  { value: "serif", label: "Serif Luxe" },
  { value: "banner", label: "Launch Banner" },
  { value: "minimal", label: "Minimal App" },
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
  const drawerWidth = Math.max(440, Math.min(760, Math.round(visualWidth * 0.46)));
  const titleHeight = compact ? 20 : 22;

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

  const panelSection: React.CSSProperties = {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: compact ? 16 : 18,
    padding: compact ? 14 : 18,
    display: "grid",
    gap: compact ? 12 : 14,
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(14px)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
    display: "block",
  };

  const textInputStyle: React.CSSProperties = {
    width: "100%",
    padding: compact ? "9px 11px" : "11px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148, 163, 184, 0.28)",
    background: "rgba(255,255,255,0.88)",
    color: "#0f172a",
    fontSize: compact ? 12 : 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const rangeRow = (label: string, value: number, min: number, max: number, onChange: (value: number) => void) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{value}</span>
      </div>
    </div>
  );

  const colorRow = (label: string, objectName: string, propertyName: string, value: string, onCommit: (value: string) => void) => {
    const key = `${objectName}.${propertyName}`;
    const draft = colorDrafts[key] ?? value;
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 10, alignItems: "center" }}>
          <input
            type="color"
            value={isHexColor(draft) ? draft : "#000000"}
            onChange={(e) => {
              const next = e.target.value;
              setColorDrafts((current) => ({ ...current, [key]: next }));
              onCommit(next);
            }}
            style={{ width: 42, height: 42, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
          />
          <input
            type="text"
            value={draft}
            onChange={(e) => setColorDrafts((current) => ({ ...current, [key]: e.target.value }))}
            onBlur={() => {
              const next = (colorDrafts[key] ?? "").trim();
              if (isHexColor(next)) onCommit(next);
              else setColorDrafts((current) => ({ ...current, [key]: value }));
            }}
            style={textInputStyle}
          />
        </div>
      </div>
    );
  };

  const backgroundEffect = a.backgroundEffect || "none";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Design Studio"
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, rgba(15,23,42,0.18), rgba(15,23,42,0.34))",
        zIndex: 5000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: `min(${drawerWidth}px, 100%)`,
          height: "100%",
          background: "linear-gradient(180deg, #eef4ff 0%, #f8fafc 48%, #f7fbff 100%)",
          borderLeft: "1px solid rgba(148,163,184,0.22)",
          boxShadow: "-24px 0 60px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={{ padding: compact ? "16px 18px" : "18px 22px", borderBottom: "1px solid rgba(148,163,184,0.18)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>Design Studio</div>
            <h2 style={{ margin: "4px 0 0", fontSize: compact ? 20 : 22, lineHeight: 1.08, color: "#0f172a" }}>Visual, Headers & Canvas</h2>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.7)", borderRadius: 12, width: 36, height: 36, fontSize: 20, color: "#475569", cursor: "pointer" }}>×</button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: compact ? 14 : 18, display: "grid", gap: compact ? 14 : 16 }}>
          <section style={panelSection}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: titleHeight, fontWeight: 700, color: "#0f172a" }}>Visual Title</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Position the title above the ribbon and give it a stronger app-like treatment.</div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a", fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={settings.title.show} onChange={(e) => updateTitle("show", e.target.checked)} />
              Show visual title
            </label>
            <div>
              <label style={labelStyle}>Title Text</label>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => updateTitle("text", titleDraft)}
                style={textInputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Title Style</label>
                <select value={settings.title.stylePreset} onChange={(e) => updateTitle("stylePreset", e.target.value)} style={textInputStyle}>
                  {TITLE_STYLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Alignment</label>
                <select value={settings.title.alignment} onChange={(e) => updateTitle("alignment", e.target.value)} style={textInputStyle}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {rangeRow("Title Size", settings.title.fontSize, 10, 32, (value) => updateTitle("fontSize", value))}
              {rangeRow("Title Height", settings.title.height, 28, 88, (value) => updateTitle("height", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Title Color", "title", "color", settings.title.color, (value) => updateTitle("color", value))}
              {colorRow("Title Background", "title", "backgroundColor", settings.title.backgroundColor, (value) => updateTitle("backgroundColor", value))}
            </div>
          </section>

          <section style={panelSection}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: titleHeight, fontWeight: 700, color: "#0f172a" }}>Header Labels</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Rename selected labels directly from the visual.</div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labelStyle}>Selected Row Header</label>
                <input
                  type="text"
                  value={selectedRow ? (labelOverrides[selectedRow.key] || selectedRow.label) : ""}
                  onChange={(e) => selectedRow && updateLabelOverride(selectedRow.key, e.target.value)}
                  placeholder="Select a row header first"
                  disabled={!selectedRow}
                  style={{ ...textInputStyle, opacity: selectedRow ? 1 : 0.6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Selected Column Header</label>
                <input
                  type="text"
                  value={selectedColumnTarget?.label || ""}
                  onChange={(e) => selectedColumnTarget && updateLabelOverride(selectedColumnTarget.overrideKey, e.target.value)}
                  placeholder="Select a column or measure header first"
                  disabled={!selectedColumnTarget}
                  style={{ ...textInputStyle, opacity: selectedColumnTarget ? 1 : 0.6 }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{selectedColumnTarget?.scope || "No column header selected"}</div>
              </div>
            </div>
          </section>

          <section style={panelSection}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: titleHeight, fontWeight: 700, color: "#0f172a" }}>Canvas & Effects</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Gradient, surface, blur and overlay settings for the visual shell.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Background Effect</label>
                <select value={backgroundEffect} onChange={(e) => updateAppearance("backgroundEffect", e.target.value)} style={textInputStyle}>
                  <option value="none">None</option>
                  <option value="gradient">Gradient</option>
                  <option value="image">Image</option>
                  <option value="hybrid">Gradient + Image</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Layout Style</label>
                <select value={a.layoutStyle || "standard"} onChange={(e) => updateAppearance("layoutStyle", e.target.value)} style={textInputStyle}>
                  <option value="standard">Standard</option>
                  <option value="floating">Floating Canvas</option>
                  <option value="framed">Framed Studio</option>
                  <option value="spotlight">Spotlight</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Background Image URL</label>
              <input
                type="text"
                value={backgroundImageDraft}
                onChange={(e) => setBackgroundImageDraft(e.target.value)}
                onBlur={() => updateAppearance("backgroundImage", backgroundImageDraft)}
                placeholder="https://... or data URL"
                style={textInputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Canvas Surface", "appearance", "surfaceColor", a.surfaceColor, (value) => updateAppearance("surfaceColor", value))}
              {colorRow("Header Surface", "appearance", "toolbarBackgroundColor", a.toolbarBackgroundColor, (value) => updateAppearance("toolbarBackgroundColor", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Gradient Start", "appearance", "gradientStart", a.gradientStart || "#f8fbff", (value) => updateAppearance("gradientStart", value))}
              {colorRow("Gradient End", "appearance", "gradientEnd", a.gradientEnd || "#e8f1ff", (value) => updateAppearance("gradientEnd", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Overlay Color", "appearance", "overlayColor", a.overlayColor || "#0f172a", (value) => updateAppearance("overlayColor", value))}
              {rangeRow("Overlay Opacity", a.overlayOpacity || 0, 0, 100, (value) => updateAppearance("overlayOpacity", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {rangeRow("Gradient Angle", a.gradientAngle || 135, 0, 360, (value) => updateAppearance("gradientAngle", value))}
              {rangeRow("Surface Opacity", a.surfaceOpacity || 92, 35, 100, (value) => updateAppearance("surfaceOpacity", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {rangeRow("Backdrop Blur", a.backgroundBlur || 0, 0, 28, (value) => updateAppearance("backgroundBlur", value))}
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a", fontSize: 13, fontWeight: 600, paddingTop: 20 }}>
                <input type="checkbox" checked={!!a.glassmorphism} onChange={(e) => updateAppearance("glassmorphism", e.target.checked)} />
                Enable glass surface
              </label>
            </div>
          </section>

          <section style={panelSection}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: titleHeight, fontWeight: 700, color: "#0f172a" }}>Headers & Grid</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Structural colors for row headers, column headers and grid borders.</div>
            </div>
            {rangeRow("Header Font Size", h.fontSize, 8, 24, (value) => updateHeader("fontSize", value))}
            <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a", fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={h.bold} onChange={(e) => updateHeader("bold", e.target.checked)} />
              Bold all headers
            </label>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Column Header Background", "headers", "backgroundColor", h.backgroundColor, (value) => updateHeader("backgroundColor", value))}
              {colorRow("Header Text", "headers", "textColor", h.textColor, (value) => updateHeader("textColor", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Row Parent Color", "headers", "rowHeaderParentColor", h.rowHeaderParentColor, (value) => updateHeader("rowHeaderParentColor", value))}
              {colorRow("Row Child Color", "headers", "rowHeaderChildColor", h.rowHeaderChildColor, (value) => updateHeader("rowHeaderChildColor", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
              {colorRow("Column Level 0", "headers", "colHeaderLevel0Color", h.colHeaderLevel0Color, (value) => updateHeader("colHeaderLevel0Color", value))}
              {colorRow("Column Level 1", "headers", "colHeaderLevel1Color", h.colHeaderLevel1Color, (value) => updateHeader("colHeaderLevel1Color", value))}
              {colorRow("Leaf Columns", "headers", "colHeaderLeafColor", h.colHeaderLeafColor, (value) => updateHeader("colHeaderLeafColor", value))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {colorRow("Grid Border", "values", "borderColor", settings.values.borderColor || "#d0d0d0", (value) => onPersistProperty("values", "borderColor", value))}
              <div>
                <label style={labelStyle}>Border Style</label>
                <select value={settings.values.borderStyle} onChange={(e) => onPersistProperty("values", "borderStyle", e.target.value)} style={textInputStyle}>
                  <option value="none">None</option>
                  <option value="all">Full Grid</option>
                  <option value="horizontal">Horizontal Only</option>
                  <option value="vertical">Vertical Only</option>
                  <option value="outline">Outline Only</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});

HeaderOptionsPanel.displayName = "HeaderOptionsPanel";
