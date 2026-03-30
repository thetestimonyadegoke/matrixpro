/**
 * Conditional Formatting Presets
 * Pre-built formatting rules for common use cases
 */

export type PresetCategory = "performance" | "comparison" | "status" | "financial" | "custom";

export interface ConditionalPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  ruleType: "thresholds" | "bands" | "scale";
  colors: {
    low: string;
    mid: string;
    high: string;
  };
  thresholds: {
    low: number;
    high: number;
  };
  icon?: string;
}

export const conditionalPresets: ConditionalPreset[] = [
  // Performance presets
  {
    id: "traffic-light",
    name: "Traffic Light",
    description: "Red/Yellow/Green for performance metrics",
    category: "performance",
    ruleType: "thresholds",
    colors: {
      low: "#dc2626",
      mid: "#f59e0b",
      high: "#16a34a",
    },
    thresholds: { low: 33, high: 66 },
  },
  {
    id: "heat-map",
    name: "Heat Map",
    description: "Blue to Red gradient for intensity",
    category: "performance",
    ruleType: "scale",
    colors: {
      low: "#3b82f6",
      mid: "#fbbf24",
      high: "#ef4444",
    },
    thresholds: { low: 25, high: 75 },
  },
  {
    id: "cool-warm",
    name: "Cool to Warm",
    description: "Cool blue to warm orange gradient",
    category: "performance",
    ruleType: "scale",
    colors: {
      low: "#0ea5e9",
      mid: "#a3a3a3",
      high: "#f97316",
    },
    thresholds: { low: 33, high: 66 },
  },

  // Comparison presets
  {
    id: "variance-highlight",
    name: "Variance Highlight",
    description: "Highlight positive/negative variances",
    category: "comparison",
    ruleType: "thresholds",
    colors: {
      low: "#ef4444",
      mid: "#ffffff",
      high: "#22c55e",
    },
    thresholds: { low: -5, high: 5 },
  },
  {
    id: "above-below-target",
    name: "Above/Below Target",
    description: "Green above target, red below",
    category: "comparison",
    ruleType: "thresholds",
    colors: {
      low: "#dc2626",
      mid: "#fef3c7",
      high: "#16a34a",
    },
    thresholds: { low: 95, high: 100 },
  },

  // Status presets
  {
    id: "status-icons",
    name: "Status Icons",
    description: "Check/Warning/X icons for status",
    category: "status",
    ruleType: "thresholds",
    colors: {
      low: "#ef4444",
      mid: "#f59e0b",
      high: "#22c55e",
    },
    thresholds: { low: 33, high: 66 },
    icon: "status",
  },
  {
    id: "progress-bars",
    name: "Progress Bars",
    description: "Visual progress indication",
    category: "status",
    ruleType: "bands",
    colors: {
      low: "#fecaca",
      mid: "#fef08a",
      high: "#bbf7d0",
    },
    thresholds: { low: 50, high: 80 },
  },

  // Financial presets
  {
    id: "profit-loss",
    name: "Profit/Loss",
    description: "Green for profit, red for loss",
    category: "financial",
    ruleType: "thresholds",
    colors: {
      low: "#dc2626",
      mid: "#f5f5f5",
      high: "#16a34a",
    },
    thresholds: { low: 0, high: 0.01 },
  },
  {
    id: "budget-variance",
    name: "Budget Variance",
    description: "Highlight over/under budget",
    category: "financial",
    ruleType: "thresholds",
    colors: {
      low: "#22c55e",
      mid: "#fef3c7",
      high: "#ef4444",
    },
    thresholds: { low: -10, high: 10 },
  },
  {
    id: "growth-rate",
    name: "Growth Rate",
    description: "Highlight growth vs decline",
    category: "financial",
    ruleType: "thresholds",
    colors: {
      low: "#ef4444",
      mid: "#e5e5e5",
      high: "#22c55e",
    },
    thresholds: { low: -5, high: 5 },
  },
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): ConditionalPreset[] {
  return conditionalPresets.filter(p => p.category === category);
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): ConditionalPreset | undefined {
  return conditionalPresets.find(p => p.id === id);
}

/**
 * Apply preset to settings
 */
export function applyPresetToSettings(preset: ConditionalPreset): {
  enabled: boolean;
  ruleType: "thresholds" | "bands";
  lowColor: string;
  midColor: string;
  highColor: string;
  lowThreshold: number;
  highThreshold: number;
} {
  return {
    enabled: true,
    ruleType: preset.ruleType === "scale" ? "thresholds" : preset.ruleType,
    lowColor: preset.colors.low,
    midColor: preset.colors.mid,
    highColor: preset.colors.high,
    lowThreshold: preset.thresholds.low,
    highThreshold: preset.thresholds.high,
  };
}

/**
 * Get all preset categories with labels
 */
export function getPresetCategories(): Array<{ id: PresetCategory; label: string }> {
  return [
    { id: "performance", label: "Performance" },
    { id: "comparison", label: "Comparison" },
    { id: "status", label: "Status" },
    { id: "financial", label: "Financial" },
    { id: "custom", label: "Custom" },
  ];
}
