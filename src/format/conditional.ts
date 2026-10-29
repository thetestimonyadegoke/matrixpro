import { ConditionalFormattingSettings } from "../settings/settings";
import { secureRandomId } from "../model/keys";

// ============================================================================
// Types
// ============================================================================

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string; // for underline
  /** Hatched pattern style */
  hatched?: boolean;
  /** Icon from a classification rule */
  icon?: ClassificationIcon;
  /** Where to place the icon relative to the value text */
  iconPosition?: "leftOfData" | "rightOfData";
  /** Data bar fill percentage (0–100) injected by a CF data bar rule */
  dataBarPct?: number;
  /** Data bar color from CF rule */
  dataBarColor?: string;
  /** Hide the numeric/text value while leaving icon/fill/border visible */
  hideText?: boolean;
  borderColor?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderWidth?: number;
}

export type ClassificationIcon =
  | { kind: ClassificationIconKind; color: string }
  | { kind: "custom"; src: string; color?: string; name?: string }
  | { kind: "text"; label: string; color: string };

export type ClassificationIconKind =
  | "check"
  | "warn"
  | "cross"
  | "up"
  | "down"
  | "flat"
  | "upRight"
  | "downRight"
  | "profit"
  | "loss"
  | "target"
  | "flag"
  | "risk"
  | "cash"
  | "debt"
  | "margin"
  | "variance"
  | "forecast"
  | "budget"
  | "chevronLeft"
  | "chevronRight"
  | "triangleUp"
  | "triangleDown"
  | "caretUp"
  | "caretDown"
  | "doubleUp"
  | "doubleDown"
  | "flagOutline"
  | "flagFilled"
  | "outlineSquare"
  | "filledSquare"
  | "quarterCircle"
  | "halfCircle"
  | "pie"
  | "emptyCircle"
  | "quarterFilledCircle"
  | "halfFilledCircle"
  | "threeQuarterCircle"
  | "filledCircle"
  | "diamond"
  | "heart"
  | "bulb"
  | "info"
  | "bold"
  | "underline"
  | "italic"
  | "checkCircle"
  | "crossCircle"
  | "starOutline"
  | "starHalf"
  | "starFilled";

export interface ClassificationIconSet {
  id: string;
  name: string;
  icons: ClassificationIconKind[];
}

/**
 * A rule's scope controls which cells it applies to. It mirrors the Inforiver
 * "Apply to" / "Row hierarchy levels" / "Exclude" block from the reference UI.
 */
export interface RuleScope {
  targetType: "rows" | "columns" | "rowHeaders" | "columnHeaders";
  /**
   * Measure index the rule targets. -1 means "all measures".
   */
  targetMeasure: number;
  /**
   * Multiple target measures. When omitted, targetMeasure is used.
   */
  targetMeasures?: number[];
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
export type ColorScaleApplyTo = "background" | "foreground" | "both" | "dataBar";

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
  iconKind: ClassificationIconKind;
  icon?: ClassificationIcon;
  color: string;
}

export interface ClassificationConfig {
  impactOn: ("label" | "chart")[];
  basedOnMeasure: number;
  displayIcons: boolean;
  showValueText?: boolean;
  iconSet?: string;
  applyToCharts: boolean;
  showAsNewColumn: boolean;
  iconPosition: "leftOfData" | "rightOfData";
  rangeMode: ClassificationRangeMode;
  ranges: ClassificationRange[];
}

