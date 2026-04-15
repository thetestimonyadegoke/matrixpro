import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

export interface GeneralSettings {
  rowHeight: number;
  defaultColumnWidth: number;
  /**
   * Width of the row header area (left pane), in pixels.
   * Controls how much space is available for row labels and per-row visuals.
   */
  rowHeaderWidth: number;
  freezeFirstColumn: boolean;
  showGridlines: boolean;
  rowBanding: boolean;
  fontFamily: string;
  rowHighlight: boolean;
  topN: number;
}

export interface HeaderSettings {
  fontSize: number;
  bold: boolean;
  backgroundColor: string;
  textColor: string;
}

export interface ValueSettings {
  fontSize: number;
  alignment: "left" | "center" | "right";
  numberFormat: string;
  textColor: string;
  backgroundColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  borderStyle: "none" | "all" | "horizontal" | "vertical" | "outline";
  borderColor: string;
}

export interface TotalSettings {
  showRowSubtotals: boolean;
  showColumnSubtotals: boolean;
  showGrandTotals: boolean;
  subtotalPosition: "top" | "bottom";
  backgroundColor: string;
  textColor: string;
  rowSubtotalLevels?: string; // JSON string array of hidden levels
  colSubtotalLevels?: string; // JSON string array of hidden levels
}

export interface ConditionalFormattingSettings {
  enabled: boolean;
  ruleType: "thresholds" | "bands";
  lowColor: string;
  midColor: string;
  highColor: string;
  lowThreshold: number;
  highThreshold: number;
  applyToAllMeasures: boolean;
  targetMeasure: number;
  /**
   * JSON-encoded array of ConditionalRule objects (see format/conditional.ts).
   * When non-empty, these take precedence over the legacy single-rule fields
   * above; the legacy fields remain for backwards compatibility.
   */
  rules: string;
}

export interface DataBarSettings {
  enabled: boolean;
  showValueText: boolean;
  positiveColor: string;
  negativeColor: string;
  normalizeBy: "column" | "row" | "global";
}

export interface KPIIconSettings {
  enabled: boolean;
  upThreshold: number;
  downThreshold: number;
  upColor: string;
  neutralColor: string;
  downColor: string;
}

export interface SparklineSettings {
  enabled: boolean;
  showInDedicatedColumn: boolean;
  normalizePerRow: boolean;
  showMinMaxMarkers: boolean;
  lineColor: string;
  markerColor: string;
  nullHandling: "gap" | "zero";
}

export type LayoutMode = "hierarchy" | "outline" | "table" | "stepped" | "drilldown";

export interface LayoutSettings {
  mode: LayoutMode;
}

export type ThemePresetId = "modern-light" | "modern-dark" | "finance-statement" | "minimal" | "tableau-like" | "figma-like";
export type ThemeDensity = "compact" | "comfortable";

export interface ThemeSettings {
  preset: ThemePresetId;
  density: ThemeDensity;
  customAccentColor: string;
}

export type QuickCalcType = "none" | "percentOfTotal" | "runningTotal" | "variance" | "percentChange" | "rank";

export interface QuickCalcSettings {
  enabled: boolean;
  type: QuickCalcType;
  targetMeasure: number;
}

export interface AppearanceSettings {
  surfaceColor: string;
  toolbarBackgroundColor: string;
  borderColor: string;
  accentColor: string;
  cornerRadius: number;
  showToolbar: boolean;
}

export interface VisualSettings {
  general: GeneralSettings;
  layout: LayoutSettings;
  theme: ThemeSettings;
  headers: HeaderSettings;
  values: ValueSettings;
  totals: TotalSettings;
  conditionalFormatting: ConditionalFormattingSettings;
  dataBars: DataBarSettings;
  kpiIcons: KPIIconSettings;
  sparklines: SparklineSettings;
  quickCalcs: QuickCalcSettings;
  appearance: AppearanceSettings;
  calculations: CalculationsSettings;
  manualData: ManualDataSettings;
}

export interface CalculationsSettings {
  measures: string;
  rows: string;
}

export interface ManualDataSettings {
  notes: string;
  edits: string;
  rowOrder: string;
  colOrder: string;
  labelOverrides: string;
  locks: string;
}

