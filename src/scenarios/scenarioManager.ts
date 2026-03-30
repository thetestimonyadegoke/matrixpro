/**
 * Scenario Management System
 * Manages Budget/Forecast/Actual and custom scenarios
 */

export type ScenarioType = "actual" | "budget" | "forecast" | "custom";

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  description: string;
  color: string;
  isActive: boolean;
  isEditable: boolean;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ScenarioConfig {
  scenarios: Scenario[];
  activeScenarioId: string;
  showScenarioSelector: boolean;
  allowScenarioComparison: boolean;
  comparisonScenarioIds: string[];
}

/**
 * Generate a unique scenario ID
 */
function generateScenarioId(): string {
  const randomBytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 4; i++) {
      randomBytes[i] = (Date.now() + i * 17) % 256;
    }
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `scenario_${Date.now()}_${hex}`;
}

/**
 * Default scenarios
 */
export const defaultScenarios: Scenario[] = [
  {
    id: "actual",
    name: "Actual",
    type: "actual",
    description: "Actual values from the data source",
    color: "#2563eb",
    isActive: true,
    isEditable: false,
    isLocked: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "budget",
    name: "Budget",
    type: "budget",
    description: "Budgeted values for planning",
    color: "#16a34a",
    isActive: false,
    isEditable: true,
    isLocked: false,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "forecast",
    name: "Forecast",
    type: "forecast",
    description: "Forecasted values",
    color: "#ea580c",
    isActive: false,
    isEditable: true,
    isLocked: false,
    createdAt: 0,
    updatedAt: 0,
  },
];

export const defaultScenarioConfig: ScenarioConfig = {
  scenarios: defaultScenarios,
  activeScenarioId: "actual",
  showScenarioSelector: true,
  allowScenarioComparison: true,
  comparisonScenarioIds: [],
};

/**
 * Create a new custom scenario
 */
export function createScenario(
  name: string,
  description: string = "",
  color: string = "#6b7280"
): Scenario {
  const now = Date.now();
  return {
    id: generateScenarioId(),
    name,
    type: "custom",
    description,
    color,
    isActive: false,
    isEditable: true,
    isLocked: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Duplicate a scenario
 */
export function duplicateScenario(
  source: Scenario,
  newName: string
): Scenario {
  const now = Date.now();
  return {
    ...source,
    id: generateScenarioId(),
    name: newName,
    type: "custom",
    isActive: false,
    isLocked: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get active scenario
 */
export function getActiveScenario(config: ScenarioConfig): Scenario | undefined {
  return config.scenarios.find(s => s.id === config.activeScenarioId);
}

/**
 * Set active scenario
 */
export function setActiveScenario(
  config: ScenarioConfig,
  scenarioId: string
): ScenarioConfig {
  const scenario = config.scenarios.find(s => s.id === scenarioId);
  if (!scenario) return config;

  return {
    ...config,
    activeScenarioId: scenarioId,
    scenarios: config.scenarios.map(s => ({
      ...s,
      isActive: s.id === scenarioId,
    })),
  };
}

/**
 * Add scenario to config
 */
export function addScenario(
  config: ScenarioConfig,
  scenario: Scenario
): ScenarioConfig {
  return {
    ...config,
    scenarios: [...config.scenarios, scenario],
  };
}

/**
 * Remove scenario from config
 */
export function removeScenario(
  config: ScenarioConfig,
  scenarioId: string
): ScenarioConfig {
  // Cannot remove built-in scenarios
  const scenario = config.scenarios.find(s => s.id === scenarioId);
  if (!scenario || scenario.type !== "custom") {
    return config;
  }

  const newScenarios = config.scenarios.filter(s => s.id !== scenarioId);
  
  // If active scenario was removed, switch to actual
  let newActiveId = config.activeScenarioId;
  if (config.activeScenarioId === scenarioId) {
    newActiveId = "actual";
  }

  return {
    ...config,
    scenarios: newScenarios,
    activeScenarioId: newActiveId,
    comparisonScenarioIds: config.comparisonScenarioIds.filter(id => id !== scenarioId),
  };
}

/**
 * Update scenario
 */
export function updateScenario(
  config: ScenarioConfig,
  scenarioId: string,
  updates: Partial<Omit<Scenario, "id" | "type" | "createdAt">>
): ScenarioConfig {
  return {
    ...config,
    scenarios: config.scenarios.map(s => {
      if (s.id !== scenarioId) return s;
      return {
        ...s,
        ...updates,
        updatedAt: Date.now(),
      };
    }),
  };
}

/**
 * Lock scenario
 */
export function lockScenario(
  config: ScenarioConfig,
  scenarioId: string
): ScenarioConfig {
  return updateScenario(config, scenarioId, { isLocked: true, isEditable: false });
}

/**
 * Unlock scenario
 */
export function unlockScenario(
  config: ScenarioConfig,
  scenarioId: string
): ScenarioConfig {
  const scenario = config.scenarios.find(s => s.id === scenarioId);
  // Cannot unlock actual scenario
  if (scenario?.type === "actual") return config;
  return updateScenario(config, scenarioId, { isLocked: false, isEditable: true });
}

/**
 * Toggle comparison scenario
 */
export function toggleComparisonScenario(
  config: ScenarioConfig,
  scenarioId: string
): ScenarioConfig {
  const isCurrentlyComparing = config.comparisonScenarioIds.includes(scenarioId);
  
  if (isCurrentlyComparing) {
    return {
      ...config,
      comparisonScenarioIds: config.comparisonScenarioIds.filter(id => id !== scenarioId),
    };
  } else {
    return {
      ...config,
      comparisonScenarioIds: [...config.comparisonScenarioIds, scenarioId],
    };
  }
}

/**
 * Get comparison scenarios
 */
export function getComparisonScenarios(config: ScenarioConfig): Scenario[] {
  return config.scenarios.filter(s => config.comparisonScenarioIds.includes(s.id));
}

/**
 * Calculate variance between scenarios
 */
export interface ScenarioVariance {
  rowKey: string;
  colKey: string;
  measureKey: string;
  baseValue: number | null;
  compareValue: number | null;
  variance: number | null;
  variancePercent: number | null;
}

export function calculateScenarioVariance(
  baseValue: number | null,
  compareValue: number | null
): { variance: number | null; variancePercent: number | null } {
  if (baseValue === null || compareValue === null) {
    return { variance: null, variancePercent: null };
  }

  const variance = baseValue - compareValue;
  const variancePercent = compareValue !== 0 
    ? ((baseValue - compareValue) / Math.abs(compareValue)) * 100 
    : null;

  return { variance, variancePercent };
}

/**
 * Scenario color palette for new scenarios
 */
export const scenarioColorPalette = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#ea580c", // Orange
  "#dc2626", // Red
  "#7c3aed", // Purple
  "#0891b2", // Cyan
  "#ca8a04", // Yellow
  "#be185d", // Pink
  "#4f46e5", // Indigo
  "#059669", // Emerald
];

export function getNextScenarioColor(existingScenarios: Scenario[]): string {
  const usedColors = new Set(existingScenarios.map(s => s.color));
  const available = scenarioColorPalette.find(c => !usedColors.has(c));
  return available || scenarioColorPalette[existingScenarios.length % scenarioColorPalette.length];
}
