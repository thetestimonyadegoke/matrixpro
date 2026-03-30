/**
 * Approval Workflow System
 * Submit, review, approve, and reject workflows with chains
 */

export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "underReview"
  | "approved"
  | "rejected"
  | "escalated"
  | "cancelled";

export type ApproverRole = "owner" | "manager" | "director" | "admin" | "custom";

export interface Approver {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: ApproverRole;
  order: number;
  isOptional: boolean;
  approvedAt?: number;
  rejectedAt?: number;
  comments?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  approvers: Approver[];
  status: "pending" | "active" | "completed" | "skipped";
  minApprovalsRequired: number; // 1 for single, >1 for consensus
  allowDelegation: boolean;
  dueDate?: number;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  scenarioId: string;
  submittedBy: UserInfo;
  submittedAt: number;
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: WorkflowStatus;
  changes: WorkflowChange[];
  comments: WorkflowComment[];
  history: WorkflowHistoryEntry[];
  autoApproveThreshold?: number; // variance threshold for auto-approval
  notifyOnStatusChange: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

export interface WorkflowChange {
  id: string;
  cellKey: string;
  rowLabel: string;
  colLabel: string;
  measureName: string;
  oldValue: number | null;
  newValue: number | null;
  variance: number | null;
  variancePercent: number | null;
}

export interface WorkflowComment {
  id: string;
  stepId: string;
  author: UserInfo;
  content: string;
  timestamp: number;
  isInternal: boolean; // internal notes vs visible to submitter
}

export interface WorkflowHistoryEntry {
  timestamp: number;
  user: UserInfo;
  action: WorkflowAction;
  details: string;
  stepId?: string;
}

export type WorkflowAction =
  | "created"
  | "submitted"
  | "approved"
  | "rejected"
  | "escalated"
  | "delegated"
  | "cancelled"
  | "commented"
  | "reminderSent"
  | "autoApproved";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<WorkflowStep, "status">[];
  autoApproveThreshold?: number;
  isDefault: boolean;
}

// Default workflow templates
export const defaultWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: "template_single_approver",
    name: "Single Approver",
    description: "Simple approval by one manager",
    steps: [
      {
        id: "step_1",
        order: 1,
        name: "Manager Review",
        approvers: [], // to be filled
        minApprovalsRequired: 1,
        allowDelegation: true,
      },
    ],
    isDefault: true,
  },
  {
    id: "template_manager_director",
    name: "Manager + Director",
    description: "Two-level approval for significant changes",
    steps: [
      {
        id: "step_1",
        order: 1,
        name: "Manager Review",
        approvers: [],
        minApprovalsRequired: 1,
        allowDelegation: true,
      },
      {
        id: "step_2",
        order: 2,
        name: "Director Approval",
        approvers: [],
        minApprovalsRequired: 1,
        allowDelegation: false,
      },
    ],
    isDefault: false,
  },
  {
    id: "template_budget_committee",
    name: "Budget Committee",
    description: "Consensus-based approval for budget scenarios",
    steps: [
      {
        id: "step_1",
        order: 1,
        name: "Committee Review",
        approvers: [],
        minApprovalsRequired: 2, // at least 2 approvals
        allowDelegation: false,
      },
    ],
    autoApproveThreshold: 5, // auto-approve if variance < 5%
    isDefault: false,
  },
];

// Workflow engine
export class WorkflowEngine {
  private workflows: Map<string, ApprovalWorkflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor() {
    // Load default templates
    for (const template of defaultWorkflowTemplates) {
      this.templates.set(template.id, template);
    }
  }

  // Create workflow from template
  createWorkflow(
    templateId: string,
    name: string,
    scenarioId: string,
    submitter: UserInfo,
    changes: WorkflowChange[],
    approvers: Map<string, UserInfo[]> // stepId -> users
  ): ApprovalWorkflow | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const workflowId = `wf_${Date.now()}_${Date.now().toString(36).substr(2, 9)}`;

