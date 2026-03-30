/**
 * Settings Validation System
 * Provides comprehensive validation, defaults, and constraints for all MatrixPro settings
 * Ensures settings are robust and user-friendly like Excel/Google Sheets
 */

import {
  VisualSettings,
  GeneralSettings,
  HeaderSettings,
  ValueSettings,
  TotalSettings,
  ConditionalFormattingSettings,
  DataBarSettings,
  KPIIconSettings,
  SparklineSettings,
  QuickCalcSettings,
  AppearanceSettings,
  CalculationsSettings,
  ManualDataSettings,
  LayoutSettings,
  ThemeSettings,
  defaultSettings,
} from "./settings";

export interface ValidationError {
  path: string;
  message: string;
  value: any;
  constraint: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  sanitized: VisualSettings;
}

export interface SettingMetadata {
  description: string;
  type: "number" | "string" | "boolean" | "enum" | "color" | "json";
  defaultValue: any;
  min?: number;
  max?: number;
  allowedValues?: string[];
  category: string;
  requiresReload?: boolean;
  excelEquivalent?: string;
}

export type SettingsMetadata = {
  [K in keyof VisualSettings]: {
    [P in keyof VisualSettings[K]]: SettingMetadata;
  };
};

// Comprehensive metadata for all settings
export const generalSettingsMetadata: Record<keyof GeneralSettings, SettingMetadata> = {
  rowHeight: { description: "Height of rows in pixels", type: "number", defaultValue: 28, min: 18, max: 100, category: "Layout", excelEquivalent: "Row Height" },
  defaultColumnWidth: { description: "Default column width in pixels", type: "number", defaultValue: 100, min: 40, max: 500, category: "Layout", excelEquivalent: "Column Width" },
  rowHeaderWidth: { description: "Width of row headers area", type: "number", defaultValue: 260, min: 100, max: 800, category: "Layout", excelEquivalent: "Freeze Panes" },
  freezeFirstColumn: { description: "Keep first column visible when scrolling", type: "boolean", defaultValue: false, category: "Layout", excelEquivalent: "Freeze First Column" },
  showGridlines: { description: "Show borders between cells", type: "boolean", defaultValue: true, category: "Appearance", excelEquivalent: "View > Gridlines" },
  rowBanding: { description: "Alternate row background colors", type: "boolean", defaultValue: true, category: "Appearance", excelEquivalent: "Table Design > Banded Rows" },
  fontFamily: { description: "Global font family", type: "string", defaultValue: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", category: "Appearance", excelEquivalent: "Font" },
  rowHighlight: { description: "Highlight rows on hover", type: "boolean", defaultValue: false, category: "Appearance", excelEquivalent: "Row Highlight" },
  topN: { description: "Show only top N rows", type: "number", defaultValue: 0, min: 0, max: 1000, category: "Analysis", excelEquivalent: "Top N" },
};

export const headerSettingsMetadata: Record<keyof HeaderSettings, SettingMetadata> = {
  fontSize: { description: "Header font size", type: "number", defaultValue: 12, min: 8, max: 72, category: "Appearance", excelEquivalent: "Font Size" },
  bold: { description: "Make headers bold", type: "boolean", defaultValue: true, category: "Appearance", excelEquivalent: "Bold" },
  backgroundColor: { description: "Header background color", type: "color", defaultValue: "#f5f5f5", category: "Appearance", excelEquivalent: "Fill Color" },
  textColor: { description: "Header text color", type: "color", defaultValue: "#333333", category: "Appearance", excelEquivalent: "Font Color" },
};

export const valueSettingsMetadata: Record<keyof ValueSettings, SettingMetadata> = {
  fontSize: { description: "Value font size", type: "number", defaultValue: 12, min: 8, max: 72, category: "Appearance", excelEquivalent: "Font Size" },
  alignment: { description: "Value text alignment", type: "enum", defaultValue: "right", allowedValues: ["left", "center", "right"], category: "Appearance", excelEquivalent: "Alignment" },
  numberFormat: { description: "Format string for numbers", type: "string", defaultValue: "", category: "Formatting", excelEquivalent: "Number Format" },
  textColor: { description: "Value text color", type: "color", defaultValue: "#1a1a1a", category: "Appearance", excelEquivalent: "Font Color" },
  backgroundColor: { description: "Value background color", type: "color", defaultValue: "transparent", category: "Appearance", excelEquivalent: "Fill Color" },
  bold: { description: "Make values bold", type: "boolean", defaultValue: false, category: "Appearance", excelEquivalent: "Bold" },
  italic: { description: "Make values italic", type: "boolean", defaultValue: false, category: "Appearance", excelEquivalent: "Italic" },
  underline: { description: "Underline values", type: "boolean", defaultValue: false, category: "Appearance", excelEquivalent: "Underline" },
  borderStyle: { description: "Cell border style", type: "enum", defaultValue: "none", allowedValues: ["none", "all", "horizontal", "vertical", "outline"], category: "Appearance", excelEquivalent: "Borders" },
  borderColor: { description: "Cell border color", type: "color", defaultValue: "#d0d0d0", category: "Appearance", excelEquivalent: "Border Color" },
};

export const settingsMetadata: SettingsMetadata = {
  general: generalSettingsMetadata,
  headers: headerSettingsMetadata,
  values: valueSettingsMetadata,
  totals: {
    showRowSubtotals: {
      description: "Display subtotals for row hierarchies",
      type: "boolean",
      defaultValue: true,
      category: "Totals",
      requiresReload: true,
      excelEquivalent: "Subtotals",
    },
    showColumnSubtotals: {
      description: "Display subtotals for column hierarchies",
      type: "boolean",
      defaultValue: true,
      category: "Totals",
      requiresReload: true,
      excelEquivalent: "Subtotals",
    },
    showGrandTotals: {
      description: "Display grand total row and column",
      type: "boolean",
      defaultValue: true,
      category: "Totals",
      requiresReload: true,
      excelEquivalent: "Grand Totals",
    },
    subtotalPosition: {
      description: "Position of subtotal rows relative to detail rows",
      type: "enum",
      defaultValue: "bottom",
      allowedValues: ["top", "bottom"],
      category: "Totals",
      requiresReload: true,
      excelEquivalent: "Subtotal Position",
    },
    backgroundColor: {
      description: "Background color for total cells",
      type: "color",
      defaultValue: "#e8e8e8",
      category: "Appearance",
      excelEquivalent: "Fill Color",
    },
    textColor: {
      description: "Text color for total cells",
      type: "color",
      defaultValue: "#333333",
      category: "Appearance",
      excelEquivalent: "Font Color",
    },
  },
  conditionalFormatting: {
    enabled: {
      description: "Enable conditional formatting rules",
      type: "boolean",
      defaultValue: false,
      category: "Conditional Formatting",
      excelEquivalent: "Conditional Formatting",
    },
    ruleType: {
      description: "Type of conditional formatting to apply",
      type: "enum",
      defaultValue: "thresholds",
      allowedValues: ["thresholds", "bands"],
      category: "Conditional Formatting",
      excelEquivalent: "Rule Type",
    },
    lowColor: {
      description: "Color for low values in conditional formatting",
      type: "color",
      defaultValue: "#ff6b6b",
      category: "Conditional Formatting",
      excelEquivalent: "Color Scale",
    },
    midColor: {
      description: "Color for middle values in conditional formatting",
      type: "color",
      defaultValue: "#ffd93d",
      category: "Conditional Formatting",
      excelEquivalent: "Color Scale",
    },
    highColor: {
      description: "Color for high values in conditional formatting",
      type: "color",
      defaultValue: "#6bcb77",
      category: "Conditional Formatting",
      excelEquivalent: "Color Scale",
    },
    lowThreshold: {
      description: "Percentage threshold for low values (0-100)",
      type: "number",
      defaultValue: 33,
      min: 0,
      max: 100,
      category: "Conditional Formatting",
      excelEquivalent: "Percentile",
    },
    highThreshold: {
      description: "Percentage threshold for high values (0-100)",
      type: "number",
      defaultValue: 66,
      min: 0,
      max: 100,
      category: "Conditional Formatting",
      excelEquivalent: "Percentile",
    },
    applyToAllMeasures: {
      description: "Apply conditional formatting to all measures",
      type: "boolean",
      defaultValue: true,
      category: "Conditional Formatting",
      excelEquivalent: "Applies To",
    },
    targetMeasure: {
      description: "Specific measure index to apply formatting (if not all)",
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 100,
      category: "Conditional Formatting",
    },
  },
  dataBars: {
    enabled: {
      description: "Show data bars inside cells",
      type: "boolean",
      defaultValue: false,
      category: "Data Bars",
      excelEquivalent: "Data Bars",
    },
    showValueText: {
      description: "Display the numeric value alongside the data bar",
      type: "boolean",
      defaultValue: true,
      category: "Data Bars",
      excelEquivalent: "Show Bar Only",
    },
    positiveColor: {
      description: "Color for positive value data bars",
      type: "color",
      defaultValue: "#5cb85c",
      category: "Data Bars",
      excelEquivalent: "Fill Color",
    },
    negativeColor: {
      description: "Color for negative value data bars",
      type: "color",
      defaultValue: "#d9534f",
      category: "Data Bars",
      excelEquivalent: "Fill Color",
    },
    normalizeBy: {
      description: "How to scale data bars (column, row, or global)",
      type: "enum",
      defaultValue: "column",
      allowedValues: ["column", "row", "global"],
      category: "Data Bars",
      excelEquivalent: "Minimum/Maximum",
    },
  },
  kpiIcons: {
    enabled: {
      description: "Show KPI icons (up/down arrows) based on values",
      type: "boolean",
      defaultValue: false,
      category: "KPI",
      excelEquivalent: "Icon Sets",
    },
    upThreshold: {
      description: "Threshold above which to show up arrow",
      type: "number",
      defaultValue: 5,
      category: "KPI",
      excelEquivalent: "Icon Criteria",
    },
    downThreshold: {
      description: "Threshold below which to show down arrow",
      type: "number",
      defaultValue: -5,
      category: "KPI",
      excelEquivalent: "Icon Criteria",
    },
    upColor: {
      description: "Color for positive/up icons",
      type: "color",
      defaultValue: "#28a745",
      category: "KPI",
    },
    neutralColor: {
      description: "Color for neutral icons",
      type: "color",
      defaultValue: "#6c757d",
      category: "KPI",
    },
    downColor: {
      description: "Color for negative/down icons",
      type: "color",
      defaultValue: "#dc3545",
      category: "KPI",
    },
  },
  sparklines: {
    enabled: {
      description: "Show sparkline mini-charts in cells",
      type: "boolean",
      defaultValue: false,
      category: "Sparklines",
      excelEquivalent: "Sparklines",
    },
    showInDedicatedColumn: {
      description: "Show sparklines in their own column",
      type: "boolean",
      defaultValue: true,
      category: "Sparklines",
    },
    normalizePerRow: {
      description: "Scale sparklines relative to each row's min/max",
      type: "boolean",
      defaultValue: true,
      category: "Sparklines",
      excelEquivalent: "Axis Options",
    },
    showMinMaxMarkers: {
      description: "Highlight minimum and maximum points",
      type: "boolean",
      defaultValue: true,
      category: "Sparklines",
      excelEquivalent: "Markers",
    },
    lineColor: {
      description: "Color of the sparkline line",
      type: "color",
      defaultValue: "#4a90d9",
      category: "Sparklines",
    },
    markerColor: {
      description: "Color for min/max markers",
      type: "color",
      defaultValue: "#d9534f",
      category: "Sparklines",
    },
    nullHandling: {
      description: "How to handle null values in sparklines",
      type: "enum",
      defaultValue: "gap",
      allowedValues: ["gap", "zero"],
      category: "Sparklines",
    },
  },
  quickCalcs: {
    enabled: {
      description: "Enable quick calculations on values",
      type: "boolean",
      defaultValue: false,
      category: "Calculations",
    },
    type: {
      description: "Type of quick calculation to apply",
      type: "enum",
      defaultValue: "none",
      allowedValues: ["none", "percentOfTotal", "runningTotal", "variance", "percentChange", "rank"],
      category: "Calculations",
      excelEquivalent: "Show Values As",
    },
    targetMeasure: {
      description: "Measure to apply quick calculation",
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 100,
      category: "Calculations",
    },
  },
  appearance: {
    surfaceColor: {
      description: "Background color of the visual surface",
      type: "color",
      defaultValue: "#ffffff",
      category: "Appearance",
    },
    toolbarBackgroundColor: {
      description: "Background color of the toolbar",
      type: "color",
      defaultValue: "#f8f9fa",
      category: "Appearance",
    },
    borderColor: {
      description: "Color of borders and dividers",
      type: "color",
      defaultValue: "#e0e0e0",
      category: "Appearance",
    },
    accentColor: {
      description: "Primary accent color for interactive elements",
      type: "color",
      defaultValue: "#2d74da",
      category: "Appearance",
    },
    cornerRadius: {
      description: "Corner radius for rounded elements in pixels",
      type: "number",
      defaultValue: 8,
      min: 0,
      max: 32,
      category: "Appearance",
    },
    showToolbar: {
      description: "Display the toolbar with action buttons",
      type: "boolean",
      defaultValue: true,
      category: "Appearance",
    },
  },
  layout: {
    mode: {
      description: "Layout mode for the matrix display",
      type: "enum",
      defaultValue: "hierarchy",
      allowedValues: ["hierarchy", "outline", "table", "stepped", "drilldown"],
      category: "Layout",
      requiresReload: true,
      excelEquivalent: "Report Layout",
    },
  },
  theme: {
    preset: {
      description: "Pre-defined color theme",
      type: "enum",
      defaultValue: "modern-light",
      allowedValues: ["modern-light", "modern-dark", "finance-statement", "minimal", "tableau-like", "figma-like"],
      category: "Theme",
    },
    density: {
      description: "Visual density of the interface",
      type: "enum",
      defaultValue: "comfortable",
      allowedValues: ["compact", "comfortable"],
      category: "Theme",
    },
    customAccentColor: {
      description: "Custom accent color when not using a preset",
      type: "color",
      defaultValue: "#2563eb",
      category: "Theme",
    },
  },
  calculations: {
    measures: {
      description: "JSON array of calculated measure definitions",
      type: "json",
      defaultValue: "[]",
      category: "Advanced",
    },
    rows: {
      description: "JSON array of calculated row definitions",
      type: "json",
      defaultValue: "[]",
      category: "Advanced",
    },
  },
  manualData: {
    notes: {
      description: "JSON object of cell notes/comments",
      type: "json",
      defaultValue: "{}",
      category: "Data",
    },
    edits: {
      description: "JSON object of manual cell value edits",
      type: "json",
      defaultValue: "{}",
      category: "Data",
    },
    rowOrder: {
      description: "JSON array defining custom row order",
      type: "json",
      defaultValue: "[]",
      category: "Data",
    },
    colOrder: {
      description: "JSON array defining custom column order",
      type: "json",
      defaultValue: "[]",
      category: "Data",
    },
    labelOverrides: {
      description: "JSON object of custom row/column labels",
      type: "json",
      defaultValue: "{}",
      category: "Data",
    },
    locks: {
      description: "JSON array of locked cell references",
      type: "json",
      defaultValue: "[]",
      category: "Data",
    },
  },
};

// Validation functions for each type
const validators = {
  number: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: number; message?: string } => {
    if (typeof value !== "number" || isNaN(value)) {
      return { valid: false, sanitized: meta.defaultValue, message: "Must be a valid number" };
    }
    if (meta.min !== undefined && value < meta.min) {
      return { valid: false, sanitized: meta.min, message: `Minimum value is ${meta.min}` };
    }
    if (meta.max !== undefined && value > meta.max) {
      return { valid: false, sanitized: meta.max, message: `Maximum value is ${meta.max}` };
    }
    return { valid: true, sanitized: value };
  },

  string: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: string; message?: string } => {
    if (typeof value !== "string") {
      return { valid: false, sanitized: String(value), message: "Must be a string" };
    }
    return { valid: true, sanitized: value };
  },

  boolean: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: boolean; message?: string } => {
    if (typeof value !== "boolean") {
      return { valid: false, sanitized: Boolean(value), message: "Must be a boolean" };
    }
    return { valid: true, sanitized: value };
  },

  enum: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: string; message?: string } => {
    if (!meta.allowedValues?.includes(value)) {
      return {
        valid: false,
        sanitized: meta.defaultValue,
        message: `Must be one of: ${meta.allowedValues?.join(", ")}`,
      };
    }
    return { valid: true, sanitized: value };
  },

  color: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: string; message?: string } => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (typeof value !== "string" || !colorRegex.test(value)) {
      return { valid: false, sanitized: meta.defaultValue, message: "Must be a valid hex color (e.g., #ff0000)" };
    }
    return { valid: true, sanitized: value.toLowerCase() };
  },

  json: (value: any, meta: SettingMetadata): { valid: boolean; sanitized: string; message?: string } => {
    if (typeof value !== "string") {
      try {
        return { valid: true, sanitized: JSON.stringify(value) };
      } catch {
        return { valid: false, sanitized: meta.defaultValue, message: "Invalid JSON value" };
      }
    }
    try {
      JSON.parse(value);
      return { valid: true, sanitized: value };
    } catch {
      return { valid: false, sanitized: meta.defaultValue, message: "Invalid JSON string" };
    }
  },
};

