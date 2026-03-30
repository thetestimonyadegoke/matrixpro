/**
 * Writeback Destination Framework
 * Core interfaces and types for writeback operations
 */

export interface WritebackDestination {
  id: string;
  name: string;
  type: WritebackDestinationType;
  config: WritebackConfig;
  enabled: boolean;
}

export type WritebackDestinationType =
  | "sqlServer"
  | "azureSql"
  | "sharePoint"
  | "oneDrive"
  | "webhook"
  | "fabricWarehouse"
  | "snowflake"
  | "fabricLakehouse"
  | "dataverse"
  | "restApi";

export interface WritebackConfig {
  // SQL Server / Azure SQL
  server?: string;
  database?: string;
  table?: string;
  schema?: string;
  username?: string;
  password?: string;
  useWindowsAuth?: boolean;
  connectionString?: string;

  // SharePoint / OneDrive
  siteUrl?: string;
  listName?: string;
  filePath?: string;
  folderPath?: string;
  driveId?: string;

  // Webhook / REST API
  endpointUrl?: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  authType?: "none" | "bearer" | "basic" | "apiKey";
  apiKey?: string;
  bearerToken?: string;
  username_basic?: string;
  password_basic?: string;

  // Fabric / Dataverse
  workspaceId?: string;
  lakehouseId?: string;
  warehouseId?: string;
  environmentUrl?: string;
  entityName?: string;

  // Snowflake
  account?: string;
  warehouse?: string;
  role?: string;
}

export interface WritebackChange {
  id: string;
  timestamp: number;
  user: string;
  rowKey: string;
  colKey: string;
  measureIndex: number;
  measureName: string;
  oldValue: number | null;
  newValue: number | null;
  formula?: string;
  rowLabels: string[];
  colLabels: string[];
}

export interface WritebackBatch {
  id: string;
  timestamp: number;
  user: string;
  destinationId: string;
  changes: WritebackChange[];
  status: "pending" | "inProgress" | "completed" | "failed";
  errorMessage?: string;
  retryCount: number;
}

export interface WritebackResult {
  success: boolean;
  message: string;
  changesWritten: number;
  errors: WritebackError[];
  timestamp: number;
}

export interface WritebackError {
  changeId: string;
  error: string;
  code: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationRuleType;
  config: ValidationRuleConfig;
  enabled: boolean;
  errorMessage: string;
}

export type ValidationRuleType =
  | "required"
  | "min"
  | "max"
  | "range"
  | "regex"
  | "custom"
  | "dataType"
  | "unique"
  | "referential";

export interface ValidationRuleConfig {
  min?: number;
  max?: number;
  regex?: string;
  dataType?: "number" | "string" | "date" | "boolean";
  customFormula?: string;
  referentialTable?: string;
  referentialColumn?: string;
  allowedValues?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  changeId: string;
  ruleId: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  changeId: string;
  ruleId: string;
  message: string;
  severity: "warning";
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  user: string;
  action: AuditAction;
  details: AuditActionDetails;
  ipAddress?: string;
  sessionId?: string;
}

export type AuditAction =
  | "cellEdit"
  | "batchWriteback"
  | "scenarioCreate"
  | "scenarioSwitch"
  | "scenarioDelete"
  | "validationFail"
  | "export"
  | "import"
  | "configChange";

export interface AuditActionDetails {
  change?: WritebackChange;
  batch?: WritebackBatch;
  scenarioId?: string;
  scenarioName?: string;
  configKey?: string;
  configOldValue?: string;
  configNewValue?: string;
  exportFormat?: string;
  importFormat?: string;
  validationErrors?: ValidationError[];
}

// Adapter Interface
export interface IWritebackAdapter {
  readonly type: WritebackDestinationType;
  connect(config: WritebackConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  testConnection(config: WritebackConfig): Promise<ConnectionTestResult>;
  writeChanges(batch: WritebackBatch): Promise<WritebackResult>;
  getSchema(config: WritebackConfig): Promise<TableSchema>;
  validateConfig(config: WritebackConfig): ValidationResult;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  serverVersion?: string;
}

export interface TableSchema {
  columns: ColumnSchema[];
  primaryKeys: string[];
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  maxLength?: number;
  isIdentity?: boolean;
}

// Writeback Manager Interface
export interface IWritebackManager {
  registerDestination(destination: WritebackDestination): void;
  unregisterDestination(destinationId: string): void;
  getDestinations(): WritebackDestination[];
  getDestination(destinationId: string): WritebackDestination | undefined;

  setValidationRules(rules: ValidationRule[]): void;
  getValidationRules(): ValidationRule[];
  validateChanges(changes: WritebackChange[]): ValidationResult;

  queueBatch(batch: WritebackBatch): void;
  processQueue(): Promise<void>;
  getQueueStatus(): BatchQueueStatus;

  getAuditLog(options?: AuditQueryOptions): Promise<AuditLogEntry[]>;
  logAudit(entry: AuditLogEntry): Promise<void>;
}

export interface BatchQueueStatus {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  total: number;
}

export interface AuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  user?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}
