import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { QuickNumberFormat, ColumnFormat, parseColFormats, resolveColumnFormat } from "../format/directFormats";
import {
  VisualSettings,
  ThemeDensity,
} from "../settings/settings";
import { secureRandomId } from "../model/keys";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconFontColor,
  IconFillColor,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBorders,
  IconChart,
  IconSort,
  IconFilter,
  IconNote,
  IconTemplate,
  IconDisplay,
  IconInsertRow,
  IconFormula,
  IconCalculator,
  IconBlend,
  IconSimulate,
  IconDataInput,
  IconVariables,
  IconGoalSeek,
  IconBulkEdit,
  IconSmartAnalysis,
  IconGroup,
  IconAggregation,
  IconVersion,
  IconHeaderFooter,
  IconAudit,
  IconTheme,
  IconPageBreak,
  IconReport,
  IconPageTotal,
  IconOutline,
  IconHighlight,
  IconPdf,
  IconExcel,
  IconJson,
  IconWriteback,
  IconSchedule,
  IconSettings,
  IconMenu,
  IconUnpin,
  IconReading,
  IconQuickAccess,
  IconFull,
  IconMinimal,
  IconTabs,
  IconTopN,
  IconExplorer,
  IconManageColumns,
  IconCondFormat,
  IconTotals,
  IconBars,
  IconSpark,
  IconKpi,
  IconChevronDown,
  IconRows,
  IconExport,
  IconNew,
  IconConfig,
  IconReuse,
  IconAllowed,
  IconGrid,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from "./icons";
import { ConditionalFormattingDropdown } from "./ConditionalFormattingDropdown";

export type RibbonTab = "home" | "insert" | "design" | "export";
export type ToolbarMode = "full" | "minimal" | "minimal-tabs";
export type RowInsertAction = "panel" | "calculated" | "blank" | "group" | "divider";

export interface RibbonProps {
  settings: VisualSettings;
  allowInteractions: boolean;
  hasData: boolean;
  hasValues: boolean;
  activeTab: RibbonTab;
  explorerOpen: boolean;
  toolbarMode: ToolbarMode;
  toolbarPinned: boolean;
  zoomLevel?: number;
  onChangeTab: (tab: RibbonTab) => void;
  onToggleExplorer: () => void;
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
  onToolbarPinChange?: (pinned: boolean) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  // New props
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
  rows?: import("../model/tree").FlattenedNode[];
  onOpenCondFormatDraft?: (draft: any) => void;
  selectedColumnKeys?: string[];
  selectedRowKeys?: string[];
  onApplyColumnFormat?: (keys: string[], patch: Record<string, any>) => void;
  onApplyRowFormat?: (keys: string[], patch: Record<string, any>) => void;
  onAddQuickVariance?: () => void;
  /** Raw JSON string from settings.manualData.colFormats for reading column-level state. */
  colFormatsJson?: string;
  rowFormatsJson?: string;
}

interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  shortcut?: string;
  onClick?: () => void;
}

