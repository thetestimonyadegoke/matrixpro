import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { evaluateConditionalFormatting, computeVisibleRangeStats } from "../format/conditional";
import { buildCSVContent } from "./csv";
import { downloadXLSX, downloadCSV } from "./download";

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

interface XLSXStyle {
  fill?: string;
  fontColor?: string;
  fontWeight?: "bold" | "normal";
  alignment?: "left" | "center" | "right";
  numberFormat?: string;
}

interface XLSXCell {
  value: string | number;
  styleId?: number;
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
  const styles: XLSXStyle[] = [
    {}, // ID 0: Default
  ];

  const getStyleId = (style: XLSXStyle): number => {
    const json = JSON.stringify(style);
    const idx = styles.findIndex(s => JSON.stringify(s) === json);
    if (idx !== -1) return idx;
    styles.push(style);
    return styles.length - 1;
  };

  const worksheet: XLSXWorksheet = {
    name: "Matrix Export",
    rows: [],
  };

  // Header style
  const headerStyleId = getStyleId({
    fontWeight: "bold",
    fill: (settings.headers as any).backgroundColor || "#f5f5f5",
    fontColor: (settings.headers as any).textColor || "#000000",
    alignment: "center"
  });

  const headerRow: XLSXCell[] = [
    { value: "Row", styleId: headerStyleId },
  ];

  // Flattened column headers
  const effectiveColumns = columns.length > 0 ? columns : measures.map((m, i) => ({ key: `col:measure_${i}`, label: m.name }));
  
  if (columns.length > 0) {
    for (const col of columns) {
      for (const measure of measures) {
        headerRow.push({
          value: `${col.label} - ${measure.name}`,
          styleId: headerStyleId
        });
      }
    }
  } else {
    for (const measure of measures) {
      headerRow.push({
        value: measure.name,
        styleId: headerStyleId
      });
    }
  }
  worksheet.rows.push(headerRow);

  // Stats for conditional formatting
  const columnStats = new Map<string, { min: number; max: number }>();
  if (settings.conditionalFormatting.enabled) {
    for (const col of effectiveColumns) {
      for (let m = 0; m < measures.length; m++) {
        const values: (number | null)[] = [];
        for (const row of rows) {
          const cell = getCellValue(cellMap, row.key, col.key, m);
          if (cell?.value !== null && cell?.value !== undefined) {
             values.push(cell.value);
          }
        }
        columnStats.set(`${col.key}:${m}`, computeVisibleRangeStats(values));
      }
    }
  }

  // Data rows
  for (const row of rows) {
    if (row.calcRowKind === "blank" || row.calcRowKind === "divider") continue;

    const xlsxRow: XLSXCell[] = [];
    const indent = "  ".repeat(row.indent || 0);
    const label = row.isGrandTotal ? "Grand Total" : row.isSubtotal ? row.label : `${indent}${row.label}`;

    // Row header style
    const rowHeaderStyle: XLSXStyle = {
      alignment: "left"
    };
    if (row.isGrandTotal || row.isSubtotal) {
      rowHeaderStyle.fontWeight = "bold";
      rowHeaderStyle.fill = settings.totals.backgroundColor;
      rowHeaderStyle.fontColor = settings.totals.textColor;
    }
    
    xlsxRow.push({ value: label, styleId: getStyleId(rowHeaderStyle) });

    if (row.calcRowKind === "group") {
       for (let i = 0; i < effectiveColumns.length * (columns.length > 0 ? measures.length : 1); i++) {
         xlsxRow.push({ value: "", styleId: getStyleId({ fontWeight: "bold" }) });
       }
       worksheet.rows.push(xlsxRow);
       continue;
    }

    for (const col of effectiveColumns) {
      for (let m = 0; m < measures.length; m++) {
        const cell = getCellValue(cellMap, row.key, col.key, m);
        const value = cell?.value ?? null;
        
        const cellStyle: XLSXStyle = {
          alignment: settings.values.alignment as any || "right"
        };

        if (row.isGrandTotal || row.isSubtotal) {
          cellStyle.fontWeight = "bold";
          cellStyle.fill = settings.totals.backgroundColor;
          cellStyle.fontColor = settings.totals.textColor;
        } else if (settings.conditionalFormatting.enabled && value !== null) {
          const stats = columnStats.get(`${col.key}:${m}`) || { min: 0, max: 0 };
          const cf = evaluateConditionalFormatting(value, stats.min, stats.max, settings.conditionalFormatting);
          if (cf.backgroundColor) cellStyle.fill = cf.backgroundColor;
          if (cf.color) cellStyle.fontColor = cf.color;
        }

        xlsxRow.push({
          value: value !== null ? value : (cell?.formattedValue ?? ""),
          styleId: getStyleId(cellStyle)
        });
      }
    }
    worksheet.rows.push(xlsxRow);
  }

