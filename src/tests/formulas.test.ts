import { FormulaEngine } from "../calculations/FormulaEngine";
import { applyCalculatedRows, CalculatedRowDefinition, defaultRowStyle } from "../calculations/calculatedRows";
import { generateCellKey, generateColumnKey, generateRowKey } from "../model/keys";
import { applyManualOverrides, CellValue, MeasureInfo } from "../model/pivot";
import { FlattenedNode } from "../model/tree";
import { defaultSettings } from "../settings/settings";

function makeRow(label: string, path: string[]): FlattenedNode {
  return {
    key: generateRowKey(path),
    label,
    value: label,
    level: path.length,
    path,
    children: [],
    isExpanded: true,
    isLeaf: true,
    isSubtotal: false,
    isGrandTotal: false,
    indent: Math.max(0, path.length - 1),
    hasChildren: false,
    visibleIndex: 0,
  };
}

function makeColumn(label: string, path: string[]): FlattenedNode {
  return {
    key: generateColumnKey(path),
    label,
    value: label,
    level: path.length,
    path,
    children: [],
    isExpanded: true,
    isLeaf: true,
    isSubtotal: false,
    isGrandTotal: false,
    indent: 0,
    hasChildren: false,
    visibleIndex: 0,
  };
}

function setCell(
  cellMap: Map<string, CellValue>,
  rowKey: string,
  colKey: string,
  measureIndex: number,
  value: number
): void {
  cellMap.set(generateCellKey(rowKey, colKey, measureIndex), {
    value,
    formattedValue: String(value),
    measureIndex,
    rowKey,
    colKey,
  });
}

describe("formula engine and calculated rows", () => {
  const revenue = makeRow("Revenue", ["Revenue"]);
  const cogs = makeRow("COGS", ["COGS"]);
  const opex = makeRow("Operating Expenses", ["Operating Expenses"]);
  const rows = [revenue, cogs, opex].map((row, index) => ({ ...row, visibleIndex: index }));

  const jan = makeColumn("Jan", ["2024", "Jan"]);
  const feb = makeColumn("Feb", ["2024", "Feb"]);
  const columns = [jan, feb].map((col, index) => ({ ...col, visibleIndex: index }));

  const measures: MeasureInfo[] = [
    { index: 0, name: "Sales", format: "", queryName: "Sales" },
    { index: 1, name: "Margin", format: "", queryName: "Margin" },
  ];

  function buildCellMap(): Map<string, CellValue> {
    const cellMap = new Map<string, CellValue>();

    setCell(cellMap, revenue.key, jan.key, 0, 100);
    setCell(cellMap, revenue.key, feb.key, 0, 150);
    setCell(cellMap, cogs.key, jan.key, 0, 40);
    setCell(cellMap, cogs.key, feb.key, 0, 60);
    setCell(cellMap, opex.key, jan.key, 0, 20);
    setCell(cellMap, opex.key, feb.key, 0, 25);

    setCell(cellMap, revenue.key, jan.key, 1, 25);
    setCell(cellMap, revenue.key, feb.key, 1, 40);
    setCell(cellMap, cogs.key, jan.key, 1, 10);
    setCell(cellMap, cogs.key, feb.key, 1, 15);
    setCell(cellMap, opex.key, jan.key, 1, 5);
    setCell(cellMap, opex.key, feb.key, 1, 7);

    return cellMap;
  }

  it("evaluates arithmetic with correct precedence and supports references", () => {
    const engine = new FormulaEngine({
      currentRowKey: revenue.key,
      currentColKey: jan.key,
      currentMeasureIndex: 0,
      rows,
      columns,
      measures,
      cellMap: buildCellMap(),
      rowHierarchyLevels: [],
      calculatedMeasures: new Map<string, string>(),
      calculatedRows: new Map<string, string>(),
    });

    expect(engine.evaluate("2 + 3 * 4").value).toBe(14);
    expect(engine.evaluate("CELL(row=\"Revenue\", col=\"Jan\", measure=\"Sales\") + CELL(\"COGS\", \"Jan\", \"Sales\")").value).toBe(140);
    expect(engine.evaluate("SUM(RANGE(\"Jan\", \"Feb\"))").value).toBe(250);
    expect(engine.evaluate("SUM(ROW(\"Revenue\"))").value).toBe(250);
    expect(engine.evaluate("SUM(COL(\"Jan\"))").value).toBe(160);
    expect(engine.evaluate("[Sales] + MEASURE(\"Margin\")").value).toBe(125);
  });

  it("evaluates custom calculated rows and respects placement", () => {
    const cellMap = buildCellMap();
    const calcRows: CalculatedRowDefinition[] = [
      {
        id: "gross-profit",
        name: "Gross Profit",
        formulaType: "custom",
        rowReferences: [],
        customFormula: "[Revenue] - [COGS]",
        placement: "after",
        targetRowKey: cogs.key,
        parentRowKey: null,
        insertAfterRowKey: cogs.key,
        insertAtTop: false,
        style: { ...defaultRowStyle },
        includeInTotals: true,
        isSubtotal: true,
        enabled: true,
        order: 0,
      },
    ];

    const result = applyCalculatedRows(rows, cellMap, columns, measures, calcRows);
    const grossProfitRow = result.rows.find(row => row.label === "Gross Profit");

    expect(grossProfitRow).toBeDefined();
    expect(result.rows.findIndex(row => row.label === "Gross Profit")).toBe(2);
    expect(result.cellMap.get(generateCellKey("__calcrow__gross-profit", jan.key, 0))?.value).toBe(60);
    expect(result.cellMap.get(generateCellKey("__calcrow__gross-profit", feb.key, 0))?.value).toBe(90);
  });

  it("applies manual formulas even when row and column keys contain hierarchy delimiters", () => {
    const nestedRevenue = makeRow("Revenue", ["North", "Revenue"]);
    const nestedColumn = makeColumn("Jan", ["FY2024", "Jan"]);
    const nestedRows = [{ ...nestedRevenue, visibleIndex: 0 }];
    const nestedColumns = [{ ...nestedColumn, visibleIndex: 0 }];
    const cellMap = new Map<string, CellValue>();

    setCell(cellMap, nestedRevenue.key, nestedColumn.key, 0, 10);

    const settings = {
      ...defaultSettings,
      manualData: {
        ...defaultSettings.manualData,
        edits: JSON.stringify({
          [`${nestedRevenue.key}|${nestedColumn.key}|0`]: "=THIS() + 5",
        }),
      },
    };

    const result = applyManualOverrides(nestedRows, cellMap, settings, [measures[0]], nestedColumns);
    expect(result.cellMap.get(generateCellKey(nestedRevenue.key, nestedColumn.key, 0))?.value).toBe(15);
  });
});
