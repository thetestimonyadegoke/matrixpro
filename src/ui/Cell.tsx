import React, { memo } from "react";
import { VisualSettings } from "../settings/settings";
import { CellStyle, ClassificationIcon } from "../format/conditional";
import { DataBar } from "./InCell/DataBar";
import { KPIIcon } from "./InCell/KPIIcon";

// Renders a classification icon from a CF rule.
const CFIcon: React.FC<{ icon: ClassificationIcon }> = ({ icon }) => {
  let glyph: string;
  switch (icon.kind) {
    case "check": glyph = "✓"; break;
    case "warn":  glyph = "⚠"; break;
    case "cross": glyph = "✕"; break;
    case "text":  glyph = icon.label; break;
  }
  return (
    <span
      className="cf-icon"
      style={{ color: icon.color, marginRight: 2, marginLeft: 2, fontSize: "0.9em", flexShrink: 0 }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
};

export interface CellProps {
  value: number | null;
  formattedValue: string;
  columnIndex: number;
  measureIndex: number;
  columnWidth: number;
  settings: VisualSettings;
  cellStyle: CellStyle;
  isSubtotal: boolean;
  isGrandTotal: boolean;
  previousValue?: number | null;
  columnMin?: number;
  columnMax?: number;
  isActive: boolean;
  isEdited: boolean;
  hasNote: boolean;
  onClick: () => void;
}

export const Cell: React.FC<CellProps> = memo(({
  value,
  formattedValue,
  columnIndex,
  measureIndex,
  columnWidth,
  settings,
  cellStyle,
  isSubtotal,
  isGrandTotal,
  previousValue,
  columnMin = 0,
  columnMax = 100,
  isActive,
  isEdited,
  hasNote,
  onClick,
}) => {
  const alignmentClass = `align-${settings.values.alignment}`;

  // A CF color-scale rule with applyTo="dataBar" injects dataBarPct/dataBarColor.
  const showCFDataBar = cellStyle.dataBarPct !== undefined && value !== null;
  const showDataBar = !showCFDataBar && settings.dataBars.enabled && value !== null && !isSubtotal && !isGrandTotal;
  const showKPI = settings.kpiIcons.enabled && !isSubtotal && !isGrandTotal;

  // CF classification icon
  const cfIcon = cellStyle.icon ?? null;
  const iconLeft = cfIcon && cellStyle.iconPosition !== "rightOfData";
  const iconRight = cfIcon && cellStyle.iconPosition === "rightOfData";

  let dataBarWidth = 0;
  if (showDataBar && value !== null) {
    const range = columnMax - columnMin;
    if (range > 0) {
      dataBarWidth = Math.abs((value - columnMin) / range) * 100;
    }
  }

  const kpiDelta = previousValue !== undefined && previousValue !== null && value !== null
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null;

  // Compute border styles based on settings
  const getBorderStyle = (): React.CSSProperties => {
    if (settings.values.borderStyle === "none") return {};
    const borderPx = "1px";
    const borderCol = settings.values.borderColor || "#d0d0d0";
    const border = `${borderPx} solid ${borderCol}`;
    switch (settings.values.borderStyle) {
      case "all":
        return { border };
      case "horizontal":
        return { borderTop: border, borderBottom: border };
      case "vertical":
        return { borderLeft: border, borderRight: border };
      case "outline":
        return { border };
      default:
        return {};
    }
  };

  return (
    <div
      className={`matrix-cell ${alignmentClass} ${isActive ? "active" : ""} ${isEdited ? "edited" : ""}`}
      style={{
        width: columnWidth,
        minWidth: columnWidth,
        fontSize: `${settings.values.fontSize}px`,
        backgroundColor: cellStyle.backgroundColor,
        color: cellStyle.color,
        fontWeight: cellStyle.fontWeight,
        fontStyle: settings.values.italic ? "italic" : undefined,
        textDecoration: settings.values.underline ? "underline" : undefined,
        ...getBorderStyle(),
      }}
      onClick={onClick}
    >
      {isEdited && <div className="edited-marker" title="Edited cell" />}
      {hasNote && <div className="note-marker" title="Has note" />}

      {showCFDataBar && (
        <DataBar
          value={value}
          width={cellStyle.dataBarPct!}
          positiveColor={cellStyle.dataBarColor || "#4f86c6"}
          negativeColor={cellStyle.dataBarColor || "#e05c5c"}
        />
      )}
      {showDataBar && (
        <DataBar
          value={value}
          width={dataBarWidth}
          positiveColor={settings.dataBars.positiveColor}
          negativeColor={settings.dataBars.negativeColor}
        />
      )}
      {iconLeft && <CFIcon icon={cfIcon!} />}
      <span className="cell-value">
        {(settings.dataBars.enabled && !settings.dataBars.showValueText) || showCFDataBar ? "" : formattedValue}
      </span>
      {iconRight && <CFIcon icon={cfIcon!} />}
      {showKPI && kpiDelta !== null && (
        <KPIIcon
          delta={kpiDelta}
          upThreshold={settings.kpiIcons.upThreshold}
          downThreshold={settings.kpiIcons.downThreshold}
          upColor={settings.kpiIcons.upColor}
          neutralColor={settings.kpiIcons.neutralColor}
          downColor={settings.kpiIcons.downColor}
        />
      )}
      <div className="cell-edit-affordance">✎</div>
    </div>
  );
});

Cell.displayName = "Cell";
