import React, { memo, useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { QuickNumberFormat, ColumnFormat, parseColFormats, resolveColumnFormat } from "../format/directFormats";
import { VisualSettings, ThemeDensity } from "../settings/settings";
import { secureRandomId } from "../model/keys";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconFontColor,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconSort,
  IconFilter,
  IconSearch,
  IconLevels,
  IconTopN,
  IconInsertRow,
  IconManageColumns,
  IconTotals,
  IconGroup,
  IconSmartAnalysis,
  IconCondFormat,
  IconBars,
  IconNumber,
  IconSliders,
  IconDownload,
  IconCollapse,
  IconExpand,
  IconChevronDown,
} from "./icons";
import { ConditionalFormattingDropdown } from "./ConditionalFormattingDropdown";

export type RibbonTab = "home" | "insert" | "design" | "export";
/** "full" shows icon + label; "compact" is icon-only. Both render the same items. */
export type ToolbarMode = "full" | "compact";
export type RowInsertAction = "panel" | "calculated" | "blank" | "group" | "divider";

/** Maps persisted toolbar modes (including the retired "minimal" layouts) onto the current ones. */
export function normalizeToolbarMode(value: unknown): ToolbarMode {
  return value === "full" || value === undefined || value === null || value === "" ? "full" : "compact";
}

/** Height of the command bar in px (same for both modes, so switching never shifts the grid). */
export const RIBBON_HEIGHT = 44;

export interface RibbonProps {
  settings: VisualSettings;
  allowInteractions: boolean;
  hasData: boolean;
  hasValues: boolean;
  toolbarMode: ToolbarMode;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onExportPDF?: () => void;
  onExportJSON: () => void;
  onOpenCalcMeasurePanel?: () => void;
  onOpenCalcRowPanel?: (action?: RowInsertAction) => void;
  onOpenTotalsPanel?: () => void;
  onOpenManageColumnsPanel?: () => void;
  onOpenCondFormatPanel?: () => void;
  onOpenBulkOperations?: () => void;
  onToolbarModeChange?: (mode: ToolbarMode) => void;
  onCopyToClipboard?: () => void;
  onOpenSortPanel?: () => void;
  /** Opens the Find (Ctrl+F) panel over the matrix. */
  onOpenFind?: () => void;
  onOpenThemeGallery?: () => void;
  onOpenHeaderFooter?: () => void;
  onOpenSmartAnalysis?: () => void;
  onOpenGoalSeek?: () => void;
  onOpenVariables?: () => void;
  onOpenGroupPanel?: () => void;
  onOpenAggregation?: () => void;
  onOpenNotesPanel?: () => void;
  onOpenTopNPanel?: () => void;
  onOpenFilterPanel?: () => void;
  onOpenLevelPanel?: () => void;
  onOpenCondFormatDraft?: (draft: any) => void;
  selectedColumnKeys?: string[];
  selectedRowKeys?: string[];
  onApplyColumnFormat?: (keys: string[], patch: Record<string, any>) => void;
  onApplyRowFormat?: (keys: string[], patch: Record<string, any>) => void;
  /** Adds a variance column next to the selected column. */
  onAddQuickVariance?: () => void;
  /** Raw JSON string from settings.manualData.colFormats for reading column-level state. */
  colFormatsJson?: string;
  rowFormatsJson?: string;
}

// ── Menu model ──────────────────────────────────────────────────────────────

type MenuEntry =
  | { kind: "action"; label: string; hint?: string; onSelect: () => void; disabled?: boolean }
  | { kind: "check"; label: string; checked: boolean; onSelect: () => void; disabled?: boolean }
  | { kind: "heading"; label: string }
  | { kind: "separator" }
  | { kind: "custom"; key: string; render: (close: () => void) => React.ReactNode };

