import React, { memo, useCallback } from "react";
import { FlattenedNode } from "../model/tree";

export interface ColumnHierarchyPanelProps {
  columns: FlattenedNode[];
  width: number;
  allowInteractions: boolean;
  onToggleExpand: (nodeKey: string) => void;
  onClose: () => void;
}

export const ColumnHierarchyPanel: React.FC<ColumnHierarchyPanelProps> = memo(({
  columns,
  width,
  allowInteractions,
  onToggleExpand,
  onClose,
}) => {
  const handleToggle = useCallback((key: string) => {
    if (!allowInteractions) return;
    onToggleExpand(key);
  }, [allowInteractions, onToggleExpand]);

  // Group columns by level for hierarchy display
  const rootColumns = columns.filter(c => c.level === 0 || c.indent === 0);

  return (
    <div className="column-hierarchy-panel" style={{ width }}>
      <div className="column-hierarchy-header">
        <h3 className="column-hierarchy-title">Column Hierarchy</h3>
        <button
          className="column-hierarchy-close"
          onClick={onClose}
          type="button"
          aria-label="Close column hierarchy panel"
        >
          ×
        </button>
      </div>

      <div className="column-hierarchy-body">
        {columns.length === 0 ? (
          <div className="column-hierarchy-empty">
            No column hierarchy available
          </div>
        ) : (
          <div className="column-hierarchy-tree">
            {columns.map((col) => (
              <div
                key={col.key}
                className={`column-hierarchy-item ${col.isSubtotal ? "subtotal" : ""}`}
                style={{ paddingLeft: 12 + col.indent * 16 }}
              >
                {col.hasChildren && (
                  <button
                    className="column-hierarchy-toggle"
                    onClick={() => handleToggle(col.key)}
                    disabled={!allowInteractions}
                    type="button"
                    aria-expanded={col.isExpanded}
                  >
                    {col.isExpanded ? "−" : "+"}
                  </button>
                )}
                <span className="column-hierarchy-label" title={col.path.join(" > ")}>
                  {col.label}
                </span>
                {col.isSubtotal && (
                  <span className="column-hierarchy-tag">Subtotal</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="column-hierarchy-footer">
        <span className="column-hierarchy-count">
          {columns.length} column{columns.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
});

ColumnHierarchyPanel.displayName = "ColumnHierarchyPanel";
