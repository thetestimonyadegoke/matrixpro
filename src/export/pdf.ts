import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export async function exportToPDF(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: { get: (key: string) => CellValue | undefined },
  measures: MeasureInfo[],
  settings: VisualSettings
): Promise<void> {
  alert("Export to PDF is not fully implemented natively to avoid bundle bloat. Please use standard browser print functionality.");
  window.print();
}
