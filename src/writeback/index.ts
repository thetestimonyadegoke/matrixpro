/**
 * Writeback Module - Index
 * Exports all writeback-related classes and types
 */

// Types
export * from "./types";

// Core classes
export { BaseWritebackAdapter } from "./BaseAdapter";
export { ValidationEngine } from "./ValidationEngine";
export { AuditLogger } from "./AuditLogger";
export { WritebackManager, getWritebackManager, resetWritebackManager } from "./WritebackManager";

// Adapters
export { SqlServerAdapter } from "./adapters/SqlServerAdapter";
