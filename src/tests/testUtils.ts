/**
 * Test Utilities and Infrastructure
 * Comprehensive testing helpers for MatrixPro
 * Supports unit tests, integration tests, and performance benchmarks
 */

import { VisualSettings, defaultSettings } from "../settings/settings";
import { FlattenedNode, TreeNode } from "../model/tree";
import { CellValue, MeasureInfo } from "../model/pivot";

// ============================================================================
// Mock Data Generators
// ============================================================================

// Simple seeded random generator for test data (deterministic, not for crypto use)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export interface MockMatrixConfig {
  rowCount: number;
  colCount: number;
  measureCount: number;
  depth: number;
  hasSubtotals: boolean;
  hasGrandTotals: boolean;
}

export const DEFAULT_MOCK_CONFIG: MockMatrixConfig = {
  rowCount: 100,
  colCount: 10,
  measureCount: 3,
  depth: 3,
  hasSubtotals: true,
  hasGrandTotals: true,
};

/**
 * Generate mock row hierarchy
 */
export function generateMockRows(config: Partial<MockMatrixConfig> = {}): FlattenedNode[] {
  const fullConfig = { ...DEFAULT_MOCK_CONFIG, ...config };
  const rows: FlattenedNode[] = [];

  // Generate hierarchical structure
  for (let i = 0; i < fullConfig.rowCount; i++) {
    const level = i % fullConfig.depth;
    const isLeaf = level === fullConfig.depth - 1;
    const path: string[] = [];
    
    for (let d = 0; d <= level; d++) {
      path.push(`L${d}-Row${Math.floor(i / Math.pow(10, fullConfig.depth - d - 1)) % 10}`);
    }

    rows.push({
      key: path.join('→'),
      label: path[path.length - 1],
      value: path[path.length - 1],
      level,
      isLeaf,
      isSubtotal: false,
      isGrandTotal: false,
      hasChildren: !isLeaf,
      isExpanded: true,
      path,
      indent: level,
      visibleIndex: rows.length,
      children: [],
    });
  }

  // Add subtotals
  if (fullConfig.hasSubtotals) {
    for (let level = 0; level < fullConfig.depth - 1; level++) {
      const parentRows = rows.filter(r => r.level === level && r.isLeaf === false);
      for (const parent of parentRows) {
        rows.push({
          key: `${parent.key}→Subtotal`,
          label: 'Subtotal',
          value: 'Subtotal',
          level: level + 1,
          isLeaf: true,
          isSubtotal: true,
          isGrandTotal: false,
          hasChildren: false,
          isExpanded: false,
          path: [...parent.path, 'Subtotal'],
          indent: level + 1,
          visibleIndex: rows.length,
          children: [],
        });
      }
    }
  }

  // Add grand total
  if (fullConfig.hasGrandTotals) {
    rows.push({
      key: 'GrandTotal',
      label: 'Grand Total',
      value: 'Grand Total',
      level: 0,
      isLeaf: true,
      isSubtotal: false,
      isGrandTotal: true,
      hasChildren: false,
      isExpanded: false,
      path: ['GrandTotal'],
      indent: 0,
      visibleIndex: rows.length,
      children: [],
    });
  }

  return rows;
}

/**
 * Generate mock columns
 */
export function generateMockColumns(config: Partial<MockMatrixConfig> = {}): FlattenedNode[] {
  const fullConfig = { ...DEFAULT_MOCK_CONFIG, ...config };
  
  return Array.from({ length: fullConfig.colCount }, (_, i) => ({
    key: `Col-${i}`,
    label: `Column ${i + 1}`,
    value: `Col-${i}`,
    level: 0,
    isLeaf: true,
    isSubtotal: false,
    isGrandTotal: false,
    hasChildren: false,
    isExpanded: false,
    path: [`Col-${i}`],
    indent: 0,
    visibleIndex: i,
    children: [] as TreeNode[],
  }));
}

/**
 * Generate mock measures
 */
