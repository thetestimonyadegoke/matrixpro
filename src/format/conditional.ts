import { ConditionalFormattingSettings } from "../settings/settings";

// ============================================================================
// Types
// ============================================================================

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  icon?: ClassificationIcon;
}

export type ClassificationIcon =
  | { kind: "check"; color: string }
  | { kind: "warn"; color: string }
  | { kind: "cross"; color: string }
  | { kind: "text"; label: string; color: string };

/**
 * A rule's scope controls which cells it applies to. It mirrors the Inforiver
 * "Apply to" / "Row hierarchy levels" / "Exclude" block from the reference UI.
 */
export interface RuleScope {
  /**
   * Measure index the rule targets. -1 means "all measures".
   */
  targetMeasure: number;
  /**
   * Which row categories the rule should touch.
   */
  rowHierarchyLevels: "valuesOnly" | "totalsOnly" | "valuesAndTotals";
  /**
   * When true, the rule skips cells that belong to a column grand total.
   */
  excludeColumnGrandTotal: boolean;
}

// --- Format-by: Rules (if/condition) ------------------------------------------

export type RuleOp =
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "equals"
  | "notEquals"
  | "between";

export interface RulesCondition {
  /**
   * Measure index whose value drives the condition. -1 means "same measure
   * the rule is applied to" (useful when targetMeasure itself is -1 / all).
   */
  basedOnMeasure: number;
  op: RuleOp;
  /**
   * Numeric threshold. For "between", this is the lower bound.
   */
  value: number;
  /**
   * Upper bound for "between".
   */
  value2?: number;
}

export interface RulesFormatConfig {
  /**
   * Impact targets — which visual aspects the matched style applies to.
   * - "label": affects text (foreground color, bold, etc.)
   * - "chart":  affects the data-bar fill / background color
   */
  impactOn: ("label" | "chart")[];
  conditions: RulesCondition[];
  style: CellStyle;
}

// --- Format-by: Color Scale ---------------------------------------------------

export type HeatMapType = "columnWise" | "rowWise" | "tableWise";
export type ColorScaleType = "sequential" | "diverging";
export type ColorScaleApplyTo = "background" | "foreground" | "both";

export interface ColorScaleConfig {
  basedOnMeasure: number;      // -1 = self
  applyTo: ColorScaleApplyTo;
  heatMapType: HeatMapType;
  scaleType: ColorScaleType;
  /**
   * Ordered list of hex colors forming the gradient. Length >= 2.
   */
  colorScheme: string[];
  reverse: boolean;
  numberOfBands: number;       // used for discrete banding; 0 = smooth
  hideValue: boolean;
  autoFontColor: boolean;
  includeNull: boolean;
}

// --- Format-by: Classification -----------------------------------------------

export type ClassificationRangeMode = "value" | "percentage";

export interface ClassificationRange {
  from: number;
  to: number;
  iconKind: "check" | "warn" | "cross";
  color: string;
}

export interface ClassificationConfig {
  impactOn: ("label" | "chart")[];
  basedOnMeasure: number;
  displayIcons: boolean;
  applyToCharts: boolean;
  showAsNewColumn: boolean;
  iconPosition: "leftOfData" | "rightOfData";
  rangeMode: ClassificationRangeMode;
  ranges: ClassificationRange[];
}

// --- Top-level rule -----------------------------------------------------------

export type FormatBy = "rules" | "colorScale" | "classification";

export interface ConditionalRule {
  id: string;
  title: string;
  enabled: boolean;
  scope: RuleScope;
  formatBy: FormatBy;
  rulesConfig?: RulesFormatConfig;
  colorScaleConfig?: ColorScaleConfig;
  classificationConfig?: ClassificationConfig;
}

// ============================================================================
// Public helpers
// ============================================================================

export function parseRules(settings: ConditionalFormattingSettings): ConditionalRule[] {
  try {
    const parsed = JSON.parse(settings.rules || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is ConditionalRule => !!r && typeof r === "object" && typeof r.id === "string");
  } catch {
    return [];
  }
}

export function stringifyRules(rules: ConditionalRule[]): string {
  return JSON.stringify(rules);
}

export function newRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultRule(title: string): ConditionalRule {
  return {
    id: newRuleId(),
    title,
    enabled: true,
    scope: {
      targetMeasure: -1,
      rowHierarchyLevels: "valuesAndTotals",
      excludeColumnGrandTotal: false,
    },
    formatBy: "rules",
    rulesConfig: {
      impactOn: ["label"],
      conditions: [{ basedOnMeasure: -1, op: "greaterThan", value: 0 }],
      style: { color: "#15803d", fontWeight: "600" },
    },
  };
}

