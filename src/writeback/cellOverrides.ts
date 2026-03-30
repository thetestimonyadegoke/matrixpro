/**
 * Cell Overrides System
 * Manages manual value overrides for planning/budgeting scenarios
 */

export type OverrideStatus = "draft" | "submitted" | "approved" | "rejected" | "locked";

export interface CellOverride {
  id: string;
  rowKey: string;
  colKey: string;
  measureKey: string;
  scenario: string;
  originalValue: number | null;
  overrideValue: number | null;
  formula: string | null;
  status: OverrideStatus;
  note: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
}

export interface OverrideConfig {
  editableRows: string[];
  editableMeasures: string[];
  editableColumnRange: { start: string | null; end: string | null };
  allowOverrideOnTotals: boolean;
  allowOverrideOnCalculated: boolean;
}

export const defaultOverrideConfig: OverrideConfig = {
  editableRows: [],
  editableMeasures: [],
  editableColumnRange: { start: null, end: null },
  allowOverrideOnTotals: false,
  allowOverrideOnCalculated: false,
};

/**
 * Generate a unique override ID
 */
export function generateOverrideId(): string {
  const randomBytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 4; i++) {
      randomBytes[i] = (Date.now() + i * 17) % 256;
    }
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `override_${Date.now()}_${hex}`;
}

/**
 * Create a cell override key for lookup
 */
export function createOverrideKey(
  rowKey: string,
  colKey: string,
  measureKey: string,
  scenario: string
): string {
  return `${scenario}|${rowKey}|${colKey}|${measureKey}`;
}

/**
 * Check if a cell is editable based on config
 */
export function isCellEditable(
  rowKey: string,
  colKey: string,
  measureKey: string,
  isTotal: boolean,
  isCalculated: boolean,
  config: OverrideConfig
): boolean {
  // Check totals
  if (isTotal && !config.allowOverrideOnTotals) {
    return false;
  }

  // Check calculated
  if (isCalculated && !config.allowOverrideOnCalculated) {
    return false;
  }

  // Check row editability
  if (config.editableRows.length > 0) {
    const isRowEditable = config.editableRows.some(
      r => rowKey === r || rowKey.toLowerCase().includes(r.toLowerCase())
    );
    if (!isRowEditable) return false;
  }

  // Check measure editability
  if (config.editableMeasures.length > 0) {
    const isMeasureEditable = config.editableMeasures.some(
      m => measureKey === m || measureKey.toLowerCase().includes(m.toLowerCase())
    );
    if (!isMeasureEditable) return false;
  }

  return true;
}

/**
 * Parse user input value with shorthand support
 */
export function parseInputValue(input: string): number | null {
  if (!input || input.trim() === "") return null;

  let cleaned = input.trim().toLowerCase();
  
  // Remove currency symbols and commas
  cleaned = cleaned.replace(/[$€£¥,]/g, "");
  
  // Handle parentheses for negatives
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  }

  // Handle shorthand multipliers
  let multiplier = 1;
  if (cleaned.endsWith("k")) {
    multiplier = 1000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith("m")) {
    multiplier = 1000000;
    cleaned = cleaned.slice(0, -1);
  } else if (cleaned.endsWith("b")) {
    multiplier = 1000000000;
    cleaned = cleaned.slice(0, -1);
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;

  return parsed * multiplier;
}

/**
 * In-memory override store (for visual-only persistence)
 */
export class OverrideStore {
  private overrides: Map<string, CellOverride> = new Map();
  private listeners: Array<() => void> = [];

  public get(key: string): CellOverride | undefined {
    return this.overrides.get(key);
  }

  public set(override: CellOverride): void {
    const key = createOverrideKey(
      override.rowKey,
      override.colKey,
      override.measureKey,
      override.scenario
    );
    this.overrides.set(key, override);
    this.notifyListeners();
  }

  public delete(key: string): boolean {
    const result = this.overrides.delete(key);
    if (result) this.notifyListeners();
    return result;
  }

  public getAll(): CellOverride[] {
    return Array.from(this.overrides.values());
  }

  public getByScenario(scenario: string): CellOverride[] {
    return this.getAll().filter(o => o.scenario === scenario);
  }

  public getByStatus(status: OverrideStatus): CellOverride[] {
    return this.getAll().filter(o => o.status === status);
  }

  public clear(): void {
    this.overrides.clear();
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
    return JSON.stringify(this.getAll());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as CellOverride[];
      this.overrides.clear();
      for (const override of data) {
        const key = createOverrideKey(
          override.rowKey,
          override.colKey,
          override.measureKey,
          override.scenario
        );
        this.overrides.set(key, override);
      }
      this.notifyListeners();
    } catch {
      console.error("Failed to parse override data");
    }
  }
}

/**
 * Apply overrides to cell map
 */
export function applyOverridesToCellMap(
  baseCellMap: Map<string, { value: number | null; formattedValue: string }>,
  overrides: CellOverride[],
  scenario: string
): Map<string, { value: number | null; formattedValue: string; isOverride: boolean }> {
  const result = new Map<string, { value: number | null; formattedValue: string; isOverride: boolean }>();

  // Copy base values
  for (const [key, cell] of baseCellMap) {
    result.set(key, { ...cell, isOverride: false });
  }

  // Apply overrides for current scenario
  for (const override of overrides) {
    if (override.scenario !== scenario) continue;
    if (override.status === "rejected") continue;

    const cellKey = `${override.rowKey}|${override.colKey}|${override.measureKey}`;
    const existing = result.get(cellKey);

    if (override.overrideValue !== null) {
      result.set(cellKey, {
        value: override.overrideValue,
        formattedValue: override.overrideValue.toLocaleString(),
        isOverride: true,
      });
    } else if (existing) {
      result.set(cellKey, { ...existing, isOverride: false });
    }
  }

  return result;
}

/**
 * Create a new override
 */
export function createOverride(
  rowKey: string,
  colKey: string,
  measureKey: string,
  scenario: string,
  originalValue: number | null,
  overrideValue: number | null,
  userId: string
): CellOverride {
  const now = Date.now();
  return {
    id: generateOverrideId(),
    rowKey,
    colKey,
    measureKey,
    scenario,
    originalValue,
    overrideValue,
    formula: null,
    status: "draft",
    note: "",
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
  };
}

/**
 * Revert an override to original value
 */
export function revertOverride(override: CellOverride, userId: string): CellOverride {
  return {
    ...override,
    overrideValue: null,
    status: "draft",
    updatedBy: userId,
    updatedAt: Date.now(),
  };
}
