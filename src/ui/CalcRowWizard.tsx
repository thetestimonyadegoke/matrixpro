import React, { useState, useCallback } from "react";
import { FlattenedNode } from "../model/tree";
import { FormulaEditor } from "./IntelliSenseDropdown";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";

export interface CalcRowWizardProps {
  rows: FlattenedNode[];
  onSave: (row: {
    id?: string;
    name: string;
    formulaType: "sum" | "subtract" | "custom";
    sourceRowKeys: string[];
    customFormula: string;
    placement: "before" | "after" | "child";
    targetRowKey: string;
    style: "normal" | "bold" | "underline" | "doubleUnderline" | "sectionHeader";
  }) => void;
  onClose: () => void;
  initialData?: any;
  intelliSenseContext?: IntelliSenseContext;
}

const STYLE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "underline", label: "Underline" },
  { value: "doubleUnderline", label: "Double Underline" },
  { value: "sectionHeader", label: "Section Header" },
];

export const CalcRowWizard: React.FC<CalcRowWizardProps> = ({
  rows,
  onSave,
  onClose,
  initialData,
  intelliSenseContext,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [formulaType, setFormulaType] = useState<"sum" | "subtract" | "custom">(initialData?.formulaType || "sum");
  const [selectedRows, setSelectedRows] = useState<string[]>(initialData?.sourceRowKeys || []);
  const [customFormula, setCustomFormula] = useState(initialData?.customFormula || "");
  const [placement, setPlacement] = useState<"before" | "after" | "child">(initialData?.placement || "after");
  const [targetRowKey, setTargetRowKey] = useState(initialData?.targetRowKey || rows[0]?.key || "");
  const [style, setStyle] = useState<"normal" | "bold" | "underline" | "doubleUnderline" | "sectionHeader">(initialData?.style || "bold");
  const [error, setError] = useState<string | null>(null);

  const toggleRowSelection = useCallback((rowKey: string) => {
    setSelectedRows(prev => {
      if (prev.includes(rowKey)) {
        return prev.filter(k => k !== rowKey);
      }
      return [...prev, rowKey];
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (formulaType !== "custom" && selectedRows.length < 1) {
      setError("Select at least one row");
      return;
    }
    if (formulaType === "subtract" && selectedRows.length < 2) {
      setError("Select at least two rows for subtraction");
      return;
    }
    if (formulaType === "custom" && !customFormula.trim()) {
      setError("Custom formula is required");
      return;
    }
    if (!targetRowKey) {
      setError("Select a target row for placement");
      return;
    }

    onSave({
      id: initialData?.id,
      name: name.trim(),
      formulaType,
      sourceRowKeys: selectedRows,
      customFormula: customFormula.trim(),
      placement,
      targetRowKey,
      style,
    });
  }, [name, formulaType, selectedRows, customFormula, placement, targetRowKey, style, onSave]);

  // Filter to show only leaf rows or rows at same level
  const selectableRows = rows.filter(r => !r.isGrandTotal);

  return (
    <div className="calc-wizard-overlay" onClick={onClose}>
      <div className="calc-wizard-modal calc-wizard-wide" onClick={e => e.stopPropagation()}>
        <div className="calc-wizard-header">
          <h2>{initialData ? "Edit Calculated Row" : "New Calculated Row"}</h2>
          <button className="calc-wizard-close" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <div className="calc-wizard-body">
          <div className="calc-wizard-section">
            <label className="calc-wizard-label">
              Row Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="calc-wizard-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Gross Profit, Net Income"
              autoFocus
            />
          </div>

          <div className="calc-wizard-section">
            <label className="calc-wizard-label">Formula Type</label>
            <div className="calc-wizard-radio-group">
              <label className="calc-wizard-radio">
                <input
                  type="radio"
                  name="formulaType"
                  value="sum"
                  checked={formulaType === "sum"}
                  onChange={() => setFormulaType("sum")}
                />
                <span>Sum of selected rows</span>
              </label>
              <label className="calc-wizard-radio">
                <input
                  type="radio"
                  name="formulaType"
                  value="subtract"
                  checked={formulaType === "subtract"}
                  onChange={() => setFormulaType("subtract")}
                />
                <span>First row minus others (A - B - C...)</span>
              </label>
              <label className="calc-wizard-radio">
                <input
                  type="radio"
                  name="formulaType"
                  value="custom"
                  checked={formulaType === "custom"}
                  onChange={() => setFormulaType("custom")}
                />
                <span>Custom expression</span>
              </label>
            </div>
          </div>

          {formulaType !== "custom" && (
            <div className="calc-wizard-section">
              <label className="calc-wizard-label">
                Select Rows {formulaType === "subtract" ? "(first row is base)" : ""}
              </label>
              <div className="calc-wizard-row-list">
                {selectableRows.length === 0 ? (
                  <span className="calc-wizard-empty">No rows available</span>
                ) : (
                  selectableRows.map(row => (
                    <label
                      key={row.key}
                      className={`calc-wizard-row-item ${selectedRows.includes(row.key) ? "selected" : ""}`}
                      style={{ paddingLeft: 8 + row.indent * 16 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.key)}
                        onChange={() => toggleRowSelection(row.key)}
                      />
                      <span className="calc-wizard-row-label">{row.label}</span>
                      {row.isSubtotal && <span className="calc-wizard-row-tag">Subtotal</span>}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {formulaType === "custom" && (
            <div className="calc-wizard-section">
              <label className="calc-wizard-label">Custom Formula</label>
              <FormulaEditor
                value={customFormula}
                onChange={val => {
                  setCustomFormula(val);
                  setError(null);
                }}
                context={intelliSenseContext || {
                  measures: [],
                  calculatedMeasures: [],
                  columns: [],
                  rows: [],
                  rowHierarchyLevels: [],
                  columnHierarchyLevels: [],
                }}
                placeholder="e.g., [Revenue] - [COGS] - [Operating Expenses]"
              />
              <div className="calc-wizard-hint">
                Reference rows by name in brackets: [Row Name]
              </div>
            </div>
          )}

          <div className="calc-wizard-row">
            <div className="calc-wizard-section calc-wizard-half">
              <label className="calc-wizard-label">Placement</label>
              <select
                className="calc-wizard-select"
                value={placement}
                onChange={e => setPlacement(e.target.value as "before" | "after" | "child")}
              >
                <option value="before">Insert before</option>
                <option value="after">Insert after</option>
                <option value="child">Insert as child of</option>
              </select>
            </div>

            <div className="calc-wizard-section calc-wizard-half">
              <label className="calc-wizard-label">Target Row</label>
              <select
                className="calc-wizard-select"
                value={targetRowKey}
                onChange={e => setTargetRowKey(e.target.value)}
              >
                {selectableRows.map(row => (
                  <option key={row.key} value={row.key}>
                    {"—".repeat(row.indent)}{row.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="calc-wizard-section">
            <label className="calc-wizard-label">Row Style</label>
            <select
              className="calc-wizard-select"
              value={style}
              onChange={e => setStyle(e.target.value as typeof style)}
            >
              {STYLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="calc-wizard-error">{error}</div>}
        </div>

        <div className="calc-wizard-footer">
          <button type="button" className="calc-wizard-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="calc-wizard-btn primary" onClick={handleSave}>
            {initialData ? "Save Changes" : "Add Row"}
          </button>
        </div>
      </div>
    </div>
  );
};

CalcRowWizard.displayName = "CalcRowWizard";
