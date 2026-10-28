import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { downloadJSON, ExportOutcome } from "./download";
import { buildExportTable, ExportTable, flatColumnLabels } from "./exportTable";

/**
 * JSON export of the matrix as displayed. The top-level shape
 * (metadata / schema / data[].values[columnKey][measureName]) is unchanged from
 * earlier versions so existing consumers keep working.
 */
export function buildJSONExport(table: ExportTable, rows: FlattenedNode[], measures: MeasureInfo[]): object {
  const labels = flatColumnLabels(table);
  const exportedRows = rows.filter(r => r.calcRowKind !== "blank" && r.calcRowKind !== "divider");
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      rowCount: table.rows.length,
      colCount: table.columns.length,
      title: table.title,
    },
    schema: {
      columns: table.columns.map((c, i) => ({ key: c.key, label: labels[i], measureIndex: c.measureIndex })),
      measures: measures.map(m => ({ id: m.index, name: m.name, format: m.format })),
    },
    data: table.rows.map((row, r) => {
      const source = exportedRows[r];
      const values: Record<string, Record<string, { raw: number | null; formatted: string }>> = {};
      table.columns.forEach((col, c) => {
        const measureName = measures[col.measureIndex]?.name ?? `Measure ${col.measureIndex + 1}`;
        (values[col.key] ||= {})[measureName] = { raw: row.cells[c].value, formatted: row.cells[c].text };
      });
      return {
        key: source?.key,
        label: row.label,
        level: source?.level,
        isTotal: row.isTotal,
        values,
      };
    }),
  };
}

export function exportToJSON(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings,
  rowLevelNames: string[] = [],
  filename = "matrix-export.json"
): Promise<ExportOutcome> {
  const table = buildExportTable(rows, columns, cellMap, measures, settings, rowLevelNames);
  return downloadJSON(buildJSONExport(table, rows, measures), filename);
}
