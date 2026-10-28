import React, { useState, useMemo } from "react";
import { MeasureInfo, CellValue } from "../model/pivot";
import { FlattenedNode } from "../model/tree";
import { Button, Field, Overlay } from "./overlayKit";

interface GoalSeekPanelProps {
  measures: MeasureInfo[];
  rows?: FlattenedNode[];
  columns?: FlattenedNode[];
  cellMap?: { get: (k: string) => CellValue | undefined };
  onClose: () => void;
  onApply: (targetMeasureIndex: number, targetValue: number, variableMeasureIndex: number) => void;
}

export const GoalSeekPanel: React.FC<GoalSeekPanelProps> = ({
  measures, rows, columns, cellMap, onClose, onApply,
}) => {
  const [targetMeasureIndex, setTargetMeasureIndex] = useState(0);
  const [targetValue, setTargetValue] = useState("");
  const [variableMeasureIndex, setVariableMeasureIndex] = useState(measures.length > 1 ? 1 : 0);
  const [result, setResult] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);

  const currentTargetSum = useMemo(() => {
    if (!rows || !columns || !cellMap) return null;
    let sum = 0;
    let count = 0;
    const m = measures[targetMeasureIndex];
    if (!m) return null;
    rows.forEach((row) => {
      columns.forEach((col) => {
        const key = `${row.key}__${col.key}__${m.index}`;
        const cell = cellMap.get(key);
        if (cell && cell.value !== null && cell.value !== undefined) {
          sum += cell.value;
          count++;
        }
      });
      if (columns.length === 0) {
        const key = `${row.key}____${m.index}`;
        const cell = cellMap.get(key);
        if (cell && cell.value !== null && cell.value !== undefined) {
          sum += cell.value;
          count++;
        }
      }
    });
    return { sum, count };
  }, [rows, columns, cellMap, measures, targetMeasureIndex]);

  const handleSolve = () => {
    const tv = parseFloat(targetValue);
    if (isNaN(tv)) {
      setResultIsError(true);
      setResult("Please enter a valid numeric target value.");
      return;
    }
    if (!currentTargetSum || currentTargetSum.count === 0) {
      setResultIsError(true);
      setResult("No data available to compute required change.");
      return;
    }
    const delta = tv - currentTargetSum.sum;
    const perCell = delta / currentTargetSum.count;
    const pct = currentTargetSum.sum !== 0
      ? ((delta / currentTargetSum.sum) * 100).toFixed(2) + "%"
      : "N/A";
    setResultIsError(false);
    setResult(
      `Current sum: ${currentTargetSum.sum.toFixed(2)}
` +
      `Target sum: ${tv.toFixed(2)}
` +
      `Required change: ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${pct})
` +
      `Per-cell adjustment: ${perCell >= 0 ? "+" : ""}${perCell.toFixed(4)}`
    );
    onApply(targetMeasureIndex, tv, variableMeasureIndex);
  };

  const measureOptions = (
    <>
      {measures.map((m, i) => (
        <option key={i} value={i}>{m.name}</option>
      ))}
      {measures.length === 0 && <option value={0}>No measures</option>}
    </>
  );

  return (
    <Overlay
      title="Goal seek"
      subtitle="Find the change needed to reach a target value."
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={handleSolve}>Solve</Button>
        </>
      }
    >
      <div className="mx-stack">
        <Field label="Set measure" htmlFor="mx-goal-target">
          <select
            id="mx-goal-target"
            className="mx-select"
            value={targetMeasureIndex}
            onChange={(e) => { setTargetMeasureIndex(parseInt(e.target.value, 10)); setResult(null); }}
          >
            {measureOptions}
          </select>
        </Field>

        <Field
          label="To value"
          htmlFor="mx-goal-value"
          hint={currentTargetSum !== null ? (
            <span className="mx-num">
              Current sum of {measures[targetMeasureIndex]?.name || "—"}: {currentTargetSum.sum.toFixed(2)} ({currentTargetSum.count} data points)
            </span>
          ) : undefined}
        >
          <input
            id="mx-goal-value"
            type="number"
            className="mx-input is-num"
            value={targetValue}
            onChange={(e) => { setTargetValue(e.target.value); setResult(null); }}
            placeholder="1000000"
          />
        </Field>

        <Field label="By changing" htmlFor="mx-goal-variable">
          <select
            id="mx-goal-variable"
            className="mx-select"
            value={variableMeasureIndex}
            onChange={(e) => { setVariableMeasureIndex(parseInt(e.target.value, 10)); setResult(null); }}
          >
            {measureOptions}
          </select>
        </Field>

        {result !== null && (
          <div
            className={resultIsError ? "mx-note is-danger" : "mx-note is-accent mx-num"}
            role="status"
            style={{ whiteSpace: "pre-line" }}
          >
            {result}
          </div>
        )}
      </div>
    </Overlay>
  );
};
