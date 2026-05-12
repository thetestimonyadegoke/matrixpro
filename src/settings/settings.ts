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
  /** Reverse the row display order */
  invertRows: boolean;
  /** Simulation mode active flag — changes are temporary */
  simulateMode: boolean;
  /** Wrap cell text */
  wrapText: boolean;
  /** Strikethrough text style */
  strikethrough: boolean;
}

export interface HeaderSettings {
  fontSize: number;
  bold: boolean;
  backgroundColor: string;
  textColor: string;
  // Dynamic identity formatting
  rowHeaderParentBold: boolean;
  rowHeaderParentColor: string;
  rowHeaderChildColor: string;
  colHeaderLevel0Color: string;
  colHeaderLevel1Color: string;
  colHeaderLeafColor: string;
}

export interface UIState {
  explorerOpen: boolean;
  toolbarMode: string;
  toolbarPinned: boolean;
  zoomLevel: number;
  activeTab: string;
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
  quickFormat: string; // "none" | "thousands" | "millions" | "billions"
  decimals: number;
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
  // Granular styling
  grandTotalBold: boolean;
  grandTotalBackgroundColor: string;
  grandTotalTextColor: string;
  subtotalBold: boolean;
  subtotalBackgroundColor: string;
  subtotalTextColor: string;
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
export type PageMode = "single" | "multi";
export type BreakMode = "none" | "page" | "section";
export type DesignStylePreset = "modern" | "ledger" | "editorial";

export interface LayoutSettings {
  mode: LayoutMode;
  pageMode: PageMode;
  rowBreak: BreakMode;
  columnBreak: BreakMode;
  stylePreset: DesignStylePreset;
}

export type ThemePresetId =
  // Original presets
  | "modern-light"
  | "modern-dark"
  | "finance-statement"
  | "minimal"
  | "tableau-like"
  | "figma-like"
  | "apple-glass"
  // New financial-reporting presets
  | "finance-classic"
  | "finance-executive"
  | "finance-annual-report"
  | "audit-paper"
  // New layout-emphasis presets
  | "minimal-whitespace"
  | "dense-grid"
  | "dark-contrast"
  // New brand-accent presets
  | "brand-blue"
  | "brand-green"
  | "brand-orange"
  // Modern expressive presets
  | "atelier-ink"
  | "aurora-slate"
  | "editorial-luxe"
  | "kinetic-mint"
  | "obsidian-neon";

export type ThemeDensity = "compact" | "comfortable" | "spacious";

export interface ThemeSettings {
  preset: ThemePresetId;
  density: ThemeDensity;
  customAccentColor: string;
  /** Render a horizontal rule above subtotal / level-0 rows. */
  dividerLines: boolean;
  /** Subtle background on row hover. */
  rowHover: boolean;
  /** Grand total row becomes sticky at the bottom of the viewport. */
  stickyTotals: boolean;
  /** Auto-right-align numeric measure columns irrespective of global alignment. */
  numberAlignmentByMeasure: boolean;
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
  backgroundImage?: string;
  backgroundBlur?: number;
  glassmorphism?: boolean;
  surfaceOpacity?: number;
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  overlayColor?: string;
  overlayOpacity?: number;
  backgroundEffect?: "none" | "gradient" | "image" | "hybrid";
  layoutStyle?: "standard" | "floating" | "framed" | "spotlight";
}

export interface TitleSettings {
  /** Whether the custom in-visual title bar is shown. */
  show: boolean;
  /** Title text displayed in the bar. */
  text: string;
  /** Font size in px. */
  fontSize: number;
  /** Font color (CSS color string). */
  color: string;
  /** Background color of the title bar. */
  backgroundColor: string;
  /** Text alignment. */
  alignment: "left" | "center" | "right";
  /** Height of the title bar in px. */
  height: number;
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
  title: TitleSettings;
  calculations: CalculationsSettings;
  manualData: ManualDataSettings;
  uiState: UIState;
}

export interface CalculationsSettings {
  measures: string;
  rows: string;
  timeIntelligence: string;
  visualColumns: string;
}

// ─── Inserted-row schema ─────────────────────────────────────────────────────
// `calculations.rows` is persisted as a JSON-encoded array. Each entry has a
// `kind` discriminator. Legacy entries (pre-kind) are migrated to "calculated"
// by `migrateInsertedRows` on read, so existing reports continue to work.

export type InsertedRowKind =
  | "calculated"
  | "blank"
  | "group"
  | "child"
  | "divider";

export interface InsertedRowStyle {
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderTop?: string;
  borderBottom?: string;
  indentOverride?: number | null;
}

interface InsertedRowBaseFields {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  /** How this row is positioned relative to `targetRowKey` (legacy fields below also kept for back-compat). */
  placement?: "before" | "after" | "child";
  targetRowKey?: string;
  /** Back-compat fields preserved from the original wizard shape. */
  parentRowKey?: string | null;
  insertAfterRowKey?: string | null;
  insertAtTop?: boolean;
}

export type RowScalingFactor =
  | "none"
  | "thousands"
  | "millions"
  | "billions"
  | "trillions"
  | "auto";

export type RowQuickFormat = "none" | "number" | "currency" | "percentage";

export type RowBindingMode = "none" | "existing" | "new";

export interface RowBinding {
  mode: RowBindingMode;
  /** Row key to bind to when mode === "existing". */
  existingRowKey?: string;
  /** New binding identifier when mode === "new". */
  newKey?: string;
}

export interface CalculatedInsertedRow extends InsertedRowBaseFields {
  kind: "calculated" | "child";
  formulaType: "sum" | "subtract" | "custom";
  rowReferences: string[];
  customFormula: string;
  style?: InsertedRowStyle;
  includeInTotals?: boolean;
  isSubtotal?: boolean;
  /** Cross-filter / RLS binding. Optional. Defaults to `{ mode: "none" }`. */
  binding?: RowBinding;
  /** Per-row numeric scaling divisor. Default "none". */
  scalingFactor?: RowScalingFactor;
  /** Per-row quick format override. Default "none". */
  quickFormat?: RowQuickFormat;
  /** Include in totals (new spelling; prefer this over legacy `includeInTotals`). Default true. */
  includeInTotal?: boolean;
  /**
   * When true, column calc measures are evaluated before this row's formula.
   * When false, this row's formula evaluates against the base (pre-calc-measure)
   * cell map. Default (for existing rows without the field) is true to preserve
   * historical behavior; the CalcRowForm defaults new rows to false.
   */
  evaluateColumnsBeforeRows?: boolean;
  /** Free-form description. Optional. */
  description?: string;
}

export interface BlankInsertedRow extends InsertedRowBaseFields {
  kind: "blank";
  height?: number;
}

export interface GroupInsertedRow extends InsertedRowBaseFields {
  kind: "group";
  label?: string;
  style?: InsertedRowStyle;
}

export interface DividerInsertedRow extends InsertedRowBaseFields {
  kind: "divider";
  lineStyle?: "single" | "double" | "dashed";
  lineColor?: string;
}

export type InsertedRow =
  | CalculatedInsertedRow
  | BlankInsertedRow
  | GroupInsertedRow
  | DividerInsertedRow;

/**
 * Parse and migrate the persisted `calculations.rows` JSON string.
 * - Returns an empty array on null / invalid JSON / non-array input.
 * - Stamps `kind: "calculated"` on any legacy entry missing a discriminator.
 * - Fills in defaults so the runtime shape matches the typed unions.
 */
export function migrateInsertedRows(raw: string | undefined | null): InsertedRow[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((r: any, i: number): InsertedRow => {
    const kind: InsertedRowKind =
      r && typeof r.kind === "string" &&
      (r.kind === "calculated" || r.kind === "blank" || r.kind === "group" || r.kind === "child" || r.kind === "divider")
        ? r.kind
        : "calculated";

    const base: InsertedRowBaseFields = {
      id: typeof r?.id === "string" && r.id ? r.id : `row_${Date.now()}_${i}`,
      name: typeof r?.name === "string" ? r.name : "",
      enabled: r?.enabled !== false,
      order: typeof r?.order === "number" ? r.order : i,
      placement: r?.placement,
      targetRowKey: r?.targetRowKey,
      parentRowKey: r?.parentRowKey ?? null,
      insertAfterRowKey: r?.insertAfterRowKey ?? null,
      insertAtTop: r?.insertAtTop === true,
    };

    switch (kind) {
      case "calculated":
      case "child": {
        const scalingFactor: RowScalingFactor =
          r?.scalingFactor === "thousands" ||
          r?.scalingFactor === "millions" ||
          r?.scalingFactor === "billions" ||
          r?.scalingFactor === "trillions" ||
          r?.scalingFactor === "auto"
            ? r.scalingFactor
            : "none";
        const quickFormat: RowQuickFormat =
          r?.quickFormat === "number" ||
          r?.quickFormat === "currency" ||
          r?.quickFormat === "percentage"
            ? r.quickFormat
            : "none";
        const bindingMode: RowBindingMode =
          r?.binding?.mode === "existing" || r?.binding?.mode === "new"
            ? r.binding.mode
            : "none";
        const binding: RowBinding = {
          mode: bindingMode,
          existingRowKey:
            bindingMode === "existing" && typeof r?.binding?.existingRowKey === "string"
              ? r.binding.existingRowKey
              : undefined,
          newKey:
            bindingMode === "new" && typeof r?.binding?.newKey === "string"
              ? r.binding.newKey
              : undefined,
        };
        // New `includeInTotal` field takes precedence over legacy `includeInTotals`
        // when present. Default true.
        const includeInTotal =
          r?.includeInTotal === false ? false :
          r?.includeInTotal === true ? true :
          r?.includeInTotals !== false;
        return {
          ...base,
          kind,
          formulaType:
            r?.formulaType === "subtract" || r?.formulaType === "custom"
              ? r.formulaType
              : "sum",
          rowReferences: Array.isArray(r?.rowReferences) ? r.rowReferences : [],
          customFormula: typeof r?.customFormula === "string" ? r.customFormula : "",
          style: r?.style,
          includeInTotals: includeInTotal,
          isSubtotal: r?.isSubtotal === true,
          binding,
          scalingFactor,
          quickFormat,
          includeInTotal,
          // Legacy entries preserve pre-feature behavior (columns evaluate first).
          evaluateColumnsBeforeRows:
            typeof r?.evaluateColumnsBeforeRows === "boolean"
              ? r.evaluateColumnsBeforeRows
              : true,
          description: typeof r?.description === "string" ? r.description : undefined,
        };
      }
      case "blank":
        return {
          ...base,
          kind: "blank",
          height: typeof r?.height === "number" ? r.height : undefined,
        };
      case "group":
        return {
          ...base,
          kind: "group",
          label: typeof r?.label === "string" ? r.label : undefined,
          style: r?.style,
        };
      case "divider":
        return {
          ...base,
          kind: "divider",
          lineStyle:
            r?.lineStyle === "double" || r?.lineStyle === "dashed"
              ? r.lineStyle
              : "single",
          lineColor: typeof r?.lineColor === "string" ? r.lineColor : "#d1d5db",
        };
    }
  });
}

export interface ManualDataSettings {
  notes: string;
  edits: string;
  rowOrder: string;
  colOrder: string;
  labelOverrides: string;
  locks: string;
  /** JSON string[] of hidden column/measure keys */
  hiddenCols: string;
  /** JSON Record<key,number> of per-column custom widths */
  colWidths: string;
  /** JSON array of {id, name, value, description} named variables */
  variables: string;
  /** JSON array of {id, label, rowKeys: string[]} row groupings */
  groupings: string;
  /** JSON array of {measureIndex, direction, priority} sort rules */
  sortRules: string;
  /** JSON Record<measureIndex, string> aggregation overrides */
  aggregationOverrides: string;
  /** JSON FilterRule[] for value-based row filtering */
  filterRules: string;
  /** JSON { topN: number; measureIndex: number; direction: "top"|"bottom" } Top N config */
  topNConfig: string;
  /** JSON string[] of hidden row keys */
  hiddenRowKeys: string;
  /** JSON number[] of hidden row hierarchy levels */
  hiddenRowLevels: string;
  /** JSON number[] of hidden column hierarchy levels */
  hiddenColumnLevels: string;
  /**
   * JSON Record<compositeColKey, ColumnFormat> — per-column direct formatting.
   * compositeColKey is "<flattenedColKey>::m<measureIndex>" (same as gridColumn.key).
   * ColumnFormat fields are partial: bold, italic, underline, textColor,
   * backgroundColor, alignment, quickFormat ("none"|"auto"|"thousands"|
   * "millions"|"billions"|"trillions"), numberFormat, decimals.
   */
  colFormats: string;
  /**
   * JSON Record<rowKey, RowFormat> — per-row direct formatting. Mirrors the
   * column-format shape for bold/italic/underline/textColor/backgroundColor/
   * alignment, plus optional borderTop/borderBottom dividers.
   */
  rowFormats: string;
  /** JSON string[] — row keys that are expanded. Persisted so expansion
   * state survives page navigation and file reload. */
  expandedRows: string;
  /** JSON string[] — column keys that are expanded. Same as expandedRows. */
  expandedCols: string;
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
    invertRows: false,
    simulateMode: false,
    wrapText: false,
    strikethrough: false,
  },
  layout: {
    mode: "hierarchy",
    pageMode: "single",
    rowBreak: "none",
    columnBreak: "none",
    stylePreset: "modern",
  },
  theme: {
    preset: "modern-light",
    density: "comfortable",
    customAccentColor: "#2563eb",
    dividerLines: false,
    rowHover: true,
    stickyTotals: false,
    numberAlignmentByMeasure: false,
  },
  headers: {
    fontSize: 11,
    bold: true,
    backgroundColor: "#f5f5f5",
    textColor: "#333333",
    rowHeaderParentBold: true,
    rowHeaderParentColor: "#111827",
    rowHeaderChildColor: "#4b5563",
    colHeaderLevel0Color: "#111827",
    colHeaderLevel1Color: "#374151",
    colHeaderLeafColor: "#4b5563",
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
    quickFormat: "none",
    decimals: 0,
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
    grandTotalBold: true,
    grandTotalBackgroundColor: "#d1d5db",
    grandTotalTextColor: "#111827",
    subtotalBold: true,
    subtotalBackgroundColor: "#f3f4f6",
    subtotalTextColor: "#374151",
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
    backgroundImage: "",
    backgroundBlur: 0,
    glassmorphism: false,
    surfaceOpacity: 92,
    gradientStart: "#f8fbff",
    gradientEnd: "#e8f1ff",
    gradientAngle: 135,
    overlayColor: "#0f172a",
    overlayOpacity: 0,
    backgroundEffect: "none",
    layoutStyle: "standard",
  },
  title: {
    show: false,
    text: "",
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#ffffff",
    alignment: "left",
    height: 40,
  },
  calculations: {
    measures: "[]",
    rows: "[]",
    timeIntelligence: "[]",
    visualColumns: "[]",
  },
  manualData: {
    notes: "{}",
    edits: "{}",
    rowOrder: "[]",
    colOrder: "[]",
    labelOverrides: "{}",
    locks: "[]",
    hiddenCols: "[]",
    colWidths: "{}",
    variables: "[]",
    groupings: "[]",
    sortRules: "[]",
    aggregationOverrides: "{}",
    filterRules: "[]",
    topNConfig: "{}",
    hiddenRowKeys: "[]",
    hiddenRowLevels: "[]",
    hiddenColumnLevels: "[]",
    colFormats: "{}",
    rowFormats: "{}",
    expandedRows: "[]",
    expandedCols: "[]",
  },
  uiState: {
    explorerOpen: false,
    toolbarMode: "full",
    toolbarPinned: true,
    zoomLevel: 100,
    activeTab: "home",
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
      invertRows: getValue(objects, "general", "invertRows", defaultSettings.general.invertRows),
      simulateMode: getValue(objects, "general", "simulateMode", defaultSettings.general.simulateMode),
      wrapText: getValue(objects, "general", "wrapText", defaultSettings.general.wrapText),
      strikethrough: getValue(objects, "general", "strikethrough", defaultSettings.general.strikethrough),
    },
    layout: {
      mode: getValue(objects, "layout", "mode", defaultSettings.layout.mode),
      pageMode: getValue(objects, "layout", "pageMode", defaultSettings.layout.pageMode),
      rowBreak: getValue(objects, "layout", "rowBreak", defaultSettings.layout.rowBreak),
      columnBreak: getValue(objects, "layout", "columnBreak", defaultSettings.layout.columnBreak),
      stylePreset: getValue(objects, "layout", "stylePreset", defaultSettings.layout.stylePreset),
    },
    theme: {
      preset: getValue(objects, "theme", "preset", defaultSettings.theme.preset),
      density: getValue(objects, "theme", "density", defaultSettings.theme.density),
      customAccentColor: getColor(objects, "theme", "customAccentColor", defaultSettings.theme.customAccentColor),
      dividerLines: getValue(objects, "theme", "dividerLines", defaultSettings.theme.dividerLines),
      rowHover: getValue(objects, "theme", "rowHover", defaultSettings.theme.rowHover),
      stickyTotals: getValue(objects, "theme", "stickyTotals", defaultSettings.theme.stickyTotals),
      numberAlignmentByMeasure: getValue(objects, "theme", "numberAlignmentByMeasure", defaultSettings.theme.numberAlignmentByMeasure),
    },
    headers: {
      fontSize: getValue(objects, "headers", "fontSize", defaultSettings.headers.fontSize),
      bold: getValue(objects, "headers", "bold", defaultSettings.headers.bold),
      backgroundColor: getColor(objects, "headers", "backgroundColor", defaultSettings.headers.backgroundColor),
      textColor: getColor(objects, "headers", "textColor", defaultSettings.headers.textColor),
      rowHeaderParentBold: getValue(objects, "headers", "rowHeaderParentBold", defaultSettings.headers.rowHeaderParentBold),
      rowHeaderParentColor: getColor(objects, "headers", "rowHeaderParentColor", defaultSettings.headers.rowHeaderParentColor),
      rowHeaderChildColor: getColor(objects, "headers", "rowHeaderChildColor", defaultSettings.headers.rowHeaderChildColor),
      colHeaderLevel0Color: getColor(objects, "headers", "colHeaderLevel0Color", defaultSettings.headers.colHeaderLevel0Color),
      colHeaderLevel1Color: getColor(objects, "headers", "colHeaderLevel1Color", defaultSettings.headers.colHeaderLevel1Color),
      colHeaderLeafColor: getColor(objects, "headers", "colHeaderLeafColor", defaultSettings.headers.colHeaderLeafColor),
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
      quickFormat: getValue(objects, "values", "quickFormat", defaultSettings.values.quickFormat),
      decimals: getValue(objects, "values", "decimals", defaultSettings.values.decimals),
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
      grandTotalBold: getValue(objects, "totals", "grandTotalBold", defaultSettings.totals.grandTotalBold),
      grandTotalBackgroundColor: getColor(objects, "totals", "grandTotalBackgroundColor", defaultSettings.totals.grandTotalBackgroundColor),
      grandTotalTextColor: getColor(objects, "totals", "grandTotalTextColor", defaultSettings.totals.grandTotalTextColor),
      subtotalBold: getValue(objects, "totals", "subtotalBold", defaultSettings.totals.subtotalBold),
      subtotalBackgroundColor: getColor(objects, "totals", "subtotalBackgroundColor", defaultSettings.totals.subtotalBackgroundColor),
      subtotalTextColor: getColor(objects, "totals", "subtotalTextColor", defaultSettings.totals.subtotalTextColor),
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
      backgroundImage: getValue(objects, "appearance", "backgroundImage", defaultSettings.appearance.backgroundImage),
      backgroundBlur: getValue(objects, "appearance", "backgroundBlur", defaultSettings.appearance.backgroundBlur),
      glassmorphism: getValue(objects, "appearance", "glassmorphism", defaultSettings.appearance.glassmorphism),
      surfaceOpacity: getValue(objects, "appearance", "surfaceOpacity", defaultSettings.appearance.surfaceOpacity),
      gradientStart: getColor(objects, "appearance", "gradientStart", defaultSettings.appearance.gradientStart!),
      gradientEnd: getColor(objects, "appearance", "gradientEnd", defaultSettings.appearance.gradientEnd!),
      gradientAngle: getValue(objects, "appearance", "gradientAngle", defaultSettings.appearance.gradientAngle),
      overlayColor: getColor(objects, "appearance", "overlayColor", defaultSettings.appearance.overlayColor!),
      overlayOpacity: getValue(objects, "appearance", "overlayOpacity", defaultSettings.appearance.overlayOpacity),
      backgroundEffect: getValue(objects, "appearance", "backgroundEffect", defaultSettings.appearance.backgroundEffect),
      layoutStyle: getValue(objects, "appearance", "layoutStyle", defaultSettings.appearance.layoutStyle),
    },
    title: {
      show: getValue(objects, "title", "show", defaultSettings.title.show),
      text: getValue(objects, "title", "text", defaultSettings.title.text),
      fontSize: getValue(objects, "title", "fontSize", defaultSettings.title.fontSize),
      color: getColor(objects, "title", "color", defaultSettings.title.color),
      backgroundColor: getColor(objects, "title", "backgroundColor", defaultSettings.title.backgroundColor),
      alignment: getValue(objects, "title", "alignment", defaultSettings.title.alignment),
      height: getValue(objects, "title", "height", defaultSettings.title.height),
    },
    calculations: {
      measures: getValue(objects, "calculations", "measures", defaultSettings.calculations.measures),
      rows: getValue(objects, "calculations", "rows", defaultSettings.calculations.rows),
      timeIntelligence: getValue(objects, "calculations", "timeIntelligence", defaultSettings.calculations.timeIntelligence),
      visualColumns: getValue(objects, "calculations", "visualColumns", defaultSettings.calculations.visualColumns),
    },
    manualData: {
      notes: getValue(objects, "manualData", "notes", defaultSettings.manualData.notes),
      edits: getValue(objects, "manualData", "edits", defaultSettings.manualData.edits),
      rowOrder: getValue(objects, "manualData", "rowOrder", defaultSettings.manualData.rowOrder),
      colOrder: getValue(objects, "manualData", "colOrder", defaultSettings.manualData.colOrder),
      labelOverrides: getValue(objects, "manualData", "labelOverrides", defaultSettings.manualData.labelOverrides),
      locks: getValue(objects, "manualData", "locks", defaultSettings.manualData.locks),
      hiddenCols: getValue(objects, "manualData", "hiddenCols", defaultSettings.manualData.hiddenCols),
      colWidths: getValue(objects, "manualData", "colWidths", defaultSettings.manualData.colWidths),
      variables: getValue(objects, "manualData", "variables", defaultSettings.manualData.variables),
      groupings: getValue(objects, "manualData", "groupings", defaultSettings.manualData.groupings),
      sortRules: getValue(objects, "manualData", "sortRules", defaultSettings.manualData.sortRules),
      aggregationOverrides: getValue(objects, "manualData", "aggregationOverrides", defaultSettings.manualData.aggregationOverrides),
      filterRules: getValue(objects, "manualData", "filterRules", defaultSettings.manualData.filterRules),
      topNConfig: getValue(objects, "manualData", "topNConfig", defaultSettings.manualData.topNConfig),
      hiddenRowKeys: getValue(objects, "manualData", "hiddenRowKeys", defaultSettings.manualData.hiddenRowKeys),
      hiddenRowLevels: getValue(objects, "manualData", "hiddenRowLevels", defaultSettings.manualData.hiddenRowLevels),
      hiddenColumnLevels: getValue(objects, "manualData", "hiddenColumnLevels", defaultSettings.manualData.hiddenColumnLevels),
      colFormats: getValue(objects, "manualData", "colFormats", defaultSettings.manualData.colFormats),
      rowFormats: getValue(objects, "manualData", "rowFormats", defaultSettings.manualData.rowFormats),
      expandedRows: getValue(objects, "manualData", "expandedRows", defaultSettings.manualData.expandedRows),
      expandedCols: getValue(objects, "manualData", "expandedCols", defaultSettings.manualData.expandedCols),
    },
    uiState: {
      explorerOpen: getValue(objects, "uiState", "explorerOpen", defaultSettings.uiState.explorerOpen),
      toolbarMode: getValue(objects, "uiState", "toolbarMode", defaultSettings.uiState.toolbarMode),
      toolbarPinned: getValue(objects, "uiState", "toolbarPinned", defaultSettings.uiState.toolbarPinned),
      zoomLevel: getValue(objects, "uiState", "zoomLevel", defaultSettings.uiState.zoomLevel),
      activeTab: getValue(objects, "uiState", "activeTab", defaultSettings.uiState.activeTab),
    },
  };
}

