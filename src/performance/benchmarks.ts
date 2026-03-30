/**
 * Performance Benchmark Suite
 * Comprehensive benchmarks for matrix calculations and rendering
 * Compares JS vs WASM performance and tracks optimization progress
 */

import { WasmCalculationEngine } from './wasmCalculationEngine';
import { WasmJsBridge, CalculationTask } from './wasmJsBridge';
import { PerformanceMonitor, getPerformanceMonitor } from './performanceMonitor';

// Secure random number generator for benchmarks (not for cryptographic use)
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0xFFFFFFFF;
}

export interface BenchmarkResult {
  name: string;
  jsTime: number;
  wasmTime: number;
  speedup: number;
  memoryJs: number;
  memoryWasm: number;
  iterations: number;
  dataSize: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalTime: number;
  summary: string;
}

export class PerformanceBenchmarks {
  private engine: WasmCalculationEngine;
  private bridge: WasmJsBridge;
  private monitor: PerformanceMonitor;

  constructor() {
    this.engine = new WasmCalculationEngine({ capacity: 1000000 });
    this.bridge = new WasmJsBridge({ useWasm: true, workerCount: 4 });
    this.monitor = getPerformanceMonitor();
  }

  /**
   * Run complete benchmark suite
   */
  async runAllBenchmarks(): Promise<BenchmarkSuite> {
    const startTime = performance.now();
    const results: BenchmarkResult[] = [];

    console.log('🏃 Starting MatrixPro Performance Benchmarks...\n');

    // Cell operations benchmark
    results.push(await this.benchmarkCellOperations());

    // Formula evaluation benchmark
    results.push(await this.benchmarkFormulaEvaluation());

    // Matrix operations benchmark
    results.push(await this.benchmarkMatrixOperations());

    // Hierarchy rollup benchmark
    results.push(await this.benchmarkHierarchyRollup());

    // Batch operations benchmark
    results.push(await this.benchmarkBatchOperations());

    // Aggregation benchmark
    results.push(await this.benchmarkAggregation());

    const totalTime = performance.now() - startTime;

    const suite: BenchmarkSuite = {
      name: 'MatrixPro Performance Suite',
      results,
      totalTime,
      summary: this.generateSummary(results),
    };

    this.printReport(suite);
    return suite;
  }

  /**
   * Benchmark cell set/get operations
   */
  async benchmarkCellOperations(): Promise<BenchmarkResult> {
    const iterations = 10000;
    const dataSize = iterations;

    // Generate test data
    const cells = Array.from({ length: iterations }, (_, i) => ({
      row: Math.floor(i / 100),
      col: i % 100,
      measure: 0,
      value: secureRandom() * 1000,
    }));

    // JS Implementation
    const jsMap = new Map<string, number>();
    this.monitor.mark('cell-ops-js');

    for (const cell of cells) {
      const key = `${cell.row},${cell.col},${cell.measure}`;
      jsMap.set(key, cell.value);
    }

    for (const cell of cells) {
      const key = `${cell.row},${cell.col},${cell.measure}`;
      jsMap.get(key);
    }

    const jsTime = this.monitor.measure('cell-ops-js', 'cellMapBuildTime');
    const memoryJs = this.estimateMapMemory(jsMap);

    // WASM Implementation
    this.engine.clear();
    this.monitor.mark('cell-ops-wasm');

    this.engine.setCellsBatch(cells);

    for (const cell of cells) {
      this.engine.getCell(cell.row, cell.col, cell.measure);
    }

    const wasmTime = this.monitor.measure('cell-ops-wasm', 'cellMapBuildTime');
    const memoryWasm = this.engine.getMemoryStats().memoryBytes;

    return {
      name: 'Cell Operations (10K cells)',
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs,
      memoryWasm,
      iterations,
      dataSize,
    };
  }

  /**
   * Benchmark formula evaluation
   */
  async benchmarkFormulaEvaluation(): Promise<BenchmarkResult> {
    const iterations = 1000;
    const dataSize = iterations;

    // Generate test formulas
    const formulas = [
      'A1 + B1',
      '(A1 + B1) * C1',
      'A1 + B1 + C1 + D1',
      '(A1 * B1) + (C1 / D1)',
      '((A1 + B1) * C1) - D1',
    ];

    const cellValues = new Map([
      ['A1', 100],
      ['B1', 200],
      ['C1', 300],
      ['D1', 400],
    ]);

    // JS Implementation
    this.monitor.mark('formula-js');

    for (let i = 0; i < iterations; i++) {
      const formula = formulas[i % formulas.length];
      this.evaluateFormulaJS(formula, cellValues);
    }

    const jsTime = this.monitor.measure('formula-js', 'formulaEvaluationTime');

    // WASM Implementation
    this.monitor.mark('formula-wasm');

    for (let i = 0; i < iterations; i++) {
      const formula = formulas[i % formulas.length];
      this.engine.evaluateFormulaSimple(formula, cellValues);
    }

    const wasmTime = this.monitor.measure('formula-wasm', 'formulaEvaluationTime');

    return {
      name: 'Formula Evaluation (1K formulas)',
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs: 0,
      memoryWasm: 0,
      iterations,
      dataSize,
    };
  }

