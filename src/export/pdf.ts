import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { downloadPDF, ExportOutcome } from "./download";
import { buildExportTable, ExportStyle, ExportTable } from "./exportTable";

export async function exportToPDF(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = [],
  filename = "matrix-export.pdf"
): Promise<ExportOutcome> {
  const table = buildExportTable(rows, columns, cellMap, measures, settings, rowLevelNames);
  return downloadPDF(tableToPDF(table), filename);
}

// ─── Text encoding & metrics (standard Helvetica, WinAnsiEncoding) ───────────

const CP1252_EXTRAS: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
const SUBSTITUTES: Record<number, string> = { 0x2212: "-", 0x202f: " ", 0x2009: " ", 0x20a6: "N", 0x20b9: "Rs" };

/** Encodes text to WinAnsi bytes; characters outside it become a close substitute or "?". */
export function toWinAnsi(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) bytes.push(code);
    else if (CP1252_EXTRAS[code] !== undefined) bytes.push(CP1252_EXTRAS[code]);
    else if (SUBSTITUTES[code] !== undefined) for (const s of SUBSTITUTES[code]) bytes.push(s.charCodeAt(0));
    else if (code === 0x09) bytes.push(0x20);
    else if (code >= 0x20) bytes.push(0x3f);
  }
  return bytes;
}

// AFM advance widths (1/1000 em) for ASCII 32..126.
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELVETICA_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

function textWidth(bytes: number[], size: number, bold: boolean): number {
  const widths = bold ? HELVETICA_BOLD : HELVETICA;
  let total = 0;
  for (const b of bytes) total += b >= 32 && b <= 126 ? widths[b - 32] : 556;
  return (total * size) / 1000;
}

const ELLIPSIS = 0x85;

function fitText(text: string, maxWidth: number, size: number, bold: boolean): number[] {
  const bytes = toWinAnsi(text);
  if (textWidth(bytes, size, bold) <= maxWidth) return bytes;
  const ellipsisWidth = textWidth([ELLIPSIS], size, bold);
  let width = 0;
  const widths = bold ? HELVETICA_BOLD : HELVETICA;
  const out: number[] = [];
  for (const b of bytes) {
    const w = ((b >= 32 && b <= 126 ? widths[b - 32] : 556) * size) / 1000;
    if (width + w + ellipsisWidth > maxWidth) break;
    out.push(b);
    width += w;
  }
  out.push(ELLIPSIS);
  return out;
}

function pdfString(bytes: number[]): string {
  let out = "(";
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out += "\\" + String.fromCharCode(b);
    else if (b < 0x20 || b > 0x7e) out += "\\" + b.toString(8).padStart(3, "0");
    else out += String.fromCharCode(b);
  }
  return out + ")";
}

