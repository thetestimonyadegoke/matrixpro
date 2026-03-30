/**
 * WASM-JavaScript Bridge
 * Provides seamless integration between JavaScript calculations and WASM engine
 * Handles data marshalling, async operations, and fallback mechanisms
 */

import { WasmCalculationEngine, createCalculationEngine } from './wasmCalculationEngine';
import { getPerformanceMonitor } from './performanceMonitor';

export interface BridgeConfig {
  useWasm: boolean;
  workerCount: number;
  batchSize: number;
  fallbackThreshold: number; // ms - switch to WASM if JS exceeds this
}

export interface CalculationTask {
  id: string;
  type: 'formula' | 'rollup' | 'aggregate' | 'matrix';
  data: unknown;
  priority: 'high' | 'normal' | 'low';
}

export interface CalculationResult {
  id: string;
  result: unknown;
  duration: number;
  method: 'wasm' | 'js' | 'worker';
  error?: string;
}

export class WasmJsBridge {
  private engine: WasmCalculationEngine;
  private config: BridgeConfig;
  private workers: Worker[];
  private taskQueue: CalculationTask[];
  private results: Map<string, CalculationResult>;
  private isProcessing: boolean;

  constructor(config: Partial<BridgeConfig> = {}) {
    this.config = {
      useWasm: true,
      workerCount: navigator.hardwareConcurrency || 4,
      batchSize: 1000,
      fallbackThreshold: 50,
      ...config,
    };

    // Initialize engine
    this.engine = createCalculationEngine({
      capacity: 100000,
      useWasm: this.config.useWasm,
    });

    this.workers = [];
    this.taskQueue = [];
    this.results = new Map();
    this.isProcessing = false;

    // Initialize workers if supported
    if (typeof Worker !== 'undefined') {
      this.initWorkers();
    }
  }

