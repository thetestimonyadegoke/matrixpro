import { ConditionalFormattingSettings } from "../settings/settings";

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
}

export interface ConditionalRule {
  type: "threshold" | "band";
  lowColor: string;
  midColor: string;
  highColor: string;
  lowThreshold: number;
  highThreshold: number;
}

export function evaluateConditionalFormatting(
  value: number | null,
  min: number,
  max: number,
  settings: ConditionalFormattingSettings
): CellStyle {
  if (!settings.enabled || value === null || isNaN(value)) {
    return {};
  }

  const range = max - min;
  if (range === 0) {
    return { backgroundColor: settings.midColor };
  }

  const normalizedValue = ((value - min) / range) * 100;

  if (settings.ruleType === "thresholds") {
    return evaluateThresholdRule(normalizedValue, settings);
  } else {
    return evaluateBandRule(normalizedValue, settings);
  }
}

function evaluateThresholdRule(
  normalizedValue: number,
  settings: ConditionalFormattingSettings
): CellStyle {
  const { lowThreshold, highThreshold, lowColor, midColor, highColor } = settings;

  if (normalizedValue <= lowThreshold) {
    const ratio = normalizedValue / lowThreshold;
    return { backgroundColor: interpolateColor(lowColor, midColor, ratio) };
  } else if (normalizedValue >= highThreshold) {
    const ratio = (normalizedValue - highThreshold) / (100 - highThreshold);
    return { backgroundColor: interpolateColor(midColor, highColor, ratio) };
  } else {
    const ratio = (normalizedValue - lowThreshold) / (highThreshold - lowThreshold);
    return { backgroundColor: interpolateColor(lowColor, highColor, ratio) };
  }
}

function evaluateBandRule(
  normalizedValue: number,
  settings: ConditionalFormattingSettings
): CellStyle {
  const { lowThreshold, highThreshold, lowColor, midColor, highColor } = settings;

  if (normalizedValue < lowThreshold) {
    return { backgroundColor: lowColor };
  } else if (normalizedValue > highThreshold) {
    return { backgroundColor: highColor };
  } else {
    return { backgroundColor: midColor };
  }
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return color1;
  }

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) {
    return null;
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) {
    return "#000000";
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function computeVisibleRangeStats(
  values: (number | null)[]
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (const value of values) {
    if (value !== null && !isNaN(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}

export interface CachedConditionalStyles {
  styles: Map<string, CellStyle>;
  stats: Map<number, { min: number; max: number }>;
}

export function createConditionalStyleCache(): CachedConditionalStyles {
  return {
    styles: new Map(),
    stats: new Map(),
  };
}

export function getCachedStyle(
  cache: CachedConditionalStyles,
  cellKey: string,
  value: number | null,
  measureIndex: number,
  settings: ConditionalFormattingSettings,
  getStats: () => { min: number; max: number }
): CellStyle {
  if (!settings.enabled) {
    return {};
  }

  const cached = cache.styles.get(cellKey);
  if (cached) {
    return cached;
  }

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
