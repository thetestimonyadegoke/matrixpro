/**
 * Performance Analysis & Monitoring System
 * Tracks calculation and rendering performance to identify bottlenecks
 * Provides metrics for WebAssembly optimization decisions
 */

export interface PerformanceMetrics {
  // Calculation metrics
  formulaEvaluationTime: number;
  cellMapBuildTime: number;
  hierarchyRollupTime: number;
  
  // Rendering metrics
  renderTime: number;
  virtualizationTime: number;
  cellRenderTime: number;
  
  // Memory metrics
  heapUsed: number;
  heapTotal: number;
  cellCount: number;
  nodeCount: number;
  
  // Frame metrics
  fps: number;
  frameTime: number;
  droppedFrames: number;
}

export interface PerformanceBudget {
  maxFormulaEvalTime: number;     // ms
  maxRenderTime: number;          // ms
  minFps: number;                   // target FPS
  maxMemoryUsage: number;         // MB
  maxCellRenderTime: number;      // ms per 1000 cells
}

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxFormulaEvalTime: 100,          // 100ms max for formula evaluation
  maxRenderTime: 16,               // 16ms for 60 FPS
  minFps: 30,                      // Minimum acceptable FPS
  maxMemoryUsage: 256,             // 256MB max heap
  maxCellRenderTime: 8,           // 8ms per 1000 cells
};

export type PerformanceObserverCallback = (metrics: PerformanceMetrics, budget: PerformanceBudget) => void;

class PerformanceMonitor {
  private budgets: PerformanceBudget;
  private observers: Set<PerformanceObserverCallback>;
  private metrics: Partial<PerformanceMetrics>;
  private marks: Map<string, number>;
  private frameCount: number;
  private lastFrameTime: number;
  private droppedFrames: number;
  private isRunning: boolean;

