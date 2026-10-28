import { buildMatrixModel, getCellValue } from "../model/pivot";
import { applyAggregationOverrides } from "../model/aggregationOverrides";
import { generateCellKey, generateColumnKey, generateRowKey } from "../model/keys";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView } from "./fixtures/matrixDataView";

function model(measures = 2) {
  return buildMatrixModel({
    dataView: createMatrixDataView({ categories: 2, productsPerCategory: 3, years: 1, monthsPerYear: 2, measures }),
    settings: { ...defaultSettings, totals: { ...defaultSettings.totals, showRowSubtotals: true } },
    selectionIdBuilder: () => undefined,
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
  });
}

describe("applyAggregationOverrides", () => {
  const jan = generateColumnKey([2020, "Jan"]);
  const products = (c: number) => [1, 2, 3].map(p => generateRowKey([`Category ${c}`, `Product ${c}-${p}`]));

  it("returns the base map untouched when no override is active", () => {
    const m = model();
    expect(applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, {})).toBe(m.cellMap);
    expect(applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "sum" })).toBe(m.cellMap);
  });

  it("keeps every non-total cell resolvable (grid must not go blank)", () => {
    const m = model();
    const view = applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "avg" });
    for (const key of products(1)) {
      expect(getCellValue(view, key, jan, 0)?.value).toBe(getCellValue(m.cellMap, key, jan, 0)?.value);
      expect(getCellValue(view, key, jan, 1)?.value).toBe(getCellValue(m.cellMap, key, jan, 1)?.value);
    }
  });

  it("averages a category subtotal over that category's leaves only", () => {
    const m = model();
    const view = applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "avg", 1: "max" });
    const subtotal = m.flattenedRows.find(r => r.isSubtotal && !r.isGrandTotal && r.path?.[0] === "Category 1")!;
    const leaf = (k: string, mi: number) => getCellValue(m.cellMap, k, jan, mi)!.value as number;
    const expectedAvg = products(1).map(k => leaf(k, 0)).reduce((a, b) => a + b, 0) / 3;
    const expectedMax = Math.max(...products(1).map(k => leaf(k, 1)));
    expect(getCellValue(view, subtotal.key, jan, 0)?.value).toBeCloseTo(expectedAvg, 9);
    expect(getCellValue(view, subtotal.key, jan, 1)?.value).toBe(expectedMax);
  });

  it("counts all leaves for the grand total and blanks it for 'none'", () => {
    const m = model(1);
    const grand = m.flattenedRows.find(r => r.isGrandTotal || (r.isSubtotal && (r.path?.length ?? 0) === 0))!;
    const counted = applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "count" });
    expect(counted.get(generateCellKey(grand.key, jan, 0))?.value).toBe(6);
    const blanked = applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "none" });
    expect(blanked.get(generateCellKey(grand.key, jan, 0))?.value).toBeNull();
  });

  it("values() yields each cell once with overrides substituted", () => {
    const m = model(1);
    const view = applyAggregationOverrides(m.cellMap, m.flattenedRows, m.flattenedColumns, m.measures, m.rowTree, { 0: "min" });
    const all = Array.from(view.values());
    expect(all.length).toBe(m.cellMap.size);
    const grand = m.flattenedRows.find(r => r.isGrandTotal || (r.isSubtotal && (r.path?.length ?? 0) === 0))!;
    expect(all.find(c => c.rowKey === grand.key && c.colKey === jan)?.value).toBe(view.get(generateCellKey(grand.key, jan, 0))?.value);
  });
});
