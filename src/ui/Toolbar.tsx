import React, { memo } from "react";
import { LayoutMode, VisualSettings } from "../settings/settings";
import { IconBars, IconExport, IconGrid, IconKpi, IconSpark } from "./icons";

export interface ToolbarProps {
  settings: VisualSettings;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  allowInteractions: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = memo(({
  settings,
  onExportCSV,
  onExportXLSX,
  onPersistProperty,
  allowInteractions,
}) => {
  const toggle = (objectName: string, propertyName: string, currentValue: boolean) => {
    if (!allowInteractions) return;
    onPersistProperty(objectName, propertyName, !currentValue);
  };

  const layoutModes: LayoutMode[] = ["hierarchy", "outline", "table", "stepped", "drilldown"];
  const layoutLabels: Record<LayoutMode, string> = {
    hierarchy: "Hierarchy",
    outline: "Outline",
    table: "Table",
    stepped: "Stepped",
    drilldown: "Drilldown",
  };

  const cycleLayoutMode = () => {
    if (!allowInteractions) return;
    const current = settings.layout.mode;
    const idx = layoutModes.indexOf(current);
    const next = layoutModes[(idx >= 0 ? idx + 1 : 0) % layoutModes.length];
    onPersistProperty("layout", "mode", next);
  };

  return (
    <div className="matrix-toolbar" role="toolbar" aria-label="Matrix toolbar">
      <div className="toolbar-group" aria-label="Layout">
        <div className="toolbar-group-title">Layout</div>
        <button
          className="toolbar-btn"
          onClick={cycleLayoutMode}
          disabled={!allowInteractions}
          aria-pressed={false}
          title="Cycle layout mode"
        >
          <IconGrid size={16} title="Layout mode" />
          <span className="toolbar-btn-label">{layoutLabels[settings.layout.mode] ?? "Layout"}</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => toggle("general", "showGridlines", settings.general.showGridlines)}
          disabled={!allowInteractions}
          aria-pressed={settings.general.showGridlines}
          title="Toggle gridlines"
        >
          <IconGrid size={16} title="Gridlines" />
          <span className="toolbar-btn-label">Gridlines</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => toggle("general", "rowBanding", settings.general.rowBanding)}
          disabled={!allowInteractions}
          aria-pressed={settings.general.rowBanding}
          title="Toggle row banding"
        >
          <IconGrid size={16} title="Row banding" />
          <span className="toolbar-btn-label">Banding</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group" aria-label="Analytics">
        <div className="toolbar-group-title">Analytics</div>
        <button
          className="toolbar-btn"
          onClick={() => toggle("dataBars", "enabled", settings.dataBars.enabled)}
          disabled={!allowInteractions}
          aria-pressed={settings.dataBars.enabled}
          title="Toggle data bars"
        >
          <IconBars size={16} title="Data bars" />
          <span className="toolbar-btn-label">Data bars</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled)}
          disabled={!allowInteractions}
          aria-pressed={settings.kpiIcons.enabled}
          title="Toggle KPI icons"
        >
          <IconKpi size={16} title="KPI" />
          <span className="toolbar-btn-label">KPI</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => toggle("sparklines", "enabled", settings.sparklines.enabled)}
          disabled={!allowInteractions}
          aria-pressed={settings.sparklines.enabled}
          title="Toggle sparklines"
        >
          <IconSpark size={16} title="Sparklines" />
          <span className="toolbar-btn-label">Sparklines</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group" aria-label="Export">
        <div className="toolbar-group-title">Export</div>
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onExportCSV}
          disabled={!allowInteractions}
          title="Export to CSV"
        >
          <IconExport size={16} title="Export" />
          <span className="toolbar-btn-label">CSV</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={onExportXLSX}
          disabled={!allowInteractions}
          title="Export to Excel"
        >
          <IconExport size={16} title="Export" />
          <span className="toolbar-btn-label">Excel</span>
        </button>
      </div>
    </div>
  );
});

Toolbar.displayName = "Toolbar";
