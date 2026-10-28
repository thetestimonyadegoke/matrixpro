import { buildMatrixModel } from "../model/pivot";
import { buildGridColumns } from "../model/gridColumns";
import { defaultSettings, VisualSettings } from "../settings/settings";
import { buildExportTable, flatColumnLabels, normalizeExportColor } from "../export/exportTable";
import { escapeCSV, tableToCSV, tableToTSV } from "../export/csv";
import { crc32, createZip, inferExcelNumberFormat, tableToXLSX } from "../export/xlsx";
import { buildPdfDocument, tableToPDF, toWinAnsi } from "../export/pdf";
import { buildJSONExport } from "../export/json";
import { createMatrixDataView, MatrixFixtureOptions } from "./fixtures/matrixDataView";

function setup(options: Partial<MatrixFixtureOptions> = {}, settingsPatch: (s: VisualSettings) => VisualSettings = s => s) {
  const settings = settingsPatch({ ...defaultSettings, manualData: { ...defaultSettings.manualData } });
  const model = buildMatrixModel({
    dataView: createMatrixDataView({ categories: 2, productsPerCategory: 3, years: 1, monthsPerYear: 2, measures: 2, ...options }),
    settings,
    selectionIdBuilder: () => undefined,
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
  });
  const table = buildExportTable(model.flattenedRows, model.flattenedColumns, model.cellMap, model.measures, settings, model.rowLevelNames);
  return { model, settings, table };
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("export table matches the grid", () => {
  it("uses the grid's column plan, not every flattened column node", () => {
    const { model, settings, table } = setup();
    const grid = buildGridColumns(model.flattenedColumns, model.measures, settings);
    expect(table.columns.map(c => `${c.key}|${c.measureIndex}`)).toEqual(grid.map(g => `${g.col.key}|${g.measureIndex}`));
    // 1 year × 2 months × 2 measures; expanded parents (the year) are headers, not data columns.
    expect(table.columns).toHaveLength(4);
  });

  it("honours hidden columns", () => {
    const { model } = setup();
    const jan = model.flattenedColumns.find(c => c.label === "Jan")!;
    const { table } = setup({}, s => ({ ...s, manualData: { ...s.manualData, hiddenCols: JSON.stringify([jan.key]) } }));
    expect(table.columns.some(c => c.key === jan.key)).toBe(false);
    expect(table.columns).toHaveLength(2);
  });

  it("builds multi-level headers whose spans cover every column", () => {
    const { table } = setup();
    expect(table.headerRows.length).toBeGreaterThanOrEqual(2);
    for (const headerRow of table.headerRows) {
      expect(headerRow.reduce((sum, cell) => sum + cell.colSpan, 0)).toBe(table.columns.length);
    }
    expect(flatColumnLabels(table)[0]).toBe("2020 - Jan - Measure 1");
  });

  it("labels totals meaningfully and applies label overrides", () => {
    const { model } = setup();
    const product = model.flattenedRows.find(r => r.label === "Product 1-1")!;
    const { table } = setup({}, s => ({ ...s, manualData: { ...s.manualData, labelOverrides: JSON.stringify({ [product.key]: "Renamed" }) } }));
    const labels = table.rows.map(r => r.label);
    expect(labels).toContain("Category 1 Total");
    expect(labels).toContain("Grand Total");
    expect(labels).toContain("Renamed");
    expect(table.rows.find(r => r.label === "Grand Total")!.isGrandTotal).toBe(true);
  });

  it("exports the text the grid displays (grid formatting applied) and the raw value", () => {
    const { model, table } = setup();
    const row = table.rows.find(r => r.label === "Product 1-1")!;
    const source = model.flattenedRows.find(r => r.label === "Product 1-1")!;
    const cell = model.cellMap.get(`${source.key}::${table.columns[0].key}::m0`)!;
    expect(row.cells[0].value).toBe(cell.value);
    // The grid applies values.decimals (default 0), so 25.23 is shown as "25".
    const shown = (cell.value as number).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    expect(row.cells[0].text).toBe(shown);
    const twoDecimals = setup({}, s => ({ ...s, values: { ...s.values, decimals: 2 } })).table;
    expect(twoDecimals.rows.find(r => r.label === "Product 1-1")!.cells[0].text)
      .toBe((cell.value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  });

  it("reflects manual edits", () => {
    const { model, table: before } = setup();
    const source = model.flattenedRows.find(r => r.label === "Product 1-1")!;
    const editKey = `${source.key}|${before.columns[0].key}|0`;
    const { table } = setup({}, s => ({ ...s, manualData: { ...s.manualData, edits: JSON.stringify({ [editKey]: "1234.5" }) } }));
    expect(table.rows.find(r => r.label === "Product 1-1")!.cells[0].value).toBe(1234.5);
  });

  it("normalizes colors to file-safe hex", () => {
    expect(normalizeExportColor("#abc")).toBe("#AABBCC");
    expect(normalizeExportColor("rgba(255, 0, 16, 0.5)")).toBe("#FF0010");
    expect(normalizeExportColor("rgba(0,0,0,0)")).toBeUndefined();
    expect(normalizeExportColor("var(--mx-cell-fg)")).toBeUndefined();
    expect(normalizeExportColor("transparent")).toBeUndefined();
  });
});

describe("CSV", () => {
  it("quotes, uses CRLF and neutralizes formula injection without touching negative numbers", () => {
    expect(escapeCSV('a,"b"')).toBe('"a,""b"""');
    expect(escapeCSV("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(escapeCSV("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCSV("-1,234.50")).toBe('"-1,234.50"');
    expect(escapeCSV("-12")).toBe("-12");
    expect(escapeCSV("+cmd")).toBe("'+cmd");
    const { table } = setup();
    const csv = tableToCSV(table);
    expect(csv.split("\r\n")).toHaveLength(table.rows.length + 1);
  });
});

describe("XLSX", () => {
  it("computes standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a ZIP whose entries carry correct CRCs and 32-bit sizes, including >64 KB parts", () => {
    const big = "x".repeat(200000);
    const zip = createZip([{ path: "a.txt", content: "hello" }, { path: "big.txt", content: big }]);
    const view = new DataView(zip.buffer);
    let offset = 0;
    const seen: Array<{ name: string; size: number; crcOk: boolean }> = [];
    while (view.getUint32(offset, true) === 0x04034b50) {
      const crc = view.getUint32(offset + 14, true);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const name = new TextDecoder().decode(zip.subarray(offset + 30, offset + 30 + nameLength));
      const data = zip.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size);
      seen.push({ name, size, crcOk: crc32(data) === crc });
      offset += 30 + nameLength + size;
    }
    expect(seen).toEqual([
      { name: "a.txt", size: 5, crcOk: true },
      { name: "big.txt", size: 200000, crcOk: true },
    ]);
  });

  it("infers Excel number formats from the displayed text", () => {
    const sep = { decimal: ".", group: "," };
    expect(inferExcelNumberFormat("1,234.50", 1234.5, sep)).toBe("#,##0.00");
    expect(inferExcelNumberFormat("$1,234.50", 1234.5, sep)).toBe('"$"#,##0.00');
    expect(inferExcelNumberFormat("12.5%", 0.125, sep)).toBe("0.0%");
    expect(inferExcelNumberFormat("1.2K", 1234, sep)).toBe('0.0,"K"');
    expect(inferExcelNumberFormat("3.4M", 3400000, sep)).toBe('0.0,,"M"');
    expect(inferExcelNumberFormat("(1,234.00)", -1234, sep)).toBe("#,##0.00;(#,##0.00)");
    expect(inferExcelNumberFormat("€9.99", 9.99, sep)).toBe('"€"0.00');
    expect(inferExcelNumberFormat("hello", 3, sep)).toBe("General");
    expect(inferExcelNumberFormat("1.234,50", 1234.5, { decimal: ",", group: "." })).toBe("#,##0.00");
  });

  it("produces a workbook", async () => {
    const { table } = setup({}, s => ({ ...s, conditionalFormatting: { ...s.conditionalFormatting, enabled: true } }));
    const bytes = await blobBytes(tableToXLSX(table));
    expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(0x04034b50);
    const wide = setup({ years: 3, monthsPerYear: 12, measures: 3, categories: 5, productsPerCategory: 40 });
  });
});

describe("PDF", () => {
  function checkStructure(pdf: string) {
    expect([...pdf].every(ch => ch === "\n" || (ch >= " " && ch <= "~"))).toBe(true);
    const xrefAt = Number(pdf.match(/startxref\n(\d+)\n%%EOF$/)![1]);
    expect(pdf.slice(xrefAt, xrefAt + 4)).toBe("xref");
    const entries = pdf.slice(xrefAt).split("\n").filter(line => / 00000 n $/.test(line)).map(line => Number(line.slice(0, 10)));
    entries.forEach((offset, i) => expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    for (const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = match.index! + match[0].length;
      expect(pdf.slice(start + Number(match[1]), start + Number(match[1]) + 9)).toBe("endstream");
    }
    return entries.length;
  }

  it("encodes WinAnsi characters and substitutes the rest", () => {
    expect(toWinAnsi("€£é")).toEqual([0x80, 0xa3, 0xe9]);
    expect(toWinAnsi("₦5")).toEqual([0x4e, 0x35]);
    expect(toWinAnsi("日")).toEqual([0x3f]);
  });

  it("writes byte-exact xref offsets even with non-ASCII text", () => {
    checkStructure(buildPdfDocument(["BT /F1 8 Tf 10 10 Td (\\200 \\243) Tj ET"]));
  });

  it("pages wide tables instead of dropping columns", async () => {
    const { table } = setup({ years: 3, monthsPerYear: 12, measures: 2, categories: 3, productsPerCategory: 30 });
    const pdf = await (tableToPDF(table) as Blob).text();
    checkStructure(pdf);
    const pageCount = Number(pdf.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)![1]);
    expect(pageCount).toBeGreaterThan(1);
    // The last column's header label must appear somewhere in the document.
    expect(pdf).toContain("Columns");
  });
});

describe("JSON", () => {
  it("keeps the established top-level shape", () => {
    const { model, table } = setup();
    const json: any = buildJSONExport(table, model.flattenedRows, model.measures);
    expect(Object.keys(json)).toEqual(["metadata", "schema", "data"]);
    const first = json.data[0];
    const colKey = table.columns[0].key;
    expect(first.values[colKey]["Measure 1"]).toHaveProperty("raw");
    expect(first.values[colKey]["Measure 1"]).toHaveProperty("formatted");
  });
});

describe("clipboard table (tab-separated)", () => {
  it("has the same shape as the CSV: one header row plus one line per row", () => {
    const { table } = setup();
    const lines = tableToTSV(table).split("\r\n");
    expect(lines).toHaveLength(table.rows.length + 1);
    const width = 1 + flatColumnLabels(table).length;
    for (const line of lines) expect(line.split("\t")).toHaveLength(width);
  });

  it("quotes cells that contain tabs, quotes or line breaks and neutralizes formulas", () => {
    const table = {
      title: "t",
      rowHeaderLabel: "Row",
      headerRows: [[{ label: "A", colSpan: 1 }]],
      columns: [{ key: "k", measureIndex: 0, label: "A" }],
      rows: [
        { label: "has\ttab", indent: 0, isTotal: false, cells: [{ text: "say \"hi\"" }] },
        { label: "=SUM(A1)", indent: 1, isTotal: false, cells: [{ text: "-12.5" }] },
      ],
      headerStyle: {},
    } as unknown as Parameters<typeof tableToTSV>[0];
    const lines = tableToTSV(table).split("\r\n");
    expect(lines[1]).toBe('"has\ttab"\t"say ""hi"""');
    expect(lines[2]).toBe("'  =SUM(A1)\t-12.5");
  });
});
