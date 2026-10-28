import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { GridColumn, buildGridColumns } from "../model/gridColumns";
import { buildMergedHeaders, ColumnArrangement } from "../ui/MergedColumnHeaders";
import { resolveCalcRowFormat, resolveCellDisplay } from "../format/cellDisplay";
import {
  ColumnFormat,
  composeCellStyle,
  parseColFormats,
  parseRowFormats,
  quickFormatHeaderLabel,
  resolveAlignment,
  resolveColumnFormat,
} from "../format/directFormats";
import { createCellStyleEvaluator } from "../format/cellStyleEvaluator";
import { parseJsonObjectCached } from "../utils/jsonCache";

/** Resolved, file-safe styling. Colors are "#RRGGBB" or absent. */
export interface ExportStyle {
  fill?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
}

export interface ExportHeaderCell {
  label: string;
  colSpan: number;
  isTotal: boolean;
}

export interface ExportCell {
  /** Numeric value as shown (after edits and synthetic columns), or null. */
  value: number | null;
  /** Text exactly as the grid displays it; empty for missing values. */
  text: string;
  style: ExportStyle;
}

export interface ExportRow {
  label: string;
  indent: number;
  isTotal: boolean;
  isGrandTotal: boolean;
  /** Group header rows carry a label but no data. */
  isGroup: boolean;
  labelStyle: ExportStyle;
  cells: ExportCell[];
}

export interface ExportColumn {
  key: string;
  measureIndex: number;
  /** Power BI format string of the measure (also valid as an Excel number format in most cases). */
  measureFormat: string;
  columnFormat?: ColumnFormat;
  isTotal: boolean;
}

export interface ExportTable {
  title: string;
  rowHeaderLabel: string;
  /** Column header rows, top to bottom, excluding the row-header column. */
  headerRows: ExportHeaderCell[][];
  columns: ExportColumn[];
  rows: ExportRow[];
  headerStyle: ExportStyle;
}

const MISSING = "—";

/** Normalizes any CSS color the grid may use to "#RRGGBB"; unusable values (CSS variables, transparent) yield undefined. */
export function normalizeExportColor(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent" || value.startsWith("var(")) return undefined;
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) digits = digits.split("").map(ch => ch + ch).join("");
    if (digits.length === 8) {
      if (parseInt(digits.slice(6, 8), 16) < 26) return undefined;
      digits = digits.slice(0, 6);
    }
    return digits.length === 6 ? `#${digits.toUpperCase()}` : undefined;
  }
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (rgb) {
    const alphaRaw = rgb[4];
    const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
    if (alpha < 0.1) return undefined;
    const part = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0");
    return `#${part(rgb[1])}${part(rgb[2])}${part(rgb[3])}`.toUpperCase();
  }
  const named: Record<string, string> = { white: "#FFFFFF", black: "#000000" };
  return named[value];
}

function isBold(weight: unknown): boolean {
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = typeof weight === "number" ? weight : parseInt(String(weight ?? ""), 10);
  return Number.isFinite(numeric) && numeric >= 600;
}

function toExportStyle(css: Record<string, unknown>, align?: "left" | "center" | "right"): ExportStyle {
  return {
    fill: normalizeExportColor(css.backgroundColor),
    color: normalizeExportColor(css.color),
    bold: isBold(css.fontWeight),
    italic: css.fontStyle === "italic",
    underline: typeof css.textDecoration === "string" && css.textDecoration.includes("underline"),
    align,
  };
}

function totalBaseStyle(settings: VisualSettings, isGrandTotal: boolean): ExportStyle {
  const totals = settings.totals;
  return isGrandTotal
    ? { fill: normalizeExportColor(totals.grandTotalBackgroundColor), color: normalizeExportColor(totals.grandTotalTextColor), bold: !!totals.grandTotalBold }
    : { fill: normalizeExportColor(totals.subtotalBackgroundColor), color: normalizeExportColor(totals.subtotalTextColor), bold: !!totals.subtotalBold };
}

function mergeStyle(base: ExportStyle, over: ExportStyle): ExportStyle {
  return {
    fill: over.fill ?? base.fill,
    color: over.color ?? base.color,
    bold: over.bold || base.bold,
    italic: over.italic || base.italic,
    underline: over.underline || base.underline,
    align: over.align ?? base.align,
  };
}

