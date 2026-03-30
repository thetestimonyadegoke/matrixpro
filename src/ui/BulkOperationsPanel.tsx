import React, { useState, useCallback } from "react";

export type BulkOperationType = "setValue" | "clear" | "add" | "multiply" | "percentageChange" | "formula";

export interface BulkOperationsPanelProps {
  isOpen: boolean;
  selectedCells: { rowKey: string; colKey: string; measureIndex: number }[];
  onClose: () => void;
  onApply: (operation: BulkOperationType, value?: string, options?: { applyToLocked?: boolean }) => void;
  hasLockedCells: boolean;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  isOpen,
  selectedCells,
  onClose,
  onApply,
  hasLockedCells,
}) => {
  const [operation, setOperation] = useState<BulkOperationType>("setValue");
  const [value, setValue] = useState("");
  const [applyToLocked, setApplyToLocked] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleApply = useCallback(() => {
    if (operation === "clear" || value.trim() || operation === "formula") {
      if (hasLockedCells && !applyToLocked && !showConfirm) {
        setShowConfirm(true);
        return;
      }
      onApply(operation, value, { applyToLocked });
      setShowConfirm(false);
      if (operation !== "formula") {
        setValue("");
      }
    }
  }, [operation, value, applyToLocked, hasLockedCells, onApply, showConfirm]);

  const handleClose = useCallback(() => {
    setShowConfirm(false);
    setValue("");
    setOperation("setValue");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const operationLabels: Record<BulkOperationType, string> = {
    setValue: "Set Value",
    clear: "Clear Values",
    add: "Add to Existing",
    multiply: "Multiply by",
    percentageChange: "Percentage Change",
    formula: "Apply Formula",
  };

  const operationDescriptions: Record<BulkOperationType, string> = {
    setValue: "Replace all selected cell values with the specified value",
    clear: "Remove all values from selected cells",
    add: "Add the specified value to existing cell values",
    multiply: "Multiply existing cell values by the specified factor",
    percentageChange: "Apply percentage change (e.g., 10 for +10%, -5 for -5%)",
    formula: "Apply a formula to all selected cells (use CELL() to reference current cell value)",
  };

  const needsValueInput = operation !== "clear";
  const isFormula = operation === "formula";

  return (
    <div className="bulk-operations-overlay" onClick={handleClose}>
      <div className="bulk-operations-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-operations-header">
          <h3>Bulk Data Operations</h3>
          <button className="bulk-operations-close" onClick={handleClose}>×</button>
        </div>

        <div className="bulk-operations-body">
          <div className="bulk-operations-selection-info">
            <span className="bulk-operations-badge">{selectedCells.length}</span>
            <span>cells selected</span>
          </div>

          <div className="bulk-operations-section">
            <label className="bulk-operations-label">Operation</label>
            <select
              className="bulk-operations-select"
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value as BulkOperationType);
                setShowConfirm(false);
              }}
            >
              {(Object.keys(operationLabels) as BulkOperationType[]).map((op) => (
                <option key={op} value={op}>
                  {operationLabels[op]}
                </option>
              ))}
            </select>
            <p className="bulk-operations-description">
              {operationDescriptions[operation]}
            </p>
          </div>

          {needsValueInput && (
            <div className="bulk-operations-section">
              <label className="bulk-operations-label">
                {isFormula ? "Formula" : "Value"}
                {isFormula && (
                  <span className="bulk-operations-hint">
                    Use CELL() to reference current cell value
                  </span>
                )}
              </label>
              <input
                type={isFormula ? "text" : "number"}
                className="bulk-operations-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isFormula ? "=CELL()*1.1" : "Enter value..."}
                autoFocus
              />
              {isFormula && (
                <div className="bulk-operations-formula-help">
                  <span className="bulk-operations-formula-tag">CELL()</span>
                  <span>Current cell value</span>
                  <span className="bulk-operations-formula-tag">ROW()</span>
                  <span>Row index</span>
                  <span className="bulk-operations-formula-tag">COL()</span>
                  <span>Column index</span>
                </div>
              )}
            </div>
          )}

          {hasLockedCells && (
            <div className="bulk-operations-section">
              <label className="bulk-operations-checkbox">
                <input
                  type="checkbox"
                  checked={applyToLocked}
                  onChange={(e) => {
                    setApplyToLocked(e.target.checked);
                    setShowConfirm(false);
                  }}
                />
                <span>Apply to locked cells</span>
              </label>
            </div>
          )}

          {showConfirm && (
            <div className="bulk-operations-confirm">
              <p>Some selected cells are locked. Apply operation anyway?</p>
              <div className="bulk-operations-confirm-actions">
                <button
                  className="bulk-operations-btn bulk-operations-btn-secondary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="bulk-operations-btn bulk-operations-btn-primary"
                  onClick={() => {
                    setApplyToLocked(true);
                    handleApply();
                  }}
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}

          <div className="bulk-operations-actions">
            <button
              className="bulk-operations-btn bulk-operations-btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="bulk-operations-btn bulk-operations-btn-primary"
              onClick={handleApply}
              disabled={needsValueInput && !value.trim()}
            >
              Apply to {selectedCells.length} Cells
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
