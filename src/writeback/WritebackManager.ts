/**
 * Writeback Manager
 * Central manager for all writeback operations
 */

import {
  IWritebackManager,
  WritebackDestination,
  WritebackBatch,
  WritebackChange,
  WritebackResult,
  IWritebackAdapter,
  ValidationRule,
  ValidationResult,
  BatchQueueStatus,
  AuditLogEntry,
  AuditQueryOptions,
  WritebackDestinationType,
} from "./types";

import { ValidationEngine } from "./ValidationEngine";
import { AuditLogger } from "./AuditLogger";
import { SqlServerAdapter } from "./adapters/SqlServerAdapter";

export class WritebackManager implements IWritebackManager {
  private destinations: Map<string, WritebackDestination> = new Map();
  private adapters: Map<WritebackDestinationType, IWritebackAdapter> = new Map();
  private validationEngine: ValidationEngine;
  private auditLogger: AuditLogger;
  private queue: WritebackBatch[] = [];
  private processing: boolean = false;

  constructor() {
    this.validationEngine = new ValidationEngine();
    this.auditLogger = new AuditLogger();

    // Register built-in adapters
    this.registerAdapter(new SqlServerAdapter());
  }

  // Destination Management
  registerDestination(destination: WritebackDestination): void {
    this.destinations.set(destination.id, destination);
  }

  unregisterDestination(destinationId: string): void {
    this.destinations.delete(destinationId);
  }

  getDestinations(): WritebackDestination[] {
    return Array.from(this.destinations.values());
  }

  getDestination(destinationId: string): WritebackDestination | undefined {
    return this.destinations.get(destinationId);
  }

  // Adapter Registration
  registerAdapter(adapter: IWritebackAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(type: WritebackDestinationType): IWritebackAdapter | undefined {
    return this.adapters.get(type);
  }

  // Validation
  setValidationRules(rules: ValidationRule[]): void {
    this.validationEngine.setRules(rules);
  }

  getValidationRules(): ValidationRule[] {
    return this.validationEngine.getRules();
  }

  validateChanges(changes: WritebackChange[]): ValidationResult {
    return this.validationEngine.validateChanges(changes);
  }

  addValidationRule(rule: ValidationRule): void {
    this.validationEngine.addRule(rule);
  }

  removeValidationRule(ruleId: string): void {
    this.validationEngine.removeRule(ruleId);
  }

  // Queue Management
  queueBatch(batch: WritebackBatch): void {
    this.queue.push(batch);
    this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue[0];
      batch.status = "inProgress";

      try {
        const destination = this.destinations.get(batch.destinationId);
        if (!destination) {
          throw new Error(`Destination ${batch.destinationId} not found`);
        }

        const adapter = this.adapters.get(destination.type);
        if (!adapter) {
          throw new Error(`Adapter for type ${destination.type} not found`);
        }

        // Validate before writeback
        const validation = this.validateChanges(batch.changes);
        if (!validation.valid) {
          this.auditLogger.logValidationFail(batch.user, validation.errors);
          batch.status = "failed";
          batch.errorMessage = "Validation failed";
          continue;
        }

        // Connect if not already connected
        await adapter.connect(destination.config);

        // Write changes
        const result = await adapter.writeChanges(batch);

        if (result.success) {
          batch.status = "completed";
          this.auditLogger.logBatchWriteback(batch.user, batch);
        } else {
          batch.status = "failed";
          batch.errorMessage = result.message;
          batch.retryCount++;

          // Retry logic
          if (batch.retryCount < 3) {
            batch.status = "pending";
            // Move to end of queue for retry
            this.queue.shift();
            this.queue.push(batch);
            continue;
          }
        }
      } catch (error: any) {
        batch.status = "failed";
        batch.errorMessage = error.message;
        batch.retryCount++;

        if (batch.retryCount >= 3) {
          console.error("Batch failed after 3 retries:", error);
        }
      }

      // Remove processed batch from queue
      if (this.queue[0] === batch) {
        this.queue.shift();
      }
    }

    this.processing = false;
  }

  getQueueStatus(): BatchQueueStatus {
    const pending = this.queue.filter((b) => b.status === "pending").length;
    const inProgress = this.queue.filter((b) => b.status === "inProgress").length;
    const completed = this.queue.filter((b) => b.status === "completed").length;
    const failed = this.queue.filter((b) => b.status === "failed").length;

    return {
      pending,
      inProgress,
      completed,
      failed,
      total: this.queue.length,
    };
  }

  // Audit Logging
  getAuditLog(options?: AuditQueryOptions): Promise<AuditLogEntry[]> {
    return this.auditLogger.queryLogs(options);
  }

  logAudit(entry: AuditLogEntry): Promise<void> {
    return Promise.resolve();
  }

  getAuditStats() {
    return this.auditLogger.getStats();
  }

  exportAuditLog(): string {
    return this.auditLogger.exportToJSON();
  }

  // Convenience Methods
  async writebackToDestination(
    destinationId: string,
    changes: WritebackChange[],
    user: string
  ): Promise<WritebackResult> {
    const batch: WritebackBatch = {
      id: `batch_${Date.now()}_${Date.now().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      user,
      destinationId,
      changes,
      status: "pending",
      retryCount: 0,
    };

    this.queueBatch(batch);
    await this.processQueue();

    // Return result from the batch
    return {
      success: batch.status === "completed",
      message: batch.errorMessage || "Success",
      changesWritten: batch.status === "completed" ? changes.length : 0,
      errors: batch.errorMessage
        ? [{ changeId: "", error: batch.errorMessage, code: "BATCH_ERROR" }]
        : [],
      timestamp: Date.now(),
    };
  }

  async testDestination(destinationId: string): Promise<boolean> {
    const destination = this.destinations.get(destinationId);
    if (!destination) {
      throw new Error(`Destination ${destinationId} not found`);
    }

    const adapter = this.adapters.get(destination.type);
    if (!adapter) {
      throw new Error(`Adapter for type ${destination.type} not found`);
    }

    const result = await adapter.testConnection(destination.config);
    return result.success;
  }

  // Preset configurations
  createSqlServerDestination(
    name: string,
    config: {
      server: string;
      database: string;
      table: string;
      username?: string;
      password?: string;
      useWindowsAuth?: boolean;
    }
  ): WritebackDestination {
    return {
      id: `sql_${Date.now()}`,
      name,
      type: "sqlServer",
      config,
      enabled: true,
    };
  }

  createWebhookDestination(
    name: string,
    config: {
      endpointUrl: string;
      method?: "POST" | "PUT" | "PATCH";
      headers?: Record<string, string>;
      authType?: "none" | "bearer" | "apiKey";
      apiKey?: string;
      bearerToken?: string;
    }
  ): WritebackDestination {
    return {
      id: `webhook_${Date.now()}`,
      name,
      type: "webhook",
      config,
      enabled: true,
    };
  }
}

// Singleton instance
let writebackManagerInstance: WritebackManager | null = null;

export function getWritebackManager(): WritebackManager {
  if (!writebackManagerInstance) {
    writebackManagerInstance = new WritebackManager();
  }
  return writebackManagerInstance;
}

export function resetWritebackManager(): void {
  writebackManagerInstance = null;
}
