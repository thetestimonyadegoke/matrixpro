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
import { exportToJSON } from "../export/json";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { createQuickCalcView } from "../analytics/quickCalcs";
import { Ribbon, RibbonTab, RowInsertAction, ToolbarMode } from "./Ribbon";
import { ExplorerPanel } from "./ExplorerPanel";
import { CalcMeasureWizard } from "./CalcMeasureWizard";
import { CalcRowWizard } from "./CalcRowWizard";
import { CalcRowPanel } from "./CalcRowPanel";
import { InsertedRow, migrateInsertedRows } from "../settings/settings";
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
import { Footer } from "./Footer";
import { TopNPanel } from "./TopNPanel";
import { FilterPanel, FilterRule } from "./FilterPanel";
import { LevelVisibilityPanel } from "./LevelVisibilityPanel";
import { ThemeGallery } from "./ThemeGallery";
import { HeaderOptionsPanel } from "./HeaderOptionsPanel";
import { TitleBar } from "./TitleBar";
import { getNodeAndDescendantKeys } from "../model/tree";
import { generateCalcRowId } from "../calculations/calculatedRows";

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

type QuickInsertedRowKind = Exclude<RowInsertAction, "panel">;

function createQuickInsertedRow(kind: QuickInsertedRowKind, order: number): InsertedRow {
  const base: {
    id: string;
    name: string;
    enabled: boolean;
    order: number;
    parentRowKey: string | null;
    insertAfterRowKey: string | null;
    insertAtTop: boolean;
  } = {
    id: generateCalcRowId(),
    name:
      kind === "blank" ? "Blank row" :
      kind === "group" ? "New group" :
      kind === "divider" ? "Divider" :
      "New calculated row",
    enabled: true,
    order,
    parentRowKey: null,
    insertAfterRowKey: null,
    insertAtTop: false,
  };

  switch (kind) {
    case "blank":
      return { ...base, kind: "blank", height: 22 };
    case "group":
      return { ...base, kind: "group", label: base.name, style: { bold: true } };
    case "divider":
      return { ...base, kind: "divider", lineStyle: "single", lineColor: "#d1d5db" };
    case "calculated":
    default:
      return {
        ...base,
        kind: "calculated",
        formulaType: "sum",
        rowReferences: [],
        customFormula: "",
        style: { bold: false, italic: false },
        includeInTotals: true,
        isSubtotal: false,
      };
  }
}

