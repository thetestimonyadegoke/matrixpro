/**
 * Theme token system for the Matrix visual
 * Provides a consistent design language with built-in presets
 */
import { ThemePresetId } from "../settings/settings";
import { getThemeSpec, THEME_ORDER } from "../ui/themes";
export type { ThemePresetId } from "../settings/settings";

export interface ThemeTokens {
  // Identity
  id: string;
  name: string;
  description: string;

  // Colors - Surfaces
  surfacePrimary: string;
  surfaceElevated: string;
  surfaceSubtle: string;

  // Colors - Borders
  borderSubtle: string;
  borderStrong: string;

  // Colors - Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Colors - Accent
  accentPrimary: string;
  accentSecondary: string;
  accentMuted: string;

  // Colors - Selection & Hover
  selectionBackground: string;
  hoverBackground: string;

  // Colors - Totals
  totalRowBackground: string;
  subtotalRowBackground: string;
  grandTotalRowBackground: string;

  // Colors - Conditional formatting defaults
  conditionalLow: string;
  conditionalMid: string;
  conditionalHigh: string;

  // Colors - Data bars
  dataBarPositive: string;
  dataBarNegative: string;

  // Typography
  fontFamily: string;
  fontSizeSmall: number;
  fontSizeBase: number;
  fontSizeLarge: number;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightBold: number;

  // Spacing
  rowHeightCompact: number;
  rowHeightComfortable: number;
  cellPaddingX: number;
  cellPaddingY: number;

  // Grid
  gridlineWidth: number;
  gridlineColor: string;
  bandingAlpha: number;

  // Radius
  borderRadius: number;

  // Shadows
  shadowSubtle: string;
  shadowElevated: string;
  shadowInteractive: string;
}

export type ThemeDensity = "compact" | "comfortable";

function alpha(color: string, opacity: number): string {
  if (color.startsWith("rgba(") || color.startsWith("hsla(")) return color;
  if (!color.startsWith("#")) return color;

  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex.split("").map(ch => ch + ch).join("");
  }
  if (hex.length !== 6) return color;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function isDark(color: string): boolean {
  if (!color.startsWith("#")) return false;
  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex.split("").map(ch => ch + ch).join("");
  }
  if (hex.length !== 6) return false;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45;
}

function buildThemeTokens(id: ThemePresetId): ThemeTokens {
  const spec = getThemeSpec(id);
  const dark = isDark(spec.cellBg ?? spec.rowBandEven);
  const compactHeight = id === "dense-grid"
    ? 20
    : id === "apple-glass"
      ? 34
      : id === "minimal-whitespace"
        ? 30
        : 24;
  const comfortableHeight = id === "dense-grid"
    ? 26
    : id === "apple-glass"
      ? 48
      : id === "minimal-whitespace"
        ? 40
        : id === "finance-annual-report"
          ? 34
          : 32;
  const cellPaddingX = id === "apple-glass"
    ? 20
    : id === "minimal-whitespace"
      ? 16
      : id === "dense-grid"
        ? 6
        : 8;

  return {
    id,
    name: spec.label,
    description: spec.description,
    surfacePrimary: spec.cellBg ?? spec.rowBandEven,
    surfaceElevated: spec.headerBg,
    surfaceSubtle: spec.rowBandOdd,
    borderSubtle: spec.gridColor,
    borderStrong: spec.gridColor === "transparent" ? alpha(spec.accent, 0.18) : spec.gridColor,
    textPrimary: spec.cellFg,
    textSecondary: alpha(spec.cellFg, dark ? 0.82 : 0.72),
    textMuted: alpha(spec.cellFg, dark ? 0.62 : 0.5),
    accentPrimary: spec.accent,
    accentSecondary: alpha(spec.accent, 0.78),
    accentMuted: alpha(spec.accent, 0.14),
    selectionBackground: alpha(spec.accent, dark ? 0.2 : 0.12),
    hoverBackground: dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
    totalRowBackground: spec.totalBg,
    subtotalRowBackground: spec.totalBg,
    grandTotalRowBackground: spec.totalBg,
    conditionalLow: "#dc2626",
    conditionalMid: "#f59e0b",
    conditionalHigh: "#16a34a",
    dataBarPositive: "#16a34a",
    dataBarNegative: "#dc2626",
    fontFamily: spec.fontFamily,
    fontSizeSmall: id === "dense-grid" ? 9 : 10,
    fontSizeBase: id === "dense-grid" ? 11 : 12,
    fontSizeLarge: id === "dense-grid" ? 13 : 14,
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: spec.headerFontWeight,
    rowHeightCompact: compactHeight,
    rowHeightComfortable: comfortableHeight,
    cellPaddingX,
    cellPaddingY: id === "apple-glass" ? 10 : id === "dense-grid" ? 3 : 4,
    gridlineWidth: spec.borderStyle === "none" || spec.gridColor === "transparent" ? 0 : 1,
    gridlineColor: spec.gridColor,
    bandingAlpha: spec.rowBandEven === spec.rowBandOdd ? 0 : 0.03,
    borderRadius: id === "apple-glass" ? 14 : id === "tableau-like" ? 2 : 6,
    shadowSubtle: dark ? "0 1px 2px rgba(0, 0, 0, 0.35)" : "0 1px 2px rgba(0, 0, 0, 0.06)",
    shadowElevated: dark ? "0 8px 24px rgba(0, 0, 0, 0.42)" : "0 8px 24px rgba(0, 0, 0, 0.12)",
    shadowInteractive: dark ? "0 12px 32px rgba(0, 0, 0, 0.55)" : "0 12px 32px rgba(0, 0, 0, 0.16)",
  };
}

