import { buildMatrixModel } from "../model/pivot";
import { buildGridColumns, GridColumn } from "../model/gridColumns";
import { FlattenedNode } from "../model/tree";
import { defaultSettings, VisualSettings } from "../settings/settings";
import {
  DEFAULT_SEARCH_OPTIONS,
  SearchOptions,
  SearchTarget,
  createGridSearchTarget,
  findMatches,
  isEditableTarget,
  isFindShortcut,
  stepResultIndex,
  textMatches,
} from "../ui/matrixSearch";
import { createMatrixDataView } from "./fixtures/matrixDataView";

const opts = (patch: Partial<SearchOptions> = {}): SearchOptions => ({ ...DEFAULT_SEARCH_OPTIONS, ...patch });

function node(key: string, label: string, extra: Partial<FlattenedNode> = {}): FlattenedNode {
  return {
    key, label, value: label, level: 0, path: [label], children: [], isExpanded: true, isLeaf: true,
    isSubtotal: false, isGrandTotal: false, hasChildren: false, indent: 0, visibleIndex: 0, ...extra,
  } as FlattenedNode;
}

function gridCol(key: string, measureIndex = 0): GridColumn {
  return { key: `${key}|${measureIndex}`, col: node(key, key), measureIndex, measure: { index: measureIndex } } as unknown as GridColumn;
}

/** Hand-built target: cell text is `${rowKey}:${colKey}` unless overridden. */
function target(rows: FlattenedNode[], cols: GridColumn[], texts: Record<string, string> = {}): SearchTarget {
  return {
    rows,
    gridColumns: cols,
    getRowLabel: r => r.label,
    getCellText: (r, c) => texts[`${r.key}|${c.col.key}`] ?? "",
  };
}

describe("textMatches", () => {
  it("is case-insensitive by default and honours Match case", () => {
    expect(textMatches("North America", "north", opts())).toBe(true);
    expect(textMatches("North America", "north", opts({ caseSensitive: true }))).toBe(false);
    expect(textMatches("North America", "North", opts({ caseSensitive: true }))).toBe(true);
  });

  it("matches whole words only at word boundaries, not whole-cell equality", () => {
    const w = opts({ matchWholeWord: true });
    expect(textMatches("Product 1-2", "Product", w)).toBe(true);
    expect(textMatches("Products", "Product", w)).toBe(false);
    expect(textMatches("1,234.50", "234", w)).toBe(true); // punctuation is a boundary
    expect(textMatches("12345", "234", w)).toBe(false);
    // A later occurrence can satisfy the boundary when the first does not.
    expect(textMatches("cats cat", "cat", w)).toBe(true);
  });

  it("never matches an empty term or empty text", () => {
    expect(textMatches("abc", "", opts())).toBe(false);
    expect(textMatches("", "a", opts())).toBe(false);
  });
});

describe("findMatches", () => {
  const rows = [node("r1", "Alpha"), node("r2", "Beta"), node("r3", "Gamma alpha")];
  const cols = [gridCol("c1"), gridCol("c2", 1)];
  const texts = { "r1|c2": "alpha 10", "r2|c1": "1,000", "r3|c1": "ALPHA" };

  it("returns label and cell matches in on-screen order (row by row, label first)", () => {
    const results = findMatches(target(rows, cols, texts), "alpha", opts());
    expect(results.map(r => [r.rowKey, r.type, r.colKey, r.gridColIndex])).toEqual([
      ["r1", "label", null, -1],
      ["r1", "value", "c2", 1],
      ["r3", "label", null, -1],
      ["r3", "value", "c1", 0],
    ]);
    expect(results[1]).toMatchObject({ rowIndex: 0, measureIndex: 1, text: "alpha 10" });
  });

  it("respects the Labels / Values scopes", () => {
    const t = target(rows, cols, texts);
    expect(findMatches(t, "alpha", opts({ searchInValues: false })).every(r => r.type === "label")).toBe(true);
    expect(findMatches(t, "alpha", opts({ searchInLabels: false })).every(r => r.type === "value")).toBe(true);
  });

  it("returns nothing for a blank term", () => {
    expect(findMatches(target(rows, cols, texts), "   ", opts())).toEqual([]);
  });

  it("skips spacer rows and only searches labels of group header rows", () => {
    const special = [
      node("blank", "alpha", { calcRowKind: "blank" } as Partial<FlattenedNode>),
      node("div", "alpha", { calcRowKind: "divider" } as Partial<FlattenedNode>),
      node("grp", "alpha group", { calcRowKind: "group" } as Partial<FlattenedNode>),
    ];
    const results = findMatches(target(special, cols, { "grp|c1": "alpha" }), "alpha", opts());
    expect(results.map(r => [r.rowKey, r.type])).toEqual([["grp", "label"]]);
  });

  it("stops at the result limit", () => {
    const many = Array.from({ length: 50 }, (_, i) => node(`r${i}`, `item ${i}`));
    expect(findMatches(target(many, cols), "item", opts(), 10)).toHaveLength(10);
  });
});

