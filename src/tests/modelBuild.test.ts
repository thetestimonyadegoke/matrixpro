import { buildMatrixModel } from "../model/pivot";
import { generateCellKey, generateColumnKey, generateRowKey } from "../model/keys";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView, fingerprintModel, MatrixFixtureOptions } from "./fixtures/matrixDataView";

function build(options: MatrixFixtureOptions) {
  const dataView = createMatrixDataView(options);
  const started = Date.now();
  const model = buildMatrixModel({
    dataView,
    settings: defaultSettings,
    selectionIdBuilder: () => undefined,
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
  });
  return { model, ms: Date.now() - started };
}

const SMALL: MatrixFixtureOptions = { categories: 4, productsPerCategory: 5, years: 2, monthsPerYear: 3, measures: 2 };
const LARGE: MatrixFixtureOptions = { categories: 40, productsPerCategory: 100, years: 3, monthsPerYear: 12, measures: 3 };

describe("buildMatrixModel output is stable", () => {
  // Golden fingerprints captured from the implementation before any
  // performance work. A mismatch means the model output changed.
  it("small matrix", () => {
    expect(fingerprintModel(build(SMALL).model)).toMatchSnapshot();
  });

  it("large matrix", () => {
    const { model, ms } = build(LARGE);
    // eslint-disable-next-line no-console
    console.log(`buildMatrixModel LARGE: ${ms}ms, ${model.flattenedRows.length} rows, ${model.cellMap.size} cells`);
    expect(fingerprintModel(model)).toMatchSnapshot();
  });
});

describe("column rollups count each column once regardless of measure count", () => {
  const rowKey = generateRowKey(["Category 1", "Product 1-1"]);

  it.each([1, 2, 3])("collapsed year equals the sum of its months (%i measures)", (measures) => {
    const dataView = createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 3, measures, withSubtotals: false });
    const yearKey = generateColumnKey([2020]);
    const model = buildMatrixModel({
      dataView,
      settings: defaultSettings,
      selectionIdBuilder: () => undefined,
      rowExpandedState: new Map(),
      columnExpandedState: new Map([[yearKey, false]]),
    });
    for (let m = 0; m < measures; m++) {
      const monthSum = ["Jan", "Feb", "Mar"]
        .map(month => model.cellMap.get(generateCellKey(rowKey, generateColumnKey([2020, month]), m))?.value ?? 0)
        .reduce((a, b) => a + b, 0);
      expect(model.cellMap.get(generateCellKey(rowKey, yearKey, m))?.value).toBeCloseTo(monthSum, 6);
    }
  });

  it.each([1, 3])("column subtotal sums leaf months once (%i measures)", (measures) => {
    const dataView = createMatrixDataView({ categories: 1, productsPerCategory: 1, years: 1, monthsPerYear: 2, measures, withSubtotals: false });
    dataView.matrix.columns.root.children[0].children.push({
      isSubtotal: true,
      level: 1,
      children: measures > 1 ? Array.from({ length: measures }, (_, m) => ({ level: 2, levelSourceIndex: m, isSubtotal: true })) : undefined,
    });
    const product = dataView.matrix.rows.root.children[0].children[0];
    for (let i = 0; i < 3 * measures; i++) {
      product.values[i] = { value: i < 2 * measures ? (i % measures === 0 ? 10 : 1) : 999 };
    }
    const model = buildMatrixModel({
      dataView,
      settings: defaultSettings,
      selectionIdBuilder: () => undefined,
      rowExpandedState: new Map(),
      columnExpandedState: new Map(),
    });
    const subtotal = model.flattenedColumns.find(c => c.isSubtotal)!;
    expect(model.cellMap.get(generateCellKey(rowKey, subtotal.key, 0))?.value).toBe(20);
  });
});
