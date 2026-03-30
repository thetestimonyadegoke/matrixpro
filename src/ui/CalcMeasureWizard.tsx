import React, { useState, useCallback, useMemo } from "react";
import { MeasureInfo } from "../model/pivot";
import { parseFormula, validateFormula, ParseError } from "../calculations/formulaParser";

export interface CalcMeasureWizardProps {
  measures: MeasureInfo[];
  onSave: (measure: {
    name: string;
    description: string;
    formula: string;
    format: string;
    aggregation: "afterTotals" | "beforeTotals";
  }) => void;
  onClose: () => void;
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

export const CalcMeasureWizard: React.FC<CalcMeasureWizardProps> = ({
  measures,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("");
  const [format, setFormat] = useState("");
  const [aggregation, setAggregation] = useState<"afterTotals" | "beforeTotals">("afterTotals");
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
    });
  }, [name, description, formula, format, aggregation, validateCurrentFormula, onSave]);

  const insertMeasureRef = useCallback((measureName: string) => {
    setFormula(prev => prev + `[${measureName}]`);
  }, []);

  const insertFunction = useCallback((insert: string) => {
    setFormula(prev => prev + insert);
  }, []);

  const previewValues = useMemo(() => {
    if (!formula.trim()) return [];
    try {
      const parsed = parseFormula(formula);
      if (!parsed) return [];
      // Return sample preview (would need actual data context for real values)
      return [
        { row: "Sample Row 1", value: "—" },
        { row: "Sample Row 2", value: "—" },
        { row: "Sample Row 3", value: "—" },
      ];
    } catch {
      return [];
    }
  }, [formula]);

  return (
    <div className="calc-wizard-overlay" onClick={onClose}>
      <div className="calc-wizard-modal" onClick={e => e.stopPropagation()}>
        <div className="calc-wizard-header">
          <h2>New Calculated Measure</h2>
          <button className="calc-wizard-close" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <div className="calc-wizard-body">
          <div className="calc-wizard-section">
            <label className="calc-wizard-label">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="calc-wizard-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Gross Margin %"
              autoFocus
            />
          </div>

          <div className="calc-wizard-section">
            <label className="calc-wizard-label">Description</label>
            <input
              type="text"
              className="calc-wizard-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="calc-wizard-section">
            <label className="calc-wizard-label">
              Formula <span className="required">*</span>
            </label>
            <div className="calc-wizard-formula-area">
              <textarea
                className="calc-wizard-textarea"
                value={formula}
                onChange={e => {
                  setFormula(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., ([Revenue] - [Cost]) / [Revenue]"
                rows={3}
              />
              <div className="calc-wizard-quick-btns">
                {QUICK_FUNCTIONS.map(fn => (
                  <button
                    key={fn.label}
                    type="button"
                    className="calc-wizard-quick-btn"
                    onClick={() => insertFunction(fn.insert)}
                  >
                    {fn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="calc-wizard-section">
            <label className="calc-wizard-label">Available Measures</label>
            <div className="calc-wizard-measures">
              {measures.length === 0 ? (
                <span className="calc-wizard-empty">No measures available</span>
              ) : (
                measures.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    className="calc-wizard-measure-btn"
                    onClick={() => insertMeasureRef(m.name)}
                    title={`Insert [${m.name}]`}
                  >
                    {m.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="calc-wizard-row">
            <div className="calc-wizard-section calc-wizard-half">
              <label className="calc-wizard-label">Format</label>
              <select
                className="calc-wizard-select"
                value={format}
                onChange={e => setFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="calc-wizard-section calc-wizard-half">
              <label className="calc-wizard-label">Aggregation</label>
              <select
                className="calc-wizard-select"
                value={aggregation}
                onChange={e => setAggregation(e.target.value as "afterTotals" | "beforeTotals")}
              >
                <option value="afterTotals">Compute after totals</option>
                <option value="beforeTotals">Sum of computed cells</option>
              </select>
            </div>
          </div>

          {previewValues.length > 0 && (
            <div className="calc-wizard-section">
              <label className="calc-wizard-label">Preview</label>
              <div className="calc-wizard-preview">
                {previewValues.map((pv, i) => (
                  <div key={i} className="calc-wizard-preview-row">
                    <span className="calc-wizard-preview-label">{pv.row}</span>
                    <span className="calc-wizard-preview-value">{pv.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="calc-wizard-error">{error}</div>}
        </div>

        <div className="calc-wizard-footer">
          <button type="button" className="calc-wizard-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="calc-wizard-btn primary" onClick={handleSave}>
            Add Measure
          </button>
        </div>
      </div>
    </div>
  );
};

CalcMeasureWizard.displayName = "CalcMeasureWizard";
