import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export function exportToCSV(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings
): void {
  const csvContent = buildCSVContent(rows, columns, cellMap, measures, settings);
  downloadCSV(csvContent, "matrix-export.csv");
}

export function buildCSVContent(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings
): string {
  const lines: string[] = [];

  const headerCells: string[] = ["Row"];
  
  if (columns.length > 0) {
    for (const col of columns) {
      for (const measure of measures) {
        headerCells.push(escapeCSV(`${col.label} - ${measure.name}`));
      }
    }
  } else {
    for (const measure of measures) {
      headerCells.push(escapeCSV(measure.name));
    }
  }

  lines.push(headerCells.join(","));

  for (const row of rows) {
    const rowCells: string[] = [];

    const indent = "  ".repeat(row.indent);
    const rowLabel = row.isGrandTotal ? "Grand Total" : row.isSubtotal ? `${row.label}` : `${indent}${row.label}`;
    rowCells.push(escapeCSV(rowLabel));

    if (columns.length > 0) {
      for (const col of columns) {
        for (let m = 0; m < measures.length; m++) {
          const cell = getCellValue(cellMap, row.key, col.key, m);
          rowCells.push(escapeCSV(cell?.formattedValue ?? ""));
        }
      }
    } else {
      for (let m = 0; m < measures.length; m++) {
        const cell = getCellValue(cellMap, row.key, `col:measure_${m}`, m);
        rowCells.push(escapeCSV(cell?.formattedValue ?? ""));
      }
    }

    lines.push(rowCells.join(","));
  }

  return lines.join("\n");
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
