/**
 * Power Automate Connector
 * Integration with Microsoft Power Platform for workflow automation
 */

import { WritebackChange, WritebackBatch } from "../writeback/types";
import { Comment } from "../comments/commentSystem";
import { ApprovalWorkflow } from "../workflow/approvalWorkflow";

export interface PowerAutomateConfig {
  webhookUrl: string;
  apiKey?: string;
  enabledEvents: PowerAutomateEvent[];
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

export type PowerAutomateEvent =
  | "cellEdit"
  | "batchWriteback"
  | "commentAdded"
  | "workflowSubmitted"
  | "workflowApproved"
  | "workflowRejected"
  | "scenarioChanged"
  | "exportRequested"
  | "thresholdExceeded";

export interface PowerAutomatePayload {
  eventType: PowerAutomateEvent;
  timestamp: number;
  source: "matrixpro";
  tenantId?: string;
  userId: string;
  userEmail: string;
  data: EventData;
}

type EventData =
  | CellEditEventData
  | BatchWritebackEventData
  | CommentEventData
  | WorkflowEventData
  | ScenarioEventData
  | ExportEventData
  | ThresholdEventData
  | TestEventData;

interface TestEventData {
  test: boolean;
}

interface CellEditEventData {
  rowKey: string;
  colKey: string;
  measureIndex: number;
  oldValue: number | null;
  newValue: number | null;
  variance: number | null;
  formula?: string;
}

interface BatchWritebackEventData {
  batchId: string;
  changeCount: number;
  destination: string;
  changes: WritebackChange[];
}

interface CommentEventData {
  commentId: string;
  cellKey: string;
  content: string;
  mentions: string[];
  isReply: boolean;
  parentId?: string;
}

interface WorkflowEventData {
  workflowId: string;
  workflowName: string;
  scenarioId: string;
  status: string;
  stepId?: string;
  approverId?: string;
  comment?: string;
}

interface ScenarioEventData {
  scenarioId: string;
  scenarioName: string;
  action: "created" | "switched" | "deleted" | "modified";
}

interface ExportEventData {
  format: "csv" | "excel" | "pdf";
  rowCount: number;
  fileName: string;
}

interface ThresholdEventData {
  measureName: string;
  thresholdType: "upper" | "lower";
  thresholdValue: number;
  actualValue: number;
  variance: number;
  cellKey: string;
}

export class PowerAutomateConnector {
  private config: PowerAutomateConfig;
  private eventQueue: PowerAutomatePayload[] = [];
  private isProcessing: boolean = false;

  constructor(config: PowerAutomateConfig) {
    this.config = {
      ...config,
      retryPolicy: config.retryPolicy || {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      },
    };
  }

  // Event emitters
  emitCellEdit(userId: string, userEmail: string, change: WritebackChange): void {
    this.queueEvent("cellEdit", userId, userEmail, {
      rowKey: change.rowKey,
      colKey: change.colKey,
      measureIndex: change.measureIndex,
      oldValue: change.oldValue,
      newValue: change.newValue,
      variance: change.newValue !== null && change.oldValue !== null
        ? change.newValue - change.oldValue
        : null,
      formula: change.formula,
    });
  }

  emitBatchWriteback(userId: string, userEmail: string, batch: WritebackBatch): void {
    this.queueEvent("batchWriteback", userId, userEmail, {
      batchId: batch.id,
      changeCount: batch.changes.length,
      destination: batch.destinationId,
      changes: batch.changes,
    });
  }

  emitCommentAdded(userId: string, userEmail: string, comment: Comment): void {
    this.queueEvent("commentAdded", userId, userEmail, {
      commentId: comment.id,
      cellKey: comment.cellKey,
      content: comment.content,
      mentions: comment.mentions,
      isReply: comment.parentId !== null,
      parentId: comment.parentId || undefined,
    });
  }

  emitWorkflowEvent(
    userId: string,
    userEmail: string,
    workflow: ApprovalWorkflow,
    action: "submitted" | "approved" | "rejected",
    stepId?: string,
    approverId?: string,
    comment?: string
  ): void {
    const eventType: PowerAutomateEvent =
      action === "submitted" ? "workflowSubmitted" :
      action === "approved" ? "workflowApproved" : "workflowRejected";

    this.queueEvent(eventType, userId, userEmail, {
      workflowId: workflow.id,
      workflowName: workflow.name,
      scenarioId: workflow.scenarioId,
      status: workflow.status,
      stepId,
      approverId,
      comment,
    });
  }

  emitScenarioChanged(
    userId: string,
    userEmail: string,
    scenarioId: string,
    scenarioName: string,
    action: "created" | "switched" | "deleted" | "modified"
  ): void {
    this.queueEvent("scenarioChanged", userId, userEmail, {
      scenarioId,
      scenarioName,
      action,
    });
  }