// ============================================================================
// Cell context — information the evaluator needs to decide scope + values
// ============================================================================

export interface EvaluationContext {
  value: number | null;
  measureIndex: number;
  isSubtotal: boolean;
  isGrandTotal: boolean;
  isColumnGrandTotal: boolean;
  /**
   * Min/max stats for the cell's scope (column-wise / row-wise / global),
   * keyed by measure index. The caller decides which scope is appropriate
   * based on the rule's heatMapType.
   */
  getStatsForMeasure: (measureIndex: number, scope: HeatMapType) => { min: number; max: number };
  /**
   * Read another measure's value for the same row/column location — used
   * when a rule's condition is "basedOn" a different measure than the one
   * being styled.
   */
  getValueForMeasure: (measureIndex: number) => number | null;
}

// ============================================================================
// Main evaluator
// ============================================================================

/**
 * Evaluate all active rules against a cell and return the merged style.
 * Later rules in the list override earlier ones on conflict, so users can
 * layer rules (e.g. a color-scale background with a text rule on top).
 *
 * Back-compat: when no rules array is present, fall back to the legacy
 * single-rule evaluator using the top-level settings fields.
 */
export function evaluateCellStyle(
  ctx: EvaluationContext,
  settings: ConditionalFormattingSettings
): CellStyle {
  if (!settings.enabled) return {};

  const rules = parseRules(settings);

  // Legacy path — preserve pre-rule-list behavior.
  if (rules.length === 0) {
    return legacyEvaluate(ctx, settings);
  }

  let merged: CellStyle = {};
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!ruleAppliesToCell(rule, ctx)) continue;
    const style = evaluateOneRule(rule, ctx);
    merged = mergeStyles(merged, style);
  }
  return merged;
}

function ruleAppliesToCell(rule: ConditionalRule, ctx: EvaluationContext): boolean {
  const scope = rule.scope;
  if (scope.targetMeasure !== -1 && scope.targetMeasure !== ctx.measureIndex) {
    return false;
  }
  if (scope.excludeColumnGrandTotal && ctx.isColumnGrandTotal) {
    return false;
  }
  const isTotal = ctx.isSubtotal || ctx.isGrandTotal;
  if (scope.rowHierarchyLevels === "valuesOnly" && isTotal) return false;
  if (scope.rowHierarchyLevels === "totalsOnly" && !isTotal) return false;
  return true;
}

function evaluateOneRule(rule: ConditionalRule, ctx: EvaluationContext): CellStyle {
  switch (rule.formatBy) {
    case "rules":
      return evaluateRulesMode(rule.rulesConfig, ctx);
    case "colorScale":
      return evaluateColorScale(rule.colorScaleConfig, ctx);
    case "classification":
      return evaluateClassification(rule.classificationConfig, ctx);
  }
}

// ---- Rules mode (if/condition) ----------------------------------------------

function evaluateRulesMode(
  cfg: RulesFormatConfig | undefined,
  ctx: EvaluationContext
): CellStyle {
  if (!cfg || cfg.conditions.length === 0) return {};
  const allMatch = cfg.conditions.every(cond => matchCondition(cond, ctx));
  if (!allMatch) return {};

  const out: CellStyle = {};
  const impactsLabel = cfg.impactOn.includes("label");
  const impactsChart = cfg.impactOn.includes("chart");

  if (impactsLabel) {
    if (cfg.style.color !== undefined) out.color = cfg.style.color;
    if (cfg.style.fontWeight !== undefined) out.fontWeight = cfg.style.fontWeight;
    if (cfg.style.fontStyle !== undefined) out.fontStyle = cfg.style.fontStyle;
  }
  if (impactsChart) {
    if (cfg.style.backgroundColor !== undefined) out.backgroundColor = cfg.style.backgroundColor;
  }
  return out;
}

function matchCondition(cond: RulesCondition, ctx: EvaluationContext): boolean {
  const m = cond.basedOnMeasure === -1 ? ctx.measureIndex : cond.basedOnMeasure;
  const v = ctx.getValueForMeasure(m);
  if (v === null || Number.isNaN(v)) return false;
  switch (cond.op) {
    case "greaterThan": return v > cond.value;
    case "greaterThanOrEqual": return v >= cond.value;
    case "lessThan": return v < cond.value;
    case "lessThanOrEqual": return v <= cond.value;
    case "equals": return v === cond.value;
    case "notEquals": return v !== cond.value;
    case "between": return v >= cond.value && v <= (cond.value2 ?? cond.value);
  }
}

