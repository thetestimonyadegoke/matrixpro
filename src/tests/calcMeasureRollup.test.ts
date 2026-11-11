import { buildMatrixModel } from "../model/pivot";
import { generateCellKey, generateColumnKey, generateRowKey } from "../model/keys";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView } from "./fixtures/matrixDataView";

const ratio = (extra: Record<string, unknown> = {}) => ({
  id: "cm_ratio",
  name: "Ratio",
  description: "",
  formula: "[Measure 2] / [Measure 1]",
  format: "",
  aggregationMode: "afterTotals",
  aggregationType: "formula",
  enabled: true,
  order: 0,
  ...extra,
});

function build(calc: Record<string, unknown>, rowExpanded?: Map<string, boolean>) {
  const dataView = createMatrixDataView({ categories: 1, productsPerCategory: 2, years: 1, monthsPerYear: 1, measures: 2, withSubtotals: true });
  // Known inputs: product 1 = 10 / 5, product 2 = 30 / 5.
  const [p1, p2] = dataView.matrix.rows.root.children[0].children;
  p1.values = { 0: { value: 10 }, 1: { value: 5 } };
  p2.values = { 0: { value: 30 }, 1: { value: 5 } };
  const settings = {
    ...defaultSettings,
    calculations: { ...defaultSettings.calculations, measures: JSON.stringify([calc]) },
  };
  const model = buildMatrixModel({
    dataView,
    settings,
    selectionIdBuilder: () => undefined,
    rowExpandedState: rowExpanded ?? new Map(),
    columnExpandedState: new Map(),
  });
  return model;
}

const colKey = generateColumnKey([2020, "Jan"]);
const calcIndex = 2;

describe("calculated measures on parent rows", () => {
  it("divides the totals instead of adding up the children's ratios", () => {
    const model = build(ratio());
    const category = model.flattenedRows.find(r => r.key === generateRowKey(["Category 1"]))!;
    const cell = model.cellMap.get(generateCellKey(category.key, colKey, calcIndex));
    // (5 + 5) / (10 + 30) = 0.25, not 0.5 + 0.1667... summed.
    expect(cell?.value).toBeCloseTo(0.25, 6);
  });

  it("keeps leaf rows as their own ratio", () => {
    const model = build(ratio());
    const leaf = generateRowKey(["Category 1", "Product 1-1"]);
    expect(model.cellMap.get(generateCellKey(leaf, colKey, calcIndex))?.value).toBeCloseTo(0.5, 6);
  });

  it("still sums when the measure is set to Sum", () => {
    const model = build(ratio({ aggregationType: "sum" }));
    const category = generateRowKey(["Category 1"]);
    expect(model.cellMap.get(generateCellKey(category, colKey, calcIndex))?.value).toBeCloseTo(0.5 + 5 / 30, 6);
  });

  it("supports Average, and honours Compute-after-totals when no type was saved", () => {
    const average = build(ratio({ aggregationType: "average" }));
    const category = generateRowKey(["Category 1"]);
    expect(average.cellMap.get(generateCellKey(category, colKey, calcIndex))?.value).toBeCloseTo((0.5 + 5 / 30) / 2, 6);

    const legacy = build(ratio({ aggregationType: undefined }));
    expect(legacy.cellMap.get(generateCellKey(category, colKey, calcIndex))?.value).toBeCloseTo(0.25, 6);
  });
});
