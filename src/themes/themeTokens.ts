/**
 * Theme token system for the Matrix visual
 * Provides a consistent design language with built-in presets
 */

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

export type ThemePresetId =
  | "modern-light"
  | "modern-dark"
  | "finance-statement"
  | "minimal"
  | "tableau-like"
  | "figma-like"
  | "apple-glass";

export type ThemeDensity = "compact" | "comfortable";

const baseTypography = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSizeSmall: 10,
  fontSizeBase: 12,
  fontSizeLarge: 14,
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
};

const baseSpacing = {
  rowHeightCompact: 24,
  rowHeightComfortable: 32,
  cellPaddingX: 8,
  cellPaddingY: 4,
};

const baseRadius = {
  borderRadius: 6,
};

export const themePresets: Record<ThemePresetId, ThemeTokens> = {
  "modern-light": {
    id: "modern-light",
    name: "Modern Light",
    description: "Clean, bright design with subtle shadows",
    surfacePrimary: "#ffffff",
    surfaceElevated: "#fafafa",
    surfaceSubtle: "#f5f5f5",
    borderSubtle: "#e5e5e5",
    borderStrong: "#d0d0d0",
    textPrimary: "#1a1a1a",
    textSecondary: "#4a4a4a",
    textMuted: "#8a8a8a",
    accentPrimary: "#2563eb",
    accentSecondary: "#3b82f6",
    accentMuted: "rgba(37, 99, 235, 0.12)",
    selectionBackground: "rgba(37, 99, 235, 0.08)",
    hoverBackground: "rgba(0, 0, 0, 0.04)",
    totalRowBackground: "#f0f0f0",
    subtotalRowBackground: "#f5f5f5",
    grandTotalRowBackground: "#e8e8e8",
    conditionalLow: "#ef4444",
    conditionalMid: "#f59e0b",
    conditionalHigh: "#22c55e",
    dataBarPositive: "#22c55e",
    dataBarNegative: "#ef4444",
    gridlineWidth: 1,
    gridlineColor: "rgba(0, 0, 0, 0.08)",
    bandingAlpha: 0.03,
    shadowSubtle: "0 1px 2px rgba(0, 0, 0, 0.05)",
    shadowElevated: "0 4px 12px rgba(0, 0, 0, 0.1)",
    shadowInteractive: "0 8px 24px rgba(0, 0, 0, 0.12)",
    ...baseTypography,
    ...baseSpacing,
    ...baseRadius,
  },

  "modern-dark": {
    id: "modern-dark",
    name: "Modern Dark",
    description: "Sleek dark mode with vibrant accents",
    surfacePrimary: "#1a1a1a",
    surfaceElevated: "#242424",
    surfaceSubtle: "#2a2a2a",
    borderSubtle: "#3a3a3a",
    borderStrong: "#4a4a4a",
    textPrimary: "#f5f5f5",
    textSecondary: "#c0c0c0",
    textMuted: "#808080",
    accentPrimary: "#3b82f6",
    accentSecondary: "#60a5fa",
    accentMuted: "rgba(59, 130, 246, 0.2)",
    selectionBackground: "rgba(59, 130, 246, 0.15)",
    hoverBackground: "rgba(255, 255, 255, 0.05)",
    totalRowBackground: "#2a2a2a",
    subtotalRowBackground: "#252525",
    grandTotalRowBackground: "#303030",
    conditionalLow: "#f87171",
    conditionalMid: "#fbbf24",
    conditionalHigh: "#4ade80",
    dataBarPositive: "#4ade80",
    dataBarNegative: "#f87171",
    gridlineWidth: 1,
    gridlineColor: "rgba(255, 255, 255, 0.08)",
    bandingAlpha: 0.04,
    shadowSubtle: "0 1px 2px rgba(0, 0, 0, 0.3)",
    shadowElevated: "0 4px 12px rgba(0, 0, 0, 0.4)",
    shadowInteractive: "0 12px 32px rgba(0, 0, 0, 0.5)",
    ...baseTypography,
    ...baseSpacing,
    ...baseRadius,
  },

  "finance-statement": {
    id: "finance-statement",
    name: "Finance Statement",
    description: "Professional financial reporting style",
    surfacePrimary: "#ffffff",
    surfaceElevated: "#fafafa",
    surfaceSubtle: "#f8f8f8",
    borderSubtle: "#e0e0e0",
    borderStrong: "#c0c0c0",
    textPrimary: "#000000",
    textSecondary: "#333333",
    textMuted: "#666666",
    accentPrimary: "#1e40af",
    accentSecondary: "#2563eb",
    accentMuted: "rgba(30, 64, 175, 0.1)",
    selectionBackground: "rgba(30, 64, 175, 0.08)",
    hoverBackground: "rgba(0, 0, 0, 0.02)",
    totalRowBackground: "#e8e8e8",
    subtotalRowBackground: "#f0f0f0",
    grandTotalRowBackground: "#d8d8d8",
    conditionalLow: "#dc2626",
    conditionalMid: "#ca8a04",
    conditionalHigh: "#16a34a",
    dataBarPositive: "#16a34a",
    dataBarNegative: "#dc2626",
    gridlineWidth: 1,
    gridlineColor: "rgba(0, 0, 0, 0.12)",
    bandingAlpha: 0.02,
    shadowSubtle: "none",
    shadowElevated: "0 2px 8px rgba(0, 0, 0, 0.08)",
    shadowInteractive: "0 4px 12px rgba(0, 0, 0, 0.12)",
    ...baseTypography,
    fontFamily: "'Times New Roman', Georgia, serif",
    ...baseSpacing,
    rowHeightCompact: 22,
    rowHeightComfortable: 28,
    ...baseRadius,
    borderRadius: 0,
  },

  "minimal": {
    id: "minimal",
    name: "Minimal",
    description: "Clean and spacious with no gridlines",
    surfacePrimary: "#ffffff",
    surfaceElevated: "#ffffff",
    surfaceSubtle: "#fafafa",
    borderSubtle: "transparent",
    borderStrong: "#e5e5e5",
    textPrimary: "#171717",
    textSecondary: "#525252",
    textMuted: "#a3a3a3",
    accentPrimary: "#0ea5e9",
    accentSecondary: "#38bdf8",
    accentMuted: "rgba(14, 165, 233, 0.1)",
    selectionBackground: "rgba(14, 165, 233, 0.06)",
    hoverBackground: "rgba(0, 0, 0, 0.02)",
    totalRowBackground: "#f5f5f5",
    subtotalRowBackground: "#fafafa",
    grandTotalRowBackground: "#f0f0f0",
    conditionalLow: "#f43f5e",
    conditionalMid: "#eab308",
    conditionalHigh: "#10b981",
    dataBarPositive: "#10b981",
    dataBarNegative: "#f43f5e",
    gridlineWidth: 0,
    gridlineColor: "transparent",
    bandingAlpha: 0,
    shadowSubtle: "none",
    shadowElevated: "0 8px 24px rgba(0, 0, 0, 0.06)",
    shadowInteractive: "0 12px 32px rgba(0,0,0,0.08)",
    ...baseTypography,
    ...baseSpacing,
    rowHeightCompact: 28,
    rowHeightComfortable: 36,
    cellPaddingX: 12,
    ...baseRadius,
    borderRadius: 8,
  },

  "tableau-like": {
    id: "tableau-like",
    name: "Tableau Enterprise",
    description: "Data-dense, high-contrast, professional",
    surfacePrimary: "#ffffff",
    surfaceElevated: "#f5f5f5",
    surfaceSubtle: "#e6e6e6",
    borderSubtle: "#d3d3d3",
    borderStrong: "#a0a0a0",
    textPrimary: "#1f2937",
    textSecondary: "#4b5563",
    textMuted: "#9ca3af",
    accentPrimary: "#286c99",
    accentSecondary: "#2d7db0",
    accentMuted: "rgba(40, 108, 153, 0.15)",
    selectionBackground: "rgba(40, 108, 153, 0.12)",
    hoverBackground: "rgba(0, 0, 0, 0.04)",
    totalRowBackground: "#f3f4f6",
    subtotalRowBackground: "#f9fafb",
    grandTotalRowBackground: "#e5e7eb",
    conditionalLow: "#d64541",
    conditionalMid: "#f0ad4e",
    conditionalHigh: "#5cb85c",
    dataBarPositive: "#5cb85c",
    dataBarNegative: "#d64541",
    gridlineWidth: 1,
    gridlineColor: "#e0e0e0",
    bandingAlpha: 0.0,
    shadowSubtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    shadowElevated: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    shadowInteractive: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    ...baseTypography,
    fontFamily: "'Benton Sans', 'Segoe UI', sans-serif",
    fontSizeBase: 13,
    ...baseSpacing,
    rowHeightCompact: 24,
    rowHeightComfortable: 30,
    ...baseRadius,
    borderRadius: 2,
  },

  "figma-like": {
    id: "figma-like",
    name: "Design Canvas",
    description: "Modern, flat, vector-like aesthetic",
    surfacePrimary: "#1e1e1e",
    surfaceElevated: "#2c2c2c",
    surfaceSubtle: "#252525",
    borderSubtle: "#383838",
    borderStrong: "#444444",
    textPrimary: "#ffffff",
    textSecondary: "#bebebe",
    textMuted: "#757575",
    accentPrimary: "#0C8CE9",
    accentSecondary: "#199af2",
    accentMuted: "rgba(12, 140, 233, 0.2)",
    selectionBackground: "rgba(12, 140, 233, 0.25)",
    hoverBackground: "rgba(255, 255, 255, 0.08)",
    totalRowBackground: "#2c2c2c",
    subtotalRowBackground: "#252525",
    grandTotalRowBackground: "#333333",
    conditionalLow: "#ff4d4d",
    conditionalMid: "#ffc107",
    conditionalHigh: "#00c853",
    dataBarPositive: "#00c853",
    dataBarNegative: "#ff4d4d",
    gridlineWidth: 1,
    gridlineColor: "#383838",
    bandingAlpha: 0,
    shadowSubtle: "0 2px 4px rgba(0,0,0,0.2)",
    shadowElevated: "0 8px 16px rgba(0,0,0,0.4)",
    shadowInteractive: "0 16px 40px rgba(0,0,0,0.6)",
    ...baseTypography,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    ...baseSpacing,
    rowHeightCompact: 28,
    rowHeightComfortable: 36,
    ...baseRadius,
    borderRadius: 6,
  },

  "apple-glass": {
    id: "apple-glass",
    name: "Cupertino Glass",
    description: "Premium frosted glass, blur effects, refined typography",
    surfacePrimary: "rgba(255, 255, 255, 0.85)", // Glass effect base
    surfaceElevated: "rgba(255, 255, 255, 0.95)",
    surfaceSubtle: "rgba(245, 245, 247, 0.6)",
    borderSubtle: "rgba(0, 0, 0, 0.1)", // Very subtle borders
    borderStrong: "rgba(0, 0, 0, 0.2)",
    textPrimary: "#1d1d1f", // SF Pro Black
    textSecondary: "#86868b", // SF Pro Gray
    textMuted: "#a1a1a6",
    accentPrimary: "#0071e3", // Apple Blue
    accentSecondary: "#2997ff",
    accentMuted: "rgba(0, 113, 227, 0.1)",
    selectionBackground: "rgba(0, 113, 227, 0.12)",
    hoverBackground: "rgba(0, 0, 0, 0.03)",
    totalRowBackground: "rgba(245, 245, 247, 0.8)",
    subtotalRowBackground: "rgba(250, 250, 252, 0.8)",
    grandTotalRowBackground: "rgba(240, 240, 242, 0.9)",
    conditionalLow: "#ff3b30",
    conditionalMid: "#ffcc00",
    conditionalHigh: "#34c759",
    dataBarPositive: "#34c759",
    dataBarNegative: "#ff3b30",
    gridlineWidth: 0, // No visible grid lines for clean look
    gridlineColor: "transparent",
    bandingAlpha: 0.02,
    shadowSubtle: "0 4px 12px rgba(0, 0, 0, 0.04)",
    shadowElevated: "0 12px 24px rgba(0, 0, 0, 0.08)",
    shadowInteractive: "0 20px 48px rgba(0, 0, 0, 0.12)",
    ...baseTypography,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
    fontSizeBase: 13,
    fontWeightMedium: 600,
    ...baseSpacing,
    rowHeightCompact: 34,
    rowHeightComfortable: 48,
    cellPaddingX: 20,
    cellPaddingY: 10,
    ...baseRadius,
    borderRadius: 14,
  },

};

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
}
