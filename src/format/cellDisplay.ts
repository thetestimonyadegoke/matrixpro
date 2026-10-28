import { FlattenedNode } from "../model/tree";
import { CellValue, getCellValue, formatValue, formatCurrency } from "../model/pivot";
import { VisualSettings, RowQuickFormat, RowScalingFactor, migrateInsertedRows } from "../settings/settings";
import {
  ColumnFormat,
  RowFormat,
  formatQuickNumber,
  resolveColumnFormat,
  QuickNumberFormat,
  quickFormatDivisor,
} from "./directFormats";
import { resolveDetailCell, rowMatchesLevelAwareField, rowMatchesRowFieldDisplay } from "../model/levelAwareColumns";
import { GridColumn } from "../model/gridColumns";
import { parseManualEditNumber } from "../utils/manualEditValue";

/**
 * Map a row-level scaling factor ("thousands" / "millions" / …) to the
 * column-format `QuickNumberFormat` so we can reuse `formatQuickNumber`
 * for the scaling step.
 */
export function scalingToQuick(sf: RowScalingFactor | undefined): QuickNumberFormat | undefined {
  if (!sf || sf === "none") return undefined;
  return sf as QuickNumberFormat;
}

const usdFormatCache = new Map<string, Intl.NumberFormat>();

function getUsdFormat(minDec: number, maxDec: number): Intl.NumberFormat {
  const key = `${minDec}|${maxDec}`;
  let nf = usdFormatCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    });
    usdFormatCache.set(key, nf);
  }
  return nf;
}

/**
 * `currencyFormat` is the row/measure format string the "currency" quick
 * format takes its symbol and position from; without a currency symbol in
 * it the value renders as USD.
 */
