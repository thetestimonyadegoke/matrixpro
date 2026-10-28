/**
 * Direct formatting — per-column and per-row style overrides that are
 * persisted to `manualData.colFormats` and `manualData.rowFormats`.
 *
 * These compose on top of the global `settings.values` defaults and BELOW
 * any conditional-formatting rule (CF rules are authored to be the
 * strongest signal; direct formatting is the user's manual intent).
 *
 * Composition order (later overrides earlier):
 *   1. settings.values (global defaults: bold/italic/underline/bg/color/align)
 *   2. column format (for the cell's column)
 *   3. row format    (for the cell's row)
 *   4. conditional-formatting cellStyle (bg/color/fontWeight from rule engine)
 */
import { VisualSettings } from "../settings/settings";
import { defaultSettings } from "../settings/settings";
import { CellStyle } from "./conditional";

export type QuickNumberFormat =
  | "none"
  | "auto"
  | "thousands"
  | "millions"
  | "billions"
  | "trillions";

export interface ColumnFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  alignment?: "left" | "center" | "right";
  /** Divide numeric values by the chosen magnitude. */
  quickFormat?: QuickNumberFormat;
  /** Optional decimal places to display when quickFormat is active. Default 1 for thousands/millions/billions/trillions, 0 for none. */
  decimals?: number;
  /** Override displayed number format string (e.g. "#,##0.00"). */
  numberFormat?: string;
}

export interface RowFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  alignment?: "left" | "center" | "right";
  /** Row-level display scaling/formatting. Wins over column number formatting. */
  quickFormat?: QuickNumberFormat;
  decimals?: number;
  numberFormat?: string;
  borderTop?: "none" | "single" | "double" | "thick";
  borderBottom?: "none" | "single" | "double" | "thick";
  /** Visual category: "divider" renders as a thin separator row. */
  kind?: "normal" | "divider";
}

export function parseColFormats(json: string | undefined): Record<string, ColumnFormat> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Resolve column format with logical identity fallback.
 * Checks:
 * 1. Specific key (e.g. "Year 2023::m0")
 * 2. Measure global (e.g. "m:0")
 * 3. Column type global (e.g. "c:Year 2023")
 */
export function resolveColumnFormat(
  colFormats: Record<string, ColumnFormat>,
  colKey: string | null | undefined,
  measureIndex: number
): ColumnFormat | undefined {
  if (!colFormats) return undefined;

  const safeColKey = colKey || "";
  
  // Priority 1: Exact leaf (e.g., "2023::m0")
  const specificKey = `${safeColKey}::m${measureIndex}`;
  
  // Priority 2: Measure global (e.g., "m:0" or "m_0")
  const measureKey = `m:${measureIndex}`;
  const measureKeyAlt = `m_${measureIndex}`;
  
  // Priority 3: Dimension/Column global (e.g., "c:2023")
  const dimensionKey = `c:${safeColKey}`;

  const fDimension = colFormats[dimensionKey];
  const fMeasure = colFormats[measureKey] || colFormats[measureKeyAlt];
  const fSpecific = colFormats[specificKey];

  if (!fDimension && !fMeasure && !fSpecific) return undefined;

  // Merge order: Dimension (base) < Measure < Specific (wins).
  // This ensures that measure-wide formatting (e.g. from Ribbon) correctly 
  // overrides dimension-wide defaults, while still allowing a specific cell
  // to have a manual override.
  return {
    ...fDimension,
    ...fMeasure,
    ...fSpecific,
  };
}

export function parseRowFormats(json: string | undefined): Record<string, RowFormat> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Divisor for a given quick-format magnitude. `auto` uses the absolute
 * value to pick the best bucket (≥1e12 → trillions; ≥1e9 → billions;
 * ≥1e6 → millions; ≥1e3 → thousands).
 */
export function quickFormatDivisor(qf: QuickNumberFormat | undefined, value: number): number {
  if (!qf || qf === "none") return 1;
  if (qf === "thousands") return 1e3;
  if (qf === "millions") return 1e6;
  if (qf === "billions") return 1e9;
  if (qf === "trillions") return 1e12;
  // auto
  const abs = Math.abs(value);
  if (abs >= 1e12) return 1e12;
  if (abs >= 1e9) return 1e9;
  if (abs >= 1e6) return 1e6;
  if (abs >= 1e3) return 1e3;
  return 1;
}

/**
 * Short unit label appended to column headers like "Actual in Thousands".
 * When `auto` is chosen, resolving the label requires the actual value —
 * use `quickFormatHeaderLabel` for header labels (which chooses based on
 * scale) or `quickFormatUnitForValue` for per-value units.
 */
export function quickFormatHeaderLabel(qf: QuickNumberFormat | undefined): string {
  if (!qf || qf === "none") return "";
  if (qf === "thousands") return "in Thousands";
  if (qf === "millions") return "in Millions";
  if (qf === "billions") return "in Billions";
  if (qf === "trillions") return "in Trillions";
  return "auto";
}

/**
 * Format a number with the given quick-format + decimals. Returns a human
 * string. Locale-aware grouping via toLocaleString.
 */
