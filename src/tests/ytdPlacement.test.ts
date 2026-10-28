import { buildMatrixModel } from "../model/pivot";
import { buildGridColumns, VisualColumnDefinition } from "../model/gridColumns";
import { defaultSettings } from "../settings/settings";
import { createMatrixDataView } from "./fixtures/matrixDataView";

function plan(rule: Partial<VisualColumnDefinition>) {
  const model = buildMatrixModel({
    dataView: createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 3, measures: 2, withSubtotals: false }),
    settings: defaultSettings,
    selectionIdBuilder: () => undefined,
    rowExpandedState: new Map(),
    columnExpandedState: new Map(),
  });
  const rules: VisualColumnDefinition[] = [{ id: "r1", sourceMeasureIndex: 0, frequency: "ytd", ...rule }];
  const cols = buildGridColumns(model.flattenedColumns, model.measures, defaultSettings, rules);
  return cols.map(c => (c.synthetic === "ytd" ? "ytd" : "data"));
}

describe("YTD column placement", () => {
  it("defaults to after each period", () => {
    expect(plan({}).join(",")).toBe("data,ytd,data,data,ytd,data,data,ytd,data");
  });

  it("goes before each period when position is beginning", () => {
    expect(plan({ position: "beginning" }).join(",")).toBe("ytd,data,data,ytd,data,data,ytd,data,data");
  });

  it("groups every YTD column at the start", () => {
    expect(plan({ ytdPlacement: "start" }).join(",")).toBe("ytd,ytd,ytd,data,data,data,data,data,data");
  });

  it("groups every YTD column at the end", () => {
    expect(plan({ ytdPlacement: "end" }).join(",")).toBe("data,data,data,data,data,data,ytd,ytd,ytd");
  });
});
