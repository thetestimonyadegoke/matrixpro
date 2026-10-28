import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { buildCSVContent } from "./csv";
import { downloadXLSX, downloadCSV, ExportOutcome, ExportDownloadBlockedError } from "./download";
import { buildExportTable, ExportStyle, ExportTable } from "./exportTable";

export function exportToXLSX(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined; values: () => IterableIterator<CellValue> },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = [],
  filename = "matrix-export.xlsx"
): Promise<ExportOutcome> {
  let blob: Blob;
  try {
    blob = tableToXLSX(buildExportTable(rows, columns, cellMap, measures, settings, rowLevelNames));
  } catch (error) {
    if (error instanceof ExportDownloadBlockedError) throw error;
    console.warn("XLSX export failed, falling back to CSV:", error);
    const csvContent = buildCSVContent(rows, columns, cellMap, measures, settings, rowLevelNames);
    return downloadCSV(csvContent, filename.replace(/\.xlsx$/i, ".csv"));
  }
  return downloadXLSX(blob, filename);
}

// ─── Number formats ──────────────────────────────────────────────────────────

function localeSeparators(): { decimal: string; group: string } {
  try {
    const parts = new Intl.NumberFormat().formatToParts(12345.6);
    return {
      decimal: parts.find(p => p.type === "decimal")?.value ?? ".",
      group: parts.find(p => p.type === "group")?.value ?? ",",
    };
  } catch {
    return { decimal: ".", group: "," };
  }
}

const SEPARATORS = localeSeparators();

function quoteFormatText(text: string): string {
  return text ? `"${text.replace(/"/g, "")}"` : "";
}

/**
 * Infers an Excel number format that renders `value` the way the grid displays
 * it (`text`): currency symbol, thousands separators, decimals, percent,
 * K/M/B scaling and parenthesised negatives. Returns "General" when the text
 * isn't a recognisable rendering of the number.
 */
export function inferExcelNumberFormat(text: string, value: number, separators = SEPARATORS): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "General";

  const parenthesised = /^\(.*\)$/.test(trimmed);
  const inner = (parenthesised ? trimmed.slice(1, -1) : trimmed).replace(/^[-−]\s*/, "");
  const first = inner.search(/\d/);
  if (first < 0) return "General";
  let last = first;
  for (let i = inner.length - 1; i >= first; i--) {
    if (/\d/.test(inner[i])) { last = i; break; }
  }
  const prefix = inner.slice(0, first).replace(/[-−]/g, "").trim();
  const suffix = inner.slice(last + 1).trim();
  const core = inner.slice(first, last + 1);

  const { decimal, group } = separators;
  const groupChars = new Set([group, " ", " ", " "]);
  if (decimal !== ",") groupChars.add(",");
  for (const ch of core) {
    if (!/\d/.test(ch) && ch !== decimal && !groupChars.has(ch)) return "General";
  }
  const decimalIndex = core.lastIndexOf(decimal);
  const decimals = decimalIndex >= 0 ? core.length - decimalIndex - 1 : 0;
  const grouped = [...core].some(ch => groupChars.has(ch));

  const digitsOnly = [...core].filter(ch => !groupChars.has(ch)).join("").replace(decimal, ".");
  const shown = Math.abs(parseFloat(digitsOnly));
  if (!Number.isFinite(shown)) return "General";

  const base = `${grouped ? "#,##0" : "0"}${decimals > 0 ? "." + "0".repeat(decimals) : ""}`;
  const magnitude = Math.abs(value);
  const tolerance = (scale: number) => 0.5 * Math.pow(10, -decimals) * scale + 1e-9 * Math.max(1, magnitude);
  const matches = (scale: number) => Math.abs(shown * scale - magnitude) <= tolerance(scale) * 1.0001;

  let body: string | null = null;
  if (suffix === "%") {
    if (matches(0.01)) body = `${base}%`;
  } else if (matches(1)) {
    body = `${base}${suffix ? quoteFormatText(suffix.startsWith(" ") ? suffix : suffix) : ""}`;
  } else if (/^[A-Za-z]{1,3}$/.test(suffix)) {
    for (const [commas, scale] of [[1, 1e3], [2, 1e6], [3, 1e9], [4, 1e12]] as const) {
      if (matches(scale)) {
        body = `${base}${",".repeat(commas)}${quoteFormatText(suffix)}`;
        break;
      }
    }
  }
  if (!body) return "General";

  const positive = `${quoteFormatText(prefix)}${body}`;
  return parenthesised ? `${positive};(${positive})` : positive;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

interface XfSpec {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fill?: string;
  numFmt?: string;
  align?: "left" | "center" | "right";
  indent?: number;
  border?: boolean;
  wrap?: boolean;
}

