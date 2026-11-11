import { buildMatrixModel } from "../model/pivot";
import { buildGridColumns } from "../model/gridColumns";
import { computeYtdValue } from "../calculations/calculatedMeasures";
import { generateCellKey, generateRowKey } from "../model/keys";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView } from "./fixtures/matrixDataView";

const ratio = {
  id: "cm_ratio", name: "Ratio", description: "", formula: "[Measure 2] / [Measure 1]", format: "",
  aggregationMode: "afterTotals", aggregationType: "formula", enabled: true, order: 0,
};

function plan(ytd: { ytdEnabled: boolean; ytdPlacement?: "start" | "end" }, rules: unknown[] = []) {
  const settings = {
    ...defaultSettings,
    calculations: {
      ...defaultSettings.calculations,
      measures: JSON.stringify([ratio]),
      visualColumns: JSON.stringify(rules),
      ...ytd,
    },
  } as typeof defaultSettings;
  const dataView = createMatrixDataView({ categories: 1, productsPerCategory: 1, years: 2, monthsPerYear: 2, measures: 2, withSubtotals: false });
  const model = buildMatrixModel({
    dataView, settings, selectionIdBuilder: () => undefined, rowExpandedState: new Map(), columnExpandedState: new Map(),
  });
  return { model, grid: buildGridColumns(model.flattenedColumns, model.measures, settings) };
}

const ytdCols = (grid: ReturnType<typeof plan>["grid"]) => grid.filter(c => c.synthetic === "ytd");

describe("year-to-date column for all regular measures", () => {
  it("adds nothing when switched off", () => {
    expect(ytdCols(plan({ ytdEnabled: false }).grid)).toHaveLength(0);
  });

  it("adds one YTD column per measure, calculated measures included", () => {
    const { grid } = plan({ ytdEnabled: true });
    expect(ytdCols(grid).map(c => c.measure.name)).toEqual(["Measure 1", "Measure 2", "Ratio"]);
  });

  it("leaves out a measure that has its own visual-column rule", () => {
    const { grid } = plan({ ytdEnabled: true }, [{ id: "r1", enabled: true, sourceMeasureName: "Measure 2", frequency: "yearly" }]);
    expect(ytdCols(grid).map(c => c.measure.name)).toEqual(["Measure 1", "Ratio"]);
  });

  it("puts the block at the end or the start", () => {
    const end = plan({ ytdEnabled: true, ytdPlacement: "end" }).grid;
    expect(end[end.length - 1].synthetic).toBe("ytd");
    expect(end[0].synthetic).toBeUndefined();
    const start = plan({ ytdEnabled: true, ytdPlacement: "start" }).grid;
    expect(start[0].synthetic).toBe("ytd");
    expect(start[start.length - 1].synthetic).toBeUndefined();
  });

  it("values the latest year only, and divides totals for a ratio", () => {
    const { model, grid } = plan({ ytdEnabled: true });
    const row = generateRowKey(["Category 1", "Product 1-1"]);
    const [m1, m2, calc] = ytdCols(grid);
    const sources = m1.sourceColumnKeys!;
    expect(sources).toHaveLength(2); // the two months of the latest year, not all four

    const total = (idx: number) => sources.reduce((s, k) => s + (model.cellMap.get(generateCellKey(row, k, idx))?.value ?? 0), 0);
    expect(computeYtdValue(0, row, sources, m1.ytdContext!, model.cellMap)).toBeCloseTo(total(0), 6);
    expect(computeYtdValue(1, row, sources, m2.ytdContext!, model.cellMap)).toBeCloseTo(total(1), 6);
    expect(computeYtdValue(2, row, sources, calc.ytdContext!, model.cellMap)).toBeCloseTo(total(1) / total(0), 6);
  });
});
