import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { FlattenedNode } from "../model/tree";
import { generateCellKey } from "../model/keys";
import { QuickCalcSettings, QuickCalcType } from "../settings/settings";

export type CellMapLike = {
  get: (key: string) => CellValue | undefined;
  values: () => IterableIterator<CellValue>;
};

export interface QuickCalcView {
  measures: MeasureInfo[];
  cellMap: CellMapLike;
}

function formatValue(value: number | null, format: string, type: QuickCalcType): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  if (type === "percentOfTotal" || type === "percentChange") {
    return (value * 100).toFixed(1) + "%";
  }

  if (!format) {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (format.includes("%")) {
    return (value * 100).toFixed(1) + "%";
  }

  if (format.includes("$") || format.toLowerCase().includes("currency")) {
    return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (format.includes("0.00")) {
    return value.toFixed(2);
  }

  if (format.includes("0.0")) {
    return value.toFixed(1);
  }

  if (format.includes("#,##0") || format.includes(",0")) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  return value.toLocaleString();
}

function calcLabel(type: QuickCalcType): string {
  switch (type) {
    case "percentOfTotal":
      return "% of Total";
    case "runningTotal":
      return "Running Total";
    case "variance":
      return "Variance";
    case "percentChange":
      return "% Change";
    case "rank":
      return "Rank";
    default:
      return "";
  }
}

export function createQuickCalcView(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  baseCellMap: CellMapLike,
  baseMeasures: MeasureInfo[],
  quickCalcs: QuickCalcSettings
): QuickCalcView {
  if (!quickCalcs.enabled || quickCalcs.type === "none") {
    return { measures: baseMeasures, cellMap: baseCellMap };
  }

  const targetMeasure = Math.max(0, Math.min(baseMeasures.length - 1, quickCalcs.targetMeasure));
  const type = quickCalcs.type;

  const colKeys = columns.length > 0 ? columns.map(c => c.key) : baseMeasures.map((_, i) => `col:measure_${i}`);
  const rowKeys = rows.map(r => r.key);
  const rowIndexByKey = new Map<string, number>();
  const rowByKey = new Map<string, FlattenedNode>();
  for (let i = 0; i < rows.length; i++) {
    rowIndexByKey.set(rows[i].key, i);
    rowByKey.set(rows[i].key, rows[i]);
  }

  const totals = new Map<string, number>();
  const running = new Map<string, number[]>();
  const ranks = new Map<string, Map<string, number>>();

  if (type === "percentOfTotal" || type === "runningTotal" || type === "rank") {
    for (const colKey of colKeys) {
      const keyBase = `${colKey}::m${targetMeasure}`;

      let sum = 0;
      const vals: { rowKey: string; value: number }[] = [];
      for (const r of rows) {
        if (r.isSubtotal || r.isGrandTotal) continue;
        const cell = getCellValue(baseCellMap, r.key, colKey, targetMeasure);
        const v = cell?.value;
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          sum += v;
          vals.push({ rowKey: r.key, value: v });
        }
      }

      totals.set(keyBase, sum);

      if (type === "runningTotal") {
        let acc = 0;
        const arr: number[] = [];
        for (const r of rows) {
          const cell = getCellValue(baseCellMap, r.key, colKey, targetMeasure);
          const v = cell?.value;
          if (r.isSubtotal || r.isGrandTotal) {
            arr.push(NaN);
            continue;
          }
          if (v !== null && v !== undefined && !Number.isNaN(v)) {
            acc += v;
            arr.push(acc);
          } else {
            arr.push(NaN);
          }
        }
        running.set(keyBase, arr);
      }

      if (type === "rank") {
        vals.sort((a, b) => b.value - a.value);
        const byRow = new Map<string, number>();
        let currentRank = 0;
        let lastValue: number | null = null;
        for (let i = 0; i < vals.length; i++) {
          const v = vals[i].value;
          if (lastValue === null || v !== lastValue) {
            currentRank = currentRank + 1;
            lastValue = v;
          }
          byRow.set(vals[i].rowKey, currentRank);
        }
        ranks.set(keyBase, byRow);
      }
    }
  }

  const computed = new Map<string, CellValue>();
  const updatedMeasures: MeasureInfo[] = baseMeasures.map((m, idx) => {
    if (idx !== targetMeasure) return m;
    const suffix = calcLabel(type);
    return {
      ...m,
      name: suffix ? `${m.name} (${suffix})` : m.name,
    };
  });

  for (const rowKey of rowKeys) {
    const row = rowByKey.get(rowKey);
    for (const colKey of colKeys) {
      for (let m = 0; m < baseMeasures.length; m++) {
        const cell = getCellValue(baseCellMap, rowKey, colKey, m);
        if (!cell) continue;
        if (m !== targetMeasure || row?.isSubtotal || row?.isGrandTotal) {
          continue;
        }

        const keyBase = `${colKey}::m${targetMeasure}`;
        let value: number | null = cell.value;

        if (type === "percentOfTotal") {
          const total = totals.get(keyBase) ?? 0;
          value = total !== 0 && value !== null ? value / total : null;
        } else if (type === "runningTotal") {
          const arr = running.get(keyBase);
          const idx = rowIndexByKey.get(rowKey) ?? -1;
          const v = arr ? arr[idx] : NaN;
          value = Number.isNaN(v) ? null : v;
        } else if (type === "variance" || type === "percentChange") {
          const idx = rowIndexByKey.get(rowKey) ?? -1;
          const prevKey = idx > 0 ? rowKeys[idx - 1] : null;
          const prev = prevKey ? getCellValue(baseCellMap, prevKey, colKey, targetMeasure)?.value ?? null : null;
          if (prev === null || prev === 0 || value === null) {
            value = null;
          } else {
            const delta = value - prev;
            value = type === "variance" ? delta : delta / Math.abs(prev);
          }
        } else if (type === "rank") {
          const byRow = ranks.get(keyBase);
          const rnk = byRow?.get(rowKey);
          value = rnk !== undefined ? rnk : null;
        }

        const formattedValue = formatValue(value, baseMeasures[targetMeasure]?.format ?? "", type);
        const cellKey = generateCellKey(rowKey, colKey, targetMeasure);
        computed.set(cellKey, {
          ...cell,
          value,
          formattedValue,
          measureIndex: targetMeasure,
          rowKey,
          colKey,
        });
      }
    }
  }

  const mapLike: CellMapLike = {
    get: (key: string) => {
      const override = computed.get(key);
      if (override) return override;
      return baseCellMap.get(key);
    },
    values: function* () {
      const yielded = new Set<string>();
      for (const [k, v] of computed.entries()) {
        yielded.add(k);
        yield v;
      }
      for (const v of baseCellMap.values()) {
        const key = generateCellKey(v.rowKey, v.colKey, v.measureIndex);
        if (!yielded.has(key)) {
          yield v;
        }
      }
    },
  };

  return {
    measures: updatedMeasures,
    cellMap: mapLike,
  };
}
