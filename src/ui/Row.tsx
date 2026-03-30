import React, { memo } from "react";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { ViewportRange } from "../virtualization/viewport";
import { CellStyle } from "../format/conditional";
import { Cell } from "./Cell";
import { getRowStyle } from "../format/styles";

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
  onCellClick: (colKey: string, measureIndex: number, colIndex: number) => void;
  activeCell: { rowKey: string; colKey: string; measureIndex: number } | null;
}

export const Row: React.FC<RowProps> = memo(({
  row,
  rowIndex,
  prevRowKey,
  visibleColumns,
  visibleRange,
  cellMap,
  measures,
  settings,
  isSelected,
  sparklineMeasureIndex,
  rowHeight,
  columnWidth,
  getCellStyle,
  getDataBarRange,
  onClick,
  onContextMenu,
  onCellClick,
  activeCell,
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
            width: visibleRange.startCol * columnWidth,
            minWidth: visibleRange.startCol * columnWidth,
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

        return (
          <Cell
            key={gridCol.key}
            value={displayValue}
            formattedValue={displayFormatted}
            columnIndex={actualColIndex}
            measureIndex={mIdx}
            columnWidth={columnWidth}
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
            onClick={() => onCellClick(colKey, mIdx, actualColIndex)}
          />
        );
      })}
    </div>
  );
});

Row.displayName = "Row";
