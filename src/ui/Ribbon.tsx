import React, { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  VisualSettings,
  ThemeDensity,
  ThemePresetId,
  LayoutMode,
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
  IconUndo,
  IconRedo,
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
  IconCompare,
  IconContext,
  IconAudit,
  IconHeaderFooter,
  IconTheme,
  IconPageBreak,
  IconReport,
  IconPageTotal,
  IconGridlines,
  IconOutline,
  IconHighlight,
  IconPdf,
  IconExcel,
  IconWriteback,
  IconSchedule,
  IconSettings,
  IconBackup,
  IconMenu,
  IconUnpin,
  IconReading,
  IconQuickAccess,
  IconFull,
  IconMinimal,
  IconTabs,
  IconTopN,
  IconExplorer,
  IconActions,
  IconManageColumns,
  IconCondFormat,
  IconTotals,
  IconBars,
  IconSpark,
  IconKpi,
  IconChevronDown,
  IconRows,
  IconColumns,
  IconExport,
  IconNew,
  IconConfig,
  IconReuse,
  IconAllowed,
  IconGrid,
} from "./icons";
import { ConditionalFormattingDropdown } from "./ConditionalFormattingDropdown";

export type RibbonTab = "home" | "insert" | "design" | "export";
export type ToolbarMode = "full" | "minimal" | "minimal-tabs";

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
  onOpenCalcMeasurePanel?: () => void;
  onOpenCalcRowPanel?: () => void;
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
  onOpenSmartAnalysis?: () => void;
  onOpenGoalSeek?: () => void;
  onOpenVariables?: () => void;
  onOpenGroupPanel?: () => void;
  onOpenAggregation?: () => void;
  onOpenNotesPanel?: () => void;
  onOpenTopNPanel?: () => void;
  onOpenFilterPanel?: () => void;
  onOpenLevelPanel?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  rows?: import("../model/tree").FlattenedNode[];
  onOpenCondFormatDraft?: (draft: any) => void;
  selectedColumnKeys?: string[];
  selectedRowKeys?: string[];
  onApplyColumnFormat?: (keys: string[], patch: Record<string, any>) => void;
  onApplyRowFormat?: (keys: string[], patch: Record<string, any>) => void;
  onAddQuickVariance?: () => void;
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
  onOpenCondFormatDraft,
  selectedColumnKeys,
  selectedRowKeys,
  onApplyColumnFormat,
  onApplyRowFormat,
  onAddQuickVariance,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  toolbarMode,
  toolbarPinned,
  zoomLevel = 100,
  onChangeTab,
  onToggleExplorer,
  onPersistProperty,
  onExportCSV,
  onExportXLSX,
  onExportPDF,
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
  onOpenSmartAnalysis,
  onOpenGoalSeek,
  onOpenVariables,
  onOpenGroupPanel,
  onOpenAggregation,
  onOpenNotesPanel,
  onOpenTopNPanel,
  onOpenFilterPanel,
  onOpenLevelPanel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cfMenuOpen, setCfMenuOpen] = useState(false);
  const [cfAnchorRect, setCfAnchorRect] = useState<DOMRect | null>(null);
  const cfAnchorRef = useRef<HTMLDivElement>(null);
  const [quickFormatOpen, setQuickFormatOpen] = useState(false);
  const quickFormatRef = useRef<HTMLDivElement>(null);

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

  // Quick rule helpers — append a new ConditionalRule to the rules array.
  const appendCfRule = (rule: any) => {
    if (!allowInteractions) return;
    let existing: any[] = [];
    try {
      const parsed = JSON.parse(settings.conditionalFormatting.rules || "[]");
      if (Array.isArray(parsed)) existing = parsed;
    } catch { /* ignore */ }
    const next = [...existing, rule];
    onPersistProperty("conditionalFormatting", "rules", JSON.stringify(next));
    if (!settings.conditionalFormatting.enabled) {
      onPersistProperty("conditionalFormatting", "enabled", true);
    }
    setCfMenuOpen(false);
  };

  const newRuleId = () => `rule_${Date.now()}_${secureRandomId(6)}`;
  const baseScope = () => ({
    targetMeasure: -1,
    rowHierarchyLevels: "valuesAndTotals",
    excludeColumnGrandTotal: false,
  });

  const quickPositive = () => appendCfRule({
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

  const quickNegative = () => appendCfRule({
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

  const quickColorScale = (colors: string[], name: string) => appendCfRule({
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

  const quickClassification = () => appendCfRule({
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

  const quickDataBars = () => appendCfRule({
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
          <div className="mx-ribbon-tabs" role="tablist" aria-label="Ribbon tabs">
            {tabButton("home", "Home")}
            {tabButton("insert", "Insert")}
            {tabButton("design", "Design")}
            {tabButton("export", "Export")}
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
          height: 36
        }}>
           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
             {activeTab === "home" && (
               <>
                 {toolbarBtn(<IconBold size={13} />, "Bold", () => onPersistProperty("values", "bold", !settings.values.bold), settings.values.bold, !allowInteractions)}
                 {toolbarBtn(<IconFontColor size={13} />, "Color", () => {}, false, !allowInteractions)}
                 {toolbarBtn(<IconAlignCenter size={13} />, "Align", () => onPersistProperty("values", "alignment", "center"), settings.values.alignment === "center", !allowInteractions)}
                 <select className="ribbon-select" style={{ width: 80, fontSize: 11 }} value={settings.general.fontFamily || "-apple-system"} onChange={(e) => onPersistProperty("general", "fontFamily", e.target.value)} disabled={!allowInteractions}>
                    <option value="-apple-system">System</option>
                    <option value="Segoe UI">Segoe UI</option>
                 </select>
               </>
             )}
             {activeTab === "insert" && (
               <>
                 {toolbarBtn(<IconFormula size={13} />, "Measure", onOpenCalcMeasurePanel, false, !allowInteractions)}
                 {toolbarBtn(<IconInsertRow size={13} />, "Row", onOpenCalcRowPanel, false, !allowInteractions)}
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
               EXPAND FULL ▾
             </button>
           </div>
        </div>
      )}

      {showContent && (
        <div className="mx-ribbon-content" role="tabpanel">
          {/* ============================================================
              MINIMAL MODE — full-featured single scrollable row
              ============================================================ */}
          {toolbarMode === "minimal" && (
            <div className="mx-ribbon-minimal-row" style={{ display: "flex", alignItems: "center", gap: 2, padding: "3px 8px", width: "100%", overflowX: "auto", overflowY: "visible", flexWrap: "nowrap", minHeight: 32 }}>
              {/* Undo / Redo */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <button className="ribbon-btn icon-only" onClick={onUndo} disabled={!canUndo || !allowInteractions} title="Undo (Ctrl+Z)" type="button"><IconUndo size={14} /></button>
                <button className="ribbon-btn icon-only" onClick={onRedo} disabled={!canRedo || !allowInteractions} title="Redo (Ctrl+Y)" type="button"><IconRedo size={14} /></button>
              </div>
              <span className="ribbon-divider-v" />
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
                {toolbarBtn(<IconBold size={13} />, "", () => onPersistProperty("values", "bold", !settings.values.bold), settings.values.bold, !allowInteractions, "Bold")}
                {toolbarBtn(<IconItalic size={13} />, "", () => onPersistProperty("values", "italic", !settings.values.italic), settings.values.italic, !allowInteractions, "Italic")}
                {toolbarBtn(<IconUnderline size={13} />, "", () => onPersistProperty("values", "underline", !settings.values.underline), settings.values.underline, !allowInteractions, "Underline")}
                {toolbarBtn(<span style={{ fontFamily: "serif", fontSize: 12, textDecoration: "line-through", fontWeight: 700, lineHeight: 1 }}>S</span>, "", () => onPersistProperty("general", "strikethrough", !settings.general.strikethrough), settings.general.strikethrough, !allowInteractions, "Strikethrough")}
                {toolbarBtn(<span style={{ fontSize: 11, fontWeight: 700 }}>↵</span>, "", () => onPersistProperty("general", "wrapText", !settings.general.wrapText), settings.general.wrapText, !allowInteractions, "Wrap Text")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Colors */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconFontColor size={13} />, "", () => { const c = prompt("Text color (hex):", settings.values.textColor || "#333333"); if (c) onPersistProperty("values", "textColor", c); }, false, !allowInteractions, "Font Color")}
                {toolbarBtn(<IconFillColor size={13} />, "", () => { const c = prompt("Background color (hex):", settings.values.backgroundColor || "#ffffff"); if (c) onPersistProperty("values", "backgroundColor", c); }, false, !allowInteractions, "Fill Color")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Alignment + Borders */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconAlignLeft size={13} />, "", () => onPersistProperty("values", "alignment", "left"), settings.values.alignment === "left", !allowInteractions, "Align Left")}
                {toolbarBtn(<IconAlignCenter size={13} />, "", () => onPersistProperty("values", "alignment", "center"), settings.values.alignment === "center", !allowInteractions, "Align Center")}
                {toolbarBtn(<IconAlignRight size={13} />, "", () => onPersistProperty("values", "alignment", "right"), settings.values.alignment === "right", !allowInteractions, "Align Right")}
                {toolbarBtn(<IconBorders size={13} />, "", () => { const ss = ["none", "all", "horizontal", "vertical", "outline"] as const; const ci = ss.indexOf(settings.values.borderStyle as any); onPersistProperty("values", "borderStyle", ss[(ci + 1) % ss.length]); }, settings.values.borderStyle !== "none", !allowInteractions, "Borders")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Number format */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <button className={`ribbon-format-btn ${settings.values.numberFormat === "0.0%" ? "active" : ""}`} disabled={!allowInteractions} title="Percentage" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "0.0%" ? "" : "0.0%")}>%</button>
                <button className={`ribbon-format-btn ${settings.values.numberFormat === "$#,##0.00" ? "active" : ""}`} disabled={!allowInteractions} title="Currency" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "$#,##0.00" ? "" : "$#,##0.00")}>$</button>
                <button className={`ribbon-format-btn ${settings.values.numberFormat === "#,##0" ? "active" : ""}`} disabled={!allowInteractions} title="Comma" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "#,##0" ? "" : "#,##0")}>,</button>
                <button className="ribbon-format-btn" disabled={!allowInteractions} title="Increase Decimal" onClick={() => { const c = settings.values.numberFormat || "#,##0"; const n = c === "#,##0" ? "#,##0.0" : c === "#,##0.0" ? "#,##0.00" : c; if (n !== c) onPersistProperty("values", "numberFormat", n); }}>.0</button>
                <button className="ribbon-format-btn" disabled={!allowInteractions} title="Decrease Decimal" onClick={() => { const c = settings.values.numberFormat || "#,##0"; const n = c === "#,##0.00" ? "#,##0.0" : c === "#,##0.0" ? "#,##0" : c; if (n !== c) onPersistProperty("values", "numberFormat", n); }}>.00</button>
              </div>
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
                {toolbarBtn(<IconRows size={13} />, "Levels", () => onOpenLevelPanel?.(), false, !allowInteractions || !hasData, "Hierarchy Levels")}
              </div>
              <span className="ribbon-divider-v" />
              {/* Insert */}
              <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {toolbarBtn(<IconInsertRow size={13} />, "Row", () => onOpenCalcRowPanel?.(), false, !allowInteractions, "Insert Calculated Row")}
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
              MINIMAL-TABS MODE — condensed per-tab content
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
                    {toolbarBtn(<IconBold size={13} />, "", () => onPersistProperty("values", "bold", !settings.values.bold), settings.values.bold, !allowInteractions, "Bold")}
                    {toolbarBtn(<IconItalic size={13} />, "", () => onPersistProperty("values", "italic", !settings.values.italic), settings.values.italic, !allowInteractions, "Italic")}
                    {toolbarBtn(<IconUnderline size={13} />, "", () => onPersistProperty("values", "underline", !settings.values.underline), settings.values.underline, !allowInteractions, "Underline")}
                    {toolbarBtn(<IconFontColor size={13} />, "", () => { const c = prompt("Text color:", settings.values.textColor || "#333333"); if (c) onPersistProperty("values", "textColor", c); }, false, !allowInteractions, "Font Color")}
                    {toolbarBtn(<IconFillColor size={13} />, "", () => { const c = prompt("Background color:", settings.values.backgroundColor || "#ffffff"); if (c) onPersistProperty("values", "backgroundColor", c); }, false, !allowInteractions, "Fill Color")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconAlignLeft size={13} />, "", () => onPersistProperty("values", "alignment", "left"), settings.values.alignment === "left", !allowInteractions, "Align Left")}
                    {toolbarBtn(<IconAlignCenter size={13} />, "", () => onPersistProperty("values", "alignment", "center"), settings.values.alignment === "center", !allowInteractions, "Align Center")}
                    {toolbarBtn(<IconAlignRight size={13} />, "", () => onPersistProperty("values", "alignment", "right"), settings.values.alignment === "right", !allowInteractions, "Align Right")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    <button className={`ribbon-format-btn ${settings.values.numberFormat === "0.0%" ? "active" : ""}`} disabled={!allowInteractions} title="Percentage" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "0.0%" ? "" : "0.0%")}>%</button>
                    <button className={`ribbon-format-btn ${settings.values.numberFormat === "$#,##0.00" ? "active" : ""}`} disabled={!allowInteractions} title="Currency" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "$#,##0.00" ? "" : "$#,##0.00")}>$</button>
                    <button className={`ribbon-format-btn ${settings.values.numberFormat === "#,##0" ? "active" : ""}`} disabled={!allowInteractions} title="Comma" onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "#,##0" ? "" : "#,##0")}>,</button>
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {toolbarBtn(<IconCondFormat size={13} />, "CF", () => onOpenCondFormatPanel?.(), settings.conditionalFormatting.enabled, !hasValues, "Conditional Formatting")}
                    {toolbarBtn(<IconTotals size={13} />, "Totals", () => onOpenTotalsPanel?.(), settings.totals.showGrandTotals, !allowInteractions, "Totals")}
                    {toolbarBtn(<IconSort size={13} />, "Sort", onOpenSortPanel, false, !allowInteractions || !hasData, "Sort")}
                    {toolbarBtn(<IconFilter size={13} />, "Filter", () => onOpenFilterPanel?.(), false, !allowInteractions || !hasData, "Filter")}
                    {toolbarBtn(<IconTopN size={13} />, "Top N", () => onOpenTopNPanel?.(), false, !hasData, "Top N")}
                    {toolbarBtn(<IconExplorer size={13} />, "Explorer", onToggleExplorer, explorerOpen, !allowInteractions, "Toggle Explorer")}
                  </div>
                  <span className="ribbon-divider-v" />
                  <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    <button className="ribbon-btn icon-only" onClick={onUndo} disabled={!canUndo || !allowInteractions} title="Undo" type="button"><IconUndo size={13} /></button>
                    <button className="ribbon-btn icon-only" onClick={onRedo} disabled={!canRedo || !allowInteractions} title="Redo" type="button"><IconRedo size={13} /></button>
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
                      () => onPersistProperty("headers", "bold", !settings.headers.bold),
                      settings.headers.bold,
                      !allowInteractions,
                      "Bold Headers"
                    )}
                    {toolbarBtn(<IconItalic size={14} />, "", () => onPersistProperty("values", "italic", !settings.values.italic), settings.values.italic, !allowInteractions, "Italic")}
                    {toolbarBtn(<IconUnderline size={14} />, "", () => onPersistProperty("values", "underline", !settings.values.underline), settings.values.underline, !allowInteractions, "Underline")}
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
                    {toolbarBtn(
                      <IconFontColor size={14} />,
                      "",
                      () => {
                        const color = prompt("Enter text color (hex):", settings.values.textColor || "#333333");
                        if (color) onPersistProperty("values", "textColor", color);
                      },
                      false,
                      !allowInteractions,
                      "Font Color"
                    )}
                    {toolbarBtn(
                      <IconFillColor size={14} />,
                      "",
                      () => {
                        const color = prompt("Enter background color (hex):", settings.values.backgroundColor || "#ffffff");
                        if (color) onPersistProperty("values", "backgroundColor", color);
                      },
                      false,
                      !allowInteractions,
                      "Fill Color"
                    )}
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
                      () => onPersistProperty("values", "alignment", "left"),
                      settings.values.alignment === "left",
                      !allowInteractions,
                      "Align Left"
                    )}
                    {toolbarBtn(
                      <IconAlignCenter size={14} />,
                      "",
                      () => onPersistProperty("values", "alignment", "center"),
                      settings.values.alignment === "center",
                      !allowInteractions,
                      "Align Center"
                    )}
                    {toolbarBtn(
                      <IconAlignRight size={14} />,
                      "",
                      () => onPersistProperty("values", "alignment", "right"),
                      settings.values.alignment === "right",
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

              {divider()}

              <div className="ribbon-section" aria-label="Number">
                {sectionTitle("Number")}
                <div className="ribbon-btn-group">
                  <button
                    className={`ribbon-format-btn ${settings.values.numberFormat === "0.0%" ? "active" : ""}`}
                    disabled={!allowInteractions}
                    title="Percentage"
                    onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "0.0%" ? "" : "0.0%")}
                  >%</button>
                  <button
                    className={`ribbon-format-btn ${settings.values.numberFormat === "$#,##0.00" ? "active" : ""}`}
                    disabled={!allowInteractions}
                    title="Currency"
                    onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "$#,##0.00" ? "" : "$#,##0.00")}
                  >$</button>
                  <button
                    className={`ribbon-format-btn ${settings.values.numberFormat === "#,##0" ? "active" : ""}`}
                    disabled={!allowInteractions}
                    title="Comma Style"
                    onClick={() => onPersistProperty("values", "numberFormat", settings.values.numberFormat === "#,##0" ? "" : "#,##0")}
                  >,</button>
                  <button
                    className="ribbon-format-btn"
                    disabled={!allowInteractions}
                    title="Increase Decimal"
                    onClick={() => {
                      const current = settings.values.numberFormat || "#,##0";
                      if (current === "#,##0") onPersistProperty("values", "numberFormat", "#,##0.0");
                      else if (current === "#,##0.0") onPersistProperty("values", "numberFormat", "#,##0.00");
                    }}
                  >.0</button>
                  <button
                    className="ribbon-format-btn"
                    disabled={!allowInteractions}
                    title="Decrease Decimal"
                    onClick={() => {
                      const current = settings.values.numberFormat || "#,##0";
                      if (current === "#,##0.00") onPersistProperty("values", "numberFormat", "#,##0.0");
                      else if (current === "#,##0.0") onPersistProperty("values", "numberFormat", "#,##0");
                    }}
                  >.00</button>
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
                      "Cond. Format ▾",
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
                          // Color Scales — sequential
                          else if (id === "scale-seq-blue") quickColorScale(["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"], "Sequential Blue");
                          else if (id === "scale-seq-orange") quickColorScale(["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"], "Sequential Orange");
                          else if (id === "scale-seq-green") quickColorScale(["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"], "Sequential Green");
                          // Color Scales — qualitative
                          else if (id === "scale-qual-cool") quickColorScale(["#10b981", "#7c3aed", "#ef4444", "#eab308", "#3b82f6", "#6b7280"], "Qualitative Cool");
                          else if (id === "scale-qual-earth") quickColorScale(["#93c5fd", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5", "#a8a29e"], "Qualitative Earth");
                          // Color Scales — diverging
                          else if (id === "scale-div-rwg") quickColorScale(["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"], "Diverging Red–Yellow–Green");
                          else if (id === "scale-div-rwb") quickColorScale(["#b91c1c", "#fca5a5", "#fef9c3", "#bae6fd", "#1d4ed8"], "Diverging Red–Blue");
                          else if (id === "scale-div-byg") quickColorScale(["#854d0e", "#d97706", "#ecfeff", "#22d3ee", "#0e7490"], "Diverging Brown–Teal");
                          // Color Scales — continuous
                          else if (id === "scale-cont-warm") quickColorScale(["#f97316", "#be123c"], "Continuous Warm");
                          else if (id === "scale-cont-div") quickColorScale(["#ef4444", "#ffffff", "#6366f1"], "Continuous Diverging");
                          // Classification — icons / text
                          else if (id === "class-icon-check" || id === "class-icon-flags" || id === "class-icon-arrows3" || id === "class-icon-arrows5" || id === "class-text-abc" || id === "class-text-levels" || id === "class-rating-squares" || id === "class-rating-stars" || id === "class-rating-circles") quickClassification();
                          // Data Bars
                          else if (id === "bar-blue") quickDataBars();
                          else if (id === "bar-green") quickColorScale(["#dcfce7", "#16a34a"], "Data Bar Green");
                          else if (id === "bar-red") quickColorScale(["#fee2e2", "#dc2626"], "Data Bar Red");
                          else if (id === "bar-orange") quickColorScale(["#ffedd5", "#f59e0b"], "Data Bar Orange");
                          else if (id === "bar-pink") quickColorScale(["#fce7f3", "#ec4899"], "Data Bar Pink");
                          // Action Analysis — open full panel for configuration
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
                      <button
                        className={`ribbon-btn hover-scale`}
                        onClick={onUndo}
                        disabled={!canUndo || !allowInteractions}
                        type="button"
                        title="Undo (Ctrl+Z)"
                      >
                        <IconUndo size={16} />
                        <span className="ribbon-btn-label">Undo</span>
                      </button>
                      <button
                        className={`ribbon-btn hover-scale`}
                        onClick={onRedo}
                        disabled={!canRedo || !allowInteractions}
                        type="button"
                        title="Redo (Ctrl+Y)"
                      >
                        <IconRedo size={16} />
                        <span className="ribbon-btn-label">Redo</span>
                      </button>
                    </div>
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
                  {toolbarBtn(<IconInsertRow size={16} />, "Insert Row", onOpenCalcRowPanel, false, !allowInteractions, "Insert Calculated Row")}
                  {toolbarBtn(<IconRows size={16} />, "Invert", () => onPersistProperty("general", "invertRows", !settings.general.invertRows), settings.general.invertRows, !allowInteractions, "Invert Row Order")}
                  {toolbarBtn(<IconRows size={16} />, "Manage Rows", onOpenCalcRowPanel, false, !allowInteractions || !hasData, "Manage Rows")}
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

              {/* Compare section */}
              <div className="ribbon-section" aria-label="Compare">
                {sectionTitle("Compare")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconVersion size={16} />, "Set Version", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Measure section */}
              <div className="ribbon-section" aria-label="Measure">
                {sectionTitle("Measure")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconFilter size={16} />, "Filter Context", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Audit section */}
              <div className="ribbon-section" aria-label="Audit">
                {sectionTitle("Audit")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconAudit size={16} />, "Audit", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* In-Cell Visuals (keep existing) */}
              <div className="ribbon-section" aria-label="Visualizations">
                {sectionTitle("In-Cell Visuals")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(
                    <IconBars size={16} />,
                    "Data Bars",
                    () => toggle("dataBars", "enabled", settings.dataBars.enabled),
                    settings.dataBars.enabled,
                    !allowInteractions || !hasValues,
                    "Toggle in-cell data bars"
                  )}
                  {toolbarBtn(
                    <IconKpi size={16} />,
                    "KPI Icons",
                    () => toggle("kpiIcons", "enabled", settings.kpiIcons.enabled),
                    settings.kpiIcons.enabled,
                    !allowInteractions || !hasValues,
                    "Toggle KPI trend icons"
                  )}
                  {toolbarBtn(
                    <IconChart size={16} />,
                    "Sparklines",
                    () => toggle("sparklines", "enabled", settings.sparklines.enabled),
                    settings.sparklines.enabled,
                    !allowInteractions || !hasValues,
                    "Toggle per-row sparklines"
                  )}
                </div>
              </div>
            </>
          )}

          {toolbarMode !== "minimal" && activeTab === "design" && (
            <>
              <div className="ribbon-section" aria-label="Layout">
                {sectionTitle("Layout")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconHeaderFooter size={16} />, "Header & Footer", () => {
                  }, false, true, "Coming soon")}
                  {toolbarBtn(<IconTheme size={16} />, "Enterprise Themes", () => {
                  }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Table">
                {sectionTitle("Table")}
                <div className="ribbon-btn-group">
                  <div className="ribbon-btn-group vertical">
                    <button className={`ribbon-btn ${settings.layout.mode === "hierarchy" ? "active" : ""}`} onClick={() => onPersistProperty("layout", "mode", "hierarchy")}>
                      <IconPageBreak size={16} />
                      <span className="ribbon-btn-label">Single Page</span>
                    </button>
                    <button className={`ribbon-btn ${settings.layout.mode === "outline" ? "active" : ""}`} onClick={() => onPersistProperty("layout", "mode", "outline")}>
                      <IconPageBreak size={16} />
                      <span className="ribbon-btn-label">Multi Pages</span>
                    </button>
                  </div>
                  <div className="dropdown-btn-group">
                    <label style={{ fontSize: '11px', color: '#666', marginBottom: '2px', display: 'block' }}>Row Break</label>
                    <select className="ribbon-select" style={{ minWidth: '80px', width: '80px', padding: '2px 4px' }} disabled={!allowInteractions}>
                      <option>None</option>
                      <option>Page</option>
                      <option>Section</option>
                    </select>
                  </div>
                  <div className="dropdown-btn-group">
                    <label style={{ fontSize: '11px', color: '#666', marginBottom: '2px', display: 'block' }}>Column Break</label>
                    <select className="ribbon-select" style={{ minWidth: '80px', width: '80px', padding: '2px 4px' }} disabled={!allowInteractions}>
                      <option>None</option>
                      <option>Page</option>
                      <option>Section</option>
                    </select>
                  </div>
                  {toolbarBtn(<IconPageBreak size={16} />, "Section Break", () => {
                  }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Report+">
                {sectionTitle("Report+")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconReport size={16} />, "Report+", () => {
                  }, false, true, "Coming soon")}
                  {toolbarBtn(<IconPageTotal size={16} />, "Totals", () => {
                    if (onOpenTotalsPanel) onOpenTotalsPanel();
                  }, false, !allowInteractions, "Manage Totals & Subtotals")}
                  <button className="ribbon-btn style-btn" disabled={!allowInteractions} title="Style">
                    <span className="style-icon" style={{ fontSize: '16px', fontWeight: 'bold' }}>S</span>
                    <span className="ribbon-btn-label">Style</span>
                  </button>
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Display">
                {sectionTitle("Display")}
                <div className="ribbon-btn-group">
                  <div className="ribbon-btn-group vertical">
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <input
                        type="checkbox"
                        checked={settings.general.showGridlines}
                        onChange={() => onPersistProperty("general", "showGridlines", !settings.general.showGridlines)}
                        disabled={!allowInteractions}
                      /> Major Gridlines
                    </label>
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <input
                        type="checkbox"
                        checked={settings.general.rowBanding}
                        onChange={() => onPersistProperty("general", "rowBanding", !settings.general.rowBanding)}
                        disabled={!allowInteractions}
                      /> Row Banding
                    </label>
                  </div>
                  {toolbarBtn(<IconOutline size={16} />, "Outline", () => onPersistProperty("layout", "mode", "outline"), settings.layout.mode === "outline", !allowInteractions, "Outline")}
                  {toolbarBtn(<IconHighlight size={16} />, "Row Highlight", () => onPersistProperty("general", "rowHighlight", !settings.general.rowHighlight), settings.general.rowHighlight, !allowInteractions, "Row Highlight")}
                </div>
              </div>

              {divider()}

              <div className="ribbon-section" aria-label="Theme">
                {sectionTitle("Theme")}
                <div className="ribbon-btn-group">
                  <div className="ribbon-btn-group vertical">
                    <select
                      className="ribbon-select"
                      value={settings.theme.preset}
                      onChange={(e) => onPersistProperty("theme", "preset", e.target.value as ThemePresetId)}
                      disabled={!allowInteractions}
                      title="Select theme"
                      style={{ minWidth: '100px', width: '100px', padding: '2px 4px' }}
                    >
                      <option value="modern-light">Canvas Style</option>
                      <option value="minimal">Column Style</option>
                      <option value="modern-dark">Modern Dark</option>
                      <option value="finance-statement">Finance Statement</option>
                      <option value="tableau-like">Tableau Style</option>
                      <option value="figma-like">Figma Style</option>
                    </select>
                  </div>
                  <div className="ribbon-btn-group vertical">
                    <button
                      className={`ribbon-btn ${settings.theme.density === "compact" ? "active" : ""}`}
                      onClick={() => onPersistProperty("theme", "density", "compact" as ThemeDensity)}
                      disabled={!allowInteractions}
                      style={{ flexDirection: 'row', padding: '2px 6px', height: '24px' }}
                    >
                      Compact
                    </button>
                    <button
                      className={`ribbon-btn ${settings.theme.density === "comfortable" ? "active" : ""}`}
                      onClick={() => onPersistProperty("theme", "density", "comfortable" as ThemeDensity)}
                      disabled={!allowInteractions}
                      style={{ flexDirection: 'row', padding: '2px 6px', height: '24px' }}
                    >
                      Comfortable
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {toolbarMode !== "minimal" && activeTab === "export" && (
            <>
              {/* Export to PDF — Page Setup + matrix export options */}
              <div className="ribbon-section" aria-label="Export to PDF">
                {sectionTitle("Export to PDF")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconPageTotal size={16} />, "Page Setup", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconGrid size={16} />, "Entire Matrix", onExportCSV, false, !allowInteractions || !hasData, "Export entire matrix to CSV")}
                  {toolbarBtn(<IconColumns size={16} />, "Selected Columns", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconPdf size={16} />, "PDF Report", onExportPDF, false, !allowInteractions || !hasData, "Export to PDF")}
                </div>
              </div>

              {divider()}

              {/* Export to Excel */}
              <div className="ribbon-section" aria-label="Export to Excel">
                {sectionTitle("Export to Excel")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconExcel size={16} />, "Export Report", onExportXLSX, false, !allowInteractions || !hasData, "Export to Excel")}
                  {toolbarBtn(<IconGrid size={16} />, "Copy to Clipboard", onCopyToClipboard, false, !allowInteractions || !hasData, "Copy matrix data to clipboard as TSV")}
                </div>
              </div>

              {divider()}

              {/* Writeback */}
              <div className="ribbon-section" aria-label="Writeback">
                {sectionTitle("Writeback")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconWriteback size={16} />, "Writeback", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Schedule */}
              <div className="ribbon-section" aria-label="Schedule">
                {sectionTitle("Schedule")}
                <div className="ribbon-btn-group">
                  {toolbarBtn(<IconNew size={16} />, "New Subscription", () => { }, false, true, "Coming soon")}
                  {toolbarBtn(<IconSchedule size={16} />, "Manage Subscriptions", () => { }, false, true, "Coming soon")}
                </div>
              </div>

              {divider()}

              {/* Backup */}
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
      )}
    </div>
  );
});

Ribbon.displayName = "Ribbon";
