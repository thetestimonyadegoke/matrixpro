import React, { useState, useCallback, useMemo } from "react";
import { MeasureInfo, CellValue } from "../model/pivot";
import { validateFormula, ParseError } from "../calculations/formulaParser";
import { FormulaEngine } from "../calculations/FormulaEngine";
import { FlattenedNode } from "../model/tree";
import { FormulaEditor } from "./IntelliSenseDropdown";
import { Button, Field, Overlay, Section, Segmented } from "./overlayKit";

type MeasureAggregationType = "none" | "formula" | "sum" | "first" | "last" | "average" | "min" | "max";

export interface CalcMeasureWizardProps {
  measures: MeasureInfo[];
  onSave: (measure: {
    name: string;
    description: string;
    formula: string;
    format: string;
    aggregation: "afterTotals" | "beforeTotals";
    aggregationType: MeasureAggregationType;
    id?: string;
  }) => void;
  onClose: () => void;
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  cellMap: Map<string, CellValue>;
  initialMeasure?: {
    id: string;
    name: string;
    description: string;
    formula: string;
    format: string;
    aggregationMode: "afterTotals" | "beforeTotals";
    aggregationType?: MeasureAggregationType;
  };
}

const FORMAT_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "#,##0", label: "Number (1,234)" },
  { value: "#,##0.00", label: "Number (1,234.56)" },
  { value: "$#,##0", label: "Currency ($1,234)" },
  { value: "$#,##0.00", label: "Currency ($1,234.56)" },
  { value: "0%", label: "Percent (12%)" },
  { value: "0.00%", label: "Percent (12.34%)" },
];

const QUICK_FUNCTIONS = [
  { label: "+", insert: " + " },
  { label: "-", insert: " - " },
  { label: "*", insert: " * " },
  { label: "/", insert: " / " },
  { label: "IF", insert: "IF(, , )" },
  { label: "ABS", insert: "ABS()" },
  { label: "ROUND", insert: "ROUND(, 2)" },
  { label: "COALESCE", insert: "COALESCE(, 0)" },
];

