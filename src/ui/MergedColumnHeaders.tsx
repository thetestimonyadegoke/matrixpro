/**
 * Merged Column Headers Component
 * Renders multi-level column headers with Year above Months style merging
 */

import React, { memo, useMemo } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { SortConfig, SortDirection } from "../model/sorting";
import { ColumnFormat, quickFormatHeaderLabel, resolveColumnFormat } from "../format/directFormats";
import { VisualSettings } from "../settings/settings";

export type ColumnArrangement = "time-then-measure" | "measure-then-time";

export interface MergedColumnHeadersProps {
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  arrangement: ColumnArrangement;
  sortConfig: SortConfig;
  onSort: (columnKey: string, measureIndex: number) => void;
  onContextMenu: (e: React.MouseEvent, columnKey?: string, measureIndex?: number) => void;
  allowInteractions: boolean;
  rowHeaderWidth: number;
  columnWidth: number;
  scrollLeft: number;
  totalContentWidth: number;
  selectedColumnKeys?: Set<string>;
  onColumnHeaderClick?: (
    columnKey: string,
    measureIndex: number,
    modifiers: { ctrl: boolean; shift: boolean },
    selectionKeys?: string[]
  ) => void;
  onStartResize: (clientX: number) => void;
  onStartRowHeaderResize: (clientX: number) => void;
  /** Per-column direct formats, keyed by "<colKey>::m<measureIndex>". */
  colFormats?: Record<string, ColumnFormat>;
  colWidths: Record<string, number>;
  gridColumns?: { key: string; col: FlattenedNode; measure: MeasureInfo; measureIndex: number }[];
  settings: VisualSettings;
  labelOverrides?: Record<string, string>;
}