export function applyRowQuickFormat(scaledValue: number, qf: RowQuickFormat, decimals?: number, currencyFormat?: string): string {
  const minDec = decimals !== undefined ? decimals : 0;
  const maxDec = decimals !== undefined ? decimals : 2;
  if (qf === "currency") {
    const formatted = currencyFormat ? formatCurrency(scaledValue, currencyFormat, decimals) : null;
    return formatted ?? getUsdFormat(minDec, maxDec).format(scaledValue);
  }
  if (qf === "percentage") {
    return (scaledValue * 100).toLocaleString(undefined, {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    }) + "%";
  }
  // "number"
  return scaledValue.toLocaleString(undefined, {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

export interface CalcRowFormat {
  sf: RowScalingFactor;
  qf: RowQuickFormat;
  numberFormat?: string;
  decimals?: number;
  overrideColumnFormat?: boolean;
}

/** Per-row number formatting carried by a calculated (virtual) row definition. */
export function resolveCalcRowFormat(rowKey: string, calcRowsJson: string | undefined): CalcRowFormat | null {
  if (!rowKey.startsWith("__calcrow__")) return null;
  const id = rowKey.slice("__calcrow__".length);
  const defs = migrateInsertedRows(calcRowsJson);
  for (const d of defs) {
    if ((d.kind === "calculated" || d.kind === "child") && d.id === id) {
      const sf = (d.scalingFactor ?? "none") as RowScalingFactor;
      const qf = (d.quickFormat ?? "none") as RowQuickFormat;
      const numberFormat = (d as any).numberFormat || "";
      const decimals = typeof (d as any).decimals === "number" ? (d as any).decimals : undefined;
      const overrideColumnFormat = !!(d as any).overrideColumnFormat;
      // When overrideColumnFormat is true, always return format so the row
      // can explicitly say "no formatting" and override column defaults.
      if (!overrideColumnFormat && sf === "none" && qf === "none" && !numberFormat && decimals === undefined) return null;
      return { sf, qf, numberFormat, decimals, overrideColumnFormat };
    }
  }
  return null;
}

export interface CellDisplayInput {
  row: FlattenedNode;
  gridCol: GridColumn;
  cellMap: { get: (key: string) => CellValue | undefined };
  settings: VisualSettings;
  manualEdits: Record<string, unknown>;
  colFormats: Record<string, ColumnFormat>;
  thisRowFormat: RowFormat | undefined;
  calcRowFormat: CalcRowFormat | null;
}

export interface CellDisplay {
  displayValue: number | null;
  displayFormatted: string;
  isEdited: boolean;
  thisColFormat: ColumnFormat | undefined;
}

/**
 * The value and text a grid cell shows: synthetic column resolution, manual
 * edits, then column / row / calculated-row number formatting. Shared by the
 * grid and the exporters so exported values match the screen.
 */
export function resolveCellDisplay(input: CellDisplayInput): CellDisplay {
  const { row, gridCol, cellMap, settings, manualEdits, colFormats, thisRowFormat, calcRowFormat } = input;
  const mIdx = gridCol.measureIndex;
  const colKey = gridCol.col.key;

  const detailSourceColumns = (gridCol.detailSourceColumnKeys || []).map((key, sourceIndex) => ({
    key,
    label: key,
    value: key,
    level: 0,
    path: [key],
    children: [],
    isExpanded: true,
    isLeaf: true,
    isSubtotal: false,
    isGrandTotal: false,
    hasChildren: false,
    indent: 0,
    visibleIndex: sourceIndex,
  } as FlattenedNode));
  const rowVisibleForLevelAware = rowMatchesLevelAwareField(row, gridCol.levelAwareField);
  // For detail measure columns:
  //  - leaf rows show the individual detail value (first non-null)
  //  - parent / subtotal / grand-total rows are AGGREGATE rows: they
  //    should show the summed total across all source columns.
  //    Numeric columns aggregate; text-only detail columns stay blank.
  // The rowVisibility filter hides individual detail values on grouping
  // rows, but aggregate totals must still render there.
  const isAggregateRow = row.isSubtotal || row.isGrandTotal || row.hasChildren;
  const cell = gridCol.synthetic === "detail"
    ? (rowVisibleForLevelAware || isAggregateRow)
      ? resolveDetailCell(cellMap, row.key, detailSourceColumns, mIdx, isAggregateRow ? { isTotalRow: true, aggregation: gridCol.levelAwareField?.aggregation } : undefined)
      : undefined
    : rowVisibleForLevelAware
      ? getCellValue(cellMap, row.key, colKey, mIdx)
      : undefined;
  const editKey = `${row.key}|${colKey}|${mIdx}`;
  const rawEdit = manualEdits[editKey];

  let displayValue = cell?.value ?? null;
  let displayFormatted = cell?.formattedValue ?? "—";
  const calcRowOverride = !!calcRowFormat?.overrideColumnFormat;
  if (calcRowOverride && displayValue !== null && !Number.isNaN(displayValue)) {
    displayFormatted = displayValue.toLocaleString(undefined, {
      minimumFractionDigits: calcRowFormat?.decimals ?? 0,
      maximumFractionDigits: calcRowFormat?.decimals ?? (calcRowFormat?.decimals !== undefined ? calcRowFormat.decimals : 2),
    });
  }

  if (gridCol.synthetic === "rowDetail") {
    const detailLevel = gridCol.rowDetailLevelIndex ?? -1;
    const shouldShow = (!gridCol.rowDetailField || rowMatchesRowFieldDisplay(row, gridCol.rowDetailField)) && (row as any).isDeepestVisible;
    const detailValue = shouldShow
      ? (row as any).rowDetailValues?.[detailLevel] ?? row.path?.[detailLevel]
      : "";
    displayValue = null;
    displayFormatted = detailValue !== undefined && detailValue !== null ? String(detailValue) : "";
  }

  if (gridCol.synthetic === "ytd" && gridCol.sourceColumnKeys?.length) {
    const total = gridCol.sourceColumnKeys.reduce((sum, sourceColKey) => {
      const sourceCell = getCellValue(cellMap, row.key, sourceColKey, mIdx);
      return sum + (sourceCell?.value ?? 0);
    }, 0);
    displayValue = total;
    displayFormatted = formatValue(total, gridCol.measure.format || "");
  }

  const isEdited = rawEdit !== undefined;

  if (isEdited) {
    const editStr = String(rawEdit);
    // For direct value overrides, show the new value immediately.
    // For formula-based edits (starting with '='), rely on the
    // evaluated result from the model's cellMap instead of
    // displaying the raw formula text in the grid.
    if (!editStr.startsWith("=")) {
      const parsed = parseManualEditNumber(editStr);
      if (parsed !== null) {
        displayValue = parsed;
        displayFormatted = parsed.toLocaleString();
      } else {
        // Text override: the cell no longer holds a number, so drop the
        // underlying value — otherwise the number formatting below would
        // re-render the old value over the text.
        displayValue = null;
        displayFormatted = editStr;
      }
    }
  }

  // Apply per-column direct formatting (bold/italic/bg/color/align/quickFormat).
  // Apply logical identity column formatting (Measure Global -> Dimension Global -> Specific).
  const stableMeasureIndex = gridCol.measure.index ?? mIdx;
  const thisColFormat = stableMeasureIndex !== mIdx
    ? {
        ...resolveColumnFormat(colFormats, colKey, mIdx),
        ...resolveColumnFormat(colFormats, colKey, stableMeasureIndex),
      }
    : resolveColumnFormat(colFormats, colKey, mIdx);

  // Quick-format scales the displayed numeric value and re-renders it
  // with the chosen precision. Non-numeric / null cells are untouched.
  const globalQuickFormat = (settings.values as any).quickFormat || "none";
  const rowFormatForValues = thisRowFormat;
  // When a calculated row has overrideColumnFormat, its own scaling factor
  // completely replaces column/global quick formatting.
  const currentQF = calcRowOverride
    ? (scalingToQuick(calcRowFormat.sf) || "none")
    : (rowFormatForValues?.quickFormat || thisColFormat?.quickFormat || globalQuickFormat);
  const currentNF = calcRowOverride
    ? (calcRowFormat.numberFormat || "")
    : (rowFormatForValues?.numberFormat || calcRowFormat?.numberFormat || thisColFormat?.numberFormat || settings.values.numberFormat || "");
  const currentDecimals = calcRowOverride
    ? (calcRowFormat.decimals ?? undefined)
    : (rowFormatForValues?.decimals ?? calcRowFormat?.decimals ?? thisColFormat?.decimals ?? settings.values.decimals);

  if (displayValue !== null && !Number.isNaN(displayValue)) {
    if (currentQF && currentQF !== "none") {
      // If we have a Quick Format (scaling), we scale it first.
      const scaledValue = displayValue / quickFormatDivisor(currentQF, displayValue);
      const decimals = currentDecimals ?? 1;
      
      if (currentNF) {
        // If there's ALSO a number format (e.g. %), apply it to the scaled value.
        displayFormatted = formatValue(scaledValue, currentNF);
      } else {
        // Otherwise use standard quick format display.
        displayFormatted = formatQuickNumber(displayValue, currentQF, decimals);
      }
    } else if (currentNF) {
      // Number format only (%, $, comma). Apply with decimals if set.
      if (currentNF.includes("%")) {
        const dec = currentDecimals ?? 1;
        displayFormatted = displayValue.toLocaleString(undefined, {
          style: "percent",
          minimumFractionDigits: dec,
          maximumFractionDigits: dec,
        });
      } else {
        displayFormatted = formatCurrency(displayValue, currentNF, currentDecimals ?? undefined)
          ?? formatValue(displayValue, currentNF);
      }
    } else if (currentDecimals !== undefined && currentDecimals !== null) {
      // Decimals-only adjustment (no special format, no scaling).
      displayFormatted = displayValue.toLocaleString(undefined, {
        minimumFractionDigits: currentDecimals,
        maximumFractionDigits: currentDecimals,
      });
    }
  }

  // Row-level scaling + quick-format (for calculated rows). 
  if (calcRowFormat && displayValue !== null && !Number.isNaN(displayValue)) {
    const scaled = (() => {
      const qf = scalingToQuick(calcRowFormat.sf);
      if (!qf) return displayValue;
      return displayValue / quickFormatDivisor(qf, displayValue);
    })();

    if (calcRowFormat.qf !== "none") {
      displayFormatted = applyRowQuickFormat(
        scaled,
        calcRowFormat.qf,
        calcRowFormat.decimals,
        calcRowFormat.numberFormat || gridCol.measure.format
      );
    } else if (calcRowFormat.sf !== "none") {
      displayFormatted = formatQuickNumber(
        displayValue,
        scalingToQuick(calcRowFormat.sf),
        calcRowFormat.decimals
      );
    }
  }

  return { displayValue, displayFormatted, isEdited, thisColFormat };
}
