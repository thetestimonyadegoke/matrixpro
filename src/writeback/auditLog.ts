/**
 * Audit Log System
 * Tracks all changes for compliance and traceability
 */

export type AuditAction = 
  | "create"
  | "update"
  | "delete"
  | "submit"
  | "approve"
  | "reject"
  | "lock"
  | "unlock"
  | "move"
  | "revert";

export type AuditEntityType = 
  | "cell"
  | "row"
  | "measure"
  | "theme"
  | "scenario"
  | "config";

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  entityType: AuditEntityType;
  entityKey: string;
  action: AuditAction;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown>;
  comment: string;
}

/**
 * Generate a unique audit entry ID
 */
function generateAuditId(): string {
  const randomBytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 4; i++) {
      randomBytes[i] = (Date.now() + i * 17) % 256;
    }
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `audit_${Date.now()}_${hex}`;
}

/**
 * In-memory audit log store
 */
export class AuditLogStore {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 10000;
  private listeners: Array<() => void> = [];

  public log(
    userId: string,
    userName: string,
    entityType: AuditEntityType,
    entityKey: string,
    action: AuditAction,
    oldValue: unknown,
    newValue: unknown,
    comment: string = "",
    metadata: Record<string, unknown> = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      id: generateAuditId(),
      timestamp: Date.now(),
      userId,
      userName,
      entityType,
      entityKey,
      action,
      oldValue: oldValue !== null ? JSON.stringify(oldValue) : null,
      newValue: newValue !== null ? JSON.stringify(newValue) : null,
      metadata,
      comment,
    };

    this.entries.push(entry);

    // Trim if exceeds max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    this.notifyListeners();
    return entry;
  }

  public getAll(): AuditEntry[] {
    return [...this.entries];
  }

  public getByEntity(entityType: AuditEntityType, entityKey: string): AuditEntry[] {
    return this.entries.filter(
      e => e.entityType === entityType && e.entityKey === entityKey
    );
  }

  public getByUser(userId: string): AuditEntry[] {
    return this.entries.filter(e => e.userId === userId);
  }

  public getByDateRange(startTime: number, endTime: number): AuditEntry[] {
    return this.entries.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  public getByAction(action: AuditAction): AuditEntry[] {
    return this.entries.filter(e => e.action === action);
  }

  public getRecent(count: number): AuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  public clear(): void {
    this.entries = [];
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  public toJSON(): string {
    return JSON.stringify(this.entries);
  }

  public fromJSON(json: string): void {
    try {
      this.entries = JSON.parse(json) as AuditEntry[];
      this.notifyListeners();
    } catch {
      console.error("Failed to parse audit log data");
    }
  }
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditEntry): string {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleString();
  
  let description = "";
  switch (entry.action) {
    case "create":
      description = `created ${entry.entityType}`;
      break;
    case "update":
      description = `updated ${entry.entityType}`;
      break;
    case "delete":
      description = `deleted ${entry.entityType}`;
      break;
    case "submit":
      description = `submitted ${entry.entityType} for approval`;
      break;
    case "approve":
      description = `approved ${entry.entityType}`;
      break;
    case "reject":
      description = `rejected ${entry.entityType}`;
      break;
    case "lock":
      description = `locked ${entry.entityType}`;
      break;
    case "unlock":
      description = `unlocked ${entry.entityType}`;
      break;
    case "move":
      description = `moved ${entry.entityType}`;
      break;
    case "revert":
      description = `reverted ${entry.entityType}`;
      break;
  }

  return `[${dateStr}] ${entry.userName} ${description}: ${entry.entityKey}`;
}

/**
 * Create a singleton audit log instance
 */
let globalAuditLog: AuditLogStore | null = null;

export function getAuditLog(): AuditLogStore {
  if (!globalAuditLog) {
    globalAuditLog = new AuditLogStore();
  }
  return globalAuditLog;
}