export function formatQuickNumber(
  value: number,
  qf: QuickNumberFormat | undefined,
  decimals: number | undefined
): string {
  if (qf === undefined || qf === "none") {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    });
  }
  const divisor = quickFormatDivisor(qf, value);
  if (divisor === 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  const scaled = value / divisor;
  const d = decimals ?? 1;
  return scaled.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/**
 * Compose final React.CSSProperties for a cell. Later layers override
 * earlier ones. Conditional formatting provides a rule-driven base, but
 * direct user formatting wins when a user explicitly sets color or style.
 */
export function composeCellStyle(
  settings: VisualSettings,
  cellStyle: CellStyle,
  colFormat: ColumnFormat | undefined,
  rowFormat: RowFormat | undefined,
  isSubtotal: boolean = false,
  isGrandTotal: boolean = false
): React.CSSProperties {
  // Start with global defaults.
  const values = settings.values;
  let fontWeight: React.CSSProperties["fontWeight"] = values.bold ? 700 : undefined;
  let fontStyle: React.CSSProperties["fontStyle"] = values.italic ? "italic" : undefined;
  let textDecoration: React.CSSProperties["textDecoration"] = values.underline ? "underline" : undefined;
  let color: string | undefined =
    values.textColor && values.textColor !== defaultSettings.values.textColor
      ? values.textColor
      : "var(--mx-cell-fg)";
  let backgroundColor: string | undefined =
    values.backgroundColor && values.backgroundColor !== "transparent" && values.backgroundColor !== defaultSettings.values.backgroundColor
      ? values.backgroundColor
      : undefined;

  // 1b. Structural styling for totals (wins over values, can be overridden by manual/CF)
  if (isGrandTotal) {
    if (settings.totals.grandTotalBold) fontWeight = 700;
    if (settings.totals.grandTotalTextColor !== defaultSettings.totals.textColor) color = settings.totals.grandTotalTextColor;
    if (settings.totals.grandTotalBackgroundColor !== defaultSettings.totals.backgroundColor
      && settings.totals.grandTotalBackgroundColor !== defaultSettings.totals.grandTotalBackgroundColor) backgroundColor = settings.totals.grandTotalBackgroundColor;
  } else if (isSubtotal) {
    if (settings.totals.subtotalBold) fontWeight = 700;
    if (settings.totals.subtotalTextColor !== defaultSettings.totals.textColor) color = settings.totals.subtotalTextColor;
    if (settings.totals.subtotalBackgroundColor !== defaultSettings.totals.backgroundColor
      && settings.totals.subtotalBackgroundColor !== defaultSettings.totals.subtotalBackgroundColor) backgroundColor = settings.totals.subtotalBackgroundColor;
  }

  // Conditional formatting provides a base that explicit manual choices can override.
  if (cellStyle.backgroundColor) backgroundColor = cellStyle.backgroundColor;
  if (cellStyle.color) color = cellStyle.color;
  if (cellStyle.fontWeight) fontWeight = cellStyle.fontWeight as any;
  if (cellStyle.fontStyle) fontStyle = cellStyle.fontStyle as any;
  if (cellStyle.textDecoration) textDecoration = cellStyle.textDecoration as any;

  // Column format layer.
  if (colFormat) {
    if (colFormat.bold !== undefined) fontWeight = colFormat.bold ? 700 : 400;
    if (colFormat.italic !== undefined) fontStyle = colFormat.italic ? "italic" : "normal";
    if (colFormat.underline !== undefined) textDecoration = colFormat.underline ? "underline" : "none";
    if (colFormat.textColor) color = colFormat.textColor;
    if (colFormat.backgroundColor) backgroundColor = colFormat.backgroundColor;
  }

  // Row format layer (wins over column format for conflicts — row intent is more specific).
  if (rowFormat) {
    if (rowFormat.bold !== undefined) fontWeight = rowFormat.bold ? 700 : 400;
    if (rowFormat.italic !== undefined) fontStyle = rowFormat.italic ? "italic" : "normal";
    if (rowFormat.underline !== undefined) textDecoration = rowFormat.underline ? "underline" : "none";
    if (rowFormat.textColor) color = rowFormat.textColor;
    if (rowFormat.backgroundColor) backgroundColor = rowFormat.backgroundColor;
  }

  const out: React.CSSProperties = {
    fontWeight,
    fontStyle,
    textDecoration,
    color,
    backgroundColor,
  };
  if (cellStyle.borderStyle && cellStyle.borderStyle !== "none") {
    out.border = `${cellStyle.borderWidth ?? 1}px ${cellStyle.borderStyle} ${cellStyle.borderColor ?? "#d1d5db"}`;
  }
  return out;
}

/**
 * Resolve cell text alignment from settings + column/row format.
 * Row alignment overrides column, which overrides global.
 */
export function resolveAlignment(
  settings: VisualSettings,
  colFormat: ColumnFormat | undefined,
  rowFormat: RowFormat | undefined
): "left" | "center" | "right" {
  return (rowFormat?.alignment ?? colFormat?.alignment ?? settings.values.alignment) as "left" | "center" | "right";
}
