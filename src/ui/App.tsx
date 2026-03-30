import React, { useCallback, useEffect, useMemo, useState } from "react";
import powerbi from "powerbi-visuals-api";
import { MatrixModel } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { SortConfig, SortDirection, toggleSortDirection, sortFlattenedRows } from "../model/sorting";
import { SelectionManagerWrapper, SelectionState, updateSelectionState } from "../powerbi/selection";
import { Matrix } from "./Matrix";
import { EmptyState } from "./EmptyState";
import { exportToCSV } from "../export/csv";
import { exportToXLSX } from "../export/xlsx";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { createQuickCalcView } from "../analytics/quickCalcs";
import { Ribbon, RibbonTab, ToolbarMode } from "./Ribbon";
import { ExplorerPanel } from "./ExplorerPanel";
import { CalcMeasureWizard } from "./CalcMeasureWizard";
import { CalcRowWizard } from "./CalcRowWizard";

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
  const [calcMeasureWizardOpen, setCalcMeasureWizardOpen] = useState(false);
  const [calcRowWizardOpen, setCalcRowWizardOpen] = useState(false);

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
    if (sortConfig.direction === "none" || !sortConfig.columnKey) {
      return model.flattenedRows;
    }
    return sortFlattenedRows(model.flattenedRows, model, sortConfig);
  }, [model.flattenedRows, model, sortConfig]);

  const quickCalcView = useMemo(() => {
    return createQuickCalcView(
      sortedRows,
      model.flattenedColumns,
      model.cellMap,
      model.measures,
      settings.quickCalcs
    );
  }, [sortedRows, model.flattenedColumns, model.cellMap, model.measures, settings.quickCalcs]);

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
    exportToCSV(sortedRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [sortedRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportXLSX = useCallback(() => {
    if (!allowInteractions) return;
    exportToXLSX(sortedRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [sortedRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportPDF = useCallback(() => {
    if (!allowInteractions) return;
    alert("Export to PDF is not yet implemented. Use browser print functionality for now.");
    // In a real implementation, you would use a library like jsPDF or trigger a browser print.
    // window.print();
  }, [allowInteractions]);

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
        ...measure,
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
            onChangeTab={setActiveTab}
            onToolbarModeChange={setToolbarMode}
            onToolbarPinChange={setToolbarPinned}
            onToggleExplorer={toggleExplorer}
            onPersistProperty={onPersistProperty}
            onExportCSV={handleExportCSV}
            onExportXLSX={handleExportXLSX}
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
  const workspaceHeight = Math.max(0, height - ribbonHeight);

  const explorerWidth = explorerOpen ? 280 : 0;
  const matrixWidth = Math.max(0, width - explorerWidth);

  return (
    <div
      className={`advanced-matrix-visual ${settings.general.showGridlines ? "show-gridlines" : ""} theme-${settings.theme.preset}`}
      style={{ 
        width, 
        height,
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
          onOpenBulkOperations={() => {
            // Trigger the matrix to open bulk operations via global
            (window as any).__openBulkOperations?.();
          }}
        />
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

        <div className="mx-main" style={{ width: matrixWidth }}>
          <Matrix
            rows={sortedRows}
            columns={model.flattenedColumns}
            cellMap={quickCalcView.cellMap}
            measures={quickCalcView.measures}
            settings={settings}
            tooltipService={tooltipService}
            allowInteractions={allowInteractions}
            width={matrixWidth}
            height={workspaceHeight}
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
            onPersistProperty={onPersistProperty}
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
          rows={sortedRows}
          onSave={handleSaveCalcRow}
          onClose={closeCalcRowWizard}
        />
      )}
    </div>
  );
};
