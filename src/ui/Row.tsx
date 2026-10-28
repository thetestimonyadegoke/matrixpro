import React, { memo, useMemo } from "react";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { ViewportRange, ColumnWidthMap, getColumnWidth } from "../virtualization/viewport";
import { CellStyle } from "../format/conditional";
import { Cell } from "./Cell";
import { getRowStyle } from "../format/styles";
import {
  parseColFormats,
  parseRowFormats,
  composeCellStyle,
  resolveAlignment,
} from "../format/directFormats";

import { GridColumn } from "../model/gridColumns";
import { parseJsonObjectCached } from "../utils/jsonCache";
import { CalcRowFormat, resolveCalcRowFormat, resolveCellDisplay } from "../format/cellDisplay";


export interface RowProps {
  row: FlattenedNode;
  rowIndex: number;
  topOffset?: number;
  prevRowKey: string | null;
  visibleColumns: GridColumn[];
  visibleRange: ViewportRange;
  cellMap: { get: (key: string) => CellValue | undefined };
  measures: MeasureInfo[];
  settings: VisualSettings;
  isSelected: boolean;
  isFormatSelected?: boolean;
  showRowBreak?: boolean;
  sparklineMeasureIndex: number;
  rowHeight: number;
  columnWidth: number;
  getCellStyle: (rowKey: string, colKey: string, measureIndex: number, value: number | null) => CellStyle;
  getDataBarRange: (rowKey: string, colKey: string, measureIndex: number) => { min: number; max: number };
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, row: FlattenedNode, colKey?: string, measureIndex?: number) => void;
  onCellClick: (colKey: string, measureIndex: number, colIndex: number, modifiers: { ctrl: boolean; shift: boolean }) => void;
  activeCell: { rowKey: string; colKey: string; measureIndex: number } | null;
  /** Cell in this row that is the current Find (Ctrl+F) match. */
  findMatch?: { colKey: string | null; measureIndex: number | null } | null;
  selectedColumnKeys?: Set<string>;
  columnWidthMap: ColumnWidthMap;
}