interface HeaderCell {
  key: string;
  label: string;
  colSpan: number;
  level: number;
  isLeaf: boolean;
  columnKey?: string;
  measureIndex?: number;
  selectionKeys?: string[];
  sortDirection?: SortDirection;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

interface HeaderRow {
  level: number;
  cells: HeaderCell[];
}

export const MergedColumnHeaders: React.FC<MergedColumnHeadersProps> = memo(({
  columns,
  measures,
  arrangement,
  sortConfig,
  onSort,
  onContextMenu,
  allowInteractions,
  rowHeaderWidth,
  columnWidth,
  scrollLeft,
  totalContentWidth,
  selectedColumnKeys,
  onColumnHeaderClick,
  onStartResize,
  onStartRowHeaderResize,
  colFormats,
  colWidths,
  gridColumns = [],
  settings,
  labelOverrides,
}) => {
  const headerRows = useMemo(() => {
    return buildMergedHeaders(columns, measures, arrangement, sortConfig, gridColumns);
  }, [columns, measures, arrangement, sortConfig, gridColumns]);

  const handleHeaderClick = (
    e: React.MouseEvent,
    cell: HeaderCell
  ) => {
    if (!allowInteractions || !cell.selectionKeys?.length) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const fallbackColumnKey = cell.columnKey ?? cell.selectionKeys[0].split("::m")[0];
    const fallbackMeasureIndex = cell.measureIndex ?? Number(cell.selectionKeys[0].split("::m")[1] ?? 0);
    onColumnHeaderClick?.(fallbackColumnKey, fallbackMeasureIndex, { ctrl, shift }, cell.selectionKeys);
    // Preserve existing sort behavior only on plain clicks (no modifier),
    // so Ctrl/Shift clicks are reserved for multi-select without side effects.
    if (cell.isLeaf && cell.columnKey !== undefined && cell.measureIndex !== undefined && !ctrl && !shift) {
      onSort(cell.columnKey, cell.measureIndex);
    }
  };

  return (
    <div className="merged-column-headers">
      {headerRows.map((row, rowIndex) => (
        <div
          key={`header-row-${rowIndex}`}
          className={`merged-header-row level-${row.level}`}
          style={{ flexShrink: 0 }}
        >
          {/* Fixed row header corner for all header rows */}
          <div
            className="merged-header-cell corner"
            style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
          >
            {rowIndex === headerRows.length - 2
              ? "Columns"
              : rowIndex === headerRows.length - 1
                ? "Rows"
                : ""}
            <div 
              className="row-header-width-resize-handle" 
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 5,
                cursor: "col-resize",
                zIndex: 10
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartRowHeaderResize(e.clientX);
              }}
            />
          </div>

          {/* Scrollable header track synced with body scroll */}
          <div
            className="merged-header-row-track"
            style={{
              width: totalContentWidth,
              transform: `translateX(-${scrollLeft}px)`,
            }}
          >
            {row.cells.map((cell, cellIndex) => {
              const compositeKey = cell.isLeaf && cell.columnKey !== undefined && cell.measureIndex !== undefined
                ? `${cell.columnKey}::m${cell.measureIndex}`
                : undefined;
              const selectionKeys = cell.selectionKeys ?? (compositeKey ? [compositeKey] : []);
              const isColSelected = selectionKeys.length > 0 && selectionKeys.some(key => selectedColumnKeys?.has(key));
              const firstSelectionParts = selectionKeys[0]?.split("::m") ?? [];
              const firstSelectionMeasure = firstSelectionParts.length > 1 ? Number(firstSelectionParts[1]) : undefined;
              const colFmt = cell.columnKey !== undefined && cell.measureIndex !== undefined
                ? resolveColumnFormat(colFormats || {}, cell.columnKey, cell.measureIndex)
                : selectionKeys[0]?.startsWith("m:")
                  ? colFormats?.[selectionKeys[0]]
                : firstSelectionParts[0] && firstSelectionMeasure !== undefined
                  ? resolveColumnFormat(colFormats || {}, firstSelectionParts[0], firstSelectionMeasure)
                  : undefined;
              const totalStyle = getTotalHeaderStyle(settings, cell.isSubtotal, cell.isGrandTotal);
              const suffix = quickFormatHeaderLabel(colFmt?.quickFormat);
              const baseLabel = (labelOverrides && (cell.columnKey ? labelOverrides[cell.columnKey] : (cell.measureIndex !== undefined ? labelOverrides[`m_${cell.measureIndex}`] : undefined))) || cell.label;
              const displayLabel = suffix ? `${baseLabel} ${suffix}` : baseLabel;
              const headerBreakStyle = row.level === 0 && cellIndex > 0 && settings.layout.columnBreak !== "none"
                ? settings.layout.columnBreak === "section"
                  ? "3px double var(--mx-border, #cbd5e1)"
                  : "2px solid var(--mx-border, #cbd5e1)"
                : undefined;
              const presetBackground =
                !cell.isSubtotal && !cell.isGrandTotal && !colFmt?.backgroundColor
                  ? settings.layout.stylePreset === "ledger"
                    ? row.level === 0 ? "#f8fafc" : undefined
                    : settings.layout.stylePreset === "editorial"
                      ? row.level === 0 ? "#fcfaf7" : row.level === 1 ? "#fffaf0" : undefined
                      : undefined
                  : undefined;

              // Calculate width based on underlying columns
              let currentIdx = 0;
              for (let i = 0; i < cellIndex; i++) {
                currentIdx += row.cells[i].colSpan;
              }

              let width = 0;
              for (let i = 0; i < cell.colSpan; i++) {
                const gc = gridColumns[currentIdx + i];
                if (gc) {
                  width += colWidths[gc.col.key] || columnWidth;
                } else {
                  width += columnWidth;
                }
              }

              return (
              <div
                key={`${cell.key}-${cellIndex}`}
                className={`merged-header-cell ${cell.isLeaf ? "leaf" : "group"} ${cell.sortDirection && cell.sortDirection !== "none" ? "sorted" : ""} ${isColSelected ? "col-selected" : ""}`}
                style={{
                  width: width,
                  minWidth: width,
                  ...totalStyle,
                  ...(presetBackground ? { backgroundColor: presetBackground } : {}),
                  ...(colFmt?.backgroundColor ? { backgroundColor: colFmt.backgroundColor } : {}),
                  ...(headerBreakStyle ? { borderLeft: headerBreakStyle } : {}),
                }}
                onClick={(e) => handleHeaderClick(e, cell)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, cell.columnKey, cell.measureIndex);
                }}
                role={selectionKeys.length > 0 ? "button" : undefined}
                tabIndex={selectionKeys.length > 0 && allowInteractions ? 0 : undefined}
              >
                <span 
                  className="merged-header-label"
                  style={{
                    color: colFmt?.textColor || totalStyle.color || (cell.level === 0 ? "var(--mx-col-l0-color)" : (cell.level === 1 ? "var(--mx-col-l1-color)" : (cell.isLeaf ? "var(--mx-col-leaf-color)" : "inherit"))),
                    fontWeight: colFmt?.bold ? 800 : undefined,
                    fontStyle: colFmt?.italic ? "italic" : undefined,
                    textDecoration: colFmt?.underline ? "underline" : undefined,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    textAlign: "center",
                    display: "block",
                    width: "100%",
                  }}
                >
                  {displayLabel}
                </span>
                {cell.isLeaf && cell.sortDirection && cell.sortDirection !== "none" && (
                  <span className="merged-header-sort-icon">
                    {cell.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
                {cell.isLeaf && (
                  <div 
                    className="col-resize-handle" 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStartResize(e.clientX);
                    }}
                  />
                )}
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

MergedColumnHeaders.displayName = "MergedColumnHeaders";

function getTotalHeaderStyle(
  settings: VisualSettings,
  isSubtotal?: boolean,
  isGrandTotal?: boolean
): React.CSSProperties {
  if (isGrandTotal) {
    return {
      backgroundColor: settings.totals.grandTotalBackgroundColor,
      color: settings.totals.grandTotalTextColor,
      fontWeight: settings.totals.grandTotalBold ? 700 : undefined,
    };
  }

  if (isSubtotal) {
    return {
      backgroundColor: settings.totals.subtotalBackgroundColor,
      color: settings.totals.subtotalTextColor,
      fontWeight: settings.totals.subtotalBold ? 700 : undefined,
    };
  }

  return {};
}

function buildMergedHeaders(
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  arrangement: ColumnArrangement,
  sortConfig: SortConfig,
  gridColumns?: { key: string; col: FlattenedNode; measure: MeasureInfo; measureIndex: number }[]
): HeaderRow[] {
  if (gridColumns && gridColumns.length > 0) {
    return buildHeadersFromGridColumns(gridColumns, arrangement, sortConfig);
  }

  if (columns.length === 0) {
    return buildMeasureOnlyHeaders(measures, sortConfig);
  }

  // Determine max depth of column hierarchy
  const maxLevel = Math.max(...columns.map(c => c.level), 0);

  if (arrangement === "time-then-measure") {
    return buildTimeFirstHeaders(columns, measures, maxLevel, sortConfig);
  } else {
    return buildMeasureFirstHeaders(columns, measures, maxLevel, sortConfig);
  }
}

function buildHeadersFromGridColumns(
  gridColumns: { key: string; col: FlattenedNode; measure: MeasureInfo; measureIndex: number }[],
  arrangement: ColumnArrangement,
  sortConfig: SortConfig
): HeaderRow[] {
  const maxDepth = Math.max(...gridColumns.map(gc => Math.max(1, gc.col.path?.length || 1)), 1);

  if (arrangement === "measure-then-time") {
    const rows: HeaderRow[] = [];
    const measureCells: HeaderCell[] = [];
    for (let i = 0; i < gridColumns.length; i++) {
      const gc = gridColumns[i];
      measureCells.push({
        key: `measure-top-${gc.key}-${i}`,
        label: gc.measure.name,
        colSpan: 1,
        level: 0,
        isLeaf: false,
        selectionKeys: [`m:${gc.measureIndex}`],
        isSubtotal: gc.col.isSubtotal,
        isGrandTotal: gc.col.isGrandTotal,
      });
    }
    rows.push({ level: 0, cells: measureCells });

    for (let level = 0; level < maxDepth; level++) {
      rows.push({
        level: level + 1,
        cells: buildContiguousHeaderCells(gridColumns, level, sortConfig, level === maxDepth - 1),
      });
    }
    return rows.filter(row => row.cells.length > 0);
  }

  const rows: HeaderRow[] = [];
  for (let level = 0; level < maxDepth; level++) {
    const cells = buildContiguousHeaderCells(gridColumns, level, sortConfig, false);
    if (cells.length > 0) rows.push({ level, cells });
  }

  rows.push({
    level: maxDepth,
    cells: gridColumns.map((gc, index) => ({
      key: `measure-${gc.key}-${index}`,
      label: gc.measure.name,
      colSpan: 1,
      level: maxDepth,
      isLeaf: true,
      columnKey: gc.col.key,
      measureIndex: gc.measureIndex,
      selectionKeys: [`m:${gc.measureIndex}`],
      isSubtotal: gc.col.isSubtotal,
      isGrandTotal: gc.col.isGrandTotal,
      sortDirection: sortConfig.columnKey === gc.col.key && sortConfig.measureIndex === gc.measureIndex
        ? sortConfig.direction
        : "none",
    })),
  });

  return rows;
}

function buildContiguousHeaderCells(
  gridColumns: { key: string; col: FlattenedNode; measure: MeasureInfo; measureIndex: number }[],
  level: number,
  sortConfig: SortConfig,
  asLeaf: boolean
): HeaderCell[] {
  const cells: HeaderCell[] = [];
  let index = 0;

  while (index < gridColumns.length) {
    const current = gridColumns[index];
    const groupPath = (current.col.path || []).slice(0, level + 1).map(value => String(value ?? ""));
    const groupKey = groupPath.join("\u0001") || current.col.key;
    const groupLabel = groupPath[groupPath.length - 1] || current.col.label || "";
    let span = 1;

    while (index + span < gridColumns.length) {
      const next = gridColumns[index + span];
      const nextPath = (next.col.path || []).slice(0, level + 1).map(value => String(value ?? ""));
      const nextKey = nextPath.join("\u0001") || next.col.key;
      if (nextKey !== groupKey) break;
      span++;
    }

    cells.push({
      key: `grid-${level}-${current.col.key}-${index}`,
      label: groupLabel,
      colSpan: span,
      level,
      isLeaf: asLeaf && span === 1,
      columnKey: asLeaf && span === 1 ? current.col.key : undefined,
      measureIndex: asLeaf && span === 1 ? current.measureIndex : undefined,
      selectionKeys: gridColumns.slice(index, index + span).map(gc => gc.key),
      isSubtotal: current.col.isSubtotal,
      isGrandTotal: current.col.isGrandTotal,
      sortDirection: asLeaf && span === 1 && sortConfig.columnKey === current.col.key && sortConfig.measureIndex === current.measureIndex
        ? sortConfig.direction
        : "none",
    });
    index += span;
  }

  return cells;
}

function buildMeasureOnlyHeaders(
  measures: MeasureInfo[],
  sortConfig: SortConfig
): HeaderRow[] {
  const cells: HeaderCell[] = measures.map((m, i) => ({
    key: `measure-${i}`,
    label: m.name,
    colSpan: 1,
    level: 0,
    isLeaf: true,
    columnKey: `col:measure_${i}`,
    measureIndex: i,
    selectionKeys: [`m:${i}`],
    sortDirection: sortConfig.columnKey === `col:measure_${i}` && sortConfig.measureIndex === i
      ? sortConfig.direction
      : "none",
  }));

  return [{ level: 0, cells }];
}

function buildTimeFirstHeaders(
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  maxLevel: number,
  sortConfig: SortConfig
): HeaderRow[] {
  const rows: HeaderRow[] = [];

  // Build hierarchy levels (Year, Quarter, Month, etc.)
  for (let level = 0; level <= maxLevel; level++) {
    const cells: HeaderCell[] = [];
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (col.level === level) {
        // This column is at current level - count how many visual leaf descendants
        const leafCount = countLeafDescendants(i, columns);
        const totalSpan = leafCount * measures.length;

        cells.push({
          key: `col-${col.key}-${level}`,
          label: col.label,
          colSpan: totalSpan,
          level,
          isLeaf: false,
          selectionKeys: collectLegacySelectionKeys(i, columns, measures),
          isSubtotal: col.isSubtotal,
          isGrandTotal: col.isGrandTotal,
        });
      }
    }

    if (cells.length > 0) {
      rows.push({ level, cells });
    }
  }

  // Add measure row at the bottom
  const measureCells: HeaderCell[] = [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const nextCol = columns[i + 1];

    // Bottom measure cells only appear under visual leaves
    if (col.isLeaf || col.isSubtotal || !nextCol || nextCol.level <= col.level) {
      for (let m = 0; m < measures.length; m++) {
        measureCells.push({
          key: `measure-${col.key}-${m}`,
          label: measures[m].name,
          colSpan: 1,
          level: maxLevel + 1,
          isLeaf: true,
          columnKey: col.key,
          measureIndex: m,
          selectionKeys: [`m:${m}`],
          isSubtotal: col.isSubtotal,
          isGrandTotal: col.isGrandTotal,
          sortDirection: sortConfig.columnKey === col.key && sortConfig.measureIndex === m
            ? sortConfig.direction
            : "none",
        });
      }
    }
  }

  if (measureCells.length > 0) {
    rows.push({ level: maxLevel + 1, cells: measureCells });
  }

  return rows;
}

function buildMeasureFirstHeaders(
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  maxLevel: number,
  sortConfig: SortConfig
): HeaderRow[] {
  const rows: HeaderRow[] = [];
    const leafColumns = columns.filter((c, i) => isVisualLeaf(c, i, columns));


  // Measure row at top
  const measureCells: HeaderCell[] = measures.map((m, i) => ({
    key: `measure-top-${i}`,
    label: m.name,
    colSpan: leafColumns.length,
    level: 0,
    isLeaf: false,
    selectionKeys: [`m:${i}`],
  }));

  rows.push({ level: 0, cells: measureCells });

  // Time hierarchy rows below
  for (let level = 0; level <= maxLevel; level++) {
    const cells: HeaderCell[] = [];

    for (let m = 0; m < measures.length; m++) {
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col.level === level) {
          const leafCount = countLeafDescendants(i, columns);
          cells.push({
            key: `col-${col.key}-${level}-m${m}`,
            label: col.label,
            colSpan: leafCount,
            level: level + 1,
            isLeaf: level === maxLevel,
            columnKey: level === maxLevel ? col.key : undefined,
            measureIndex: level === maxLevel ? m : undefined,
            selectionKeys: level === maxLevel ? [`m:${m}`] : collectLegacySelectionKeys(i, columns, [measures[m]], m),
            isSubtotal: col.isSubtotal,
            isGrandTotal: col.isGrandTotal,
            sortDirection: level === maxLevel && sortConfig.columnKey === col.key && sortConfig.measureIndex === m
              ? sortConfig.direction
              : "none",
          });
        }
      }
    }

    if (cells.length > 0) {
      rows.push({ level: level + 1, cells });
    }
  }

  return rows;
}

function countLeafDescendants(nodeIndex: number, allColumns: FlattenedNode[]): number {
  const node = allColumns[nodeIndex];

  // If it's already a visual leaf, count is 1
  const next = allColumns[nodeIndex + 1];
  if (node.isLeaf || node.isSubtotal || !next || next.level <= node.level) {
    return 1;
  }

  let count = 0;
  for (let i = nodeIndex + 1; i < allColumns.length; i++) {
    const col = allColumns[i];
    const nextCol = allColumns[i + 1];

    // Stop if we exit the parent branch
    if (col.level <= node.level) break;

    // Count if this node is a visual leaf OR a subtotal
    if (col.isLeaf || col.isSubtotal || !nextCol || nextCol.level <= col.level) {
      count++;
    }
  }

  return count || 1;
}

function isVisualLeaf(node: FlattenedNode, nodeIndex: number, allColumns: FlattenedNode[]): boolean {
  const next = allColumns[nodeIndex + 1];
  return node.isLeaf || node.isSubtotal || !next || next.level <= node.level;
}

function collectLegacySelectionKeys(
  nodeIndex: number,
  allColumns: FlattenedNode[],
  measures: MeasureInfo[],
  measureOffset = 0
): string[] {
  const node = allColumns[nodeIndex];
  const keys: string[] = [];
  const addMeasureKeys = (col: FlattenedNode) => {
    measures.forEach((_, idx) => keys.push(`${col.key}::m${measureOffset + idx}`));
  };

  if (isVisualLeaf(node, nodeIndex, allColumns)) {
    addMeasureKeys(node);
    return keys;
  }

  for (let i = nodeIndex + 1; i < allColumns.length; i++) {
    const col = allColumns[i];
    if (col.level <= node.level) break;
    if (isVisualLeaf(col, i, allColumns)) addMeasureKeys(col);
  }

  return keys;
}
