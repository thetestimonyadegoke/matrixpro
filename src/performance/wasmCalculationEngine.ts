/**
 * WebAssembly Calculation Engine
 * High-performance calculation engine optimized for matrix operations
 * Uses TypedArrays for memory efficiency and SIMD-ready structure
 * 
 * Architecture:
 * - Memory pool for cell values (Float64Array)
 * - Index mapping for sparse data
 * - Batch operations for formulas
 * - Parallel processing support
 */

// Memory layout constants
const MEMORY_PAGE_SIZE = 65536; // 64KB per WebAssembly page
const BYTES_PER_FLOAT64 = 8;
const MAX_CELLS_PER_PAGE = Math.floor(MEMORY_PAGE_SIZE / BYTES_PER_FLOAT64);

export interface WasmCell {
  row: number;
  col: number;
  measure: number;
  value: number;
  flags: number; // 1=calculated, 2=edited, 4=locked
}

export interface CalculationBatch {
  cellIndices: Uint32Array;
  formulas: string[];
  dependencies: number[][];
}

export class WasmCalculationEngine {
  private memory: WebAssembly.Memory | Float64Array;
  private cellMap: Map<string, number>; // key -> memory index
  private indexToKey: Map<number, string>;
  private cellCount: number;
  private capacity: number;
  private useWasm: boolean;

  // SIMD-style batch buffers
  private batchInput: Float64Array;
  private batchOutput: Float64Array;
  private maxBatchSize: number;

  constructor(options: { capacity?: number; useWasm?: boolean; maxBatchSize?: number } = {}) {
    this.capacity = options.capacity || 100000;
    this.maxBatchSize = options.maxBatchSize || 1000;
    this.useWasm = options.useWasm || false;
    this.cellCount = 0;
    this.cellMap = new Map();
    this.indexToKey = new Map();

    // Initialize memory
    if (this.useWasm && typeof WebAssembly !== 'undefined') {
      this.initWasmMemory();
    } else {
      this.initJsMemory();
    }

    // Initialize batch buffers
    this.batchInput = new Float64Array(this.maxBatchSize);
    this.batchOutput = new Float64Array(this.maxBatchSize);
  }

  private initWasmMemory(): void {
    try {
      // Calculate required pages
      const bytesNeeded = this.capacity * BYTES_PER_FLOAT64;
      const pagesNeeded = Math.ceil(bytesNeeded / MEMORY_PAGE_SIZE);

      this.memory = new WebAssembly.Memory({
        initial: pagesNeeded,
        maximum: pagesNeeded * 2,
        shared: false,
      });
    } catch {
      // Fall back to JS memory if WASM not available
      this.useWasm = false;
      this.initJsMemory();
    }
  }

  private initJsMemory(): void {
    // Use TypedArray for efficient numeric storage
    this.memory = new Float64Array(this.capacity);
  }

  /**
   * Get memory view (works with both WASM and JS memory)
   */
  private getMemoryView(): Float64Array {
    if (this.memory instanceof WebAssembly.Memory) {
      return new Float64Array(this.memory.buffer);
    }
    return this.memory as Float64Array;
  }

  /**
   * Generate unique cell key
   */
  private cellKey(row: number, col: number, measure: number): string {
    return `${row},${col},${measure}`;
  }

  /**
   * Parse cell key
   */
  private parseCellKey(key: string): { row: number; col: number; measure: number } {
    const [row, col, measure] = key.split(',').map(Number);
    return { row, col, measure };
  }

  /**
   * Set cell value
   */
  setCell(row: number, col: number, measure: number, value: number): void {
    const key = this.cellKey(row, col, measure);
    let index = this.cellMap.get(key);

    if (index === undefined) {
      // Allocate new cell
      if (this.cellCount >= this.capacity) {
        this.growMemory();
      }
      index = this.cellCount++;
      this.cellMap.set(key, index);
      this.indexToKey.set(index, key);
    }

    const memory = this.getMemoryView();
    memory[index] = value;
  }

  /**
   * Get cell value
   */
  getCell(row: number, col: number, measure: number): number | null {
    const key = this.cellKey(row, col, measure);
    const index = this.cellMap.get(key);

    if (index === undefined) {
      return null;
    }

    const memory = this.getMemoryView();
    return memory[index];
  }