class StyleRegistry {
  private fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'];
  private fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  private borders: string[] = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  private numFmts = new Map<string, number>();
  private xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  private xfIds = new Map<string, number>();
  private fontIds = new Map<string, number>();
  private fillIds = new Map<string, number>();

  private fontId(spec: XfSpec): number {
    const key = `${spec.bold ? 1 : 0}${spec.italic ? 1 : 0}${spec.underline ? 1 : 0}${spec.color || ""}`;
    if (key === "000") return 0;
    let id = this.fontIds.get(key);
    if (id === undefined) {
      const color = spec.color ? `<color rgb="FF${spec.color.slice(1)}"/>` : "";
      this.fonts.push(`<font>${spec.bold ? "<b/>" : ""}${spec.italic ? "<i/>" : ""}${spec.underline ? "<u/>" : ""}<sz val="11"/>${color}<name val="Calibri"/><family val="2"/></font>`);
      id = this.fonts.length - 1;
      this.fontIds.set(key, id);
    }
    return id;
  }

  private fillId(fill: string | undefined): number {
    if (!fill) return 0;
    let id = this.fillIds.get(fill);
    if (id === undefined) {
      this.fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${fill.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`);
      id = this.fills.length - 1;
      this.fillIds.set(fill, id);
    }
    return id;
  }

  private borderId(border: boolean | undefined): number {
    if (!border) return 0;
    if (this.borders.length === 1) {
      const side = (name: string) => `<${name} style="thin"><color rgb="FFBFBFBF"/></${name}>`;
      this.borders.push(`<border>${side("left")}${side("right")}${side("top")}${side("bottom")}<diagonal/></border>`);
    }
    return 1;
  }

  private numFmtId(code: string | undefined): number {
    if (!code || code === "General") return 0;
    let id = this.numFmts.get(code);
    if (id === undefined) {
      id = 164 + this.numFmts.size;
      this.numFmts.set(code, id);
    }
    return id;
  }

  id(spec: XfSpec): number {
    const key = JSON.stringify(spec);
    const existing = this.xfIds.get(key);
    if (existing !== undefined) return existing;
    const fontId = this.fontId(spec);
    const fillId = this.fillId(spec.fill);
    const borderId = this.borderId(spec.border);
    const numFmtId = this.numFmtId(spec.numFmt);
    const alignAttrs = [
      spec.align ? `horizontal="${spec.align}"` : "",
      spec.indent ? `indent="${Math.min(15, spec.indent)}"` : "",
      spec.wrap ? 'wrapText="1"' : "",
      'vertical="center"',
    ].filter(Boolean).join(" ");
    this.xfs.push(
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}${fillId ? ' applyFill="1"' : ""}` +
      `${borderId ? ' applyBorder="1"' : ""} applyAlignment="1"><alignment ${alignAttrs}/></xf>`
    );
    const id = this.xfs.length - 1;
    this.xfIds.set(key, id);
    return id;
  }

  toXML(): string {
    const numFmts = this.numFmts.size
      ? `<numFmts count="${this.numFmts.size}">${Array.from(this.numFmts).map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${escapeXML(code)}"/>`).join("")}</numFmts>`
      : "";
    return `${XML_HEADER}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts><fills count="${this.fills.length}">${this.fills.join("")}</fills><borders count="${this.borders.length}">${this.borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

// ─── Workbook ────────────────────────────────────────────────────────────────

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31);
  return cleaned || "Matrix Export";
}

function styleSpec(style: ExportStyle, extra: XfSpec = {}): XfSpec {
  const spec: XfSpec = { ...extra };
  if (style.bold) spec.bold = true;
  if (style.italic) spec.italic = true;
  if (style.underline) spec.underline = true;
  if (style.color && style.color !== "#000000") spec.color = style.color;
  if (style.fill && style.fill !== "#FFFFFF") spec.fill = style.fill;
  if (style.align && !spec.align) spec.align = style.align;
  return spec;
}

