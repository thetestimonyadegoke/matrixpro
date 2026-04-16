import React, { useCallback, useEffect, useMemo, useState } from "react";
import powerbi from "powerbi-visuals-api";
import { MatrixModel, CellValue } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { SortConfig, SortDirection, toggleSortDirection, sortFlattenedRows, sortFlattenedRowsMulti } from "../model/sorting";
import { SelectionManagerWrapper, SelectionState, updateSelectionState } from "../powerbi/selection";
import { Matrix } from "./Matrix";
import { EmptyState } from "./EmptyState";
import { exportToCSV } from "../export/csv";
import { exportToXLSX } from "../export/xlsx";
import { exportToPDF } from "../export/pdf";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { createQuickCalcView } from "../analytics/quickCalcs";
import { Ribbon, RibbonTab, ToolbarMode } from "./Ribbon";
import { ExplorerPanel } from "./ExplorerPanel";
import { CalcMeasureWizard } from "./CalcMeasureWizard";
import { CalcRowWizard } from "./CalcRowWizard";
import { TotalsControlPanel } from "./TotalsControlPanel";
import { ManageColumnsPanel } from "./ManageColumnsPanel";
import { ConditionalFormattingPanel } from "./ConditionalFormattingPanel";
import { SortPanel, SortRule } from "./SortPanel";
import { SmartAnalysisPanel } from "./SmartAnalysisPanel";
import { GoalSeekPanel } from "./GoalSeekPanel";
import { VariablesPanel } from "./VariablesPanel";
import { GroupPanel } from "./GroupPanel";
import { AggregationPanel } from "./AggregationPanel";
import { NotesPanel } from "./NotesPanel";
import { SimulateBar } from "./SimulateBar";

export interface AppProps {
  model: MatrixModel;
  settings: VisualSettings;
  selectionManager: SelectionManagerWrapper;
  tooltipService: TooltipServiceWrapper | null;
  allowInteractions: boolean;
  isHighContrast: boolean;
  highContrastColors: {
    foreground: string;
    background: string;
    foregroundSelected: string;
    hyperlink: string;
  };
  width: number;
  height: number;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onToggleRowExpand: (nodeKey: string) => void;
  onToggleColumnExpand: (nodeKey: string) => void;
  onResetRowExpansion: () => void;
  onResetColumnExpansion: () => void;
  onDrillRowToLevel: (level: number) => void;
  onDrillColumnToLevel: (level: number) => void;
  onExpandAllUnder: (nodeKey: string) => void;
  onCollapseAllUnder: (nodeKey: string) => void;
}