describe("stepResultIndex", () => {
  it("wraps in both directions", () => {
    expect(stepResultIndex(0, 3, "next")).toBe(1);
    expect(stepResultIndex(2, 3, "next")).toBe(0);
    expect(stepResultIndex(0, 3, "prev")).toBe(2);
    expect(stepResultIndex(-1, 3, "prev")).toBe(2);
    expect(stepResultIndex(5, 3, "next")).toBe(0);
    expect(stepResultIndex(0, 0, "next")).toBe(-1);
  });
});

describe("shortcut guards", () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
    ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods }) as KeyboardEvent;

  it("recognises Ctrl/Cmd+F but not modified variants or plain f", () => {
    expect(isFindShortcut(key("f", { ctrlKey: true }))).toBe(true);
    expect(isFindShortcut(key("F", { metaKey: true }))).toBe(true);
    expect(isFindShortcut(key("f"))).toBe(false);
    expect(isFindShortcut(key("F", { ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isFindShortcut(key("f", { ctrlKey: true, altKey: true }))).toBe(false);
  });

  it("treats text-entry controls as editable targets", () => {
    const fakeEl = (insideInput: boolean) => ({ closest: () => (insideInput ? {} : null) }) as unknown as EventTarget;
    expect(isEditableTarget(fakeEl(true))).toBe(true);
    expect(isEditableTarget(fakeEl(false))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("createGridSearchTarget (live grid text)", () => {
  function setup(patch: (s: VisualSettings) => VisualSettings = s => s) {
    const settings = patch({ ...defaultSettings, manualData: { ...defaultSettings.manualData } });
    const model = buildMatrixModel({
      dataView: createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 2, measures: 1 }),
      settings,
      selectionIdBuilder: () => undefined,
      rowExpandedState: new Map(),
      columnExpandedState: new Map(),
    });
    const grid = buildGridColumns(model.flattenedColumns, model.measures, settings);
    return { model, grid, settings };
  }

  it("finds row labels, honouring label overrides", () => {
    const { model, grid, settings } = setup();
    const product = model.flattenedRows.find(r => r.label === "Product 1-2")!;
    const t = createGridSearchTarget(model.flattenedRows, grid, model.cellMap, settings, { [product.key]: "Widget Deluxe" });
    const hits = findMatches(t, "widget", opts({ searchInValues: false }));
    expect(hits.map(h => h.rowKey)).toEqual([product.key]);
    expect(findMatches(t, "Product 1-2", opts({ searchInValues: false }))).toHaveLength(0);
  });

  it("matches the formatted text shown in cells, not the raw value", () => {
    const { model, grid, settings } = setup();
    const leaf = model.flattenedRows.find(r => r.label === "Product 1-1")!;
    const t = createGridSearchTarget(model.flattenedRows, grid, model.cellMap, settings);
    const shown = t.getCellText(leaf, grid[0]);
    expect(shown).not.toBe("");

    const hits = findMatches(t, shown, opts({ searchInLabels: false }));
    expect(hits.some(h => h.rowKey === leaf.key && h.gridColIndex === 0)).toBe(true);

    // A manual edit replaces what the grid shows; search follows it.
    const editKey = `${leaf.key}|${grid[0].col.key}|${grid[0].measureIndex}`;
    const edited = { ...settings, manualData: { ...settings.manualData, edits: JSON.stringify({ [editKey]: "987654" }) } };
    const t2 = createGridSearchTarget(model.flattenedRows, grid, model.cellMap, edited);
    const shownAfterEdit = t2.getCellText(leaf, grid[0]);
    expect(shownAfterEdit).not.toBe(shown);
    const editHits = findMatches(t2, shownAfterEdit, opts({ searchInLabels: false }));
    expect(editHits.map(h => [h.rowKey, h.colKey])).toContainEqual([leaf.key, grid[0].col.key]);

    // A text edit is shown (and found) as typed, not replaced by the old number.
    const textEdited = { ...settings, manualData: { ...settings.manualData, edits: JSON.stringify({ [editKey]: "pending review" }) } };
    const t3 = createGridSearchTarget(model.flattenedRows, grid, model.cellMap, textEdited);
    expect(t3.getCellText(leaf, grid[0])).toBe("pending review");
    expect(findMatches(t3, "pending review", opts()).map(h => [h.rowKey, h.colKey])).toEqual([[leaf.key, grid[0].col.key]]);
  });

  it("never matches the missing-value placeholder", () => {
    const { model, grid, settings } = setup();
    const t = createGridSearchTarget(model.flattenedRows, grid, model.cellMap, settings);
    expect(findMatches(t, "—", opts())).toEqual([]);
  });
});
