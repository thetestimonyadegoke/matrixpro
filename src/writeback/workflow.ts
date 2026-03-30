/**
 * Workflow Management System
 * Submit/Approve/Lock workflow for planning and budgeting
 */

import { CellOverride, OverrideStatus } from "./cellOverrides";
import { AuditLogStore, getAuditLog } from "./auditLog";

export type WorkflowRole = "viewer" | "editor" | "approver" | "admin";

export interface WorkflowUser {
  id: string;
  name: string;
  email: string;
  role: WorkflowRole;
}

export interface WorkflowConfig {
  enabled: boolean;
  requireApproval: boolean;
  autoLockOnApproval: boolean;
  allowBulkSubmit: boolean;
  notifyOnSubmit: boolean;
  notifyOnApprove: boolean;
  approvers: string[];
}

export const defaultWorkflowConfig: WorkflowConfig = {
  enabled: false,
  requireApproval: true,
  autoLockOnApproval: false,
  allowBulkSubmit: true,
  notifyOnSubmit: false,
  notifyOnApprove: false,
  approvers: [],
};

/**
 * Check if user can perform action based on role
 */
export function canPerformAction(
  role: WorkflowRole,
  action: "edit" | "submit" | "approve" | "reject" | "lock" | "unlock"
): boolean {
  switch (action) {
    case "edit":
      return role === "editor" || role === "approver" || role === "admin";
    case "submit":
      return role === "editor" || role === "approver" || role === "admin";
    case "approve":
    case "reject":
      return role === "approver" || role === "admin";
    case "lock":
    case "unlock":
      return role === "admin";
    default:
      return false;
  }
}

/**
 * Submit overrides for approval
 */
export function submitOverrides(
  overrides: CellOverride[],
  user: WorkflowUser,
  auditLog: AuditLogStore = getAuditLog()
): CellOverride[] {
  if (!canPerformAction(user.role, "submit")) {
    throw new Error("User does not have permission to submit");
  }

  const now = Date.now();
  const updated: CellOverride[] = [];

  for (const override of overrides) {
    if (override.status !== "draft") continue;

    const newOverride: CellOverride = {
      ...override,
      status: "submitted",
      updatedBy: user.id,
      updatedAt: now,
    };

    updated.push(newOverride);

    auditLog.log(
      user.id,
      user.name,
      "cell",
      `${override.rowKey}|${override.colKey}|${override.measureKey}`,
      "submit",
      override.overrideValue,
      override.overrideValue,
      "Submitted for approval"
    );
  }

  return updated;
}

/**
 * Approve overrides
 */
export function approveOverrides(
  overrides: CellOverride[],
  user: WorkflowUser,
  config: WorkflowConfig,
  auditLog: AuditLogStore = getAuditLog()
): CellOverride[] {
  if (!canPerformAction(user.role, "approve")) {
    throw new Error("User does not have permission to approve");
  }

  const now = Date.now();
  const updated: CellOverride[] = [];

  for (const override of overrides) {
    if (override.status !== "submitted") continue;

    const newStatus: OverrideStatus = config.autoLockOnApproval ? "locked" : "approved";

    const newOverride: CellOverride = {
      ...override,
      status: newStatus,
      updatedBy: user.id,
      updatedAt: now,
    };

    updated.push(newOverride);

    auditLog.log(
      user.id,
      user.name,
      "cell",
      `${override.rowKey}|${override.colKey}|${override.measureKey}`,
      "approve",
      override.status,
      newStatus,
      "Approved"
    );
  }

  return updated;
}

/**
 * Reject overrides
 */
export function rejectOverrides(
  overrides: CellOverride[],
  user: WorkflowUser,
  reason: string,
  auditLog: AuditLogStore = getAuditLog()
): CellOverride[] {
  if (!canPerformAction(user.role, "reject")) {
    throw new Error("User does not have permission to reject");
  }

  const now = Date.now();
  const updated: CellOverride[] = [];

  for (const override of overrides) {
    if (override.status !== "submitted") continue;

    const newOverride: CellOverride = {
      ...override,
      status: "rejected",
      note: reason,
      updatedBy: user.id,
      updatedAt: now,
    };

    updated.push(newOverride);

    auditLog.log(
      user.id,
      user.name,
      "cell",
      `${override.rowKey}|${override.colKey}|${override.measureKey}`,
      "reject",
      override.status,
      "rejected",
      reason
    );
  }

  return updated;
}

/**
 * Lock overrides (prevent further changes)
 */
export function lockOverrides(
  overrides: CellOverride[],
  user: WorkflowUser,
  auditLog: AuditLogStore = getAuditLog()
): CellOverride[] {
  if (!canPerformAction(user.role, "lock")) {
    throw new Error("User does not have permission to lock");
  }

  const now = Date.now();
  const updated: CellOverride[] = [];

  for (const override of overrides) {
    if (override.status === "locked") continue;

    const newOverride: CellOverride = {
      ...override,
      status: "locked",
      updatedBy: user.id,
      updatedAt: now,
    };

    updated.push(newOverride);

    auditLog.log(
      user.id,
      user.name,
      "cell",
      `${override.rowKey}|${override.colKey}|${override.measureKey}`,
      "lock",
      override.status,
      "locked",
      "Locked"
    );
  }

  return updated;
}

/**
 * Unlock overrides
 */
export function unlockOverrides(
  overrides: CellOverride[],
  user: WorkflowUser,
  auditLog: AuditLogStore = getAuditLog()
): CellOverride[] {
  if (!canPerformAction(user.role, "unlock")) {
    throw new Error("User does not have permission to unlock");
  }

  const now = Date.now();
  const updated: CellOverride[] = [];

  for (const override of overrides) {
    if (override.status !== "locked") continue;

    const newOverride: CellOverride = {
      ...override,
      status: "approved",
      updatedBy: user.id,
      updatedAt: now,
    };

    updated.push(newOverride);

    auditLog.log(
      user.id,
      user.name,
      "cell",
      `${override.rowKey}|${override.colKey}|${override.measureKey}`,
      "unlock",
      "locked",
      "approved",
      "Unlocked"
    );
  }

  return updated;
}

/**
 * Get workflow status summary
 */
export interface WorkflowStatusSummary {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  locked: number;
  total: number;
}

export function getWorkflowStatusSummary(overrides: CellOverride[]): WorkflowStatusSummary {
  const summary: WorkflowStatusSummary = {
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    locked: 0,
    total: overrides.length,
  };

  for (const override of overrides) {
    summary[override.status]++;
  }

  return summary;
}

/**
 * Check if all overrides are in a specific status
 */
export function allInStatus(overrides: CellOverride[], status: OverrideStatus): boolean {
  return overrides.every(o => o.status === status);
}

/**
 * Get overrides pending approval
 */
export function getPendingApproval(overrides: CellOverride[]): CellOverride[] {
  return overrides.filter(o => o.status === "submitted");
}

/**
 * Get overrides that were rejected
 */
export function getRejected(overrides: CellOverride[]): CellOverride[] {
  return overrides.filter(o => o.status === "rejected");
}
