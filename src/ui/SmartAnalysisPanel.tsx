import React, { useMemo, useState } from "react";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { EmptyNote, Overlay, Segmented } from "./overlayKit";
import { IconSmartAnalysis } from "./icons";

interface SmartAnalysisPanelProps {
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  cellMap: { get: (k: string) => CellValue | undefined };
  measures: MeasureInfo[];
  onClose: () => void;
}

interface MeasureStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  median: number;
}

function computeStats(values: number[]): MeasureStats {
  if (values.length === 0) {
    return { sum: 0, avg: 0, min: 0, max: 0, count: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return {
    sum,
    avg: sum / values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length,
    median,
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

export const SmartAnalysisPanel: React.FC<SmartAnalysisPanelProps> = ({
  rows, columns, cellMap, measures, onClose,
}) => {
  const [focusMeasureIndex, setFocusMeasureIndex] = useState<number | null>(null);

  const statsByMeasure: MeasureStats[] = useMemo(() => {
    return measures.map((m) => {
      const vals: number[] = [];
      rows.forEach((row) => {
        columns.forEach((col) => {
          const key = `${row.key}__${col.key}__${m.index}`;
          const cell = cellMap.get(key);
          if (cell && cell.value !== null && cell.value !== undefined) {
            vals.push(cell.value);
          }
        });
        // Also check measure-only key pattern (no column dimension)
        if (columns.length === 0) {
          const key = `${row.key}____${m.index}`;
          const cell = cellMap.get(key);
          if (cell && cell.value !== null && cell.value !== undefined) {
            vals.push(cell.value);
          }
        }
      });
      return computeStats(vals);
    });
  }, [rows, columns, cellMap, measures]);

  const displayedMeasures = focusMeasureIndex !== null
    ? measures.filter((_, i) => i === focusMeasureIndex)
    : measures;
  const displayedStats = focusMeasureIndex !== null
    ? statsByMeasure.filter((_, i) => i === focusMeasureIndex)
    : statsByMeasure;

  const statNames = ["Sum", "Average", "Min", "Max", "Count", "Median"] as const;
  const statKeys: (keyof MeasureStats)[] = ["sum", "avg", "min", "max", "count", "median"];

  const sheetWidth = Math.max(380, Math.min(720, 180 + displayedMeasures.length * 120));

  const cellPad: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid var(--mx-ov-line)" };

  // Up to three measures fit as a segmented control; more fall back to a select.
  const focusPicker = measures.length === 0 ? null : measures.length <= 3 ? (
    <Segmented
      size="sm"
      ariaLabel="Measure"
      value={focusMeasureIndex === null ? -1 : focusMeasureIndex}
      onChange={(v) => setFocusMeasureIndex(v === -1 || v === focusMeasureIndex ? null : v)}
      options={[
        { value: -1, label: "All" },
        ...measures.map((m, i) => ({ value: i, label: m.name })),
      ]}
    />
  ) : (
    <select
      className="mx-select is-sm"
      aria-label="Measure"
      value={focusMeasureIndex === null ? -1 : focusMeasureIndex}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        setFocusMeasureIndex(v === -1 ? null : v);
      }}
    >
      <option value={-1}>All measures</option>
      {measures.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
    </select>
  );

  return (
    <Overlay
      kind="sheet"
      title="Smart analysis"
      subtitle={<span className="mx-num">Computed from {rows.length} rows × {columns.length || 1} columns</span>}
      width={sheetWidth}
      onClose={onClose}
      toolbar={focusPicker}
    >
      {measures.length === 0 ? (
        <EmptyNote icon={<IconSmartAnalysis size={20} />} title="No measures available" hint="Add a measure to the visual to see statistics." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="mx-num" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "var(--mx-text)" }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...cellPad, textAlign: "left", fontWeight: 500, color: "var(--mx-text-muted)" }}>
                  Statistic
                </th>
                {displayedMeasures.map((m, i) => (
                  <th key={i} scope="col" style={{ ...cellPad, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statNames.map((statName, si) => (
                <tr key={si}>
                  <th scope="row" style={{ ...cellPad, textAlign: "left", fontWeight: 500, color: "var(--mx-text-secondary)" }}>
                    {statName}
                  </th>
                  {displayedStats.map((stats, mi) => (
                    <td key={mi} style={{ ...cellPad, textAlign: "right" }}>
                      {statKeys[si] === "count"
                        ? stats[statKeys[si]].toString()
                        : fmt(stats[statKeys[si]] as number)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Overlay>
  );
};