  return generateAdvancedXLSX(worksheet, styles);
}

function generateAdvancedXLSX(worksheet: XLSXWorksheet, styles: XLSXStyle[]): Blob {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  // Build Sheet XML
  const sheetData = worksheet.rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const colLetter = getColumnLetter(colIndex);
      const cellRef = `${colLetter}${rowIndex + 1}`;
      const s = cell.styleId ? ` s="${cell.styleId}"` : "";

      if (typeof cell.value === "number") {
        return `<c r="${cellRef}"${s}><v>${cell.value}</v></c>`;
      } else {
        return `<c r="${cellRef}"${s} t="inlineStr"><is><t>${escapeXML(String(cell.value))}</t></is></c>`;
      }
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  const sheetXML = `${xmlHeader}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`;

  // Build Styles XML
  // We need to map HEX colors to ARGB for Excel (AARRGGBB)
  const toARGB = (hex: string) => "FF" + hex.replace("#", "");
  
  const fonts = styles.map(s => {
    const bold = s.fontWeight === "bold" ? "<b/>" : "";
    const color = s.fontColor ? `<color rgb="${toARGB(s.fontColor)}"/>` : "";
    return `<font>${bold}<sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>${color}</font>`;
  }).join("");

  const fills = styles.map(s => {
    if (!s.fill) return '<fill><patternFill patternType="none"/></fill>';
    return `<fill><patternFill patternType="solid"><fgColor rgb="${toARGB(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`;
  }).join("");
  // Excel expects two default fills: none and gray125
  const fullFills = `<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills}`;

  const cellXfs = styles.map((s, i) => {
    const align = s.alignment ? `<alignment horizontal="${s.alignment}"/>` : "";
    // fillId + 2 because we added 2 default fills
    const fillId = s.fill ? i + 2 : 0;
    return `<xf numFmtId="0" fontId="${i}" fillId="${fillId}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">${align}</xf>`;
  }).join("");

  const stylesXML = `${xmlHeader}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="${styles.length}">${fonts}</fonts>
  <fills count="${styles.length + 2}">${fullFills}</fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${styles.length}">${cellXfs}</cellXfs>
</styleSheet>`;

  const workbookXML = `${xmlHeader}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXML(worksheet.name)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const relsXML = `${xmlHeader}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXML = `${xmlHeader}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypesXML = `${xmlHeader}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const zip = createZip([
    { path: "[Content_Types].xml", content: contentTypesXML },
    { path: "_rels/.rels", content: relsXML },
    { path: "xl/workbook.xml", content: workbookXML },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXML },
    { path: "xl/worksheets/sheet1.xml", content: sheetXML },
    { path: "xl/styles.xml", content: stylesXML },
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

interface ZipEntry { path: string; content: string; }

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
    view.setUint16(18, content.length, true);
    view.setUint32(22, content.length, true);
    view.setUint16(26, path.length, true);
    localHeader.set(path, 30);

    const cdHeader = new Uint8Array(46 + path.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint32(20, content.length, true);
    cdView.setUint32(24, content.length, true);
    cdView.setUint16(28, path.length, true);
    cdView.setUint32(42, offset, true);
    cdHeader.set(path, 46);

    parts.push(localHeader, content);
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
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, cdSize, true);
  endView.setUint32(16, cdOffset, true);
  parts.push(endOfCd);

  return new Blob(parts as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
