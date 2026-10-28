import React, { memo } from "react";
import { VisualSettings } from "../settings/settings";
import { CellStyle, ClassificationIcon } from "../format/conditional";
import { DataBar } from "./InCell/DataBar";
import { KPIIcon } from "./InCell/KPIIcon";

type BuiltInIconKind = Exclude<ClassificationIcon["kind"], "custom" | "text">;

const IconSvg: React.FC<{ kind: BuiltInIconKind }> = ({ kind }) => {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (kind) {
    case "check": return <path {...common} d="M4 12.5 9 17.5 20 6.5" />;
    case "warn": return <><path {...common} d="M12 4 21 20H3L12 4Z" /><path {...common} d="M12 9v5" /><circle cx="12" cy="17" r="0.8" fill="currentColor" /></>;
    case "cross": return <path {...common} d="M6 6 18 18M18 6 6 18" />;
    case "up": return <path {...common} d="M12 20V5M6 11l6-6 6 6" />;
    case "down": return <path {...common} d="M12 4v15M6 13l6 6 6-6" />;
    case "flat": return <path {...common} d="M5 12h14" />;
    case "upRight": return <path {...common} d="M7 17 17 7M9 7h8v8" />;
    case "downRight": return <path {...common} d="M7 7 17 17M17 9v8H9" />;
    case "chevronLeft": return <path {...common} d="m15 6-6 6 6 6" />;
    case "chevronRight": return <path {...common} d="m9 6 6 6-6 6" />;
    case "triangleUp": return <path fill="currentColor" d="M12 5 21 19H3L12 5Z" />;
    case "triangleDown": return <path fill="currentColor" d="M12 19 3 5h18L12 19Z" />;
    case "caretUp": return <path {...common} d="m6 15 6-6 6 6" />;
    case "caretDown": return <path {...common} d="m6 9 6 6 6-6" />;
    case "doubleUp": return <path {...common} d="m6 16 6-6 6 6M6 10l6-6 6 6" />;
    case "doubleDown": return <path {...common} d="m6 8 6 6 6-6M6 14l6 6 6-6" />;
    case "flag":
    case "flagFilled": return <><path {...common} d="M6 21V4" /><path fill="currentColor" d="M7 5h11l-2.5 4L18 13H7V5Z" /></>;
    case "flagOutline": return <><path {...common} d="M6 21V4" /><path {...common} d="M7 5h11l-2.5 4L18 13H7V5Z" /></>;
    case "outlineSquare": return <rect x="5" y="5" width="14" height="14" {...common} />;
    case "filledSquare": return <rect x="5" y="5" width="14" height="14" fill="currentColor" />;
    case "target": return <><circle cx="12" cy="12" r="8" {...common} /><circle cx="12" cy="12" r="3" {...common} /></>;
    case "quarterCircle": return <path {...common} d="M12 4a8 8 0 0 1 8 8h-8V4Z" />;
    case "halfCircle": return <path {...common} d="M12 4a8 8 0 0 1 0 16V4Z" />;
    case "pie": return <><circle cx="12" cy="12" r="8" {...common} /><path fill="currentColor" d="M12 4a8 8 0 0 1 8 8h-8V4Z" /></>;
    case "emptyCircle": return <circle cx="12" cy="12" r="8" {...common} />;
    case "quarterFilledCircle": return <><circle cx="12" cy="12" r="8" {...common} /><path fill="currentColor" d="M12 4a8 8 0 0 1 8 8h-8V4Z" /></>;
    case "halfFilledCircle": return <><circle cx="12" cy="12" r="8" {...common} /><path fill="currentColor" d="M12 4a8 8 0 0 1 0 16V4Z" /></>;
    case "threeQuarterCircle": return <><circle cx="12" cy="12" r="8" {...common} /><path fill="currentColor" d="M12 4a8 8 0 1 1-8 8h8V4Z" /></>;
    case "filledCircle": return <circle cx="12" cy="12" r="8" fill="currentColor" />;
    case "diamond": return <path fill="currentColor" d="M12 3 21 12 12 21 3 12 12 3Z" />;
    case "heart": return <path fill="currentColor" d="M12 20s-7-4.4-8.7-9.1C2.1 7.5 4.3 5 7.1 5c1.7 0 3.1.9 4 2.2C12 5.9 13.4 5 15.1 5c2.8 0 5 2.5 3.8 5.9C17.2 15.6 12 20 12 20Z" />;
    case "bulb": return <path {...common} d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1.1.8-1.5 1.8-1.5 3h-5c0-1.2-.4-2.2-1.5-3Z" />;
    case "info": return <><circle cx="12" cy="12" r="8" fill="currentColor" /><path d="M12 11v5M12 8h.01" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></>;
    case "bold": return <path fill="currentColor" d="M7 4h6.2c3 0 5 1.5 5 4 0 1.7-.9 2.9-2.4 3.4 1.9.5 3 1.8 3 3.9 0 2.9-2.2 4.7-5.7 4.7H7V4Zm4 6h2c1.2 0 1.9-.5 1.9-1.5S14.2 7 13 7h-2v3Zm0 7h2.4c1.3 0 2.1-.6 2.1-1.7s-.8-1.7-2.1-1.7H11V17Z" />;
    case "underline": return <><path {...common} d="M7 4v7a5 5 0 0 0 10 0V4M5 21h14" /></>;
    case "italic": return <><path {...common} d="M13 5h6M5 19h6M15 5l-6 14" /></>;
    case "checkCircle": return <><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m7.5 12.2 3 3 6-7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "crossCircle": return <><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></>;
    case "starOutline": return <path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />;
    case "starHalf": return <><path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" /><path fill="currentColor" d="M12 5.8v9.5l-3.1 1.6.6-3.5-2.5-2.5 3.5-.5L12 5.8Z" /></>;
    case "starFilled": return <path fill="currentColor" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />;
    case "profit":
    case "cash": return <path {...common} d="M12 3v18M16 7.5c-.7-1-1.9-1.5-3.7-1.5-2 0-3.4.9-3.4 2.4 0 3.5 7.2 1.8 7.2 5.9 0 1.8-1.6 3-4 3-1.8 0-3.3-.6-4.2-1.8" />;
    case "loss":
    case "debt": return <path {...common} d="M5 12h14M12 5v14" />;
    case "margin": return <><circle cx="8" cy="8" r="2.2" {...common} /><circle cx="16" cy="16" r="2.2" {...common} /><path {...common} d="M18 6 6 18" /></>;
    case "variance": return <><path {...common} d="M6 8h12M12 4v8M6 17h12" /></>;
    case "forecast": return <><path {...common} d="M4 17h4l3-7 3 4h6" /><path {...common} d="M16 6h4v4" /></>;
    case "budget": return <><rect x="4" y="6" width="16" height="12" rx="2" {...common} /><path {...common} d="M8 6V4h8v2M8 12h8" /></>;
    default: return null;
  }
};