// ---- Color scale mode --------------------------------------------------------

function evaluateColorScale(
  cfg: ColorScaleConfig | undefined,
  ctx: EvaluationContext
): CellStyle {
  if (!cfg || cfg.colorScheme.length < 2) return {};
  const v = cfg.basedOnMeasure === -1
    ? ctx.value
    : ctx.getValueForMeasure(cfg.basedOnMeasure);
  if (v === null || Number.isNaN(v)) {
    return cfg.includeNull ? { backgroundColor: cfg.colorScheme[0] } : {};
  }

  const measureForStats = cfg.basedOnMeasure === -1 ? ctx.measureIndex : cfg.basedOnMeasure;
  const { min, max } = ctx.getStatsForMeasure(measureForStats, cfg.heatMapType);
  const range = max - min;

  let t = range === 0 ? 0.5 : (v - min) / range;
  t = Math.max(0, Math.min(1, t));
  if (cfg.reverse) t = 1 - t;

  // Optional banding: snap t to nearest band center.
  if (cfg.numberOfBands && cfg.numberOfBands > 0) {
    const bands = cfg.numberOfBands;
    t = Math.min(bands - 1, Math.floor(t * bands)) / Math.max(1, bands - 1);
  }

  const color = sampleGradient(cfg.colorScheme, t);
  const out: CellStyle = {};
  if (cfg.applyTo === "background" || cfg.applyTo === "both") {
    out.backgroundColor = color;
    if (cfg.autoFontColor) out.color = contrastingText(color);
  }
  if (cfg.applyTo === "foreground" || cfg.applyTo === "both") {
    out.color = color;
  }
  return out;
}

function sampleGradient(colors: string[], t: number): string {
  if (colors.length === 0) return "#ffffff";
  if (colors.length === 1) return colors[0];
  const segments = colors.length - 1;
  const pos = t * segments;
  const i = Math.min(segments - 1, Math.floor(pos));
  const local = pos - i;
  return interpolateColor(colors[i], colors[i + 1], local);
}

// ---- Classification mode -----------------------------------------------------

function evaluateClassification(
  cfg: ClassificationConfig | undefined,
  ctx: EvaluationContext
): CellStyle {
  if (!cfg || cfg.ranges.length === 0) return {};
  const v = cfg.basedOnMeasure === -1
    ? ctx.value
    : ctx.getValueForMeasure(cfg.basedOnMeasure);
  if (v === null || Number.isNaN(v)) return {};

  // Resolve the value into the rule's coordinate system.
  let lookupValue = v;
  if (cfg.rangeMode === "percentage") {
    const { min, max } = ctx.getStatsForMeasure(
      cfg.basedOnMeasure === -1 ? ctx.measureIndex : cfg.basedOnMeasure,
      "columnWise"
    );
    const range = max - min;
    lookupValue = range === 0 ? 0 : ((v - min) / range) * 100;
  }

  const matched = cfg.ranges.find(r => lookupValue >= r.from && lookupValue <= r.to);
  if (!matched) return {};

  const out: CellStyle = {};
  if (cfg.displayIcons) {
    out.icon = { kind: matched.iconKind, color: matched.color };
  }
  if (cfg.impactOn.includes("label")) {
    out.color = matched.color;
  }
  if (cfg.impactOn.includes("chart")) {
    out.backgroundColor = matched.color;
  }
  return out;
}

// ============================================================================
// Style merge + legacy fallback
// ============================================================================

function mergeStyles(a: CellStyle, b: CellStyle): CellStyle {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)),
  };
}

