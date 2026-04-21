import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export async function exportToPDF(
  _rows: FlattenedNode[],
  _columns: FlattenedNode[],
  _cellMap: { get: (key: string) => CellValue | undefined },
  _measures: MeasureInfo[],
  _settings: VisualSettings
): Promise<void> {
  // Use standard browser print functionality for lightweight PDF generation
  // without bloating the MatrixPro custom visual bundle.
  window.print();
}
