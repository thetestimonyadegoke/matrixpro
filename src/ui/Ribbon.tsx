import React, { memo, useState, useRef, useEffect } from "react";
import {
  VisualSettings,
  ThemeDensity,
  ThemePresetId,
  LayoutMode,
} from "../settings/settings";
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
  onChangeTab: (tab: RibbonTab) => void;
  onToggleExplorer: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onExportPDF?: () => void;
  onOpenCalcMeasurePanel?: () => void;
  onOpenCalcRowPanel?: () => void;
  onOpenBulkOperations?: () => void;
  onToolbarModeChange?: (mode: ToolbarMode) => void;
  onToolbarPinChange?: (pinned: boolean) => void;
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
  toolbarMode,
  toolbarPinned,
  onChangeTab,
  onToggleExplorer,
  onPersistProperty,
  onExportCSV,
  onExportXLSX,
  onExportPDF,
  onOpenCalcMeasurePanel,
  onOpenCalcRowPanel,
  onOpenBulkOperations,
  onToolbarModeChange,
  onToolbarPinChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
      onClick={() => onChangeTab(tab)}
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

      {toolbarMode !== "minimal-tabs" && (
        <div className="mx-ribbon-content" role="tabpanel">
          {toolbarMode === "minimal" && (
            <div className="mx-ribbon-actions minimal-actions">
              <button
                className="ribbon-btn manage-columns-btn"
                disabled={!allowInteractions}
                type="button"
                title="Manage Columns"
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
          )}
          
          {activeTab === "home" && (
          <>
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
                    alert("Chart allows adding mini-charts to cells. Enable sparklines in the Format pane to add in-cell charts.");
                  }, false, !hasValues, "Insert Chart")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Analyze">
              {sectionTitle("Analyze")}
              <div className="ribbon-btn-group">
                {toolbarBtn(
                  <IconCondFormat size={16} />,
                  "Conditional Formatting",
                  () => toggle("conditionalFormatting", "enabled", settings.conditionalFormatting.enabled),
                  settings.conditionalFormatting.enabled,
                  !hasValues,
                  "Toggle conditional formatting"
                )}
                {toolbarBtn(
                  <IconTotals size={16} />,
                  "Totals",
                  () => toggle("totals", "showGrandTotals", settings.totals.showGrandTotals),
                  settings.totals.showGrandTotals,
                  false,
                  "Toggle totals display"
                )}
                {toolbarBtn(<IconTopN size={16} />, "Top n", () => {
                    const val = prompt("Enter number of top rows to display (0 for all):", String(settings.general.topN || 0));
                    if (val !== null) onPersistProperty("general", "topN", parseInt(val, 10) || 0);
                  }, settings.general.topN > 0, !hasData, "Top N Analysis")}
                {toolbarBtn(<IconExplorer size={16} />, "Explorer", onToggleExplorer, explorerOpen, !allowInteractions, "Toggle Explorer panel")}
                {toolbarBtn(<IconSort size={16} />, "Sort", () => {
                    const direction = prompt("Enter sort direction (asc, desc, none):", "none");
                    if (direction === "asc" || direction === "desc" || direction === "none") {
                      // This would need integration with the Matrix sort state
                      alert(`Sort direction set to: ${direction}. Click column headers to sort.`);
                    }
                  }, false, !hasData, "Sort data")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Annotate">
              {sectionTitle("Annotate")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconNote size={16} />, "Notes", () => {
                    alert("Notes allow adding comments to cells. Double-click a cell and use the notes feature in the context menu.");
                  }, false, !allowInteractions, "Add notes")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Actions">
              {sectionTitle("Actions")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconTemplate size={16} />, "Templates", () => {
                    alert("Templates allow saving and reusing visual configurations. Use the Format pane to save current settings as a template.");
                  }, false, !allowInteractions, "Templates")}
                {toolbarBtn(<IconDisplay size={16} />, "Display", () => {
                    alert("Display options control visual density and layout. Use the Theme section in the Design tab to adjust display settings.");
                  }, false, !allowInteractions, "Display options")}
                <div className="ribbon-btn-group vertical">
                  <div className="toolbar-row">
                    {toolbarBtn(<IconUndo size={16} />, "", () => {
                    alert("Undo is not yet implemented. Changes are persisted immediately. Use the Format pane to revert settings.");
                  }, false, !allowInteractions, "Undo")}
                    {toolbarBtn(<IconRedo size={16} />, "", () => {
                    alert("Redo is not yet implemented. Changes are persisted immediately. Use the Format pane to modify settings.");
                  }, false, !allowInteractions, "Redo")}
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

        {activeTab === "insert" && (
          <>
            <div className="ribbon-section" aria-label="Row">
              {sectionTitle("Row")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(
                  <IconInsertRow size={16} />, 
                  "Insert Row", 
                  () => {
                    const rowName = prompt("Enter new calculated row name:");
                    if (rowName) {
                       const currentRows = JSON.parse(settings.calculations.rows || "[]");
                       const newRow = {
                         id: `row_${Date.now()}`,
                         name: rowName,
                         formulaType: "custom",
                         rowReferences: [] as string[],
                         customFormula: "0",
                         enabled: true,
                         order: currentRows.length,
                         style: { bold: false, italic: false, backgroundColor: "", textColor: "", borderTop: "none", borderBottom: "none", indentOverride: null as number | null },
                         includeInTotals: true,
                         isSubtotal: false,
                         parentRowKey: null as string | null,
                         insertAfterRowKey: null as string | null,
                         insertAtTop: false
                       };
                       onPersistProperty("calculations", "rows", JSON.stringify([...currentRows, newRow]));
                    }
                  }, 
                  false, 
                  !allowInteractions, 
                  "Insert Row"
                )}
                {toolbarBtn(<IconRows size={16} />, "Manage Rows", onOpenCalcRowPanel, false, !allowInteractions || !hasData, "Manage Rows")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Formula">
              {sectionTitle("Formula")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(
                  <IconCalculator size={16} />, 
                  "Quick Formula", 
                  () => {
                    alert("Quick formula feature allows one-click calculations like % of Total. Currently available via column header right-click.");
                  }, 
                  false, 
                  !allowInteractions, 
                  "Quick Formula"
                )}
                {toolbarBtn(
                  <IconFormula size={16} />, 
                  "Insert Formula", 
                  onOpenCalcMeasurePanel, 
                  false, 
                  !allowInteractions, 
                  "Insert Formula"
                )}
                {toolbarBtn(<IconBlend size={16} />, "Blend", () => {
                    alert("Blend allows combining multiple measures into a single column. Use the column header right-click menu to access this feature.");
                  }, false, !allowInteractions, "Blend")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Column">
              {sectionTitle("Column")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconSimulate size={16} />, "Simulate", () => {
                    alert("Simulation allows creating what-if scenarios. Use the calculated measures feature to define simulations.");
                  }, false, !allowInteractions, "Simulate")}
                {toolbarBtn(
                  <IconColumns size={16} />, 
                  "Insert", 
                  onOpenCalcMeasurePanel, 
                  false, 
                  !allowInteractions, 
                  "Insert Column"
                )}
                {toolbarBtn(<IconDataInput size={16} />, "Data Input", () => {
                    alert("Data Input allows manual entry of values. Enable writeback to use this feature.");
                  }, false, !allowInteractions, "Data Input")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Manage Measures">
              {sectionTitle("Manage Measures")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconKpi size={16} />, "Manage Measures", onOpenCalcMeasurePanel, false, !allowInteractions || !hasValues, "Manage Measures")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Global">
              {sectionTitle("Global")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconVariables size={16} />, "Variables", () => {
                    alert("Variables allow defining reusable values across formulas. Create calculated measures to define variables.");
                  }, false, !allowInteractions, "Variables")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Forecast">
              {sectionTitle("Forecast")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconNote size={16} />, "Edit Cell", () => {
                    alert("Edit Cell allows direct editing of values. Double-click a cell to edit its value.");
                  }, false, !allowInteractions, "Edit Cell")}
                {toolbarBtn(<IconGoalSeek size={16} />, "Goal Seek", () => {
                    alert("Goal Seek allows finding input values that produce a desired result. This feature requires writeback to be enabled.");
                  }, false, !allowInteractions, "Goal Seek")}
                {toolbarBtn(<IconBulkEdit size={16} />, "Bulk", onOpenBulkOperations, false, !allowInteractions, "Bulk Edit/Clear Operations")}
                {toolbarBtn(<IconSmartAnalysis size={16} />, "Smart Analysis", () => {
                    alert("Smart Analysis provides AI-powered insights. This feature requires integration with external AI services.");
                  }, false, !allowInteractions, "Smart Analysis")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Customize">
              {sectionTitle("Customize")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconGroup size={16} />, "Group", () => {
                    alert("Group allows combining rows into groups. Use the row header right-click menu to create groups.");
                  }, false, !allowInteractions, "Group")}
                {toolbarBtn(<IconAggregation size={16} />, "Aggregation", () => {
                    alert("Aggregation allows changing how values are summarized. Use the column header right-click menu to change aggregation.");
                  }, false, !allowInteractions, "Aggregation")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Compare">
              {sectionTitle("Compare")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconVersion size={16} />, "Set Version", () => {
                    alert("Set Version allows creating snapshots of data for comparison. This feature requires version history to be enabled.");
                  }, false, !allowInteractions, "Set Version")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Measure">
              {sectionTitle("Measure")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconFilter size={16} />, "Filter", () => {
                    alert("Filter allows hiding specific rows or values. Use the Explorer panel to filter data.");
                  }, false, !allowInteractions, "Filter")}
                {toolbarBtn(<IconContext size={16} />, "Context", () => {
                    alert("Context allows showing additional information for measures. Use the column settings to configure context.");
                  }, false, !allowInteractions, "Context")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Audit">
              {sectionTitle("Audit")}
              <div className="ribbon-btn-group vertical">
                {toolbarBtn(<IconAudit size={16} />, "Audit", () => {
                    alert("Audit tracks changes and provides lineage information. This feature requires audit logging to be enabled.");
                  }, false, !allowInteractions, "Audit")}
              </div>
            </div>
          </>
        )}

        {activeTab === "design" && (
          <>
            <div className="ribbon-section" aria-label="Layout">
              {sectionTitle("Layout")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconHeaderFooter size={16} />, "Header & Footer", () => {
                    alert("Header & Footer customization allows adding titles, logos, and page numbers. This feature is available in the Format pane.");
                  }, false, !allowInteractions, "Header & Footer")}
                {toolbarBtn(<IconTheme size={16} />, "Enterprise Themes", () => {
                    alert("Enterprise Themes allow applying corporate branding. Use the Theme dropdown to select from available themes.");
                  }, false, !allowInteractions, "Enterprise Themes")}
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
                    alert("Section Break allows inserting visual breaks between row groups. Use the row header right-click menu to insert section breaks.");
                  }, false, !allowInteractions, "Section Break")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Report+">
              {sectionTitle("Report+")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconReport size={16} />, "Report+", () => {
                    alert("Report+ provides advanced reporting features like cross-visual interactions and drill-through. Available in the Format pane.");
                  }, false, !allowInteractions, "Report+")}
                {toolbarBtn(<IconPageTotal size={16} />, "Page Total", () => {
                    alert("Page Total shows running totals at page breaks. Enable this in the Totals settings.");
                  }, false, !allowInteractions, "Page Total")}
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

        {activeTab === "export" && (
          <>
            <div className="ribbon-section" aria-label="Page Setup">
              {sectionTitle("Page Setup")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconPageTotal size={16} />, "Page Setup", () => {
                    alert("Page Setup allows configuring print layout, margins, and orientation. Use browser print settings for PDF export.");
                  }, false, !allowInteractions, "Page Setup")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Export to PDF">
              {sectionTitle("Export to PDF")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconGrid size={16} />, "Entire Matrix", onExportCSV, false, !allowInteractions || !hasData, "Export entire matrix")}
                {toolbarBtn(<IconColumns size={16} />, "Selected Columns", () => {
                    alert("Select columns by clicking column headers while holding Ctrl, then use Export to CSV.");
                  }, false, !allowInteractions || !hasData, "Export selected columns")}
                {toolbarBtn(<IconPdf size={16} />, "PDF Report", onExportPDF, false, !allowInteractions || !hasData, "Export to PDF")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Export to Excel">
              {sectionTitle("Export to Excel")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconExcel size={16} />, "Export Report", onExportXLSX, false, !allowInteractions || !hasData, "Export to Excel")}
                {toolbarBtn(<IconGrid size={16} />, "Copy to Clipboard", () => {
                    // Copy to clipboard functionality
                    try {
                      const text = "Matrix data - use Export to CSV for full data export";
                      navigator.clipboard.writeText(text);
                      alert("Copied to clipboard! For full data export, use Export to CSV or Excel.");
                    } catch (e) {
                      alert("Use Ctrl+C to copy selected cells, or Export to CSV for full data.");
                    }
                  }, false, !allowInteractions || !hasData, "Copy to Clipboard")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Writeback">
              {sectionTitle("Writeback")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconWriteback size={16} />, "Writeback", () => {
                    alert("Writeback allows saving edits back to the data source. This feature requires writeback permissions to be enabled in Power BI.");
                  }, false, !allowInteractions, "Writeback")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Schedule">
              {sectionTitle("Schedule")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconNew size={16} />, "New Subscription", () => {
                    alert("Subscriptions allow scheduling automatic report delivery via email. Configure in Power BI service settings.");
                  }, false, !allowInteractions, "New Subscription")}
                {toolbarBtn(<IconSchedule size={16} />, "Manage Subscriptions", () => {
                    alert("Manage your report subscriptions in Power BI service. Go to Workspace > Report > Subscribe.");
                  }, false, !allowInteractions, "Manage Subscriptions")}
                {toolbarBtn(<IconSettings size={16} />, "Settings", () => {
                    alert("Configure export and subscription settings in the Format pane under Export options.");
                  }, false, !allowInteractions, "Settings")}
              </div>
            </div>

            {divider()}

            <div className="ribbon-section" aria-label="Backup">
              {sectionTitle("Backup")}
              <div className="ribbon-btn-group">
                {toolbarBtn(<IconConfig size={16} />, "Config", () => {
                    alert("Configuration backup allows saving and restoring visual settings. Use the Format pane to export/import settings.");
                  }, false, !allowInteractions, "Configuration")}
                {toolbarBtn(<IconReuse size={16} />, "Reuse Theme", () => {
                    alert("Reuse Theme allows applying the current theme to other visuals. Copy theme settings from the Format pane.");
                  }, false, !allowInteractions, "Reuse Theme")}
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
