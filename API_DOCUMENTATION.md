# MatrixPro API Documentation

## Overview

MatrixPro is a high-performance Power BI custom visual featuring advanced matrix capabilities including:
- Virtualized rendering for 100K+ rows
- Excel-like formula engine with CELL(), ROW(), COL() references
- WebAssembly-accelerated calculations
- Writeback capabilities to multiple destinations
- Scenario management and what-if analysis
- AI-powered insights and anomaly detection

---

## Core Modules

### 1. Calculations Module (`src/calculations/`)

#### FormulaEngine
The heart of MatrixPro's formula evaluation system.

```typescript
import { FormulaEngine, createFormulaEngine } from './calculations';

const engine = createFormulaEngine({
  measures: [{ name: 'Revenue', formula: 'SUM([Sales])' }],
});

const result = engine.evaluate('[Revenue] * 1.1', {
  rowKey: 'row-1',
  colKey: 'col-1',
  measureIndex: 0,
  cellMap: new Map(),
});
```

**Key Features:**
- Scoped references: `[Measure]`, `Scope[Member]`
- Cell functions: `CELL()`, `ROW()`, `COL()`, `ROWPATH()`
- Built-in functions: `SUM`, `AVERAGE`, `MAX`, `MIN`, `COUNT`
- Cycle detection to prevent infinite recursion
- Safe evaluation without Function constructor

#### FormulaParser
Parses formula strings into AST.

```typescript
import { parseFormula } from './calculations';

const { ast, errors } = parseFormula('[Revenue] + [Cost] * 2');
// ast: BinaryOp { left: MeasureRef, right: BinaryOp, op: '+' }
```

#### FormulaPersistence
Manages formula storage and validation.

```typescript
import { getFormulaPersistenceManager } from './calculations';

const manager = getFormulaPersistenceManager();
const result = manager.validateFormula('= [Revenue] / [Cost]', ['Revenue', 'Cost']);
// { isValid: true, errors: [], warnings: [] }
```

---

### 2. Performance Module (`src/performance/`)

#### WasmCalculationEngine
High-performance calculation using TypedArrays.

```typescript
import { createCalculationEngine } from './performance';

const engine = createCalculationEngine({
  capacity: 100000,
  useWasm: true,
});

// Batch operations
engine.setCellsBatch([
  { row: 0, col: 0, measure: 0, value: 100 },
  { row: 0, col: 1, measure: 0, value: 200 },
]);

// Matrix operations
const result = engine.transpose(matrix, rows, cols);
const rollup = engine.calculateRollup(leafValues, parentIndices, 'sum');
```

#### PerformanceMonitor
Track and analyze performance metrics.

```typescript
import { getPerformanceMonitor } from './performance';

const monitor = getPerformanceMonitor();
monitor.mark('operation-start');
// ... perform operation
monitor.measure('operation-start', 'formulaEvaluationTime');

const metrics = monitor.getMetrics();
// { formulaEvaluationTime: 45, renderTime: 16, fps: 60 }

const violations = monitor.getViolations();
// [{ metric: 'formulaEvaluationTime', actual: 150, budget: 100, severity: 'warning' }]
```

---

### 3. Analytics Module (`src/analytics/`)

#### Statistical Functions
Comprehensive statistical analysis.

```typescript
import { StatisticalFunctions } from './analytics';

const { mean, stdDev, regression, cagr } = StatisticalFunctions;

const values = [100, 200, 300, 400, 500];

mean(values);           // { value: 300, formatted: "300.00", sampleSize: 5 }
stdDev(values);         // { value: 158.11, formatted: "158.11", sampleSize: 5 }
cagr(100, 500, 4);      // { value: 0.4953, formatted: "49.53%", sampleSize: 4 }

// Linear regression
const reg = regression([1, 2, 3, 4], [100, 200, 300, 400]);
// { slope: 100, intercept: 0, rSquared: 1, correlation: 1 }
```

#### Advanced Filtering

```typescript
import { AdvancedFiltering } from './analytics';

// Top N filtering
const result = AdvancedFiltering.applyTopNFilter(
  rows,
  cellMap,
  columns,
  {
    n: 10,
    direction: 'top',
    measureIndex: 0,
    scope: 'all',
    includeOthers: true,
    tieHandling: 'keep',
  }
);

// Outlier detection
const outliers = AdvancedFiltering.detectOutliers(
  rows, cellMap, columns, 0, 'iqr', 1.5
);
// { outliers: [...], inliers: [...], outlierRate: 0.05 }

// Exception reporting
const exceptions = AdvancedFiltering.generateExceptionReport(
  rows, cellMap, columns, 0,
  { type: 'stdDev', stdDevMultiplier: 2 }
);
```