  private initWorkers(): void {
    // Create inline worker for calculation tasks
    const workerScript = `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          const start = performance.now();
          
          switch (type) {
            case 'aggregate':
              result = calculateAggregate(data);
              break;
            case 'rollup':
              result = calculateRollup(data);
              break;
            case 'formula':
              result = evaluateFormulaBatch(data);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({
            id,
            result,
            duration: performance.now() - start,
            method: 'worker'
          });
        } catch (error) {
          self.postMessage({
            id,
            error: error.message,
            duration: 0,
            method: 'worker'
          });
        }
      };
      
      function calculateAggregate(data) {
        const { values, operation } = data;
        switch (operation) {
          case 'sum': return values.reduce((a, b) => a + b, 0);
          case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
          case 'min': return Math.min(...values);
          case 'max': return Math.max(...values);
          case 'count': return values.length;
          default: return 0;
        }
      }
      
      function calculateRollup(data) {
        const { leafValues, parentIndices, aggregation } = data;
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
        
        return Array.from(results);
      }
      
      function evaluateFormulaBatch(data) {
        const { formulas, cellValues } = data;
        return formulas.map(formula => {
          try {
            // Simple formula evaluation
            return evaluateSimpleFormula(formula, cellValues);
          } catch {
            return null;
          }
        });
      }
      
      function evaluateSimpleFormula(formula, cellValues) {
        // Replace cell references with values
        let processedFormula = formula;
        for (const [key, value] of Object.entries(cellValues)) {
          processedFormula = processedFormula.replace(new RegExp('\\\\b' + key + '\\\\b', 'g'), String(value));
        }
        
        // Evaluate safely
        try {
          return Function('"use strict"; return (' + processedFormula + ')')();
        } catch {
          return null;
        }
      }
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    for (let i = 0; i < this.config.workerCount; i++) {
      const worker = new Worker(workerUrl);
      worker.onmessage = (e: MessageEvent) => this.handleWorkerMessage(e.data);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(data: CalculationResult): void {
    this.results.set(data.id, data);
    this.processQueue();
  }

  /**
   * Execute calculation with automatic optimization
   */
  async execute<T>(task: CalculationTask): Promise<T> {
    const monitor = getPerformanceMonitor();
    const startTime = performance.now();

    // Decide execution method based on task characteristics
    const method = this.selectExecutionMethod(task);

    let result: T;

    switch (method) {
      case 'wasm':
        result = await this.executeWasm<T>(task);
        break;
      case 'worker':
        result = await this.executeWorker<T>(task);
        break;
      default:
        result = await this.executeJs<T>(task);
    }

    const duration = performance.now() - startTime;

    // Record performance
    if (task.type === 'formula') {
      monitor.measure('formula-wasm-' + task.id, 'formulaEvaluationTime');
    }

    // Store result
    this.results.set(task.id, {
      id: task.id,
      result,
      duration,
      method,
    });

    return result;
  }

  private selectExecutionMethod(task: CalculationTask): 'wasm' | 'js' | 'worker' {
    // Use workers for parallelizable tasks with large data
    if (task.type === 'aggregate' || task.type === 'rollup') {
      const data = task.data as { values?: number[]; leafValues?: number[] };
      const size = data.values?.length || data.leafValues?.length || 0;

      if (size > this.config.batchSize && this.workers.length > 0) {
        return 'worker';
      }
    }

    // Use WASM for complex calculations if available
    if (this.config.useWasm && (task.type === 'formula' || task.type === 'matrix')) {
      return 'wasm';
    }

    return 'js';
  }

  private executeWasm<T>(task: CalculationTask): T {
    const data = task.data as Record<string, unknown>;

    switch (task.type) {
      case 'formula': {
        const { formula, cellValues } = data as { formula: string; cellValues: Map<string, number> };
        const result = this.engine.evaluateFormulaSimple(formula, cellValues);
        return result as T;
      }

      case 'matrix': {
        const { operation, matrix, rows, cols } = data as {
          operation: string;
          matrix: Float64Array;
          rows: number;
          cols: number;
        };

        if (operation === 'transpose') {
          return this.engine.transpose(matrix, rows, cols) as T;
        }
        break;
      }

      case 'aggregate': {
        const { values, operation } = data as { values: number[][]; operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'average' | 'min' | 'max' };
        return this.engine.executeBatch(operation, values) as T;
      }

      case 'rollup': {
        const { leafValues, parentIndices, aggregation } = data as {
          leafValues: Float64Array;
          parentIndices: Int32Array;
          aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
        };
        return this.engine.calculateRollup(leafValues, parentIndices, aggregation) as T;
      }
    }

    throw new Error(`WASM execution not implemented for task type: ${task.type}`);
  }

  private executeJs<T>(task: CalculationTask): T {
    const data = task.data as Record<string, unknown>;

    switch (task.type) {
      case 'formula': {
        const { formula, cellValues } = data as { formula: string; cellValues: Map<string, number> };
        return this.engine.evaluateFormulaSimple(formula, cellValues) as T;
      }

      case 'aggregate': {
        const { values, operation } = data as { values: number[]; operation: string };

        switch (operation) {
          case 'sum':
            return values.reduce((a, b) => a + b, 0) as T;
          case 'avg':
            return (values.reduce((a, b) => a + b, 0) / values.length) as T;
          case 'min':
            return Math.min(...values) as T;
          case 'max':
            return Math.max(...values) as T;
          case 'count':
            return values.length as T;
        }
        break;
      }
    }

    throw new Error(`JS execution not implemented for task type: ${task.type}`);
  }

  private executeWorker<T>(task: CalculationTask): Promise<T> {
    return new Promise((resolve, reject) => {
      // Find available worker
      const worker = this.workers[this.taskQueue.length % this.workers.length];

      const timeout = setTimeout(() => {
        reject(new Error(`Worker timeout for task ${task.id}`));
      }, 30000);

      const handler = (e: MessageEvent) => {
        const data = e.data as CalculationResult;
        if (data.id === task.id) {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);

          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.result as T);
          }
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage(task);
    });
  }

  /**
   * Execute batch of calculations
   */
  async executeBatch<T>(tasks: CalculationTask[]): Promise<T[]> {
    return Promise.all(tasks.map(task => this.execute<T>(task)));
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.execute(task).catch(console.error);
    }

    this.isProcessing = false;
  }

  /**
   * Queue calculation task
   */
  queue(task: CalculationTask): void {
    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * Get calculation result
   */
  getResult(id: string): CalculationResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get all results
   */
  getAllResults(): CalculationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear();
  }

  /**
   * Get bridge statistics
   */
  getStats(): {
    queueLength: number;
    resultsCount: number;
    workerCount: number;
    wasmEnabled: boolean;
    memoryStats: ReturnType<WasmCalculationEngine['getMemoryStats']>;
  } {
    return {
      queueLength: this.taskQueue.length,
      resultsCount: this.results.size,
      workerCount: this.workers.length,
      wasmEnabled: this.config.useWasm,
      memoryStats: this.engine.getMemoryStats(),
    };
  }

  /**
   * Set cell value in WASM memory
   */
  setCell(row: number, col: number, measure: number, value: number): void {
    this.engine.setCell(row, col, measure, value);
  }

  /**
   * Get cell value from WASM memory
   */
  getCell(row: number, col: number, measure: number): number | null {
    return this.engine.getCell(row, col, measure);
  }

  /**
   * Batch set cells
   */
  setCellsBatch(cells: Array<{ row: number; col: number; measure: number; value: number }>): void {
    this.engine.setCellsBatch(cells);
  }

  /**
   * Dispose bridge and cleanup resources
   */
  dispose(): void {
    // Terminate workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];

    // Clear data
    this.engine.clear();
    this.taskQueue = [];
    this.results.clear();
  }
}

// Factory function
export function createWasmBridge(config?: Partial<BridgeConfig>): WasmJsBridge {
  return new WasmJsBridge(config);
}

export default WasmJsBridge;