    const steps: WorkflowStep[] = template.steps.map((step) => ({
      ...step,
      id: `step_${Date.now()}_${step.order}`,
      status: step.order === 1 ? "active" : "pending",
      approvers:
        approvers.get(step.id)?.map((user, idx) => ({
          id: `approver_${Date.now()}_${idx}`,
          userId: user.id,
          userName: user.name,
          email: user.email,
          role: user.role as ApproverRole,
          order: idx,
          isOptional: false,
        })) || [],
    }));

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      name,
      description: template.description,
      scenarioId,
      submittedBy: submitter,
      submittedAt: Date.now(),
      steps,
      currentStepIndex: 0,
      status: "submitted",
      changes,
      comments: [],
      history: [
        {
          timestamp: Date.now(),
          user: submitter,
          action: "submitted",
          details: `Workflow submitted for ${changes.length} changes`,
        },
      ],
      autoApproveThreshold: template.autoApproveThreshold,
      notifyOnStatusChange: true,
    };

    // Check auto-approval
    if (this.shouldAutoApprove(workflow)) {
      this.autoApprove(workflow, submitter);
    }

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  // Get workflow
  getWorkflow(workflowId: string): ApprovalWorkflow | null {
    return this.workflows.get(workflowId) || null;
  }

  // Approve step
  approveStep(
    workflowId: string,
    stepId: string,
    approverId: string,
    user: UserInfo,
    comments?: string
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "active") return false;

    const approver = step.approvers.find((a) => a.userId === approverId);
    if (!approver) return false;

    // Record approval
    approver.approvedAt = Date.now();
    approver.comments = comments;

    // Add to history
    workflow.history.push({
      timestamp: Date.now(),
      user,
      action: "approved",
      details: comments || "Approved",
      stepId,
    });

    // Check if step is complete
    const approvalCount = step.approvers.filter((a) => a.approvedAt).length;
    if (approvalCount >= step.minApprovalsRequired) {
      step.status = "completed";

      // Move to next step or complete workflow
      if (workflow.currentStepIndex < workflow.steps.length - 1) {
        workflow.currentStepIndex++;
        workflow.steps[workflow.currentStepIndex].status = "active";
        workflow.status = "underReview";
      } else {
        // All steps complete
        workflow.status = "approved";
        workflow.history.push({
          timestamp: Date.now(),
          user: { id: "system", name: "System", email: "", role: "system" },
          action: "approved",
          details: "Workflow fully approved",
        });
      }
    }

    return true;
  }

  // Reject step
  rejectStep(
    workflowId: string,
    stepId: string,
    approverId: string,
    user: UserInfo,
    reason: string
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step || step.status !== "active") return false;

    const approver = step.approvers.find((a) => a.userId === approverId);
    if (!approver) return false;

    // Record rejection
    approver.rejectedAt = Date.now();
    approver.comments = reason;
    step.status = "completed";
    workflow.status = "rejected";

    // Add to history
    workflow.history.push({
      timestamp: Date.now(),
      user,
      action: "rejected",
      details: reason,
      stepId,
    });

    return true;
  }

  // Escalate workflow
  escalateWorkflow(workflowId: string, user: UserInfo, reason: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = "escalated";
    workflow.history.push({
      timestamp: Date.now(),
      user,
      action: "escalated",
      details: reason,
    });

    return true;
  }

  // Cancel workflow
  cancelWorkflow(workflowId: string, user: UserInfo, reason: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status === "approved" || workflow.status === "rejected") {
      return false;
    }

    workflow.status = "cancelled";
    workflow.history.push({
      timestamp: Date.now(),
      user,
      action: "cancelled",
      details: reason,
    });

    return true;
  }

  // Add comment
  addComment(
    workflowId: string,
    stepId: string,
    user: UserInfo,
    content: string,
    isInternal: boolean = false
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.comments.push({
      id: `comment_${Date.now()}`,
      stepId,
      author: user,
      content,
      timestamp: Date.now(),
      isInternal,
    });

    workflow.history.push({
      timestamp: Date.now(),
      user,
      action: "commented",
      details: isInternal ? "Internal comment added" : "Comment added",
      stepId,
    });

    return true;
  }

  // Get workflows for user
  getWorkflowsForUser(userId: string, role?: ApproverRole): ApprovalWorkflow[] {
    const results: ApprovalWorkflow[] = [];

    for (const workflow of this.workflows.values()) {
      // User is submitter
      if (workflow.submittedBy.id === userId) {
        results.push(workflow);
        continue;
      }

      // User is approver
      for (const step of workflow.steps) {
        for (const approver of step.approvers) {
          if (approver.userId === userId) {
            if (!role || approver.role === role) {
              results.push(workflow);
            }
            break;
          }
        }
      }
    }

    return results.sort((a, b) => b.submittedAt - a.submittedAt);
  }

  // Get pending approvals for user
  getPendingApprovals(userId: string): ApprovalWorkflow[] {
    return Array.from(this.workflows.values()).filter((workflow) => {
      if (workflow.status !== "submitted" && workflow.status !== "underReview") {
        return false;
      }

      const currentStep = workflow.steps[workflow.currentStepIndex];
      if (currentStep?.status !== "active") return false;

      return currentStep.approvers.some(
        (a) => a.userId === userId && !a.approvedAt && !a.rejectedAt
      );
    });
  }

  // Get workflow statistics
  getStats(): {
    total: number;
    byStatus: Record<WorkflowStatus, number>;
    avgApprovalTime: number;
    rejectionRate: number;
  } {
    const byStatus: Record<string, number> = {
      draft: 0,
      submitted: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      cancelled: 0,
    };

    let totalApprovalTime = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const workflow of this.workflows.values()) {
      byStatus[workflow.status]++;

      if (workflow.status === "approved") {
        approvedCount++;
        const submitTime = workflow.submittedAt;
        const lastApproval = workflow.steps
          .flatMap((s) => s.approvers)
          .filter((a) => a.approvedAt)
          .pop()?.approvedAt;
        if (lastApproval) {
          totalApprovalTime += lastApproval - submitTime;
        }
      } else if (workflow.status === "rejected") {
        rejectedCount++;
      }
    }

    const total = this.workflows.size;
    return {
      total,
      byStatus: byStatus as Record<WorkflowStatus, number>,
      avgApprovalTime: approvedCount > 0 ? totalApprovalTime / approvedCount : 0,
      rejectionRate: total > 0 ? rejectedCount / total : 0,
    };
  }

  // Private methods
  private shouldAutoApprove(workflow: ApprovalWorkflow): boolean {
    if (!workflow.autoApproveThreshold) return false;

    // Check if all changes are within threshold
    for (const change of workflow.changes) {
      if (change.variancePercent === null) continue;
      if (Math.abs(change.variancePercent) > workflow.autoApproveThreshold) {
        return false;
      }
    }

    return true;
  }

  private autoApprove(workflow: ApprovalWorkflow, user: UserInfo): void {
    workflow.status = "approved";
    workflow.currentStepIndex = workflow.steps.length - 1;

    for (const step of workflow.steps) {
      step.status = "completed";
      for (const approver of step.approvers) {
        approver.approvedAt = Date.now();
      }
    }

    workflow.history.push({
      timestamp: Date.now(),
      user: { id: "system", name: "System", email: "", role: "system" },
      action: "autoApproved",
      details: `Auto-approved: all changes within ${workflow.autoApproveThreshold}% threshold`,
    });
  }
}

// Singleton instance
let workflowEngineInstance: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new WorkflowEngine();
  }
  return workflowEngineInstance;
}

export function resetWorkflowEngine(): void {
  workflowEngineInstance = null;
}
