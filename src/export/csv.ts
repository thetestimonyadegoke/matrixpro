import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { downloadCSV, ExportOutcome } from "./download";
import { buildExportTable, ExportTable, flatColumnLabels } from "./exportTable";

export function exportToCSV(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = [],
  filename = "matrix-export.csv"
): Promise<ExportOutcome> {
  return downloadCSV(buildCSVContent(rows, columns, cellMap, measures, settings, rowLevelNames), filename);
}

export function buildCSVContent(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = []
): string {
  return tableToCSV(buildExportTable(rows, columns, cellMap, measures, settings, rowLevelNames));
}

/** RFC 4180 CSV of the table as displayed: one header row, values as shown on screen. */
export function tableToCSV(table: ExportTable): string {
  const lines: string[] = [];
  lines.push([table.rowHeaderLabel, ...flatColumnLabels(table)].map(escapeCSV).join(","));
  for (const row of table.rows) {
    const label = row.isTotal ? row.label : `${"  ".repeat(row.indent)}${row.label}`;
    lines.push([label, ...row.cells.map(cell => cell.text)].map(escapeCSV).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Tab-separated text of the table as displayed. Unlike CSV, this pastes into Excel and Google Sheets
 * as a proper grid, so it is what the clipboard fallback uses when downloads are blocked.
 */
export function tableToTSV(table: ExportTable): string {
  const lines: string[] = [];
  lines.push([table.rowHeaderLabel, ...flatColumnLabels(table)].map(escapeTSV).join("\t"));
  for (const row of table.rows) {
    const label = row.isTotal ? row.label : `${"  ".repeat(row.indent)}${row.label}`;
    lines.push([label, ...row.cells.map(cell => cell.text)].map(escapeTSV).join("\t"));
  }
  return lines.join("\r\n");
}

export function buildTSVContent(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = []
): string {
  return tableToTSV(buildExportTable(rows, columns, cellMap, measures, settings, rowLevelNames));
}

function escapeTSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_TRIGGER.test(text.trimStart()) && !NUMERIC_TEXT.test(text.trim())) {
    text = `'${text}`;
  }
  return /[\t"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NUMERIC_TEXT = /^[-+]?[\d\s.,]*\d[\d\s.,]*%?$/;

/**
 * Quotes CSV fields and neutralizes spreadsheet formula injection: text that
 * starts with = + - @ (and isn't simply a number like "-12.5") is prefixed
 * with an apostrophe so Excel and Sheets treat it as text.
 */
export function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_TRIGGER.test(text.trimStart()) && !NUMERIC_TEXT.test(text.trim())) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
