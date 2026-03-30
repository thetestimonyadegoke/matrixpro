/**
 * Base Writeback Adapter
 * Abstract class that all writeback adapters must extend
 */

import {
  IWritebackAdapter,
  WritebackConfig,
  WritebackBatch,
  WritebackResult,
  WritebackDestinationType,
  ConnectionTestResult,
  TableSchema,
  ValidationResult,
  ValidationError,
  WritebackError,
} from "./types";

export abstract class BaseWritebackAdapter implements IWritebackAdapter {
  abstract readonly type: WritebackDestinationType;
  protected connected: boolean = false;
  protected config: WritebackConfig | null = null;

  /**
   * Connect to the destination
   */
  abstract connect(config: WritebackConfig): Promise<boolean>;

  /**
   * Disconnect from the destination
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test connection without establishing persistent connection
   */
  abstract testConnection(config: WritebackConfig): Promise<ConnectionTestResult>;

  /**
   * Write changes to the destination
   */
  abstract writeChanges(batch: WritebackBatch): Promise<WritebackResult>;

  /**
   * Get table/schema information
   */
  abstract getSchema(config: WritebackConfig): Promise<TableSchema>;

  /**
   * Validate configuration
   */
  validateConfig(config: WritebackConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Base validation - ensure required fields are present
    if (!this.validateRequiredFields(config, errors)) {
      return { valid: false, errors, warnings: [] };
    }

    // Type-specific validation
    this.validateTypeSpecificConfig(config, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate required fields based on destination type
   */
  protected validateRequiredFields(
    config: WritebackConfig,
    errors: ValidationError[]
  ): boolean {
    const requiredFields = this.getRequiredFields();

    for (const field of requiredFields) {
      const value = config[field as keyof WritebackConfig];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push({
          changeId: "",
          ruleId: "required",
          message: `Required field '${field}' is missing`,
          severity: "error",
        });
      }
    }

    return errors.length === 0;
  }

  /**
   * Get required fields for this destination type
   */
  protected abstract getRequiredFields(): string[];

  /**
   * Validate type-specific configuration
   */
  protected abstract validateTypeSpecificConfig(
    config: WritebackConfig,
    errors: ValidationError[]
  ): void;

  /**
   * Format a value for SQL/destination
   */
  protected formatValue(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return "NULL";
    }
    return String(value);
  }

  /**
   * Escape SQL string
   */
  protected escapeSqlString(value: string): string {
    return value.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  /**
   * Build UPDATE statement for SQL destinations
   */
  protected buildUpdateStatement(
    table: string,
    column: string,
    value: number | null,
    whereClause: string
  ): string {
    const formattedValue = this.formatValue(value);
    return `UPDATE ${table} SET ${column} = ${formattedValue} WHERE ${whereClause}`;
  }

  /**
   * Build INSERT statement for SQL destinations
   */
  protected buildInsertStatement(
    table: string,
    columns: Record<string, number | null | string>
  ): string {
    const columnNames = Object.keys(columns).join(", ");
    const values = Object.values(columns)
      .map((v) =>
        typeof v === "string" ? `'${this.escapeSqlString(v)}'` : this.formatValue(v)
      )
      .join(", ");

    return `INSERT INTO ${table} (${columnNames}) VALUES (${values})`;
  }

  /**
   * Create error result
   */
  protected createErrorResult(message: string, error?: Error): WritebackResult {
    return {
      success: false,
      message: error ? `${message}: ${error.message}` : message,
      changesWritten: 0,
      errors: [
        {
          changeId: "",
          error: error?.message || message,
          code: "ADAPTER_ERROR",
        },
      ],
      timestamp: Date.now(),
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult(
    changesWritten: number,
    errors: WritebackError[] = []
  ): WritebackResult {
    return {
      success: errors.length === 0,
      message:
        errors.length > 0
          ? `Partial success: ${changesWritten} changes written, ${errors.length} errors`
          : `Successfully wrote ${changesWritten} changes`,
      changesWritten,
      errors,
      timestamp: Date.now(),
    };
  }
}
