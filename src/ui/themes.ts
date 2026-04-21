// -----------------------------------------------------------------------------
// Centralised theme registry.
//
// Each ThemePresetId maps to a ThemeSpec — a flat palette + typography bundle
// consumed by Matrix.tsx / Row.tsx / Cell.tsx to style headers, rows, totals,
// and gridlines without needing switch-case blocks scattered across the UI.
//
// Adding a new theme:
//   1. Add its id to `ThemePresetId` in `src/settings/settings.ts`.
//   2. Add a corresponding entry to THEMES below.
//   3. It automatically appears in the Theme Gallery modal.
// -----------------------------------------------------------------------------

import { ThemePresetId, ThemeDensity } from "../settings/settings";

export interface ThemeSpec {
  /** Short human-readable label shown in the gallery card. */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  headerBg: string;
  headerFg: string;
  rowBandEven: string;
  rowBandOdd: string;
  totalBg: string;
  totalFg: string;
  gridColor: string;
  /** CSS border-style value for matrix cells (solid / dashed / none …). */
  borderStyle: "solid" | "dashed" | "dotted" | "double" | "none";
  fontFamily: string;
  headerFontWeight: number;
  /** Primary accent (used for selection highlights, focus rings, chart bars). */
  accent: string;
  /** Base text colour inside regular data cells. */
  cellFg: string;
  /** Base background colour inside regular data cells. */
  cellBg?: string;
}

