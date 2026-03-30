import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { evaluateConditionalFormatting, computeVisibleRangeStats } from "../format/conditional";
import { buildCSVContent } from "./csv";

export function exportToXLSX(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined; values: () => IterableIterator<CellValue> },
  measures: MeasureInfo[],
  settings: VisualSettings
): void {
  try {
    const xlsxContent = buildXLSXContent(rows, columns, cellMap, measures, settings);
    downloadXLSX(xlsxContent, "matrix-export.xlsx");
  } catch (error) {
    console.warn("XLSX export failed, falling back to CSV:", error);
    const csvContent = buildCSVContent(rows, columns, cellMap, measures, settings);
    downloadCSV(csvContent, "matrix-export.csv");
  }
}

interface XLSXCell {
  value: string | number;
  style?: XLSXStyle;
}

interface XLSXStyle {
  fill?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
  alignment?: "left" | "center" | "right";
  numberFormat?: string;
}

interface XLSXWorksheet {
  name: string;
  rows: XLSXCell[][];
}

function buildXLSXContent(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined; values: () => IterableIterator<CellValue> },
  measures: MeasureInfo[],
  settings: VisualSettings
): Blob {
  const worksheet: XLSXWorksheet = {
    name: "Matrix Export",
    rows: [],
  };

  const headerRow: XLSXCell[] = [
    {
      value: "Row",
      style: {
        fill: settings.headers.backgroundColor,
        fontColor: settings.headers.textColor,
        fontWeight: "bold",
      },
    },
  ];

  if (columns.length > 0) {
    for (const col of columns) {
      for (const measure of measures) {
        headerRow.push({
          value: `${col.label} - ${measure.name}`,
          style: {
            fill: settings.headers.backgroundColor,
            fontColor: settings.headers.textColor,
            fontWeight: "bold",
          },
        });
      }
    }
  } else {
    for (const measure of measures) {
      headerRow.push({
        value: measure.name,
        style: {
          fill: settings.headers.backgroundColor,
          fontColor: settings.headers.textColor,
          fontWeight: "bold",
        },
      });
    }
  }

  worksheet.rows.push(headerRow);

  const columnStats = new Map<string, { min: number; max: number }>();
  if (settings.conditionalFormatting.enabled) {
    const effectiveColumns = columns.length > 0 ? columns : measures.map((m, i) => ({ key: `col:measure_${i}` }));
    for (const col of effectiveColumns) {
      for (let m = 0; m < measures.length; m++) {
        const values: (number | null)[] = [];
        for (const row of rows) {
          const cell = getCellValue(cellMap, row.key, col.key, m);
          if (cell?.value !== null) {
            values.push(cell?.value ?? null);
          }
        }
        const stats = computeVisibleRangeStats(values);
        columnStats.set(`${col.key}:${m}`, stats);
      }
    }
  }

  for (const row of rows) {
    const xlsxRow: XLSXCell[] = [];

    const indent = "  ".repeat(row.indent);
    const rowLabel = row.isGrandTotal ? "Grand Total" : row.isSubtotal ? row.label : `${indent}${row.label}`;

    const rowStyle: XLSXStyle = {};
    if (row.isGrandTotal || row.isSubtotal) {
      rowStyle.fill = settings.totals.backgroundColor;
      rowStyle.fontColor = settings.totals.textColor;
      rowStyle.fontWeight = "bold";
    }

    xlsxRow.push({ value: rowLabel, style: rowStyle });

    const effectiveColumns = columns.length > 0 ? columns : measures.map((m, i) => ({ key: `col:measure_${i}`, label: m.name }));

    for (const col of effectiveColumns) {
      for (let m = 0; m < measures.length; m++) {
        const cell = getCellValue(cellMap, row.key, col.key, m);
        const value = cell?.value ?? null;
        const formattedValue = cell?.formattedValue ?? "";

        const cellStyle: XLSXStyle = {
          alignment: settings.values.alignment,
        };

        if (row.isGrandTotal || row.isSubtotal) {
          cellStyle.fill = settings.totals.backgroundColor;
          cellStyle.fontColor = settings.totals.textColor;
          cellStyle.fontWeight = "bold";
        } else if (settings.conditionalFormatting.enabled && value !== null) {
          const statsKey = `${col.key}:${m}`;
          const stats = columnStats.get(statsKey) || { min: 0, max: 0 };
          const cfStyle = evaluateConditionalFormatting(value, stats.min, stats.max, settings.conditionalFormatting);
          if (cfStyle.backgroundColor) {
            cellStyle.fill = cfStyle.backgroundColor;
          }
          if (cfStyle.color) {
            cellStyle.fontColor = cfStyle.color;
          }
        }

        xlsxRow.push({
          value: value !== null ? value : formattedValue,
          style: cellStyle,
        });
      }
    }

    worksheet.rows.push(xlsxRow);
  }

  return generateSimpleXLSX(worksheet);
}

function generateSimpleXLSX(worksheet: XLSXWorksheet): Blob {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  const sheetData = worksheet.rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const colLetter = getColumnLetter(colIndex);
      const cellRef = `${colLetter}${rowIndex + 1}`;

      let cellValue: string;
      let cellType: string;

      if (typeof cell.value === "number") {
        cellValue = `<v>${cell.value}</v>`;
        cellType = "";
      } else {
        cellValue = `<v>${escapeXML(String(cell.value))}</v>`;
        cellType = ' t="inlineStr"';
        cellValue = `<is><t>${escapeXML(String(cell.value))}</t></is>`;
      }

      return `<c r="${cellRef}"${cellType}>${cellValue}</c>`;
    }).join("");

    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  const sheetXML = `${xmlHeader}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`;

  const workbookXML = `${xmlHeader}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXML(worksheet.name)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const relsXML = `${xmlHeader}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXML = `${xmlHeader}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const contentTypesXML = `${xmlHeader}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const zip = createZip([
    { path: "[Content_Types].xml", content: contentTypesXML },
    { path: "_rels/.rels", content: relsXML },
    { path: "xl/workbook.xml", content: workbookXML },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXML },
    { path: "xl/worksheets/sheet1.xml", content: sheetXML },
  ]);

  return zip;
}

function getColumnLetter(index: number): string {
  let letter = "";
  let temp = index;

  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }

  return letter;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface ZipEntry {
  path: string;
  content: string;
}

function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const content = encoder.encode(entry.content);
    const path = encoder.encode(entry.path);

    const localHeader = new Uint8Array(30 + path.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, content.length, true);
    view.setUint32(22, content.length, true);
    view.setUint16(26, path.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(path, 30);

    const cdHeader = new Uint8Array(46 + path.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, 0, true);
    cdView.setUint32(20, content.length, true);
    cdView.setUint32(24, content.length, true);
    cdView.setUint16(28, path.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cdHeader.set(path, 46);

    parts.push(localHeader);
    parts.push(content);
    centralDirectory.push(cdHeader);

    offset += localHeader.length + content.length;
  }

  const cdOffset = offset;
  let cdSize = 0;

  for (const cd of centralDirectory) {
    parts.push(cd);
    cdSize += cd.length;
  }

  const endOfCd = new Uint8Array(22);
  const endView = new DataView(endOfCd.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, cdSize, true);
  endView.setUint32(16, cdOffset, true);
  endView.setUint16(20, 0, true);

  parts.push(endOfCd);

  return new Blob(parts as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function downloadXLSX(blob: Blob, filename: string): void {
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