export const CLASSIFICATION_ICON_SETS: ClassificationIconSet[] = [
  { id: "variance-arrows", name: "Variance arrows", icons: ["down", "flat", "up"] },
  { id: "trend-arrows", name: "Trend arrows", icons: ["downRight", "flat", "upRight"] },
  { id: "profit-loss", name: "Profit / loss", icons: ["loss", "flat", "profit"] },
  { id: "target-status", name: "Target status", icons: ["cross", "warn", "check"] },
  { id: "budget-control", name: "Budget control", icons: ["cross", "warn", "budget"] },
  { id: "cash-flow", name: "Cash flow", icons: ["debt", "flat", "cash"] },
  { id: "risk-rating", name: "Risk rating", icons: ["risk", "warn", "check"] },
  { id: "margin-health", name: "Margin health", icons: ["loss", "warn", "margin"] },
  { id: "forecast-confidence", name: "Forecast confidence", icons: ["cross", "warn", "forecast"] },
  { id: "revenue-growth", name: "Revenue growth", icons: ["downRight", "flat", "upRight"] },
  { id: "expense-control", name: "Expense control", icons: ["up", "flat", "down"] },
  { id: "working-capital", name: "Working capital", icons: ["debt", "warn", "cash"] },
  { id: "audit-status", name: "Audit status", icons: ["cross", "flag", "check"] },
  { id: "liquidity", name: "Liquidity", icons: ["risk", "flat", "cash"] },
  { id: "covenant", name: "Covenant compliance", icons: ["risk", "warn", "check"] },
];

