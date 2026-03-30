import React, { memo, useCallback, useState } from "react";
import { MatrixModel } from "../model/pivot";
import { IconColumns, IconRows, IconReset } from "./icons";

export interface ExplorerPanelProps {
  model: MatrixModel;
  width: number;
  allowInteractions: boolean;
  onClose: () => void;
  onToggleRowExpand: (nodeKey: string) => void;
  onToggleColumnExpand: (nodeKey: string) => void;
  onResetRowExpansion: () => void;
  onResetColumnExpansion: () => void;
  onDrillRowToLevel: (level: number) => void;
  onDrillColumnToLevel: (level: number) => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = memo(({
  model,
  width,
  allowInteractions,
  onClose,
  onToggleRowExpand,
  onToggleColumnExpand,
  onResetRowExpansion,
  onResetColumnExpansion,
  onDrillRowToLevel,
  onDrillColumnToLevel,
}) => {
  const canInteractRows = allowInteractions && model.hasData && model.flattenedRows.length > 0;
  const canInteractCols = allowInteractions && model.hasData && model.flattenedColumns.length > 0;

  const [rowDrillLevel, setRowDrillLevel] = useState(model.rowLevelCount);
  const [colDrillLevel, setColDrillLevel] = useState(model.columnLevelCount);

  const handleRowDrillChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(e.target.value, 10);
    setRowDrillLevel(level);
    onDrillRowToLevel(level);
  }, [onDrillRowToLevel]);

  const handleColDrillChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(e.target.value, 10);
    setColDrillLevel(level);
    onDrillColumnToLevel(level);
  }, [onDrillColumnToLevel]);

  const rowLevelOptions = Array.from({ length: model.rowLevelCount }, (_, i) => i + 1);
  const colLevelOptions = Array.from({ length: model.columnLevelCount }, (_, i) => i + 1);

  const collapseAllRows = useCallback(() => {
    if (!canInteractRows) return;
    const keys = Array.from(
      new Set(
        model.flattenedRows
          .filter(r => r.hasChildren && r.isExpanded)
          .map(r => r.key)
      )
    );
    keys.forEach(onToggleRowExpand);
  }, [canInteractRows, model.flattenedRows, onToggleRowExpand]);

  const expandAllRows = useCallback(() => {
    if (!canInteractRows) return;
    const keys = Array.from(
      new Set(
        model.flattenedRows
          .filter(r => r.hasChildren && !r.isExpanded)
          .map(r => r.key)
      )
    );
    keys.forEach(onToggleRowExpand);
  }, [canInteractRows, model.flattenedRows, onToggleRowExpand]);

  const collapseAllColumns = useCallback(() => {
    if (!canInteractCols) return;
    const keys = Array.from(
      new Set(
        model.flattenedColumns
          .filter(c => c.hasChildren && c.isExpanded)
          .map(c => c.key)
      )
    );
    keys.forEach(onToggleColumnExpand);
  }, [canInteractCols, model.flattenedColumns, onToggleColumnExpand]);

  const expandAllColumns = useCallback(() => {
    if (!canInteractCols) return;
    const keys = Array.from(
      new Set(
        model.flattenedColumns
          .filter(c => c.hasChildren && !c.isExpanded)
          .map(c => c.key)
      )
    );
    keys.forEach(onToggleColumnExpand);
  }, [canInteractCols, model.flattenedColumns, onToggleColumnExpand]);

  return (
    <div className="mx-explorer" style={{ width }} aria-label="Explorer">
      <div className="mx-explorer-header">
        <div className="mx-explorer-title">Explorer</div>
        <button className="mx-explorer-close" onClick={onClose} type="button" aria-label="Close Explorer">×</button>
      </div>

      <div className="mx-explorer-body">
        <div className="mx-explorer-section">
          <div className="mx-explorer-section-title">
            <IconRows size={16} title="Rows" />
            <span>Rows</span>
          </div>
          <div className="mx-explorer-meta">Levels: {model.rowLevelCount}</div>
          <div className="mx-explorer-meta">Visible nodes: {model.flattenedRows.length}</div>
          <div className="mx-explorer-actions">
            <button
              type="button"
              className="mx-explorer-action"
              onClick={collapseAllRows}
              disabled={!canInteractRows}
            >
              Collapse all
            </button>
            <button
              type="button"
              className="mx-explorer-action"
              onClick={expandAllRows}
              disabled={!canInteractRows}
            >
              Expand all
            </button>
            <button
              type="button"
              className="mx-explorer-action"
              onClick={onResetRowExpansion}
              disabled={!canInteractRows}
              title="Reset to default expansion"
            >
              <IconReset size={12} /> Reset
            </button>
          </div>
          {model.rowLevelCount > 1 && (
            <div className="mx-explorer-drill">
              <label className="mx-explorer-drill-label">Drill to level:</label>
              <select
                className="mx-explorer-drill-select"
                value={rowDrillLevel}
                onChange={handleRowDrillChange}
                disabled={!canInteractRows}
              >
                {rowLevelOptions.map(lvl => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mx-explorer-section">
          <div className="mx-explorer-section-title">
            <IconColumns size={16} title="Columns" />
            <span>Columns</span>
          </div>
          <div className="mx-explorer-meta">Levels: {model.columnLevelCount}</div>
          <div className="mx-explorer-meta">Visible nodes: {model.flattenedColumns.length}</div>
          <div className="mx-explorer-actions">
            <button
              type="button"
              className="mx-explorer-action"
              onClick={collapseAllColumns}
              disabled={!canInteractCols}
            >
              Collapse all
            </button>
            <button
              type="button"
              className="mx-explorer-action"
              onClick={expandAllColumns}
              disabled={!canInteractCols}
            >
              Expand all
            </button>
            <button
              type="button"
              className="mx-explorer-action"
              onClick={onResetColumnExpansion}
              disabled={!canInteractCols}
              title="Reset to default expansion"
            >
              <IconReset size={12} /> Reset
            </button>
          </div>
          {model.columnLevelCount > 1 && (
            <div className="mx-explorer-drill">
              <label className="mx-explorer-drill-label">Drill to level:</label>
              <select
                className="mx-explorer-drill-select"
                value={colDrillLevel}
                onChange={handleColDrillChange}
                disabled={!canInteractCols}
              >
                {colLevelOptions.map(lvl => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mx-explorer-section">
          <div className="mx-explorer-section-title">
            <span>Measures</span>
          </div>
          <div className="mx-explorer-list">
            {model.measures.map((m) => (
              <div key={m.queryName || m.name} className="mx-explorer-list-item" title={m.queryName || m.name}>
                {m.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

ExplorerPanel.displayName = "ExplorerPanel";