export function tableToXLSX(table: ExportTable): Blob {
  const styles = new StyleRegistry();
  const headerRowCount = Math.max(1, table.headerRows.length);
  const columnCount = table.columns.length + 1;
  const widths = new Array<number>(columnCount).fill(8);
  const rowsXML: string[] = [];
  const merges: string[] = [];
  const headerXf = styles.id(styleSpec(table.headerStyle, { border: true, align: "center", wrap: true }));
  const cornerXf = styles.id(styleSpec(table.headerStyle, { border: true, align: "left" }));

  const note = (column: number, text: string, indent = 0) => {
    const length = Math.min(60, text.length + indent * 2 + 2);
    if (length > widths[column]) widths[column] = length;
  };

  // Header rows with merged spans; the corner cell spans all header rows.
  for (let r = 0; r < headerRowCount; r++) {
    const excelRow = r + 1;
    const cells: string[] = [];
    cells.push(r === 0 ? stringCell(0, excelRow, table.rowHeaderLabel, cornerXf) : emptyCell(0, excelRow, cornerXf));
    if (r === 0) note(0, table.rowHeaderLabel);
    let column = 1;
    for (const cell of table.headerRows[r] || []) {
      cells.push(stringCell(column, excelRow, cell.label, headerXf));
      for (let i = 1; i < cell.colSpan; i++) cells.push(emptyCell(column + i, excelRow, headerXf));
      if (cell.colSpan > 1) {
        merges.push(`${cellRef(column, excelRow)}:${cellRef(column + cell.colSpan - 1, excelRow)}`);
      } else {
        note(column, cell.label);
      }
      column += cell.colSpan;
    }
    rowsXML.push(`<row r="${excelRow}">${cells.join("")}</row>`);
  }
  if (headerRowCount > 1) merges.push(`A1:A${headerRowCount}`);

  table.rows.forEach((row, index) => {
    const excelRow = headerRowCount + index + 1;
    const cells: string[] = [];
    const labelXf = styles.id(styleSpec(row.labelStyle, { align: "left", indent: row.isTotal ? 0 : row.indent }));
    cells.push(stringCell(0, excelRow, row.label, labelXf));
    note(0, row.label, row.isTotal ? 0 : row.indent);

    row.cells.forEach((cell, c) => {
      const column = c + 1;
      if (cell.value !== null) {
        const numFmt = inferExcelNumberFormat(cell.text, cell.value);
        const xf = styles.id(styleSpec(cell.style, { numFmt, align: cell.style.align || "right" }));
        cells.push(`<c r="${cellRef(column, excelRow)}" s="${xf}"><v>${cell.value}</v></c>`);
        note(column, cell.text || String(cell.value));
      } else if (cell.text) {
        const xf = styles.id(styleSpec(cell.style, { align: cell.style.align }));
        cells.push(stringCell(column, excelRow, cell.text, xf));
        note(column, cell.text);
      } else if (cell.style.fill || row.isTotal) {
        cells.push(emptyCell(column, excelRow, styles.id(styleSpec(cell.style))));
      }
    });
    rowsXML.push(`<row r="${excelRow}">${cells.join("")}</row>`);
  });

  const lastRef = cellRef(columnCount - 1, headerRowCount + table.rows.length);
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const pane = `<pane xSplit="1" ySplit="${headerRowCount}" topLeftCell="${cellRef(1, headerRowCount + 1)}" activePane="bottomRight" state="frozen"/>`;
  const sheetXML = `${XML_HEADER}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rowsXML.join("")}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : ""}</worksheet>`;

  const sheetName = sanitizeSheetName(table.title);
  const workbookXML = `${XML_HEADER}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${escapeXML(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const relsXML = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const workbookRelsXML = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const coreXML = `${XML_HEADER}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXML(table.title)}</dc:title><dc:creator>MatrixPro</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</dcterms:created></cp:coreProperties>`;

  const contentTypesXML = `${XML_HEADER}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  return new Blob([createZip([
    { path: "[Content_Types].xml", content: contentTypesXML },
    { path: "_rels/.rels", content: relsXML },
    { path: "docProps/core.xml", content: coreXML },
    { path: "xl/workbook.xml", content: workbookXML },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXML },
    { path: "xl/worksheets/sheet1.xml", content: sheetXML },
    { path: "xl/styles.xml", content: styles.toXML() },
  ]) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function columnLetter(index: number): string {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function cellRef(column: number, row: number): string {
  return `${columnLetter(column)}${row}`;
}

function stringCell(column: number, row: number, text: string, xf: number): string {
  return `<c r="${cellRef(column, row)}"${xf ? ` s="${xf}"` : ""} t="inlineStr"><is><t xml:space="preserve">${escapeXML(text)}</t></is></c>`;
}

function emptyCell(column: number, row: number, xf: number): string {
  return `<c r="${cellRef(column, row)}"${xf ? ` s="${xf}"` : ""}/>`;
}

// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function escapeXML(str: string): string {
  return String(str)
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── ZIP (stored, no compression) ────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry { path: string; content: string; }

/** Minimal ZIP writer (method 0 / stored) with correct CRC-32 and 32-bit sizes. */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
  const UTF8_FLAG = 0x0800;

  for (const entry of entries) {
    const data = encoder.encode(entry.content);
    const name = encoder.encode(entry.path);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, UTF8_FLAG, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, DOS_TIME, true);
    lv.setUint16(12, DOS_DATE, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, UTF8_FLAG, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, DOS_TIME, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);

    parts.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of central) {
    parts.push(cd);
    cdSize += cd.length;
  }
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  parts.push(end);

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let position = 0;
  for (const p of parts) {
    out.set(p, position);
    position += p.length;
  }
  return out;
}