export const defaultSettings: VisualSettings = {
  general: {
    rowHeight: 22,
    defaultColumnWidth: 90,
    rowHeaderWidth: 200,
    freezeFirstColumn: false,
    showGridlines: true,
    rowBanding: true,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    rowHighlight: false,
    topN: 0,
  },
  layout: {
    mode: "hierarchy",
  },
  theme: {
    preset: "modern-light",
    density: "comfortable",
    customAccentColor: "#2563eb",
  },
  headers: {
    fontSize: 11,
    bold: true,
    backgroundColor: "#f5f5f5",
    textColor: "#333333",
  },
  values: {
    fontSize: 11,
    alignment: "right",
    numberFormat: "",
    textColor: "#1a1a1a",
    backgroundColor: "transparent",
    bold: false,
    italic: false,
    underline: false,
    borderStyle: "none",
    borderColor: "#d0d0d0",
  },
  totals: {
    showRowSubtotals: true,
    showColumnSubtotals: true,
    showGrandTotals: true,
    subtotalPosition: "bottom",
    backgroundColor: "#e8e8e8",
    textColor: "#333333",
    rowSubtotalLevels: "[]",
    colSubtotalLevels: "[]",
  },
  conditionalFormatting: {
    enabled: false,
    ruleType: "thresholds",
    lowColor: "#ff6b6b",
    midColor: "#ffd93d",
    highColor: "#6bcb77",
    lowThreshold: 33,
    highThreshold: 66,
    applyToAllMeasures: true,
    targetMeasure: 0,
    rules: "[]",
  },
  dataBars: {
    enabled: false,
    showValueText: true,
    positiveColor: "#5cb85c",
    negativeColor: "#d9534f",
    normalizeBy: "column",
  },
  kpiIcons: {
    enabled: false,
    upThreshold: 5,
    downThreshold: -5,
    upColor: "#28a745",
    neutralColor: "#6c757d",
    downColor: "#dc3545",
  },
  sparklines: {
    enabled: false,
    showInDedicatedColumn: true,
    normalizePerRow: true,
    showMinMaxMarkers: true,
    lineColor: "#4a90d9",
    markerColor: "#d9534f",
    nullHandling: "gap",
  },
  quickCalcs: {
    enabled: false,
    type: "none",
    targetMeasure: 0,
  },
  appearance: {
    surfaceColor: "#ffffff",
    toolbarBackgroundColor: "#f8f9fa",
    borderColor: "#e0e0e0",
    accentColor: "#2d74da",
    cornerRadius: 8,
    showToolbar: true,
  },
  calculations: {
    measures: "[]",
    rows: "[]",
  },
  manualData: {
    notes: "{}",
    edits: "{}",
    rowOrder: "[]",
    colOrder: "[]",
    labelOverrides: "{}",
    locks: "[]",
  },
};

function getValue<T>(
  objects: powerbi.DataViewObjects | undefined,
  objectName: string,
  propertyName: string,
  defaultValue: T
): T {
  if (!objects) return defaultValue;
  const object = objects[objectName];
  if (!object) return defaultValue;
  const property = object[propertyName];
  if (property === undefined || property === null) return defaultValue;
  return property as T;
}

function getColor(
  objects: powerbi.DataViewObjects | undefined,
  objectName: string,
  propertyName: string,
  defaultValue: string
): string {
  if (!objects) return defaultValue;
  const object = objects[objectName];
  if (!object) return defaultValue;
  const fill = object[propertyName] as powerbi.Fill;
  if (!fill || !fill.solid || !fill.solid.color) return defaultValue;
  return fill.solid.color;
}

