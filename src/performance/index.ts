/**
 * Performance Module - Index
 * Exports all performance optimization and monitoring functionality
 */

// Performance Monitoring
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  initializePerformanceMonitor,
  DEFAULT_PERFORMANCE_BUDGET,
  analyzeBottlenecks,
} from "./performanceMonitor";

export type {
  PerformanceMetrics,
  PerformanceBudget,
  PerformanceObserverCallback,
  BottleneckAnalysis,
} from "./performanceMonitor";

// WASM Calculation Engine
export {
  WasmCalculationEngine,
  createCalculationEngine,
} from "./wasmCalculationEngine";

export type {
  WasmCell,
  CalculationBatch,
} from "./wasmCalculationEngine";

// WASM-JS Bridge
export {
  WasmJsBridge,
  createWasmBridge,
} from "./wasmJsBridge";

export type {
  BridgeConfig,
  CalculationTask,
  CalculationResult,
} from "./wasmJsBridge";

// Benchmarks
export {
  PerformanceBenchmarks,
  runBenchmarks,
  runQuickBenchmark,
} from "./benchmarks";

export type {
  BenchmarkResult,
  BenchmarkSuite,
} from "./benchmarks";