  emitExportRequested(
    userId: string,
    userEmail: string,
    format: "csv" | "excel" | "pdf",
    rowCount: number,
    fileName: string
  ): void {
    this.queueEvent("exportRequested", userId, userEmail, {
      format,
      rowCount,
      fileName,
    });
  }

  emitThresholdExceeded(
    userId: string,
    userEmail: string,
    measureName: string,
    thresholdType: "upper" | "lower",
    thresholdValue: number,
    actualValue: number,
    cellKey: string
  ): void {
    this.queueEvent("thresholdExceeded", userId, userEmail, {
      measureName,
      thresholdType,
      thresholdValue,
      actualValue,
      variance: actualValue - thresholdValue,
      cellKey,
    });
  }

  // Queue and process events
  private queueEvent(
    eventType: PowerAutomateEvent,
    userId: string,
    userEmail: string,
    data: EventData
  ): void {
    if (!this.config.enabledEvents.includes(eventType)) return;

    const payload: PowerAutomatePayload = {
      eventType,
      timestamp: Date.now(),
      source: "matrixpro",
      userId,
      userEmail,
      data,
    };

    this.eventQueue.push(payload);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const payload = this.eventQueue.shift();
      if (!payload) continue;

      await this.sendWithRetry(payload, 0);
    }

    this.isProcessing = false;
  }

  private async sendWithRetry(payload: PowerAutomatePayload, attempt: number): Promise<void> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { "X-API-Key": this.config.apiKey }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to send Power Automate event (attempt ${attempt + 1}):`, error);

      if (attempt < this.config.retryPolicy.maxRetries) {
        const delay = this.config.retryPolicy.initialDelayMs *
          Math.pow(this.config.retryPolicy.backoffMultiplier, attempt);

        await new Promise(resolve => setTimeout(resolve, delay));
        await this.sendWithRetry(payload, attempt + 1);
      } else {
        console.error("Max retries exceeded for Power Automate event:", payload);
      }
    }
  }

  // Configuration
  updateConfig(config: Partial<PowerAutomateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enableEvent(event: PowerAutomateEvent): void {
    if (!this.config.enabledEvents.includes(event)) {
      this.config.enabledEvents.push(event);
    }
  }

  disableEvent(event: PowerAutomateEvent): void {
    this.config.enabledEvents = this.config.enabledEvents.filter(e => e !== event);
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testPayload: PowerAutomatePayload = {
        eventType: "cellEdit",
        timestamp: Date.now(),
        source: "matrixpro",
        userId: "test",
        userEmail: "test@example.com",
        data: { test: true },
      };

      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { "X-API-Key": this.config.apiKey }),
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        return { success: true, message: "Connection successful" };
      } else {
        return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// Teams Adaptive Card generator
export class TeamsAdaptiveCards {
  static createApprovalCard(workflow: ApprovalWorkflow, stepName: string): any {
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "Approval Request",
          weight: "bolder",
          size: "large",
        },
        {
          type: "TextBlock",
          text: workflow.name,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            { title: "Submitted by:", value: workflow.submittedBy.name },
            { title: "Changes:", value: workflow.changes.length.toString() },
            { title: "Current step:", value: stepName },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Approve",
          data: { action: "approve", workflowId: workflow.id },
          style: "positive",
        },
        {
          type: "Action.Submit",
          title: "Reject",
          data: { action: "reject", workflowId: workflow.id },
          style: "destructive",
        },
        {
          type: "Action.OpenUrl",
          title: "View Details",
          url: `https://matrixpro.app/workflows/${workflow.id}`,
        },
      ],
    };
  }

  static createThresholdAlertCard(
    measureName: string,
    thresholdValue: number,
    actualValue: number,
    variance: number
  ): any {
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "⚠️ Threshold Exceeded",
          weight: "bolder",
          size: "large",
          color: "warning",
        },
        {
          type: "TextBlock",
          text: `${measureName} has exceeded the threshold.`,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            { title: "Threshold:", value: thresholdValue.toLocaleString() },
            { title: "Actual:", value: actualValue.toLocaleString() },
            { title: "Variance:", value: `${variance > 0 ? "+" : ""}${variance.toLocaleString()}` },
          ],
        },
      ],
    };
  }

  static createCommentCard(comment: Comment, author: string): any {
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "💬 New Comment",
          weight: "bolder",
        },
        {
          type: "TextBlock",
          text: `${author} commented:`,
          weight: "bolder",
        },
        {
          type: "TextBlock",
          text: comment.content,
          wrap: true,
        },
        {
          type: "TextBlock",
          text: new Date(comment.createdAt).toLocaleString(),
          size: "small",
          isSubtle: true,
        },
      ],
    };
  }
}

// Singleton
let connectorInstance: PowerAutomateConnector | null = null;

export function initializePowerAutomate(config: PowerAutomateConfig): PowerAutomateConnector {
  connectorInstance = new PowerAutomateConnector(config);
  return connectorInstance;
}

export function getPowerAutomateConnector(): PowerAutomateConnector | null {
  return connectorInstance;
}
