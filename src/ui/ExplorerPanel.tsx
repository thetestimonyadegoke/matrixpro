import React, { memo, useCallback, useState, useEffect } from "react";
import { MatrixModel } from "../model/pivot";
import { IconClose, IconReset } from "./icons";
import { Button, Field, IconButton, Section } from "./overlayKit";

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

  // Sync drill level selectors when model level counts change (e.g. after data refresh)
  useEffect(() => {
    setRowDrillLevel(prev => Math.min(prev, model.rowLevelCount) || model.rowLevelCount);
  }, [model.rowLevelCount]);

  useEffect(() => {
    setColDrillLevel(prev => Math.min(prev, model.columnLevelCount) || model.columnLevelCount);
  }, [model.columnLevelCount]);

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

  // rowLevelCount and columnLevelCount reflect the number of hierarchy levels from the data.
  // When there are no real column hierarchy levels (just the implicit/flat column), columnLevelCount
  // is 0 — so we guard drill controls to only show when count > 1 (multi-level hierarchy).
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

  const renderAxis = (opts: {
    title: string;
    levels: number;
    visible: number;
    canInteract: boolean;
    onCollapse: () => void;
    onExpand: () => void;
    onReset: () => void;
    levelOptions: number[];
    drillLevel: number;
    onDrillChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <Section
      title={opts.title}
      description={
        <span className="mx-num">
          {opts.levels ? `${opts.levels} level${opts.levels !== 1 ? "s" : ""}` : "No levels"} · {opts.visible} visible
        </span>
      }
    >
      <div className="mx-row is-wrap" style={{ gap: 6 }}>
        <Button size="sm" onClick={opts.onCollapse} disabled={!opts.canInteract}>Collapse all</Button>
        <Button size="sm" onClick={opts.onExpand} disabled={!opts.canInteract}>Expand all</Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<IconReset size={12} />}
          onClick={opts.onReset}
          disabled={!opts.canInteract}
          title="Reset to default expansion"
        >
          Reset
        </Button>
      </div>
      {opts.levels > 1 && (
        <Field label="Drill to level" inline>
          <select
            className="mx-select is-sm"
            aria-label={`${opts.title} drill level`}
            value={opts.drillLevel}
            onChange={opts.onDrillChange}
            disabled={!opts.canInteract}
          >
            {opts.levelOptions.map(lvl => (
              <option key={lvl} value={lvl}>Level {lvl}</option>
            ))}
          </select>
        </Field>
      )}
    </Section>
  );

  return (
    <aside
      aria-label="Explorer"
      style={{
        width,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 5000,
        background: "var(--mx-surface)",
        borderRight: "1px solid var(--mx-ov-line)",
        color: "var(--mx-text)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        className="mx-row is-between"
        style={{ padding: "8px 8px 8px 14px", borderBottom: "1px solid var(--mx-ov-line)", flexShrink: 0 }}
      >
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Explorer</h2>
        <IconButton label="Close explorer" icon={<IconClose size={14} />} onClick={onClose} />
      </div>

      <div className="mx-stack" style={{ padding: 14, gap: 16, overflowY: "auto", minHeight: 0, flex: 1 }}>
        {renderAxis({
          title: "Rows",
          levels: model.rowLevelCount,
          visible: model.flattenedRows.length,
          canInteract: canInteractRows,
          onCollapse: collapseAllRows,
          onExpand: expandAllRows,
          onReset: onResetRowExpansion,
          levelOptions: rowLevelOptions,
          drillLevel: rowDrillLevel,
          onDrillChange: handleRowDrillChange,
        })}

        <hr className="mx-divider" />

        {renderAxis({
          title: "Columns",
          levels: model.columnLevelCount,
          visible: model.flattenedColumns.filter(c => c.isLeaf || c.isSubtotal || c.isGrandTotal).length,
          canInteract: canInteractCols,
          onCollapse: collapseAllColumns,
          onExpand: expandAllColumns,
          onReset: onResetColumnExpansion,
          levelOptions: colLevelOptions,
          drillLevel: colDrillLevel,
          onDrillChange: handleColDrillChange,
        })}

        <hr className="mx-divider" />

        <Section title="Measures">
          {model.measures.length === 0 ? (
            <p className="mx-muted" style={{ margin: 0, fontSize: 11.5 }}>No measures</p>
          ) : (
            <ul className="mx-list" style={{ gap: 4 }}>
              {model.measures.map((m) => (
                <li
                  key={m.queryName || m.name}
                  className="mx-item"
                  style={{ minHeight: 30, padding: "4px 10px" }}
                  title={m.queryName || m.name}
                >
                  <span className="mx-item-title">{m.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </aside>
  );
});

ExplorerPanel.displayName = "ExplorerPanel";