export const Row: React.FC<RowProps> = memo(({
  row,
  rowIndex,
  topOffset,
  prevRowKey,
  visibleColumns,
  visibleRange,
  cellMap,
  measures: _measures,
  settings,
  isSelected,
  isFormatSelected,
  showRowBreak,
  sparklineMeasureIndex: _sparklineMeasureIndex,
  rowHeight,
  columnWidth: _columnWidth,
  getCellStyle,
  getDataBarRange,
  onClick,
  onContextMenu,
  onCellClick,
  activeCell,
  findMatch,
  selectedColumnKeys,
  columnWidthMap,
}) => {
  const rowStyle = getRowStyle(settings, rowIndex, row.isSubtotal, row.isGrandTotal, isSelected);
  const rowBreakStyle = showRowBreak
    ? settings.layout.rowBreak === "section"
      ? "8px solid var(--mx-canvas-bg, transparent)"
      : "12px solid var(--mx-canvas-bg, transparent)"
    : undefined;

  const className = [
    "matrix-row",
    row.isSubtotal ? "subtotal-row" : "",
    row.isGrandTotal ? "grandtotal-row" : "",
    isSelected ? "selected" : "",
    isFormatSelected ? "format-selected" : "",
    settings.general.rowBanding && rowIndex % 2 === 1 ? "banded" : "",
    settings.general.rowHighlight ? "row-highlight" : "",
  ].filter(Boolean).join(" ");

  const manualEdits = parseJsonObjectCached<Record<string, unknown>>(settings.manualData.edits);
  const manualNotes = parseJsonObjectCached<Record<string, unknown>>(settings.manualData.notes);

  // Parse direct-format maps once per render. The JSON strings are stable
  // across renders that don't modify them, so memoizing avoids re-parsing.
  const colFormats = useMemo(
    () => parseColFormats(settings.manualData.colFormats),
    [settings.manualData.colFormats]
  );
  const rowFormats = useMemo(
    () => parseRowFormats(settings.manualData.rowFormats),
    [settings.manualData.rowFormats]
  );
  const thisRowFormat = rowFormats[row.key] || (row.calcRowDefId ? rowFormats[`__calcrow__${row.calcRowDefId}`] || rowFormats[row.calcRowDefId] : undefined);

  // Calc-row per-row number formatting: scaling factor + quick format.
  // Only applies when this row is a calculated virtual row (key prefix
  // `__calcrow__`) — we look up the corresponding definition by id and
  // pull its optional `scalingFactor` / `quickFormat` fields.
  const calcRowFormat = useMemo<CalcRowFormat | null>(
    () => resolveCalcRowFormat(row.key, settings.calculations.rows),
    [row.key, settings.calculations.rows]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Kind-specific rendering for non-standard inserted rows.
  //
  //   blank    → empty spacer row (height-only)
  //   divider  → horizontal rule row (no cells)
  //   group    → header row with label and collapse chevron; no data cells
  //   child    → rendered like "calculated" (extra indent applied upstream
  //              in createVirtualRowNode).
  // ──────────────────────────────────────────────────────────────────────────
  const kind = row.calcRowKind;

  if (kind === "blank") {
    return (
      <div
        className={`${className} blank-row`}
        style={{
          ...rowStyle,
          top: topOffset ?? rowIndex * rowHeight,
          height: row.blankHeight ?? rowHeight,
          background: "transparent",
        }}
        aria-hidden
      />
    );
  }

  if (kind === "divider") {
    const dStyle = row.dividerProps?.lineStyle ?? "single";
    const borderCss = dStyle === "double"
      ? `3px double ${row.dividerProps?.lineColor ?? "var(--mx-border)"}`
      : dStyle === "dashed"
        ? `1px dashed ${row.dividerProps?.lineColor ?? "var(--mx-border)"}`
        : `1px solid ${row.dividerProps?.lineColor ?? "var(--mx-border)"}`;
    return (
      <div
        className={`${className} divider-row`}
        style={{
          ...rowStyle,
          top: topOffset ?? rowIndex * rowHeight,
          height: rowHeight,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          paddingRight: 8,
        }}
        aria-hidden
      >
        <div style={{ flex: 1, borderTop: borderCss }} />
      </div>
    );
  }

  if (kind === "group") {
    const collapsed = row.groupCollapsed === true;
    return (
      <div
        className={`${className} group-row`}
        style={{
          ...rowStyle,
          top: topOffset ?? rowIndex * rowHeight,
          height: rowHeight,
          display: "flex",
          alignItems: "center",
          fontWeight: 700,
          background: row.calculatedRowStyle?.backgroundColor || "var(--mx-accent-10)",
          color: row.calculatedRowStyle?.textColor || "var(--mx-cell-fg)",
          paddingLeft: 8 + (row.indent ?? 0) * 16,
        }}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, row);
        }}
      >
        <span
          aria-label={collapsed ? "Expand group" : "Collapse group"}
          style={{
            display: "inline-block",
            width: 14,
            marginRight: 4,
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
            fontSize: 10,
            userSelect: "none",
          }}
        >
          ▼
        </span>
        <span>{row.label}</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...rowStyle,
        ...(rowBreakStyle ? { borderTop: rowBreakStyle } : {}),
        ...(rowBreakStyle ? { boxSizing: "border-box" } : {}),
        top: topOffset ?? rowIndex * rowHeight,
        height: rowHeight,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, row);
      }}
      onClick={onClick}
    >
      {visibleRange.startCol > 0 && (
        <div
          style={{
            width: (() => {
              let w = 0;
              for (let i = 0; i < visibleRange.startCol; i++) {
                w += getColumnWidth(columnWidthMap, i);
              }
              return w;
            })(),
            minWidth: (() => {
              let w = 0;
              for (let i = 0; i < visibleRange.startCol; i++) {
                w += getColumnWidth(columnWidthMap, i);
              }
              return w;
            })(),
            flexShrink: 0,
          }}
        />
      )}

      {visibleColumns.map((gridCol, idx) => {
        const actualColIndex = visibleRange.startCol + idx;
        const mIdx = gridCol.measureIndex;
        const colKey = gridCol.col.key;

        const editKey = `${row.key}|${colKey}|${mIdx}`;
        const { displayValue, displayFormatted, isEdited, thisColFormat } = resolveCellDisplay({
          row,
          gridCol,
          cellMap,
          settings,
          manualEdits,
          colFormats,
          thisRowFormat,
          calcRowFormat,
        });

        const cellStyle = getCellStyle(row.key, colKey, mIdx, displayValue);
        const prevCell = prevRowKey ? getCellValue(cellMap, prevRowKey, colKey, mIdx) : undefined;
        const range = getDataBarRange(row.key, colKey, mIdx);

        const isActive = !!(activeCell && activeCell.rowKey === row.key && activeCell.colKey === colKey && activeCell.measureIndex === mIdx);
        const hasNote = !!manualNotes[editKey];
        const isColSelected = !!(
          selectedColumnKeys?.has(`${colKey}::m${mIdx}`) ||
          selectedColumnKeys?.has(`m:${mIdx}`)
        );

        const composedStyle = composeCellStyle(
          settings,
          cellStyle,
          thisColFormat,
          thisRowFormat || row.calculatedRowStyle,
          row.isSubtotal || gridCol.col.isSubtotal,
          row.isGrandTotal || gridCol.col.isGrandTotal
        );
        const composedAlign = resolveAlignment(settings, thisColFormat, thisRowFormat || row.calculatedRowStyle);

        return (
          <Cell
            key={gridCol.key}
            value={displayValue}
            formattedValue={displayFormatted}
            columnIndex={actualColIndex}
            measureIndex={mIdx}
            columnWidth={getColumnWidth(columnWidthMap, actualColIndex)}
            settings={settings}
            cellStyle={cellStyle}
            isSubtotal={row.isSubtotal}
            isGrandTotal={row.isGrandTotal}
            previousValue={prevCell?.value ?? null}
            columnMin={range.min}
            columnMax={range.max}
            isActive={isActive}
            isEdited={isEdited}
            hasNote={hasNote}
            isColumnSelected={isColSelected}
            isFindMatch={!!findMatch && findMatch.colKey === colKey && findMatch.measureIndex === mIdx}
            composedStyle={composedStyle}
            composedAlignment={composedAlign}
            onClick={(e) => onCellClick(colKey, mIdx, actualColIndex, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
          />
        );
      })}
    </div>
  );
});

Row.displayName = "Row";