export const App: React.FC<AppProps> = ({
  model,
  settings,
  selectionManager,
  tooltipService,
  allowInteractions,
  isHighContrast,
  highContrastColors,
  width,
  height,
  onPersistProperty,
  onToggleRowExpand,
  onToggleColumnExpand,
  onResetRowExpansion,
  onResetColumnExpansion,
  onDrillRowToLevel,
  onDrillColumnToLevel,
  onExpandAllUnder,
  onCollapseAllUnder,
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>("full");
  const [toolbarPinned, setToolbarPinned] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // percentage: 50–200
  const [calcMeasureWizardOpen, setCalcMeasureWizardOpen] = useState(false);
  const [calcRowWizardOpen, setCalcRowWizardOpen] = useState(false);
  const [totalsPanelOpen, setTotalsPanelOpen] = useState(false);
  const [manageColumnsPanelOpen, setManageColumnsPanelOpen] = useState(false);
  const [condFormatPanelOpen, setCondFormatPanelOpen] = useState(false);

  // New panel states
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [smartAnalysisOpen, setSmartAnalysisOpen] = useState(false);
  const [goalSeekOpen, setGoalSeekOpen] = useState(false);
  const [variablesPanelOpen, setVariablesPanelOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [aggregationOpen, setAggregationOpen] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  // Undo/redo stacks (snapshots of manualData.edits JSON)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnKey: null,
    measureIndex: 0,
    direction: "none",
  });

  useEffect(() => {
    setSortConfig((prev) => {
      if (prev.direction === "none" || !prev.columnKey) return prev;

      const hasColumnKey = model.flattenedColumns.some(c => c.key === prev.columnKey);
      const maxMeasure = Math.max(0, model.measures.length - 1);
      const nextMeasureIndex = Math.max(0, Math.min(maxMeasure, prev.measureIndex));

      const next = {
        ...prev,
        columnKey: hasColumnKey ? prev.columnKey : null,
        measureIndex: nextMeasureIndex,
        direction: hasColumnKey ? prev.direction : ("none" as SortDirection),
      };

      if (next.columnKey === prev.columnKey && next.measureIndex === prev.measureIndex && next.direction === prev.direction) {
        return prev;
      }
      return next;
    });
  }, [model.flattenedColumns, model.measures.length]);

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: new Set(),
    lastSelectedId: null,
  });

  const sortedRows = useMemo(() => {
    // Check for multi-column sort rules saved via SortPanel first
    let multiRules: SortConfig[] = [];
    try {
      const parsed = JSON.parse(settings.manualData.sortRules || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Each rule has measureIndex + direction; map to SortConfig using first visible column
        const firstCol = model.flattenedColumns.find(c => c.isLeaf);
        if (firstCol) {
          multiRules = parsed.map((r: { measureIndex: number; direction: "asc" | "desc" }) => ({
            columnKey: firstCol.key,
            measureIndex: r.measureIndex,
            direction: r.direction,
          }));
        }
      }
    } catch { /* ignore parse errors */ }

    if (multiRules.length > 0) {
      return sortFlattenedRowsMulti(model.flattenedRows, model, multiRules);
    }
    if (sortConfig.direction === "none" || !sortConfig.columnKey) {
      return model.flattenedRows;
    }
    return sortFlattenedRows(model.flattenedRows, model, sortConfig);
  }, [model.flattenedRows, model, sortConfig, settings.manualData.sortRules, model.flattenedColumns]);

  const displayRows = useMemo(() => {
    let rows = settings.general.invertRows ? [...sortedRows].reverse() : sortedRows;

    // Inject group header rows from settings.manualData.groupings
    type GroupDef = { id: string; label: string; rowKeys: string[] };
    let groupings: GroupDef[] = [];
    try {
      const parsed = JSON.parse(settings.manualData.groupings || "[]");
      if (Array.isArray(parsed)) groupings = parsed;
    } catch { /* ignore */ }

    if (groupings.length > 0) {
      const result: typeof rows = [];
      const handled = new Set<string>();
      for (const group of groupings) {
        const keySet = new Set(group.rowKeys);
        // Insert synthetic group header before first member
        const firstIdx = rows.findIndex(r => keySet.has(r.key));
        if (firstIdx === -1) continue;
        // Add rows before this group that haven't been placed yet
        for (let i = 0; i < firstIdx; i++) {
          if (!handled.has(rows[i].key)) { result.push(rows[i]); handled.add(rows[i].key); }
        }
        // Group header synthetic node
        result.push({
          key: `__group__${group.id}`,
          label: group.label,
          value: group.label,
          level: 0,
          path: [],
          children: [],
          isExpanded: false,
          isLeaf: true,
          isSubtotal: false,
          isGrandTotal: false,
          indent: 0,
          hasChildren: false,
          visibleIndex: result.length,
          isCalculatedRow: true,
          calculatedRowStyle: { bold: true, backgroundColor: "rgba(0,0,0,0.04)" },
        });
        // Then the group members
        for (const row of rows) {
          if (keySet.has(row.key) && !handled.has(row.key)) {
            result.push(row);
            handled.add(row.key);
          }
        }
      }
      // Remaining ungrouped rows
      for (const row of rows) {
        if (!handled.has(row.key)) result.push(row);
      }
      rows = result;
    }

    return rows;
  }, [sortedRows, settings.general.invertRows, settings.manualData.groupings]);

  // Parse aggregation overrides once: Record<measureIndex, "sum"|"avg"|"min"|"max"|"count"|"none">
  const aggregationOverrides = useMemo((): Record<number, string> => {
    try {
      const raw = JSON.parse(settings.manualData.aggregationOverrides || "{}");
      // Keys are stored as string measureIndex
      const result: Record<number, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        const idx = parseInt(k, 10);
        if (!isNaN(idx) && typeof v === "string") result[idx] = v;
      }
      return result;
    } catch { return {}; }
  }, [settings.manualData.aggregationOverrides]);

  const quickCalcView = useMemo(() => {
    const base = createQuickCalcView(
      displayRows,
      model.flattenedColumns,
      model.cellMap,
      model.measures,
      settings.quickCalcs
    );

    // Apply aggregation overrides to total/subtotal cells
    if (Object.keys(aggregationOverrides).length === 0) return base;

    const patchedCellMap = new Map<string, CellValue>();
    for (const v of base.cellMap.values()) {
      const key = `${v.rowKey}__${v.colKey}__${v.measureIndex}`;
      patchedCellMap.set(key, v);
    }
    const leafRows = displayRows.filter(r => !r.isSubtotal && !r.isGrandTotal && !r.key.startsWith("__group__"));
    const totalRows = displayRows.filter(r => r.isSubtotal || r.isGrandTotal);

    for (const totalRow of totalRows) {
      for (const col of model.flattenedColumns) {
        for (const measure of base.measures) {
          const override = aggregationOverrides[measure.index];
          if (!override || override === "sum") continue; // sum is the default

          // Collect leaf values for this column+measure
          const values: number[] = [];
          for (const leafRow of leafRows) {
            const key = `${leafRow.key}__${col.key}__${measure.index}`;
            const cell = base.cellMap.get(key);
            if (cell && cell.value !== null) values.push(cell.value);
          }
          if (values.length === 0) continue;

          let newValue: number | null = null;
          switch (override) {
            case "avg":   newValue = values.reduce((a, b) => a + b, 0) / values.length; break;
            case "min":   newValue = Math.min(...values); break;
            case "max":   newValue = Math.max(...values); break;
            case "count": newValue = values.length; break;
            case "none":  newValue = null; break;
            default:      newValue = values.reduce((a, b) => a + b, 0);
          }

          const cellKey = `${totalRow.key}__${col.key}__${measure.index}`;
          const existing = base.cellMap.get(cellKey);
          patchedCellMap.set(cellKey, {
            ...(existing ?? { measureIndex: measure.index, rowKey: totalRow.key, colKey: col.key }),
            value: newValue,
            formattedValue: newValue !== null ? String(Math.round(newValue * 100) / 100) : "",
          });
        }
      }
    }

    return { ...base, cellMap: patchedCellMap as unknown as import("../analytics/quickCalcs").CellMapLike };
  }, [displayRows, model.flattenedColumns, model.cellMap, model.measures, settings.quickCalcs, aggregationOverrides]);

  const handleSort = useCallback((columnKey: string, measureIndex: number) => {
    if (!allowInteractions) return;
    setSortConfig(prev => {
      if (prev.columnKey === columnKey && prev.measureIndex === measureIndex) {
        const newDirection = toggleSortDirection(prev.direction);
        return { columnKey, measureIndex, direction: newDirection };
      }
      return { columnKey, measureIndex, direction: "asc" as SortDirection };
    });
  }, [allowInteractions]);

  const handleRowSelect = useCallback(async (
    rowKey: string,
    selectionId: powerbi.visuals.ISelectionId | undefined,
    multiSelect: boolean
  ) => {
    if (!allowInteractions) return;
    if (!selectionId) return;

    try {
      const selectedIds = await selectionManager.select(selectionId, multiSelect);
      setSelectionState(updateSelectionState(selectionState, selectedIds));
    } catch (error) {
      console.error("Selection error:", error);
    }
  }, [selectionManager, selectionState]);

  const handleClearSelection = useCallback(async () => {
    if (!allowInteractions) return;
    await selectionManager.clear();
    setSelectionState({
      selectedIds: new Set(),
      lastSelectedId: null,
    });
  }, [selectionManager, allowInteractions]);

  const handleExpandAllUnder = useCallback((nodeKey: string) => {
    onExpandAllUnder(nodeKey);
  }, [onExpandAllUnder]);

  const handleCollapseAllUnder = useCallback((nodeKey: string) => {
    onCollapseAllUnder(nodeKey);
  }, [onCollapseAllUnder]);

  const handleExportCSV = useCallback(() => {
    if (!allowInteractions) return;
    exportToCSV(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportXLSX = useCallback(() => {
    if (!allowInteractions) return;
    exportToXLSX(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportPDF = useCallback(() => {
    if (!allowInteractions) return;
    exportToPDF(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(200, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(50, prev - 10));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Zoom is applied as a CSS transform on the matrix container (safer than
  // scaling settings, which would invalidate virtualization math and caches).
  const zoomFactor = zoomLevel / 100;

  const toggleExplorer = useCallback(() => {
    setExplorerOpen((prev) => !prev);
  }, []);

  const closeExplorer = useCallback(() => {
    setExplorerOpen(false);
  }, []);

  const openCalcMeasureWizard = useCallback(() => {
    setCalcMeasureWizardOpen(true);
  }, []);

  const closeCalcMeasureWizard = useCallback(() => {
    setCalcMeasureWizardOpen(false);
  }, []);

  const openCalcRowWizard = useCallback(() => {
    setCalcRowWizardOpen(true);
  }, []);

  const closeCalcRowWizard = useCallback(() => {
    setCalcRowWizardOpen(false);
  }, []);

  const handleSaveCalcMeasure = useCallback((measure: {
    name: string;
    description: string;
    formula: string;
    format: string;
    aggregation: "afterTotals" | "beforeTotals";
  }) => {
    try {
      const currentMeasures = JSON.parse(settings.calculations.measures || "[]");
      const newMeasure = {
        id: `cm_${Date.now()}`,
        name: measure.name,
        description: measure.description,
        formula: measure.formula,
        format: measure.format,
        aggregationMode: measure.aggregation,
        enabled: true,
        order: currentMeasures.length,
      };
      const updatedMeasures = [...currentMeasures, newMeasure];
      onPersistProperty("calculations", "measures", JSON.stringify(updatedMeasures));
      setCalcMeasureWizardOpen(false);
    } catch (e) {
      console.error("Failed to save calculated measure", e);
    }
  }, [settings.calculations.measures, onPersistProperty]);

  const handleSaveCalcRow = useCallback((row: {
    name: string;
    formulaType: "sum" | "subtract" | "custom";
    sourceRowKeys: string[];
    customFormula: string;
    placement: "before" | "after" | "child";
    targetRowKey: string;
    style: "normal" | "bold" | "underline" | "doubleUnderline" | "sectionHeader";
  }) => {
    try {
      const currentRows = JSON.parse(settings.calculations.rows || "[]");

      const newRow: any = {
        id: `row_${Date.now()}`,
        name: row.name,
        formulaType: row.formulaType,
        rowReferences: row.sourceRowKeys,
        customFormula: row.customFormula,
        enabled: true,
        order: currentRows.length,
        style: {
          bold: row.style === "bold" || row.style === "sectionHeader",
          italic: false,
          backgroundColor: row.style === "sectionHeader" ? "rgba(0,0,0,0.05)" : "",
          textColor: "",
          borderTop: "none",
          borderBottom: row.style === "underline" ? "single" : row.style === "doubleUnderline" ? "double" : "none",
          indentOverride: null,
        },
        includeInTotals: true,
        isSubtotal: row.style === "sectionHeader",
        parentRowKey: row.placement === "child" ? row.targetRowKey : null,
        insertAfterRowKey: row.placement === "after" ? row.targetRowKey : null,
        insertAtTop: row.placement === "before" && !row.targetRowKey,
      };

      const updatedRows = [...currentRows, newRow];
      onPersistProperty("calculations", "rows", JSON.stringify(updatedRows));
      setCalcRowWizardOpen(false);
    } catch (e) {
      console.error("Failed to save calculated row", e);
    }
  }, [settings.calculations.rows, onPersistProperty]);

  const handleQuickVariance = useCallback((columnKey: string, measureIndex: number) => {
    try {
      const targetMeasure = model.measures[measureIndex];
      if (!targetMeasure) return;

      const currentMeasures = JSON.parse(settings.calculations.measures || "[]");
      const name = `Var vs Prev (${targetMeasure.name})`;

      // Simple formula for demo: Actual - Prev (assuming Prev is available or just using a placeholder)
      // Real implementation would look up the previous period in the pivot model.
      const newMeasure = {
        id: `var_${Date.now()}`,
        name,
        description: `Variance for ${targetMeasure.name}`,
        formula: `[${targetMeasure.name}] - PREV([${targetMeasure.name}])`,
        format: targetMeasure.format || "#,0.00",
        aggregationMode: "aggregate-then-calc",
        enabled: true,
        order: currentMeasures.length,
      };

      onPersistProperty("calculations", "measures", JSON.stringify([...currentMeasures, newMeasure]));
    } catch (e) {
      console.error("Failed to add quick variance", e);
    }
  }, [model.measures, settings.calculations.measures, onPersistProperty]);

  // Copy matrix data to clipboard as TSV
  const handleCopyToClipboard = useCallback(() => {
    if (!allowInteractions) return;
    try {
      const measures = quickCalcView.measures;
      const header = ["Row", ...measures.map(m => m.name)].join("\t");
      const dataRows = displayRows.map(row => {
        const cells = measures.map(m => {
          // Try to get a representative cell value (using first column or flat key)
          let val = "";
          model.flattenedColumns.forEach(col => {
            const key = `${row.key}__${col.key}__${m.index}`;
            const cell = quickCalcView.cellMap.get(key);
            if (cell && cell.formattedValue) val = cell.formattedValue;
          });
          if (!val) {
            const key = `${row.key}____${m.index}`;
            const cell = quickCalcView.cellMap.get(key);
            if (cell) val = cell.formattedValue || String(cell.value ?? "");
          }
          return val;
        });
        const indent = "  ".repeat(row.indent || 0);
        return [indent + (row.label || row.key), ...cells].join("\t");
      });
      const tsv = [header, ...dataRows].join("\n");
      navigator.clipboard.writeText(tsv).catch(() => {
        console.warn("Clipboard write failed");
      });
    } catch (e) {
      console.error("Copy to clipboard failed", e);
    }
  }, [allowInteractions, displayRows, quickCalcView, model.flattenedColumns]);

  // Sort panel apply
  const handleSortApply = useCallback((rules: SortRule[]) => {
    onPersistProperty("manualData", "sortRules", JSON.stringify(rules));
    setSortPanelOpen(false);
    // Apply the first rule to local sortConfig
    if (rules.length > 0) {
      const firstRule = rules[0];
      const firstCol = model.flattenedColumns[0];
      if (firstCol) {
        setSortConfig({
          columnKey: firstCol.key,
          measureIndex: firstRule.measureIndex,
          direction: firstRule.direction,
        });
      }
    } else {
      setSortConfig({ columnKey: null, measureIndex: 0, direction: "none" });
    }
  }, [onPersistProperty, model.flattenedColumns]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = settings.manualData.edits;
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, current]);
    onPersistProperty("manualData", "edits", prev);
  }, [undoStack, settings.manualData.edits, onPersistProperty]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = settings.manualData.edits;
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, current]);
    onPersistProperty("manualData", "edits", next);
  }, [redoStack, settings.manualData.edits, onPersistProperty]);

  // Track edits for undo
  const handlePersistPropertyWithUndo = useCallback((objectName: string, propertyName: string, value: unknown) => {
    if (objectName === "manualData" && propertyName === "edits") {
      setUndoStack(s => [...s, settings.manualData.edits]);
      setRedoStack([]);
    }
    onPersistProperty(objectName, propertyName, value);
  }, [onPersistProperty, settings.manualData.edits]);

  if (!model.hasData) {
    return (
      <div className="advanced-matrix-visual" style={{ width, height }}>
        {settings.appearance.showToolbar && (
          <Ribbon
            settings={settings}
            allowInteractions={allowInteractions}
            hasData={model.hasData}
            hasValues={model.hasValues}
            activeTab={activeTab}
            toolbarMode={toolbarMode}
            toolbarPinned={toolbarPinned}
            explorerOpen={explorerOpen}
            zoomLevel={zoomLevel}
            onChangeTab={setActiveTab}
            onToolbarModeChange={setToolbarMode}
            onToolbarPinChange={setToolbarPinned}
            onToggleExplorer={toggleExplorer}
            onPersistProperty={onPersistProperty}
            onExportCSV={handleExportCSV}
            onExportXLSX={handleExportXLSX}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
          />
        )}
        <EmptyState
          hasRows={model.hasRows}
          hasValues={model.hasValues}
          settings={settings}
          onPersistProperty={onPersistProperty}
        />
      </div>
    );
  }

  const ribbonHeight = settings.appearance.showToolbar ? 86 : 0;
  const simulateBarHeight = settings.general.simulateMode ? 34 : 0;
  const workspaceHeight = Math.max(0, height - ribbonHeight - simulateBarHeight);

  const explorerWidth = explorerOpen ? 280 : 0;
  const matrixWidth = Math.max(0, width - explorerWidth);

  return (
    <div
      className={`advanced-matrix-visual ${settings.general.showGridlines ? "show-gridlines" : ""} theme-${settings.theme.preset}`}
      style={{
        width,
        height,
        position: 'relative',
        // @ts-ignore
        "--mx-font-family": settings.general.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      }}
    >
      {settings.appearance.showToolbar && (
        <Ribbon
          settings={settings}
          allowInteractions={allowInteractions}
          hasData={model.hasData}
          hasValues={model.hasValues}
          activeTab={activeTab}
          toolbarMode={toolbarMode}
          toolbarPinned={toolbarPinned}
          explorerOpen={explorerOpen}
          zoomLevel={zoomLevel}
          onChangeTab={setActiveTab}
          onToolbarModeChange={setToolbarMode}
          onToolbarPinChange={setToolbarPinned}
          onToggleExplorer={toggleExplorer}
          onPersistProperty={onPersistProperty}
          onExportCSV={handleExportCSV}
          onExportXLSX={handleExportXLSX}
          onExportPDF={handleExportPDF}
          onOpenCalcMeasurePanel={openCalcMeasureWizard}
          onOpenCalcRowPanel={openCalcRowWizard}
          onOpenTotalsPanel={() => setTotalsPanelOpen(true)}
          onOpenManageColumnsPanel={() => setManageColumnsPanelOpen(true)}
          onOpenCondFormatPanel={() => setCondFormatPanelOpen(true)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onOpenBulkOperations={() => {
            (window as any).__openBulkOperations?.();
          }}
          onCopyToClipboard={handleCopyToClipboard}
          onOpenSortPanel={() => setSortPanelOpen(true)}
          onOpenSmartAnalysis={() => setSmartAnalysisOpen(true)}
          onOpenGoalSeek={() => setGoalSeekOpen(true)}
          onOpenVariables={() => setVariablesPanelOpen(true)}
          onOpenGroupPanel={() => setGroupPanelOpen(true)}
          onOpenAggregation={() => setAggregationOpen(true)}
          onOpenNotesPanel={() => setNotesPanelOpen(true)}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          rows={displayRows}
        />
      )}

      {settings.general.simulateMode && (
        <SimulateBar onExit={() => onPersistProperty("general", "simulateMode", false)} />
      )}

      <div className="mx-workspace animate-in" style={{ height: workspaceHeight }}>
        {explorerOpen && (
          <ExplorerPanel
            model={model}
            width={explorerWidth}
            allowInteractions={allowInteractions}
            onClose={closeExplorer}
            onToggleRowExpand={onToggleRowExpand}
            onToggleColumnExpand={onToggleColumnExpand}
            onResetRowExpansion={onResetRowExpansion}
            onResetColumnExpansion={onResetColumnExpansion}
            onDrillRowToLevel={onDrillRowToLevel}
            onDrillColumnToLevel={onDrillColumnToLevel}
          />
        )}

        <div
          className="mx-main"
          style={{
            width: matrixWidth / zoomFactor,
            height: workspaceHeight / zoomFactor,
            transform: zoomFactor === 1 ? undefined : `scale(${zoomFactor})`,
            transformOrigin: 'top left',
          }}
        >
          <Matrix
            rows={displayRows}
            columns={model.flattenedColumns}
            cellMap={quickCalcView.cellMap}
            measures={quickCalcView.measures}
            settings={settings}
            tooltipService={tooltipService}
            allowInteractions={allowInteractions}
            width={matrixWidth / zoomFactor}
            height={workspaceHeight / zoomFactor}
            sortConfig={sortConfig}
            selectionState={selectionState}
            sparklineMeasureIndex={model.sparklineMeasureIndex}
            onSort={handleSort}
            onToggleRowExpand={onToggleRowExpand}
            onToggleColumnExpand={onToggleColumnExpand}
            onExpandAllUnder={handleExpandAllUnder}
            onCollapseAllUnder={handleCollapseAllUnder}
            onRowSelect={handleRowSelect}
            onClearSelection={handleClearSelection}
            onPersistProperty={handlePersistPropertyWithUndo}
            onOpenCalcMeasureWizard={openCalcMeasureWizard}
            onOpenCalcRowWizard={openCalcRowWizard}
            onOpenBulkOperations={() => {
              // Call the global function set up by Matrix
              (window as any).__openBulkOperations?.();
            }}
            onAddQuickVariance={handleQuickVariance}
            intelliSenseContext={{
              calculatedMeasures: JSON.parse(settings.calculations.measures || "[]"),
              rowHierarchyLevels: model.flattenedRows.length > 0 ? (model.flattenedRows[0] as any).hierarchyLevels || [] : [],
              columnHierarchyLevels: model.flattenedColumns.length > 0 ? (model.flattenedColumns[0] as any).hierarchyLevels || [] : [],
            }}
          />
        </div>
      </div>
      {calcMeasureWizardOpen && (
        <CalcMeasureWizard
          measures={model.measures}
          onSave={handleSaveCalcMeasure}
          onClose={closeCalcMeasureWizard}
        />
      )}

      {calcRowWizardOpen && (
        <CalcRowWizard
          rows={displayRows}
          onSave={handleSaveCalcRow}
          onClose={closeCalcRowWizard}
        />
      )}

      {totalsPanelOpen && (
        <TotalsControlPanel
          settings={settings}
          rowLevels={model.flattenedRows.length > 0 ? (model.flattenedRows[0] as any).hierarchyLevels || [] : []}
          columnLevels={model.flattenedColumns.length > 0 ? (model.flattenedColumns[0] as any).hierarchyLevels || [] : []}
          onPersistProperty={onPersistProperty}
          onClose={() => setTotalsPanelOpen(false)}
        />
      )}

      {manageColumnsPanelOpen && (
        <ManageColumnsPanel
          columns={model.flattenedColumns}
          measures={model.measures}
          settings={settings}
          onClose={() => setManageColumnsPanelOpen(false)}
          onPersistProperty={onPersistProperty}
          onOpenCalcMeasureWizard={openCalcMeasureWizard}
        />
      )}

      {condFormatPanelOpen && (
        <ConditionalFormattingPanel
          settings={settings}
          measures={model.measures}
          onClose={() => setCondFormatPanelOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}

      {sortPanelOpen && (
        <SortPanel
          measures={quickCalcView.measures}
          settings={settings}
          onClose={() => setSortPanelOpen(false)}
          onApply={handleSortApply}
        />
      )}

      {smartAnalysisOpen && (
        <SmartAnalysisPanel
          rows={displayRows}
          columns={model.flattenedColumns}
          cellMap={quickCalcView.cellMap}
          measures={quickCalcView.measures}
          onClose={() => setSmartAnalysisOpen(false)}
        />
      )}

      {goalSeekOpen && (
        <GoalSeekPanel
          measures={quickCalcView.measures}
          rows={displayRows}
          columns={model.flattenedColumns}
          cellMap={quickCalcView.cellMap}
          onClose={() => setGoalSeekOpen(false)}
          onApply={(targetMeasureIndex, targetValue, variableMeasureIndex) => {
            console.log("Goal Seek applied:", { targetMeasureIndex, targetValue, variableMeasureIndex });
            setGoalSeekOpen(false);
          }}
        />
      )}

      {variablesPanelOpen && (
        <VariablesPanel
          settings={settings}
          onClose={() => setVariablesPanelOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}

      {groupPanelOpen && (
        <GroupPanel
          rows={displayRows}
          settings={settings}
          onClose={() => setGroupPanelOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}

      {aggregationOpen && (
        <AggregationPanel
          measures={quickCalcView.measures}
          settings={settings}
          onClose={() => setAggregationOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}

      {notesPanelOpen && (
        <NotesPanel
          settings={settings}
          rows={displayRows}
          onClose={() => setNotesPanelOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}
    </div>
  );
};
