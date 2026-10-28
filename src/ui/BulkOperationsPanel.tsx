import React, { useState, useCallback } from "react";
import { Button, Field, Overlay, Switch } from "./overlayKit";

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

  const runApply = useCallback((toLocked: boolean, confirmed: boolean) => {
    if (operation === "clear" || value.trim() || operation === "formula") {
      if (hasLockedCells && !toLocked && !confirmed) {
        setShowConfirm(true);
        return;
      }
      onApply(operation, value, { applyToLocked: toLocked });
      setShowConfirm(false);
      if (operation !== "formula") {
        setValue("");
      }
    }
  }, [operation, value, hasLockedCells, onApply]);

  const handleApply = useCallback(() => runApply(applyToLocked, showConfirm), [runApply, applyToLocked, showConfirm]);

  const handleClose = useCallback(() => {
    setShowConfirm(false);
    setValue("");
    setOperation("setValue");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const operationLabels: Record<BulkOperationType, string> = {
    setValue: "Set value",
    clear: "Clear values",
    add: "Add to existing",
    multiply: "Multiply by",
    percentageChange: "Percentage change",
    formula: "Apply formula",
  };

  const operationDescriptions: Record<BulkOperationType, string> = {
    setValue: "Replace every selected value with this value.",
    clear: "Remove the values from the selected cells.",
    add: "Add this value to each existing value.",
    multiply: "Multiply each existing value by this factor.",
    percentageChange: "Change each value by this percentage (10 for +10%, -5 for -5%).",
    formula: "Apply a formula to every selected cell.",
  };

  const needsValueInput = operation !== "clear";
  const isFormula = operation === "formula";
  const cellCount = selectedCells.length;

  return (
    <Overlay
      title="Bulk edit"
      subtitle={<span className="mx-num">{cellCount} cell{cellCount !== 1 ? "s" : ""} selected</span>}
      width={440}
      onClose={handleClose}
      footer={
        <>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={needsValueInput && !value.trim()}
          >
            Apply to {cellCount} cells
          </Button>
        </>
      }
    >
      <div className="mx-stack">
        <Field label="Operation" hint={operationDescriptions[operation]} htmlFor="mx-bulk-op">
          <select
            id="mx-bulk-op"
            className="mx-select"
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
        </Field>

        {needsValueInput && (
          <Field label={isFormula ? "Formula" : "Value"} htmlFor="mx-bulk-value">
            <input
              id="mx-bulk-value"
              type={isFormula ? "text" : "number"}
              className={isFormula ? "mx-input" : "mx-input is-num"}
              style={isFormula ? { fontFamily: "ui-monospace, \"Cascadia Code\", Consolas, monospace" } : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isFormula ? "=CELL()*1.1" : "Enter a value"}
              data-autofocus
              autoFocus
            />
          </Field>
        )}

        {isFormula && (
          <div className="mx-note" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center" }}>
            <code className="mx-code">CELL()</code>
            <span>Current cell value</span>
            <code className="mx-code">ROW()</code>
            <span>Row index</span>
            <code className="mx-code">COL()</code>
            <span>Column index</span>
          </div>
        )}

        {hasLockedCells && (
          <Switch
            label="Apply to locked cells"
            checked={applyToLocked}
            onChange={(checked) => {
              setApplyToLocked(checked);
              setShowConfirm(false);
            }}
          />
        )}

        {showConfirm && (
          <div className="mx-note is-danger mx-stack is-tight" role="alert">
            <span>Some selected cells are locked. Apply anyway?</span>
            <div className="mx-row" style={{ justifyContent: "flex-end", gap: 6 }}>
              <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setApplyToLocked(true);
                  runApply(true, true);
                }}
              >
                Apply to all
              </Button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
};