export function generateMockMeasures(count: number = 3): MeasureInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    name: `Measure ${i + 1}`,
    queryName: `Measure${i + 1}`,
    format: i === 0 ? '$#,##0.00' : '#,##0',
    isEditable: i < 2,
    isCalculated: i === 2,
    aggregation: i === 0 ? 'sum' : 'avg',
  }));
}

/**
 * Generate mock cell data
 */
export function generateMockCellMap(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  measures: MeasureInfo[]
): Map<string, CellValue> {
  const cellMap = new Map<string, CellValue>();

  let seedCounter = 0;
  for (const row of rows) {
    if (row.isGrandTotal) continue;

    for (const col of columns) {
      for (const measure of measures) {
        const key = `${row.key}|${col.key}|${measure.index}`;
        const seed = seedCounter++;
        const value = row.isSubtotal
          ? seededRandom(seed) * 10000 + 5000
          : seededRandom(seed + 1000) * 1000 + 100;

        cellMap.set(key, {
          value,
          formattedValue: value.toLocaleString(),
          measureIndex: measure.index,
          rowKey: row.key,
          colKey: col.key,
        });
      }
    }
  }

  return cellMap;
}

// ============================================================================
// Performance Testing
// ============================================================================

export interface PerformanceTestResult {
  name: string;
  duration: number;
  iterations: number;
  opsPerSecond: number;
  memoryDelta: number;
}

/**
 * Run performance test
 */
export async function runPerformanceTest(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 1000
): Promise<PerformanceTestResult> {
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const duration = endTime - startTime;

  return {
    name,
    duration,
    iterations,
    opsPerSecond: (iterations / duration) * 1000,
    memoryDelta: (endMemory - startMemory) / 1024 / 1024, // MB
  };
}

/**
 * Benchmark comparison
 */
export function compareBenchmarks(
  baseline: PerformanceTestResult,
  current: PerformanceTestResult
): { faster: boolean; speedup: number; regression: boolean } {
  const speedup = baseline.duration / current.duration;
  
  return {
    faster: speedup > 1,
    speedup,
    regression: speedup < 0.8, // 20% slower is considered regression
  };
}

// ============================================================================
// Test Assertions
// ============================================================================

export function assertApproxEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.001,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      message || `Expected ${expected} but got ${actual} (diff: ${diff})`
    );
  }
}

export function assertCellValue(
  cellMap: Map<string, CellValue>,
  rowKey: string,
  colKey: string,
  measureIndex: number,
  expectedValue: number | null
): void {
  const key = `${rowKey}|${colKey}|${measureIndex}`;
  const cell = cellMap.get(key);
  
  if (expectedValue === null) {
    if (cell !== undefined && cell.value !== null) {
      throw new Error(`Expected null at ${key} but got ${cell.value}`);
    }
  } else {
    if (!cell) {
      throw new Error(`Expected ${expectedValue} at ${key} but cell not found`);
    }
    assertApproxEqual(cell.value ?? 0, expectedValue, 0.001, `Cell ${key}`);
  }
}

export function assertHierarchyIntegrity(rows: FlattenedNode[]): void {
  for (const row of rows) {
    // Check path consistency
    if (row.path.join('→') !== row.key) {
      throw new Error(`Path/key mismatch for ${row.key}`);
    }

    // Check depth consistency
    if (row.level !== row.indent) {
      throw new Error(`Level/indent mismatch for ${row.key}`);
    }

    // Check leaf/subtotal consistency
    if (row.isLeaf && row.hasChildren) {
      throw new Error(`Leaf row ${row.key} should not have children`);
    }
  }
}

// ============================================================================
// Mock Power BI Environment
// ============================================================================

