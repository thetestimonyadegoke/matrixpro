/**
 * CalcRowForm — the Inforiver-style right-pane form for authoring a single
 * Calculated Row. Currently not mounted anywhere (CalcRowPanel has its own
 * inline editor); kept for reuse and restyled on the overlay kit.
 *
 * Fields (top-to-bottom):
 *   1. Title                                 (text, required)
 *   2. Formula                               (textarea, required)
 *   3. Bind for Cross filter & RLS           (dropdown + conditional input)
 *   4. Scaling Factor                        (dropdown)
 *   5. Quick Format                          (dropdown)
 *   6. Include in total                      (toggle, default ON)
 *   7. Evaluate Columns Before Rows          (toggle, default OFF)
 *   8. Description                           (textarea)
 *
 * Footer: Save (primary) + Cancel (secondary).
 *
 * The form is pure / controlled-from-state; persistence of the resulting
 * values into `settings.calculations.rows` is the caller's responsibility.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import {
  RowBinding,
  RowQuickFormat,
  RowScalingFactor,
} from "../settings/settings";
import { Button, Field, Switch } from "./overlayKit";

export interface CalcRowFormValues {
  title: string;
  formula: string;
  binding: RowBinding;
  scalingFactor: RowScalingFactor;
  quickFormat: RowQuickFormat;
  overrideColumnFormat: boolean;
  includeInTotal: boolean;
  evaluateColumnsBeforeRows: boolean;
  description: string;
}

export interface CalcRowFormProps {
  /** Rows available for "Bind to existing row" picker. */
  rows: FlattenedNode[];
  /** Measures available for formula autocomplete. */
  measures?: MeasureInfo[];
  /** Initial values — when editing an existing row. */
  initialValues?: Partial<CalcRowFormValues>;
  onSave: (values: CalcRowFormValues) => void;
  onCancel: () => void;
}

const SCALING_OPTIONS: { value: RowScalingFactor; label: string }[] = [
  { value: "none", label: "None" },
  { value: "thousands", label: "Thousands" },
  { value: "millions", label: "Millions" },
  { value: "billions", label: "Billions" },
  { value: "trillions", label: "Trillions" },
  { value: "auto", label: "Auto" },
];