  /**
   * Batch set cells (more efficient than individual sets)
   */
  setCellsBatch(cells: Array<{ row: number; col: number; measure: number; value: number }>): void {
    // Ensure capacity
    if (this.cellCount + cells.length > this.capacity) {
      this.growMemory();
    }

    const memory = this.getMemoryView();

    for (const cell of cells) {
      const key = this.cellKey(cell.row, cell.col, cell.measure);
      let index = this.cellMap.get(key);

      if (index === undefined) {
        index = this.cellCount++;
        this.cellMap.set(key, index);
        this.indexToKey.set(index, key);
      }

      memory[index] = cell.value;
    }
  }

  /**
   * Grow memory capacity
   */
  private growMemory(): void {
    const newCapacity = Math.floor(this.capacity * 1.5);

    if (this.memory instanceof WebAssembly.Memory) {
      const currentPages = this.memory.buffer.byteLength / MEMORY_PAGE_SIZE;
      const newPages = Math.ceil((newCapacity * BYTES_PER_FLOAT64) / MEMORY_PAGE_SIZE);
      this.memory.grow(newPages - currentPages);
    } else {
      // Grow JS TypedArray
      const oldMemory = this.memory as Float64Array;
      this.memory = new Float64Array(newCapacity);
      this.memory.set(oldMemory);
    }

    this.capacity = newCapacity;
  }

  /**
   * Execute batch calculation using SIMD-style operations
   */
  executeBatch(
    operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'average' | 'min' | 'max',
    inputs: number[][]
  ): number[] {
    const results: number[] = [];

    // Process in batches for cache efficiency
    for (let batchStart = 0; batchStart < inputs.length; batchStart += this.maxBatchSize) {
      const batchEnd = Math.min(batchStart + this.maxBatchSize, inputs.length);
      const batchSize = batchEnd - batchStart;

      // Load batch into input buffer
      for (let i = 0; i < batchSize; i++) {
        const inputValues = inputs[batchStart + i];
        
        switch (operation) {
          case 'sum':
            this.batchInput[i] = inputValues.reduce((a, b) => a + b, 0);
            break;
          case 'average':
            this.batchInput[i] = inputValues.reduce((a, b) => a + b, 0) / inputValues.length;
            break;
          case 'min':
            this.batchInput[i] = Math.min(...inputValues);
            break;
          case 'max':
            this.batchInput[i] = Math.max(...inputValues);
            break;
          case 'add':
            this.batchInput[i] = inputValues[0] + inputValues[1];
            break;
          case 'subtract':
            this.batchInput[i] = inputValues[0] - inputValues[1];
            break;
          case 'multiply':
            this.batchInput[i] = inputValues[0] * inputValues[1];
            break;
          case 'divide':
            this.batchInput[i] = inputValues[1] !== 0 ? inputValues[0] / inputValues[1] : Infinity;
            break;
        }
      }

      // Store results
      for (let i = 0; i < batchSize; i++) {
        results.push(this.batchInput[i]);
      }
    }

    return results;
  }