type CellMapLike = { get: (key: string) => CellValue | undefined };

function columnLabelOverride(
  labelOverrides: Record<string, string>,
  columnKey: string | undefined,
  measureIndex: number | undefined
): string | undefined {
  if (columnKey) return labelOverrides[columnKey];
  if (measureIndex !== undefined) return labelOverrides[`m_${measureIndex}`];
  return undefined;
}

function headerColumnFormat(
  colFormats: Record<string, ColumnFormat>,
  cell: { columnKey?: string; measureIndex?: number; selectionKeys?: string[] }
): ColumnFormat | undefined {
  // Mirrors MergedColumnHeaders so suffixes ("in Thousands") match the screen.
  const selectionKeys = cell.selectionKeys || [];
  const firstParts = selectionKeys[0]?.split("::m") ?? [];
  const firstMeasure = firstParts.length > 1 ? Number(firstParts[1]) : undefined;
  if (cell.columnKey !== undefined && cell.measureIndex !== undefined) {
    return resolveColumnFormat(colFormats, cell.columnKey, cell.measureIndex);
  }
  if (selectionKeys[0]?.startsWith("m:")) return colFormats[selectionKeys[0]];
  if (firstParts[0] && firstMeasure !== undefined) return resolveColumnFormat(colFormats, firstParts[0], firstMeasure);
  return undefined;
}

function exportRowLabel(row: FlattenedNode, settings: VisualSettings, labelOverrides: Record<string, string>): string {
  const override = labelOverrides[row.key];
  if (override) return override;
  const path = row.path || [];
  if (row.isGrandTotal || (row.isSubtotal && path.length === 0)) return "Grand Total";
  if (row.isSubtotal) return `${String(path[path.length - 1] ?? "").trim()} Total`.trim();
  if (settings.layout.mode === "table" && path.length > 0) return path.map(v => String(v)).join(" / ");
  return row.label;
}

function fallbackGridColumns(measures: MeasureInfo[]): GridColumn[] {
  return measures.map((measure, index) => ({
    key: `col:measure_${index}::m${index}`,
    measure,
    measureIndex: index,
    col: {
      key: `col:measure_${index}`,
      label: measure.name,
      value: measure.name,
      level: 0,
      path: [],
      children: [],
      isExpanded: true,
      isLeaf: true,
      isSubtotal: false,
      isGrandTotal: false,
      hasChildren: false,
      indent: 0,
      visibleIndex: index,
    } as FlattenedNode,
  }));
}

/**
 * Snapshot of the matrix exactly as the grid presents it: same columns (order,
 * hidden, collapsed, YTD and detail columns), same header labels, same values
 * and number formatting. Every exporter renders from this.
 */
