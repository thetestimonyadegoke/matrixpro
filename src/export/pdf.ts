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
  // Use standard browser print functionality for lightweight PDF generation
  // without bloating the MatrixPro custom visual bundle.
  window.print();
}