  /**
   * Benchmark matrix operations
   */
  async benchmarkMatrixOperations(): Promise<BenchmarkResult> {
    const size = 500; // 500x500 matrix
    const dataSize = size * size;

    // Create test matrix
    const matrix = new Float64Array(dataSize);
    for (let i = 0; i < dataSize; i++) {
      matrix[i] = secureRandom();
    }

    // JS Implementation
    this.monitor.mark('matrix-js');
    this.transposeMatrixJS(matrix, size, size);
    const jsTime = this.monitor.measure('matrix-js', 'formulaEvaluationTime');

    // WASM Implementation
    this.monitor.mark('matrix-wasm');
    this.engine.transpose(matrix, size, size);
    const wasmTime = this.monitor.measure('matrix-wasm', 'formulaEvaluationTime');

    return {
      name: `Matrix Transpose (${size}x${size})`,
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs: dataSize * 8 * 2, // Input + output
      memoryWasm: dataSize * 8 * 2,
      iterations: 1,
      dataSize,
    };
  }

  /**
   * Benchmark hierarchy rollup
   */
  async benchmarkHierarchyRollup(): Promise<BenchmarkResult> {
    const leafCount = 10000;
    const nodeCount = 15000;
    const dataSize = leafCount;

    // Generate tree structure
    const leafValues = new Float64Array(leafCount);
    const parentIndices = new Int32Array(nodeCount);

    for (let i = 0; i < leafCount; i++) {
      leafValues[i] = secureRandom() * 1000;
    }

    // Create random tree structure
    for (let i = 0; i < nodeCount; i++) {
      parentIndices[i] = i < 1000 ? -1 : Math.floor(secureRandom() * (i - 1000)) + 1000;
    }

    // JS Implementation
    this.monitor.mark('rollup-js');
    this.calculateRollupJS(leafValues, parentIndices, 'sum');
    const jsTime = this.monitor.measure('rollup-js', 'hierarchyRollupTime');

    // WASM Implementation
    this.monitor.mark('rollup-wasm');
    this.engine.calculateRollup(leafValues, parentIndices, 'sum');
    const wasmTime = this.monitor.measure('rollup-wasm', 'hierarchyRollupTime');

    return {
      name: `Hierarchy Rollup (${leafCount.toLocaleString()} leaves)`,
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs: (leafCount + nodeCount) * 8,
      memoryWasm: (leafCount + nodeCount) * 8,
      iterations: 1,
      dataSize,
    };
  }

  /**
   * Benchmark batch operations
   */
  async benchmarkBatchOperations(): Promise<BenchmarkResult> {
    const batchSize = 10000;
    const dataSize = batchSize;

    // Generate batch data
    const inputs: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      inputs.push([secureRandom() * 100, secureRandom() * 100]);
    }

    // JS Implementation
    this.monitor.mark('batch-js');
    const jsResults: number[] = [];
    for (const input of inputs) {
      jsResults.push(input[0] + input[1]);
    }
    const jsTime = this.monitor.measure('batch-js', 'formulaEvaluationTime');

    // WASM Implementation
    this.monitor.mark('batch-wasm');
    this.engine.executeBatch('add', inputs);
    const wasmTime = this.monitor.measure('batch-wasm', 'formulaEvaluationTime');