export function validateSetting(
  path: string,
  value: any,
  meta: SettingMetadata
): { isValid: boolean; sanitized: any; error?: ValidationError } {
  const validator = validators[meta.type];
  const result = validator(value, meta);

  if (!result.valid) {
    return {
      isValid: false,
      sanitized: result.sanitized,
      error: {
        path,
        message: result.message || "Validation failed",
        value,
        constraint: `${meta.type}${meta.min !== undefined ? ` min:${meta.min}` : ""}${meta.max !== undefined ? ` max:${meta.max}` : ""}`,
      },
    };
  }

  return { isValid: true, sanitized: result.sanitized };
}

export function validateSettings(settings: Partial<VisualSettings>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const sanitized: any = {};

  // Validate each settings group
  for (const [groupKey, groupMeta] of Object.entries(settingsMetadata)) {
    const groupSettings = (settings as any)[groupKey] || {};
    sanitized[groupKey] = {};

    for (const [settingKey, meta] of Object.entries(groupMeta)) {
      const path = `${groupKey}.${settingKey}`;
      const value = groupSettings[settingKey] !== undefined ? groupSettings[settingKey] : meta.defaultValue;

      const result = validateSetting(path, value, meta);
      sanitized[groupKey][settingKey] = result.sanitized;

      if (!result.isValid && result.error) {
        errors.push(result.error);
      }

      // Add warnings for unusual values
      if (meta.type === "number" && meta.min !== undefined && meta.max !== undefined) {
        const range = meta.max - meta.min;
        const normalizedValue = (result.sanitized - meta.min) / range;
        if (normalizedValue < 0.1 || normalizedValue > 0.9) {
          warnings.push({
            path,
            message: `Value is at extreme of allowed range`,
            value: result.sanitized,
            constraint: `range: ${meta.min}-${meta.max}`,
          });
        }
      }
    }
  }

  // Cross-setting validations
  const totalSettings = sanitized.totals as TotalSettings;
  const condFormatSettings = sanitized.conditionalFormatting as ConditionalFormattingSettings;

  if (condFormatSettings.enabled && !totalSettings.showRowSubtotals && !totalSettings.showGrandTotals) {
    warnings.push({
      path: "conditionalFormatting.enabled",
      message: "Conditional formatting may have limited effect with no subtotals visible",
      value: true,
      constraint: "at least one total type should be enabled",
    });
  }

  if (condFormatSettings.lowThreshold >= condFormatSettings.highThreshold) {
    errors.push({
      path: "conditionalFormatting.lowThreshold",
      message: "Low threshold must be less than high threshold",
      value: condFormatSettings.lowThreshold,
      constraint: `< ${condFormatSettings.highThreshold}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: sanitized as VisualSettings,
  };
}

export function mergeWithDefaults(settings: Partial<VisualSettings>): VisualSettings {
  const result = validateSettings(settings);
  return result.sanitized;
}

export function resetSettingsToDefaults(): VisualSettings {
  return { ...defaultSettings };
}

export function getSettingMetadata(path: string): SettingMetadata | null {
  const parts = path.split(".");
  if (parts.length !== 2) return null;

  const [group, setting] = parts;
  return (settingsMetadata as any)[group]?.[setting] || null;
}

export function getSettingsByCategory(category: string): string[] {
  const result: string[] = [];

  for (const [groupKey, groupMeta] of Object.entries(settingsMetadata)) {
    for (const [settingKey, meta] of Object.entries(groupMeta)) {
      if (meta.category === category) {
        result.push(`${groupKey}.${settingKey}`);
      }
    }
  }

  return result;
}

export function exportSettingsSchema(): object {
  const schema: any = {
    $schema: "https://json-schema.org/draft-07/schema#",
    title: "MatrixPro Settings Schema",
    type: "object",
    properties: {},
    required: Object.keys(settingsMetadata),
  };

  for (const [groupKey, groupMeta] of Object.entries(settingsMetadata)) {
    schema.properties[groupKey] = {
      type: "object",
      properties: {},
      required: Object.keys(groupMeta),
    };

    for (const [settingKey, meta] of Object.entries(groupMeta)) {
      const property: any = {
        description: meta.description,
      };

      switch (meta.type) {
        case "number":
          property.type = "number";
          if (meta.min !== undefined) property.minimum = meta.min;
          if (meta.max !== undefined) property.maximum = meta.max;
          break;
        case "string":
        case "color":
        case "json":
          property.type = "string";
          break;
        case "boolean":
          property.type = "boolean";
          break;
        case "enum":
          property.type = "string";
          property.enum = meta.allowedValues;
          break;
      }

      schema.properties[groupKey].properties[settingKey] = property;
    }
  }

  return schema;
}