function legacyEvaluate(
  ctx: EvaluationContext,
  settings: ConditionalFormattingSettings
): CellStyle {
  if (!settings.applyToAllMeasures && settings.targetMeasure !== ctx.measureIndex) {
    return {};
  }
  if (ctx.value === null || Number.isNaN(ctx.value)) return {};
  const { min, max } = ctx.getStatsForMeasure(ctx.measureIndex, "columnWise");
  const range = max - min;
  if (range === 0) return { backgroundColor: settings.midColor };
  const normalized = ((ctx.value - min) / range) * 100;

  if (settings.ruleType === "thresholds") {
    const { lowThreshold, highThreshold, lowColor, midColor, highColor } = settings;
    if (normalized <= lowThreshold) {
      const r = normalized / Math.max(1, lowThreshold);
      return { backgroundColor: interpolateColor(lowColor, midColor, r) };
    }
    if (normalized >= highThreshold) {
      const r = (normalized - highThreshold) / Math.max(1, 100 - highThreshold);
      return { backgroundColor: interpolateColor(midColor, highColor, r) };
    }
    const r = (normalized - lowThreshold) / Math.max(1, highThreshold - lowThreshold);
    return { backgroundColor: interpolateColor(lowColor, highColor, r) };
  }

  if (normalized < settings.lowThreshold) return { backgroundColor: settings.lowColor };
  if (normalized > settings.highThreshold) return { backgroundColor: settings.highColor };
  return { backgroundColor: settings.midColor };
}

// ============================================================================
// Back-compat exports (kept so existing callers compile without edits)
// ============================================================================

export function evaluateConditionalFormatting(
  value: number | null,
  min: number,
  max: number,
  settings: ConditionalFormattingSettings
): CellStyle {
  // Simple entry point used by older call sites and tests. Ignores the
  // new rule list; goes straight through the legacy algorithm.
  const ctx: EvaluationContext = {
    value,
    measureIndex: 0,
    isSubtotal: false,
    isGrandTotal: false,
    isColumnGrandTotal: false,
    getStatsForMeasure: () => ({ min, max }),
    getValueForMeasure: () => value,
  };
  return legacyEvaluate(ctx, settings);
}

export function computeVisibleRangeStats(values: (number | null)[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value !== null && !Number.isNaN(value)) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}

// ============================================================================
// Color utilities
// ============================================================================

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return null;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function contrastingText(bg: string): string {
  const rgb = hexToRgb(bg);
  if (!rgb) return "#000000";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function getContrastColor(backgroundColor: string): string {
  return contrastingText(backgroundColor);
}

// ============================================================================
// Built-in color-scheme presets (matches the Inforiver-style swatch picker)
// ============================================================================

export const COLOR_SCHEME_PRESETS: { id: string; name: string; colors: string[] }[] = [
  { id: "blue-sequential", name: "Blue Sequential", colors: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"] },
  { id: "green-sequential", name: "Green Sequential", colors: ["#f0fdf4", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"] },
  { id: "red-sequential", name: "Red Sequential", colors: ["#fef2f2", "#fecaca", "#f87171", "#dc2626", "#7f1d1d"] },
  { id: "orange-sequential", name: "Orange Sequential", colors: ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#7c2d12"] },
  { id: "purple-sequential", name: "Purple Sequential", colors: ["#faf5ff", "#e9d5ff", "#c084fc", "#9333ea", "#581c87"] },
  { id: "grey-sequential", name: "Grey Sequential", colors: ["#f9fafb", "#e5e7eb", "#9ca3af", "#4b5563", "#111827"] },
  { id: "red-yellow-green", name: "Red-Yellow-Green", colors: ["#dc2626", "#facc15", "#16a34a"] },
  { id: "green-yellow-red", name: "Green-Yellow-Red", colors: ["#16a34a", "#facc15", "#dc2626"] },
  { id: "red-white-green", name: "Red-White-Green", colors: ["#dc2626", "#ffffff", "#16a34a"] },
  { id: "blue-white-red", name: "Blue-White-Red", colors: ["#2563eb", "#ffffff", "#dc2626"] },
];

// Legacy cache API (kept for existing Matrix.tsx call sites) ------------------

export interface CachedConditionalStyles {
  styles: Map<string, CellStyle>;
  stats: Map<number, { min: number; max: number }>;
}

export function createConditionalStyleCache(): CachedConditionalStyles {
  return { styles: new Map(), stats: new Map() };
}

export function getCachedStyle(
  cache: CachedConditionalStyles,
  cellKey: string,
  value: number | null,
  measureIndex: number,
  settings: ConditionalFormattingSettings,
  getStats: () => { min: number; max: number }
): CellStyle {
  if (!settings.enabled) return {};
  const cached = cache.styles.get(cellKey);
  if (cached) return cached;
  let stats = cache.stats.get(measureIndex);
  if (!stats) {
    stats = getStats();
    cache.stats.set(measureIndex, stats);
  }
  const style = evaluateConditionalFormatting(value, stats.min, stats.max, settings);
  cache.styles.set(cellKey, style);
  return style;
}

export function invalidateCache(cache: CachedConditionalStyles): void {
  cache.styles.clear();
  cache.stats.clear();
}