export const RenderClassificationIcon: React.FC<{ icon?: ClassificationIcon | null; size?: number }> = ({ icon, size = 18 }) => {
  if (!icon) {
    return null;
  }
  if (icon.kind === "custom") {
    return icon.src
      ? <img src={icon.src} alt="" style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
      : null;
  }
  if (icon.kind === "text") {
    return <span style={{ color: icon.color || "#111827", fontSize: Math.max(10, size - 4), lineHeight: `${size}px`, fontWeight: 700 }}>{icon.label || "A"}</span>;
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" style={{ width: size, height: size, color: icon.color || "#111827", display: "block" }}>
      <IconSvg kind={icon.kind} />
    </svg>
  );
};

const CFIcon: React.FC<{ icon: ClassificationIcon; dock: "left" | "right" }> = ({ icon, dock }) => (
  <span className={`cf-icon cf-icon-${dock}`} aria-hidden="true">
    <RenderClassificationIcon icon={icon} size={16} />
  </span>
);

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
  isColumnSelected?: boolean;
  /** Cell is the current Find (Ctrl+F) match. */
  isFindMatch?: boolean;
  composedStyle?: React.CSSProperties;
  composedAlignment?: "left" | "center" | "right";
  onClick: (e: React.MouseEvent) => void;
}

export const Cell: React.FC<CellProps> = memo(({
  value,
  formattedValue,
  columnIndex: _columnIndex,
  measureIndex: _measureIndex,
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
  isColumnSelected,
  isFindMatch,
  composedStyle,
  composedAlignment,
  onClick,
}) => {
  const alignmentClass = `align-${composedAlignment ?? settings.values.alignment}`;
  const showCFDataBar = cellStyle.dataBarPct !== undefined && value !== null;
  const showDataBar = !showCFDataBar && settings.dataBars.enabled && value !== null && !isSubtotal && !isGrandTotal;
  const showKPI = settings.kpiIcons.enabled && !isSubtotal && !isGrandTotal;
  const cfIcon = cellStyle.icon ?? null;
  const iconLeft = cfIcon && cellStyle.iconPosition !== "rightOfData";
  const iconRight = cfIcon && cellStyle.iconPosition === "rightOfData";
  const hideValueText = cellStyle.hideText || (settings.dataBars.enabled && !settings.dataBars.showValueText) || showCFDataBar;

  let dataBarWidth = 0;
  if (showDataBar && value !== null) {
    const range = columnMax - columnMin;
    if (range > 0) dataBarWidth = Math.abs((value - columnMin) / range) * 100;
  }

  const kpiDelta = previousValue !== undefined && previousValue !== null && value !== null
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null;

  const getBorderStyle = (): React.CSSProperties => {
    if (settings.values.borderStyle === "none") return {};
    const border = `1px solid ${settings.values.borderColor || "#d0d0d0"}`;
    switch (settings.values.borderStyle) {
      case "all": return { border };
      case "horizontal": return { borderTop: border, borderBottom: border };
      case "vertical": return { borderLeft: border, borderRight: border };
      case "outline": return { border };
      default: return {};
    }
  };

  return (
    <div
      className={`matrix-cell ${alignmentClass} ${isActive ? "active" : ""} ${isEdited ? "edited" : ""} ${isColumnSelected ? "col-selected" : ""} ${isFindMatch ? "find-match" : ""} ${cfIcon ? "has-cf-icon" : ""} ${iconLeft ? "has-cf-icon-left" : ""} ${iconRight ? "has-cf-icon-right" : ""}`}
      style={{
        width: columnWidth,
        minWidth: columnWidth,
        fontSize: `${settings.values.fontSize}px`,
        ...(composedStyle
          ? composedStyle
          : {
              backgroundColor: cellStyle.backgroundColor,
              color: cellStyle.color,
              fontWeight: cellStyle.fontWeight ?? (settings.values.bold ? 700 : undefined),
              fontStyle: settings.values.italic ? "italic" : undefined,
              textDecoration: settings.values.underline ? "underline" : undefined,
            }),
        ...getBorderStyle(),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
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
      {iconLeft && <CFIcon icon={cfIcon!} dock="left" />}
      <span className="cell-value">{hideValueText ? "" : formattedValue}</span>
      {iconRight && <CFIcon icon={cfIcon!} dock="right" />}
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
