import React, { memo, useMemo } from "react";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue, formatValue } from "../model/pivot";
import {
  VisualSettings,
  RowQuickFormat,
  RowScalingFactor,
  migrateInsertedRows,
} from "../settings/settings";
import { ViewportRange, ColumnWidthMap, getColumnWidth } from "../virtualization/viewport";
import { CellStyle } from "../format/conditional";
import { Cell } from "./Cell";
import { getRowStyle } from "../format/styles";
import {
  parseColFormats,
  parseRowFormats,
  formatQuickNumber,
  composeCellStyle,
  resolveAlignment,
  resolveColumnFormat,
  QuickNumberFormat,
  quickFormatDivisor,
} from "../format/directFormats";

/**
 * Map a row-level scaling factor ("thousands" / "millions" / …) to the
 * column-format `QuickNumberFormat` so we can reuse `formatQuickNumber`
 * for the scaling step.
 */
function scalingToQuick(sf: RowScalingFactor | undefined): QuickNumberFormat | undefined {
  if (!sf || sf === "none") return undefined;
  return sf as QuickNumberFormat;
}

/**
 * Apply the row-level Quick Format (number/currency/percentage) on top of
 * an already-scaled numeric value. Scaling (thousands/millions/…) is handled
 * separately via `formatQuickNumber` before this runs.
 */
