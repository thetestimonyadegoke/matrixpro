import React, { memo } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { SortConfig } from "../model/sorting";
import { ViewportRange } from "../virtualization/viewport";
import { getHeaderStyle } from "../format/styles";

type GridColumn = {
  key: string;
  col: FlattenedNode;
  measure: MeasureInfo;
  measureIndex: number;
};

export interface HeaderProps {
  columns: FlattenedNode[];
  visibleColumns: GridColumn[];
  visibleRange: ViewportRange;
  measures: MeasureInfo[];
  settings: VisualSettings;
  sortConfig: SortConfig;
  columnWidth: number;
  totalWidth: number;
  scrollLeft: number;
  onSort: (columnKey: string, measureIndex: number) => void;
  onToggleExpand: (nodeKey: string) => void;
  onStartResize: (clientX: number) => void;
}

export const Header: React.FC<HeaderProps> = memo(({
  columns,
  visibleColumns,
  visibleRange,
  measures,
  settings,
  sortConfig,
  columnWidth,
  totalWidth,
  scrollLeft,
  onSort,
  onToggleExpand,
  onStartResize,
}) => {
  const headerStyle = getHeaderStyle(settings);

  const handleColumnClick = (col: FlattenedNode, measureIndex: number) => {
    onSort(col.key, measureIndex);
  };

  const getSortIndicator = (colKey: string, measureIndex: number) => {
    if (sortConfig.columnKey === colKey && sortConfig.measureIndex === measureIndex) {
      return sortConfig.direction === "asc" ? "▲" : sortConfig.direction === "desc" ? "▼" : "";
    }
    return "";
  };

  return (
    <div
      className="matrix-col-headers-inner"
      style={{
        width: totalWidth,
        transform: `translateX(-${scrollLeft}px)`,
      }}
    >
      {measures.length > 0 && columns.length > 0 && (
        <div className="matrix-col-header-row" style={{ display: "flex" }}>
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
            const baseLabel = settings.layout.mode === "table"
              ? gridCol.col.path.map(v => String(v)).join(" / ")
              : gridCol.col.label;

            const label = measures.length > 1
              ? (baseLabel ? `${baseLabel} ${gridCol.measure.name}` : gridCol.measure.name)
              : (baseLabel || gridCol.measure.name);

            return (
              <div
                key={gridCol.key}
                className="matrix-col-header-cell sortable"
                style={{
                  ...headerStyle,
                  width: columnWidth,
                  minWidth: columnWidth,
                  height: 28,
                }}
                onClick={() => handleColumnClick(gridCol.col, gridCol.measureIndex)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleColumnClick(gridCol.col, gridCol.measureIndex);
                  }
                }}
                title={`${gridCol.col.label} - ${gridCol.measure.name}`}
              >
                {settings.layout.mode !== "table" && gridCol.col.hasChildren && gridCol.measureIndex === 0 && (
                  <span
                    className="expand-toggle"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(gridCol.col.key);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleExpand(gridCol.col.key);
                      }
                    }}
                  >
                    {gridCol.col.isExpanded ? "−" : "+"}
                  </span>
                )}
                <span className="col-label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {label}
                </span>
                <span className="sort-indicator">
                  {getSortIndicator(gridCol.col.key, gridCol.measureIndex)}
                </span>

                <span
                  className="col-resize-handle"
                  role="presentation"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStartResize(e.clientX);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {measures.length > 0 && columns.length === 0 && (
        <div className="matrix-col-header-row" style={{ display: "flex" }}>
          {visibleRange.startCol > 0 && (
            <div
              style={{
                width: visibleRange.startCol * columnWidth,
                minWidth: visibleRange.startCol * columnWidth,
                flexShrink: 0,
              }}
            />
          )}

          {measures.map((measure, mIdx) => (
            <div
              key={`measure-${mIdx}`}
              className="matrix-col-header-cell sortable"
              style={{
                ...headerStyle,
                width: columnWidth,
                minWidth: columnWidth,
                height: 28,
              }}
              onClick={() => onSort(`col:measure_${mIdx}`, mIdx)}
              title={measure.name}
            >
              <span className="col-label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {measure.name}
              </span>
              <span className="sort-indicator">
                {getSortIndicator(`col:measure_${mIdx}`, mIdx)}
              </span>

              <span
                className="col-resize-handle"
                role="presentation"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStartResize(e.clientX);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

Header.displayName = "Header";