export const App: React.FC<AppProps> = ({
  model,
  settings,
  selectionManager,
  tooltipService,
  allowInteractions,
  isHighContrast: _isHighContrast,
  highContrastColors: _highContrastColors,
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
  const [activeTab, setActiveTabOriginal] = useState<RibbonTab>((settings.uiState.activeTab as RibbonTab) || "home");
  const [toolbarMode, setToolbarModeOriginal] = useState<ToolbarMode>((settings.uiState.toolbarMode as ToolbarMode) || "full");
  const [toolbarPinned, setToolbarPinnedOriginal] = useState(settings.uiState.toolbarPinned ?? true);
  const [explorerOpen, setExplorerOpenOriginal] = useState(settings.uiState.explorerOpen ?? false);
  const [zoomLevel, setZoomLevelOriginal] = useState(settings.uiState.zoomLevel ?? 100);

  const setActiveTab = useCallback((tab: RibbonTab | ((prev: RibbonTab) => RibbonTab)) => {
    setActiveTabOriginal(prev => {
      const next = typeof tab === 'function' ? tab(prev) : tab;
      onPersistProperty("uiState", "activeTab", next);
      return next;
    });
  }, [onPersistProperty]);

  const setToolbarMode = useCallback((mode: ToolbarMode | ((prev: ToolbarMode) => ToolbarMode)) => {
    setToolbarModeOriginal(prev => {
      const next = typeof mode === 'function' ? mode(prev) : mode;
      onPersistProperty("uiState", "toolbarMode", next);
      return next;
    });
  }, [onPersistProperty]);

  const setToolbarPinned = useCallback((pinned: boolean | ((prev: boolean) => boolean)) => {
    setToolbarPinnedOriginal(prev => {
      const next = typeof pinned === 'function' ? pinned(prev) : pinned;
      onPersistProperty("uiState", "toolbarPinned", next);
      return next;
    });
  }, [onPersistProperty]);

  const setExplorerOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setExplorerOpenOriginal(prev => {
      const next = typeof open === 'function' ? open(prev) : open;
      onPersistProperty("uiState", "explorerOpen", next);
      return next;
    });
  }, [onPersistProperty]);

  const setZoomLevel = useCallback((level: number | ((prev: number) => number)) => {
    setZoomLevelOriginal(prev => {
      const next = typeof level === 'function' ? level(prev) : level;
      onPersistProperty("uiState", "zoomLevel", next);
      return next;
    });
  }, [onPersistProperty]);

  const [calcMeasureWizardOpen, setCalcMeasureWizardOpen] = useState<string | null>(null);
  const [calcRowWizardOpen, setCalcRowWizardOpen] = useState(false);
  const [editingCalcRow, setEditingCalcRow] = useState<any | null>(null);
  const [calcRowPanelOpen, setCalcRowPanelOpen] = useState(false);
  const [totalsPanelOpen, setTotalsPanelOpen] = useState(false);
  const [manageColumnsPanelOpen, setManageColumnsPanelOpen] = useState(false);
  const [condFormatPanelOpen, setCondFormatPanelOpen] = useState(false);

  // Preconfigured draft rule passed to ConditionalFormattingPanel when the
  // user selects a Quick Conditional Formatting preset from the ribbon.
  // The panel opens on the edit view with this rule populated (not saved yet)
  // so users can review / customize before hitting Apply.
  const [condFormatInitialDraft, setCondFormatInitialDraft] = useState<any | null>(null);
  // Currently-selected column key(s) — used to scope formatting & conditional
  // formatting to a specific column via ribbon actions.
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  // Selected row keys for DIRECT FORMATTING (distinct from Power BI's
  // cross-filter selection state, which uses `selectionState`). Populated
  // when the user clicks a row header while holding nothing / Ctrl / Shift.
  const [selectedRowKeysForFormat, setSelectedRowKeysForFormat] = useState<string[]>([]);

  // New panel states
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [smartAnalysisOpen, setSmartAnalysisOpen] = useState(false);
  const [goalSeekOpen, setGoalSeekOpen] = useState(false);
  const [variablesPanelOpen, setVariablesPanelOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [aggregationOpen, setAggregationOpen] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [topNPanelOpen, setTopNPanelOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [levelPanelOpen, setLevelPanelOpen] = useState(false);
  const [themeGalleryOpen, setThemeGalleryOpen] = useState(false);
  const [headerOptionsOpen, setHeaderOptionsOpen] = useState(false);

  // Undo/redo stacks (snapshots of manualData.edits JSON)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnKey: null,
    measureIndex: 0,
    direction: "none",
  });

  useEffect(() => {
    setActiveTabOriginal((settings.uiState.activeTab as RibbonTab) || "home");
    setToolbarModeOriginal((settings.uiState.toolbarMode as ToolbarMode) || "full");
    setToolbarPinnedOriginal(settings.uiState.toolbarPinned ?? true);
    setZoomLevelOriginal(settings.uiState.zoomLevel ?? 100);
  }, [settings.uiState]);

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

    // Apply value filter rules (hide rows where all cells for a measure fail the criteria)
    try {
      const rules: FilterRule[] = JSON.parse(settings.manualData.filterRules || "[]");
      if (Array.isArray(rules) && rules.length > 0 && model.flattenedColumns.length > 0) {
        const leafCols = model.flattenedColumns.filter(c => c.isLeaf);
        const evalRule = (v: number | null, r: FilterRule): boolean => {
          if (v === null || v === undefined || isNaN(v)) return false;
          switch (r.operator) {
            case "gt": return v > r.value;
            case "gte": return v >= r.value;
            case "lt": return v < r.value;
            case "lte": return v <= r.value;
            case "eq": return v === r.value;
            case "neq": return v !== r.value;
            case "between": return v >= r.value && v <= (r.value2 ?? r.value);
            default: return true;
          }
        };
        rows = rows.filter(row => {
          if (row.isSubtotal || row.isGrandTotal || (row as any).isCalculatedRow) return true;
          // Must pass ALL rules
          return rules.every(rule => {
            // At least one leaf cell for this measure must satisfy
            return leafCols.some(col => {
              const cell = model.cellMap.get(`${row.key}__${col.key}__${rule.measureIndex}`);
              return cell ? evalRule(cell.value, rule) : false;
            });
          });
        });
      }
    } catch { /* ignore parse errors */ }

    // Apply Top N
    try {
      const topNCfg = JSON.parse(settings.manualData.topNConfig || "{}");
      const n: number = topNCfg.topN || 0;
      const mi: number = topNCfg.measureIndex ?? 0;
      const direction: "top" | "bottom" = topNCfg.direction || "top";
      if (n > 0 && model.flattenedColumns.length > 0) {
        const firstLeafCol = model.flattenedColumns.find(c => c.isLeaf);
        if (firstLeafCol) {
          // Only filter at leaf level (where indent matches deepest leafs)
          const dataRows = rows.filter(r => !r.isSubtotal && !r.isGrandTotal && !(r as any).isCalculatedRow);
          const otherRows = rows.filter(r => r.isSubtotal || r.isGrandTotal || (r as any).isCalculatedRow);
          const scored = dataRows.map(row => {
            const cell = model.cellMap.get(`${row.key}__${firstLeafCol.key}__${mi}`);
            return { row, score: cell?.value ?? 0 };
          });
          scored.sort((a, b) => direction === "top" ? (b.score - a.score) : (a.score - b.score));
          const selected = scored.slice(0, n).map(s => s.row);
          const selectedSet = new Set(selected.map(r => r.key));
          rows = rows.filter(r => selectedSet.has(r.key) || otherRows.includes(r));
        }
      }
    } catch { /* ignore parse errors */ }

    // Apply hidden hierarchy levels (hide rows at specified levels)
    try {
      const hidden: number[] = JSON.parse(settings.manualData.hiddenRowLevels || "[]");
      if (Array.isArray(hidden) && hidden.length > 0) {
        const hset = new Set<number>(hidden);
        rows = rows.filter(r => !hset.has(r.level ?? 0));
      }
    } catch { /* ignore */ }

    // Apply individually hidden row keys
    try {
      const hiddenKeys: string[] = JSON.parse(settings.manualData.hiddenRowKeys || "[]");
      if (Array.isArray(hiddenKeys) && hiddenKeys.length > 0) {
        const hset = new Set<string>(hiddenKeys);
        rows = rows.filter(r => !hset.has(r.key));
      }
    } catch { /* ignore */ }

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
          calculatedRowStyle: { bold: true, backgroundColor: "var(--mx-accent-10)", textColor: "var(--mx-cell-fg)" },
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
  }, [
    sortedRows,
    settings.general.invertRows,
    settings.manualData.filterRules,
    settings.manualData.topNConfig,
    settings.manualData.hiddenRowLevels,
    settings.manualData.hiddenRowKeys,
    settings.manualData.groupings,
    model.flattenedColumns,
    model.cellMap,
  ]);

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
            case "avg": newValue = values.reduce((a, b) => a + b, 0) / values.length; break;
            case "min": newValue = Math.min(...values); break;
            case "max": newValue = Math.max(...values); break;
            case "count": newValue = values.length; break;
            case "none": newValue = null; break;
            default: newValue = values.reduce((a, b) => a + b, 0);
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
    _rowKey: string,
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
  }, [allowInteractions, selectionManager, selectionState]);

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
    console.log("MatrixPro: Exporting to CSV...");
    exportToCSV(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportXLSX = useCallback(() => {
    if (!allowInteractions) return;
    console.log("MatrixPro: Exporting to XLSX...");
    exportToXLSX(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportPDF = useCallback(() => {
    if (!allowInteractions) return;
    console.log("MatrixPro: Exporting to PDF...");
    exportToPDF(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const handleExportJSON = useCallback(() => {
    if (!allowInteractions) return;
    console.log("MatrixPro: Exporting to JSON...");
    exportToJSON(displayRows, model.flattenedColumns, quickCalcView.cellMap, quickCalcView.measures, settings);
  }, [displayRows, model.flattenedColumns, quickCalcView, settings, allowInteractions]);

  const openSmartAnalysis = useCallback(() => {
    if (!allowInteractions) return;
    setSmartAnalysisOpen(true);
  }, [allowInteractions]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(200, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(50, prev - 10));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const handleZoomSet = useCallback((level: number) => {
    setZoomLevel(Math.max(50, Math.min(200, level)));
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

  const openCalcMeasureWizard = useCallback((id?: string) => {
    setCalcMeasureWizardOpen(id || "new");
  }, []);

  const closeCalcMeasureWizard = useCallback(() => {
    setCalcMeasureWizardOpen(null);
  }, []);

  const openCalcRowWizard = useCallback(() => {
    setCalcRowWizardOpen(true);
  }, []);

  const closeCalcRowWizard = useCallback(() => {
    setCalcRowWizardOpen(false);
  }, []);


  const closeCalcRowPanel = useCallback(() => {
    setCalcRowPanelOpen(false);
  }, []);

  const handleOpenCalcRowPanel = useCallback((action: RowInsertAction = "panel") => {
    if (action === "panel") {
      setCalcRowPanelOpen(true);
      return;
    }

    const currentRows = migrateInsertedRows(settings.calculations.rows);
    const nextRows = [...currentRows, createQuickInsertedRow(action, currentRows.length)];
    onPersistProperty("calculations", "rows", JSON.stringify(nextRows));
  }, [settings.calculations.rows, onPersistProperty]);

  const handleApplyCalcRows = useCallback((nextRows: InsertedRow[]) => {
    onPersistProperty("calculations", "rows", JSON.stringify(nextRows));
    setCalcRowPanelOpen(false);
  }, [onPersistProperty]);

  const handleSaveCalcMeasure = useCallback((measure: {
    id?: string;
    name: string;
    description: string;
    formula: string;
    format: string;
    aggregation: "afterTotals" | "beforeTotals";
  }) => {
    try {
      const currentMeasures: any[] = JSON.parse(settings.calculations.measures || "[]");
      if (measure.id) {
        const idx = currentMeasures.findIndex(m => m.id === measure.id);
        if (idx !== -1) {
          currentMeasures[idx] = {
            ...currentMeasures[idx],
            name: measure.name,
            description: measure.description,
            formula: measure.formula,
            format: measure.format,
            aggregationMode: measure.aggregation,
          };
        }
      } else {
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
        currentMeasures.push(newMeasure);
      }
      onPersistProperty("calculations", "measures", JSON.stringify(currentMeasures));
      setCalcMeasureWizardOpen(null);
    } catch (e) {
      console.error("Failed to save calculated measure", e);
    }
  }, [settings.calculations.measures, onPersistProperty]);

  const handleDeleteCalcMeasure = useCallback((measureId: string) => {
    try {
      const currentMeasures: any[] = JSON.parse(settings.calculations.measures || "[]");
      const updatedMeasures = currentMeasures.filter((measure: any) => measure.id !== measureId);
      onPersistProperty("calculations", "measures", JSON.stringify(updatedMeasures));
    } catch (e) {
      console.error("Failed to delete calculated measure", e);
    }
  }, [settings.calculations.measures, onPersistProperty]);

  const handleSaveCalcRow = useCallback((row: {
    id?: string;
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

      const rowDef: any = {
        id: row.id || `row_${Date.now()}`,
        name: row.name,
        formulaType: row.formulaType,
        rowReferences: row.sourceRowKeys,
        customFormula: row.customFormula,
        enabled: true,
        placement: row.placement,
        targetRowKey: row.targetRowKey,
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

      let updatedRows = [...currentRows];
      if (row.id) {
        const idx = updatedRows.findIndex(r => r.id === row.id);
        if (idx !== -1) {
          rowDef.order = updatedRows[idx].order;
          updatedRows[idx] = rowDef;
        }
      } else {
        rowDef.order = updatedRows.length;
        updatedRows.push(rowDef);
      }

      onPersistProperty("calculations", "rows", JSON.stringify(updatedRows));
      setCalcRowWizardOpen(false);
      setEditingCalcRow(null);
    } catch (e) {
      console.error("Failed to save calculated row", e);
    }
  }, [settings.calculations.rows, onPersistProperty]);

  const handleDeleteCalcRow = useCallback((rowKey: string) => {
    try {
      const id = rowKey.startsWith("__calcrow__") ? rowKey.replace("__calcrow__", "") : null;
      if (!id) return;

      const currentRows = JSON.parse(settings.calculations.rows || "[]");
      const updatedRows = currentRows.filter((r: any) => r.id !== id);
      onPersistProperty("calculations", "rows", JSON.stringify(updatedRows));
    } catch (e) {
      console.error("Failed to delete calculated row", e);
    }
  }, [settings.calculations.rows, onPersistProperty]);

  const handleEditCalcRow = useCallback((rowKey: string) => {
    const id = rowKey.startsWith("__calcrow__") ? rowKey.replace("__calcrow__", "") : null;
    if (!id) return;

    const currentRows = JSON.parse(settings.calculations.rows || "[]");
    const row = currentRows.find((r: any) => r.id === id);
    if (row) {
      // Map back to wizard format
      const wizardData = {
        id: row.id,
        name: row.name,
        formulaType: row.formulaType,
        sourceRowKeys: row.rowReferences,
        customFormula: row.customFormula,
        placement: row.placement || (row.insertAtTop ? "before" : row.insertAfterRowKey ? "after" : row.parentRowKey ? "child" : "after"),
        targetRowKey: row.targetRowKey || row.insertAfterRowKey || row.parentRowKey || "",
        style: row.isSubtotal ? "sectionHeader" : row.style?.borderBottom === "double" ? "doubleUnderline" : row.style?.borderBottom === "single" ? "underline" : row.style?.bold ? "bold" : "normal"
      };
      setEditingCalcRow(wizardData);
      setCalcRowWizardOpen(true);
    }
  }, [settings.calculations.rows]);

  const handleHideRow = useCallback((rowKey: string) => {
    try {
      const hiddenKeys = JSON.parse(settings.manualData.hiddenRowKeys || "[]") as string[];
      const keysToHide = getNodeAndDescendantKeys(model.rowTree, rowKey);
      const next = new Set(hiddenKeys);

      keysToHide.forEach((key) => {
        if (key && key !== "root") {
          next.add(key);
        }
      });

      if (next.size !== hiddenKeys.length) {
        onPersistProperty("manualData", "hiddenRowKeys", JSON.stringify([...next]));
      }
    } catch (e) {
      console.error("Failed to hide row", e);
    }
  }, [settings.manualData.hiddenRowKeys, onPersistProperty, model.rowTree]);

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
        // Variance formula: [Current] - [Base]
        // Note: Real PREV() support would require more context, so we default to a safe subtraction for now
        formula: `[${targetMeasure.name}] - [${targetMeasure.name}]`, 
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

  /**
   * Merge a direct-format patch into `manualData.colFormats` for every
   * composite column key in `keys`. A key shaped like "<colKey>::m<idx>"
   * scopes the patch to one column+measure pair.
   */
  const applyColumnFormat = useCallback((keys: string[], patch: Record<string, any>) => {
    if (!keys || keys.length === 0) return;
    let current: Record<string, any> = {};
    try { current = JSON.parse(settings.manualData.colFormats || "{}") || {}; } catch { current = {}; }
    for (const k of keys) {
      const prev = current[k] || {};
      current[k] = { ...prev, ...patch };
    }
    onPersistProperty("manualData", "colFormats", JSON.stringify(current));
  }, [onPersistProperty, settings.manualData.colFormats]);

  /**
   * Toggle the `collapsed` field of a calc-row group definition and persist.
   * Called when the user clicks a group row's chevron in the Matrix.
   */
  const handleToggleGroupCollapsed = useCallback((rowDefId: string) => {
    try {
      const rows: any[] = JSON.parse(settings.calculations.rows || "[]");
      const idx = rows.findIndex((r: any) => r.id === rowDefId);
      if (idx < 0) return;
      rows[idx] = { ...rows[idx], collapsed: !rows[idx].collapsed };
      onPersistProperty("calculations", "rows", JSON.stringify(rows));
    } catch { /* ignore parse errors */ }
  }, [settings.calculations.rows, onPersistProperty]);

  /** Mirror of `applyColumnFormat` but for row formats keyed by rowKey. */
  const applyRowFormat = useCallback((rowKeys: string[], patch: Record<string, any>) => {
    if (!rowKeys || rowKeys.length === 0) return;
    let current: Record<string, any> = {};
    try { current = JSON.parse(settings.manualData.rowFormats || "{}") || {}; } catch { current = {}; }
    for (const k of rowKeys) {
      const prev = current[k] || {};
      current[k] = { ...prev, ...patch };
    }
    onPersistProperty("manualData", "rowFormats", JSON.stringify(current));
  }, [onPersistProperty, settings.manualData.rowFormats]);

  const ribbonHeight = settings.appearance.showToolbar
    ? (toolbarMode === "full" ? 86 : toolbarMode === "minimal-tabs" ? 34 : 40)
    : 0;
  const titleBarHeight = settings.title.show ? Math.max(0, settings.title.height || 0) : 0;

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
            onExportPDF={handleExportPDF}
            onExportJSON={handleExportJSON}
            onOpenThemeGallery={() => setThemeGalleryOpen(true)}
            onOpenHeaderFooter={() => setHeaderOptionsOpen(true)}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onOpenSmartAnalysis={openSmartAnalysis}
            onOpenCalcMeasurePanel={openCalcMeasureWizard}
            onOpenCalcRowPanel={handleOpenCalcRowPanel}
            onOpenTotalsPanel={() => setTotalsPanelOpen(true)}
            onOpenManageColumnsPanel={() => setManageColumnsPanelOpen(true)}
            onOpenCondFormatPanel={() => setCondFormatPanelOpen(true)}
            onOpenSortPanel={() => setSortPanelOpen(true)}
            onOpenGoalSeek={() => setGoalSeekOpen(true)}
            onOpenVariables={() => setVariablesPanelOpen(true)}
            onOpenGroupPanel={() => setGroupPanelOpen(true)}
            onOpenAggregation={() => setAggregationOpen(true)}
            onOpenNotesPanel={() => setNotesPanelOpen(true)}
            onOpenTopNPanel={() => setTopNPanelOpen(true)}
            onOpenFilterPanel={() => setFilterPanelOpen(true)}
            onOpenLevelPanel={() => setLevelPanelOpen(true)}
            onAddQuickVariance={() => {}}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            rows={[]}
            colFormatsJson="{}"
          />
        )}
        {settings.title.show && (
          <TitleBar
            settings={settings.title}
            allowInteractions={allowInteractions}
            onPersistProperty={onPersistProperty}
          />
        )}
        <div style={{ height: Math.max(0, height - ribbonHeight - titleBarHeight) }}>
          <EmptyState
            hasRows={model.hasRows}
            hasValues={model.hasValues}
            settings={settings}
            onPersistProperty={onPersistProperty}
          />
        </div>
      </div>
    );
  }
  const simulateBarHeight = settings.general.simulateMode ? 34 : 0;
  const footerHeight = 28;
  const workspaceHeight = Math.max(0, height - ribbonHeight - titleBarHeight - simulateBarHeight - footerHeight);

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
          onExportJSON={handleExportJSON}
          onOpenThemeGallery={() => setThemeGalleryOpen(true)}
          onOpenHeaderFooter={() => setHeaderOptionsOpen(true)}
          onOpenSmartAnalysis={openSmartAnalysis}
          onOpenCalcMeasurePanel={openCalcMeasureWizard}
          onOpenCalcRowPanel={handleOpenCalcRowPanel}
          onOpenTotalsPanel={() => setTotalsPanelOpen(true)}
          onOpenManageColumnsPanel={() => setManageColumnsPanelOpen(true)}
          onOpenCondFormatPanel={() => setCondFormatPanelOpen(true)}
          onOpenCondFormatDraft={(draft: any) => {
            setCondFormatInitialDraft(draft);
            setCondFormatPanelOpen(true);
          }}
          selectedColumnKeys={selectedColumnKeys}
          selectedRowKeys={selectedRowKeysForFormat}
          onApplyColumnFormat={applyColumnFormat}
          onApplyRowFormat={applyRowFormat}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onOpenBulkOperations={() => {
            (window as any).__openBulkOperations?.();
          }}
          onCopyToClipboard={handleCopyToClipboard}
          onOpenSortPanel={() => setSortPanelOpen(true)}
          onOpenGoalSeek={() => setGoalSeekOpen(true)}
          onOpenVariables={() => setVariablesPanelOpen(true)}
          onOpenGroupPanel={() => setGroupPanelOpen(true)}
          onOpenAggregation={() => setAggregationOpen(true)}
          onOpenNotesPanel={() => setNotesPanelOpen(true)}
          onOpenTopNPanel={() => setTopNPanelOpen(true)}
          onOpenFilterPanel={() => setFilterPanelOpen(true)}
          onOpenLevelPanel={() => setLevelPanelOpen(true)}
          onAddQuickVariance={() => handleQuickVariance("", 0)}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          rows={displayRows}
          colFormatsJson={settings.manualData.colFormats}
        />
      )}

      {settings.general.simulateMode && (
        <SimulateBar onExit={() => onPersistProperty("general", "simulateMode", false)} />
      )}

      {settings.title.show && (
        <TitleBar
          settings={settings.title}
          allowInteractions={allowInteractions}
          onPersistProperty={onPersistProperty}
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

        <div
          className="mx-main"
          style={{
            width: matrixWidth,
            height: workspaceHeight,
          }}
        >
          <div
            className="mx-zoom-stage"
            style={{
              width: matrixWidth / zoomFactor,
              height: workspaceHeight / zoomFactor,
              transform: zoomFactor === 1 ? undefined : `scale(${zoomFactor})`,
              transformOrigin: "top left",
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
              selectionManager={selectionManager}
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
                measures: model.measures,
                calculatedMeasures: JSON.parse(settings.calculations.measures || "[]"),
                columns: model.flattenedColumns,
                rows: model.flattenedRows,
                rowHierarchyLevels: model.rowLevelNames,
                columnHierarchyLevels: model.columnLevelNames,
              }}
              selectedColumnKeys={selectedColumnKeys}
              onColumnSelectionChange={setSelectedColumnKeys}
              selectedRowKeysForFormat={selectedRowKeysForFormat}
              onRowSelectionForFormatChange={setSelectedRowKeysForFormat}
              onHideRow={handleHideRow}
              onEditCalcRow={handleEditCalcRow}
              onDeleteCalcRow={handleDeleteCalcRow}
              onToggleGroupCollapsed={handleToggleGroupCollapsed}
            />
          </div>
        </div>
      </div>

      {!settings.appearance.showToolbar && allowInteractions && (
        <button
          className="mx-restore-toolbar-btn"
          onClick={() => onPersistProperty("appearance", "showToolbar", true)}
          title="Restore Toolbar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
          RESTORE TOOLBAR
        </button>
      )}

      <Footer
        rowCount={displayRows.length}
        zoomLevel={zoomLevel}
        toolbarMode={toolbarMode}
        explorerOpen={explorerOpen}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomSet={handleZoomSet}
        onToolbarModeChange={setToolbarMode}
        onToggleExplorer={toggleExplorer}
      />

      <ThemeGallery
        open={themeGalleryOpen}
        currentPreset={settings.theme.preset}
        onClose={() => setThemeGalleryOpen(false)}
        onApply={(preset) => onPersistProperty("theme", "preset", preset)}
      />

      {headerOptionsOpen && (
        <HeaderOptionsPanel
          settings={settings}
          onPersistProperty={onPersistProperty}
          onClose={() => setHeaderOptionsOpen(false)}
        />
      )}

      {calcMeasureWizardOpen && (
        <CalcMeasureWizard
          rows={model.flattenedRows}
          columns={model.flattenedColumns}
          cellMap={model.cellMap}
          measures={model.measures}
          onSave={handleSaveCalcMeasure}
          onClose={closeCalcMeasureWizard}
          initialMeasure={(() => {
            if (calcMeasureWizardOpen === "new") return undefined;
            const parsed = JSON.parse(settings.calculations.measures || "[]");
            return parsed.find((m: any) => m.id === calcMeasureWizardOpen);
          })()}
        />
      )}

      {calcRowWizardOpen && (
        <CalcRowWizard
          rows={displayRows}
          initialData={editingCalcRow}
          onSave={handleSaveCalcRow}
          onClose={() => { closeCalcRowWizard(); setEditingCalcRow(null); }}
          intelliSenseContext={{
            measures: model.measures,
            calculatedMeasures: JSON.parse(settings.calculations.measures || "[]"),
            columns: model.flattenedColumns,
            rows: displayRows,
            rowHierarchyLevels: model.rowLevelNames,
            columnHierarchyLevels: model.columnLevelNames,
          }}
        />
      )}

      {calcRowPanelOpen && (
        <CalcRowPanel
          rows={displayRows}
          settings={settings}
          onClose={closeCalcRowPanel}
          onApply={handleApplyCalcRows}
        />
      )}

      {totalsPanelOpen && (
        <TotalsControlPanel
          settings={settings}
          rowLevels={model.rowLevelNames}
          columnLevels={model.columnLevelNames}
          onPersistProperty={onPersistProperty}
          onClose={() => setTotalsPanelOpen(false)}
        />
      )}

      {manageColumnsPanelOpen && (
        <ManageColumnsPanel
          columns={model.flattenedColumns}
          rows={model.flattenedRows}
          measures={model.measures}
          settings={settings}
          onClose={() => setManageColumnsPanelOpen(false)}
          onPersistProperty={onPersistProperty}
          onOpenCalcMeasureWizard={openCalcMeasureWizard}
          onDeleteCalcMeasure={handleDeleteCalcMeasure}
          onDeleteCalcRow={handleDeleteCalcRow}
        />
      )}

      {/* Floating Restore Ribbon Button (Only shown when toolbar is OFF) */}
      {!settings.appearance.showToolbar && (
        <button
          className="restore-ribbon-fab"
          onClick={() => onPersistProperty("appearance", "showToolbar", true)}
          title="Restore Ribbon Toolbar"
          aria-label="Restore Ribbon"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 15 9 9 15 15 21 9"></polyline>
          </svg>
        </button>
      )}

      {condFormatPanelOpen && (
        <ConditionalFormattingPanel
          settings={settings}
          measures={model.measures}
          onClose={() => {
            setCondFormatPanelOpen(false);
            setCondFormatInitialDraft(null);
          }}
          onPersistProperty={onPersistProperty}
          initialDraft={condFormatInitialDraft}
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

      {topNPanelOpen && (
        <TopNPanel
          measures={quickCalcView.measures}
          settings={settings}
          onClose={() => setTopNPanelOpen(false)}
          onApply={(n, measureIndex, direction) => {
            onPersistProperty(
              "manualData",
              "topNConfig",
              JSON.stringify({ topN: n, measureIndex, direction })
            );
            setTopNPanelOpen(false);
          }}
        />
      )}

      {filterPanelOpen && (
        <FilterPanel
          rows={displayRows}
          measures={quickCalcView.measures}
          settings={settings}
          onClose={() => setFilterPanelOpen(false)}
          onApply={(rules) => {
            onPersistProperty("manualData", "filterRules", JSON.stringify(rules));
            setFilterPanelOpen(false);
          }}
        />
      )}

      {levelPanelOpen && (
        <LevelVisibilityPanel
          rowLevels={model.rowLevelNames}
          colLevels={model.columnLevelNames}
          settings={settings}
          onClose={() => setLevelPanelOpen(false)}
          onPersistProperty={onPersistProperty}
        />
      )}

      {/* Dynamic Style Injection for Resize Handles and Layout Fixes */}
      <style>{`
        .col-resize-handle { position: absolute; right: -3px; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 10; }
        .col-resize-handle:hover { background-color: var(--matrix-primary); opacity: 0.5; }
        .row-header-width-resize-handle { position: absolute; right: -3px; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 10; }
        .row-header-width-resize-handle:hover { background-color: var(--matrix-primary); opacity: 0.5; }
        .merged-header-label { white-space: normal !important; display: block !important; word-break: break-word !important; }
        .merged-header-cell { min-height: 28px; height: auto !important; }
        .merged-header-row { height: auto !important; min-height: 28px; }
      `}</style>
    </div>
  );
};