const AGGREGATION_OPTIONS: Array<{ value: MeasureAggregationType; label: string }> = [
  { value: "none", label: "None" },
  { value: "formula", label: "Formula" },
  { value: "sum", label: "Sum" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "average", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

function inferAggregationType(formula: string, format: string, name: string): MeasureAggregationType {
  if (formula.includes("/") || format.includes("%") || /(?:margin|variance\s*%|completion|rate|unit|per|\$\/)/i.test(name)) {
    return "formula";
  }
  return "sum";
}

export const CalcMeasureWizard: React.FC<CalcMeasureWizardProps> = ({
  rows,
  columns,
  cellMap,
  measures,
  onSave,
  onClose,
  initialMeasure,
}) => {
  const [name, setName] = useState(initialMeasure?.name || "");
  const [description, setDescription] = useState(initialMeasure?.description || "");
  const [formula, setFormula] = useState(initialMeasure?.formula || "");
  const [format, setFormat] = useState(initialMeasure?.format || "");
  const [aggregation, setAggregation] = useState<"afterTotals" | "beforeTotals">(
    initialMeasure?.aggregationMode || "afterTotals"
  );
  const [aggregationType, setAggregationType] = useState<MeasureAggregationType>(
    initialMeasure?.aggregationType || inferAggregationType(initialMeasure?.formula || "", initialMeasure?.format || "", initialMeasure?.name || "")
  );
  const [error, setError] = useState<string | null>(null);

  const validateCurrentFormula = useCallback(() => {
    if (!formula.trim()) {
      setError("Formula is required");
      return false;
    }
    const measureNames = measures.map(m => m.name);
    const errors: ParseError[] = validateFormula(formula, measureNames);
    if (errors.length > 0) {
      setError(errors[0].message || "Invalid formula");
      return false;
    }
    setError(null);
    return true;
  }, [formula, measures]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!validateCurrentFormula()) {
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      formula: formula.trim(),
      format,
      aggregation,
      aggregationType,
      id: initialMeasure?.id,
    });
  }, [name, description, formula, format, aggregation, aggregationType, validateCurrentFormula, onSave, initialMeasure]);

  const insertMeasureRef = useCallback((measureName: string) => {
    setFormula(prev => prev + `[${measureName}]`);
  }, []);

  const insertFunction = useCallback((insert: string) => {
    setFormula(prev => prev + insert);
  }, []);

  const previewValues = useMemo(() => {
    if (!formula.trim() || rows.length === 0 || columns.length === 0) return [];
    try {
      const engine = new FormulaEngine({
        currentRowKey: rows[0].key,
        currentColKey: columns[0].key,
        currentMeasureIndex: 0,
        rows,
        columns,
        measures,
        cellMap,
        rowHierarchyLevels: [],
        calculatedMeasures: new Map<string, string>(),
        calculatedRows: new Map<string, string>(),
      });

      const results = [];
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        engine.updateContext({ currentRowKey: rows[i].key });
        const evalResult = engine.evaluate(formula.startsWith("=") ? formula.slice(1) : formula);
        results.push({
          row: rows[i].label,
          value: evalResult.value !== null ? evalResult.value.toLocaleString() : "—"
        });
      }
      return results;
    } catch {
      return [];
    }
  }, [formula, rows, columns, measures, cellMap]);

  return (
    <Overlay
      kind="dialog"
      title={initialMeasure ? "Edit calculated measure" : "New calculated measure"}
      subtitle="A measure computed from other measures in each cell."
      width={560}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{initialMeasure ? "Save changes" : "Add measure"}</Button>
        </>
      }
    >
      <div className="mx-stack">
        <div className="mx-grid-2">
          <Field label="Name" htmlFor="cmw-name">
            <input
              id="cmw-name"
              type="text"
              className="mx-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Gross margin %"
              aria-required="true"
              data-autofocus
            />
          </Field>
          <Field label="Description" htmlFor="cmw-desc">
            <input
              id="cmw-desc"
              type="text"
              className="mx-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>

        <Field label="Formula" hint="Type [ to reference a measure, or press Ctrl+Space for suggestions.">
          <div className="mx-stack is-tight">
            <FormulaEditor
              value={formula}
              onChange={val => {
                setFormula(val);
                setError(null);
              }}
              context={{
                measures: measures,
                calculatedMeasures: measures.map(m => ({ name: m.name, formula: "" })),
                columns: columns,
                rows: rows,
                rowHierarchyLevels: [],
                columnHierarchyLevels: [],
              }}
              placeholder="e.g. ([Revenue] - [Cost]) / [Revenue]"
            />
            <div className="mx-row is-wrap" style={{ gap: 4 }}>
              {QUICK_FUNCTIONS.map(fn => (
                <Button key={fn.label} variant="ghost" size="sm" onClick={() => insertFunction(fn.insert)} title={`Insert ${fn.insert.trim()}`}>
                  <span className="mx-code" style={{ background: "transparent", padding: 0 }}>{fn.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </Field>

        <Section title="Measures" description="Click to insert a reference.">
          {measures.length === 0 ? (
            <p className="mx-muted" style={{ margin: 0 }}>No measures available</p>
          ) : (
            <div className="mx-row is-wrap" style={{ gap: 4 }}>
              {measures.map((m, i) => (
                <Button key={i} size="sm" onClick={() => insertMeasureRef(m.name)} title={`Insert [${m.name}]`}>
                  {m.name}
                </Button>
              ))}
            </div>
          )}
        </Section>

        <div className="mx-divider" />

        <div className="mx-grid-2">
          <Field label="Format" htmlFor="cmw-format">
            <select id="cmw-format" className="mx-select" value={format} onChange={e => setFormat(e.target.value)}>
              {FORMAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Aggregation" htmlFor="cmw-agg">
            <select
              id="cmw-agg"
              className="mx-select"
              value={aggregationType}
              onChange={e => setAggregationType(e.target.value as MeasureAggregationType)}
            >
              {AGGREGATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Totals">
          <Segmented
            block
            ariaLabel="Calculation timing"
            value={aggregation}
            onChange={setAggregation}
            options={[
              { value: "afterTotals", label: "Compute after totals", title: "Evaluate the formula on the totalled values" },
              { value: "beforeTotals", label: "Sum of computed cells", title: "Evaluate per cell, then add up the results" },
            ]}
          />
        </Field>

        {previewValues.length > 0 && (
          <Section title="Preview">
            <div className="mx-stack is-tight">
              {previewValues.map((pv, i) => (
                <div key={i} className="mx-row is-between">
                  <span className="mx-muted" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pv.row}</span>
                  <span className="mx-num">{pv.value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {error && <div className="mx-note is-danger" role="alert">{error}</div>}
      </div>
    </Overlay>
  );
};

CalcMeasureWizard.displayName = "CalcMeasureWizard";