export const CLASSIFICATION_ICON_OPTIONS: { kind: ClassificationIconKind; label: string }[] = [
  { kind: "check", label: "Check" },
  { kind: "warn", label: "Warning" },
  { kind: "cross", label: "Cross" },
  { kind: "up", label: "Up arrow" },
  { kind: "down", label: "Down arrow" },
  { kind: "flat", label: "Flat" },
  { kind: "upRight", label: "Up-right trend" },
  { kind: "downRight", label: "Down-right trend" },
  { kind: "profit", label: "Profit" },
  { kind: "loss", label: "Loss" },
  { kind: "target", label: "Target" },
  { kind: "flag", label: "Flag" },
  { kind: "risk", label: "Risk" },
  { kind: "cash", label: "Cash" },
  { kind: "debt", label: "Debt" },
  { kind: "margin", label: "Margin" },
  { kind: "variance", label: "Variance" },
  { kind: "forecast", label: "Forecast" },
  { kind: "budget", label: "Budget" },
  { kind: "chevronLeft", label: "Chevron left" },
  { kind: "chevronRight", label: "Chevron right" },
  { kind: "triangleUp", label: "Triangle up" },
  { kind: "triangleDown", label: "Triangle down" },
  { kind: "caretUp", label: "Caret up" },
  { kind: "caretDown", label: "Caret down" },
  { kind: "doubleUp", label: "Double up" },
  { kind: "doubleDown", label: "Double down" },
  { kind: "flagOutline", label: "Flag outline" },
  { kind: "flagFilled", label: "Flag filled" },
  { kind: "outlineSquare", label: "Outline square" },
  { kind: "filledSquare", label: "Filled square" },
  { kind: "quarterCircle", label: "Quarter circle" },
  { kind: "halfCircle", label: "Half circle" },
  { kind: "pie", label: "Pie" },
  { kind: "emptyCircle", label: "Empty circle" },
  { kind: "quarterFilledCircle", label: "Quarter-filled circle" },
  { kind: "halfFilledCircle", label: "Half-filled circle" },
  { kind: "threeQuarterCircle", label: "Three-quarter circle" },
  { kind: "filledCircle", label: "Filled circle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "heart", label: "Heart" },
  { kind: "bulb", label: "Bulb" },
  { kind: "info", label: "Info" },
  { kind: "bold", label: "Bold" },
  { kind: "underline", label: "Underline" },
  { kind: "italic", label: "Italic" },
  { kind: "checkCircle", label: "Check circle" },
  { kind: "crossCircle", label: "Cross circle" },
  { kind: "starOutline", label: "Star outline" },
  { kind: "starHalf", label: "Half star" },
  { kind: "starFilled", label: "Filled star" },
];

// --- Format-by: Data Bars ----------------------------------------------------

export interface DataBarsConfig {
  basedOnMeasure: number;
  positiveColor: string;
  negativeColor: string;
  axisPosition: "auto" | "middle" | "left" | "right";
  showBarOnly: boolean;
  barDirection: "leftToRight" | "rightToLeft";
}

// --- Format-by: Ranking ------------------------------------------------------

export interface RankingConfig {
  basedOnMeasure: number;
  topCount: number;
  mode: "top" | "bottom" | "both";
  usePercentage: boolean;
  style: CellStyle;
  impactOn: ("label" | "chart")[];
}

// --- Top-level rule -----------------------------------------------------------

export type FormatBy = "rules" | "colorScale" | "classification" | "dataBars" | "ranking";

export interface ConditionalRule {
  id: string;
  title: string;
  enabled: boolean;
  scope: RuleScope;
  formatBy: FormatBy;
  rulesConfig?: RulesFormatConfig;
  colorScaleConfig?: ColorScaleConfig;
  classificationConfig?: ClassificationConfig;
  dataBarsConfig?: DataBarsConfig;
  rankingConfig?: RankingConfig;
}

// ============================================================================
// Public helpers
// ============================================================================

export function parseRules(settings: ConditionalFormattingSettings): ConditionalRule[] {
  try {
    const parsed = JSON.parse(settings.rules || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is ConditionalRule => !!r && typeof r === "object" && typeof r.id === "string")
      .map(normalizeRule);
  } catch {
    return [];
  }
}

const VALID_FORMAT_BY: FormatBy[] = ["rules", "colorScale", "classification", "dataBars", "ranking"];
const VALID_TARGET_TYPES: RuleScope["targetType"][] = ["rows", "columns", "rowHeaders", "columnHeaders"];
const VALID_ROW_LEVELS: RuleScope["rowHierarchyLevels"][] = ["valuesOnly", "totalsOnly", "valuesAndTotals"];
const VALID_RULE_OPS: RuleOp[] = ["greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "equals", "notEquals", "between"];
const VALID_IMPACT_TARGETS: Array<"label" | "chart"> = ["label", "chart"];
const VALID_HEAT_MAP_TYPES: HeatMapType[] = ["columnWise", "rowWise", "tableWise"];
const VALID_SCALE_TYPES: ColorScaleType[] = ["sequential", "diverging"];
const VALID_SCALE_APPLY: ColorScaleApplyTo[] = ["background", "foreground", "both", "dataBar"];
const VALID_RANGE_MODES: ClassificationRangeMode[] = ["value", "percentage"];
const VALID_ICON_POSITIONS: Array<"leftOfData" | "rightOfData"> = ["leftOfData", "rightOfData"];
const VALID_AXIS_POSITIONS: DataBarsConfig["axisPosition"][] = ["auto", "middle", "left", "right"];
const VALID_BAR_DIRECTIONS: DataBarsConfig["barDirection"][] = ["leftToRight", "rightToLeft"];
const VALID_RANKING_MODES: RankingConfig["mode"][] = ["top", "bottom", "both"];

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeTargetMeasures(value: unknown, fallback: number): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = Array.from(new Set(value
    .map(item => Math.trunc(finiteNumber(item, fallback)))
    .filter(item => item === -1 || item >= 0)));
  return normalized.length ? normalized : undefined;
}

function hexOr(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function normalizeImpactOn(value: unknown, fallback: ("label" | "chart")[]): ("label" | "chart")[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter((item): item is "label" | "chart" => VALID_IMPACT_TARGETS.includes(item as any));
  return next.length ? Array.from(new Set(next)) : fallback;
}

function normalizeIconKind(value: unknown, fallback: ClassificationIconKind): ClassificationIconKind {
  const valid = CLASSIFICATION_ICON_OPTIONS.some(option => option.kind === value);
  return valid ? value as ClassificationIconKind : fallback;
}

function normalizeIcon(value: unknown, fallbackColor: string, fallbackKind: ClassificationIconKind): ClassificationIcon | undefined {
  if (!isRecord(value)) return undefined;
  if (value.kind === "custom") {
    const src = typeof value.src === "string" ? value.src : "";
    if (!src) return undefined;
    return {
      kind: "custom",
      src,
      color: typeof value.color === "string" ? value.color : undefined,
      name: typeof value.name === "string" ? value.name : undefined,
    };
  }
  if (value.kind === "text") {
    return {
      kind: "text",
      label: typeof value.label === "string" && value.label ? value.label.slice(0, 4) : "A",
      color: hexOr(value.color, fallbackColor),
    };
  }
  return {
    kind: normalizeIconKind(value.kind, fallbackKind),
    color: hexOr(value.color, fallbackColor),
  };
}

function normalizeStyle(value: unknown, fallback: CellStyle): CellStyle {
  const raw = isRecord(value) ? value : {};
  const style: CellStyle = { ...fallback };
  if ("backgroundColor" in raw) style.backgroundColor = hexOr(raw.backgroundColor, fallback.backgroundColor ?? "#ffffff");
  if ("color" in raw) style.color = hexOr(raw.color, fallback.color ?? "#111827");
  if (typeof raw.fontWeight === "string") style.fontWeight = raw.fontWeight;
  if (typeof raw.fontStyle === "string") style.fontStyle = raw.fontStyle;
  if (typeof raw.textDecoration === "string") style.textDecoration = raw.textDecoration;
  if (typeof raw.hatched === "boolean") style.hatched = raw.hatched;
  if (raw.icon !== undefined) style.icon = normalizeIcon(raw.icon, style.color ?? "#111827", "check");
  style.iconPosition = enumOr(raw.iconPosition, VALID_ICON_POSITIONS, fallback.iconPosition ?? "leftOfData");
  if (typeof raw.hideText === "boolean") style.hideText = raw.hideText;
  if (raw.borderColor !== undefined) style.borderColor = hexOr(raw.borderColor, fallback.borderColor ?? "#94a3b8");
  style.borderStyle = enumOr(raw.borderStyle, ["none", "solid", "dashed", "dotted", "double"], fallback.borderStyle ?? "none");
  style.borderWidth = Math.max(0, finiteNumber(raw.borderWidth, fallback.borderWidth ?? 1));
  return style;
}

function normalizeConditions(value: unknown, fallback: RulesCondition[]): RulesCondition[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter(isRecord)
    .map((condition): RulesCondition => ({
      basedOnMeasure: Math.trunc(finiteNumber(condition.basedOnMeasure, -1)),
      op: enumOr(condition.op, VALID_RULE_OPS, "greaterThan"),
      value: finiteNumber(condition.value, 0),
      value2: condition.value2 === undefined ? undefined : finiteNumber(condition.value2, finiteNumber(condition.value, 0)),
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeColorScheme(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const colors = value.map((color, index) => hexOr(color, fallback[index] ?? fallback[fallback.length - 1] ?? "#ffffff"));
  return colors.length >= 2 ? colors : fallback;
}

/**
 * A range bound. Open-ended ranges use -Infinity / Infinity, which JSON writes as null, so a saved
 * rule may hold null, "Infinity" or "-Infinity" there. Returns undefined when the value is unusable.
 */
function parseRangeBound(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (value === "Infinity") return Infinity;
  if (value === "-Infinity") return -Infinity;
  return undefined;
}

function normalizeRanges(value: unknown, fallback: ClassificationRange[]): ClassificationRange[] {
  if (!Array.isArray(value)) return fallback;
  const records = value.filter(isRecord);
  const normalized = records.map((range, index): ClassificationRange => {
    const fallbackRange = fallback[Math.min(index, fallback.length - 1)];
    const color = hexOr(range.color, fallbackRange.color);
    const iconKind = normalizeIconKind(range.iconKind, fallbackRange.iconKind);
    const last = index === records.length - 1;
    const from = parseRangeBound(range.from);
    const to = parseRangeBound(range.to);
    return {
      // A missing bound at either end is the open end; between ranges it joins its neighbour.
      from: from ?? (index === 0 ? -Infinity : parseRangeBound(records[index - 1].to) ?? fallbackRange.from),
      to: to ?? (last ? Infinity : parseRangeBound(records[index + 1].from) ?? fallbackRange.to),
      iconKind,
      icon: normalizeIcon(range.icon, color, iconKind),
      color,
    };
  });
  return normalized.length ? normalized : fallback;
}

export function normalizeRule(rule: ConditionalRule): ConditionalRule {
  const base: ConditionalRule = {
    id: typeof rule.id === "string" && rule.id ? rule.id : `rule_${Date.now()}`,
    title: "Rule",
    enabled: true,
    scope: {
      targetType: "rows",
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
  const formatBy = enumOr((rule as any).formatBy, VALID_FORMAT_BY, "rules");
  const normalized: ConditionalRule = {
    ...base,
    ...rule,
    formatBy,
    title: typeof rule.title === "string" && rule.title.trim() ? rule.title : base.title,
    enabled: booleanOr((rule as any).enabled, true),
    scope: {
      ...base.scope,
      ...(isRecord(rule.scope) ? rule.scope : {}),
    },
  };
  normalized.scope = {
    targetType: enumOr(normalized.scope.targetType, VALID_TARGET_TYPES, "rows"),
    targetMeasure: Math.trunc(finiteNumber(normalized.scope.targetMeasure, -1)),
    targetMeasures: normalizeTargetMeasures((normalized.scope as any).targetMeasures, normalized.scope.targetMeasure),
    rowHierarchyLevels: enumOr(normalized.scope.rowHierarchyLevels, VALID_ROW_LEVELS, "valuesAndTotals"),
    excludeColumnGrandTotal: booleanOr(normalized.scope.excludeColumnGrandTotal, false),
  };
  if (normalized.scope.targetMeasures?.includes(-1)) {
    normalized.scope.targetMeasure = -1;
    normalized.scope.targetMeasures = [-1];
  }

  switch (normalized.formatBy) {
    case "rules":
      {
      const fallback = base.rulesConfig!;
      const cfg: Record<string, any> = isRecord(rule.rulesConfig) ? rule.rulesConfig : {};
      normalized.rulesConfig = {
        impactOn: normalizeImpactOn(cfg.impactOn, fallback.impactOn),
        conditions: normalizeConditions(cfg.conditions, fallback.conditions),
        style: normalizeStyle(cfg.style, fallback.style),
      };
      break;
      }
    case "colorScale":
      {
      const cfg: Record<string, any> = isRecord(rule.colorScaleConfig) ? rule.colorScaleConfig : {};
      normalized.colorScaleConfig = {
        basedOnMeasure: Math.trunc(finiteNumber(cfg.basedOnMeasure, -1)),
        applyTo: enumOr(cfg.applyTo, VALID_SCALE_APPLY, "background"),
        heatMapType: enumOr(cfg.heatMapType, VALID_HEAT_MAP_TYPES, "columnWise"),
        scaleType: enumOr(cfg.scaleType, VALID_SCALE_TYPES, "sequential"),
        colorScheme: normalizeColorScheme(cfg.colorScheme, COLOR_SCHEME_PRESETS[0].colors),
        reverse: booleanOr(cfg.reverse, false),
        numberOfBands: Math.max(0, Math.trunc(finiteNumber(cfg.numberOfBands, 5))),
        hideValue: booleanOr(cfg.hideValue, false),
        autoFontColor: booleanOr(cfg.autoFontColor, true),
        includeNull: booleanOr(cfg.includeNull, false),
      };
      break;
      }
    case "classification":
      {
      const fallbackRanges: ClassificationRange[] = [
        { from: -Infinity, to: -10, iconKind: "cross", color: "#dc2626" },
        { from: -10, to: 10, iconKind: "warn", color: "#eab308" },
        { from: 10, to: Infinity, iconKind: "check", color: "#16a34a" },
      ];
      const cfg: Record<string, any> = isRecord(rule.classificationConfig) ? rule.classificationConfig : {};
      normalized.classificationConfig = {
        impactOn: normalizeImpactOn(cfg.impactOn, ["label"]),
        basedOnMeasure: Math.trunc(finiteNumber(cfg.basedOnMeasure, -1)),
        displayIcons: booleanOr(cfg.displayIcons, true),
        showValueText: booleanOr(cfg.showValueText, true),
        iconSet: typeof cfg.iconSet === "string" && CLASSIFICATION_ICON_SETS.some(set => set.id === cfg.iconSet) ? cfg.iconSet : "target-status",
        applyToCharts: booleanOr(cfg.applyToCharts, true),
        showAsNewColumn: booleanOr(cfg.showAsNewColumn, false),
        iconPosition: enumOr(cfg.iconPosition, VALID_ICON_POSITIONS, "leftOfData"),
        rangeMode: enumOr(cfg.rangeMode, VALID_RANGE_MODES, "percentage"),
        ranges: normalizeRanges(cfg.ranges, fallbackRanges),
      };
      break;
      }
    case "dataBars":
      {
      const cfg: Record<string, any> = isRecord(rule.dataBarsConfig) ? rule.dataBarsConfig : {};
      normalized.dataBarsConfig = {
        basedOnMeasure: Math.trunc(finiteNumber(cfg.basedOnMeasure, -1)),
        positiveColor: hexOr(cfg.positiveColor, "#2563eb"),
        negativeColor: hexOr(cfg.negativeColor, "#dc2626"),
        axisPosition: enumOr(cfg.axisPosition, VALID_AXIS_POSITIONS, "auto"),
        showBarOnly: booleanOr(cfg.showBarOnly, false),
        barDirection: enumOr(cfg.barDirection, VALID_BAR_DIRECTIONS, "leftToRight"),
      };
      break;
      }
    case "ranking":
      {
      const cfg: Record<string, any> = isRecord(rule.rankingConfig) ? rule.rankingConfig : {};
      normalized.rankingConfig = {
        basedOnMeasure: Math.trunc(finiteNumber(cfg.basedOnMeasure, -1)),
        topCount: Math.max(1, finiteNumber(cfg.topCount, 10)),
        mode: enumOr(cfg.mode, VALID_RANKING_MODES, "top"),
        usePercentage: booleanOr(cfg.usePercentage, false),
        style: normalizeStyle(cfg.style, { color: "#1d4ed8", fontWeight: "600" }),
        impactOn: normalizeImpactOn(cfg.impactOn, ["label"]),
      };
      break;
      }
  }

  return normalized;
}

export function stringifyRules(rules: ConditionalRule[]): string {
  // JSON would turn the open ends of a classification range (±Infinity) into null; keep them readable.
  return JSON.stringify(rules, (_key, value) =>
    value === Infinity ? "Infinity" : value === -Infinity ? "-Infinity" : value
  );
}

export function newRuleId(): string {
  return `rule_${Date.now()}_${secureRandomId(6)}`;
}

export function defaultRule(title: string): ConditionalRule {
  return {
    id: newRuleId(),
    title,
    enabled: true,
    scope: {
      targetType: "rows",
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
  targetType?: RuleScope["targetType"];
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
  const targetType = ctx.targetType ?? "rows";

  if (scope.targetType !== targetType) {
    return false;
  }
  const targetMeasures = scope.targetMeasures && scope.targetMeasures.length > 0
    ? scope.targetMeasures
    : [scope.targetMeasure];
  if (!targetMeasures.includes(-1) && !targetMeasures.includes(ctx.measureIndex)) {
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
    case "dataBars":
      return evaluateDataBars(rule.dataBarsConfig, ctx);
    case "ranking":
      return evaluateRanking(rule.rankingConfig, ctx);
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
    if (cfg.style.textDecoration !== undefined) out.textDecoration = cfg.style.textDecoration;
  }
  if (cfg.style.hideText !== undefined) out.hideText = cfg.style.hideText;
  if (cfg.style.icon !== undefined) out.icon = cfg.style.icon;
  if (cfg.style.iconPosition !== undefined) out.iconPosition = cfg.style.iconPosition;
  if (cfg.style.borderColor !== undefined) out.borderColor = cfg.style.borderColor;
  if (cfg.style.borderStyle !== undefined) out.borderStyle = cfg.style.borderStyle;
  if (cfg.style.borderWidth !== undefined) out.borderWidth = cfg.style.borderWidth;
  if (cfg.style.backgroundColor !== undefined && (impactsChart || !cfg.impactOn.length || impactsLabel)) {
    if (cfg.style.backgroundColor !== undefined) out.backgroundColor = cfg.style.backgroundColor;
  }
  if (cfg.style.hatched !== undefined && (impactsChart || !cfg.impactOn.length || impactsLabel)) {
    out.hatched = cfg.style.hatched;
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
  if (cfg.applyTo === "dataBar") {
    // Render as an in-cell data bar using a CF-sourced color.
    out.dataBarPct = Math.round(t * 100);
    out.dataBarColor = color;
  } else {
    if (cfg.applyTo === "background" || cfg.applyTo === "both") {
      out.backgroundColor = color;
      if (cfg.autoFontColor) out.color = contrastingText(color);
    }
    if (cfg.applyTo === "foreground" || cfg.applyTo === "both") {
      out.color = color;
    }
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
    out.icon = matched.icon ?? { kind: matched.iconKind, color: matched.color };
    out.iconPosition = cfg.iconPosition ?? "leftOfData";
  }
  if (cfg.showValueText === false) {
    out.hideText = true;
  }
  if (cfg.impactOn.includes("label")) {
    out.color = matched.color;
  }
  if (cfg.impactOn.includes("chart")) {
    out.backgroundColor = matched.color;
  }
  return out;
}

// ==== Data Bars mode ==========================================================

function evaluateDataBars(
  cfg: DataBarsConfig | undefined,
  ctx: EvaluationContext
): CellStyle {
  if (!cfg) return {};
  const v = cfg.basedOnMeasure === -1
    ? ctx.value
    : ctx.getValueForMeasure(cfg.basedOnMeasure);
  if (v === null || Number.isNaN(v)) return {};

  const measureForStats = cfg.basedOnMeasure === -1 ? ctx.measureIndex : cfg.basedOnMeasure;
  const { min, max } = ctx.getStatsForMeasure(measureForStats, "columnWise");

  // Calculate relative percentage
  const isNegative = v < 0;
  const color = isNegative ? cfg.negativeColor : cfg.positiveColor;

  let pct = 0;
  if (min >= 0) {
    // All positive
    pct = (v / Math.max(0.0001, max)) * 100;
  } else if (max <= 0) {
    // All negative
    pct = (v / Math.min(-0.0001, min)) * 100;
  } else {
    // Mixed
    const m = Math.max(Math.abs(min), Math.abs(max));
    pct = (Math.abs(v) / m) * 50;
  }

  const out: CellStyle = {
    dataBarPct: Math.round(pct),
    dataBarColor: color,
  };

  if (cfg.showBarOnly) {
    out.color = "transparent"; // Hide value
  }

  return out;
}

// ---- Ranking mode -----------------------------------------------------------

function evaluateRanking(
  cfg: RankingConfig | undefined,
  ctx: EvaluationContext
): CellStyle {
  if (!cfg) return {};
  const v = cfg.basedOnMeasure === -1
    ? ctx.value
    : ctx.getValueForMeasure(cfg.basedOnMeasure);
  if (v === null || Number.isNaN(v)) return {};

  const measureForStats = cfg.basedOnMeasure === -1 ? ctx.measureIndex : cfg.basedOnMeasure;
  const { min, max } = ctx.getStatsForMeasure(measureForStats, "columnWise");
  const range = max - min;

  // Minimal heuristic for % based ranking if we don't have full data set here
  if (cfg.usePercentage) {
    const pct = range === 0 ? 0 : ((v - min) / range) * 100;
    let match = false;
    if (cfg.mode === "top") match = pct >= (100 - cfg.topCount);
    else if (cfg.mode === "bottom") match = pct <= cfg.topCount;
    else if (cfg.mode === "both") match = pct >= (100 - cfg.topCount) || pct <= cfg.topCount;

    if (match) return cfg.style;
  }

  // For absolute "Top N", a proper implementation would need the full sorted values list.
  // We'll treat it as a % placeholder for now or return empty style.
  return {};
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
  if (!settings.enabled) return {};
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