function applyRowQuickFormat(scaledValue: number, qf: RowQuickFormat): string {
  if (qf === "currency") {
    return scaledValue.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  if (qf === "percentage") {
    return (scaledValue * 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + "%";
  }
  // "number"
  return scaledValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type GridColumn = {
  key: string;
  col: FlattenedNode;
  measure: MeasureInfo;
  measureIndex: number;
};

export interface RowProps {
  row: FlattenedNode;
  rowIndex: number;
  prevRowKey: string | null;
  visibleColumns: GridColumn[];
  visibleRange: ViewportRange;
  cellMap: { get: (key: string) => CellValue | undefined };
  measures: MeasureInfo[];
  settings: VisualSettings;
  isSelected: boolean;
  sparklineMeasureIndex: number;
  rowHeight: number;
  columnWidth: number;
  getCellStyle: (rowKey: string, colKey: string, measureIndex: number, value: number | null) => CellStyle;
  getDataBarRange: (rowKey: string, colKey: string, measureIndex: number) => { min: number; max: number };
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, row: FlattenedNode, colKey?: string, measureIndex?: number) => void;
  onCellClick: (colKey: string, measureIndex: number, colIndex: number, modifiers: { ctrl: boolean; shift: boolean }) => void;
  activeCell: { rowKey: string; colKey: string; measureIndex: number } | null;
  selectedColumnKeys?: Set<string>;
  columnWidthMap: ColumnWidthMap;
}

export const Row: React.FC<RowProps> = memo(({
  row,
  rowIndex,
  prevRowKey,
  visibleColumns,
  visibleRange,
  cellMap,
  measures: _measures,
  settings,
  isSelected,
  sparklineMeasureIndex: _sparklineMeasureIndex,
  rowHeight,
  columnWidth,
  getCellStyle,
  getDataBarRange,
  onClick,
  onContextMenu,
  onCellClick,
  activeCell,
  selectedColumnKeys,
  columnWidthMap,
}) => {
  const rowStyle = getRowStyle(settings, rowIndex, row.isSubtotal, row.isGrandTotal, isSelected);

  const className = [
    "matrix-row",
    row.isSubtotal ? "subtotal-row" : "",
    row.isGrandTotal ? "grandtotal-row" : "",
    isSelected ? "selected" : "",
    settings.general.rowBanding && rowIndex % 2 === 1 ? "banded" : "",
    settings.general.rowHighlight ? "row-highlight" : "",
  ].filter(Boolean).join(" ");

  const manualEdits = JSON.parse(settings.manualData.edits || "{}");
  const manualNotes = JSON.parse(settings.manualData.notes || "{}");

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
  const thisRowFormat = rowFormats[row.key];

  // Calc-row per-row number formatting: scaling factor + quick format.
  // Only applies when this row is a calculated virtual row (key prefix
  // `__calcrow__`) — we look up the corresponding definition by id and
  // pull its optional `scalingFactor` / `quickFormat` fields.
  const calcRowFormat = useMemo<{ sf: RowScalingFactor; qf: RowQuickFormat } | null>(() => {
    if (!row.key.startsWith("__calcrow__")) return null;
    const id = row.key.slice("__calcrow__".length);
    const defs = migrateInsertedRows(settings.calculations.rows);
    for (const d of defs) {
      if ((d.kind === "calculated" || d.kind === "child") && d.id === id) {
        const sf = (d.scalingFactor ?? "none") as RowScalingFactor;
        const qf = (d.quickFormat ?? "none") as RowQuickFormat;
        if (sf === "none" && qf === "none") return null;
        return { sf, qf };
      }
    }
    return null;
  }, [row.key, settings.calculations.rows]);

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
          top: rowIndex * rowHeight,
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
          top: rowIndex * rowHeight,
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
          top: rowIndex * rowHeight,
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
        top: rowIndex * rowHeight,
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

        const cell = getCellValue(cellMap, row.key, colKey, mIdx);
        const editKey = `${row.key}|${colKey}|${mIdx}`;
        const rawEdit = manualEdits[editKey];

        let displayValue = cell?.value ?? null;
        let displayFormatted = cell?.formattedValue ?? "—";

        const isEdited = rawEdit !== undefined;

        if (isEdited) {
          const editStr = String(rawEdit);
          // For direct value overrides, show the new value immediately.
          // For formula-based edits (starting with '='), rely on the
          // evaluated result from the model's cellMap instead of
          // displaying the raw formula text in the grid.
          if (!editStr.startsWith("=")) {
            const parsed = parseFloat(editStr);
            if (!Number.isNaN(parsed)) {
              displayValue = parsed;
              displayFormatted = parsed.toLocaleString();
            } else {
              displayFormatted = editStr;
            }
          }
        }

        const cellStyle = getCellStyle(row.key, colKey, mIdx, displayValue);
        const prevCell = prevRowKey ? getCellValue(cellMap, prevRowKey, colKey, mIdx) : undefined;
        const range = getDataBarRange(row.key, colKey, mIdx);

        const isActive = !!(activeCell && activeCell.rowKey === row.key && activeCell.colKey === colKey && activeCell.measureIndex === mIdx);
        const hasNote = !!manualNotes[editKey];
        const isColSelected = !!selectedColumnKeys?.has(`${colKey}::m${mIdx}`);

        // Apply per-column direct formatting (bold/italic/bg/color/align/quickFormat).
        // Apply logical identity column formatting (Measure Global -> Dimension Global -> Specific).
        const thisColFormat = resolveColumnFormat(colFormats, colKey, mIdx);

        // Quick-format scales the displayed numeric value and re-renders it
        // with the chosen precision. Non-numeric / null cells are untouched.
        const globalQuickFormat = (settings.values as any).quickFormat || "none";
        const currentQF = thisColFormat?.quickFormat || globalQuickFormat;
        const currentNF = thisColFormat?.numberFormat || settings.values.numberFormat || "";
        const currentDecimals = thisColFormat?.decimals ?? settings.values.decimals;

        if (displayValue !== null && !Number.isNaN(displayValue)) {
          if (currentQF && currentQF !== "none") {
            // If we have a Quick Format (scaling), we scale it first.
            const scaledValue = displayValue / quickFormatDivisor(currentQF, displayValue);
            const decimals = currentDecimals ?? 1;
            
            if (currentNF) {
              // If there's ALSO a number format (e.g. %), apply it to the scaled value.
              displayFormatted = formatValue(scaledValue, currentNF);
            } else {
              // Otherwise use standard quick format display.
              displayFormatted = formatQuickNumber(displayValue, currentQF, decimals);
            }
          } else if (currentNF) {
            // Number format only (%, $, comma). Apply with decimals if set.
            if (currentNF.includes("%")) {
              const dec = currentDecimals ?? 1;
              displayFormatted = displayValue.toLocaleString(undefined, {
                style: "percent",
                minimumFractionDigits: dec,
                maximumFractionDigits: dec,
              });
            } else if (currentNF.includes("$")) {
              const dec = currentDecimals ?? 2;
              displayFormatted = displayValue.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: dec,
                maximumFractionDigits: dec,
              });
            } else {
              displayFormatted = formatValue(displayValue, currentNF);
            }
          } else if (currentDecimals !== undefined && currentDecimals !== null) {
            // Decimals-only adjustment (no special format, no scaling).
            displayFormatted = displayValue.toLocaleString(undefined, {
              minimumFractionDigits: currentDecimals,
              maximumFractionDigits: currentDecimals,
            });
          }
        }

        // Row-level scaling + quick-format (for calculated rows). 
        if (calcRowFormat && displayValue !== null && !Number.isNaN(displayValue)) {
          const scaled = (() => {
            const qf = scalingToQuick(calcRowFormat.sf);
            if (!qf) return displayValue;
            return displayValue / quickFormatDivisor(qf, displayValue);
          })();

          if (calcRowFormat.qf !== "none") {
            displayFormatted = applyRowQuickFormat(scaled, calcRowFormat.qf);
          } else if (calcRowFormat.sf !== "none") {
            displayFormatted = formatQuickNumber(
              displayValue,
              scalingToQuick(calcRowFormat.sf),
              undefined
            );
          }
        }

        const composedStyle = composeCellStyle(settings, cellStyle, thisColFormat, thisRowFormat, row.isSubtotal, row.isGrandTotal);
        const composedAlign = resolveAlignment(settings, thisColFormat, thisRowFormat);

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
