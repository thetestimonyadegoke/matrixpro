/**
 * Deterministic generator for a Power BI matrix DataView, shaped the way the
 * host delivers it: a row hierarchy (category > product) with per-category
 * subtotal nodes and a grand-total node, and a column hierarchy
 * (year > month > measure) whose measure-level leaves carry
 * `levelSourceIndex` and no `value`. Row nodes carry `values` keyed by the
 * flat leaf-column index, which is what `buildMatrixModel` consumes.
 */
export interface MatrixFixtureOptions {
  categories: number;
  productsPerCategory: number;
  years: number;
  monthsPerYear: number;
  measures: number;
  /** Measure format strings, cycled across measures. */
  formats?: string[];
  withSubtotals?: boolean;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createMatrixDataView(options: MatrixFixtureOptions): any {
  const {
    categories,
    productsPerCategory,
    years,
    monthsPerYear,
    measures,
    formats = ["#,0.00", "\\$#,0.00;(\\$#,0.00)", "0.0%", ""],
    withSubtotals = true,
  } = options;
  const rand = seededRandom(42);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const valueSources = Array.from({ length: measures }, (_, m) => ({
    displayName: `Measure ${m + 1}`,
    queryName: `Sum(Sales.M${m + 1})`,
    format: formats[m % formats.length],
    isMeasure: true,
    roles: { Values: true },
  }));

  const leafColumnCount = years * monthsPerYear * measures;

  const yearNodes = Array.from({ length: years }, (_, y) => ({
    value: 2020 + y,
    level: 0,
    children: Array.from({ length: monthsPerYear }, (_, mo) => ({
      value: monthNames[mo % 12],
      level: 1,
      children: measures > 1
        ? Array.from({ length: measures }, (_, m) => ({ level: 2, levelSourceIndex: m }))
        : undefined,
    })),
  }));

  const makeValues = (scale: number): Record<number, { value: number }> => {
    const values: Record<number, { value: number }> = {};
    for (let i = 0; i < leafColumnCount; i++) {
      values[i] = { value: Math.round(rand() * 10000 * scale) / 100 };
    }
    return values;
  };

  const categoryNodes: any[] = [];
  for (let c = 0; c < categories; c++) {
    const products: any[] = [];
    for (let p = 0; p < productsPerCategory; p++) {
      products.push({
        value: `Product ${c + 1}-${p + 1}`,
        level: 1,
        identity: { key: `p-${c}-${p}` },
        values: makeValues(1),
      });
    }
    if (withSubtotals) {
      products.push({ isSubtotal: true, level: 1, values: makeValues(productsPerCategory) });
    }
    categoryNodes.push({
      value: `Category ${c + 1}`,
      level: 0,
      identity: { key: `c-${c}` },
      children: products,
    });
  }
  if (withSubtotals) {
    categoryNodes.push({ isSubtotal: true, level: 0, values: makeValues(categories * productsPerCategory) });
  }

  const rowLevels = [
    { sources: [{ displayName: "Category", queryName: "Sales.Category", roles: { Rows: true } }] },
    { sources: [{ displayName: "Product", queryName: "Sales.Product", roles: { Rows: true } }] },
  ];
  const columnLevels = [
    { sources: [{ displayName: "Year", queryName: "Date.Year", roles: { Columns: true } }] },
    { sources: [{ displayName: "Month", queryName: "Date.Month", roles: { Columns: true } }] },
    ...(measures > 1 ? [{ sources: valueSources }] : []),
  ];

  return {
    metadata: {
      columns: [...rowLevels.map(l => l.sources[0]), ...columnLevels.slice(0, 2).map(l => l.sources[0]), ...valueSources],
      objects: {},
    },
    matrix: {
      rows: { root: { children: categoryNodes }, levels: rowLevels },
      columns: { root: { children: yearNodes }, levels: columnLevels },
      valueSources,
    },
  };
}

/** Stable, order-sensitive digest of everything a model build produces. */
export function fingerprintModel(model: any): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hash = require("crypto").createHash("sha1");
  for (const row of model.flattenedRows) {
    hash.update(`R|${row.key}|${row.label}|${row.level}|${row.isSubtotal}|${row.isGrandTotal}|${row.indent}
`);
  }
  for (const col of model.flattenedColumns) {
    hash.update(`C|${col.key}|${col.label}|${col.level}|${col.isLeaf}|${col.isSubtotal}
`);
  }
  for (const m of model.measures) hash.update(`M|${m.name}|${m.format}
`);
  const cellKeys = Array.from(model.cellMap.keys() as Iterable<string>).sort();
  for (const key of cellKeys) {
    const cell = model.cellMap.get(key);
    hash.update(`V|${key}|${cell.value}|${cell.formattedValue}|${cell.measureIndex}
`);
  }
  return `${model.flattenedRows.length}r/${model.flattenedColumns.length}c/${cellKeys.length}v/${hash.digest("hex").slice(0, 12)}`;
}
