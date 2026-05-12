import React from "react";
import { CellStyle } from "./conditional";
import { defaultSettings, VisualSettings } from "../settings/settings";

export interface ComposedCellStyle extends CellStyle {
  textAlign?: string;
  fontSize?: string;
  padding?: string;
  textDecoration?: string;
}

export function composeCellStyle(
  baseStyle: CellStyle,
  settings: VisualSettings,
  isHeader: boolean = false,
  isTotal: boolean = false
): ComposedCellStyle {
  const composed: ComposedCellStyle = { ...baseStyle };

  if (isHeader) {
    composed.fontSize = `${settings.headers.fontSize}px`;
    composed.fontWeight = settings.headers.bold ? "600" : "normal";
    composed.backgroundColor = composed.backgroundColor || settings.headers.backgroundColor;
    composed.color = composed.color || settings.headers.textColor;
  } else if (isTotal) {
    composed.backgroundColor = composed.backgroundColor || settings.totals.backgroundColor;
    composed.color = composed.color || settings.totals.textColor;
    composed.fontWeight = "600";
    composed.fontSize = `${settings.values.fontSize}px`;
  } else {
    composed.fontSize = `${settings.values.fontSize}px`;
    composed.textAlign = settings.values.alignment;
    // Apply value formatting settings
    if (settings.values.bold) composed.fontWeight = "600";
    if (settings.values.italic) composed.fontStyle = "italic";
    if (settings.values.underline) composed.textDecoration = "underline";
    if (settings.values.textColor && !composed.color) composed.color = settings.values.textColor;
    if (settings.values.backgroundColor && !composed.backgroundColor) composed.backgroundColor = settings.values.backgroundColor;
  }

  return composed;
}

function resolveThemeAwareColor(value: string, defaultValue: string, cssVar: string): string | undefined {
  if (!value || value === "transparent") {
    return undefined;
  }
  return value === defaultValue ? `var(${cssVar})` : value;
}

function resolveThemeAwareBackground(value: string, defaultValue: string, cssVar: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value === defaultValue ? `var(${cssVar})` : value;
}

export function styleToCSS(style: ComposedCellStyle): React.CSSProperties {
  const css: React.CSSProperties = {};

  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.color) css.color = style.color;
  if (style.fontWeight) css.fontWeight = style.fontWeight as React.CSSProperties["fontWeight"];
  if (style.fontStyle) css.fontStyle = style.fontStyle as React.CSSProperties["fontStyle"];
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.textAlign) css.textAlign = style.textAlign as React.CSSProperties["textAlign"];
  if (style.padding) css.padding = style.padding;
  if (style.textDecoration) css.textDecoration = style.textDecoration as React.CSSProperties["textDecoration"];

  return css;
}

export function mergeStyles(...styles: (CellStyle | undefined)[]): CellStyle {
  const merged: CellStyle = {};

  for (const style of styles) {
    if (style) {
      if (style.backgroundColor) merged.backgroundColor = style.backgroundColor;
      if (style.color) merged.color = style.color;
      if (style.fontWeight) merged.fontWeight = style.fontWeight;
      if (style.fontStyle) merged.fontStyle = style.fontStyle;
    }
  }

  return merged;
}

export function getRowStyle(
  settings: VisualSettings,
  rowIndex: number,
  isSubtotal: boolean,
  isGrandTotal: boolean,
  isSelected: boolean
): React.CSSProperties {
  const isBanded = settings.general.rowBanding && rowIndex % 2 === 1;

  let backgroundColor = isSelected
    ? "var(--mx-selection-bg)"
    : isGrandTotal
      ? "var(--mx-grandtotal-bg)"
      : isSubtotal
        ? "var(--mx-subtotal-bg)"
        : isBanded
          ? "var(--mx-hover-bg)"
          : "transparent";

  // Use the value's background color if no other state overrides it
  if (!isSelected && !isGrandTotal && !isSubtotal && !isBanded && settings.values.backgroundColor && settings.values.backgroundColor !== "transparent") {
    backgroundColor = resolveThemeAwareBackground(
      settings.values.backgroundColor,
      defaultSettings.values.backgroundColor,
      "--mx-cell-bg"
    ) ?? backgroundColor;
  }

  let fontWeight: number | string = isSubtotal || isGrandTotal ? 600 : "normal";
  if (settings.headers.bold && (isSubtotal || isGrandTotal)) {
    fontWeight = "bold";
  }
  // Apply bold setting for regular cells
  if (!isSubtotal && !isGrandTotal && settings.values.bold) {
    fontWeight = "600";
  }

  const fontStyle = settings.values.italic ? "italic" : "normal";
  const textDecoration = settings.values.underline ? "underline" : undefined;
  const stylePreset = settings.layout.stylePreset || "modern";
  const presetAccentBackground =
    stylePreset === "ledger"
      ? isBanded ? "#f8fafc" : backgroundColor
      : stylePreset === "editorial"
        ? isBanded ? "#fcfaf7" : backgroundColor
        : backgroundColor;
  const letterSpacing = stylePreset === "editorial" && (isSubtotal || isGrandTotal) ? "0.01em" : undefined;

  return {
    backgroundColor: presetAccentBackground,
    fontWeight,
    fontStyle,
    textDecoration,
    letterSpacing,
    color: resolveThemeAwareColor(settings.values.textColor, defaultSettings.values.textColor, "--mx-cell-fg") || "inherit",
    fontSize: `${settings.values.fontSize || 12}px`,
  };
}

export function getHeaderStyle(settings: VisualSettings): React.CSSProperties {
  return {
    backgroundColor: resolveThemeAwareBackground(settings.headers.backgroundColor, defaultSettings.headers.backgroundColor, "--mx-header-bg"),
    color: resolveThemeAwareColor(settings.headers.textColor, defaultSettings.headers.textColor, "--mx-header-fg"),
    fontSize: `${settings.headers.fontSize}px`,
    fontWeight: settings.headers.bold ? 600 : "normal",
  };
}

export function getCellAlignmentClass(alignment: "left" | "center" | "right"): string {
  return `align-${alignment}`;
}