function rgb(hex: string | undefined, fallback: [number, number, number]): string {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return fallback.map(v => v.toFixed(3)).join(" ");
  return [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 28;
const FONT = 7.5;
const ROW_H = 13;
const HEADER_H = 14;
const PAD = 3;
const INDENT_PT = 7;
const MIN_COL = 42;
const MAX_COL = 150;
const BLACK: [number, number, number] = [0.1, 0.1, 0.1];
const GRID = "0.85 0.85 0.85";

class Page {
  ops: string[] = [];
  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.ops.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  stroke(x: number, y: number, w: number, h: number) {
    this.ops.push(`${GRID} RG 0.4 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }
  text(bytes: number[], x: number, y: number, size: number, bold: boolean, color: string) {
    if (bytes.length === 0) return;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(bytes)} Tj ET`);
  }
}

function drawCell(
  page: Page,
  text: string,
  x: number,
  top: number,
  width: number,
  height: number,
  style: ExportStyle,
  align: "left" | "center" | "right",
  indent = 0
) {
  const y = top - height;
  if (style.fill) page.rect(x, y, width, height, rgb(style.fill, [1, 1, 1]));
  page.stroke(x, y, width, height);
  const bold = !!style.bold;
  const available = width - PAD * 2 - indent;
  const bytes = fitText(text, Math.max(4, available), FONT, bold);
  const w = textWidth(bytes, FONT, bold);
  const tx = align === "right" ? x + width - PAD - w : align === "center" ? x + (width - w) / 2 : x + PAD + indent;
  page.text(bytes, tx, y + (height - FONT) / 2 + 1.5, FONT, bold, rgb(style.color, BLACK));
}

/**
 * Renders the table across as many pages as needed. Columns that don't fit
 * the page width continue on following pages (row labels repeat), and header
 * rows repeat on every page — no data is dropped.
 */
export function tableToPDF(table: ExportTable): Blob {
  const measure = (text: string, bold = false) => textWidth(toWinAnsi(text), FONT, bold) + PAD * 2;

  let labelWidth = measure(table.rowHeaderLabel, true);
  for (const row of table.rows) {
    labelWidth = Math.max(labelWidth, measure(row.label, !!row.labelStyle.bold) + (row.isTotal ? 0 : row.indent * INDENT_PT));
  }
  labelWidth = Math.min(220, Math.max(80, labelWidth));

  const leafHeaders = table.headerRows[table.headerRows.length - 1] || [];
  const colWidths = table.columns.map((_, c) => {
    let w = MIN_COL;
    const leaf = leafHeaders.length === table.columns.length ? leafHeaders[c] : undefined;
    if (leaf) w = Math.max(w, measure(leaf.label, true));
    for (const row of table.rows) w = Math.max(w, measure(row.cells[c]?.text || "", !!row.cells[c]?.style.bold));
    return Math.min(MAX_COL, w);
  });

  // Column bands that fit the printable width next to the label column.
  const usable = PAGE_W - MARGIN * 2 - labelWidth;
  const bands: Array<[number, number]> = [];
  for (let start = 0; start < table.columns.length;) {
    let end = start;
    let width = 0;
    while (end < table.columns.length && (end === start || width + colWidths[end] <= usable)) {
      width += colWidths[end];
      end++;
    }
    bands.push([start, end]);
    start = end;
  }
  if (bands.length === 0) bands.push([0, 0]);

  const headerBlock = Math.max(1, table.headerRows.length) * HEADER_H;
  const tableTop = PAGE_H - MARGIN - 30;
  const rowsPerPage = Math.max(1, Math.floor((tableTop - headerBlock - MARGIN - 14) / ROW_H));
  const rowChunks: Array<[number, number]> = [];
  for (let i = 0; i < Math.max(1, table.rows.length); i += rowsPerPage) rowChunks.push([i, Math.min(table.rows.length, i + rowsPerPage)]);

  const pages: Page[] = [];
  const generated = new Date().toLocaleString();
  for (const [bandStart, bandEnd] of bands) {
    for (const [rowStart, rowEnd] of rowChunks) {
      const page = new Page();
      pages.push(page);
      page.text(fitText(table.title, PAGE_W - MARGIN * 2, 13, true), MARGIN, PAGE_H - MARGIN - 12, 13, true, rgb(undefined, BLACK));
      const bandNote = bands.length > 1 ? `  •  Columns ${bandStart + 1}–${bandEnd} of ${table.columns.length}` : "";
      page.text(toWinAnsi(`Exported ${generated}${bandNote}`), MARGIN, PAGE_H - MARGIN - 24, 7, false, "0.45 0.45 0.45");

      // Header block: corner cell spans all header rows.
      const headerStyle: ExportStyle = { ...table.headerStyle, fill: table.headerStyle.fill || "#F2F2F2", bold: true };
      drawCell(page, table.rowHeaderLabel, MARGIN, tableTop, labelWidth, headerBlock, headerStyle, "left");
      table.headerRows.forEach((headerRow, r) => {
        const top = tableTop - r * HEADER_H;
        let column = 0;
        let x = MARGIN + labelWidth;
        for (const cell of headerRow) {
          const from = Math.max(column, bandStart);
          const to = Math.min(column + cell.colSpan, bandEnd);
          if (to > from) {
            let width = 0;
            for (let c = from; c < to; c++) width += colWidths[c];
            drawCell(page, cell.label, x, top, width, HEADER_H, headerStyle, "center");
            x += width;
          }
          column += cell.colSpan;
        }
      });

      for (let r = rowStart; r < rowEnd; r++) {
        const row = table.rows[r];
        const top = tableTop - headerBlock - (r - rowStart) * ROW_H;
        drawCell(page, row.label, MARGIN, top, labelWidth, ROW_H, row.labelStyle, "left", row.isTotal ? 0 : row.indent * INDENT_PT);
        let x = MARGIN + labelWidth;
        for (let c = bandStart; c < bandEnd; c++) {
          const cell = row.cells[c];
          const align = cell?.style.align || (cell?.value !== null && cell?.value !== undefined ? "right" : "left");
          drawCell(page, cell?.text || "", x, top, colWidths[c], ROW_H, cell?.style || {}, align);
          x += colWidths[c];
        }
      }
    }
  }

  pages.forEach((page, i) => {
    const footer = toWinAnsi(`Page ${i + 1} of ${pages.length}`);
    page.text(footer, PAGE_W - MARGIN - textWidth(footer, 7, false), MARGIN - 14, 7, false, "0.45 0.45 0.45");
  });

  return new Blob([buildPdfDocument(pages.map(p => p.ops.join("\n")))], { type: "application/pdf" });
}

/** Assembles an ASCII-only PDF so string length equals byte length and xref offsets are exact. */
export function buildPdfDocument(pageContents: string[]): string {
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pagesId = objects.length + 1 + pageContents.length * 2;
  const pageIds: number[] = [];
  for (const content of pageContents) {
    const stream = `${content}\n`;
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const info = add(`<< /Producer (MatrixPro) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