const TEXT_SWATCHES = ["#111827", "#4b5563", "#9ca3af", "#2d74da", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#7c3aed"];
const FILL_SWATCHES = ["transparent", "#f3f4f6", "#e0ecfb", "#dcfce7", "#fef3c7", "#fee2e2", "#ede9fe", "#fce7f3", "#e0f2fe"];

/** Floating menu anchored below a toolbar button. Fixed positioning so the bar's overflow never clips it. */
const RibbonMenu: React.FC<{
  anchor: HTMLElement;
  entries: MenuEntry[];
  onClose: () => void;
  align?: "start" | "end";
}> = ({ anchor, entries, onClose, align = "start" }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const width = menuRef.current?.offsetWidth ?? 220;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const preferred = align === "end" ? rect.right - width : rect.left;
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(preferred, viewportWidth - width - 8)) });
  }, [anchor, align]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchor.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
  }, []);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("button.rb-menu-item:not(:disabled)") ?? []);
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next].focus();
    e.preventDefault();
  };

  return (
    <div
      ref={menuRef}
      className="rb-menu"
      role="menu"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      onKeyDown={onMenuKeyDown}
    >
      {entries.map((entry, i) => {
        switch (entry.kind) {
          case "separator":
            return <div key={`sep-${i}`} className="rb-menu-sep" role="separator" />;
          case "heading":
            return <div key={`h-${i}`} className="rb-menu-heading">{entry.label}</div>;
          case "custom":
            return <React.Fragment key={entry.key}>{entry.render(onClose)}</React.Fragment>;
          case "check":
            return (
              <button
                key={`c-${i}`}
                type="button"
                role="menuitemcheckbox"
                aria-checked={entry.checked}
                className={`rb-menu-item ${entry.checked ? "is-checked" : ""}`}
                disabled={entry.disabled}
                onClick={() => entry.onSelect()}
              >
                <span className="rb-menu-check" aria-hidden="true">{entry.checked ? "✓" : ""}</span>
                <span className="rb-menu-label">{entry.label}</span>
              </button>
            );
          default:
            return (
              <button
                key={`a-${i}`}
                type="button"
                role="menuitem"
                className="rb-menu-item"
                disabled={entry.disabled}
                onClick={() => {
                  entry.onSelect();
                  onClose();
                }}
              >
                <span className="rb-menu-check" aria-hidden="true" />
                <span className="rb-menu-label">{entry.label}</span>
                {entry.hint && <span className="rb-menu-hint">{entry.hint}</span>}
              </button>
            );
        }
      })}
    </div>
  );
};

const Swatches: React.FC<{
  colors: string[];
  value: string | undefined;
  onPick: (color: string) => void;
  label: string;
}> = ({ colors, value, onPick, label }) => (
  <div className="rb-swatch-row" role="group" aria-label={label}>
    {colors.map(color => (
      <button
        key={color}
        type="button"
        className={`rb-swatch ${color === "transparent" ? "is-none" : ""} ${(value || "").toLowerCase() === color ? "is-current" : ""}`}
        style={color === "transparent" ? undefined : { background: color }}
        title={color === "transparent" ? "No fill" : color}
        aria-label={color === "transparent" ? "No fill" : color}
        onClick={() => onPick(color)}
      />
    ))}
    <label className="rb-swatch is-custom" title="Custom color">
      <span aria-hidden="true">+</span>
      <input
        type="color"
        value={value && value.startsWith("#") && value.length === 7 ? value : "#2d74da"}
        onChange={(e) => onPick(e.target.value)}
        aria-label={`Custom ${label.toLowerCase()}`}
      />
    </label>
  </div>
);

// ── Ribbon ──────────────────────────────────────────────────────────────────