export const themePresets: Record<ThemePresetId, ThemeTokens> = THEME_ORDER.reduce((acc, id) => {
  acc[id] = buildThemeTokens(id);
  return acc;
}, {} as Record<ThemePresetId, ThemeTokens>);

export function getThemePreset(id: ThemePresetId): ThemeTokens {
  return themePresets[id] || themePresets["modern-light"];
}

export function getThemePresetList(): Array<{ id: ThemePresetId; name: string; description: string }> {
  return Object.values(themePresets).map(t => ({
    id: t.id as ThemePresetId,
    name: t.name,
    description: t.description,
  }));
}

export function applyThemeTokensToElement(element: HTMLElement, tokens: ThemeTokens): void {
  const style = element.style;
  const spec = getThemeSpec(tokens.id as ThemePresetId);

  // Surfaces
  style.setProperty("--mx-surface", tokens.surfacePrimary);
  style.setProperty("--mx-surface-elevated", tokens.surfaceElevated);
  style.setProperty("--mx-surface-subtle", tokens.surfaceSubtle);

  // Borders
  style.setProperty("--mx-border", tokens.borderSubtle);
  style.setProperty("--mx-border-strong", tokens.borderStrong);

  // Text
  style.setProperty("--mx-text", tokens.textPrimary);
  style.setProperty("--mx-text-secondary", tokens.textSecondary);
  style.setProperty("--mx-text-muted", tokens.textMuted);
  style.setProperty("--mx-text-inverse", isDark(tokens.surfacePrimary) ? "#ffffff" : "#111827");
  style.setProperty("--mx-cell-fg", spec.cellFg);
  style.setProperty("--mx-cell-bg", spec.cellBg ?? spec.rowBandEven);
  style.setProperty("--mx-header-bg", spec.headerBg);
  style.setProperty("--mx-header-fg", spec.headerFg);
  style.setProperty("--mx-total-fg", spec.totalFg);
  style.setProperty("--mx-row-even", spec.rowBandEven);
  style.setProperty("--mx-row-odd", spec.rowBandOdd);

  // Accent
  style.setProperty("--mx-accent", tokens.accentPrimary);
  style.setProperty("--mx-accent-secondary", tokens.accentSecondary);
  style.setProperty("--mx-accent-muted", tokens.accentMuted);

  // Selection & Hover
  style.setProperty("--mx-selection-bg", tokens.selectionBackground);
  style.setProperty("--mx-hover-bg", tokens.hoverBackground);

  // Totals
  style.setProperty("--mx-total-bg", tokens.totalRowBackground);
  style.setProperty("--mx-subtotal-bg", tokens.subtotalRowBackground);
  style.setProperty("--mx-grandtotal-bg", tokens.grandTotalRowBackground);

  // Conditional
  style.setProperty("--mx-cond-low", tokens.conditionalLow);
  style.setProperty("--mx-cond-mid", tokens.conditionalMid);
  style.setProperty("--mx-cond-high", tokens.conditionalHigh);

  // Data bars
  style.setProperty("--mx-databar-pos", tokens.dataBarPositive);
  style.setProperty("--mx-databar-neg", tokens.dataBarNegative);

  // Typography
  style.setProperty("--mx-font-family", tokens.fontFamily);
  style.setProperty("--mx-font-size-sm", `${tokens.fontSizeSmall}px`);
  style.setProperty("--mx-font-size-base", `${tokens.fontSizeBase}px`);
  style.setProperty("--mx-font-size-lg", `${tokens.fontSizeLarge}px`);

  // Spacing
  style.setProperty("--mx-row-height-compact", `${tokens.rowHeightCompact}px`);
  style.setProperty("--mx-row-height-comfortable", `${tokens.rowHeightComfortable}px`);
  style.setProperty("--mx-cell-px", `${tokens.cellPaddingX}px`);
  style.setProperty("--mx-cell-py", `${tokens.cellPaddingY}px`);

  // Grid
  style.setProperty("--mx-gridline-width", `${tokens.gridlineWidth}px`);
  style.setProperty("--mx-gridline-color", tokens.gridlineColor);
  style.setProperty("--mx-banding-alpha", String(tokens.bandingAlpha));

  // Radius
  style.setProperty("--mx-radius", `${tokens.borderRadius}px`);

  // Shadows
  style.setProperty("--mx-shadow-subtle", tokens.shadowSubtle);
  style.setProperty("--mx-shadow-elevated", tokens.shadowElevated);
  style.setProperty("--mx-shadow-interactive", tokens.shadowInteractive);

  // Shared panel / modal tokens so overlays inherit the active theme too.
  style.setProperty("--mx-panel-bg", tokens.surfacePrimary);
  style.setProperty("--mx-panel-bg-elevated", tokens.surfaceElevated);
  style.setProperty("--mx-panel-muted-bg", tokens.surfaceSubtle);
  style.setProperty("--mx-panel-border", tokens.borderSubtle);
  style.setProperty("--mx-panel-text", tokens.textPrimary);
  style.setProperty("--mx-panel-text-muted", tokens.textSecondary);
  style.setProperty("--mx-overlay-scrim", "rgba(15, 23, 42, 0.38)");
  style.setProperty("--mx-danger", "#dc2626");
  style.setProperty("--mx-danger-muted", "rgba(220, 38, 38, 0.12)");
  style.setProperty("--mx-success", "#16a34a");
}