#### AI-Powered Insights

```typescript
import { AIInsights } from './analytics';

const insights = AIInsights.generateInsights(rows, cellMap, columns, 0);
// [
//   { type: 'anomaly', title: '5 Anomalies Detected', priority: 'high', ... },
//   { type: 'trend', title: 'Strong Upward Trend', priority: 'medium', ... }
// ]

const summary = AIInsights.generateSmartSummary(insights);
// "Analysis complete. Found 12 insights. 2 critical issues require immediate attention."
```

---

### 4. Settings Module (`src/settings/`)

#### Settings Management

```typescript
import {
  getSettingsPersistenceManager,
  validateSettings,
  getSettingMetadata,
} from './settings';

// Validation
const result = validateSettings({
  general: { rowHeight: 500 }, // Invalid: exceeds max
});
// { isValid: false, errors: [{ path: 'general.rowHeight', message: 'Maximum value is 100' }] }

// Persistence
const manager = getSettingsPersistenceManager();
manager.updateSetting('general', 'rowHeight', 32);
manager.subscribe((settings) => console.log('Settings updated:', settings));

// Metadata
const meta = getSettingMetadata('general.rowHeight');
// { description: 'Height of each data row in pixels', min: 16, max: 100, ... }
```

---

### 5. UI Module (`src/ui/`)

#### Cell Editing Engine

```typescript
import { CellEditingEngine } from './ui/cellEditing';

const engine = new CellEditingEngine();

// Start editing
engine.startEdit(
  { rowKey: 'row-1', colKey: 'col-1', measureIndex: 0 },
  '100'
);

// Navigation
engine.handleNavigation(event, allRowKeys, allColKeys, allMeasures);

// Range selection
engine.selectCell({ rowKey: 'row-1', colKey: 'col-1', measureIndex: 0 });
engine.extendSelection(
  { rowKey: 'row-5', colKey: 'col-3', measureIndex: 0 },
  allRowKeys,
  allColKeys
);

// Fill operations
engine.fillDown(allRowKeys);
engine.fillRight(allColKeys);
```

#### Formula Bar Engine

```typescript
import { FormulaBarEngine } from './ui/formulaBarEngine';

const engine = new FormulaBarEngine('= [Revenue] * 2');

// Insert cell reference
engine.insertCellReference('Revenue');

// Navigate suggestions
engine.navigateSuggestions('down');
engine.acceptSuggestion();

// Validation
const result = engine.validate();
// { isValid: true, warnings: [], references: ['Revenue'] }
```

#### Keyboard Navigation

```typescript
import { KeyboardNavigationEngine } from './ui/keyboardNavigation';

const keyboard = new KeyboardNavigationEngine();

// Register handlers
keyboard.on('moveUp', (event) => {
  // Handle move up
  return true; // Event consumed
});

keyboard.on('commitEdit', (event) => {
  // Commit edit
  return true;
}, () => isEditing); // Only handle when editing

// Handle events
const handled = keyboard.handleKeyDown(event);
```

---

## Data Types

### Core Interfaces

```typescript
// Tree structure
interface TreeNode {
  key: string;
  label: string;
  value: any;
  level: number;
  path: any[];
  children: TreeNode[];
  isExpanded: boolean;
  isLeaf: boolean;
  isSubtotal: boolean;
  isGrandTotal: boolean;
}

interface FlattenedNode extends TreeNode {
  indent: number;
  hasChildren: boolean;
  visibleIndex: number;
}

// Cell data
interface CellValue {
  value: number | null;
  formattedValue: string;
  measureIndex: number;
  rowKey: string;
  colKey: string;
  isCalculated?: boolean;
  isEdited?: boolean;
}

// Measure definition
interface MeasureInfo {
  index: number;
  name: string;
  queryName: string;
  format: string;
  isEditable: boolean;
  isCalculated: boolean;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}
```

---

## Best Practices

### 1. Performance

```typescript
// Use batch operations
engine.setCellsBatch(cells); // ✅ Fast
// vs
cells.forEach(c => engine.setCell(c.row, c.col, c.measure, c.value)); // ❌ Slow

// Use WebAssembly for large datasets
const engine = createCalculationEngine({ useWasm: true }); // ✅

// Monitor performance
const monitor = getPerformanceMonitor();
monitor.mark('start');
// ... operation
monitor.measure('start', 'formulaEvaluationTime');
```