export const THEMES: Record<ThemePresetId, ThemeSpec> = {
  "modern-light": {
    label: "Modern Light",
    description: "Clean neutral palette with subtle banding",
    headerBg: "#f5f5f5",
    headerFg: "#333333",
    rowBandEven: "#ffffff",
    rowBandOdd: "#fafafa",
    totalBg: "#eef2f7",
    totalFg: "#111827",
    gridColor: "#e5e7eb",
    borderStyle: "solid",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#2563eb",
    cellFg: "#1a1a1a",
    cellBg: "#ffffff",
  },
  "modern-dark": {
    label: "Modern Dark",
    description: "Dark surface with bright accents",
    headerBg: "#1f2937",
    headerFg: "#f9fafb",
    rowBandEven: "#111827",
    rowBandOdd: "#0f172a",
    totalBg: "#374151",
    totalFg: "#ffffff",
    gridColor: "#374151",
    borderStyle: "solid",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#60a5fa",
    cellFg: "#e5e7eb",
    cellBg: "#111827",
  },
  "finance-statement": {
    label: "Finance Statement",
    description: "Traditional statement layout with rule lines",
    headerBg: "#ffffff",
    headerFg: "#0f172a",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#ffffff",
    totalFg: "#0f172a",
    gridColor: "#94a3b8",
    borderStyle: "solid",
    fontFamily: "Georgia, 'Times New Roman', serif",
    headerFontWeight: 700,
    accent: "#0f172a",
    cellFg: "#0f172a",
    cellBg: "#ffffff",
  },
  minimal: {
    label: "Minimal",
    description: "No chrome, pure typography",
    headerBg: "#ffffff",
    headerFg: "#111827",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#f9fafb",
    totalFg: "#111827",
    gridColor: "transparent",
    borderStyle: "none",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#111827",
    cellFg: "#111827",
    cellBg: "#ffffff",
  },
  "tableau-like": {
    label: "Tableau Style",
    description: "Familiar BI-tool look with soft bands",
    headerBg: "#4e6180",
    headerFg: "#ffffff",
    rowBandEven: "#ffffff",
    rowBandOdd: "#f4f6fb",
    totalBg: "#dee6f1",
    totalFg: "#1f2937",
    gridColor: "#cbd5e1",
    borderStyle: "solid",
    fontFamily: "'Segoe UI', 'Tableau Book', sans-serif",
    headerFontWeight: 600,
    accent: "#1f6feb",
    cellFg: "#1f2937",
    cellBg: "#ffffff",
  },
  "figma-like": {
    label: "Figma Style",
    description: "Flat card aesthetic with vibrant accent",
    headerBg: "#ffffff",
    headerFg: "#111827",
    rowBandEven: "#ffffff",
    rowBandOdd: "#fbfbfd",
    totalBg: "#f1f5f9",
    totalFg: "#0f172a",
    gridColor: "#e5e7eb",
    borderStyle: "solid",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#0d99ff",
    cellFg: "#111827",
    cellBg: "#ffffff",
  },
  "apple-glass": {
    label: "Apple Glass",
    description: "Soft translucent surfaces",
    headerBg: "rgba(255,255,255,0.72)",
    headerFg: "#111827",
    rowBandEven: "rgba(255,255,255,0.45)",
    rowBandOdd: "rgba(255,255,255,0.25)",
    totalBg: "rgba(219,234,254,0.7)",
    totalFg: "#0b1220",
    gridColor: "rgba(148,163,184,0.35)",
    borderStyle: "solid",
    fontFamily: "-apple-system, 'SF Pro Text', 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#0ea5e9",
    cellFg: "#0f172a",
    cellBg: "rgba(255,255,255,0.32)",
  },
  "finance-classic": {
    label: "Finance Classic",
    description: "Black & white with serif headers",
    headerBg: "#ffffff",
    headerFg: "#000000",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#ffffff",
    totalFg: "#000000",
    gridColor: "#000000",
    borderStyle: "solid",
    fontFamily: "'Times New Roman', Times, serif",
    headerFontWeight: 700,
    accent: "#000000",
    cellFg: "#000000",
    cellBg: "#ffffff",
  },
  "finance-executive": {
    label: "Finance Executive",
    description: "Navy headers, soft grey bands",
    headerBg: "#1e293b",
    headerFg: "#ffffff",
    rowBandEven: "#ffffff",
    rowBandOdd: "#f3f4f6",
    totalBg: "#e2e8f0",
    totalFg: "#0f172a",
    gridColor: "#cbd5e1",
    borderStyle: "solid",
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    headerFontWeight: 700,
    accent: "#1e40af",
    cellFg: "#0f172a",
    cellBg: "#ffffff",
  },
  "finance-annual-report": {
    label: "Annual Report",
    description: "Wide, airy, separator-rule emphasis",
    headerBg: "#ffffff",
    headerFg: "#0f172a",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#ffffff",
    totalFg: "#0f172a",
    gridColor: "#0f172a",
    borderStyle: "double",
    fontFamily: "Georgia, 'Playfair Display', serif",
    headerFontWeight: 700,
    accent: "#7c2d12",
    cellFg: "#1f2937",
    cellBg: "#ffffff",
  },
  "audit-paper": {
    label: "Audit Paper",
    description: "Cream paper, thin rules, mono totals",
    headerBg: "#faf6ec",
    headerFg: "#3f2e0a",
    rowBandEven: "#fdfbf3",
    rowBandOdd: "#faf6ec",
    totalBg: "#f5ecd7",
    totalFg: "#3f2e0a",
    gridColor: "#c4a76a",
    borderStyle: "solid",
    fontFamily: "'Courier New', 'Menlo', monospace",
    headerFontWeight: 700,
    accent: "#8b5a2b",
    cellFg: "#3f2e0a",
    cellBg: "#fdfbf3",
  },
  "minimal-whitespace": {
    label: "Minimal Whitespace",
    description: "No gridlines, generous padding",
    headerBg: "#ffffff",
    headerFg: "#111827",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#ffffff",
    totalFg: "#111827",
    gridColor: "transparent",
    borderStyle: "none",
    fontFamily: "'Inter', -apple-system, sans-serif",
    headerFontWeight: 500,
    accent: "#334155",
    cellFg: "#334155",
    cellBg: "#ffffff",
  },
  "dense-grid": {
    label: "Dense Grid",
    description: "Tight rows, all gridlines, small font",
    headerBg: "#f3f4f6",
    headerFg: "#111827",
    rowBandEven: "#ffffff",
    rowBandOdd: "#ffffff",
    totalBg: "#e5e7eb",
    totalFg: "#111827",
    gridColor: "#9ca3af",
    borderStyle: "solid",
    fontFamily: "'Segoe UI', 'Arial Narrow', sans-serif",
    headerFontWeight: 600,
    accent: "#1f2937",
    cellFg: "#111827",
    cellBg: "#ffffff",
  },
  "dark-contrast": {
    label: "Dark Contrast",
    description: "High-contrast dashboard theme",
    headerBg: "#000000",
    headerFg: "#fde047",
    rowBandEven: "#111111",
    rowBandOdd: "#1c1c1c",
    totalBg: "#1f2937",
    totalFg: "#fde047",
    gridColor: "#4b5563",
    borderStyle: "solid",
    fontFamily: "'Segoe UI', sans-serif",
    headerFontWeight: 700,
    accent: "#fde047",
    cellFg: "#f9fafb",
    cellBg: "#111111",
  },
  "brand-blue": {
    label: "Brand Blue",
    description: "Modern Light with blue accents",
    headerBg: "#dbeafe",
    headerFg: "#1e3a8a",
    rowBandEven: "#ffffff",
    rowBandOdd: "#f0f7ff",
    totalBg: "#bfdbfe",
    totalFg: "#1e3a8a",
    gridColor: "#bfdbfe",
    borderStyle: "solid",
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#2563eb",
    cellFg: "#0f172a",
    cellBg: "#ffffff",
  },
  "brand-green": {
    label: "Brand Green",
    description: "Modern Light with green accents",
    headerBg: "#dcfce7",
    headerFg: "#14532d",
    rowBandEven: "#ffffff",
    rowBandOdd: "#f0fdf4",
    totalBg: "#bbf7d0",
    totalFg: "#14532d",
    gridColor: "#bbf7d0",
    borderStyle: "solid",
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#16a34a",
    cellFg: "#0f172a",
    cellBg: "#ffffff",
  },
  "brand-orange": {
    label: "Brand Orange",
    description: "Modern Light with orange accents",
    headerBg: "#ffedd5",
    headerFg: "#7c2d12",
    rowBandEven: "#ffffff",
    rowBandOdd: "#fff7ed",
    totalBg: "#fed7aa",
    totalFg: "#7c2d12",
    gridColor: "#fed7aa",
    borderStyle: "solid",
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    headerFontWeight: 600,
    accent: "#ea580c",
    cellFg: "#0f172a",
    cellBg: "#ffffff",
  },
};

/** Resolve a preset id to its spec. Falls back to modern-light for safety. */
export function getThemeSpec(preset: ThemePresetId): ThemeSpec {
  return THEMES[preset] ?? THEMES["modern-light"];
}

/** Row height in px per density level. */
export function densityRowHeight(density: ThemeDensity): number {
  switch (density) {
    case "compact": return 22;
    case "spacious": return 40;
    case "comfortable":
    default: return 30;
  }
}

/** Cell horizontal padding in px per density level. */
export function densityCellPadding(density: ThemeDensity): number {
  switch (density) {
    case "compact": return 4;
    case "spacious": return 12;
    case "comfortable":
    default: return 8;
  }
}

/** Ordered list of preset ids (stable, used for gallery layout). */
export const THEME_ORDER: ThemePresetId[] = [
  "modern-light",
  "modern-dark",
  "minimal",
  "minimal-whitespace",
  "dense-grid",
  "dark-contrast",
  "apple-glass",
  "figma-like",
  "tableau-like",
  "finance-statement",
  "finance-classic",
  "finance-executive",
  "finance-annual-report",
  "audit-paper",
  "brand-blue",
  "brand-green",
  "brand-orange",
];