export function buildExportTable(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: CellMapLike,
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = []
): ExportTable {
  const builtColumns = buildGridColumns(columns, measures, settings);
  const gridColumns = builtColumns.length > 0 ? builtColumns : fallbackGridColumns(measures);

  const labelOverrides = parseJsonObjectCached<Record<string, string>>(settings.manualData.labelOverrides);
  const manualEdits = parseJsonObjectCached<Record<string, unknown>>(settings.manualData.edits);
  const colFormats = parseColFormats(settings.manualData.colFormats);
  const rowFormats = parseRowFormats(settings.manualData.rowFormats);

  const arrangement = ((settings.general as any).columnArrangement ?? "time-then-measure") as ColumnArrangement;
  const mergedHeaders = builtColumns.length > 0
    ? buildMergedHeaders(columns, measures, arrangement, { columnKey: "", measureIndex: 0, direction: "none" } as any, gridColumns)
    : [];
  const headerRows: ExportHeaderCell[][] = mergedHeaders.length > 0
    ? mergedHeaders.map(headerRow => headerRow.cells.map(cell => {
        const suffix = cell.isLeaf ? quickFormatHeaderLabel(headerColumnFormat(colFormats, cell)?.quickFormat) : "";
        const base = columnLabelOverride(labelOverrides, cell.columnKey, cell.measureIndex) || cell.label || "";
        return {
          label: suffix ? `${base} ${suffix}` : base,
          colSpan: Math.max(1, cell.colSpan || 1),
          isTotal: !!(cell.isSubtotal || cell.isGrandTotal),
        };
      }))
    : [gridColumns.map(gc => ({ label: labelOverrides[`m_${gc.measureIndex}`] || gc.measure.name, colSpan: 1, isTotal: false }))];

  const exportColumns: ExportColumn[] = gridColumns.map(gc => ({
    key: gc.col.key,
    measureIndex: gc.measureIndex,
    measureFormat: gc.synthetic === "rowDetail" ? "" : gc.measure.format || "",
    columnFormat: resolveColumnFormat(colFormats, gc.col.key, gc.measureIndex),
    isTotal: !!(gc.col.isSubtotal || gc.col.isGrandTotal),
  }));

  const cellStyleOf = createCellStyleEvaluator({
    rows,
    columns,
    cellMap: cellMap as any,
    measureCount: measures.length,
    conditionalFormatting: settings.conditionalFormatting,
  });

  const exportRows: ExportRow[] = [];
  for (const row of rows) {
    if (row.calcRowKind === "blank" || row.calcRowKind === "divider") continue;

    const isGroup = row.calcRowKind === "group";
    const isGrandTotal = !!(row.isGrandTotal || (row.isSubtotal && (row.path || []).length === 0));
    const thisRowFormat = rowFormats[row.key]
      || (row.calcRowDefId ? rowFormats[`__calcrow__${row.calcRowDefId}`] || rowFormats[row.calcRowDefId] : undefined);
    const calcRowFormat = resolveCalcRowFormat(row.key, settings.calculations.rows);

    const isTotalRow = !!(row.isSubtotal || row.isGrandTotal);
    const rowBase: ExportStyle = isTotalRow ? totalBaseStyle(settings, isGrandTotal) : {};
    const effectiveRowFormat = thisRowFormat || row.calculatedRowStyle;

    const cells: ExportCell[] = isGroup
      ? gridColumns.map((): ExportCell => ({ value: null, text: "", style: { bold: true } }))
      : gridColumns.map(gridCol => {
          const display = resolveCellDisplay({
            row,
            gridCol,
            cellMap,
            settings,
            manualEdits,
            colFormats,
            thisRowFormat,
            calcRowFormat,
          });
          const value = display.displayValue !== null && Number.isFinite(display.displayValue) ? display.displayValue : null;
          const text = display.displayFormatted === MISSING ? "" : display.displayFormatted;
          const composed = composeCellStyle(
            settings,
            cellStyleOf(row.key, gridCol.col.key, gridCol.measureIndex, display.displayValue),
            display.thisColFormat,
            effectiveRowFormat,
            row.isSubtotal || gridCol.col.isSubtotal,
            row.isGrandTotal || gridCol.col.isGrandTotal
          ) as Record<string, unknown>;
          const align = resolveAlignment(settings, display.thisColFormat, effectiveRowFormat);
          return { value, text, style: mergeStyle(rowBase, toExportStyle(composed, align)) };
        });

    exportRows.push({
      label: exportRowLabel(row, settings, labelOverrides),
      indent: Math.max(0, row.indent || 0),
      isTotal: !!(row.isSubtotal || row.isGrandTotal),
      isGrandTotal,
      isGroup,
      labelStyle: isGroup ? { bold: true } : rowBase,
      cells,
    });
  }

  const title = settings.title?.show && settings.title?.text ? String(settings.title.text) : "MatrixPro Export";
  const rowHeaderLabel = rowLevelNames.filter(Boolean).join(" / ") || "Row";

  const headerStyle: ExportStyle = {
    fill: normalizeExportColor(settings.headers.backgroundColor),
    color: normalizeExportColor(settings.headers.textColor),
    bold: settings.headers.bold !== false,
    align: "center",
  };

  return { title, rowHeaderLabel, headerRows, columns: exportColumns, rows: exportRows, headerStyle };
}

/** One label per data column, joining its header path top to bottom (e.g. "2020 - Jan - Sales"). */
export function flatColumnLabels(table: ExportTable): string[] {
  const parts: string[][] = table.columns.map((): string[] => []);
  for (const headerRow of table.headerRows) {
    let column = 0;
    for (const cell of headerRow) {
      for (let i = 0; i < cell.colSpan && column + i < parts.length; i++) {
        const label = cell.label.trim();
        const existing = parts[column + i];
        if (label && existing[existing.length - 1] !== label) existing.push(label);
      }
      column += cell.colSpan;
    }
  }
  return parts.map(p => p.join(" - "));
}