export function createMockDataView(): any {
  return {
    metadata: {
      columns: [
        { displayName: 'Category', type: { text: true } },
        { displayName: 'Subcategory', type: { text: true } },
        { displayName: 'Sales', type: { numeric: true }, format: '$0,0.00' },
        { displayName: 'Quantity', type: { numeric: true }, format: '0' },
      ],
    },
    categorical: {
      categories: [
        {
          source: { displayName: 'Category' },
          values: ['Electronics', 'Clothing', 'Food'],
        },
        {
          source: { displayName: 'Subcategory' },
          values: ['Phones', 'Shirts', 'Fruits'],
        },
      ],
      values: [
        {
          source: { displayName: 'Sales' },
          values: [1000, 500, 300],
        },
        {
          source: { displayName: 'Quantity' },
          values: [10, 20, 30],
        },
      ],
    },
  };
}

export function createMockVisualHost(): any {
  return {
    createSelectionIdBuilder: (): any => ({
      withCategory: (): any => ({ createSelectionId: (): any => ({}) }),
    }),
    createSelectionManager: (): any => ({
      select: (): Promise<void> => Promise.resolve(),
      clear: (): Promise<void> => Promise.resolve(),
      hasSelection: (): boolean => false,
      getSelectionIds: (): any[] => [],
    }),
    tooltipService: {
      show: (): void => {},
      move: (): void => {},
      hide: (): void => {},
    },
    locale: 'en-US',
    applyJsonFilter: (): void => {},
    persistProperties: (): void => {},
    drill: (): void => {},
    onSelect: (): void => {},
    capabilities: {
      dataRoles: [],
      dataViewMappings: [],
    },
  };
}

export function createMockSettings(overrides: Partial<VisualSettings> = {}): VisualSettings {
  return {
    ...defaultSettings,
    ...overrides,
  };
}

// ============================================================================
// Test Setup Helpers
// ============================================================================

export function setupTestEnvironment(): (() => void) {
  // Mock console methods for cleaner test output
  const originalConsole = { ...console };
  
  (global as any).console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Cleanup function
  return () => {
    (global as any).console = originalConsole;
  };
}

export function createTestMatrix(config: Partial<MockMatrixConfig> = {}): {
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  cellMap: Map<string, CellValue>;
} {
  const fullConfig = { ...DEFAULT_MOCK_CONFIG, ...config };
  
  const rows = generateMockRows(fullConfig);
  const columns = generateMockColumns(fullConfig);
  const measures = generateMockMeasures(fullConfig.measureCount);
  const cellMap = generateMockCellMap(rows, columns, measures);

  return { rows, columns, measures, cellMap };
}

// ============================================================================
// Snapshot Testing
// ============================================================================

export function serializeMatrixState(
  rows: FlattenedNode[],
  columns: FlattenedNode[],
  cellMap: Map<string, CellValue>
): object {
  const cells: Record<string, number | null> = {};
  
  for (const [key, cell] of cellMap) {
    cells[key] = cell.value;
  }

  return {
    rowCount: rows.length,
    colCount: columns.length,
    sampleRows: rows.slice(0, 5).map((r): object => ({
      key: r.key,
      label: r.label,
      level: r.level,
      isLeaf: r.isLeaf,
    })),
    sampleCells: Object.fromEntries(
      Object.entries(cells).slice(0, 10)
    ),
  };
}

// ============================================================================
// Async Testing
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) return true;
    await delay(interval);
  }
  
  return false;
}

// ============================================================================
// Export
// ============================================================================

export const TestUtils = {
  // Generators
  generateMockRows,
  generateMockColumns,
  generateMockMeasures,
  generateMockCellMap,
  createTestMatrix,
  
  // Performance
  runPerformanceTest,
  compareBenchmarks,
  
  // Assertions
  assertApproxEqual,
  assertCellValue,
  assertHierarchyIntegrity,
  
  // Mocks
  createMockDataView,
  createMockVisualHost,
  createMockSettings,
  
  // Setup
  setupTestEnvironment,
  
  // Snapshots
  serializeMatrixState,
  
  // Async
  delay,
  flushPromises,
  waitForCondition,
};

export default TestUtils;