    return {
      name: `Batch Operations (${batchSize.toLocaleString()} ops)`,
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs: 0,
      memoryWasm: 0,
      iterations: batchSize,
      dataSize,
    };
  }

  /**
   * Benchmark aggregation functions
   */
  async benchmarkAggregation(): Promise<BenchmarkResult> {
    const dataSize = 100000;
    const iterations = 100;

    // Generate data
    const values = Array.from({ length: dataSize }, () => secureRandom() * 1000);

    // JS Implementation
    this.monitor.mark('aggregate-js');
    for (let i = 0; i < iterations; i++) {
      values.reduce((a, b) => a + b, 0);
      values.reduce((a, b) => Math.min(a, b), Infinity);
      values.reduce((a, b) => Math.max(a, b), -Infinity);
    }
    const jsTime = this.monitor.measure('aggregate-js', 'formulaEvaluationTime');

    // WASM Implementation via Bridge
    const task: CalculationTask = {
      id: 'aggregate-benchmark',
      type: 'aggregate',
      data: { values, operation: 'sum' },
      priority: 'normal',
    };

    this.monitor.mark('aggregate-wasm');
    for (let i = 0; i < iterations; i++) {
      await this.bridge.execute(task);
    }
    const wasmTime = this.monitor.measure('aggregate-wasm', 'formulaEvaluationTime');

    return {
      name: `Aggregation (${dataSize.toLocaleString()} values)`,
      jsTime,
      wasmTime,
      speedup: jsTime / wasmTime,
      memoryJs: dataSize * 8,
      memoryWasm: dataSize * 8,
      iterations,
      dataSize,
    };
  }

  /**
   * Generate benchmark summary
   */
  private generateSummary(results: BenchmarkResult[]): string {
    const totalSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
    const bestSpeedup = Math.max(...results.map(r => r.speedup));
    const worstSpeedup = Math.min(...results.map(r => r.speedup));

    return `Average speedup: ${totalSpeedup.toFixed(2)}x | Best: ${bestSpeedup.toFixed(2)}x | Worst: ${worstSpeedup.toFixed(2)}x`;
  }

  /**
   * Print benchmark report
   */
  private printReport(suite: BenchmarkSuite): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${suite.name}`);
    console.log('='.repeat(60));

    suite.results.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.name}`);
      console.log(`   JS Time:   ${result.jsTime.toFixed(2)}ms`);
      console.log(`   WASM Time: ${result.wasmTime.toFixed(2)}ms`);
      console.log(`   Speedup:   ${result.speedup.toFixed(2)}x ${result.speedup > 1 ? '🚀' : '⚠️'}`);
      console.log(`   Memory:    JS ${(result.memoryJs / 1024 / 1024).toFixed(2)}MB | WASM ${(result.memoryWasm / 1024 / 1024).toFixed(2)}MB`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`⏱️  Total Time: ${suite.totalTime.toFixed(2)}ms`);
    console.log(`📈 ${suite.summary}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Estimate Map memory usage
   */
  private estimateMapMemory(map: Map<string, number>): number {
    // Rough estimate: 72 bytes per entry + key length + value
    let bytes = 0;
    for (const [key, value] of map) {
      bytes += 72 + key.length * 2 + 8;
    }
    return bytes;
  }

  /**
   * JS formula evaluation (for comparison)
   */
  private evaluateFormulaJS(formula: string, cellValues: Map<string, number>): number {
    // Simple evaluation without Function constructor
    const tokens = formula.split(/\s*([+\-*/()])\s*/).filter(t => t.trim());
    const output: number[] = [];
    const ops: string[] = [];

    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const token of tokens) {
      if (cellValues.has(token)) {
        output.push(cellValues.get(token)!);
      } else if (!isNaN(Number(token))) {
        output.push(Number(token));
      } else if (token in precedence) {
        while (ops.length && precedence[ops[ops.length - 1]] >= precedence[token]) {
          this.applyOp(output, ops.pop()!);
        }
        ops.push(token);
      }
    }

    while (ops.length) {
      this.applyOp(output, ops.pop()!);
    }

    return output[0] || 0;
  }

  private applyOp(output: number[], op: string): void {
    const b = output.pop() || 0;
    const a = output.pop() || 0;
    switch (op) {
      case '+': output.push(a + b); break;
      case '-': output.push(a - b); break;
      case '*': output.push(a * b); break;
      case '/': output.push(b !== 0 ? a / b : Infinity); break;
    }
  }

  /**
   * JS matrix transpose (for comparison)
   */
  private transposeMatrixJS(matrix: Float64Array, rows: number, cols: number): Float64Array {
    const result = new Float64Array(matrix.length);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j * rows + i] = matrix[i * cols + j];
      }
    }
    return result;
  }

  /**
   * JS hierarchy rollup (for comparison)
   */
  private calculateRollupJS(
    leafValues: Float64Array,
    parentIndices: Int32Array,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): Float64Array {
    const nodeCount = parentIndices.length;
    const results = new Float64Array(nodeCount);
    const childCounts = new Int32Array(nodeCount);

    for (let i = 0; i < leafValues.length; i++) {
      let parent = parentIndices[i];
      while (parent >= 0) {
        results[parent] += leafValues[i];
        childCounts[parent]++;
        parent = parentIndices[parent];
      }
    }

    if (aggregation === 'avg') {
      for (let i = 0; i < nodeCount; i++) {
        if (childCounts[i] > 0) {
          results[i] /= childCounts[i];
        }
      }
    }

    return results;
  }

  /**
   * Run quick performance test
   */
  async runQuickTest(): Promise<BenchmarkResult> {
    return this.benchmarkCellOperations();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.bridge.dispose();
    this.engine.clear();
  }
}

// Quick benchmark runner
export async function runBenchmarks(): Promise<BenchmarkSuite> {
  const benchmarks = new PerformanceBenchmarks();
  try {
    return await benchmarks.runAllBenchmarks();
  } finally {
    benchmarks.dispose();
  }
}

export function runQuickBenchmark(): Promise<BenchmarkResult> {
  const benchmarks = new PerformanceBenchmarks();
  return benchmarks.runQuickTest().finally(() => benchmarks.dispose());
}

