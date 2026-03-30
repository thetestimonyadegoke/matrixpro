/**
 * Audit Logger
 * Logs all writeback operations for compliance and tracking
 */

import {
  AuditLogEntry,
  AuditAction,
  AuditActionDetails,
  WritebackChange,
  WritebackBatch,
  ValidationError,
  AuditQueryOptions,
} from "./types";

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000;
  private storageKey: string = "matrixpro_audit_logs";

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Log a cell edit operation
   */
  logCellEdit(
    user: string,
    change: WritebackChange,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "cellEdit",
      details: { change },
      ...options,
    });
  }

  /**
   * Log a batch writeback operation
   */
  logBatchWriteback(
    user: string,
    batch: WritebackBatch,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "batchWriteback",
      details: { batch },
      ...options,
    });
  }

  /**
   * Log validation failures
   */
  logValidationFail(
    user: string,
    errors: ValidationError[],
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "validationFail",
      details: { validationErrors: errors },
      ...options,
    });
  }

  /**
   * Log scenario operations
   */
  logScenarioCreate(
    user: string,
    scenarioId: string,
    scenarioName: string,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "scenarioCreate",
      details: { scenarioId, scenarioName },
      ...options,
    });
  }

  logScenarioSwitch(
    user: string,
    scenarioId: string,
    scenarioName: string,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "scenarioSwitch",
      details: { scenarioId, scenarioName },
      ...options,
    });
  }

  logScenarioDelete(
    user: string,
    scenarioId: string,
    scenarioName: string,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "scenarioDelete",
      details: { scenarioId, scenarioName },
      ...options,
    });
  }

  /**
   * Log export operations
   */
  logExport(
    user: string,
    format: string,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "export",
      details: { exportFormat: format },
      ...options,
    });
  }

  /**
   * Log configuration changes
   */
  logConfigChange(
    user: string,
    key: string,
    oldValue: string,
    newValue: string,
    options?: { ipAddress?: string; sessionId?: string }
  ): void {
    this.log({
      id: this.generateId(),
      timestamp: Date.now(),
      user,
      action: "configChange",
      details: {
        configKey: key,
        configOldValue: oldValue,
        configNewValue: newValue,
      },
      ...options,
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(options: AuditQueryOptions = {}): Promise<AuditLogEntry[]> {
    let results = [...this.logs];

    if (options.startDate) {
      const startTime = options.startDate.getTime();
      results = results.filter((log) => log.timestamp >= startTime);
    }

    if (options.endDate) {
      const endTime = options.endDate.getTime();
      results = results.filter((log) => log.timestamp <= endTime);
    }

    if (options.user) {
      results = results.filter((log) => log.user === options.user);
    }

    if (options.action) {
      results = results.filter((log) => log.action === options.action);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get all logs for a specific user
   */
  async getUserLogs(
    user: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.queryLogs({ user, limit });
  }

  /**
   * Get logs for a specific time range
   */
  async getLogsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogEntry[]> {
    return this.queryLogs({ startDate, endDate });
  }

  /**
   * Export logs to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byAction: Record<AuditAction, number>;
    byUser: Record<string, number>;
    dateRange: { earliest: Date; latest: Date } | null;
  } {
    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    let earliest: number | null = null;
    let latest: number | null = null;

    for (const log of this.logs) {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by user
      byUser[log.user] = (byUser[log.user] || 0) + 1;

      // Track date range
      if (earliest === null || log.timestamp < earliest) {
        earliest = log.timestamp;
      }
      if (latest === null || log.timestamp > latest) {
        latest = log.timestamp;
      }
    }

    return {
      total: this.logs.length,
      byAction: byAction as Record<AuditAction, number>,
      byUser,
      dateRange:
        earliest !== null && latest !== null
          ? { earliest: new Date(earliest), latest: new Date(latest) }
          : null,
    };
  }

  private log(entry: AuditLogEntry): void {
    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save to storage
    this.saveToStorage();

    // Also log to console for debugging
    console.log(`[Audit] ${entry.action} by ${entry.user}`, entry.details);
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Date.now().toString(36).substr(2, 9)}`;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      console.warn("Failed to save audit logs to storage:", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load audit logs from storage:", e);
    }
  }
}
