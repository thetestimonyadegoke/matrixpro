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
  style: React.CSSProperties;
  onToggleExpand: (nodeKey: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartResize: (clientY: number) => void;
  onContextMenu: (e: React.MouseEvent, row: FlattenedNode) => void;
  onDragStart: (e: React.DragEvent, rowKey: string) => void;
  onDragOver: (e: React.DragEvent, rowKey: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  dropPosition?: "before" | "after" | "child" | null;
  isDragOver?: boolean;
  sparklineValues?: (number | null)[];
  sparklineLabels?: string[];
}

export const RowHeader: React.FC<RowHeaderProps> = memo(({
  row,
  index,
  settings,
  tooltipService,
  isSelected,
  style,
  onToggleExpand,
  onClick,
  onStartResize,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragEnd,
  dropPosition,
  isDragOver,
  sparklineValues,
  sparklineLabels,
}) => {
  const indentUnit = settings.layout.mode === "outline"
    ? 12
    : settings.layout.mode === "stepped"
      ? 20
      : settings.layout.mode === "table"
        ? 0
        : settings.layout.mode === "drilldown"
          ? 0
          : 16;
  const indentPadding = row.indent * indentUnit;

  // Display label varies by layout mode
  const displayLabel = settings.layout.mode === "table"
    ? row.path.map(v => String(v)).join(" / ")
    : settings.layout.mode === "drilldown"
      ? row.path[row.path.length - 1]?.toString() || row.label
      : settings.layout.mode === "stepped"
        ? row.label
        : row.label;

  // Stepped mode shows level indicator
  const showLevelIndicator = settings.layout.mode === "stepped" && row.level > 0;

  // Outline mode uses compact styling
  const isOutlineMode = settings.layout.mode === "outline";

  // Drilldown mode shows breadcrumb for context
  const showBreadcrumb = settings.layout.mode === "drilldown" && row.path.length > 1;

  const className = [
    "matrix-row-header",
    row.isSubtotal ? "subtotal-row" : "",
    row.isGrandTotal ? "grandtotal-row" : "",
    isSelected ? "selected" : "",
    isDragOver ? `drag-over ${dropPosition}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      style={{
        ...style,
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
      <span className="row-drag-handle" title="Drag to reorder">⋮⋮</span>

      {showLevelIndicator && (
        <span className="level-indicator" aria-hidden="true">
          {"│".repeat(row.level - 1)}└
        </span>
      )}
      {showBreadcrumb && (
        <span className="breadcrumb-context" title={row.path.slice(0, -1).join(" > ")}>
          {row.path.slice(0, -1).map(v => String(v).charAt(0)).join("")} ›
        </span>
      )}
      {settings.layout.mode !== "table" && settings.layout.mode !== "drilldown" && row.hasChildren && (
        <span
          className={`expand-toggle ${isOutlineMode ? "compact" : ""}`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(row.key);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand(row.key);
            }
          }}
        >
          {row.isExpanded ? "−" : "+"}
        </span>
      )}
      <span className={`row-label ${isOutlineMode ? "outline-label" : ""}`}>{displayLabel}</span>

      {settings.sparklines.enabled && sparklineValues && (
        <span className="row-header-sparkline">
          <Sparkline
            values={sparklineValues}
            labels={sparklineLabels}
            width={80}
            height={18}
            lineColor={settings.sparklines.lineColor}
            markerColor={settings.sparklines.markerColor}
            showMinMaxMarkers={settings.sparklines.showMinMaxMarkers}
            normalizePerRow={settings.sparklines.normalizePerRow}
            nullHandling={settings.sparklines.nullHandling}
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
