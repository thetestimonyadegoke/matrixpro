import { buildMatrixModel } from "../model/pivot";
import { buildGridColumns } from "../model/gridColumns";
import { buildMergedHeaders } from "../ui/MergedColumnHeaders";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView } from "./fixtures/matrixDataView";

function headerLabels(): string[][] {
  const dataView = createMatrixDataView({ categories: 1, productsPerCategory: 1, years: 1, monthsPerYear: 2, measures: 1, withSubtotals: false });
  const root = dataView.matrix.columns.root;
  // A year subtotal (under 2020) and a grand total, as Power BI emits them.
  root.children[0].children.push({ isSubtotal: true, level: 1 });
  root.children.push({ isSubtotal: true, level: 0 });
  const product = dataView.matrix.rows.root.children[0].children[0];
  product.values = { 0: { value: 1 }, 1: { value: 2 }, 2: { value: 3 }, 3: { value: 4 } };

  const model = buildMatrixModel({
    dataView,
    settings: defaultSettings,
    selectionIdBuilder: () => undefined,
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
  });
  const gridColumns = buildGridColumns(model.flattenedColumns, model.measures, defaultSettings, []);
  const rows = buildMergedHeaders(
    model.flattenedColumns, model.measures, "time-then-measure",
    { columnKey: null, measureIndex: 0, direction: "none" } as any, gridColumns,
  );
  return rows.map(r => r.cells.map(c => c.label));
}

describe("total column headers", () => {
  it("names the grand total and subtotal columns", () => {
    const labels = headerLabels().flat();
    expect(labels).toContain("Grand Total");
    expect(labels).toContain("Total");
  });
});
