/**
 * SQL Server Writeback Adapter
 * Supports SQL Server and Azure SQL Database
 */

import { BaseWritebackAdapter } from "../BaseAdapter";
import {
  WritebackConfig,
  WritebackBatch,
  WritebackResult,
  WritebackDestinationType,
  ConnectionTestResult,
  TableSchema,
  ColumnSchema,
  WritebackChange,
  WritebackError,
  ValidationError,
} from "../types";

export class SqlServerAdapter extends BaseWritebackAdapter {
  readonly type: WritebackDestinationType = "sqlServer";
  private connection: any = null;

  async connect(config: WritebackConfig): Promise<boolean> {
    try {
      // In a real implementation, this would use mssql or similar library
      // For now, we simulate the connection
      this.config = config;
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to SQL Server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connection = null;
    this.config = null;
  }

  async testConnection(config: WritebackConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Simulate connection test
      // In real implementation: await sql.connect(connectionString);

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `Successfully connected to ${config.server}/${config.database}`,
        latency,
        serverVersion: "15.0.2000.5", // Simulated version
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latency: Date.now() - startTime,
      };
    }
  }

  async writeChanges(batch: WritebackBatch): Promise<WritebackResult> {
    if (!this.connected || !this.config) {
      return this.createErrorResult("Not connected to database");
    }

    const errors: WritebackError[] = [];
    let changesWritten = 0;

    try {
      // Group changes by row for efficient batching
      const changesByRow = this.groupChangesByRow(batch.changes);

      for (const [rowKey, changes] of changesByRow) {
        try {
          await this.writeRowChanges(rowKey, changes);
          changesWritten += changes.length;
        } catch (error: any) {
          for (const change of changes) {
            errors.push({
              changeId: change.id,
              error: error.message,
              code: "WRITE_ERROR",
            });
          }
        }
      }

      return this.createSuccessResult(changesWritten, errors);
    } catch (error: any) {
      return this.createErrorResult("Write operation failed", error);
    }
  }

  async getSchema(config: WritebackConfig): Promise<TableSchema> {
    // In real implementation, query INFORMATION_SCHEMA.COLUMNS
    // For now, return a simulated schema based on config

    return {
      columns: [
        { name: "RowKey", dataType: "nvarchar", nullable: false, maxLength: 500 },
        { name: "ColKey", dataType: "nvarchar", nullable: false, maxLength: 500 },
        { name: "MeasureIndex", dataType: "int", nullable: false },
        { name: "MeasureName", dataType: "nvarchar", nullable: true, maxLength: 100 },
        { name: "Value", dataType: "float", nullable: true },
        { name: "OldValue", dataType: "float", nullable: true },
        { name: "Timestamp", dataType: "datetime2", nullable: false },
        { name: "UserName", dataType: "nvarchar", nullable: true, maxLength: 100 },
        { name: "Formula", dataType: "nvarchar", nullable: true, maxLength: 2000 },
      ],
      primaryKeys: ["RowKey", "ColKey", "MeasureIndex"],
    };
  }

  protected getRequiredFields(): string[] {
    return ["server", "database", "table"];
  }

  protected validateTypeSpecificConfig(
    config: WritebackConfig,
    errors: ValidationError[]
  ): void {
    // Validate authentication method
    if (!config.useWindowsAuth) {
      if (!config.username) {
        errors.push({
          changeId: "",
          ruleId: "auth",
          message: "Username is required when not using Windows Authentication",
          severity: "error",
        });
      }
      if (!config.password) {
        errors.push({
          changeId: "",
          ruleId: "auth",
          message: "Password is required when not using Windows Authentication",
          severity: "error",
        });
      }
    }

    // Validate table name format
    if (config.table && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.table)) {
      errors.push({
        changeId: "",
        ruleId: "tableName",
        message: "Table name contains invalid characters",
        severity: "error",
      });
    }
  }

  private groupChangesByRow(
    changes: WritebackChange[]
  ): Map<string, WritebackChange[]> {
    const groups = new Map<string, WritebackChange[]>();

    for (const change of changes) {
      const key = change.rowKey;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(change);
    }

    return groups;
  }

  private async writeRowChanges(
    rowKey: string,
    changes: WritebackChange[]
  ): Promise<void> {
    if (!this.config) throw new Error("Not configured");

    const table = this.config.table;
    const schema = this.config.schema || "dbo";
    const fullTableName = `${schema}.${table}`;

    // Build MERGE statement for atomic update
    // This handles both INSERT (new row) and UPDATE (existing row)
    const mergeStatements = changes.map((change) => {
      const setClause = `Value = ${this.formatValue(change.newValue)},
                         OldValue = ${this.formatValue(change.oldValue)},
                         Timestamp = GETDATE(),
                         UserName = '${this.escapeSqlString(change.user)}',
                         Formula = ${change.formula ? `'${this.escapeSqlString(change.formula)}'` : "NULL"}`;

      const insertColumns = `RowKey, ColKey, MeasureIndex, MeasureName, Value, OldValue, Timestamp, UserName, Formula`;
      const insertValues = `'${this.escapeSqlString(change.rowKey)}',
                            '${this.escapeSqlString(change.colKey)}',
                            ${change.measureIndex},
                            '${this.escapeSqlString(change.measureName)}',
                            ${this.formatValue(change.newValue)},
                            ${this.formatValue(change.oldValue)},
                            GETDATE(),
                            '${this.escapeSqlString(change.user)}',
                            ${change.formula ? `'${this.escapeSqlString(change.formula)}'` : "NULL"}`;

      return `
        MERGE ${fullTableName} AS target
        USING (SELECT '${this.escapeSqlString(change.rowKey)}' AS RowKey,
                      '${this.escapeSqlString(change.colKey)}' AS ColKey,
                      ${change.measureIndex} AS MeasureIndex) AS source
        ON target.RowKey = source.RowKey
           AND target.ColKey = source.ColKey
           AND target.MeasureIndex = source.MeasureIndex
        WHEN MATCHED THEN
          UPDATE SET ${setClause}
        WHEN NOT MATCHED THEN
          INSERT (${insertColumns})
          VALUES (${insertValues});
      `;
    });

    // In real implementation, execute within a transaction
    // await sql.query(mergeStatements.join(";"));

    // Simulate execution
    console.log("Executing SQL statements:", mergeStatements);
  }

  private buildConnectionString(config: WritebackConfig): string {
    if (config.connectionString) {
      return config.connectionString;
    }

    let connStr = `Server=${config.server};Database=${config.database};`;

    if (config.useWindowsAuth) {
      connStr += "Trusted_Connection=true;";
    } else {
      connStr += `User Id=${config.username};Password=${config.password};`;
    }

    connStr += "Encrypt=true;TrustServerCertificate=false;";

    return connStr;
  }
}