  constructor(budgets: Partial<PerformanceBudget> = {}) {
    this.budgets = { ...DEFAULT_PERFORMANCE_BUDGET, ...budgets };
    this.observers = new Set();
    this.metrics = {};
    this.marks = new Map();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.droppedFrames = 0;
    this.isRunning = false;
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    this.isRunning = true;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastFrameTime = performance.now();
    this.monitorFrameRate();
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Mark the start of a performance measurement
   */
  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * Mark the end of a performance measurement and record duration
   */
  measure(label: string, category: keyof PerformanceMetrics): number {
    const startTime = this.marks.get(label);
    if (startTime === undefined) {
      console.warn(`Performance mark "${label}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics[category] = duration;
    this.marks.delete(label);

    // Check against budget
    this.checkBudget(category, duration);

    return duration;
  }

  /**
   * Measure function execution time
   */
  measureFunction<T>(
    fn: () => T,
    label: string,
    category: keyof PerformanceMetrics
  ): T {
    this.mark(label);
    const result = fn();
    this.measure(label, category);
    return result;
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    const perf = performance as any;
    if (perf.memory) {
      const memory = perf.memory;
      this.metrics.heapUsed = memory.usedJSHeapSize / 1024 / 1024; // MB
      this.metrics.heapTotal = memory.totalJSHeapSize / 1024 / 1024; // MB
    }
  }

  /**
   * Record cell and node counts
   */
  recordCounts(cellCount: number, nodeCount: number): void {
    this.metrics.cellCount = cellCount;
    this.metrics.nodeCount = nodeCount;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      fps: this.metrics.fps || 0,
      frameTime: this.metrics.frameTime || 0,
      droppedFrames: this.droppedFrames,
    } as PerformanceMetrics;
  }

  /**
   * Check if current performance is within budget
   */
  isWithinBudget(): boolean {
    const metrics = this.getMetrics();
    
    if (metrics.formulaEvaluationTime > this.budgets.maxFormulaEvalTime) return false;
    if (metrics.renderTime > this.budgets.maxRenderTime) return false;
    if (metrics.fps < this.budgets.minFps) return false;
    if (metrics.heapUsed > this.budgets.maxMemoryUsage) return false;
    
    return true;
  }

  /**
   * Get performance violations
   */
  getViolations(): Array<{ metric: string; actual: number; budget: number; severity: 'warning' | 'critical' }> {
    const metrics = this.getMetrics();
    const violations: Array<{ metric: string; actual: number; budget: number; severity: 'warning' | 'critical' }> = [];

    if (metrics.formulaEvaluationTime > this.budgets.maxFormulaEvalTime) {
      violations.push({
        metric: 'formulaEvaluationTime',
        actual: metrics.formulaEvaluationTime,
        budget: this.budgets.maxFormulaEvalTime,
        severity: metrics.formulaEvaluationTime > this.budgets.maxFormulaEvalTime * 2 ? 'critical' : 'warning',
      });
    }

    if (metrics.renderTime > this.budgets.maxRenderTime) {
      violations.push({
        metric: 'renderTime',
        actual: metrics.renderTime,
        budget: this.budgets.maxRenderTime,
        severity: metrics.renderTime > this.budgets.maxRenderTime * 2 ? 'critical' : 'warning',
      });
    }

    if (metrics.fps < this.budgets.minFps) {
      violations.push({
        metric: 'fps',
        actual: metrics.fps,
        budget: this.budgets.minFps,
        severity: metrics.fps < this.budgets.minFps / 2 ? 'critical' : 'warning',
      });
    }

    if (metrics.heapUsed > this.budgets.maxMemoryUsage) {
      violations.push({
        metric: 'heapUsed',
        actual: metrics.heapUsed,
        budget: this.budgets.maxMemoryUsage,
        severity: metrics.heapUsed > this.budgets.maxMemoryUsage * 1.5 ? 'critical' : 'warning',
      });
    }

    return violations;
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: PerformanceObserverCallback): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Report performance summary
   */
  report(): string {
    const metrics = this.getMetrics();
    const violations = this.getViolations();

    let report = '=== Performance Report ===\n';
    report += `Formula Evaluation: ${metrics.formulaEvaluationTime?.toFixed(2)}ms\n`;
    report += `Cell Map Build: ${metrics.cellMapBuildTime?.toFixed(2)}ms\n`;
    report += `Hierarchy Rollup: ${metrics.hierarchyRollupTime?.toFixed(2)}ms\n`;
    report += `Render Time: ${metrics.renderTime?.toFixed(2)}ms\n`;
    report += `FPS: ${metrics.fps?.toFixed(1)}\n`;
    report += `Memory: ${metrics.heapUsed?.toFixed(1)}MB / ${metrics.heapTotal?.toFixed(1)}MB\n`;
    report += `Cells: ${metrics.cellCount}, Nodes: ${metrics.nodeCount}\n`;

    if (violations.length > 0) {
      report += '\n--- VIOLATIONS ---\n';
      violations.forEach(v => {
        report += `[${v.severity.toUpperCase()}] ${v.metric}: ${v.actual.toFixed(2)} (budget: ${v.budget})\n`;
      });
    }

    return report;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {};
    this.marks.clear();
    this.frameCount = 0;
    this.droppedFrames = 0;
  }

  private monitorFrameRate(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    this.metrics.frameTime = frameTime;

    // Calculate FPS every second
    if (this.frameCount % 60 === 0) {
      this.metrics.fps = 1000 / frameTime;
    }

    // Detect dropped frames (frame time > 33ms for 30 FPS)
    if (frameTime > 33) {
      this.droppedFrames++;
    }

    requestAnimationFrame(() => this.monitorFrameRate());
  }

  private checkBudget(category: keyof PerformanceMetrics, value: number): void {
    const budgetMap: Partial<Record<keyof PerformanceMetrics, number>> = {
      formulaEvaluationTime: this.budgets.maxFormulaEvalTime,
      renderTime: this.budgets.maxRenderTime,
    };

    const budget = budgetMap[category];
    if (budget && value > budget) {
      // Notify observers of budget violation
      this.observers.forEach(cb => cb(this.getMetrics(), this.budgets));
    }
  }
}

// Bottleneck analysis
export interface BottleneckAnalysis {
  primary: string;
  secondary: string[];
  recommendations: string[];
  wasmCandidate: boolean;
}

export function analyzeBottlenecks(metrics: PerformanceMetrics): BottleneckAnalysis {
  const analysis: BottleneckAnalysis = {
    primary: '',
    secondary: [],
    recommendations: [],
    wasmCandidate: false,
  };

  // Identify primary bottleneck
  const times = [
    { name: 'formulaEvaluation', value: metrics.formulaEvaluationTime },
    { name: 'cellMapBuild', value: metrics.cellMapBuildTime },
    { name: 'hierarchyRollup', value: metrics.hierarchyRollupTime },
    { name: 'render', value: metrics.renderTime },
  ];

  times.sort((a, b) => b.value - a.value);
  analysis.primary = times[0].name;
  analysis.secondary = times.slice(1, 3).map(t => t.name);

  // Generate recommendations
  if (analysis.primary === 'formulaEvaluation') {
    analysis.recommendations.push('Consider WebAssembly for formula evaluation');
    analysis.recommendations.push('Implement formula caching');
    analysis.recommendations.push('Use worker threads for parallel evaluation');
    analysis.wasmCandidate = true;
  }

  if (analysis.primary === 'hierarchyRollup') {
    analysis.recommendations.push('Optimize tree traversal algorithms');
    analysis.recommendations.push('Consider iterative instead of recursive rollup');
    analysis.recommendations.push('Cache intermediate rollup results');
    analysis.wasmCandidate = true;
  }

  if (analysis.primary === 'render') {
    analysis.recommendations.push('Optimize React render cycles');
    analysis.recommendations.push('Implement more aggressive virtualization');
    analysis.recommendations.push('Use canvas rendering for large datasets');
  }

  if (metrics.fps < 30) {
    analysis.recommendations.push('Reduce visual complexity');
    analysis.recommendations.push('Implement requestAnimationFrame batching');
  }

  if (metrics.heapUsed > 200) {
    analysis.recommendations.push('Implement object pooling');
    analysis.recommendations.push('Optimize data structures');
    analysis.recommendations.push('Use TypedArrays for numeric data');
  }

  return analysis;
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(budgets?: Partial<PerformanceBudget>): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor(budgets);
  }
  return monitorInstance;
}

export function initializePerformanceMonitor(budgets?: Partial<PerformanceBudget>): PerformanceMonitor {
  monitorInstance = new PerformanceMonitor(budgets);
  return monitorInstance;
}

export { PerformanceMonitor };
export default PerformanceMonitor;