export function parseSettings(dataView: DataView | undefined): VisualSettings {
  if (!dataView || !dataView.metadata) {
    return { ...defaultSettings };
  }

  const objects = dataView.metadata.objects;

  const subtotalPositionFromApi = getValue(objects, "subtotals", "rowSubtotalsType", undefined as any);
  const rowSubtotalsFromApi = getValue(objects, "subTotals", "rowSubtotals", undefined as any);
  const colSubtotalsFromApi = getValue(objects, "subTotals", "columnSubtotals", undefined as any);

  return {
    general: {
      rowHeight: getValue(objects, "general", "rowHeight", defaultSettings.general.rowHeight),
      defaultColumnWidth: getValue(objects, "general", "defaultColumnWidth", defaultSettings.general.defaultColumnWidth),
      rowHeaderWidth: getValue(objects, "general", "rowHeaderWidth", defaultSettings.general.rowHeaderWidth),
      freezeFirstColumn: getValue(objects, "general", "freezeFirstColumn", defaultSettings.general.freezeFirstColumn),
      showGridlines: getValue(objects, "general", "showGridlines", defaultSettings.general.showGridlines),
      rowBanding: getValue(objects, "general", "rowBanding", defaultSettings.general.rowBanding),
      fontFamily: getValue(objects, "general", "fontFamily", defaultSettings.general.fontFamily),
      rowHighlight: getValue(objects, "general", "rowHighlight", defaultSettings.general.rowHighlight),
      topN: getValue(objects, "general", "topN", defaultSettings.general.topN),
    },
    layout: {
      mode: getValue(objects, "layout", "mode", defaultSettings.layout.mode),
    },
    theme: {
      preset: getValue(objects, "theme", "preset", defaultSettings.theme.preset),
      density: getValue(objects, "theme", "density", defaultSettings.theme.density),
      customAccentColor: getColor(objects, "theme", "customAccentColor", defaultSettings.theme.customAccentColor),
    },
    headers: {
      fontSize: getValue(objects, "headers", "fontSize", defaultSettings.headers.fontSize),
      bold: getValue(objects, "headers", "bold", defaultSettings.headers.bold),
      backgroundColor: getColor(objects, "headers", "backgroundColor", defaultSettings.headers.backgroundColor),
      textColor: getColor(objects, "headers", "textColor", defaultSettings.headers.textColor),
    },
    values: {
      fontSize: getValue(objects, "values", "fontSize", defaultSettings.values.fontSize),
      alignment: getValue(objects, "values", "alignment", defaultSettings.values.alignment),
      numberFormat: getValue(objects, "values", "numberFormat", defaultSettings.values.numberFormat),
      textColor: getColor(objects, "values", "textColor", defaultSettings.values.textColor),
      backgroundColor: getColor(objects, "values", "backgroundColor", defaultSettings.values.backgroundColor),
      bold: getValue(objects, "values", "bold", defaultSettings.values.bold),
      italic: getValue(objects, "values", "italic", defaultSettings.values.italic),
      underline: getValue(objects, "values", "underline", defaultSettings.values.underline),
      borderStyle: getValue(objects, "values", "borderStyle", defaultSettings.values.borderStyle),
      borderColor: getColor(objects, "values", "borderColor", defaultSettings.values.borderColor),
    },
    totals: {
      showRowSubtotals: (rowSubtotalsFromApi !== undefined
        ? (rowSubtotalsFromApi as boolean)
        : getValue(objects, "totals", "showRowSubtotals", defaultSettings.totals.showRowSubtotals)),
      showColumnSubtotals: (colSubtotalsFromApi !== undefined
        ? (colSubtotalsFromApi as boolean)
        : getValue(objects, "totals", "showColumnSubtotals", defaultSettings.totals.showColumnSubtotals)),
      showGrandTotals: getValue(objects, "totals", "showGrandTotals", defaultSettings.totals.showGrandTotals),
      subtotalPosition: (subtotalPositionFromApi === "Top"
        ? "top"
        : subtotalPositionFromApi === "Bottom"
          ? "bottom"
          : getValue(objects, "totals", "subtotalPosition", defaultSettings.totals.subtotalPosition)),
      backgroundColor: getColor(objects, "totals", "backgroundColor", defaultSettings.totals.backgroundColor),
      textColor: getColor(objects, "totals", "textColor", defaultSettings.totals.textColor),
      rowSubtotalLevels: getValue(objects, "totals", "rowSubtotalLevels", defaultSettings.totals.rowSubtotalLevels),
      colSubtotalLevels: getValue(objects, "totals", "colSubtotalLevels", defaultSettings.totals.colSubtotalLevels),
    },
    conditionalFormatting: {
      enabled: getValue(objects, "conditionalFormatting", "enabled", defaultSettings.conditionalFormatting.enabled),
      ruleType: getValue(objects, "conditionalFormatting", "ruleType", defaultSettings.conditionalFormatting.ruleType),
      lowColor: getColor(objects, "conditionalFormatting", "lowColor", defaultSettings.conditionalFormatting.lowColor),
      midColor: getColor(objects, "conditionalFormatting", "midColor", defaultSettings.conditionalFormatting.midColor),
      highColor: getColor(objects, "conditionalFormatting", "highColor", defaultSettings.conditionalFormatting.highColor),
      lowThreshold: getValue(objects, "conditionalFormatting", "lowThreshold", defaultSettings.conditionalFormatting.lowThreshold),
      highThreshold: getValue(objects, "conditionalFormatting", "highThreshold", defaultSettings.conditionalFormatting.highThreshold),
      applyToAllMeasures: getValue(objects, "conditionalFormatting", "applyToAllMeasures", defaultSettings.conditionalFormatting.applyToAllMeasures),
      targetMeasure: getValue(objects, "conditionalFormatting", "targetMeasure", defaultSettings.conditionalFormatting.targetMeasure),
      rules: getValue(objects, "conditionalFormatting", "rules", defaultSettings.conditionalFormatting.rules),
    },
    dataBars: {
      enabled: getValue(objects, "dataBars", "enabled", defaultSettings.dataBars.enabled),
      showValueText: getValue(objects, "dataBars", "showValueText", defaultSettings.dataBars.showValueText),
      positiveColor: getColor(objects, "dataBars", "positiveColor", defaultSettings.dataBars.positiveColor),
      negativeColor: getColor(objects, "dataBars", "negativeColor", defaultSettings.dataBars.negativeColor),
      normalizeBy: getValue(objects, "dataBars", "normalizeBy", defaultSettings.dataBars.normalizeBy),
    },
    kpiIcons: {
      enabled: getValue(objects, "kpiIcons", "enabled", defaultSettings.kpiIcons.enabled),
      upThreshold: getValue(objects, "kpiIcons", "upThreshold", defaultSettings.kpiIcons.upThreshold),
      downThreshold: getValue(objects, "kpiIcons", "downThreshold", defaultSettings.kpiIcons.downThreshold),
      upColor: getColor(objects, "kpiIcons", "upColor", defaultSettings.kpiIcons.upColor),
      neutralColor: getColor(objects, "kpiIcons", "neutralColor", defaultSettings.kpiIcons.neutralColor),
      downColor: getColor(objects, "kpiIcons", "downColor", defaultSettings.kpiIcons.downColor),
    },
    sparklines: {
      enabled: getValue(objects, "sparklines", "enabled", defaultSettings.sparklines.enabled),
      showInDedicatedColumn: getValue(objects, "sparklines", "showInDedicatedColumn", defaultSettings.sparklines.showInDedicatedColumn),
      normalizePerRow: getValue(objects, "sparklines", "normalizePerRow", defaultSettings.sparklines.normalizePerRow),
      showMinMaxMarkers: getValue(objects, "sparklines", "showMinMaxMarkers", defaultSettings.sparklines.showMinMaxMarkers),
      lineColor: getColor(objects, "sparklines", "lineColor", defaultSettings.sparklines.lineColor),
      markerColor: getColor(objects, "sparklines", "markerColor", defaultSettings.sparklines.markerColor),
      nullHandling: getValue(objects, "sparklines", "nullHandling", defaultSettings.sparklines.nullHandling),
    },
    quickCalcs: {
      enabled: getValue(objects, "quickCalcs", "enabled", defaultSettings.quickCalcs.enabled),
      type: getValue(objects, "quickCalcs", "type", defaultSettings.quickCalcs.type),
      targetMeasure: getValue(objects, "quickCalcs", "targetMeasure", defaultSettings.quickCalcs.targetMeasure),
    },
    appearance: {
      surfaceColor: getColor(objects, "appearance", "surfaceColor", defaultSettings.appearance.surfaceColor),
      toolbarBackgroundColor: getColor(objects, "appearance", "toolbarBackgroundColor", defaultSettings.appearance.toolbarBackgroundColor),
      borderColor: getColor(objects, "appearance", "borderColor", defaultSettings.appearance.borderColor),
      accentColor: getColor(objects, "appearance", "accentColor", defaultSettings.appearance.accentColor),
      cornerRadius: getValue(objects, "appearance", "cornerRadius", defaultSettings.appearance.cornerRadius),
      showToolbar: getValue(objects, "appearance", "showToolbar", defaultSettings.appearance.showToolbar),
    },
    calculations: {
      measures: getValue(objects, "calculations", "measures", defaultSettings.calculations.measures),
      rows: getValue(objects, "calculations", "rows", defaultSettings.calculations.rows),
    },
    manualData: {
      notes: getValue(objects, "manualData", "notes", defaultSettings.manualData.notes),
      edits: getValue(objects, "manualData", "edits", defaultSettings.manualData.edits),
      rowOrder: getValue(objects, "manualData", "rowOrder", defaultSettings.manualData.rowOrder),
      colOrder: getValue(objects, "manualData", "colOrder", defaultSettings.manualData.colOrder),
      labelOverrides: getValue(objects, "manualData", "labelOverrides", defaultSettings.manualData.labelOverrides),
      locks: getValue(objects, "manualData", "locks", defaultSettings.manualData.locks),
    },
  };
}
