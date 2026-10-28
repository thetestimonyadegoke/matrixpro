import React, { useState, useCallback } from "react";
import { FlattenedNode } from "../model/tree";
import { FormulaEditor } from "./IntelliSenseDropdown";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";
import { Button, Field, Overlay, Segmented } from "./overlayKit";

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
    numberFormat?: string;
    decimals?: number;
  }) => void;
  onClose: () => void;
  initialData?: any;
  intelliSenseContext?: IntelliSenseContext;
}

const STYLE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "underline", label: "Underline" },
  { value: "doubleUnderline", label: "Double underline" },
  { value: "sectionHeader", label: "Section header" },
];

const NUMBER_FORMAT_OPTIONS = [
  { value: "", label: "General" },
  { value: "#,##0", label: "Number" },
  { value: "#,##0.00", label: "Number, 2 decimals" },
  { value: "$#,##0.00", label: "Currency" },
  { value: "0.0%", label: "Percentage" },
];

export const CalcRowWizard: React.FC<CalcRowWizardProps> = ({
  rows,
  onSave,
  onClose,
  initialData,
  intelliSenseContext,
}) => {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState(initialData?.name || "");
  const [formulaType, setFormulaType] = useState<"sum" | "subtract" | "custom">(initialData?.formulaType || "sum");
  const [selectedRows, setSelectedRows] = useState<string[]>(initialData?.sourceRowKeys || []);
  const [customFormula, setCustomFormula] = useState(initialData?.customFormula || "");
  const [placement, setPlacement] = useState<"before" | "after" | "child">(initialData?.placement || "after");
  const [targetRowKey, setTargetRowKey] = useState(initialData?.targetRowKey || rows[0]?.key || "");
  const [style, setStyle] = useState<"normal" | "bold" | "underline" | "doubleUnderline" | "sectionHeader">(initialData?.style || "bold");
  const [numberFormat, setNumberFormat] = useState(initialData?.numberFormat || "");
  const [decimals, setDecimals] = useState<number>(initialData?.decimals ?? 1);
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
      numberFormat,
      decimals,
    });
  }, [initialData?.id, name, formulaType, selectedRows, customFormula, placement, targetRowKey, style, numberFormat, decimals, onSave]);

  // Filter to show only leaf rows or rows at same level
  const selectableRows = rows.filter(r => !r.isGrandTotal);

  const pickedOrder = (rowKey: string) => selectedRows.indexOf(rowKey) + 1;

  return (
    <Overlay
      kind="dialog"
      title={isEditing ? "Edit calculated row" : "New calculated row"}
      subtitle="A row computed from other rows."
      width={600}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{isEditing ? "Save changes" : "Add row"}</Button>
        </>
      }
    >
      <div className="mx-stack">
        <Field label="Name" htmlFor="crw-name">
          <input
            id="crw-name"
            type="text"
            className="mx-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Gross profit"
            aria-required="true"
            data-autofocus
          />
        </Field>

        <Field label="Calculation">
          <Segmented
            block
            ariaLabel="Formula type"
            value={formulaType}
            onChange={setFormulaType}
            options={[
              { value: "sum", label: "Sum of rows" },
              { value: "subtract", label: "First minus others", title: "A − B − C …" },
              { value: "custom", label: "Custom formula" },
            ]}
          />
        </Field>

        {formulaType !== "custom" && (
          <Field
            label="Source rows"
            hint={formulaType === "subtract" ? "The first row you tick is the base; later rows are subtracted from it." : undefined}
          >
            {selectableRows.length === 0 ? (
              <p className="mx-muted" style={{ margin: 0 }}>No rows available</p>
            ) : (
              <div
                role="group"
                aria-label="Source rows"
                style={{ maxHeight: 220, overflowY: "auto", padding: "4px 8px", border: "1px solid var(--mx-ov-field-line)", borderRadius: "var(--mx-control-radius, 6px)" }}
              >
                {selectableRows.map(row => {
                  const order = pickedOrder(row.key);
                  return (
                    <label key={row.key} className="mx-check" style={{ paddingLeft: row.indent * 16 }}>
                      <input
                        type="checkbox"
                        checked={order > 0}
                        onChange={() => toggleRowSelection(row.key)}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                      {row.isSubtotal && <span className="mx-badge">Subtotal</span>}
                      {formulaType === "subtract" && order > 0 && (
                        <span className={`mx-badge${order === 1 ? " is-accent" : ""}`}>{order === 1 ? "Base" : `− ${order - 1}`}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
        )}

        {formulaType === "custom" && (
          <Field label="Formula" hint="Reference rows by name in brackets, e.g. [Revenue]. Ctrl+Space shows suggestions.">
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
              placeholder="e.g. [Revenue] - [COGS] - [Operating expenses]"
            />
          </Field>
        )}

        <div className="mx-divider" />

        <div className="mx-grid-2">
          <Field label="Position">
            <Segmented
              block
              ariaLabel="Placement"
              value={placement}
              onChange={setPlacement}
              options={[
                { value: "before", label: "Before" },
                { value: "after", label: "After" },
                { value: "child", label: "Inside", title: "Insert as child of the target row" },
              ]}
            />
          </Field>
          <Field label="Target row" htmlFor="crw-target">
            <select id="crw-target" className="mx-select" value={targetRowKey} onChange={e => setTargetRowKey(e.target.value)}>
              {selectableRows.map(row => (
                <option key={row.key} value={row.key}>
                  {"—".repeat(row.indent)}{row.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mx-grid-3">
          <Field label="Style" htmlFor="crw-style">
            <select id="crw-style" className="mx-select" value={style} onChange={e => setStyle(e.target.value as typeof style)}>
              {STYLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Number format" htmlFor="crw-format">
            <select id="crw-format" className="mx-select" value={numberFormat} onChange={e => setNumberFormat(e.target.value)}>
              {NUMBER_FORMAT_OPTIONS.map(opt => (
                <option key={opt.value || "general"} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Decimals" htmlFor="crw-decimals">
            <input
              id="crw-decimals"
              type="number"
              min={0}
              max={8}
              className="mx-input is-num"
              value={decimals}
              onChange={e => setDecimals(Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
            />
          </Field>
        </div>

        {error && <div className="mx-note is-danger" role="alert">{error}</div>}
      </div>
    </Overlay>
  );
};

CalcRowWizard.displayName = "CalcRowWizard";
