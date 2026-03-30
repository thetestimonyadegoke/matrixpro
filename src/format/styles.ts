import React from "react";
import { CellStyle } from "./conditional";
import { VisualSettings } from "../settings/settings";

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
  const isHighlighted = settings.general.rowHighlight;

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
    backgroundColor = settings.values.backgroundColor;
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

  return {
    backgroundColor,
    fontWeight,
    fontStyle,
    textDecoration,
    color: settings.values.textColor || "inherit",
    fontSize: `${settings.values.fontSize || 12}px`,
  };
}

export function getHeaderStyle(settings: VisualSettings): React.CSSProperties {
  return {
    backgroundColor: settings.headers.backgroundColor,
    color: settings.headers.textColor,
    fontSize: `${settings.headers.fontSize}px`,
    fontWeight: settings.headers.bold ? 600 : "normal",
  };
}

export function getCellAlignmentClass(alignment: "left" | "center" | "right"): string {
  return `align-${alignment}`;
}