export const Ribbon: React.FC<RibbonProps> = memo(({
  settings,
  allowInteractions,
  hasData,
  hasValues,
  toolbarMode,
  onPersistProperty,
  onExportCSV,
  onExportXLSX,
  onExportPDF,
  onExportJSON,
  onOpenCalcMeasurePanel,
  onOpenCalcRowPanel,
  onOpenTotalsPanel,
  onOpenManageColumnsPanel,
  onOpenCondFormatPanel,
  onOpenBulkOperations,
  onToolbarModeChange,
  onCopyToClipboard,
  onOpenSortPanel,
  onOpenFind,
  onOpenThemeGallery,
  onOpenHeaderFooter,
  onOpenSmartAnalysis,
  onOpenGoalSeek,
  onOpenVariables,
  onOpenGroupPanel,
  onOpenAggregation,
  onOpenNotesPanel,
  onOpenTopNPanel,
  onOpenFilterPanel,
  onOpenLevelPanel,
  onOpenCondFormatDraft,
  selectedColumnKeys,
  selectedRowKeys,
  onApplyColumnFormat,
  onApplyRowFormat,
  onAddQuickVariance,
  colFormatsJson,
  rowFormatsJson,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [cfAnchor, setCfAnchor] = useState<DOMRect | null>(null);

  // Labels drop automatically when the bar is too narrow to show them, so
  // "full" degrades into "compact" instead of scrolling or wrapping.
  // Three steps: 0 = every label, 1 = labels on the main actions only, 2 = icons only.
  const [labelStep, setLabelStep] = useState<0 | 1 | 2>(0);
  const stepWidthsRef = useRef<number[]>([0, 0]); // content width steps 0 and 1 needed when they last overflowed
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const fit = () => {
      if (labelStep < 2 && el.scrollWidth > el.clientWidth + 1) {
        stepWidthsRef.current[labelStep] = el.scrollWidth;
        setLabelStep((labelStep + 1) as 0 | 1 | 2);
      } else if (labelStep > 0 && el.clientWidth >= stepWidthsRef.current[labelStep - 1]) {
        setLabelStep((labelStep - 1) as 0 | 1 | 2);
      }
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [labelStep, toolbarMode]);
  const showLabels = toolbarMode === "full" && labelStep < 2;

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const toggleMenu = (id: string, anchor: HTMLElement) =>
    setOpenMenu(current => (current?.id === id ? null : { id, anchor }));

  // ── Formatting context: selected columns, else selected rows, else all values ──
  const colFormats = useMemo(() => parseColFormats(colFormatsJson), [colFormatsJson]);
  const rowFormats = useMemo(() => {
    if (!rowFormatsJson) return {} as Record<string, Record<string, any>>;
    try {
      const parsed = JSON.parse(rowFormatsJson);
      return parsed && typeof parsed === "object" ? parsed as Record<string, Record<string, any>> : {};
    } catch {
      return {} as Record<string, Record<string, any>>;
    }
  }, [rowFormatsJson]);

  const colCount = selectedColumnKeys?.length ?? 0;
  const rowCount = selectedRowKeys?.length ?? 0;
  const scopeLabel = colCount > 0
    ? `${colCount} column${colCount === 1 ? "" : "s"}`
    : rowCount > 0
      ? `${rowCount} row${rowCount === 1 ? "" : "s"}`
      : "All values";

  const getEffective = useCallback(<K extends keyof ColumnFormat>(prop: K): ColumnFormat[K] | undefined => {
    if (selectedColumnKeys && selectedColumnKeys.length > 0) {
      const firstKey = selectedColumnKeys[0];
      if (firstKey.startsWith("m:")) {
        const fmt = colFormats[firstKey];
        if (fmt && fmt[prop] !== undefined) return fmt[prop];
      }
      const parts = firstKey.split("::m");
      const fmt = resolveColumnFormat(colFormats, parts[0], parts.length > 1 ? parseInt(parts[1]) : -1);
      if (fmt && fmt[prop] !== undefined) return fmt[prop];
    }
    if (selectedRowKeys && selectedRowKeys.length > 0) {
      const fmt = rowFormats[selectedRowKeys[0]];
      if (fmt && fmt[prop] !== undefined) return fmt[prop];
    }
    return (settings.values as any)[prop];
  }, [selectedColumnKeys, selectedRowKeys, colFormats, rowFormats, settings.values]);

  const effBold = getEffective("bold") ?? settings.values.bold;
  const effItalic = getEffective("italic") ?? settings.values.italic;
  const effUnderline = getEffective("underline") ?? settings.values.underline;
  const effNumberFormat = getEffective("numberFormat") ?? settings.values.numberFormat ?? "";
  const effAlignment = getEffective("alignment") ?? settings.values.alignment;
  const effDecimals = getEffective("decimals") ?? settings.values.decimals ?? 0;
  const effTextColor = getEffective("textColor") ?? settings.values.textColor;
  const effBgColor = getEffective("backgroundColor") ?? settings.values.backgroundColor;
  const effQuickFormat = (getEffective("quickFormat") ?? settings.values.quickFormat ?? "none") as QuickNumberFormat;

  /** Applies to selected columns, else selected rows, else the global value format. */
  const handleFormatUpdate = useCallback((patch: Record<string, any>) => {
    if (selectedColumnKeys && selectedColumnKeys.length > 0) {
      onApplyColumnFormat?.(Array.from(new Set(selectedColumnKeys)), patch);
    } else if (selectedRowKeys && selectedRowKeys.length > 0) {
      onApplyRowFormat?.(Array.from(new Set(selectedRowKeys)), patch);
    } else {
      Object.keys(patch).forEach(key => onPersistProperty("values", key, patch[key]));
    }
  }, [selectedColumnKeys, selectedRowKeys, onApplyColumnFormat, onApplyRowFormat, onPersistProperty]);

  const toggle = (objectName: string, propertyName: string, currentValue: boolean) => {
    if (!allowInteractions) return;
    onPersistProperty(objectName, propertyName, !currentValue);
  };

  // ── Conditional-formatting quick rules (open as drafts in the rules panel) ──
  const openCfDraft = (rule: any) => {
    if (!allowInteractions) return;
    setCfAnchor(null);
    onOpenCondFormatDraft?.(rule);
  };
  const newRuleId = () => `rule_${Date.now()}_${secureRandomId(6)}`;
  const baseScope = () => ({
    targetType: "rows" as const,
    targetMeasure: -1,
    rowHierarchyLevels: "valuesAndTotals" as const,
    excludeColumnGrandTotal: false,
  });
  const quickSign = (positive: boolean) => openCfDraft({
    id: newRuleId(),
    title: positive ? "Quick Positive" : "Quick Negative",
    enabled: true,
    scope: baseScope(),
    formatBy: "rules",
    rulesConfig: {
      impactOn: ["label"],
      conditions: [{ basedOnMeasure: -1, op: positive ? "greaterThan" : "lessThan", value: 0 }],
      style: { color: positive ? "#15803d" : "#b91c1c", fontWeight: "600" },
    },
  });
  const quickColorScale = (colors: string[], name: string, applyTo: "background" | "dataBar" = "background") => openCfDraft({
    id: newRuleId(),
    title: name,
    enabled: true,
    scope: baseScope(),
    formatBy: "colorScale",
    colorScaleConfig: {
      basedOnMeasure: -1,
      applyTo,
      heatMapType: "columnWise",
      scaleType: "sequential",
      colorScheme: colors,
      reverse: false,
      numberOfBands: applyTo === "dataBar" ? 0 : 5,
      hideValue: false,
      autoFontColor: applyTo !== "dataBar",
      includeNull: false,
    },
  });
  const quickClassification = () => openCfDraft({
    id: newRuleId(),
    title: "Quick Classification",
    enabled: true,
    scope: baseScope(),
    formatBy: "classification",
    classificationConfig: {
      impactOn: ["label"],
      basedOnMeasure: -1,
      displayIcons: true,
      applyToCharts: true,
      showAsNewColumn: false,
      iconPosition: "leftOfData",
      rangeMode: "percentage",
      ranges: [
        { from: -1e9, to: 33, iconKind: "cross", color: "#dc2626" },
        { from: 33, to: 66, iconKind: "warn", color: "#eab308" },
        { from: 66, to: 1e9, iconKind: "check", color: "#16a34a" },
      ],
    },
  });
  const handleCfSelect = (id: string) => {
    if (id === "quick-positive") quickSign(true);
    else if (id === "quick-negative") quickSign(false);
    else if (id === "scale-seq-blue") quickColorScale(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"], "Sequential Blue");
    else if (id === "scale-seq-orange") quickColorScale(["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"], "Sequential Orange");
    else if (id === "scale-seq-green") quickColorScale(["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"], "Sequential Green");
    else if (id === "scale-qual-cool") quickColorScale(["#10b981", "#7c3aed", "#ef4444", "#eab308", "#3b82f6", "#6b7280"], "Qualitative Cool");
    else if (id === "scale-qual-earth") quickColorScale(["#93c5fd", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5", "#a8a29e"], "Qualitative Earth");
    else if (id === "scale-div-rwg") quickColorScale(["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"], "Diverging Red-Yellow-Green");
    else if (id === "scale-div-rwb") quickColorScale(["#b91c1c", "#fca5a5", "#fef9c3", "#bae6fd", "#1d4ed8"], "Diverging Red-Blue");
    else if (id === "scale-div-byg") quickColorScale(["#854d0e", "#d97706", "#ecfeff", "#22d3ee", "#0e7490"], "Diverging Brown-Teal");
    else if (id === "scale-cont-warm") quickColorScale(["#f97316", "#be123c"], "Continuous Warm");
    else if (id === "scale-cont-div") quickColorScale(["#ef4444", "#ffffff", "#6366f1"], "Continuous Diverging");
    else if (id.startsWith("class-")) quickClassification();
    else if (id === "bar-blue") quickColorScale(["#4f86c6", "#1d4ed8"], "Data Bars", "dataBar");
    else if (id === "bar-green") quickColorScale(["#dcfce7", "#16a34a"], "Data Bar Green");
    else if (id === "bar-red") quickColorScale(["#fee2e2", "#dc2626"], "Data Bar Red");
    else if (id === "bar-orange") quickColorScale(["#ffedd5", "#f59e0b"], "Data Bar Orange");
    else if (id === "bar-pink") quickColorScale(["#fce7f3", "#ec4899"], "Data Bar Pink");
    else onOpenCondFormatPanel?.();
    setCfAnchor(null);
  };

  // ── Active-state readers ──
  const jsonArrayHasItems = (json: string | undefined) => {
    try { const v = JSON.parse(json || "[]"); return Array.isArray(v) && v.length > 0; } catch { return false; }
  };
  const filterActive = jsonArrayHasItems(settings.manualData.filterRules);
  const levelsActive = jsonArrayHasItems(settings.manualData.hiddenRowLevels) || jsonArrayHasItems(settings.manualData.hiddenColumnLevels);
  const topNActive = (() => {
    try { return (JSON.parse(settings.manualData.topNConfig || "{}").topN || 0) > 0; } catch { return false; }
  })();
  const visualsActive = settings.dataBars.enabled || settings.kpiIcons.enabled || settings.sparklines.enabled;

  const edit = !allowInteractions;          // editing controls disabled in read-only mode
  const needsData = edit || !hasData;
  const needsValues = edit || !hasValues;

  // ── Menus ──
  const menus: Record<string, MenuEntry[]> = {
    rows: [
      { kind: "action", label: "Calculated row", onSelect: () => onOpenCalcRowPanel?.("calculated"), disabled: needsData },
      { kind: "action", label: "Group header", onSelect: () => onOpenCalcRowPanel?.("group"), disabled: needsData },
      { kind: "action", label: "Blank row", onSelect: () => onOpenCalcRowPanel?.("blank"), disabled: needsData },
      { kind: "action", label: "Divider", onSelect: () => onOpenCalcRowPanel?.("divider"), disabled: needsData },
      { kind: "separator" },
      { kind: "check", label: "Reverse row order", checked: settings.general.invertRows, onSelect: () => toggle("general", "invertRows", settings.general.invertRows), disabled: edit },
      { kind: "action", label: "Manage rows…", onSelect: () => onOpenCalcRowPanel?.("panel"), disabled: needsData },
    ],
    columns: [
      { kind: "action", label: "Calculated measure", onSelect: () => onOpenCalcMeasurePanel?.(), disabled: needsValues },
      { kind: "action", label: "Variance from selected column", onSelect: () => onAddQuickVariance?.(), disabled: needsValues || colCount === 0 || !onAddQuickVariance },
      { kind: "action", label: "Aggregation overrides…", onSelect: () => onOpenAggregation?.(), disabled: needsValues },
      { kind: "separator" },
      { kind: "action", label: "Manage columns…", onSelect: () => onOpenManageColumnsPanel?.(), disabled: edit },
    ],
    analyze: [
      { kind: "action", label: "Smart analysis", onSelect: () => onOpenSmartAnalysis?.(), disabled: needsData },
      { kind: "action", label: "Goal seek", onSelect: () => onOpenGoalSeek?.(), disabled: needsValues },
      { kind: "action", label: "Variables", onSelect: () => onOpenVariables?.(), disabled: edit },
      { kind: "separator" },
      { kind: "action", label: "Bulk edit values", onSelect: () => onOpenBulkOperations?.(), disabled: edit },
      { kind: "action", label: "Notes", onSelect: () => onOpenNotesPanel?.(), disabled: edit },
      { kind: "check", label: "What-if simulation", checked: settings.general.simulateMode, onSelect: () => toggle("general", "simulateMode", settings.general.simulateMode), disabled: edit },
    ],
    align: [
      { kind: "check", label: "Align left", checked: effAlignment === "left", onSelect: () => handleFormatUpdate({ alignment: "left" }), disabled: edit },
      { kind: "check", label: "Align center", checked: effAlignment === "center", onSelect: () => handleFormatUpdate({ alignment: "center" }), disabled: edit },
      { kind: "check", label: "Align right", checked: effAlignment === "right", onSelect: () => handleFormatUpdate({ alignment: "right" }), disabled: edit },
    ],
    text: [
      { kind: "heading", label: "Font" },
      ...([
        ["-apple-system", "System"], ["Segoe UI", "Segoe UI"], ["Arial", "Arial"], ["Georgia", "Georgia"],
      ] as Array<[string, string]>).map(([value, label]): MenuEntry => ({
        kind: "check", label, checked: (settings.general.fontFamily || "-apple-system") === value, onSelect: () => onPersistProperty("general", "fontFamily", value), disabled: edit,
      })),
      {
        kind: "custom",
        key: "size",
        render: () => (
          <div className="rb-menu-stepper">
            <span>Size</span>
            <button type="button" className="rb-step" disabled={edit || settings.values.fontSize <= 8} onClick={() => onPersistProperty("values", "fontSize", Math.max(8, settings.values.fontSize - 1))} aria-label="Smaller text">−</button>
            <span className="rb-step-value">{settings.values.fontSize}</span>
            <button type="button" className="rb-step" disabled={edit || settings.values.fontSize >= 32} onClick={() => onPersistProperty("values", "fontSize", Math.min(32, settings.values.fontSize + 1))} aria-label="Larger text">+</button>
          </div>
        ),
      },
      { kind: "separator" },
      { kind: "heading", label: "Text color" },
      { kind: "custom", key: "text", render: () => <Swatches label="Text color" colors={TEXT_SWATCHES} value={effTextColor} onPick={(c) => handleFormatUpdate({ textColor: c })} /> },
      { kind: "heading", label: "Fill color" },
      { kind: "custom", key: "fill", render: () => <Swatches label="Fill color" colors={FILL_SWATCHES} value={effBgColor} onPick={(c) => handleFormatUpdate({ backgroundColor: c })} /> },
    ],
    number: [
      { kind: "heading", label: "Format" },
      { kind: "check", label: "General", checked: !effNumberFormat, onSelect: () => handleFormatUpdate({ numberFormat: "" }), disabled: edit },
      { kind: "check", label: "Thousands separator  1,234", checked: effNumberFormat === "#,##0", onSelect: () => handleFormatUpdate({ numberFormat: "#,##0" }), disabled: edit },
      { kind: "check", label: "Currency  $1,234.00", checked: effNumberFormat === "$#,##0.00", onSelect: () => handleFormatUpdate({ numberFormat: "$#,##0.00" }), disabled: edit },
      { kind: "check", label: "Percent  12.3%", checked: effNumberFormat === "0.0%", onSelect: () => handleFormatUpdate({ numberFormat: "0.0%" }), disabled: edit },
      { kind: "separator" },
      { kind: "heading", label: "Display units" },
      ...([
        ["none", "None"], ["auto", "Auto"], ["thousands", "Thousands  K"], ["millions", "Millions  M"], ["billions", "Billions  B"],
      ] as Array<[QuickNumberFormat, string]>).map(([value, label]): MenuEntry => ({
        kind: "check", label, checked: effQuickFormat === value, onSelect: () => handleFormatUpdate({ quickFormat: value }), disabled: edit,
      })),
      { kind: "separator" },
      {
        kind: "custom",
        key: "decimals",
        render: () => (
          <div className="rb-menu-stepper">
            <span>Decimals</span>
            <button type="button" className="rb-step" disabled={edit || effDecimals <= 0} onClick={() => handleFormatUpdate({ decimals: Math.max(0, effDecimals - 1) })} aria-label="Fewer decimals">−</button>
            <span className="rb-step-value">{effDecimals}</span>
            <button type="button" className="rb-step" disabled={edit || effDecimals >= 10} onClick={() => handleFormatUpdate({ decimals: Math.min(10, effDecimals + 1) })} aria-label="More decimals">+</button>
          </div>
        ),
      },
    ],
    visuals: [
      { kind: "check", label: "Data bars", checked: settings.dataBars.enabled, onSelect: () => toggle("dataBars", "enabled", settings.dataBars.enabled), disabled: needsValues },
      { kind: "check", label: "Trend icons", checked: settings.kpiIcons.enabled, onSelect: () => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled), disabled: needsValues },
      { kind: "check", label: "Sparklines", checked: settings.sparklines.enabled, onSelect: () => toggle("sparklines", "enabled", settings.sparklines.enabled), disabled: needsValues },
    ],
    design: [
      { kind: "heading", label: "Layout" },
      ...([
        ["hierarchy", "Hierarchy"], ["outline", "Outline"], ["stepped", "Stepped"], ["table", "Flat table"],
      ] as Array<[string, string]>).map(([value, label]): MenuEntry => ({
        kind: "check", label, checked: settings.layout.mode === value, onSelect: () => onPersistProperty("layout", "mode", value), disabled: edit,
      })),
      { kind: "separator" },
      { kind: "heading", label: "Density" },
      ...([
        ["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"],
      ] as Array<[ThemeDensity, string]>).map(([value, label]): MenuEntry => ({
        kind: "check", label, checked: settings.theme.density === value, onSelect: () => onPersistProperty("theme", "density", value), disabled: edit,
      })),
      { kind: "separator" },
      { kind: "heading", label: "Lines" },
      { kind: "check", label: "Gridlines", checked: settings.general.showGridlines, onSelect: () => toggle("general", "showGridlines", settings.general.showGridlines), disabled: edit },
      ...([
        ["horizontal", "Row borders"], ["vertical", "Column borders"], ["all", "All borders"], ["outline", "Outline only"],
      ] as Array<[VisualSettings["values"]["borderStyle"], string]>).map(([value, label]): MenuEntry => ({
        kind: "check", label, checked: settings.values.borderStyle === value, onSelect: () => onPersistProperty("values", "borderStyle", settings.values.borderStyle === value ? "none" : value), disabled: edit,
      })),
      { kind: "separator" },
      { kind: "heading", label: "Rows" },
      { kind: "check", label: "Banded rows", checked: settings.general.rowBanding, onSelect: () => toggle("general", "rowBanding", settings.general.rowBanding), disabled: edit },
      { kind: "check", label: "Highlight row on hover", checked: settings.general.rowHighlight, onSelect: () => toggle("general", "rowHighlight", settings.general.rowHighlight), disabled: edit },
      { kind: "check", label: "Space between groups", checked: settings.layout.rowBreak !== "none", onSelect: () => onPersistProperty("layout", "rowBreak", settings.layout.rowBreak === "none" ? "section" : "none"), disabled: edit },
      { kind: "separator" },
      { kind: "action", label: "Themes…", onSelect: () => onOpenThemeGallery?.(), disabled: edit },
      { kind: "action", label: "Title and headers…", onSelect: () => onOpenHeaderFooter?.(), disabled: edit },
    ],
    export: [
      { kind: "action", label: "Excel workbook", hint: ".xlsx", onSelect: onExportXLSX, disabled: needsData },
      { kind: "action", label: "PDF report", hint: ".pdf", onSelect: () => onExportPDF?.(), disabled: needsData || !onExportPDF },
      { kind: "action", label: "CSV", hint: ".csv", onSelect: onExportCSV, disabled: needsData },
      { kind: "action", label: "JSON", hint: ".json", onSelect: onExportJSON, disabled: needsData },
      { kind: "separator" },
      { kind: "action", label: "Copy as table", hint: "TSV", onSelect: () => onCopyToClipboard?.(), disabled: needsData || !onCopyToClipboard },
    ],
  };

  // ── Building blocks ──
  const button = (opts: {
    id: string;
    icon: React.ReactNode;
    label: string;
    title?: string;
    onClick?: (el: HTMLButtonElement) => void;
    active?: boolean;
    disabled?: boolean;
    menu?: string;
    iconOnly?: boolean;
    /** Drops its label first when the bar runs out of room. */
    secondary?: boolean;
  }) => {
    const isMenuOpen = !!opts.menu && openMenu?.id === opts.menu;
    const labelVisible = showLabels && !opts.iconOnly && !(opts.secondary && labelStep >= 1);
    return (
      <button
        key={opts.id}
        type="button"
        className={`rb-btn ${opts.active ? "is-active" : ""} ${isMenuOpen ? "is-open" : ""} ${labelVisible ? "" : "is-icon"}`}
        title={opts.title ?? opts.label}
        aria-label={labelVisible ? undefined : opts.label}
        aria-pressed={opts.menu ? undefined : opts.active}
        aria-haspopup={opts.menu ? "menu" : undefined}
        aria-expanded={opts.menu ? isMenuOpen : undefined}
        disabled={opts.disabled}
        onClick={(e) => {
          const el = e.currentTarget;
          if (opts.menu) toggleMenu(opts.menu, el);
          else opts.onClick?.(el);
        }}
      >
        <span className="rb-icon">{opts.icon}</span>
        {labelVisible && <span className="rb-label">{opts.label}</span>}
        {opts.menu && <span className="rb-caret"><IconChevronDown size={10} /></span>}
      </button>
    );
  };

  const alignIcon = effAlignment === "left" ? <IconAlignLeft size={16} /> : effAlignment === "center" ? <IconAlignCenter size={16} /> : <IconAlignRight size={16} />;
  const colorIcon = (
    <span className="rb-color-icon">
      <IconFontColor size={16} />
      <span className="rb-color-bar" style={{ background: effTextColor || "currentColor" }} />
    </span>
  );

  return (
    <div className={`mx-ribbon mx-cmdbar ${showLabels ? "has-labels" : "is-compact"}`} role="toolbar" aria-label="Matrix commands" ref={barRef}>
      <div className="rb-group" role="group" aria-label="Explore">
        {button({ id: "sort", icon: <IconSort size={16} />, label: "Sort", onClick: () => onOpenSortPanel?.(), disabled: needsData })}
        {button({ id: "filter", icon: <IconFilter size={16} />, label: "Filter", onClick: () => onOpenFilterPanel?.(), active: filterActive, disabled: needsData })}
        {button({ id: "topn", secondary: true, icon: <IconTopN size={16} />, label: "Top N", onClick: () => onOpenTopNPanel?.(), active: topNActive, disabled: !hasData })}
        {button({ id: "levels", secondary: true, icon: <IconLevels size={16} />, label: "Levels", title: "Show or hide hierarchy levels", onClick: () => onOpenLevelPanel?.(), active: levelsActive, disabled: needsData })}
        {button({ id: "find", secondary: true, icon: <IconSearch size={16} />, label: "Find", title: "Find in labels and values (Ctrl+F)", onClick: () => onOpenFind?.(), disabled: !hasData || !onOpenFind })}
      </div>

      <div className="rb-group" role="group" aria-label="Build">
        {button({ id: "rows", icon: <IconInsertRow size={16} />, label: "Rows", menu: "rows", disabled: edit })}
        {button({ id: "columns", icon: <IconManageColumns size={16} />, label: "Columns", menu: "columns", disabled: edit })}
        {button({ id: "totals", icon: <IconTotals size={16} />, label: "Totals", title: "Totals and subtotals", onClick: () => onOpenTotalsPanel?.(), active: settings.totals.showGrandTotals, disabled: edit })}
        {button({ id: "group", secondary: true, icon: <IconGroup size={16} />, label: "Group", title: "Group rows", onClick: () => onOpenGroupPanel?.(), disabled: edit })}
      </div>

      <div className="rb-group" role="group" aria-label="Format">
        {labelStep === 0 && <span className="rb-scope" title="Formatting applies to this selection">{scopeLabel}</span>}
        {button({ id: "bold", icon: <IconBold size={16} />, label: "Bold", iconOnly: true, onClick: () => handleFormatUpdate({ bold: !effBold }), active: !!effBold, disabled: edit })}
        {button({ id: "italic", icon: <IconItalic size={16} />, label: "Italic", iconOnly: true, onClick: () => handleFormatUpdate({ italic: !effItalic }), active: !!effItalic, disabled: edit })}
        {button({ id: "underline", icon: <IconUnderline size={16} />, label: "Underline", iconOnly: true, onClick: () => handleFormatUpdate({ underline: !effUnderline }), active: !!effUnderline, disabled: edit })}
        {button({ id: "align", icon: alignIcon, label: "Alignment", iconOnly: true, menu: "align", disabled: edit })}
        {button({ id: "text", icon: colorIcon, label: "Text", title: "Font, size and colors", iconOnly: true, menu: "text", disabled: edit })}
        {button({ id: "number", secondary: true, icon: <IconNumber size={16} />, label: "Number", title: "Number format, display units and decimals", menu: "number", disabled: edit })}
        {button({
          id: "rules",
          icon: <IconCondFormat size={16} />,
          label: "Rules",
          title: "Conditional formatting",
          active: settings.conditionalFormatting.enabled,
          disabled: needsValues,
          onClick: (el) => setCfAnchor(current => (current ? null : el.getBoundingClientRect())),
        })}
        {button({ id: "visuals", secondary: true, icon: <IconBars size={16} />, label: "In-cell", title: "Data bars, trend icons and sparklines", menu: "visuals", active: visualsActive, disabled: needsValues })}
      </div>

      <div className="rb-group" role="group" aria-label="Analyze">
        {button({ id: "analyze", icon: <IconSmartAnalysis size={16} />, label: "Analyze", menu: "analyze", disabled: edit })}
      </div>

      <div className="rb-spacer" />

      <div className="rb-group is-trailing" role="group" aria-label="Output">
        {button({ id: "design", icon: <IconSliders size={16} />, label: "Design", title: "Layout, density and theme", menu: "design", disabled: edit })}
        {button({ id: "export", icon: <IconDownload size={16} />, label: "Export", menu: "export", disabled: !hasData })}
        {onToolbarModeChange && button({
          id: "mode",
          icon: toolbarMode === "full" ? <IconCollapse size={16} /> : <IconExpand size={16} />,
          label: toolbarMode === "full" ? "Compact toolbar" : "Show labels",
          iconOnly: true,
          onClick: () => onToolbarModeChange(toolbarMode === "full" ? "compact" : "full"),
        })}
      </div>

      {openMenu && menus[openMenu.id] && (
        <RibbonMenu
          anchor={openMenu.anchor}
          entries={menus[openMenu.id]}
          onClose={closeMenu}
          align={openMenu.id === "design" || openMenu.id === "export" ? "end" : "start"}
        />
      )}

      {cfAnchor && (
        <ConditionalFormattingDropdown
          anchor={cfAnchor}
          onClose={() => setCfAnchor(null)}
          onSelect={handleCfSelect}
        />
      )}
    </div>
  );
});

Ribbon.displayName = "Ribbon";
