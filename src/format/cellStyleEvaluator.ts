import { FlattenedNode } from "../model/tree";
import { CellValue, getCellValue } from "../model/pivot";
import { CellStyle, EvaluationContext, evaluateCellStyle } from "./conditional";
import { ConditionalFormattingSettings } from "../settings/settings";

type Stats = { min: number; max: number };
type CellMapLike = { get: (key: string) => CellValue | undefined; values: () => IterableIterator<CellValue> };

/**
 * Min/max per measure across every cell, in one pass. Same result as calling
 * computeGlobalStats once per measure (min/max are order-independent).
 */
export function computeAllGlobalStats(cellMap: { values: () => IterableIterator<CellValue> }, measureCount: number): Map<number, Stats> {
  const mins = new Array<number>(measureCount).fill(Infinity);
  const maxs = new Array<number>(measureCount).fill(-Infinity);
  for (const cell of cellMap.values()) {
    const m = cell.measureIndex;
    if (m >= 0 && m < measureCount && cell.value !== null) {
      mins[m] = Math.min(mins[m], cell.value);
      maxs[m] = Math.max(maxs[m], cell.value);
    }
  }
  const stats = new Map<number, Stats>();
  for (let m = 0; m < measureCount; m++) {
    stats.set(m, { min: mins[m] === Infinity ? 0 : mins[m], max: maxs[m] === -Infinity ? 0 : maxs[m] });
  }
  return stats;
}

export interface CellStyleEvaluatorInput {
  /** Rows as displayed (column stats skip subtotal / grand-total rows). */
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  cellMap: CellMapLike;
  measureCount: number;
  conditionalFormatting: ConditionalFormattingSettings;
  globalStats?: Map<number, Stats>;
}

export type CellStyleEvaluator = (rowKey: string, colKey: string, measureIndex: number, value: number | null) => CellStyle;

/**
 * Conditional-formatting style for a cell, as the grid shows it. Shared by the
 * grid and the exporters. Caches are scoped to this evaluator instance, so a
 * new instance (new inputs) can never serve stale styles.
 */
export function createCellStyleEvaluator(input: CellStyleEvaluatorInput): CellStyleEvaluator {
  const { rows, columns, cellMap, measureCount, conditionalFormatting } = input;
  if (!conditionalFormatting.enabled) return () => ({});

  let globalStats = input.globalStats;
  const rowByKey = new Map<string, FlattenedNode>();
  for (const row of rows) if (!rowByKey.has(row.key)) rowByKey.set(row.key, row);
  const colByKey = new Map<string, FlattenedNode>();
  for (const col of columns) if (!colByKey.has(col.key)) colByKey.set(col.key, col);

  const columnStats = new Map<string, Stats[]>();
  const rowStats = new Map<string, Stats[]>();
  const styles = new Map<string, CellStyle>();

  const statsFrom = (mins: number[], maxs: number[]): Stats[] =>
    mins.map((mn, idx) => ({ min: mn === Infinity ? 0 : mn, max: maxs[idx] === -Infinity ? 0 : maxs[idx] }));

  const getColumnStats = (colKey: string, measureIndex: number): Stats => {
    let byMeasure = columnStats.get(colKey);
    if (!byMeasure) {
      const mins = new Array<number>(measureCount).fill(Infinity);
      const maxs = new Array<number>(measureCount).fill(-Infinity);
      for (const row of rows) {
        if (row.isSubtotal || row.isGrandTotal) continue;
        for (let m = 0; m < measureCount; m++) {
          const v = getCellValue(cellMap, row.key, colKey, m)?.value;
          if (v !== null && v !== undefined && !Number.isNaN(v)) {
            mins[m] = Math.min(mins[m], v);
            maxs[m] = Math.max(maxs[m], v);
          }
        }
      }
      byMeasure = statsFrom(mins, maxs);
      columnStats.set(colKey, byMeasure);
    }
    return byMeasure[measureIndex] ?? { min: 0, max: 0 };
  };

  const getRowStats = (rowKey: string, measureIndex: number): Stats => {
    let byMeasure = rowStats.get(rowKey);
    if (!byMeasure) {
      const mins = new Array<number>(measureCount).fill(Infinity);
      const maxs = new Array<number>(measureCount).fill(-Infinity);
      for (const col of columns) {
        for (let m = 0; m < measureCount; m++) {
          const v = getCellValue(cellMap, rowKey, col.key, m)?.value;
          if (v !== null && v !== undefined && !Number.isNaN(v)) {
            mins[m] = Math.min(mins[m], v);
            maxs[m] = Math.max(maxs[m], v);
          }
        }
      }
      byMeasure = statsFrom(mins, maxs);
      rowStats.set(rowKey, byMeasure);
    }
    return byMeasure[measureIndex] ?? { min: 0, max: 0 };
  };

  return (rowKey, colKey, measureIndex, value) => {
    const styleKey = `${rowKey}::${colKey}::m${measureIndex}`;
    const cached = styles.get(styleKey);
    if (cached) return cached;

    const rowNode = rowByKey.get(rowKey);
    const colNode = colByKey.get(colKey);
    const ctx: EvaluationContext = {
      value,
      measureIndex,
      isSubtotal: !!rowNode?.isSubtotal,
      isGrandTotal: !!rowNode?.isGrandTotal,
      isColumnGrandTotal: !!colNode?.isGrandTotal,
      getStatsForMeasure: (m, scope) => {
        if (scope === "tableWise") {
          if (!globalStats) globalStats = computeAllGlobalStats(cellMap, measureCount);
          return globalStats.get(m) || { min: 0, max: 0 };
        }
        if (scope === "rowWise") return getRowStats(rowKey, m);
        return getColumnStats(colKey, m);
      },
      getValueForMeasure: (m) => getCellValue(cellMap, rowKey, colKey, m)?.value ?? null,
    };

    const style = evaluateCellStyle(ctx, conditionalFormatting);
    styles.set(styleKey, style);
    return style;
  };
}