const QUICK_FORMAT_OPTIONS: { value: RowQuickFormat; label: string }[] = [
  { value: "none", label: "None" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
];

const BINDING_OPTIONS: { value: RowBinding["mode"]; label: string }[] = [
  { value: "none", label: "Do not bind" },
  { value: "existing", label: "Bind to existing row" },
  { value: "new", label: "Create new binding" },
];

const DEFAULTS: CalcRowFormValues = {
  title: "",
  formula: "",
  binding: { mode: "none" },
  scalingFactor: "none",
  quickFormat: "none",
  overrideColumnFormat: false,
  includeInTotal: true,
  evaluateColumnsBeforeRows: false,
  description: "",
};

export const CalcRowForm: React.FC<CalcRowFormProps> = ({
  rows,
  measures = [],
  initialValues,
  onSave,
  onCancel,
}) => {
  const initial = useMemo<CalcRowFormValues>(
    () => ({ ...DEFAULTS, ...(initialValues ?? {}) }),
    [initialValues]
  );

  const [title, setTitle] = useState(initial.title);
  const [formula, setFormula] = useState(initial.formula);
  const [bindingMode, setBindingMode] = useState<RowBinding["mode"]>(
    initial.binding.mode
  );
  const [bindingExistingKey, setBindingExistingKey] = useState<string>(
    initial.binding.existingRowKey ?? ""
  );
  const [bindingNewKey, setBindingNewKey] = useState<string>(
    initial.binding.newKey ?? ""
  );
  const [scalingFactor, setScalingFactor] = useState<RowScalingFactor>(
    initial.scalingFactor
  );
  const [quickFormat, setQuickFormat] = useState<RowQuickFormat>(
    initial.quickFormat
  );
  const [overrideColumnFormat, setOverrideColumnFormat] = useState<boolean>(
    initial.overrideColumnFormat
  );
  const [includeInTotal, setIncludeInTotal] = useState<boolean>(
    initial.includeInTotal
  );
  const [evaluateColumnsBeforeRows, setEvaluateColumnsBeforeRows] =
    useState<boolean>(initial.evaluateColumnsBeforeRows);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);

  // ── IntelliSense state ──────────────────────────────────────────────────────
  const formulaRef = useRef<HTMLTextAreaElement>(null);
  const [intelliSense, setIntelliSense] = useState<{
    visible: boolean;
    items: { label: string; insert: string; kind: "row" | "measure" | "builtin" }[];
    activeIndex: number;
    // cursor position to anchor the dropdown
    top: number;
    left: number;
    // the bracket-query being filtered
    query: string;
    // start offset of the "[" that triggered the autocomplete
    triggerStart: number;
  }>({
    visible: false,
    items: [],
    activeIndex: 0,
    top: 0,
    left: 0,
    query: "",
    triggerStart: 0,
  });

  const BUILTIN_FUNCTIONS = useMemo(() => [
    { label: "SUM()", insert: "SUM(" },
    { label: "AVERAGE()", insert: "AVERAGE(" },
    { label: "MIN()", insert: "MIN(" },
    { label: "MAX()", insert: "MAX(" },
    { label: "IF(condition, true, false)", insert: "IF(" },
    { label: "ABS()", insert: "ABS(" },
    { label: "ROUND()", insert: "ROUND(" },
  ], []);

  // All completable tokens — rows + measures + built-ins
  const allCompletions = useMemo(() => {
    const items: { label: string; insert: string; kind: "row" | "measure" | "builtin" }[] = [];
    for (const row of rows) {
      if (!row.isGrandTotal) {
        items.push({ label: row.label, insert: `[${row.label}]`, kind: "row" });
      }
    }
    for (const m of measures) {
      items.push({ label: m.name, insert: `[${m.name}]`, kind: "measure" });
    }
    for (const fn of BUILTIN_FUNCTIONS) {
      items.push({ ...fn, kind: "builtin" });
    }
    return items;
  }, [rows, measures, BUILTIN_FUNCTIONS]);

  const closeIntelliSense = useCallback(() => {
    setIntelliSense(prev => ({ ...prev, visible: false }));
  }, []);

  const applyCompletion = useCallback((item: { insert: string; label: string }) => {
    const ta = formulaRef.current;
    if (!ta) return;
    const { triggerStart, query } = intelliSense;
    // Replace "[query" with the full insert token
    const insertText = item.insert;
    const before = formula.slice(0, triggerStart);
    const after = formula.slice(triggerStart + 1 + query.length); // +1 for the "["
    const next = before + insertText + after;
    setFormula(next);
    setError(null);
    closeIntelliSense();
    // Place cursor after insertion
    const newPos = triggerStart + insertText.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
    });
  }, [formula, intelliSense, closeIntelliSense]);

  const handleFormulaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!intelliSense.visible) return;
    const { items, activeIndex } = intelliSense;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIntelliSense(prev => ({ ...prev, activeIndex: Math.min(prev.activeIndex + 1, prev.items.length - 1) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIntelliSense(prev => ({ ...prev, activeIndex: Math.max(prev.activeIndex - 1, 0) }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (items.length > 0) {
        e.preventDefault();
        applyCompletion(items[activeIndex] ?? items[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeIntelliSense();
    }
  }, [intelliSense, applyCompletion, closeIntelliSense]);

  const handleFormulaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFormula(val);
    setError(null);

    const cursor = e.target.selectionStart ?? val.length;
    // Find the last "[" before the cursor that hasn't been closed with "]"
    const textBeforeCursor = val.slice(0, cursor);
    const lastOpen = textBeforeCursor.lastIndexOf("[");
    if (lastOpen >= 0) {
      const textAfterOpen = textBeforeCursor.slice(lastOpen + 1);
      // No closing bracket in the fragment between "[" and cursor
      if (!textAfterOpen.includes("]")) {
        const query = textAfterOpen.toLowerCase();
        const filtered = allCompletions.filter(c =>
          c.label.toLowerCase().includes(query) || c.insert.toLowerCase().includes(query)
        );
        if (filtered.length > 0) {
          // Calculate approximate dropdown position from textarea
          // Rough line-height approximation
          const lineHeight = 20;
          const linesBefore = val.slice(0, lastOpen).split("\n").length - 1;
          setIntelliSense({
            visible: true,
            items: filtered,
            activeIndex: 0,
            top: linesBefore * lineHeight + lineHeight + 4,
            left: 0,
            query: textAfterOpen,
            triggerStart: lastOpen,
          });
          return;
        }
      }
    }
    closeIntelliSense();
  }, [allCompletions, closeIntelliSense]);

  // Close intellisense if clicking outside
  useEffect(() => {
    if (!intelliSense.visible) return undefined;
    const handler = () => closeIntelliSense();
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [intelliSense.visible, closeIntelliSense]);

  const selectableRows = useMemo(
    () => rows.filter((r) => !r.isGrandTotal),
    [rows]
  );

  const buildBinding = useCallback((): RowBinding => {
    if (bindingMode === "existing") {
      return { mode: "existing", existingRowKey: bindingExistingKey || undefined };
    }
    if (bindingMode === "new") {
      return { mode: "new", newKey: bindingNewKey.trim() || undefined };
    }
    return { mode: "none" };
  }, [bindingMode, bindingExistingKey, bindingNewKey]);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    if (!formula.trim()) {
      setError("Formula is required");
      return;
    }
    if (bindingMode === "existing" && !bindingExistingKey) {
      setError("Select a row to bind to");
      return;
    }
    if (bindingMode === "new" && !bindingNewKey.trim()) {
      setError("Enter a key for the new binding");
      return;
    }

    onSave({
      title: trimmedTitle,
      formula: formula.trim(),
      binding: buildBinding(),
      scalingFactor,
      quickFormat,
      overrideColumnFormat,
      includeInTotal,
      evaluateColumnsBeforeRows,
      description: description.trim(),
    });
  }, [
    title,
    formula,
    bindingMode,
    bindingExistingKey,
    bindingNewKey,
    buildBinding,
    scalingFactor,
    quickFormat,
    overrideColumnFormat,
    includeInTotal,
    evaluateColumnsBeforeRows,
    description,
    onSave,
  ]);

  return (
    <div className="mx-stack">
      <Field label="Title" htmlFor="calcrow-title">
        <input
          id="calcrow-title"
          type="text"
          className="mx-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Gross profit"
          aria-required="true"
          autoFocus
        />
      </Field>

      <Field
        label="Formula"
        htmlFor="calcrow-formula"
        hint={<>Type <span className="mx-kbd">[</span> to insert a row, measure or function. <span className="mx-kbd">↑</span> <span className="mx-kbd">↓</span> to move, <span className="mx-kbd">Enter</span> to insert, <span className="mx-kbd">Esc</span> to dismiss.</>}
      >
        <div style={{ position: "relative" }}>
          <textarea
            id="calcrow-formula"
            ref={formulaRef}
            className="mx-textarea is-code"
            value={formula}
            onChange={handleFormulaChange}
            onKeyDown={handleFormulaKeyDown}
            rows={4}
            placeholder="[Revenue] - [COGS]"
            spellCheck={false}
            aria-required="true"
          />
          {intelliSense.visible && intelliSense.items.length > 0 && (
            <div
              className="mx-popover"
              role="listbox"
              style={{
                position: "absolute",
                top: intelliSense.top,
                left: intelliSense.left,
                zIndex: 1000,
                maxHeight: 200,
              }}
              onMouseDown={(e) => e.preventDefault()} // prevent blur on click
            >
              {intelliSense.items.map((item, idx) => (
                <div
                  key={`${item.kind}-${item.label}`}
                  role="option"
                  aria-selected={idx === intelliSense.activeIndex}
                  className={`mx-popover-item${idx === intelliSense.activeIndex ? " is-active" : ""}`}
                  onMouseEnter={() => setIntelliSense(prev => ({ ...prev, activeIndex: idx }))}
                  onClick={() => applyCompletion(item)}
                >
                  <span className="mx-popover-label">{item.label}</span>
                  <span className="mx-popover-hint">{item.kind === "row" ? "Row" : item.kind === "measure" ? "Measure" : "Function"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>

      <Field label="Bind for cross-filter and RLS" htmlFor="calcrow-binding-mode">
        <div className="mx-stack is-tight">
          <select
            id="calcrow-binding-mode"
            className="mx-select"
            value={bindingMode}
            onChange={(e) =>
              setBindingMode(e.target.value as RowBinding["mode"])
            }
          >
            {BINDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {bindingMode === "existing" && (
            <select
              className="mx-select"
              aria-label="Row to bind to"
              value={bindingExistingKey}
              onChange={(e) => setBindingExistingKey(e.target.value)}
            >
              <option value="">Select a row</option>
              {selectableRows.map((row) => (
                <option key={row.key} value={row.key}>
                  {"—".repeat(row.indent)}
                  {row.label}
                </option>
              ))}
            </select>
          )}

          {bindingMode === "new" && (
            <input
              type="text"
              className="mx-input"
              aria-label="New binding key"
              value={bindingNewKey}
              onChange={(e) => setBindingNewKey(e.target.value)}
              placeholder="New binding key, e.g. gross_profit"
            />
          )}
        </div>
      </Field>

      <div className="mx-grid-2">
        <Field label="Scale" htmlFor="calcrow-scaling">
          <select
            id="calcrow-scaling"
            className="mx-select"
            value={scalingFactor}
            onChange={(e) => setScalingFactor(e.target.value as RowScalingFactor)}
          >
            {SCALING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Quick format" htmlFor="calcrow-quickformat">
          <select
            id="calcrow-quickformat"
            className="mx-select"
            value={quickFormat}
            onChange={(e) => setQuickFormat(e.target.value as RowQuickFormat)}
          >
            {QUICK_FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mx-stack is-tight">
        <Switch label="Override column formatting" checked={overrideColumnFormat} onChange={setOverrideColumnFormat} />
        <Switch label="Include in total" checked={includeInTotal} onChange={setIncludeInTotal} />
        <Switch label="Evaluate columns before rows" checked={evaluateColumnsBeforeRows} onChange={setEvaluateColumnsBeforeRows} />
      </div>

      <Field label="Description" htmlFor="calcrow-description">
        <textarea
          id="calcrow-description"
          className="mx-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional"
        />
      </Field>

      {error && <div className="mx-note is-danger" role="alert">{error}</div>}

      <div className="mx-row" style={{ justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};

CalcRowForm.displayName = "CalcRowForm";