### 2. Error Handling

```typescript
// Always validate formulas
const result = manager.validateFormula(formula, availableMeasures);
if (!result.isValid) {
  console.error('Formula errors:', result.errors);
  return;
}

// Handle WASM fallback
const engine = createCalculationEngine({ useWasm: true });
// Engine automatically falls back to JS if WASM unavailable
```

### 3. Memory Management

```typescript
// Dispose resources when done
engine.dispose();
bridge.dispose();
keyboard.dispose();

// Clear large data structures
cellMap.clear();
engine.clear();
```

---

## Integration Examples

### Power BI Visual

```typescript
import powerbi from 'powerbi-visuals-api';
import { FormulaEngine } from './calculations';
import { buildMatrixModel } from './model/pivot';

export class MatrixVisual implements powerbi.extensibility.IVisual {
  private engine: FormulaEngine;

  constructor(options: powerbi.extensibility.VisualConstructorOptions) {
    this.engine = createFormulaEngine();
  }

  public update(options: powerbi.extensibility.VisualUpdateOptions) {
    const dataView = options.dataViews[0];
    const model = buildMatrixModel(dataView, this.engine);
    // Render matrix
  }
}
```

### React Component

```typescript
import { useCellEditingEngine } from './ui/cellEditing';

function MatrixComponent({ rows, columns, cellMap }) {
  const { engine, edit, selection } = useCellEditingEngine();

  const handleKeyDown = (e) => {
    const newPosition = engine.handleNavigation(
      e, rowKeys, colKeys, measureIndices
    );
    if (newPosition) {
      engine.selectCell(newPosition);
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Render cells */}
    </div>
  );
}
```

---

## Migration Guide

### From v0.9 to v1.0

```typescript
// Before
const engine = new FormulaEngine();
engine.evaluateWithScope(formula, context);

// After
const engine = createFormulaEngine();
engine.evaluate(formula, context);

// Before
settings.manualData.edits = '{}';

// After (automatic migration)
const manager = getSettingsPersistenceManager();
manager.load(); // Automatically migrates old settings
```

---

## Testing

```typescript
import { TestUtils } from './tests/testUtils';

// Create test data
const { rows, columns, measures, cellMap } = TestUtils.createTestMatrix({
  rowCount: 100,
  colCount: 10,
  measureCount: 3,
});

// Assertions
TestUtils.assertCellValue(cellMap, 'row-1', 'col-1', 0, 100);
TestUtils.assertHierarchyIntegrity(rows);

// Performance testing
const result = await TestUtils.runPerformanceTest(
  'formula-eval',
  () => engine.evaluate('[Revenue] * 2', context),
  1000
);
// { name: 'formula-eval', duration: 45, opsPerSecond: 22222 }
```

---

## API Reference

### Calculations

| Function | Description | Complexity |
|----------|-------------|------------|
| `parseFormula(formula)` | Parse formula to AST | O(n) |
| `evaluateFormula(ast, context)` | Evaluate AST | O(n) |
| `FormulaEngine.evaluate(formula, context)` | Full evaluation with caching | O(n) |
| `detectCircularReferences(formulas)` | Find cycles in formula graph | O(V + E) |

### Performance

| Function | Description | Memory |
|----------|-------------|---------|
| `createCalculationEngine(options)` | Create WASM/JS engine | ~5MB |
| `engine.setCellsBatch(cells)` | Batch cell update | O(n) |
| `engine.transpose(matrix, rows, cols)` | Matrix transpose | O(rows × cols) |
| `engine.calculateRollup(values, parents, agg)` | Hierarchy rollup | O(n) |

### Analytics

| Function | Description | Use Case |
|----------|-------------|----------|
| `generateInsights(rows, cells, cols)` | AI insights | Dashboard |
| `detectOutliers(rows, cells, cols, method)` | Anomaly detection | Data quality |
| `applyTopNFilter(rows, cells, cols, filter)` | Top N analysis | Ranking |
| `StatisticalFunctions.regression(x, y)` | Trend analysis | Forecasting |

---

## Changelog

### v1.0.0 (2026-03-24)
- ✅ WebAssembly calculation engine
- ✅ AI-powered insights
- ✅ Advanced filtering (Top N, outliers)
- ✅ Statistical functions library
- ✅ Enhanced keyboard navigation
- ✅ Formula persistence & validation
- ✅ Performance monitoring
- ✅ Comprehensive test utilities

---

**Documentation Version:** 1.0.0  
**Last Updated:** March 25, 2026  
**API Stability:** Stable
