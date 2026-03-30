/**
 * Merged Column Headers Component
 * Renders multi-level column headers with Year above Months style merging
 */

import React, { memo, useMemo } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { SortConfig, SortDirection } from "../model/sorting";

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
}

interface HeaderCell {
  key: string;
  label: string;
  colSpan: number;
  level: number;
  isLeaf: boolean;
  columnKey?: string;
  measureIndex?: number;
  sortDirection?: SortDirection;
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
}) => {
  const headerRows = useMemo(() => {
    return buildMergedHeaders(columns, measures, arrangement, sortConfig);
  }, [columns, measures, arrangement, sortConfig]);

  const handleSort = (columnKey: string | undefined, measureIndex: number | undefined) => {
    if (!allowInteractions || columnKey === undefined || measureIndex === undefined) return;
    onSort(columnKey, measureIndex);
  };

  return (
    <div className="merged-column-headers">
      {headerRows.map((row, rowIndex) => (
        <div
          key={`header-row-${rowIndex}`}
          className={`merged-header-row level-${row.level}`}
        >
          {/* Fixed row header corner for all header rows */}
          <div
            className="merged-header-cell corner"
            style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
          >
            {rowIndex === headerRows.length - 1
              ? "Rows"
              : rowIndex === headerRows.length - 2
                ? "Columns"
                : ""}
          </div>

          {/* Scrollable header track synced with body scroll */}
          <div
            className="merged-header-row-track"
            style={{
              width: totalContentWidth,
              transform: `translateX(-${scrollLeft}px)`,
            }}
          >
            {row.cells.map((cell, cellIndex) => (
              <div
                key={`${cell.key}-${cellIndex}`}
                className={`merged-header-cell ${cell.isLeaf ? "leaf" : "group"} ${cell.sortDirection && cell.sortDirection !== "none" ? "sorted" : ""
                  }`}
                style={{
                  width: cell.colSpan * columnWidth,
                  minWidth: cell.colSpan * columnWidth,
                }}
                onClick={() => cell.isLeaf && handleSort(cell.columnKey, cell.measureIndex)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, cell.columnKey, cell.measureIndex);
                }}
                role={cell.isLeaf ? "button" : undefined}
                tabIndex={cell.isLeaf && allowInteractions ? 0 : undefined}
              >
                <span className="merged-header-label">{cell.label}</span>
                {cell.isLeaf && cell.sortDirection && cell.sortDirection !== "none" && (
                  <span className="merged-header-sort-icon">
                    {cell.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

MergedColumnHeaders.displayName = "MergedColumnHeaders";

function buildMergedHeaders(
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  arrangement: ColumnArrangement,
  sortConfig: SortConfig
): HeaderRow[] {
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
    let currentGroup: { label: string; count: number; key: string } | null = null;

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
  const leafColumns = columns.filter(c => !c.hasChildren || c.level === maxLevel);

  // Measure row at top
  const measureCells: HeaderCell[] = measures.map((m, i) => ({
    key: `measure-top-${i}`,
    label: m.name,
    colSpan: leafColumns.length,
    level: 0,
    isLeaf: false,
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
