import React, { memo } from "react";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { Sparkline } from "./InCell/Sparkline";

export interface RowHeaderProps {
  row: FlattenedNode;
  index: number;
  settings: VisualSettings;
  tooltipService: TooltipServiceWrapper | null;
  isSelected: boolean;
  isFormatSelected?: boolean;
  style: React.CSSProperties;
  onToggleExpand: (nodeKey: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartResize: (clientY: number) => void;
  onContextMenu: (e: React.MouseEvent, row: FlattenedNode) => void;
  onDragStart: (e: React.DragEvent, rowKey: string) => void;
  onDragOver: (e: React.DragEvent, rowKey: string) => void;
  onDrop: (e: React.DragEvent, rowKey: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  dropPosition?: "before" | "after" | "child" | null;
  isDragOver?: boolean;
  sparklineValues?: (number | null)[];
  sparklineLabels?: string[];
  sparklineGlobalMin?: number;
  sparklineGlobalMax?: number;
  labelOverrides?: Record<string, string>;
  hideExpandIcon?: boolean;
  /** Row label is the current Find (Ctrl+F) match. */
  isFindMatch?: boolean;
}

/** The label text a row header shows for the current layout mode. */
export function getRowDisplayLabel(
  row: FlattenedNode,
  settings: VisualSettings,
  labelOverrides?: Record<string, string>
): string {
  const rawLabel = labelOverrides?.[row.key] || row.label;
  return settings.layout.mode === "table"
    ? row.path.map(v => String(v)).join(" / ")
    : settings.layout.mode === "drilldown"
      ? row.path[row.path.length - 1]?.toString() || rawLabel
      : rawLabel;
}

export const RowHeader: React.FC<RowHeaderProps> = memo(({
  row,
  index: _index,
  settings,
  tooltipService,
  isSelected,
  isFormatSelected,
  style,
  onToggleExpand,
  onClick,
  onStartResize,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropPosition,
  isDragOver,
  sparklineValues,
  sparklineLabels,
  sparklineGlobalMin,
  sparklineGlobalMax,
  labelOverrides,
  hideExpandIcon,
  isFindMatch,
}) => {
  const resolvedHeaderBackground =
    typeof style.backgroundColor === "string" && style.backgroundColor !== "transparent"
      ? style.backgroundColor
      : "var(--mx-row-header-bg, var(--mx-surface, #ffffff))";

  const indentUnit = settings.layout.mode === "outline"
    ? 18
    : settings.layout.mode === "stepped"
      ? 24
      : settings.layout.mode === "table"
        ? 0
        : settings.layout.mode === "drilldown"
          ? 0
          : 20;
  const indentPadding = row.indent * indentUnit;

  // Display label varies by layout mode
  const displayLabel = getRowDisplayLabel(row, settings, labelOverrides);

  // Stepped mode shows level indicator
  const showLevelIndicator = settings.layout.mode === "stepped" && row.level > 0;

  // Outline mode uses compact styling
  const isOutlineMode = settings.layout.mode === "outline";
  const shouldReserveExpandSlot =
    settings.layout.mode !== "table" &&
    (row.hasChildren || (row.isCalculatedRow && row.indent === 0));

  // Drilldown mode shows breadcrumb for context
  const showBreadcrumb = settings.layout.mode === "drilldown" && row.path.length > 1;

  const className = [
    "matrix-row-header",
    row.isSubtotal ? "subtotal-row" : "",
    row.isGrandTotal ? "grandtotal-row" : "",
    isSelected ? "selected" : "",
    isFormatSelected ? "format-selected" : "",
    isFindMatch ? "find-match" : "",
    isDragOver ? `drag-over ${dropPosition}` : "",
  ].filter(Boolean).join(" ");
  const manualTextColor =
    typeof style.color === "string" && style.color && style.color !== "inherit"
      ? style.color
      : undefined;
  const manualLabelBackground =
    typeof style.backgroundColor === "string" && style.backgroundColor !== "transparent"
      ? style.backgroundColor
      : undefined;

  if (row.calcRowKind === "blank") {
    return (
      <div
        className={`${className} blank-row`}
        style={{
          ...style,
          backgroundColor: "transparent",
          paddingLeft: 0,
        }}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, row);
        }}
        draggable
        onDragStart={(e) => onDragStart(e, row.key)}
        onDragOver={(e) => onDragOver(e, row.key)}
        onDrop={(e) => onDrop(e, row.key)}
        onDragEnd={onDragEnd}
        title="Blank row"
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...style,
        backgroundColor: resolvedHeaderBackground,
        paddingLeft: 8 + indentPadding,
      }}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, row);
      }}
      draggable
      onDragStart={(e) => onDragStart(e, row.key)}
      onDragOver={(e) => onDragOver(e, row.key)}
      onDrop={(e) => onDrop(e, row.key)}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      onMouseEnter={(e) => {
        if (!tooltipService) return;
        tooltipService.show(
          {
            rowPath: row.path.map(v => String(v)),
            columnPath: [],
            measureName: "Row",
            rawValue: null,
            formattedValue: row.path.map(v => String(v)).join(" > "),
          },
          { x: e.clientX, y: e.clientY },
          row.selectionId ? [row.selectionId] : []
        );
      }}
      onMouseMove={(e) => {
        if (!tooltipService) return;
        tooltipService.move({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        tooltipService?.hide();
      }}
      title={row.path.join(" > ")}
    >
      <span className="row-drag-handle" title="Drag to reorder">::</span>

      {showLevelIndicator && (
        <span className="level-indicator" aria-hidden="true">
          {"|".repeat(row.level - 1)}-
        </span>
      )}
      {showBreadcrumb && (
        <span className="breadcrumb-context" title={row.path.slice(0, -1).join(" > ")}>
          {row.path.slice(0, -1).map(v => String(v).charAt(0)).join("")} /
        </span>
      )}
      {shouldReserveExpandSlot && (
        <span
          className={`expand-toggle ${isOutlineMode ? "compact" : ""} ${(!row.hasChildren || hideExpandIcon) ? "placeholder" : ""}`}
          role="button"
          tabIndex={0}
          title={row.isExpanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            if (row.hasChildren && !hideExpandIcon) onToggleExpand(row.key);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (row.hasChildren && !hideExpandIcon) onToggleExpand(row.key);
            }
          }}
        >
          {!row.hasChildren || hideExpandIcon ? "" : (row.isExpanded ? "-" : "+")}
        </span>
      )}
      <span 
        className={`row-label ${isOutlineMode ? "outline-label" : ""}`}
        style={{
          fontWeight: row.isGrandTotal ? "var(--mx-gt-fw)" : (row.isSubtotal ? "var(--mx-st-fw)" : (row.hasChildren ? "var(--mx-row-parent-fw)" : "inherit")),
          color: manualTextColor || (row.isGrandTotal ? "var(--mx-gt-fg)" : (row.isSubtotal ? "var(--mx-st-fg)" : (row.hasChildren ? "var(--mx-row-parent-color)" : "var(--mx-row-child-color)"))),
          backgroundColor: manualLabelBackground || (row.isGrandTotal ? "var(--mx-gt-bg)" : (row.isSubtotal ? "var(--mx-st-bg)" : "transparent")),
        }}
      >
        {displayLabel}
      </span>

      {settings.sparklines.enabled && sparklineValues && (
        <span
          className={`row-header-sparkline ${settings.sparklines.showInDedicatedColumn ? "dedicated" : "inline"}`}
          style={{
            marginLeft: "auto",
            flex: settings.sparklines.showInDedicatedColumn ? "0 0 112px" : "0 0 84px",
            opacity: row.isSubtotal || row.isGrandTotal ? 0.85 : 1,
          }}
          aria-hidden={!row.hasChildren || hideExpandIcon}
        >
          <Sparkline
            values={sparklineValues}
            labels={sparklineLabels}
            width={settings.sparklines.showInDedicatedColumn ? 104 : 80}
            height={settings.sparklines.showInDedicatedColumn ? 22 : 18}
            lineColor={settings.sparklines.lineColor}
            markerColor={settings.sparklines.markerColor}
            showMinMaxMarkers={settings.sparklines.showMinMaxMarkers}
            normalizePerRow={settings.sparklines.normalizePerRow}
            nullHandling={settings.sparklines.nullHandling}
            globalMin={sparklineGlobalMin}
            globalMax={sparklineGlobalMax}
          />
        </span>
      )}

      {isDragOver && dropPosition && (
        <div className={`drop-indicator ${dropPosition}`} />
      )}

      <span
        className="row-resize-handle"
        role="presentation"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onStartResize(e.clientY);
        }}
      />
    </div>
  );
});

RowHeader.displayName = "RowHeader";