export const Ribbon: React.FC<RibbonProps> = memo(({
  settings,
  allowInteractions,
  hasData,
  hasValues,
  activeTab,
  explorerOpen,
  onOpenCondFormatDraft: _onOpenCondFormatDraft,
  selectedColumnKeys,
  selectedRowKeys,
  onApplyColumnFormat,
  onApplyRowFormat,
  onAddQuickVariance,
  onZoomIn: _onZoomIn,
  onZoomOut: _onZoomOut,
  onZoomReset: _onZoomReset,
  toolbarMode,
  toolbarPinned,
  zoomLevel: _zoomLevel = 100,
  onChangeTab,
  onToggleExplorer,
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
  onToolbarPinChange,
  onCopyToClipboard,
  onOpenSortPanel,
  onOpenFind,
  onOpenSmartAnalysis,
  onOpenGoalSeek,
  onOpenVariables,
  onOpenGroupPanel,
  onOpenAggregation,
  onOpenNotesPanel,
  onOpenTopNPanel,
  onOpenFilterPanel,
  onOpenLevelPanel,
  onOpenThemeGallery,
  onOpenHeaderFooter,
  colFormatsJson,
  rowFormatsJson,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cfMenuOpen, setCfMenuOpen] = useState(false);
  const [cfAnchorRect, setCfAnchorRect] = useState<DOMRect | null>(null);
  const cfAnchorRef = useRef<HTMLDivElement>(null);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScrollContentLeft, setCanScrollContentLeft] = useState(false);
  const [canScrollContentRight, setCanScrollContentRight] = useState(false);
  const [openColorMenu, setOpenColorMenu] = useState<string | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("matrixpro.recentColors") || "[]");
      return Array.isArray(parsed) ? parsed.filter(c => typeof c === "string").slice(0, 8) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
      }
    };
    const handleContentScroll = () => {
      if (contentRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = contentRef.current;
        // High precision check: if width is barely larger, don't show arrows
        const hasHorizontalOverflow = scrollWidth > clientWidth + 2;
        setCanScrollContentLeft(scrollLeft > 2);
        setCanScrollContentRight(hasHorizontalOverflow && scrollLeft < scrollWidth - clientWidth - 2);
      }
    };
    const tabsEl = tabsRef.current;
    const contentEl = contentRef.current;
    if (tabsEl) {
      tabsEl.addEventListener("scroll", handleScroll);
      handleScroll();
    }
    if (contentEl) {
      contentEl.addEventListener("scroll", handleContentScroll);
      handleContentScroll();
    }
    const onResize = () => {
      handleScroll();
      handleContentScroll();
    };
    window.addEventListener("resize", onResize);
    return () => {
      tabsEl?.removeEventListener("scroll", handleScroll);
      contentEl?.removeEventListener("scroll", handleContentScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const scrollContent = (direction: "left" | "right") => {
    if (contentRef.current) {
      const scrollAmount = 300;
      contentRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // For "minimal-tabs" mode: the ribbon content is collapsed by default
  // and expands when a tab is clicked. It auto-collapses after idle timeout.
  const [minimalTabsExpanded, setMinimalTabsExpanded] = useState(false);
  const minimalTabsIdleRef = useRef<number | null>(null);
  useEffect(() => {
    if (toolbarMode !== "minimal-tabs" || !minimalTabsExpanded) return undefined;
    if (minimalTabsIdleRef.current) window.clearTimeout(minimalTabsIdleRef.current);
    minimalTabsIdleRef.current = window.setTimeout(() => setMinimalTabsExpanded(false), 4000);
    return () => {
      if (minimalTabsIdleRef.current) window.clearTimeout(minimalTabsIdleRef.current);
    };
  }, [toolbarMode, minimalTabsExpanded, activeTab]);
  useEffect(() => {
    // Reset expansion whenever mode changes
    setMinimalTabsExpanded(false);
  }, [toolbarMode]);

  const showContent = toolbarMode === "full"
    || toolbarMode === "minimal"
    || ((toolbarMode === "minimal-tabs") && minimalTabsExpanded);

  const showMinimalTabsCurated = (toolbarMode === "minimal-tabs") && !minimalTabsExpanded;

  // Quick rule helpers â€” open the ConditionalFormattingPanel with a draft rule
  // so users can customize before applying (instead of applying immediately).
  const openCfDraft = (rule: any) => {
    if (!allowInteractions) return;
    setCfMenuOpen(false);
    _onOpenCondFormatDraft?.(rule);
  };

  // â”€â”€ Context-aware formatting state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Parse column formats once so we can read effective state for active
  // indicators and build correct toggle values.
  const colFormats = useMemo(
    () => parseColFormats(colFormatsJson),
    [colFormatsJson]
  );
  const rowFormats = useMemo(() => {
    if (!rowFormatsJson) return {} as Record<string, Record<string, any>>;
    try {
      const parsed = JSON.parse(rowFormatsJson);
      return parsed && typeof parsed === "object" ? parsed as Record<string, Record<string, any>> : {};
    } catch {
      return {} as Record<string, Record<string, any>>;
    }
  }, [rowFormatsJson]);

  /**
   * Returns the effective value for a formatting property, respecting
   * column selection context. When columns are selected, the first
   * selected column's format is used. Otherwise, global settings.values.
   */
  const getEffective = useCallback(<K extends keyof ColumnFormat>(prop: K): ColumnFormat[K] | undefined => {
    if (selectedColumnKeys && selectedColumnKeys.length > 0) {
      // Resolve formatting using logical identity fallback.
      // We look at the first selected column and find its most specific active setting.
      const firstKey = selectedColumnKeys[0];
      if (firstKey.startsWith("m:")) {
        const fmt = colFormats[firstKey];
        if (fmt && fmt[prop] !== undefined) return fmt[prop];
      }
      const parts = firstKey.split("::m");
      const colKey = parts[0];
      const mIdx = parts.length > 1 ? parseInt(parts[1]) : -1;

      const fmt = resolveColumnFormat(colFormats, colKey, mIdx);
      if (fmt && fmt[prop] !== undefined) return fmt[prop];
    }
    if (selectedRowKeys && selectedRowKeys.length > 0) {
      const fmt = rowFormats[selectedRowKeys[0]];
      if (fmt && fmt[prop] !== undefined) return fmt[prop];
    }
    // Fall back to global settings.values
    return (settings.values as any)[prop];
  }, [selectedColumnKeys, selectedRowKeys, colFormats, rowFormats, settings.values]);

  // Convenience readers for commonly used effective values
  const effBold = getEffective("bold") ?? settings.values.bold;
  const effItalic = getEffective("italic") ?? settings.values.italic;
  const effUnderline = getEffective("underline") ?? settings.values.underline;
  const effNumberFormat = getEffective("numberFormat") ?? settings.values.numberFormat ?? "";
  const effAlignment = getEffective("alignment") ?? settings.values.alignment;
  const effDecimals = getEffective("decimals") ?? settings.values.decimals ?? 0;
  const effTextColor = getEffective("textColor") ?? settings.values.textColor;
  const effBgColor = getEffective("backgroundColor") ?? settings.values.backgroundColor;
  const effQuickFormat = getEffective("quickFormat") ?? settings.values.quickFormat ?? "none";

  const quickFormatOptions: Array<{ value: QuickNumberFormat; label: string }> = useMemo(() => ([
    { value: "none", label: "None" },
    { value: "auto", label: "Auto" },
    { value: "thousands", label: "Thousands (K)" },
    { value: "millions", label: "Millions (M)" },
    { value: "billions", label: "Billions (B)" },
    { value: "trillions", label: "Trillions (T)" },
  ]), []);

  /**
   * Unified formatting dispatcher. When columns are selected, the patch
   * is applied to `manualData.colFormats` for those columns. Otherwise,
   * it's applied to the global `settings.values`.
   */
  const handleFormatUpdate = useCallback((patch: Record<string, any>) => {
    if (selectedColumnKeys && selectedColumnKeys.length > 0) {
      // Header selection can represent a single leaf column, a month group,
      // or a full year group. Persist exact leaf keys so formatting remains
      // scoped to the selected structure instead of leaking to every measure.
      onApplyColumnFormat?.(Array.from(new Set(selectedColumnKeys)), patch);
    } else if (selectedRowKeys && selectedRowKeys.length > 0) {
      onApplyRowFormat?.(Array.from(new Set(selectedRowKeys)), patch);
    } else {
      Object.keys(patch).forEach(key => {
        onPersistProperty("values", key, patch[key]);
      });
    }
  }, [selectedColumnKeys, selectedRowKeys, onApplyColumnFormat, onApplyRowFormat, onPersistProperty]);

  const newRuleId = () => `rule_${Date.now()}_${secureRandomId(6)}`;
  const baseScope = () => ({
    targetType: "rows" as const,
    targetMeasure: -1,
    rowHierarchyLevels: "valuesAndTotals" as const,
    excludeColumnGrandTotal: false,
  });

  const quickPositive = () => openCfDraft({
    id: newRuleId(),
    title: "Quick Positive",
    enabled: true,
    scope: baseScope(),
    formatBy: "rules",
    rulesConfig: {
      impactOn: ["label"],
      conditions: [{ basedOnMeasure: -1, op: "greaterThan", value: 0 }],
      style: { color: "#15803d", fontWeight: "600" },
    },
  });

  const quickNegative = () => openCfDraft({
    id: newRuleId(),
    title: "Quick Negative",
    enabled: true,
    scope: baseScope(),
    formatBy: "rules",
    rulesConfig: {
      impactOn: ["label"],
      conditions: [{ basedOnMeasure: -1, op: "lessThan", value: 0 }],
      style: { color: "#b91c1c", fontWeight: "600" },
    },
  });

  const quickColorScale = (colors: string[], name: string) => openCfDraft({
    id: newRuleId(),
    title: name,
    enabled: true,
    scope: baseScope(),
    formatBy: "colorScale",
    colorScaleConfig: {
      basedOnMeasure: -1,
      applyTo: "background",
      heatMapType: "columnWise",
      scaleType: "sequential",
      colorScheme: colors,
      reverse: false,
      numberOfBands: 5,
      hideValue: false,
      autoFontColor: true,
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

  const quickDataBars = () => openCfDraft({
    id: newRuleId(),
    title: "Data Bars",
    enabled: true,
    scope: baseScope(),
    formatBy: "colorScale",
    colorScaleConfig: {
      basedOnMeasure: -1,
      applyTo: "dataBar",
      heatMapType: "columnWise",
      scaleType: "sequential",
      colorScheme: ["#4f86c6", "#1d4ed8"],
      reverse: false,
      numberOfBands: 0,
      hideValue: false,
      autoFontColor: false,
      includeNull: false,
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      const inAnchor = cfAnchorRef.current?.contains(event.target as Node);
      if (!inAnchor) {
        // Submenu handling is inside the component
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (objectName: string, propertyName: string, currentValue: boolean) => {
    if (!allowInteractions) return;
    onPersistProperty(objectName, propertyName, !currentValue);
  };

  const openRowAction = useCallback((action: RowInsertAction = "panel") => {
    onOpenCalcRowPanel?.(action);
  }, [onOpenCalcRowPanel]);

  const tabButton = (tab: RibbonTab, label: string) => (
    <button
      key={tab}
      className={`ribbon-tab ${activeTab === tab ? "active" : ""}`}
      onClick={() => {
        onChangeTab(tab);
        if (toolbarMode === "minimal-tabs") {
          // Tap the same active tab to collapse; tap a different tab to expand.
          setMinimalTabsExpanded(activeTab === tab ? !minimalTabsExpanded : true);
        }
      }}
      type="button"
      aria-pressed={activeTab === tab}
    >
      {label}
    </button>
  );

  const toolbarBtn = (
    icon: React.ReactNode,
    label: string,
    onClick?: () => void,
    active?: boolean,
    disabled?: boolean,
    title?: string
  ) => (
    <button
      className={`ribbon-btn hover-scale ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled || !allowInteractions}
      type="button"
      aria-pressed={active}
      title={title || label}
    >
      {icon}
      <span className="ribbon-btn-label">{label}</span>
    </button>
  );

  const sectionTitle = (title: string) => (
    <div className="ribbon-section-title">{title}</div>
  );

  const divider = () => <div className="ribbon-divider" />;

  const quickFormatSelect = (width: number | string = 132, compact: boolean = false) => (
    <select
      className="ribbon-select quick-format-select"
      value={effQuickFormat}
      disabled={!allowInteractions}
      title="Display units"
      onChange={(e) => handleFormatUpdate({ quickFormat: e.target.value as QuickNumberFormat })}
      style={{
        width,
        minWidth: width,
        fontSize: compact ? 11 : 12,
        height: compact ? 24 : undefined,
      }}
    >
      {quickFormatOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const colorPickerButton = (
    icon: React.ReactNode,
    label: string,
    title: string,
    value: string,
    onChange: (next: string) => void
  ) => {
    const menuId = title.replace(/\s+/g, "-").toLowerCase();
    const presets = ["#111827", "#374151", "#ffffff", "#f8fafc", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];
    const applyColor = (next: string) => {
      onChange(next);
      setRecentColors(prev => {
        const updated = [next, ...prev.filter(c => c.toLowerCase() !== next.toLowerCase())].slice(0, 8);
        try { localStorage.setItem("matrixpro.recentColors", JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
    };
    const swatches = Array.from(new Set([...recentColors, ...presets]));
    return (
      <span
        className="ribbon-color-picker"
        style={{ position: "relative", display: "inline-flex" }}
        onMouseLeave={() => setOpenColorMenu(current => current === menuId ? null : current)}
      >
        <label
          className="ribbon-btn hover-scale"
          title={title}
          style={{ position: "relative", overflow: "hidden", cursor: allowInteractions ? "pointer" : "not-allowed" }}
          onMouseEnter={() => setOpenColorMenu(menuId)}
        >
          {icon}
          <span className="ribbon-btn-label">{label}</span>
          <span
            aria-hidden="true"
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.18)",
              background: value || "transparent",
              display: "inline-block",
              marginLeft: 2,
              boxSizing: "border-box",
            }}
          />
          <input
            type="color"
            value={value && value !== "transparent" ? value : "#ffffff"}
            disabled={!allowInteractions}
            onChange={(e) => applyColor(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: allowInteractions ? "pointer" : "not-allowed",
            }}
          />
        </label>
        {allowInteractions && openColorMenu === menuId && (
          <div
            className="ribbon-color-menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 10000,
              display: "grid",
              gridTemplateColumns: "repeat(6, 18px)",
              gap: 5,
              padding: 8,
              background: "var(--mx-surface, #fff)",
              border: "1px solid var(--mx-border, #d1d5db)",
              borderRadius: 10,
              boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
            }}
          >
            {swatches.map(color => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={(e) => {
                  e.preventDefault();
                  applyColor(color);
                  setOpenColorMenu(null);
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: color.toLowerCase() === (value || "").toLowerCase() ? "2px solid var(--mx-accent, #0ea5e9)" : "1px solid rgba(0,0,0,0.2)",
                  background: color,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}
      </span>
    );
  };

  const dropdownItems: DropdownItem[] = [
    {
      id: "full",
      label: "Full",
      icon: <IconFull size={16} />,
      active: toolbarMode === "full",
      onClick: () => onToolbarModeChange?.("full"),
    },
    {
      id: "minimal",
      label: "Minimal",
      icon: <IconMinimal size={16} />,
      active: toolbarMode === "minimal",
      onClick: () => onToolbarModeChange?.("minimal"),
    },
    {
      id: "minimal-tabs",
      label: "Minimal With Tabs",
      icon: <IconTabs size={16} />,
      active: toolbarMode === "minimal-tabs",
      onClick: () => onToolbarModeChange?.("minimal-tabs"),
    },
    { id: "sep1", label: "", icon: null },
    {
      id: "unpin",
      label: toolbarPinned ? "Unpin Toolbar" : "Pin Toolbar",
      icon: <IconUnpin size={16} />,
      onClick: () => onToolbarPinChange?.(!toolbarPinned),
    },
    { id: "sep2", label: "", icon: null },
    {
      id: "controls",
      label: "Allowed user controls",
      icon: <IconAllowed size={16} />,
    },
    {
      id: "reading",
      label: "Reading View Preview",
      icon: <IconReading size={16} />,
    },
    {
      id: "quickaccess",
      label: "Quick Access (Ctrl+F)",
      icon: <IconQuickAccess size={16} />,
      shortcut: "Ctrl+F",
    },
  ];

  return (
    <div className={`mx-ribbon ${toolbarMode}`} role="toolbar" aria-label="Matrix ribbon">
      {toolbarMode !== "minimal" && (
        <div className="mx-ribbon-top">
          <div className="mx-ribbon-tabs-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            {canScrollLeft && (
              <button 
                className="ribbon-scroll-btn left" 
                onClick={() => scrollTabs("left")}
                style={{ position: 'absolute', left: 0, zIndex: 10, background: 'rgba(255,255,255,0.8)', border: 'none', height: '100%', cursor: 'pointer', padding: '0 4px' }}
              >
                &lt;
              </button>
            )}
            <div className="mx-ribbon-tabs" role="tablist" aria-label="Ribbon tabs" ref={tabsRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {tabButton("home", "Home")}
              {tabButton("insert", "Insert")}
              {tabButton("design", "Design")}
              {tabButton("export", "Export")}
            </div>
            {canScrollRight && (
              <button 
                className="ribbon-scroll-btn right" 
                onClick={() => scrollTabs("right")}
                style={{ position: 'absolute', right: 0, zIndex: 10, background: 'rgba(255,255,255,0.8)', border: 'none', height: '100%', cursor: 'pointer', padding: '0 4px' }}
              >
                &gt;
              </button>
            )}
          </div>

          <div className="mx-ribbon-actions" aria-label="Quick actions">
            <button
              className="ribbon-btn manage-columns-btn"
              disabled={!allowInteractions}
              type="button"
              title="Manage Columns"
              onClick={onOpenManageColumnsPanel}
            >
              <IconManageColumns size={16} />
              <span className="ribbon-btn-label">Manage Columns</span>
              <IconChevronDown size={12} />
            </button>

            <button
              className={`ribbon-toggle ${settings.appearance.showToolbar ? "on" : "off"}`}
              onClick={() => toggle("appearance", "showToolbar", settings.appearance.showToolbar)}
              disabled={!allowInteractions}
              type="button"
              title="Toggle toolbar"
            >
              <span className="toggle-indicator">{settings.appearance.showToolbar ? "ON" : "OFF"}</span>
            </button>

            <button className="ribbon-btn icon-only" type="button" title="Information">
              <span className="info-icon">i</span>
            </button>

            <div className="ribbon-dropdown-container" ref={dropdownRef}>
              <button
                className="ribbon-btn icon-only menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                type="button"
                title="Menu"
              >
                <IconMenu size={16} />
              </button>

              {dropdownOpen && (
                <div className="ribbon-dropdown-menu">
                  {dropdownItems.map((item) =>
                    item.id.startsWith("sep") ? (
                      <div key={item.id} className="dropdown-separator" />
                    ) : (
                      <button
                        key={item.id}
                        className={`dropdown-item ${item.active ? "active" : ""}`}
                        onClick={() => {
                          item.onClick?.();
                          if (item.id !== "unpin") setDropdownOpen(false);
                        }}
                      >
                        <span className="dropdown-icon">{item.icon}</span>
                        <span className="dropdown-label">{item.label}</span>
                        {item.shortcut && (
                          <span className="dropdown-shortcut">{item.shortcut}</span>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showMinimalTabsCurated && (
        <div className="mx-ribbon-minimal-tabs-curated" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12, 
          padding: "4px 12px", 
          background: "var(--mx-toolbar-bg, var(--mx-surface, #fff))", 
          borderBottom: "1px solid var(--mx-border, #e5e5e5)",
          height: 40
        }}>
           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
             {activeTab === "home" && (
               <>
                <div className="curated-group" style={{ display: "flex", gap: 2 }}>
                  {toolbarBtn(<IconBold size={13} />, "", () => handleFormatUpdate({ bold: !effBold }), !!effBold, !allowInteractions, "Bold")}
                  {toolbarBtn(<IconUnderline size={13} />, "", () => handleFormatUpdate({ underline: !effUnderline }), !!effUnderline, !allowInteractions, "Underline")}
                  {toolbarBtn(<IconAlignCenter size={13} />, "", () => handleFormatUpdate({ alignment: "center" }), effAlignment === "center", !allowInteractions, "Center Align")}
                </div>
                 <span className="ribbon-divider-v" style={{ height: 16, borderLeft: "1px solid var(--mx-toolbar-border, #ddd)", margin: "0 4px" }} />
                  {quickFormatSelect(132, true)}
                  <div className="curated-group" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button className={`ribbon-format-btn sm ${effNumberFormat === "0.0%" ? "active" : ""}`} onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "0.0%" ? "" : "0.0%" })} title="Percentage">%</button>
                    <button className={`ribbon-format-btn sm ${effNumberFormat === "$#,##0.00" ? "active" : ""}`} onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "$#,##0.00" ? "" : "$#,##0.00" })} title="Currency">$</button>
                    {/* Decimals - using .0 .00 as labels per user preference */}
                    <button className="ribbon-format-btn sm" onClick={() => handleFormatUpdate({ decimals: Math.min(10, effDecimals + 1) })} title="Increase decimals">.00</button>
                    <button className="ribbon-format-btn sm" onClick={() => handleFormatUpdate({ decimals: Math.max(0, effDecimals - 1) })} title="Decrease decimals">.0</button>
                  </div>
                  <span className="ribbon-divider-v" style={{ height: 16, borderLeft: "1px solid var(--mx-toolbar-border, #ddd)", margin: "0 4px" }} />
                  {toolbarBtn(<IconTheme size={13} />, "Themes", onOpenThemeGallery, false, !allowInteractions, "Themes")}
                  {toolbarBtn(<IconCondFormat size={13} />, "Format", onOpenCondFormatPanel, settings.conditionalFormatting.enabled, !allowInteractions, "Conditional Formatting")}
                </>
             )}
             {activeTab === "insert" && (
               <>
                 {toolbarBtn(<IconFormula size={13} />, "Measure", onOpenCalcMeasurePanel, false, !allowInteractions)}
                 {toolbarBtn(<IconInsertRow size={13} />, "Calc Row", () => openRowAction("calculated"), false, !allowInteractions || !hasData)}
                 {toolbarBtn(<IconRows size={13} />, "Blank", () => openRowAction("blank"), false, !allowInteractions || !hasData, "Insert Blank Row")}
                 {toolbarBtn(<IconBorders size={13} />, "Divider", () => openRowAction("divider"), false, !allowInteractions || !hasData, "Insert Divider Line")}
                 {toolbarBtn(<IconNew size={13} />, "Variance", onAddQuickVariance, false, !allowInteractions)}
               </>
             )}
             {activeTab === "design" && (
                <>
                  {toolbarBtn(<IconTotals size={13} />, "Totals", onOpenTotalsPanel, false, !allowInteractions)}
                  {toolbarBtn(<IconGroup size={13} />, "Group", onOpenGroupPanel, false, !allowInteractions)}
                  {toolbarBtn(<IconBorders size={13} />, "Grid", () => toggle("general", "showGridlines", settings.general.showGridlines), settings.general.showGridlines, !allowInteractions)}
                </>
             )}
             {activeTab === "export" && (
                <>
                  {toolbarBtn(<IconExcel size={13} />, "Excel", onExportXLSX, false, !allowInteractions || !hasData)}
                  {toolbarBtn(<IconPdf size={13} />, "PDF", onExportPDF, false, !allowInteractions || !hasData)}
                  {toolbarBtn(<IconGrid size={13} />, "CSV", onExportCSV, false, !allowInteractions || !hasData)}
                </>
             )}
           </div>
           <div style={{ flex: 1 }} />
           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
             {activeTab !== "home" && (
               <button className="ribbon-tab" onClick={() => onChangeTab("home")} style={{ fontSize: 10, padding: "2px 6px" }}>Home</button>
             )}
             <button 
               className="minimal-expand-btn ribbon-btn secondary"
               onClick={() => setMinimalTabsExpanded(true)}
               style={{ height: 24, fontSize: 10, fontWeight: 700 }}
             >
               EXPAND FULL v
             </button>
           </div>
        </div>
      )}

      {showContent && (
        <div className="mx-ribbon-content-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, height: '100%' }}>
          {canScrollContentLeft && (
            <button 
              className="ribbon-scroll-btn left" 
              onClick={() => scrollContent("left")}
              style={{ 
                position: 'absolute', 
                left: 0, 
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 500, 
                background: 'rgba(255,255,255,0.95)', 
                border: '1px solid rgba(0,0,0,0.1)', 
                height: '48px', 
                width: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer', 
                padding: 0, 
                boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0'
              }}
              title="Scroll Left"
            >
              <IconChevronLeft size={16} />
            </button>
          )}
          <div className="mx-ribbon-content" role="tabpanel" ref={contentRef} style={{ display: 'flex', flex: 1, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', height: '100%' }}>
            {toolbarMode === "minimal" && (
              <div className="mx-ribbon-minimal-row" style={{ display: "flex", alignItems: "center", gap: 2, padding: "3px 8px", width: "100%", overflowX: "visible", flexWrap: "nowrap", minHeight: 32 }}>
              {/* Font */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <select className="ribbon-select" style={{ width: 90, minWidth: 90, fontSize: 11 }} value={settings.general.fontFamily || "-apple-system"} onChange={(e) => onPersistProperty("general", "fontFamily", e.target.value)} disabled={!allowInteractions} title="Font family">
                  <option value="-apple-system">System</option>
                  <option value="Arial">Arial</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Georgia">Georgia</option>
                </select>
                <input type="number" className="ribbon-input" style={{ width: 42, fontSize: 11 }} value={settings.values.fontSize} min={8} max={72} onChange={(e) => onPersistProperty("values", "fontSize", Number(e.target.value))} disabled={!allowInteractions} title="Font size" />
              </div>
              <span className="ribbon-divider-v" />
              {/* B / I / U / S / Wrap */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconBold size={13} />, "", () => handleFormatUpdate({ bold: !effBold }), !!effBold, !allowInteractions, "Bold")}
                {toolbarBtn(<IconItalic size={13} />, "", () => handleFormatUpdate({ italic: !effItalic }), !!effItalic, !allowInteractions, "Italic")}
                {toolbarBtn(<IconUnderline size={13} />, "", () => handleFormatUpdate({ underline: !effUnderline }), !!effUnderline, !allowInteractions, "Underline")}
                {toolbarBtn(<span style={{ fontFamily: "serif", fontSize: 12, textDecoration: "line-through", fontWeight: 700, lineHeight: 1 }}>S</span>, "", () => onPersistProperty("general", "strikethrough", !settings.general.strikethrough), settings.general.strikethrough, !allowInteractions, "Strikethrough")}
                {toolbarBtn(<span style={{ fontSize: 11, fontWeight: 700 }}>↵</span>, "", () => onPersistProperty("general", "wrapText", !settings.general.wrapText), settings.general.wrapText, !allowInteractions, "Wrap Text")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Colors */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {colorPickerButton(<IconFontColor size={13} />, "", "Font Color", effTextColor || "#333333", (next) => handleFormatUpdate({ textColor: next }))}
                {colorPickerButton(<IconFillColor size={13} />, "", "Fill Color", effBgColor && effBgColor !== "transparent" ? effBgColor : "#ffffff", (next) => handleFormatUpdate({ backgroundColor: next }))}
              </div>
              <span className="ribbon-divider-v" />
              {/* Alignment + Borders */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconAlignLeft size={13} />, "", () => handleFormatUpdate({ alignment: "left" }), effAlignment === "left", !allowInteractions, "Align Left")}
                {toolbarBtn(<IconAlignCenter size={13} />, "", () => handleFormatUpdate({ alignment: "center" }), effAlignment === "center", !allowInteractions, "Align Center")}
                {toolbarBtn(<IconAlignRight size={13} />, "", () => handleFormatUpdate({ alignment: "right" }), effAlignment === "right", !allowInteractions, "Align Right")}
                {toolbarBtn(<IconBorders size={13} />, "", () => { const ss = ["none", "all", "horizontal", "vertical", "outline"] as const; const ci = ss.indexOf(settings.values.borderStyle as any); onPersistProperty("values", "borderStyle", ss[(ci + 1) % ss.length]); }, settings.values.borderStyle !== "none", !allowInteractions, "Borders")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Number format */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <button className={`ribbon-format-btn ${effNumberFormat === "0.0%" ? "active" : ""}`} disabled={!allowInteractions} title="Percentage" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "0.0%" ? "" : "0.0%" })}>%</button>
                <button className={`ribbon-format-btn ${effNumberFormat === "$#,##0.00" ? "active" : ""}`} disabled={!allowInteractions} title="Currency" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "$#,##0.00" ? "" : "$#,##0.00" })}>$</button>
                <button className={`ribbon-format-btn ${effNumberFormat === "#,##0" ? "active" : ""}`} disabled={!allowInteractions} title="Comma" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "#,##0" ? "" : "#,##0" })}>,</button>
                <button className="ribbon-format-btn" disabled={!allowInteractions} title="Increase Decimal" onClick={() => handleFormatUpdate({ decimals: Math.min(10, effDecimals + 1) })}>.0</button>
                <button className="ribbon-format-btn" disabled={!allowInteractions} title="Decrease Decimal" onClick={() => handleFormatUpdate({ decimals: Math.max(0, effDecimals - 1) })}>.00</button>
              </div>
              {quickFormatSelect(132, true)}
              <span className="ribbon-divider-v" />
              {/* Data Analysis */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <div ref={cfAnchorRef} style={{ position: "relative", display: "inline-block" }}>
                  {toolbarBtn(<IconCondFormat size={13} />, "CF", () => { if (cfAnchorRef.current) { setCfAnchorRect(cfAnchorRef.current.getBoundingClientRect()); setCfMenuOpen(!cfMenuOpen); } }, settings.conditionalFormatting.enabled || cfMenuOpen, !hasValues, "Conditional Formatting")}
                  {cfMenuOpen && cfAnchorRect && (
                    <ConditionalFormattingDropdown anchor={cfAnchorRect} onClose={() => setCfMenuOpen(false)} onSelect={(id) => {
                      if (id === "quick-positive") quickPositive();
                      else if (id === "quick-negative") quickNegative();
                      else if (id === "scale-seq-blue") quickColorScale(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"], "Sequential Blue");
                      else if (id === "scale-seq-green") quickColorScale(["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"], "Sequential Green");
                      else if (id === "scale-div-rwg") quickColorScale(["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"], "Diverging Red-Green");
                      else if (id === "bar-blue") quickDataBars();
                      else if (["class-icon-check", "class-icon-flags", "class-icon-arrows3", "class-icon-arrows5", "class-text-abc", "class-text-levels"].includes(id)) quickClassification();
                      else onOpenCondFormatPanel?.();
                      setCfMenuOpen(false);
                    }} />
                  )}
                </div>
                {toolbarBtn(<IconTotals size={13} />, "Totals", () => onOpenTotalsPanel?.(), settings.totals.showGrandTotals, !allowInteractions, "Totals & Subtotals")}
                {toolbarBtn(<IconTopN size={13} />, "Top N", () => onOpenTopNPanel?.(), false, !hasData, "Top N Analysis")}
                {toolbarBtn(<IconSort size={13} />, "Sort", onOpenSortPanel, false, !allowInteractions || !hasData, "Sort")}
                {toolbarBtn(<IconFilter size={13} />, "Filter", () => onOpenFilterPanel?.(), false, !allowInteractions || !hasData, "Filter")}
                {toolbarBtn(<IconSearch size={13} />, "Find", () => onOpenFind?.(), false, !hasData || !onOpenFind, "Find (Ctrl+F)")}
                {toolbarBtn(<IconRows size={13} />, "Levels", () => onOpenLevelPanel?.(), false, !allowInteractions || !hasData, "Hierarchy Levels")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Insert */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconInsertRow size={13} />, "Calc", () => openRowAction("calculated"), false, !allowInteractions || !hasData, "Insert Calculated Row")}
                {toolbarBtn(<IconRows size={13} />, "Blank", () => openRowAction("blank"), false, !allowInteractions || !hasData, "Insert Blank Row")}
                {toolbarBtn(<IconBorders size={13} />, "Divider", () => openRowAction("divider"), false, !allowInteractions || !hasData, "Insert Divider Line")}
                {toolbarBtn(<IconGroup size={13} />, "Group", () => openRowAction("group"), false, !allowInteractions || !hasData, "Insert Group Header")}
                {toolbarBtn(<IconFormula size={13} />, "Measure", () => onOpenCalcMeasurePanel?.(), false, !allowInteractions, "Insert Calculated Measure")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Column & Row management */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconManageColumns size={13} />, "Cols", () => onOpenManageColumnsPanel?.(), false, !allowInteractions, "Manage Columns")}
                {toolbarBtn(<IconGroup size={13} />, "Group", () => onOpenGroupPanel?.(), false, !allowInteractions, "Group Rows")}
              </div>
              <span className="ribbon-divider-v" />
              {/* In-Cell Visuals */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconBars size={13} />, "Bars", () => toggle("dataBars", "enabled", settings.dataBars.enabled), settings.dataBars.enabled, !allowInteractions || !hasValues, "Data Bars")}
                {toolbarBtn(<IconKpi size={13} />, "KPI", () => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled), settings.kpiIcons.enabled, !allowInteractions || !hasValues, "KPI Icons")}
                {toolbarBtn(<IconSpark size={13} />, "Spark", () => toggle("sparklines", "enabled", settings.sparklines.enabled), settings.sparklines.enabled, !allowInteractions || !hasValues, "Sparklines")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Export shortcuts */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconExcel size={13} />, "XLSX", () => onExportXLSX?.(), false, !allowInteractions || !hasData, "Export to Excel")}
                {toolbarBtn(<IconPdf size={13} />, "PDF", () => onExportPDF?.(), false, !allowInteractions || !hasData, "Export to PDF")}
                {toolbarBtn(<IconJson size={13} />, "JSON", () => onExportJSON?.(), false, !allowInteractions || !hasData, "Export to JSON")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Smart Analysis */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconSmartAnalysis size={13} />, "AI", () => onOpenSmartAnalysis?.(), false, !allowInteractions || !hasData, "Smart Analysis")}
              </div>
              {/* Spacer */}
              <div style={{ flex: 1 }} />
              {/* Right: Explorer + Menu */}
              {toolbarBtn(<IconExplorer size={13} />, "", onToggleExplorer, explorerOpen, !allowInteractions, "Toggle Explorer")}
              <div className="ribbon-dropdown-container" ref={dropdownRef} style={{ flexShrink: 0 }}>
                <button className="ribbon-btn icon-only menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)} type="button" title="Menu"><IconMenu size={14} /></button>
                {dropdownOpen && (
                  <div className="ribbon-dropdown-menu" style={{ right: 0, left: "auto" }}>
                    {dropdownItems.map((item) => item.id.startsWith("sep") ? (
                      <div key={item.id} className="dropdown-separator" />
                    ) : (
                      <button key={item.id} className={`dropdown-item ${item.active ? "active" : ""}`} onClick={() => { item.onClick?.(); if (item.id !== "unpin") setDropdownOpen(false); }}>
                        <span className="dropdown-icon">{item.icon}</span>
                        <span className="dropdown-label">{item.label}</span>
                        {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              MINIMAL-TABS MODE - condensed per-tab content
              ============================================================ */}
          {toolbarMode === "minimal-tabs" && minimalTabsExpanded && (
            <div className="mx-ribbon-minimal-row mx-ribbon-minimal-tabs-content" style={{ display: "flex", alignItems: "center", gap: 2, padding: "3px 8px", width: "100%", overflowX: "auto", overflowY: "visible", flexWrap: "nowrap", minHeight: 32 }}>
              {activeTab === "home" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    <select className="ribbon-select" style={{ width: 90, minWidth: 90, fontSize: 11 }} value={settings.general.fontFamily || "-apple-system"} onChange={(e) => onPersistProperty("general", "fontFamily", e.target.value)} disabled={!allowInteractions} title="Font family">
                      <option value="-apple-system">System</option>
                      <option value="Arial">Arial</option>
                      <option value="Segoe UI">Segoe UI</option>
                      <option value="Calibri">Calibri</option>
                    </select>
                    <input type="number" className="ribbon-input" style={{ width: 42, fontSize: 11 }} value={settings.values.fontSize} min={8} max={72} onChange={(e) => onPersistProperty("values", "fontSize", Number(e.target.value))} disabled={!allowInteractions} title="Font size" />
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconBold size={13} />, "", () => handleFormatUpdate({ bold: !effBold }), !!effBold, !allowInteractions, "Bold")}
                    {toolbarBtn(<IconItalic size={13} />, "", () => handleFormatUpdate({ italic: !effItalic }), !!effItalic, !allowInteractions, "Italic")}
                    {toolbarBtn(<IconUnderline size={13} />, "", () => handleFormatUpdate({ underline: !effUnderline }), !!effUnderline, !allowInteractions, "Underline")}
                    {colorPickerButton(<IconFontColor size={13} />, "", "Font Color", effTextColor || "#333333", (next) => handleFormatUpdate({ textColor: next }))}
                    {colorPickerButton(<IconFillColor size={13} />, "", "Fill Color", effBgColor && effBgColor !== "transparent" ? effBgColor : "#ffffff", (next) => handleFormatUpdate({ backgroundColor: next }))}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconAlignLeft size={13} />, "", () => handleFormatUpdate({ alignment: "left" }), effAlignment === "left", !allowInteractions, "Align Left")}
                    {toolbarBtn(<IconAlignCenter size={13} />, "", () => handleFormatUpdate({ alignment: "center" }), effAlignment === "center", !allowInteractions, "Align Center")}
                    {toolbarBtn(<IconAlignRight size={13} />, "", () => handleFormatUpdate({ alignment: "right" }), effAlignment === "right", !allowInteractions, "Align Right")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    <button className={`ribbon-format-btn ${effNumberFormat === "0.0%" ? "active" : ""}`} disabled={!allowInteractions} title="Percentage" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "0.0%" ? "" : "0.0%" })}>%</button>
                    <button className={`ribbon-format-btn ${effNumberFormat === "$#,##0.00" ? "active" : ""}`} disabled={!allowInteractions} title="Currency" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "$#,##0.00" ? "" : "$#,##0.00" })}>$</button>
                    <button className={`ribbon-format-btn ${effNumberFormat === "#,##0" ? "active" : ""}`} disabled={!allowInteractions} title="Comma" onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "#,##0" ? "" : "#,##0" })}>,</button>
                  </div>
                  {quickFormatSelect(132, true)}
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconCondFormat size={13} />, "CF", () => onOpenCondFormatPanel?.(), settings.conditionalFormatting.enabled, !hasValues, "Conditional Formatting")}
                    {toolbarBtn(<IconTotals size={13} />, "Totals", () => onOpenTotalsPanel?.(), settings.totals.showGrandTotals, !allowInteractions, "Totals")}
                    {toolbarBtn(<IconSort size={13} />, "Sort", onOpenSortPanel, false, !allowInteractions || !hasData, "Sort")}
                    {toolbarBtn(<IconFilter size={13} />, "Filter", () => onOpenFilterPanel?.(), false, !allowInteractions || !hasData, "Filter")}
                    {toolbarBtn(<IconSearch size={13} />, "Find", () => onOpenFind?.(), false, !hasData || !onOpenFind, "Find (Ctrl+F)")}
                    {toolbarBtn(<IconTopN size={13} />, "Top N", () => onOpenTopNPanel?.(), false, !hasData, "Top N")}
                    {toolbarBtn(<IconExplorer size={13} />, "Explorer", onToggleExplorer, explorerOpen, !allowInteractions, "Toggle Explorer")}
                  </div>
                </>
              )}
              {activeTab === "insert" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconInsertRow size={14} />, "Calc Row", () => onOpenCalcRowPanel?.(), false, !allowInteractions, "Insert Calculated Row")}
                    {toolbarBtn(<IconFormula size={14} />, "Calc Measure", () => onOpenCalcMeasurePanel?.(), false, !allowInteractions, "Insert Calculated Measure")}
                    {toolbarBtn(<IconKpi size={14} />, "Manage Measures", () => onOpenCalcMeasurePanel?.(), false, !allowInteractions || !hasValues, "Manage Measures")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconBars size={14} />, "Data Bars", () => toggle("dataBars", "enabled", settings.dataBars.enabled), settings.dataBars.enabled, !allowInteractions || !hasValues, "Toggle Data Bars")}
                    {toolbarBtn(<IconKpi size={14} />, "KPI Icons", () => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled), settings.kpiIcons.enabled, !allowInteractions || !hasValues, "Toggle KPI Icons")}
                    {toolbarBtn(<IconSpark size={14} />, "Sparklines", () => toggle("sparklines", "enabled", settings.sparklines.enabled), settings.sparklines.enabled, !allowInteractions || !hasValues, "Toggle Sparklines")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconSimulate size={14} />, "Simulate", () => onPersistProperty("general", "simulateMode", !settings.general.simulateMode), settings.general.simulateMode, !allowInteractions, "Simulation Mode")}
                    {toolbarBtn(<IconDataInput size={14} />, "Data Input", () => onOpenBulkOperations?.(), false, !allowInteractions, "Bulk Data Input")}
                    {toolbarBtn(<IconGoalSeek size={14} />, "Goal Seek", () => onOpenGoalSeek?.(), false, !allowInteractions || !hasValues, "Goal Seek")}
                    {toolbarBtn(<IconVariables size={14} />, "Variables", () => onOpenVariables?.(), false, !allowInteractions, "Variables")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconGroup size={14} />, "Group", () => onOpenGroupPanel?.(), false, !allowInteractions, "Group Rows")}
                    {toolbarBtn(<IconAggregation size={14} />, "Aggregation", () => onOpenAggregation?.(), false, !allowInteractions || !hasValues, "Aggregation Overrides")}
                    {toolbarBtn(<IconManageColumns size={14} />, "Columns", () => onOpenManageColumnsPanel?.(), false, !allowInteractions, "Manage Columns")}
                    {toolbarBtn(<IconRows size={14} />, "Levels", () => onOpenLevelPanel?.(), false, !allowInteractions || !hasData, "Hierarchy Levels")}
                  </div>
                </>
              )}
              {activeTab === "design" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "inherit", whiteSpace: "nowrap" }}>Density:</span>
                    {(["compact", "comfortable", "spacious"] as const).map((d) => (
                      <button key={d} className={`ribbon-btn ${settings.theme.density === d ? "active" : ""}`} disabled={!allowInteractions} onClick={() => onPersistProperty("theme", "density", d)} style={{ flexDirection: "row", padding: "2px 6px", height: 24, fontSize: 11 }}>{d.charAt(0).toUpperCase() + d.slice(1)}</button>
                    ))}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {[["showGridlines", "Gridlines"], ["rowBanding", "Banding"], ["rowHighlight", "Highlight"]].map(([prop, lbl]) => (
                      <label key={prop} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={(settings.general as any)[prop]} onChange={() => onPersistProperty("general", prop, !(settings.general as any)[prop])} disabled={!allowInteractions} />{lbl}
                      </label>
                    ))}
                    {[["dividerLines", "Dividers"], ["rowHover", "Hover"], ["stickyTotals", "Sticky Totals"]].map(([prop, lbl]) => (
                      <label key={prop} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={(settings.theme as any)[prop]} onChange={() => onPersistProperty("theme", prop, !(settings.theme as any)[prop])} disabled={!allowInteractions} />{lbl}
                      </label>
                    ))}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconOutline size={14} />, "Outline", () => onPersistProperty("layout", "mode", "outline"), settings.layout.mode === "outline", !allowInteractions, "Outline Layout")}
                    {toolbarBtn(<IconRows size={14} />, "Hierarchy", () => onPersistProperty("layout", "mode", "hierarchy"), settings.layout.mode === "hierarchy", !allowInteractions, "Hierarchy Layout")}
                  </div>
                </>
              )}
              {activeTab === "export" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconExcel size={14} />, "Export Excel", () => onExportXLSX?.(), false, !allowInteractions || !hasData, "Export to Excel (.xlsx)")}
                    {toolbarBtn(<IconPdf size={14} />, "Export PDF", () => onExportPDF?.(), false, !allowInteractions || !hasData, "Export to PDF")}
                    {toolbarBtn(<IconGrid size={14} />, "Export CSV", () => onExportCSV?.(), false, !allowInteractions || !hasData, "Export to CSV")}
                    {toolbarBtn(<IconExport size={14} />, "Copy", () => onCopyToClipboard?.(), false, !allowInteractions || !hasData, "Copy to Clipboard (TSV)")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconWriteback size={14} />, "Writeback", () => { }, false, true, "Writeback (coming soon)")}
                    {toolbarBtn(<IconSchedule size={14} />, "Schedule", () => { }, false, true, "Scheduled Export (coming soon)")}
                  </div>
                </>
              )}
              <div style={{ flex: 1 }} />
              <div className="ribbon-dropdown-container" ref={dropdownRef} style={{ flexShrink: 0 }}>
                <button className="ribbon-btn icon-only menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)} type="button" title="Menu"><IconMenu size={14} /></button>
                {dropdownOpen && (
                  <div className="ribbon-dropdown-menu" style={{ right: 0, left: "auto" }}>
                    {dropdownItems.map((item) => item.id.startsWith("sep") ? (
                      <div key={item.id} className="dropdown-separator" />
                    ) : (
                      <button key={item.id} className={`dropdown-item ${item.active ? "active" : ""}`} onClick={() => { item.onClick?.(); if (item.id !== "unpin") setDropdownOpen(false); }}>
                        <span className="dropdown-icon">{item.icon}</span>
                        <span className="dropdown-label">{item.label}</span>
                        {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {toolbarMode !== "minimal" && activeTab === "home" && (
            <>
              {/* Layout section */}
              <div className="ribbon-section" aria-label="Layout">
                {sectionTitle("Layout")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(
                    <IconRows size={20} />,
                    "Layout",
                    () => onPersistProperty("layout", "mode", settings.layout.mode === "hierarchy" ? "outline" : "hierarchy"),
                    false,
                    !allowInteractions,
                    "Toggle layout mode"
                  )}
                  {toolbarBtn(
                    <IconManageColumns size={20} />,
                    "Manage Cols",
                    () => onOpenManageColumnsPanel?.(),
                    false,
                    !allowInteractions,
                    "Show/hide and reorder columns/measures"
                  )}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Style">
                {sectionTitle("Style")}
                <div className="ribbon-btn-group vertical">
                  <div className="toolbar-row">
                    <select
                      className="ribbon-select font-family"
                      disabled={!allowInteractions}
                      title="Font family"
                      value={settings.general.fontFamily || "-apple-system"}
                      onChange={(e) => onPersistProperty("general", "fontFamily", e.target.value)}
                    >
                      <option value="-apple-system">System Default</option>
                      <option value="Arial">Arial</option>
                      <option value="Segoe UI">Segoe UI</option>
                      <option value="Inforiver Sans">Inforiver Sans</option>
                    </select>
                    <input
                      type="number"
                      className="ribbon-input font-size"
                      value={settings.values.fontSize}
                      min={8}
                      max={72}
                      disabled={!allowInteractions}
                      title="Font size"
                      onChange={(e) => onPersistProperty("values", "fontSize", parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className="toolbar-row">
                    {toolbarBtn(
                      <IconBold size={14} />,
                      "",
                      () => handleFormatUpdate({ bold: !effBold }),
                      !!effBold,
                      !allowInteractions,
                      "Bold"
                    )}
                    {toolbarBtn(<IconItalic size={14} />, "", () => handleFormatUpdate({ italic: !effItalic }), !!effItalic, !allowInteractions, "Italic")}
                    {toolbarBtn(<IconUnderline size={14} />, "", () => handleFormatUpdate({ underline: !effUnderline }), !!effUnderline, !allowInteractions, "Underline")}
                    {toolbarBtn(
                      <span style={{ fontFamily: "serif", fontSize: 13, textDecoration: "line-through", fontWeight: 700 }}>S</span>,
                      "",
                      () => onPersistProperty("general", "strikethrough", !settings.general.strikethrough),
                      settings.general.strikethrough,
                      !allowInteractions,
                      "Strikethrough"
                    )}
                    {toolbarBtn(
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>↵</span>,
                      "",
                      () => onPersistProperty("general", "wrapText", !settings.general.wrapText),
                      settings.general.wrapText,
                      !allowInteractions,
                      "Wrap Text"
                    )}
                    {colorPickerButton(<IconFontColor size={14} />, "", "Font Color", effTextColor || "#333333", (next) => handleFormatUpdate({ textColor: next }))}
                    {colorPickerButton(<IconFillColor size={14} />, "", "Fill Color", effBgColor && effBgColor !== "transparent" ? effBgColor : "#ffffff", (next) => handleFormatUpdate({ backgroundColor: next }))}
                  </div>
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Align">
                {sectionTitle("Align")}
                <div className="ribbon-btn-group vertical">
                  <div className="toolbar-row">
                    {toolbarBtn(
                      <IconAlignLeft size={14} />,
                      "",
                      () => handleFormatUpdate({ alignment: "left" }),
                      effAlignment === "left",
                      !allowInteractions,
                      "Align Left"
                    )}
                    {toolbarBtn(
                      <IconAlignCenter size={14} />,
                      "",
                      () => handleFormatUpdate({ alignment: "center" }),
                      effAlignment === "center",
                      !allowInteractions,
                      "Align Center"
                    )}
                    {toolbarBtn(
                      <IconAlignRight size={14} />,
                      "",
                      () => handleFormatUpdate({ alignment: "right" }),
                      effAlignment === "right",
                      !allowInteractions,
                      "Align Right"
                    )}
                  </div>
                  <div className="toolbar-row">
                    {toolbarBtn(<IconBorders size={14} />, "", () => {
                      const styles = ["none", "all", "horizontal", "vertical", "outline"] as const;
                      const currentIdx = styles.indexOf(settings.values.borderStyle as any);
                      const nextIdx = (currentIdx + 1) % styles.length;
                      onPersistProperty("values", "borderStyle", styles[nextIdx]);
                    }, settings.values.borderStyle !== "none", !allowInteractions, "Borders")}
                  </div>
                </div>
              </div>

                     <div className="ribbon-section" aria-label="Number">
                {sectionTitle("Number")}
                <div className="ribbon-btn-group">
                  <div className="ribbon-btn-group vertical">
                    <div className="toolbar-row">
                      <button className={`ribbon-format-btn sm ${effNumberFormat === "0.0%" ? "active" : ""}`} onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "0.0%" ? "" : "0.0%" })} title="Percentage">%</button>
                      <button className={`ribbon-format-btn sm ${effNumberFormat === "$#,##0.00" ? "active" : ""}`} onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "$#,##0.00" ? "" : "$#,##0.00" })} title="Currency">$</button>
                      <button className={`ribbon-format-btn sm ${effNumberFormat === "#,##0" ? "active" : ""}`} onClick={() => handleFormatUpdate({ numberFormat: effNumberFormat === "#,##0" ? "" : "#,##0" })} title="Comma">,</button>
                    </div>
                    <div className="toolbar-row" style={{ marginTop: 2 }}>
                      <button className="ribbon-format-btn sm" onClick={() => handleFormatUpdate({ decimals: Math.min(10, effDecimals + 1) })} title="Increase decimals">.00</button>
                      <button className="ribbon-format-btn sm" onClick={() => handleFormatUpdate({ decimals: Math.max(0, effDecimals - 1) })} title="Decrease decimals">.0</button>
                    </div>
                  </div>
                  <span className="ribbon-divider-v" style={{ height: 32 }} />
                  <div className="ribbon-btn-group vertical" style={{ minWidth: 100 }}>
                    {sectionTitle("Scaling")}
                    {quickFormatSelect("100%")}
                  </div>
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Chart">
                {sectionTitle("Chart")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconChart size={16} />, "Chart", () => {
                  }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Analyze">
                {sectionTitle("Analyze")}
                <div className="ribbon-btn-group">
                  <div ref={cfAnchorRef} style={{ position: "relative", display: "inline-block" }}>
                    {toolbarBtn(
                      <IconCondFormat size={16} />,
                      "Cond. Format",
                      () => {
                        if (cfAnchorRef.current) {
                          setCfAnchorRect(cfAnchorRef.current.getBoundingClientRect());
                          setCfMenuOpen(!cfMenuOpen);
                        }
                      },
                      settings.conditionalFormatting.enabled || cfMenuOpen,
                      !hasValues,
                      "Conditional Formatting"
                    )}
                    {cfMenuOpen && cfAnchorRect && (
                      <ConditionalFormattingDropdown
                        anchor={cfAnchorRect}
                        onClose={() => setCfMenuOpen(false)}
                        onSelect={(id) => {
                          // Quick Rule
                          if (id === "quick-positive") quickPositive();
                          else if (id === "quick-negative") quickNegative();
                          // Color Scales - sequential
                          else if (id === "scale-seq-blue") quickColorScale(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"], "Sequential Blue");
                          else if (id === "scale-seq-orange") quickColorScale(["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"], "Sequential Orange");
                          else if (id === "scale-seq-green") quickColorScale(["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"], "Sequential Green");
                          // Color Scales - qualitative
                          else if (id === "scale-qual-cool") quickColorScale(["#10b981", "#7c3aed", "#ef4444", "#eab308", "#3b82f6", "#6b7280"], "Qualitative Cool");
                          else if (id === "scale-qual-earth") quickColorScale(["#93c5fd", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5", "#a8a29e"], "Qualitative Earth");
                          // Color Scales - diverging
                          else if (id === "scale-div-rwg") quickColorScale(["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"], "Diverging Red-Yellow-Green");
                          else if (id === "scale-div-rwb") quickColorScale(["#b91c1c", "#fca5a5", "#fef9c3", "#bae6fd", "#1d4ed8"], "Diverging Red-Blue");
                          else if (id === "scale-div-byg") quickColorScale(["#854d0e", "#d97706", "#ecfeff", "#22d3ee", "#0e7490"], "Diverging Brown-Teal");
                          // Color Scales - continuous
                          else if (id === "scale-cont-warm") quickColorScale(["#f97316", "#be123c"], "Continuous Warm");
                          else if (id === "scale-cont-div") quickColorScale(["#ef4444", "#ffffff", "#6366f1"], "Continuous Diverging");
                          // Classification - icons / text
                          else if (id === "class-icon-check" || id === "class-icon-flags" || id === "class-icon-arrows3" || id === "class-icon-arrows5" || id === "class-text-abc" || id === "class-text-levels" || id === "class-rating-squares" || id === "class-rating-stars" || id === "class-rating-circles") quickClassification();
                          // Data Bars
                          else if (id === "bar-blue") quickDataBars();
                          else if (id === "bar-green") quickColorScale(["#dcfce7", "#16a34a"], "Data Bar Green");
                          else if (id === "bar-red") quickColorScale(["#fee2e2", "#dc2626"], "Data Bar Red");
                          else if (id === "bar-orange") quickColorScale(["#ffedd5", "#f59e0b"], "Data Bar Orange");
                          else if (id === "bar-pink") quickColorScale(["#fce7f3", "#ec4899"], "Data Bar Pink");
                          // Action Analysis - open full panel for configuration
                          else if (id === "action-dot" || id === "action-color" || id === "action-bubble-chart" || id === "action-bubble-only") {
                            onOpenCondFormatPanel?.();
                          }
                          // Bottom actions
                          else if (id === "create-rule" || id === "manage-rules") {
                            onOpenCondFormatPanel?.();
                          }
                          setCfMenuOpen(false);
                        }}
                      />
                    )}
                  </div>
                  {toolbarBtn(
                    <IconTotals size={16} />,
                    "Totals",
                    () => onOpenTotalsPanel?.(),
                    settings.totals.showGrandTotals,
                    !allowInteractions,
                    "Totals & subtotals"
                  )}
                  {toolbarBtn(<IconTopN size={16} />, "Top N", () => onOpenTopNPanel?.(), (() => {
                    try { const c = JSON.parse(settings.manualData.topNConfig || "{}"); return (c.topN || 0) > 0; } catch { return false; }
                  })(), !hasData, "Top N Analysis")}
                  {toolbarBtn(<IconExplorer size={16} />, "Explorer", onToggleExplorer, explorerOpen, !allowInteractions, "Toggle Explorer panel")}
                  {toolbarBtn(<IconSort size={16} />, "Sort", onOpenSortPanel, false, !allowInteractions || !hasData, "Configure Sort Rules")}
                  {toolbarBtn(<IconSearch size={16} />, "Find", () => onOpenFind?.(), false, !hasData || !onOpenFind, "Find in labels and values (Ctrl+F)")}
                  {toolbarBtn(<IconFilter size={16} />, "Filter", () => onOpenFilterPanel?.(), (() => {
                    try { const r = JSON.parse(settings.manualData.filterRules || "[]"); return Array.isArray(r) && r.length > 0; } catch { return false; }
                  })(), !allowInteractions || !hasData, "Filter rows by value")}
                  {toolbarBtn(<IconRows size={16} />, "Levels", () => onOpenLevelPanel?.(), (() => {
                    try {
                      const r = JSON.parse(settings.manualData.hiddenRowLevels || "[]");
                      const c = JSON.parse(settings.manualData.hiddenColumnLevels || "[]");
                      return (Array.isArray(r) && r.length > 0) || (Array.isArray(c) && c.length > 0);
                    } catch { return false; }
                  })(), !allowInteractions || !hasData, "Row/column hierarchy level visibility")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Annotate">
                {sectionTitle("Annotate")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconNote size={16} />, "Notes", onOpenNotesPanel, false, !allowInteractions, "View and Manage Notes")}
                  {toolbarBtn(<IconDisplay size={16} />, "Display", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Actions">
                {sectionTitle("Actions")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconTemplate size={16} />, "Templates", () => { }, false, true, "Coming soon")}
                  <div className="ribbon-btn-group vertical">
                    <div className="toolbar-row">
                      {toolbarBtn(<IconGrid size={16} />, "", () => toggle("general", "showGridlines", settings.general.showGridlines), settings.general.showGridlines, !allowInteractions, "Toggle gridlines")}
                      {toolbarBtn(<IconRows size={16} />, "", () => toggle("general", "rowBanding", settings.general.rowBanding), settings.general.rowBanding, !allowInteractions, "Toggle row banding")}
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}

          {toolbarMode !== "minimal" && activeTab === "insert" && (
            <>
              {/* Row section */}
              <div className="ribbon-section" aria-label="Row">
                {sectionTitle("Row")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconInsertRow size={16} />, "Calc Row", () => openRowAction("calculated"), false, !allowInteractions || !hasData, "Insert Calculated Row")}
                  {toolbarBtn(<IconRows size={16} />, "Blank Row", () => openRowAction("blank"), false, !allowInteractions || !hasData, "Insert Blank Row")}
                  {toolbarBtn(<IconBorders size={16} />, "Divider", () => openRowAction("divider"), false, !allowInteractions || !hasData, "Insert Divider Line")}
                  {toolbarBtn(<IconGroup size={16} />, "Group Header", () => openRowAction("group"), false, !allowInteractions || !hasData, "Insert Group Header")}
                  {toolbarBtn(<IconRows size={16} />, "Invert", () => onPersistProperty("general", "invertRows", !settings.general.invertRows), settings.general.invertRows, !allowInteractions, "Invert Row Order")}
                  {toolbarBtn(<IconRows size={16} />, "Manage Rows", () => openRowAction("panel"), false, !allowInteractions || !hasData, "Manage Rows")}
                </div>
              </div>

              {divider()}

              {/* Column section */}
              <div className="ribbon-section" aria-label="Column">
                {sectionTitle("Column")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconCalculator size={16} />, "Quick Formula", onOpenCalcMeasurePanel, false, !allowInteractions, "Open Calculated Measure Editor")}
                  {toolbarBtn(<IconFormula size={16} />, "Insert Formula", onOpenCalcMeasurePanel, false, !allowInteractions, "Open Formula Editor")}
                  {toolbarBtn(<IconBlend size={16} />, "Blend", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Simulate / Data Input / Manage Measures */}
              <div className="ribbon-section" aria-label="Data">
                {sectionTitle("Data")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconSimulate size={16} />, "Simulate", () => onPersistProperty("general", "simulateMode", !settings.general.simulateMode), settings.general.simulateMode, !allowInteractions, "Toggle Simulation Mode")}
                  {toolbarBtn(<IconDataInput size={16} />, "Data Input", onOpenBulkOperations, false, !allowInteractions, "Inline Data Input")}
                  {toolbarBtn(<IconKpi size={16} />, "Manage Measures", onOpenCalcMeasurePanel, false, !allowInteractions || !hasValues, "Manage Measures")}
                </div>
              </div>

              {divider()}

              {/* Global section */}
              <div className="ribbon-section" aria-label="Global">
                {sectionTitle("Global")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconVariables size={16} />, "Variables", onOpenVariables, false, !allowInteractions, "Manage Variables")}
                </div>
              </div>

              {divider()}

              {/* Forecast section */}
              <div className="ribbon-section" aria-label="Forecast">
                {sectionTitle("Forecast")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconChart size={16} />, "Insert Forecast", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Cell section */}
              <div className="ribbon-section" aria-label="Cell">
                {sectionTitle("Cell")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconNote size={16} />, "Edit Cell", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconGoalSeek size={16} />, "Goal Seek", onOpenGoalSeek, false, !allowInteractions || !hasValues, "Goal Seek Analysis")}
                  {toolbarBtn(<IconBulkEdit size={16} />, "Bulk Edit", onOpenBulkOperations, false, !allowInteractions, "Bulk Edit Operations")}
                  {toolbarBtn(<IconSmartAnalysis size={16} />, "Smart Analysis", onOpenSmartAnalysis, false, !allowInteractions || !hasData, "Smart Data Analysis")}
                </div>
              </div>

              {divider()}

              {/* Customize section */}
              <div className="ribbon-section" aria-label="Customize">
                {sectionTitle("Customize")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconGroup size={16} />, "Group", onOpenGroupPanel, false, !allowInteractions, "Group Rows")}
                  {toolbarBtn(<IconAggregation size={16} />, "Aggregation", onOpenAggregation, false, !allowInteractions || !hasValues, "Aggregation Overrides")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Compare">
                {sectionTitle("Compare")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconVersion size={16} />, "Set Version", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Measure">
                {sectionTitle("Measure")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconFilter size={16} />, "Filter Context", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Audit">
                {sectionTitle("Audit")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconAudit size={16} />, "Audit", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Visualizations">
                {sectionTitle("In-Cell Visuals")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconBars size={16} />, "Data Bars", () => toggle("dataBars", "enabled", settings.dataBars.enabled), settings.dataBars.enabled, !allowInteractions || !hasValues, "Toggle in-cell data bars")}
                  {toolbarBtn(<IconKpi size={16} />, "KPI Icons", () => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled), settings.kpiIcons.enabled, !allowInteractions || !hasValues, "Toggle KPI trend icons")}
                  {toolbarBtn(<IconSpark size={16} />, "Sparklines", () => toggle("sparklines", "enabled", settings.sparklines.enabled), settings.sparklines.enabled, !allowInteractions || !hasValues, "Toggle per-row sparklines")}
                </div>
              </div>
            </>
          )}

          {toolbarMode !== "minimal" && activeTab === "design" && (
            <>
              <div className="ribbon-section" aria-label="Layout">
                {sectionTitle("Layout")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconHeaderFooter size={16} />, "Headers & Title", onOpenHeaderFooter, false, !allowInteractions, "Customize title, row headers and column headers")}
                  {toolbarBtn(<IconTheme size={16} />, "Enterprise Themes", onOpenThemeGallery, false, !allowInteractions, "Open premium theme gallery")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Table">
                {sectionTitle("Table")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconPageBreak size={16} />, "Single Page", () => onPersistProperty("layout", "mode", "hierarchy"), settings.layout.mode === "hierarchy", !allowInteractions, "Single Page")}
                  {toolbarBtn(<IconPageBreak size={16} />, "Outline", () => onPersistProperty("layout", "mode", "outline"), settings.layout.mode === "outline", !allowInteractions, "Outline")}
                  {toolbarBtn(<IconRows size={16} />, "Table", () => onPersistProperty("layout", "mode", "table"), settings.layout.mode === "table", !allowInteractions, "Table Layout")}
                  {toolbarBtn(<IconRows size={16} />, "Stepped", () => onPersistProperty("layout", "mode", "stepped"), settings.layout.mode === "stepped", !allowInteractions, "Stepped Layout")}
                  <select className="ribbon-select" value={settings.layout.rowBreak} onChange={(e) => onPersistProperty("layout", "rowBreak", e.target.value)} disabled={!allowInteractions} title="Row Break">
                    <option value="none">Row None</option>
                    <option value="page">Row Page</option>
                    <option value="section">Row Section</option>
                  </select>
                  <select className="ribbon-select" value={settings.layout.columnBreak} onChange={(e) => onPersistProperty("layout", "columnBreak", e.target.value)} disabled={!allowInteractions} title="Column Break">
                    <option value="none">Column None</option>
                    <option value="page">Column Page</option>
                    <option value="section">Column Section</option>
                  </select>
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Report">
                {sectionTitle("Report+")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconReport size={16} />, "Report+", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconPageTotal size={16} />, "Totals", onOpenTotalsPanel, false, !allowInteractions, "Manage Totals & Subtotals")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Display">
                {sectionTitle("Display")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconGrid size={16} />, "Gridlines", () => toggle("general", "showGridlines", settings.general.showGridlines), settings.general.showGridlines, !allowInteractions, "Toggle gridlines")}
                  {toolbarBtn(<IconRows size={16} />, "Banding", () => toggle("general", "rowBanding", settings.general.rowBanding), settings.general.rowBanding, !allowInteractions, "Toggle row banding")}
                  {toolbarBtn(<IconHighlight size={16} />, "Highlight", () => toggle("general", "rowHighlight", settings.general.rowHighlight), settings.general.rowHighlight, !allowInteractions, "Row Highlight")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Theme">
                {sectionTitle("Theme")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconTheme size={16} />, "Themes", onOpenThemeGallery, false, !allowInteractions, "Open Theme Gallery")}
                  {toolbarBtn(<IconMinimal size={16} />, "Compact", () => onPersistProperty("theme", "density", "compact" as ThemeDensity), settings.theme.density === "compact", !allowInteractions, "Compact Density")}
                  {toolbarBtn(<IconFull size={16} />, "Comfort", () => onPersistProperty("theme", "density", "comfortable" as ThemeDensity), settings.theme.density === "comfortable", !allowInteractions, "Comfortable Density")}
                </div>
              </div>
            </>
          )}

          {toolbarMode !== "minimal" && activeTab === "export" && (
            <>
              <div className="ribbon-section" aria-label="PDF & Report">
                {sectionTitle("PDF & Report")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconPdf size={16} />, "PDF Report", onExportPDF, false, !allowInteractions || !hasData, "Export to PDF")}
                  {toolbarBtn(<IconPageTotal size={16} />, "Page Setup", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Data Export">
                {sectionTitle("Data Export")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconExcel size={16} />, "Excel", onExportXLSX, false, !allowInteractions || !hasData, "Export to Excel")}
                  {toolbarBtn(<IconGrid size={16} />, "CSV", onExportCSV, false, !allowInteractions || !hasData, "Export to CSV")}
                  {toolbarBtn(<IconJson size={16} />, "JSON", onExportJSON, false, !allowInteractions || !hasData, "Export to JSON")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Tools">
                {sectionTitle("Tools")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconExport size={16} />, "Copy", onCopyToClipboard, false, !allowInteractions || !hasData, "Copy to clipboard")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Writeback">
                {sectionTitle("Writeback")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconWriteback size={16} />, "Writeback", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Schedule">
                {sectionTitle("Schedule")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconNew size={16} />, "New Subscription", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconSchedule size={16} />, "Subscriptions", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Backup">
                {sectionTitle("Backup")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconSettings size={16} />, "Settings", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconConfig size={16} />, "Config", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconReuse size={16} />, "Reuse Theme", () => { }, false, true, "Coming soon")}
                </div>
              </div>
            </>
          )}
          </div>
          {canScrollContentRight && (
            <button
              className="ribbon-scroll-btn right"
              onClick={() => scrollContent("right")}
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 500,
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(0,0,0,0.1)",
                height: "48px",
                width: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                boxShadow: "-2px 0 8px rgba(0,0,0,0.15)",
                borderRight: "none",
                borderRadius: "4px 0 0 4px"
              }}
              title="Scroll Right"
            >
              <IconChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

Ribbon.displayName = "Ribbon";
