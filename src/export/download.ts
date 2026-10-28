import powerbi from "powerbi-visuals-api";

type DownloadService = powerbi.extensibility.IDownloadService;

let activeDownloadService: DownloadService | null = null;

/** Power BI rejects downloads above 30 MB. */
export const MAX_EXPORT_BYTES = 30 * 1024 * 1024;

// powerbi.PrivilegeStatus is a const enum with no runtime object; mirror its values.
const PRIVILEGE_ALLOWED = 0;
const PRIVILEGE_NOT_DECLARED = 1;
const PRIVILEGE_NOT_SUPPORTED = 2;
const PRIVILEGE_DISABLED_BY_ADMIN = 3;

export type ExportBlockReason = "disabledByAdmin" | "notSupported" | "notDeclared" | "tooLarge" | "failed";

export interface ExportOutcome {
  /** False when the user dismissed the host's download confirmation. */
  completed: boolean;
  filename: string;
}

export class ExportDownloadBlockedError extends Error {
  filename: string;
  content: string;
  mimeType: string;
  isBase64: boolean;
  status?: powerbi.PrivilegeStatus;
  reason: ExportBlockReason;
  /** Plain-language explanation suitable for showing to the report user. */
  userMessage: string;

  constructor(
    message: string,
    filename: string,
    content: string,
    mimeType: string,
    isBase64: boolean,
    status?: powerbi.PrivilegeStatus,
    reason: ExportBlockReason = "failed",
    userMessage: string = message
  ) {
    super(message);
    this.name = "ExportDownloadBlockedError";
    Object.setPrototypeOf(this, ExportDownloadBlockedError.prototype);
    this.filename = filename;
    this.content = content;
    this.mimeType = mimeType;
    this.isBase64 = isBase64;
    this.status = status;
    this.reason = reason;
    this.userMessage = userMessage;
  }

  /** Text exports can still be copied to the clipboard when downloading is blocked. */
  get canCopyToClipboard(): boolean {
    return !this.isBase64 && this.reason !== "tooLarge";
  }
}

export function setExportDownloadService(service: DownloadService | null | undefined): void {
  activeDownloadService = service || null;
}

export function hasExportDownloadService(): boolean {
  return activeDownloadService !== null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getExportPayload(content: Blob | string, filename: string): Promise<{ content: string; fileType: string; isBase64: boolean }> {
  const extension = filename.split(".").pop()?.toLowerCase() || "txt";
  const isBinaryDownload = extension === "xlsx" || extension === "pdf";
  const exportContent = typeof content === "string"
    ? content
    : isBinaryDownload
      ? await blobToBase64(content)
      : await content.text();

  return {
    content: exportContent,
    // Power BI requires "base64" for .pdf/.xlsx; text files use "txt".
    fileType: isBinaryDownload ? "base64" : "txt",
    isBase64: isBinaryDownload,
  };
}

function blockedMessage(status: number | undefined): { reason: ExportBlockReason; userMessage: string } {
  switch (status) {
    case PRIVILEGE_DISABLED_BY_ADMIN:
      return {
        reason: "disabledByAdmin",
        userMessage: "Downloads from custom visuals are turned off for your organization. A Power BI administrator can enable \"Allow downloads from custom visuals\" in the admin portal.",
      };
    case PRIVILEGE_NOT_SUPPORTED:
      return {
        reason: "notSupported",
        userMessage: "File downloads aren't available here. Exports work in Power BI Desktop and the Power BI service, but not in embedded reports or mobile apps.",
      };
    case PRIVILEGE_NOT_DECLARED:
      return {
        reason: "notDeclared",
        userMessage: "This version of the visual isn't permitted to download files.",
      };
    default:
      return { reason: "failed", userMessage: "Power BI blocked the download." };
  }
}

async function exportViaPowerBI(content: Blob | string, filename: string, mimeType: string): Promise<ExportOutcome | null> {
  if (!activeDownloadService) return null;

  const payload = await getExportPayload(content, filename);
  const description = mimeType || `${payload.fileType} file`;

  if (payload.content.length > MAX_EXPORT_BYTES) {
    throw new ExportDownloadBlockedError(
      "Export exceeds the Power BI 30 MB download limit.",
      filename,
      payload.content,
      mimeType,
      payload.isBase64,
      undefined,
      "tooLarge",
      "This export is larger than the 30 MB Power BI allows. Collapse levels, filter the data, or hide columns, then try again."
    );
  }

  const status = await activeDownloadService.exportStatus();
  if ((status as unknown as number) !== PRIVILEGE_ALLOWED) {
    const { reason, userMessage } = blockedMessage(status as unknown as number);
    throw new ExportDownloadBlockedError(
      "Power BI has blocked file downloads for this visual in the current environment.",
      filename,
      payload.content,
      mimeType,
      payload.isBase64,
      status,
      reason,
      userMessage
    );
  }

  if (typeof activeDownloadService.exportVisualsContentExtended === "function") {
    const result = await activeDownloadService.exportVisualsContentExtended(payload.content, filename, payload.fileType, description);
    return { completed: !!result?.downloadCompleted, filename: result?.fileName || filename };
  }
  const completed = await activeDownloadService.exportVisualsContent(payload.content, filename, payload.fileType, description);
  return { completed: completed !== false, filename };
}

export async function downloadFile(content: Blob | string, filename: string, mimeType: string): Promise<ExportOutcome> {
  const viaHost = await exportViaPowerBI(content, filename, mimeType);
  if (viaHost) {
    return viaHost;
  }

  // Outside the Power BI host (e.g. the developer sandbox) fall back to a
  // browser download.
  const blob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { completed: true, filename };
}

/**
 * Copies text to the clipboard. Uses the async Clipboard API where allowed and
 * falls back to a hidden textarea, which works inside sandboxed visual frames.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function downloadCSV(content: string, filename: string): Promise<ExportOutcome> {
  return downloadFile("﻿" + content, filename, "text/csv;charset=utf-8;");
}

export function downloadXLSX(blob: Blob, filename: string): Promise<ExportOutcome> {
  return downloadFile(blob, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function downloadJSON(data: object, filename: string): Promise<ExportOutcome> {
  const content = JSON.stringify(data, null, 2);
  return downloadFile(content, filename, "application/json");
}

export function downloadPDF(blob: Blob, filename: string): Promise<ExportOutcome> {
  return downloadFile(blob, filename, "application/pdf");
}