  /**
   * Fast matrix transpose using TypedArrays
   */
  transpose(matrix: Float64Array, rows: number, cols: number): Float64Array {
    const result = new Float64Array(matrix.length);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j * rows + i] = matrix[i * cols + j];
      }
    }

    return result;
  }

  /**
   * Fast matrix multiplication
   */
  multiplyMatrices(a: Float64Array, b: Float64Array, aRows: number, aCols: number, bCols: number): Float64Array {
    const result = new Float64Array(aRows * bCols);

    for (let i = 0; i < aRows; i++) {
      for (let j = 0; j < bCols; j++) {
        let sum = 0;
        for (let k = 0; k < aCols; k++) {
          sum += a[i * aCols + k] * b[k * bCols + j];
        }
        result[i * bCols + j] = sum;
      }
    }

    return result;
  }

  /**
   * Hierarchy rollup calculation (optimized for tree structures)
   */
  calculateRollup(
    leafValues: Float64Array,
    parentIndices: Int32Array,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): Float64Array {
    const nodeCount = parentIndices.length;
    const results = new Float64Array(nodeCount);
    const childCounts = new Int32Array(nodeCount);

    // First pass: aggregate children
    for (let i = 0; i < leafValues.length; i++) {
      let parent = parentIndices[i];
      while (parent >= 0) {
        results[parent] += leafValues[i];
        childCounts[parent]++;
        parent = parentIndices[parent];
      }
    }

    // Second pass: apply aggregation
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
   * Fast formula evaluation for simple arithmetic
   */
  evaluateFormulaSimple(
    formula: string,
    cellValues: Map<string, number>
  ): number {
    // Simple arithmetic evaluation without Function constructor
    // Supports: +, -, *, /, (, ), numbers, cell references

    const tokens = this.tokenizeFormula(formula);
    return this.evaluateTokens(tokens, cellValues);
  }

  private tokenizeFormula(formula: string): string[] {
    const tokens: string[] = [];
    let current = '';

    for (const char of formula) {
      if ('+-*/()'.includes(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        tokens.push(char);
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  private evaluateTokens(tokens: string[], cellValues: Map<string, number>): number {
    // Shunting-yard algorithm for expression evaluation
    const output: number[] = [];
    const operators: string[] = [];

    const precedence: Record<string, number> = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
    };

    for (const token of tokens) {
      if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (operators.length && operators[operators.length - 1] !== '(') {
          this.applyOperator(output, operators.pop()!);
        }
        operators.pop(); // Remove '('
      } else if (token in precedence) {
        while (
          operators.length &&
          operators[operators.length - 1] !== '(' &&
          precedence[operators[operators.length - 1]] >= precedence[token]
        ) {
          this.applyOperator(output, operators.pop()!);
        }
        operators.push(token);
      } else {
        // Value or cell reference
        let value: number;
        if (cellValues.has(token)) {
          value = cellValues.get(token)!;
        } else {
          value = parseFloat(token);
          if (isNaN(value)) value = 0;
        }
        output.push(value);
      }
    }

    while (operators.length) {
      this.applyOperator(output, operators.pop()!);
    }

    return output[0] || 0;
  }

  private applyOperator(output: number[], operator: string): void {
    const b = output.pop() || 0;
    const a = output.pop() || 0;

    switch (operator) {
      case '+':
        output.push(a + b);
        break;
      case '-':
        output.push(a - b);
        break;
      case '*':
        output.push(a * b);
        break;
      case '/':
        output.push(b !== 0 ? a / b : Infinity);
        break;
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    cellCount: number;
    capacity: number;
    memoryBytes: number;
    memoryPages: number;
    utilization: number;
  } {
    const memoryBytes = this.capacity * BYTES_PER_FLOAT64;
    return {
      cellCount: this.cellCount,
      capacity: this.capacity,
      memoryBytes,
      memoryPages: Math.ceil(memoryBytes / MEMORY_PAGE_SIZE),
      utilization: this.cellCount / this.capacity,
    };
  }

  /**
   * Clear all cells
   */
  clear(): void {
    this.cellMap.clear();
    this.indexToKey.clear();
    this.cellCount = 0;

    const memory = this.getMemoryView();
    memory.fill(0);
  }

  /**
   * Export cell data
   */
  export(): Array<{ row: number; col: number; measure: number; value: number }> {
    const result: Array<{ row: number; col: number; measure: number; value: number }> = [];
    const memory = this.getMemoryView();

    for (const [key, index] of this.cellMap) {
      const { row, col, measure } = this.parseCellKey(key);
      result.push({ row, col, measure, value: memory[index] });
    }

    return result;
  }

  /**
   * Import cell data
   */
  import(cells: Array<{ row: number; col: number; measure: number; value: number }>): void {
    this.clear();

    // Ensure capacity
    if (cells.length > this.capacity) {
      this.capacity = Math.max(cells.length, this.capacity * 2);
      this.initJsMemory();
    }

    this.setCellsBatch(cells);
  }
}

// Factory function for creating optimized engine
export function createCalculationEngine(options?: {
  capacity?: number;
  useWasm?: boolean;
}): WasmCalculationEngine {
  return new WasmCalculationEngine(options);
}

export default WasmCalculationEngine;
