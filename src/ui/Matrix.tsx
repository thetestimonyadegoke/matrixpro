import React, { useCallback, useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import powerbi from "powerbi-visuals-api";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue } from "../model/pivot";
import { VisualSettings, defaultSettings } from "../settings/settings";
import { SortConfig } from "../model/sorting";
import { SelectionState, SelectionManagerWrapper } from "../powerbi/selection";
import {
  ViewportRange,
  ViewportConfig,
  createColumnWidthMap,
  setColumnWidth,
  getTotalWidthWithVariableWidths,
  computeVisibleRangeWithVariableWidths,
  getColumnWidth,
  getColumnOffsetWithVariableWidths,
} from "../virtualization/viewport";
import { ScrollManager } from "../virtualization/scroll";
import { Row } from "./Row";
import { RowHeader } from "./RowHeader";
import { MatrixSearch, SearchResult, createGridSearchTarget, useSearchShortcut } from "./matrixSearch";
import { MergedColumnHeaders, ColumnArrangement, buildMergedHeaders } from "./MergedColumnHeaders";
import { createCellStyleEvaluator, computeAllGlobalStats } from "../format/cellStyleEvaluator";
import { parseColFormats, parseRowFormats } from "../format/directFormats";
import { getRowStyle } from "../format/styles";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { ContextMenu, ContextMenuItem, buildCellMenuItems, buildRowHeaderMenuItems, buildColumnHeaderMenuItems } from "./ContextMenu";
import { FormulaBar, FormulaBarRef } from "./FormulaBar";
import { BulkOperationsPanel, BulkOperationType } from "./BulkOperationsPanel";
import { generateCellLabel, formatCellReferenceForFormula } from "../utils/cellNaming";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";
import { generateRowKey } from "../model/keys";
import { GridColumn, buildGridColumns, parseVisualColumnRules } from "../model/gridColumns";
import {
  LevelAwareFieldConfig,
  getLevelAwareConfig,
  serializeLevelAwareColumns,
  upsertFieldConfig,
} from "../model/levelAwareColumns";

export interface MatrixProps {
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  cellMap: { get: (key: string) => CellValue | undefined; values: () => IterableIterator<CellValue> };
  measures: MeasureInfo[];
  settings: VisualSettings;
  tooltipService: TooltipServiceWrapper | null;
  allowInteractions: boolean;
  width: number;
  height: number;
  sortConfig: SortConfig;
  selectionState: SelectionState;
  selectionManager?: SelectionManagerWrapper;
  sparklineMeasureIndex: number;
  onSort: (columnKey: string, measureIndex: number) => void;
  onToggleRowExpand: (nodeKey: string) => void;
  onToggleColumnExpand: (nodeKey: string) => void;
  onExpandAllUnder?: (nodeKey: string) => void;
  onCollapseAllUnder?: (nodeKey: string) => void;
  onRowSelect: (rowKey: string, selectionId: powerbi.visuals.ISelectionId | undefined, multiSelect: boolean) => void;
  onClearSelection: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onOpenCalcMeasureWizard?: () => void;
  onOpenCalcRowWizard?: (targetRowKey?: string) => void;
  onAddQuickVariance?: (columnKey: string, measureIndex: number) => void;
  onOpenBulkOperations?: () => void;
  intelliSenseContext?: IntelliSenseContext;
  selectedColumnKeys?: string[];
  selectedRowKeysForFormat?: string[];
  onRowSelectionForFormatChange?: (keys: string[]) => void;
  onToggleGroupCollapsed?: (rowDefId: string) => void;
  onColumnSelectionChange?: (keys: string[]) => void;
  onHideRow?: (rowKey: string) => void;
  onHideColumns?: (keys: string[]) => void;
  onSetSortDirection?: (columnKey: string, measureIndex: number, direction: "asc" | "desc" | "none") => void;
  onEditCalcRow?: (rowKey: string) => void;
  onDeleteCalcRow?: (rowKey: string) => void;
  /** Column hierarchy field names (e.g. ["Year", "Month"]) for labelling header corner cells. */
  columnLevelNames?: string[];
  /** Incremented by the host (e.g. the Ribbon's Find button) to open the Find panel. */
  findRequest?: number;
}

const ROW_BUFFER = 10;
const COL_BUFFER = 2;

function getManualParentKey(row: FlattenedNode | undefined): string {
  if (!row) return "root";
  if (row.parentKey) return row.parentKey;
  const keyPath = row.keyPath || row.path;
  if (!keyPath || keyPath.length <= 1) return "root";
  return generateRowKey(keyPath.slice(0, -1) as (string | number)[]);
}

export const Matrix: React.FC<MatrixProps> = ({
  rows,
  columns,
  cellMap,
  measures,
  settings,
  tooltipService,
  allowInteractions,
  width,
  height,
  sortConfig,
  selectionState,
  selectionManager,
  sparklineMeasureIndex,
  onSort,
  onToggleRowExpand,
  onToggleColumnExpand: _onToggleColumnExpand,
  onExpandAllUnder,
  onCollapseAllUnder,
  onRowSelect,
  onClearSelection,
  onPersistProperty,
  onOpenCalcMeasureWizard,
  onOpenCalcRowWizard,
  onAddQuickVariance,
  onOpenBulkOperations,
  intelliSenseContext,
  selectedColumnKeys: selectedColumnKeysArr,
  selectedRowKeysForFormat: selectedRowKeysForFormatArr,
  onRowSelectionForFormatChange,
  onToggleGroupCollapsed: _onToggleGroupCollapsed,
  onColumnSelectionChange,
  onHideRow,
  onHideColumns,
  onSetSortDirection,
  onEditCalcRow,
  onDeleteCalcRow,
  columnLevelNames,
  findRequest,
}) => {
  const toAlphaColor = useCallback((color: string | undefined, alpha: number, fallback: string) => {
    const value = (color || "").trim();
    if (!value) return fallback;
    if (value.startsWith("#")) {
      const hex = value.slice(1);
      const normalized = hex.length === 3
        ? hex.split("").map(ch => ch + ch).join("")
        : hex.length === 6
          ? hex
          : "";
      if (normalized.length === 6) {
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    if (value.startsWith("rgb(")) {
      return value.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    }
    if (value.startsWith("rgba(")) return value;
    return value;
  }, []);

  const labelOverrides = useMemo(() => {
    try {
      return JSON.parse(settings.manualData.labelOverrides || "{}") as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [settings.manualData.labelOverrides]);


  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const rowHeadersRef = useRef<HTMLDivElement>(null);
  const rowHeadersInnerRef = useRef<HTMLDivElement>(null);

  const formulaBarRef = useRef<FormulaBarRef>(null);



  // Which element last moved the horizontal position. The body and the companion scrollbar mirror
  // each other; without this, the lagging echo of one write overrides the other mid-animation
  // (a click on the scrollbar track would spring back).
  const hScrollSourceRef = useRef<"body" | "bar" | null>(null);
  const hScrollSourceTimerRef = useRef<number>(0);
  const claimHScroll = useCallback((source: "body" | "bar") => {
    hScrollSourceRef.current = source;
    window.clearTimeout(hScrollSourceTimerRef.current);
    hScrollSourceTimerRef.current = window.setTimeout(() => { hScrollSourceRef.current = null; }, 160);
  }, []);
  useEffect(() => () => window.clearTimeout(hScrollSourceTimerRef.current), []);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Cache selected row keys in a stable Set to prevent flickering during scroll
  const selectedRowKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      if (row.selectionId && selectionState.selectedIds.has(row.selectionId.getKey())) {
        keys.add(row.key);
      }
    }
    return keys;
  }, [rows, selectionState.selectedIds]);

  // Connect formula bar ref to window global for cell reference insertion
  useEffect(() => {
    (window as any).__formulaBarInsertReference = (ref: string) => {
      formulaBarRef.current?.insertCellReference(ref);
    };
    return () => {
      delete (window as any).__formulaBarInsertReference;
    };
  }, []);

  // Active Cell / Edit State
  const [activeCell, setActiveCell] = useState<{
    rowKey: string;
    colKey: string;
    measureIndex: number;
    label: string;
    value: string;
    row?: FlattenedNode;
    col?: FlattenedNode;
    rowIndex?: number;
    colIndex?: number;
  } | null>(null);

  // Formula Bar Edit Mode
  const [formulaBarEditMode, setFormulaBarEditMode] = useState(false);
  const showFormulaBar = activeCell !== null;

  useEffect(() => {
    if (!showFormulaBar) {
      setFormulaBarEditMode(false);
    }
  }, [showFormulaBar]);

  // Drag & Drop State
  const [draggedRowKey, setDraggedRowKey] = useState<string | null>(null);
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "child" | null>(null);
  const rowDropCommittedRef = useRef(false);

  // Range Selection State for bulk operations
  const [selectedRange] = useState<{
    cells: { rowKey: string; colKey: string; measureIndex: number }[];
    anchorCell: { rowKey: string; colKey: string; measureIndex: number } | null;
  }>({ cells: [], anchorCell: null });

  const [bulkOperationsOpen, setBulkOperationsOpen] = useState(false);

  // Listen for external trigger to open bulk operations
  useEffect(() => {
    if (onOpenBulkOperations) {
      (window as any).__openBulkOperations = () => setBulkOperationsOpen(true);
    }
    return () => {
      delete (window as any).__openBulkOperations;
    };
  }, [onOpenBulkOperations]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "cell" | "rowHeader" | "columnHeader" | "total";
    items: ContextMenuItem[];
  } | null>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCellSelect = useCallback((row: FlattenedNode, colKey: string, measureIndex: number, rowIndex?: number, colIndex?: number) => {
    // If formula bar is in edit mode, insert cell reference instead of selecting
    if (formulaBarEditMode) {
      const col = columns.find(c => c.key === colKey);
      if (col && measures[measureIndex]) {
        const cellRef = formatCellReferenceForFormula(row, col, measures[measureIndex]);
        const insertFn = (window as any).__formulaBarInsertReference;
        if (insertFn) {
          insertFn(cellRef);
        }
      }
      return;
    }

    const cellValue = getCellValue(cellMap, row.key, colKey, measureIndex);
    const edits = JSON.parse(settings.manualData.edits || "{}");
    const editValue = edits[`${row.key}|${colKey}|${measureIndex}`];

    // Build hierarchical cell label
    const col = columns.find(c => c.key === colKey);
    const measure = measures[measureIndex];
    let label = "Cell";
    if (col && measure) {
      label = generateCellLabel(row, col, measure, rowIndex, colIndex);
    }

    setActiveCell({
      rowKey: row.key,
      colKey,
      measureIndex,
      label,
      value: editValue || (cellValue?.value !== null && cellValue?.value !== undefined ? String(cellValue?.value) : ""),
      row,
      col,
      rowIndex,
      colIndex
    });
    onRowSelectionForFormatChange?.([row.key]);
  }, [formulaBarEditMode, columns, measures, cellMap, settings.manualData.edits, onRowSelectionForFormatChange]);

  const handleCommitEdit = useCallback((newValue: string) => {
    if (!activeCell) return;
    const prevJson = settings.manualData.edits || "{}";
    const edits = JSON.parse(prevJson);
    const key = `${activeCell.rowKey}|${activeCell.colKey}|${activeCell.measureIndex}`;

    if (newValue === "") {
      delete edits[key];
    } else {
      edits[key] = newValue;
    }

    // Undo/redo for edits is handled by the host's property history (Ctrl+Z, footer).
    onPersistProperty("manualData", "edits", JSON.stringify(edits));
    setActiveCell(null);
    setFormulaBarEditMode(false);
  }, [activeCell, onPersistProperty, settings.manualData.edits]);

  const handleCancelEdit = useCallback(() => {
    setActiveCell(null);
    setFormulaBarEditMode(false);
    onRowSelectionForFormatChange?.([]);
  }, [onRowSelectionForFormatChange]);

  const handleRowDragStart = useCallback((e: React.DragEvent, rowKey: string) => {
    rowDropCommittedRef.current = false;
    setDraggedRowKey(rowKey);
    e.dataTransfer.setData("text/plain", rowKey);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, rowKey: string) => {
    e.preventDefault();
    if (rowKey === draggedRowKey) return;

    // Auto-scroll gently when dragging near edges. Keep this deliberately
    // conservative so long drags do not run away from the user's pointer.
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const threshold = 42;
      const maxSpeed = 6;

      if (e.clientY < rect.top + threshold) {
        const distance = Math.max(0, rect.top + threshold - e.clientY);
        container.scrollTop -= Math.max(1, Math.ceil((distance / threshold) * maxSpeed));
      } else if (e.clientY > rect.bottom - threshold) {
        const distance = Math.max(0, e.clientY - (rect.bottom - threshold));
        container.scrollTop += Math.max(1, Math.ceil((distance / threshold) * maxSpeed));
      }

      // Horizontal edge auto-scroll for wide grids. The body is overflow-x:hidden,
      // so route through the companion scrollbar element and scrollLeft state.
      const hScroll = horizontalScrollRef.current;
      if (hScroll) {
        if (e.clientX < rect.left + threshold) {
          const distance = Math.max(0, rect.left + threshold - e.clientX);
          setSyncedScrollLeft(hScroll.scrollLeft - Math.max(1, Math.ceil((distance / threshold) * maxSpeed)));
        } else if (e.clientX > rect.right - threshold) {
          const distance = Math.max(0, e.clientX - (rect.right - threshold));
          setSyncedScrollLeft(hScroll.scrollLeft + Math.max(1, Math.ceil((distance / threshold) * maxSpeed)));
        }
      }
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;

    let pos: "before" | "after" | "child" = "after";
    if (relY < rect.height * 0.3) pos = "before";
    else if (relY > rect.height * 0.7) pos = "after";
    else pos = "child";

    setDragOverRowKey(prev => prev === rowKey ? prev : rowKey);
    setDropPosition(prev => prev === pos ? prev : pos);
  }, [draggedRowKey]);

  const commitRowDrop = useCallback((targetRowKey: string | null = dragOverRowKey, position: "before" | "after" | "child" | null = dropPosition) => {
    if (draggedRowKey && targetRowKey && position && draggedRowKey !== targetRowKey) {
      let currentOrder: string[] = JSON.parse(settings.manualData.rowOrder || "[]");

      // If rowOrder is empty, populate with all current row keys to establish baseline
      if (currentOrder.length === 0) {
        currentOrder = rows.map(r => r.key);
      }

      // Identify the dragged row and all its descendants (subcategories)
      const draggedRowObj = rows.find(r => r.key === draggedRowKey);
      const draggedKeysToMove: string[] = [draggedRowKey];

      if (draggedRowObj) {
        const draggedLevel = draggedRowObj.level;
        const startIdx = rows.findIndex(r => r.key === draggedRowKey);
        const subtotalKey = generateRowKey([...(draggedRowObj.path || []), "__subtotal"] as (string | number)[]);
        const grandTotalKey = generateRowKey([...(draggedRowObj.path && draggedRowObj.path.length > 0 ? draggedRowObj.path : ["root"]), "__grand_total"] as (string | number)[]);
        draggedKeysToMove.push(subtotalKey, grandTotalKey);
        for (const r of rows) {
          const isAttachedTotal = (r.isSubtotal || r.isGrandTotal) &&
            r.path.length >= draggedRowObj.path.length &&
            draggedRowObj.path.every((part, index) => r.path[index] === part);
          if (isAttachedTotal) {
            draggedKeysToMove.push(r.key);
          }
        }
        if (startIdx > -1) {
          for (let i = startIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            if (r.level > draggedLevel) {
              draggedKeysToMove.push(r.key);
            } else {
              break;
            }
          }
        }
      }

      const draggedKeySet = new Set(draggedKeysToMove);
      if (draggedKeySet.has(targetRowKey)) {
        setDraggedRowKey(null);
        setDragOverRowKey(null);
        setDropPosition(null);
        return;
      }
      const normalizedDraggedKeys = currentOrder.filter((key: string) => draggedKeySet.has(key));
      for (const key of draggedKeysToMove) {
        if (!normalizedDraggedKeys.includes(key)) {
          normalizedDraggedKeys.push(key);
        }
      }

      const rowParents = (() => {
        try {
          const parsed = JSON.parse(settings.manualData.rowParents || "{}");
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed as Record<string, string>
            : {};
        } catch {
          return {} as Record<string, string>;
        }
      })();
      const targetRowObj = rows.find(r => r.key === targetRowKey);
      if (position === "child") {
        rowParents[draggedRowKey] = targetRowKey;
        if (targetRowObj && !targetRowObj.isExpanded) {
          onToggleRowExpand(targetRowKey);
        }
      } else {
        const siblingParentKey = getManualParentKey(targetRowObj);
        if (siblingParentKey && siblingParentKey !== "root") {
          rowParents[draggedRowKey] = siblingParentKey;
        } else {
          delete rowParents[draggedRowKey];
        }
      }

      // Remove dragged row and all its descendants from current order
      currentOrder = currentOrder.filter((k: string) => !draggedKeySet.has(k));

      // Find target position in current order
      const targetIdx = currentOrder.indexOf(targetRowKey);

      if (targetIdx === -1) {
        // Target not in order, append dragged rows
        currentOrder.push(...normalizedDraggedKeys);
      } else {
        // Insert at appropriate position
        let insertIdx: number;
        if (position === "before") {
          insertIdx = targetIdx;
        } else if (position === "after") {
          // If inserting after, we need to skip past the target's descendants
          insertIdx = targetIdx + 1;
          if (targetRowObj) {
            const targetLevel = targetRowObj.level;
            for (let i = targetIdx + 1; i < currentOrder.length; i++) {
              const rObj = rows.find(r => r.key === currentOrder[i]);
              if (rObj && rObj.level > targetLevel) {
                insertIdx = i + 1;
              } else {
                break;
              }
            }
          }
        } else {
          // "child" - insert right after the target (making it the first child)
          insertIdx = targetIdx + 1;
        }
        currentOrder.splice(insertIdx, 0, ...normalizedDraggedKeys);
      }

      onPersistProperty("manualData", "rowOrder", JSON.stringify(currentOrder));
      onPersistProperty("manualData", "rowParents", JSON.stringify(rowParents));
    }
    setDraggedRowKey(null);
    setDragOverRowKey(null);
    setDropPosition(null);
  }, [draggedRowKey, dragOverRowKey, dropPosition, settings.manualData.rowOrder, settings.manualData.rowParents, onPersistProperty, rows, onToggleRowExpand]);

  const handleRowDrop = useCallback((e: React.DragEvent, rowKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    let position = dropPosition;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    if (!position) {
      position = relY < rect.height * 0.3 ? "before" : relY > rect.height * 0.7 ? "after" : "child";
    }
    commitRowDrop(rowKey, position);
    rowDropCommittedRef.current = true;
  }, [commitRowDrop, dropPosition]);

  const handleRowDragEnd = useCallback(() => {
    if (rowDropCommittedRef.current) {
      rowDropCommittedRef.current = false;
      setDraggedRowKey(null);
      setDragOverRowKey(null);
      setDropPosition(null);
      return;
    }
    commitRowDrop();
  }, [commitRowDrop]);

  // Compute row height based on density setting
  const densityRowHeight = useMemo(() => {
    if (settings.theme.density === "compact") return 24;
    if (settings.theme.density === "spacious") return 40;
    return 32; // comfortable
  }, [settings.theme.density]);

  const [rowHeightPx, setRowHeightPx] = useState(() => densityRowHeight);
  const [columnWidthPx, setColumnWidthPx] = useState(() => settings.general.defaultColumnWidth);

  const rowHeightRef = useRef<number>(rowHeightPx);
  const columnWidthRef = useRef<number>(columnWidthPx);

  useEffect(() => {
    rowHeightRef.current = rowHeightPx;
  }, [rowHeightPx]);

  useEffect(() => {
    columnWidthRef.current = columnWidthPx;
  }, [columnWidthPx]);

  // Update row height when density changes
  useEffect(() => {
    setRowHeightPx(densityRowHeight);
  }, [densityRowHeight]);

  useEffect(() => {
    setColumnWidthPx(settings.general.defaultColumnWidth);
  }, [settings.general.defaultColumnWidth]);

  const [rowHeaderWidth, setRowHeaderWidth] = useState(() => {
    const raw = settings.general.rowHeaderWidth || 180;
    return Math.max(120, Math.min(800, Math.round(raw)));
  });
  const rowHeaderWidthRef = useRef<number>(rowHeaderWidth);
  useEffect(() => {
    rowHeaderWidthRef.current = rowHeaderWidth;
  }, [rowHeaderWidth]);

  useEffect(() => {
    setRowHeaderWidth(settings.general.rowHeaderWidth || 180);
  }, [settings.general.rowHeaderWidth]);



  // The cell strip is always present while editing is allowed, so selecting a
  // cell never shifts the grid.
  const FORMULA_BAR_HEIGHT = 34;
  const HORIZONTAL_SCROLLBAR_HEIGHT = 24;
  const formulaBarHeight = allowInteractions ? FORMULA_BAR_HEIGHT : 0;

  const minRowHeightPx = useMemo(() => {
    const headerFontPx = Math.max(8, Math.round(settings.headers.fontSize || 0));
    const valueFontPx = Math.max(8, Math.round(settings.values.fontSize || 0));
    const lineBoxPx = Math.ceil(Math.max(headerFontPx, valueFontPx) * 1.2);
    const chromePx = 8;
    return Math.max(18, lineBoxPx + chromePx);
  }, [settings.headers.fontSize, settings.values.fontSize]);

  const safeRowHeightPx = Math.max(minRowHeightPx, Math.round(rowHeightPx || 0));
  const safeColumnWidthPx = Math.max(60, Math.round(columnWidthPx || 0));

  const visualColumnRules = useMemo(
    () => parseVisualColumnRules(settings.calculations.visualColumns),
    [settings.calculations.visualColumns]
  );

  const levelAwareConfig = useMemo(
    () => getLevelAwareConfig(settings),
    [settings]
  );

  const gridColumns: GridColumn[] = useMemo(
    () => buildGridColumns(columns, measures, settings, visualColumnRules, levelAwareConfig),
    // Only colOrder/hiddenCols are read from settings; the full object is passed for typing.
    [columns, measures, settings.manualData.colOrder, settings.manualData.hiddenCols, visualColumnRules, levelAwareConfig]
  );

  // Column header height based on merged header rows (hierarchy levels + measure row)
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0);
  const baseColumnHeaderHeight = useMemo(() => {
    if (measures.length === 0) return 0;
    const arrangement = ((settings.general as any).columnArrangement ?? "time-then-measure") as ColumnArrangement;
    const headerRows = buildMergedHeaders(columns, measures, arrangement, sortConfig, gridColumns);
    return headerRows.length * 28;
  }, [columns, measures, settings.general, sortConfig, gridColumns]);
  // Header labels wrap onto extra lines, so the fixed per-level height can cut them off;
  // never go below what the rendered rows actually need.
  const columnHeaderHeight = baseColumnHeaderHeight === 0 ? 0 : Math.max(baseColumnHeaderHeight, measuredHeaderHeight);

  const colWidths = useMemo(() => {
    try {
      return JSON.parse(settings.manualData.colWidths || "{}") as Record<string, number>;
    } catch {
      return {} as Record<string, number>;
    }
  }, [settings.manualData.colWidths]);

  const columnWidthMap = useMemo(() => {
    let map = createColumnWidthMap(safeColumnWidthPx);
    gridColumns.forEach((gc, idx) => {
      const custom = colWidths[gc.col.key];
      if (custom) {
        map = setColumnWidth(map, idx, custom);
      }
    });
    return map;
  }, [gridColumns, colWidths, safeColumnWidthPx]);

  const totalContentWidth = useMemo(() => {
    return getTotalWidthWithVariableWidths(columnWidthMap, gridColumns.length);
  }, [columnWidthMap, gridColumns.length]);

  const viewportWidth = Math.max(0, width - rowHeaderWidth);
  const hasHorizontalOverflow = totalContentWidth > viewportWidth;
  const rawViewportHeight = Math.max(
    0,
    height - columnHeaderHeight - formulaBarHeight
  );
  // Only reserve room for the horizontal scrollbar track when there is
  // actually horizontal overflow. Reserving it unconditionally wasted a 24px
  // strip and, combined with the absolutely-positioned shell, caused the
  // grid body and scrollbar to fight over the same band at the bottom.
  const viewportHeight = Math.max(
    0,
    rawViewportHeight - (hasHorizontalOverflow ? HORIZONTAL_SCROLLBAR_HEIGHT : 0)
  );

  const viewportConfig: ViewportConfig = useMemo(() => ({
    rowHeight: safeRowHeightPx,
    columnWidth: safeColumnWidthPx, // default
    rowBuffer: ROW_BUFFER,
    columnBuffer: COL_BUFFER,
    viewportWidth,
    viewportHeight,
    totalRows: rows.length,
    totalColumns: gridColumns.length,
    rowHeaderWidth,
    columnHeaderHeight,
  }), [safeRowHeightPx, safeColumnWidthPx, viewportWidth, viewportHeight, rows.length, gridColumns.length, rowHeaderWidth, columnHeaderHeight]);

  const selectedColumnKeysSet = useMemo(() => new Set(selectedColumnKeysArr || []), [selectedColumnKeysArr]);
  const selectedRowKeysForFormatSet = useMemo(() => new Set(selectedRowKeysForFormatArr || []), [selectedRowKeysForFormatArr]);
  const rowFormats = useMemo(() => parseRowFormats(settings.manualData.rowFormats), [settings.manualData.rowFormats]);
  const hiddenRowExpandIconSet = useMemo(() => {
    try {
      return new Set(JSON.parse(settings.manualData.hiddenRowExpandIcons || "[]") as string[]);
    } catch {
      return new Set<string>();
    }
  }, [settings.manualData.hiddenRowExpandIcons]);

  const handleColumnHeaderClick = useCallback((
    columnKey: string,
    measureIndex: number,
    modifiers: { ctrl: boolean; shift: boolean },
    selectionKeys?: string[]
  ) => {
    if (!allowInteractions) return;
    const keys = selectionKeys?.length ? selectionKeys : [`${columnKey}::m${measureIndex}`];
    const current = selectedColumnKeysArr || [];
    const currentSet = new Set(current);
    const allSelected = keys.every(key => currentSet.has(key));
    let next: string[];
    
    if (modifiers.shift && current.length > 0) {
      const order = gridColumns.map(c => c.key);
      const anchor = current[current.length - 1];
      const target = keys[keys.length - 1];
      const anchorIndex = order.indexOf(anchor);
      const targetIndex = order.indexOf(target);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const rangeKeys = order.slice(start, end + 1);
        next = modifiers.ctrl ? Array.from(new Set([...current, ...rangeKeys])) : rangeKeys;
      } else {
        next = Array.from(new Set([...current, ...keys]));
      }
    } else if (modifiers.ctrl) {
      if (allSelected) {
        next = current.filter(key => !keys.includes(key));
      } else {
        next = Array.from(new Set([...current, ...keys]));
      }
    } else {
      // Toggle if the exact group is already selected, or select the whole header group.
      if (current.length === keys.length && keys.every(key => currentSet.has(key))) {
        next = [];
      } else {
        next = keys;
      }
    }
    
    onColumnSelectionChange?.(next);
  }, [allowInteractions, gridColumns, selectedColumnKeysArr, onColumnSelectionChange]);

  const handleColumnReorder = useCallback((dragKey: string, targetKey: string) => {
    const order = gridColumns.map(c => c.key);
    const from = order.indexOf(dragKey);
    // "__end__" drops after the last column; otherwise insert before targetKey.
    const to = targetKey === "__end__" ? order.length : order.indexOf(targetKey);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = order.splice(from, 1);
    order.splice(from < to ? to - 1 : to, 0, moved);
    onPersistProperty("manualData", "colOrder", JSON.stringify(Array.from(new Set(order))));
  }, [gridColumns, onPersistProperty]);

  const handleRowHeaderClick = useCallback((
    row: FlattenedNode,
    modifiers: { ctrl: boolean; shift: boolean }
  ) => {
    if (!allowInteractions) return;
    const keys = rows
      .filter(candidate => {
        if (row.path.length === 0) return candidate.key === row.key;
        return candidate.path.length >= row.path.length
          && row.path.every((part, index) => candidate.path[index] === part);
      })
      .map(candidate => candidate.key);
    const current = selectedRowKeysForFormatArr || [];
    const currentSet = new Set(current);
    const allSelected = keys.every(key => currentSet.has(key));
    let next: string[];

    if (modifiers.shift && current.length > 0) {
      const order = rows.map(candidate => candidate.key);
      const anchor = current[current.length - 1];
      const target = row.key;
      const anchorIndex = order.indexOf(anchor);
      const targetIndex = order.indexOf(target);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const rangeKeys = order.slice(start, end + 1);
        next = modifiers.ctrl ? Array.from(new Set([...current, ...rangeKeys])) : rangeKeys;
      } else {
        next = Array.from(new Set([...current, ...keys]));
      }
    } else if (modifiers.ctrl) {
      if (allSelected) {
        next = current.filter(key => !keys.includes(key));
      } else {
        next = Array.from(new Set([...current, ...keys]));
      }
    } else {
      if (current.length === keys.length && keys.every(key => currentSet.has(key))) {
        next = [];
      } else {
        next = keys;
      }
    }
    
    onRowSelectionForFormatChange?.(next);
  }, [allowInteractions, rows, selectedRowKeysForFormatArr, onRowSelectionForFormatChange]);

  const persistLevelAwareField = useCallback((measureIndex: number, patch: Partial<LevelAwareFieldConfig>) => {
    const measure = measures[measureIndex];
    if (!measure) return;
    const next = upsertFieldConfig(levelAwareConfig, measure, measureIndex, patch);
    onPersistProperty("calculations", "levelAwareColumns", serializeLevelAwareColumns(next));
  }, [levelAwareConfig, measures, onPersistProperty]);

  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    row?: FlattenedNode,
    colKey?: string,
    measureIndex?: number
  ) => {
    if (!allowInteractions) return;

    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;

    if (row && colKey !== undefined && measureIndex !== undefined) {
      // Cell Context Menu
      const cell = getCellValue(cellMap, row.key, colKey, measureIndex);
      const items = buildCellMenuItems(
        () => navigator.clipboard.writeText(cell?.formattedValue || ""),
        () => navigator.clipboard.writeText(row.label),
        () => {
          const notes = JSON.parse(settings.manualData.notes || "{}");
          const existingNote = notes[`${row.key}|${colKey}|${measureIndex}`] || "";
          const newNote = prompt("Enter note for this cell:", existingNote);
          if (newNote !== null) {
            if (newNote === "") delete notes[`${row.key}|${colKey}|${measureIndex}`];
            else notes[`${row.key}|${colKey}|${measureIndex}`] = newNote;
            onPersistProperty("manualData", "notes", JSON.stringify(notes));
          }
        },
        onOpenCalcMeasureWizard || (() => { }),
        () => onAddQuickVariance?.(colKey, measureIndex),
        () => {
          const payload = {
            row: row.label,
            column: columns.find(c => c.key === colKey)?.label || colKey,
            measure: measures[measureIndex]?.name || `Measure ${measureIndex + 1}`,
            value: cell?.formattedValue || "",
          };
          navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        },
        () => {
          const edits = JSON.parse(settings.manualData.edits || "{}");
          delete edits[`${row.key}|${colKey}|${measureIndex}`];
          onPersistProperty("manualData", "edits", JSON.stringify(edits));
        },
        !!JSON.parse(settings.manualData.edits || "{}")[`${row.key}|${colKey}|${measureIndex}`],
        (selectionManager && row.selectionId)
          ? () => selectionManager.showContextMenu(row.selectionId!, { x, y })
          : undefined
      );
      items.push(
        { id: "cell-level-aware-detail", label: "Convert measure to detail column", action: () => persistLevelAwareField(measureIndex, { displayMode: "detail", rowVisibility: "leaf", columnGroupVisibility: "notRepeated", placement: "beforeDistributed", aggregation: "none" }) },
        { id: "cell-level-aware-row-level", label: "Show only at this row level", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "selected", selectedRowLevels: [row.level] }) },
        { id: "cell-level-aware-leaf", label: "Show only on leaf rows", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "leaf" }) },
        { id: "cell-level-aware-parent", label: "Show only on parent rows", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "parent" }) },
        { id: "cell-level-aware-distribute", label: "Distribute across column group", action: () => persistLevelAwareField(measureIndex, { displayMode: "distributed", rowVisibility: "all", columnGroupVisibility: "all", placement: "beforeDistributed" }) }
      );
      setContextMenu({ x, y, type: "cell", items });
    } else if (row) {
      // Row Header Context Menu
      const items = buildRowHeaderMenuItems(
        () => onExpandAllUnder?.(row.key),
        () => onCollapseAllUnder?.(row.key),
        () => onOpenCalcRowWizard?.(row.key),
        () => {
          const existingLabelOverrides = JSON.parse(settings.manualData.labelOverrides || "{}");
          const existingLabel = existingLabelOverrides[row.key] || row.label;
          const newLabel = prompt("Enter new label:", existingLabel);
          if (newLabel !== null) {
            const labels = { ...existingLabelOverrides };
            labels[row.key] = newLabel;
            onPersistProperty("manualData", "labelOverrides", JSON.stringify(labels));
          }
        },
        () => {
          const groupName = prompt("Move selected row or hierarchy to group:", "");
          if (!groupName) return;
          const trimmedGroupName = groupName.trim();
          if (!trimmedGroupName) return;

          const existingGroups = (() => {
            try {
              const parsed = JSON.parse(settings.manualData.groupings || "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();

          const rowKeys = rows
            .filter(candidate => {
              if (row.path.length === 0) return candidate.key === row.key;
              return candidate.path.length >= row.path.length
                && row.path.every((part, index) => candidate.path[index] === part);
            })
            .map(candidate => candidate.key);

          const normalizedGroups = existingGroups
            .map((group: any) => ({
              ...group,
              rowKeys: Array.isArray(group.rowKeys)
                ? group.rowKeys.filter((key: string) => !rowKeys.includes(key))
                : [],
            }))
            .filter((group: any) => group.rowKeys.length > 0 || group.label === trimmedGroupName);

          const targetIndex = normalizedGroups.findIndex((group: any) => group.label === trimmedGroupName);
          if (targetIndex >= 0) {
            normalizedGroups[targetIndex] = {
              ...normalizedGroups[targetIndex],
              rowKeys: Array.from(new Set([...(normalizedGroups[targetIndex].rowKeys || []), ...rowKeys])),
            };
          } else {
            normalizedGroups.push({
              id: `group_${Date.now()}`,
              label: trimmedGroupName,
              rowKeys,
            });
          }

          onPersistProperty("manualData", "groupings", JSON.stringify(normalizedGroups));
        },
        () => {
          const locks = JSON.parse(settings.manualData.locks || "[]");
          const newLocks = locks.includes(row.key) ? locks.filter((l: string) => l !== row.key) : [...locks, row.key];
          onPersistProperty("manualData", "locks", JSON.stringify(newLocks));
        },
        JSON.parse(settings.manualData.locks || "[]").includes(row.key),
        !!row.isCalculatedRow,
        () => onHideRow?.(row.key),
        hiddenRowExpandIconSet.has(row.key),
        () => {
          const next = new Set(hiddenRowExpandIconSet);
          if (next.has(row.key)) next.delete(row.key);
          else next.add(row.key);
          onPersistProperty("manualData", "hiddenRowExpandIcons", JSON.stringify(Array.from(next)));
        },
        () => onEditCalcRow?.(row.key),
        () => onDeleteCalcRow?.(row.key),
        (selectionManager && row.selectionId)
          ? () => selectionManager.showContextMenu(row.selectionId!, { x, y })
          : undefined
      );
      setContextMenu({ x, y, type: "rowHeader", items });
    } else if (colKey !== undefined && measureIndex !== undefined) {
      // Column Header Context Menu
      const clickedColumnKey = `${colKey}::m${measureIndex}`;
      const selectedContextKeys = (selectedColumnKeysArr || []).filter(Boolean);
      const effectiveColumnKeys = selectedContextKeys.length > 0
        ? selectedContextKeys
        : [clickedColumnKey];
      const items = buildColumnHeaderMenuItems(
        () => onSetSortDirection?.(colKey, measureIndex, "asc") ?? onSort(colKey, measureIndex),
        () => onSetSortDirection?.(colKey, measureIndex, "desc") ?? onSort(colKey, measureIndex),
        () => {
          const labelOverrides = JSON.parse(settings.manualData.labelOverrides || "{}");
          const measureOverrideKey = `m_${measureIndex}`;
          const existingLabel = labelOverrides[colKey]
            || labelOverrides[measureOverrideKey]
            || columns.find(c => c.key === colKey)?.label
            || measures[measureIndex]?.name
            || "Header";
          const newLabel = prompt("Enter new column header label:", existingLabel);
          if (newLabel === null) return;

          const next = { ...labelOverrides };
          if (effectiveColumnKeys.length === 1 && (effectiveColumnKeys[0].startsWith("m:") || effectiveColumnKeys[0].startsWith("m_"))) {
            next[measureOverrideKey] = newLabel;
          } else {
            next[colKey] = newLabel;
          }
          onPersistProperty("manualData", "labelOverrides", JSON.stringify(next));
        },
        () => {
          // Move Left
          const idx = gridColumns.findIndex(c => c.key === clickedColumnKey);
          if (idx > 0) {
            const nextOrder = gridColumns.map(c => c.key);
            [nextOrder[idx - 1], nextOrder[idx]] = [nextOrder[idx], nextOrder[idx - 1]];
            onPersistProperty("manualData", "colOrder", JSON.stringify(Array.from(new Set(nextOrder))));
          }
        },
        () => {
          // Move Right
          const idx = gridColumns.findIndex(c => c.key === clickedColumnKey);
          if (idx < gridColumns.length - 1) {
            const nextOrder = gridColumns.map(c => c.key);
            [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
            onPersistProperty("manualData", "colOrder", JSON.stringify(Array.from(new Set(nextOrder))));
          }
        },
        () => onPersistProperty("general", "freezeFirstColumn", !settings.general.freezeFirstColumn),
        () => onAddQuickVariance?.(colKey, measureIndex),
        settings.general.freezeFirstColumn,
        () => onHideColumns?.(effectiveColumnKeys)
      );
      items.push(
        { id: "level-aware-detail", label: "Convert to detail column", action: () => persistLevelAwareField(measureIndex, { displayMode: "detail", rowVisibility: "leaf", columnGroupVisibility: "notRepeated", placement: "beforeDistributed", aggregation: "none" }) },
        { id: "level-aware-row-level", label: "Show only at this row level", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "selected", selectedRowLevels: row ? [row.level] : [0] }) },
        { id: "level-aware-leaf", label: "Show only on leaf rows", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "leaf" }) },
        { id: "level-aware-parent", label: "Show only on parent rows", action: () => persistLevelAwareField(measureIndex, { rowVisibility: "parent" }) },
        { id: "level-aware-distribute", label: "Distribute across column group", action: () => persistLevelAwareField(measureIndex, { displayMode: "distributed", rowVisibility: "all", columnGroupVisibility: "all", placement: "beforeDistributed" }) }
      );
      setContextMenu({ x, y, type: "columnHeader", items });
    }
  }, [allowInteractions, cellMap, columns, measures, onToggleRowExpand, onOpenCalcMeasureWizard, onOpenCalcRowWizard, onSort, onPersistProperty, settings.manualData, settings.general, gridColumns, onAddQuickVariance, selectionManager, onExpandAllUnder, onCollapseAllUnder, rows, selectedColumnKeysArr, onHideColumns, onSetSortDirection, persistLevelAwareField, hiddenRowExpandIconSet]);

  const visibleRange: ViewportRange = useMemo(() => {
    return computeVisibleRangeWithVariableWidths(scrollTop, scrollLeft, viewportConfig, columnWidthMap);
  }, [scrollTop, scrollLeft, viewportConfig, columnWidthMap]);

  const rowBreakExtraHeight = settings.layout.rowBreak === "section"
    ? safeRowHeightPx
    : settings.layout.rowBreak === "page"
      ? safeRowHeightPx * 2
      : 0;

  const rowTopOffsets = useMemo(() => {
    const offsets: number[] = [];
    let top = 0;
    rows.forEach((row, index) => {
      if (
        index > 0 &&
        rowBreakExtraHeight > 0 &&
        rows[index - 1]?.path?.[0] !== row.path?.[0]
      ) {
        top += rowBreakExtraHeight;
      }
      offsets[index] = top;
      top += safeRowHeightPx;
    });
    return offsets;
  }, [rows, rowBreakExtraHeight, safeRowHeightPx]);

  const rowContentHeight = useMemo(() => {
    if (rows.length === 0) return 0;
    return (rowTopOffsets[rowTopOffsets.length - 1] ?? 0) + safeRowHeightPx;
  }, [rowTopOffsets, rows.length, safeRowHeightPx]);

  const visibleRowItems = useMemo(() => {
    const buffer = safeRowHeightPx * ROW_BUFFER;
    const start = Math.max(0, scrollTop - buffer);
    const end = scrollTop + viewportHeight + buffer;
    return rows
      .map((row, actualIndex) => ({ row, actualIndex, top: rowTopOffsets[actualIndex] ?? actualIndex * safeRowHeightPx }))
      .filter(item => item.top + safeRowHeightPx >= start && item.top <= end);
  }, [rows, rowTopOffsets, safeRowHeightPx, scrollTop, viewportHeight]);

  const renderedGridColumns = gridColumns;
  const renderedColumnRange: ViewportRange = useMemo(() => ({
    ...visibleRange,
    startCol: 0,
    endCol: gridColumns.length,
  }), [visibleRange, gridColumns.length]);

  const sparklineColumns = useMemo(() => {
    return columns.filter((col, index) => {
      if (col.isSubtotal || col.isGrandTotal) return false;
      const next = columns[index + 1];
      return col.isLeaf || !next || next.level <= col.level;
    });
  }, [columns]);

  const sparklineScale = useMemo(() => {
    if (!settings.sparklines.enabled || settings.sparklines.normalizePerRow || measures.length === 0) {
      return { min: undefined as number | undefined, max: undefined as number | undefined };
    }

    const measureIndex = Math.max(0, Math.min(measures.length - 1, sparklineMeasureIndex));
    let min = Infinity;
    let max = -Infinity;

    for (const row of rows) {
      if (row.isSubtotal || row.isGrandTotal) continue;
      for (const col of sparklineColumns) {
        const value = getCellValue(cellMap, row.key, col.key, measureIndex)?.value;
        if (typeof value === "number" && Number.isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }

    return Number.isFinite(min) && Number.isFinite(max)
      ? { min, max }
      : { min: undefined as number | undefined, max: undefined as number | undefined };
  }, [cellMap, measures.length, rows, settings.sparklines.enabled, settings.sparklines.normalizePerRow, sparklineColumns, sparklineMeasureIndex]);

  const globalStats = useMemo(
    () => computeAllGlobalStats(cellMap, measures.length),
    [cellMap, measures.length]
  );

  // Stats caches are recreated whenever the data they summarize changes, so the
  // first render after a change never reads stale min/max values.
  const statsCaches = useMemo(() => ({
    columns: new Map<string, { min: number; max: number }[]>(),
    rows: new Map<string, { min: number; max: number }[]>(),
  }), [cellMap, rows, columns, measures.length]);

  const getColumnStatsCached = useCallback((colKey: string, measureIndex: number): { min: number; max: number } => {
    const cachedByMeasure = statsCaches.columns.get(colKey);
    if (cachedByMeasure && cachedByMeasure.length === measures.length) {
      return cachedByMeasure[measureIndex] ?? { min: 0, max: 0 };
    }

    const mins: number[] = new Array(measures.length).fill(Infinity);
    const maxs: number[] = new Array(measures.length).fill(-Infinity);

    for (const row of rows) {
      if (row.isSubtotal || row.isGrandTotal) continue;
      for (let m = 0; m < measures.length; m++) {
        const cell = getCellValue(cellMap, row.key, colKey, m);
        const v = cell?.value;
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          mins[m] = Math.min(mins[m], v);
          maxs[m] = Math.max(maxs[m], v);
        }
      }
    }

    const statsByMeasure: { min: number; max: number }[] = mins.map((mn, idx) => ({
      min: mn === Infinity ? 0 : mn,
      max: maxs[idx] === -Infinity ? 0 : maxs[idx],
    }));

    statsCaches.columns.set(colKey, statsByMeasure);
    return statsByMeasure[measureIndex] ?? { min: 0, max: 0 };
  }, [rows, cellMap, measures.length, statsCaches]);

  const getRowStatsCached = useCallback((rowKey: string, measureIndex: number): { min: number; max: number } => {
    const cachedByMeasure = statsCaches.rows.get(rowKey);
    if (cachedByMeasure && cachedByMeasure.length === measures.length) {
      return cachedByMeasure[measureIndex] ?? { min: 0, max: 0 };
    }

    const mins: number[] = new Array(measures.length).fill(Infinity);
    const maxs: number[] = new Array(measures.length).fill(-Infinity);

    for (const col of columns) {
      for (let m = 0; m < measures.length; m++) {
        const cell = getCellValue(cellMap, rowKey, col.key, m);
        const v = cell?.value;
        if (v !== null && v !== undefined && !Number.isNaN(v)) {
          mins[m] = Math.min(mins[m], v);
          maxs[m] = Math.max(maxs[m], v);
        }
      }
    }

    const statsByMeasure: { min: number; max: number }[] = mins.map((mn, idx) => ({
      min: mn === Infinity ? 0 : mn,
      max: maxs[idx] === -Infinity ? 0 : maxs[idx],
    }));

    statsCaches.rows.set(rowKey, statsByMeasure);
    return statsByMeasure[measureIndex] ?? { min: 0, max: 0 };
  }, [columns, cellMap, measures.length, statsCaches]);

  const scrollManagerRef = useRef<ScrollManager | null>(null);

  useEffect(() => {
    scrollManagerRef.current = new ScrollManager(
      () => {
        // Callback for scroll updates - now empty as we update state directly in handleScroll
      }
    );

    return () => {
      scrollManagerRef.current?.destroy();
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollLeft } = target;

    // Update state immediately for perfect alignment during virtualization
    const roundedTop = Math.round(scrollTop);
    const roundedLeft = Math.round(scrollLeft);
    setScrollTop(roundedTop);
    // Ignore the body's echo of a position the scrollbar just set.
    if (hScrollSourceRef.current !== "bar") {
      setScrollLeft(roundedLeft);
      if (horizontalScrollRef.current && horizontalScrollRef.current.scrollLeft !== roundedLeft) {
        claimHScroll("body");
        horizontalScrollRef.current.scrollLeft = roundedLeft;
      }
    }

    scrollManagerRef.current?.handleScroll(scrollTop, scrollLeft);
  }, [claimHScroll]);

  const handleHorizontalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Ignore the scrollbar's echo of a position the body just set.
    if (hScrollSourceRef.current === "body") return;
    const nextScrollLeft = e.currentTarget.scrollLeft;
    const container = scrollContainerRef.current;
    if (container && container.scrollLeft !== nextScrollLeft) {
      claimHScroll("bar");
      container.scrollLeft = nextScrollLeft;
    }
    setScrollLeft(nextScrollLeft);
  }, [claimHScroll]);

  const setSyncedScrollLeft = useCallback((nextScrollLeft: number) => {
    const maxScrollLeft = Math.max(0, totalContentWidth - viewportWidth);
    const clamped = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
    const container = scrollContainerRef.current;
    if (container && container.scrollLeft !== clamped) {
      container.scrollLeft = clamped;
    }
    if (horizontalScrollRef.current && horizontalScrollRef.current.scrollLeft !== clamped) {
      horizontalScrollRef.current.scrollLeft = clamped;
    }
    setScrollLeft(clamped);
  }, [totalContentWidth, viewportWidth]);

  const handleMatrixWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!hasHorizontalOverflow) return;

    const horizontalDelta = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (horizontalDelta === 0) return;

    // The body area is overflow-x:hidden — horizontal position lives in the
    // companion scrollbar element / scrollLeft state, so drive it from there
    // rather than the body's (pinned) scrollLeft.
    const base = horizontalScrollRef.current?.scrollLeft ?? scrollContainerRef.current?.scrollLeft ?? 0;
    setSyncedScrollLeft(base + horizontalDelta);
    e.preventDefault();
  }, [hasHorizontalOverflow, setSyncedScrollLeft]);

  const handleMatrixKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement | null;
    if (e.key === "Escape" && activeCell) {
      e.preventDefault();
      handleCancelEdit();
      return;
    }

    if (
      target &&
      target !== container &&
      target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
    ) {
      return;
    }

    const pageHeight = Math.max(safeRowHeightPx, container.clientHeight - safeRowHeightPx);
    // Horizontal position lives in scrollLeft state / the companion scrollbar,
    // not the (overflow-x:hidden) body — drive it through setSyncedScrollLeft.
    const baseLeft = horizontalScrollRef.current?.scrollLeft ?? scrollLeft;

    switch (e.key) {
      case "ArrowLeft":
        setSyncedScrollLeft(baseLeft - safeColumnWidthPx);
        break;
      case "ArrowRight":
        setSyncedScrollLeft(baseLeft + safeColumnWidthPx);
        break;
      case "ArrowUp":
        container.scrollBy({ top: -safeRowHeightPx });
        break;
      case "ArrowDown":
        container.scrollBy({ top: safeRowHeightPx });
        break;
      case "PageUp":
        container.scrollBy({ top: -pageHeight });
        break;
      case "PageDown":
        container.scrollBy({ top: pageHeight });
        break;
      case "Home":
        if (e.ctrlKey || e.metaKey) {
          container.scrollTo({ top: 0 });
        }
        setSyncedScrollLeft(0);
        break;
      case "End":
        if (e.ctrlKey || e.metaKey) {
          container.scrollTo({ top: container.scrollHeight });
        }
        setSyncedScrollLeft(totalContentWidth);
        break;
      default:
        return;
    }

    e.preventDefault();
  }, [activeCell, handleCancelEdit, safeColumnWidthPx, safeRowHeightPx, scrollLeft, setSyncedScrollLeft, totalContentWidth]);

  // ── Find (Ctrl+F) ─────────────────────────────────────────────────────────
  const [findOpen, setFindOpen] = useState(false);
  const [findMatch, setFindMatch] = useState<SearchResult | null>(null);
  const openFind = useCallback(() => setFindOpen(true), []);
  useSearchShortcut(openFind, rows.length > 0);

  // Open only when the request changes after mount, so a remount with a
  // stale counter does not pop the panel open.
  const lastFindRequestRef = useRef(findRequest);
  useEffect(() => {
    if (findRequest === lastFindRequestRef.current) return;
    lastFindRequestRef.current = findRequest;
    setFindOpen(true);
  }, [findRequest]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindMatch(null);
    scrollContainerRef.current?.focus();
  }, []);

  // Search sees exactly the text the grid renders, so matches reflect what is on screen.
  const searchTarget = useMemo(
    () => createGridSearchTarget(rows, gridColumns, cellMap, settings, labelOverrides),
    [rows, gridColumns, cellMap, settings, labelOverrides]
  );

  const handleFindNavigate = useCallback((result: SearchResult | null) => {
    setFindMatch(result);
    if (!result) return;

    // Vertical: bring the row into view through the virtualized body scroll
    // (handleScroll picks up the new scrollTop and re-renders the window).
    const container = scrollContainerRef.current;
    if (container) {
      const top = rowTopOffsets[result.rowIndex] ?? result.rowIndex * safeRowHeightPx;
      const viewTop = container.scrollTop;
      const viewHeight = container.clientHeight || viewportHeight;
      if (top < viewTop || top + safeRowHeightPx > viewTop + viewHeight) {
        container.scrollTop = Math.max(0, top - Math.max(0, (viewHeight - safeRowHeightPx) / 2));
      }
    }

    // Horizontal: centre the matched column when it is off screen.
    if (result.gridColIndex >= 0) {
      const left = getColumnOffsetWithVariableWidths(columnWidthMap, result.gridColIndex);
      const colWidth = getColumnWidth(columnWidthMap, result.gridColIndex);
      const viewLeft = horizontalScrollRef.current?.scrollLeft ?? scrollLeft;
      if (left < viewLeft || left + colWidth > viewLeft + viewportWidth) {
        setSyncedScrollLeft(left - Math.max(0, (viewportWidth - colWidth) / 2));
      }
    }
  }, [columnWidthMap, rowTopOffsets, safeRowHeightPx, scrollLeft, setSyncedScrollLeft, viewportHeight, viewportWidth]);

  const handleMatrixPointerDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) {
      return;
    }

    scrollContainerRef.current?.focus();
  }, []);

  const handleRowClick = useCallback((
    e: React.MouseEvent,
    row: FlattenedNode
  ) => {
    if (!allowInteractions) return;
    if (!row.selectionId || row.isCalculatedRow || row.isSubtotal || row.isGrandTotal) return;
    const multiSelect = e.ctrlKey || e.metaKey;
    onRowSelect(row.key, row.selectionId, multiSelect);
  }, [onRowSelect, allowInteractions]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!allowInteractions) return;
    if (e.target === e.currentTarget) {
      setActiveCell(null);
      setFormulaBarEditMode(false);
      onClearSelection();
    }
  }, [onClearSelection, allowInteractions]);

  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop !== 0) {
      e.currentTarget.scrollTop = 0;
    }
    if (e.currentTarget.scrollLeft !== 0) {
      e.currentTarget.scrollLeft = 0;
    }
  }, []);

  const SCROLL_BUFFER_BOTTOM = 40; // Extra room to scroll past the last row
  const totalContentHeight = rowContentHeight + SCROLL_BUFFER_BOTTOM;
  const hasVScroll = totalContentHeight > viewportHeight;
  const hasHScroll = totalContentWidth > viewportWidth;

  const headerAreaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = headerAreaRef.current;
    if (!root) return;
    let natural = 0;
    root.querySelectorAll<HTMLElement>(".merged-header-row").forEach(row => { natural += row.offsetHeight; });
    setMeasuredHeaderHeight(prev => (prev === natural ? prev : natural));
  });

  // The body's vertical scrollbar eats into its width, so it can scroll that much further than the
  // companion bar unless the bar's range includes it (otherwise the last columns are unreachable).
  const [vScrollbarPx, setVScrollbarPx] = useState(0);
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (el) setVScrollbarPx(Math.max(0, el.offsetWidth - el.clientWidth));
  }, [hasVScroll, width, height]);


  useEffect(() => {
    const maxScrollTop = Math.max(0, totalContentHeight - viewportHeight);
    const maxScrollLeft = Math.max(0, totalContentWidth - viewportWidth);

    const el = scrollContainerRef.current;
    if (el) {
      if (el.scrollTop > maxScrollTop) el.scrollTop = maxScrollTop;
      if (el.scrollLeft > maxScrollLeft) el.scrollLeft = maxScrollLeft;
    }
    if (horizontalScrollRef.current && horizontalScrollRef.current.scrollLeft > maxScrollLeft) {
      horizontalScrollRef.current.scrollLeft = maxScrollLeft;
    }

    setScrollTop((prev) => Math.min(prev, maxScrollTop));
    setScrollLeft((prev) => Math.min(prev, maxScrollLeft));
  }, [totalContentHeight, totalContentWidth, viewportHeight, viewportWidth, hasHorizontalOverflow]);

  const startRowResize = useCallback((clientY: number) => {
    if (!allowInteractions) return;
    const startY = clientY;
    const startH = safeRowHeightPx;

    const minRowHeight = minRowHeightPx;

    const onMove = (e: MouseEvent) => {
      const next = Math.max(minRowHeight, Math.min(200, Math.round(startH + (e.clientY - startY))));
      setRowHeightPx(next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const next = Math.max(minRowHeight, Math.min(200, Math.round(rowHeightRef.current)));
      onPersistProperty("general", "rowHeight", next);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [allowInteractions, safeRowHeightPx, minRowHeightPx, onPersistProperty]);

  const startColumnResize = useCallback((clientX: number) => {
    if (!allowInteractions) return;
    const startX = clientX;
    const startW = safeColumnWidthPx;

    const onMove = (e: MouseEvent) => {
      const next = Math.max(40, Math.min(1200, Math.round(startW + (e.clientX - startX))));
      setColumnWidthPx(next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      onPersistProperty("general", "defaultColumnWidth", columnWidthRef.current);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [allowInteractions, safeColumnWidthPx, onPersistProperty]);

  const startRowHeaderWidthResize = useCallback((clientX: number) => {
    if (!allowInteractions) return;
    const startX = clientX;
    const startW = rowHeaderWidth;

    const onMove = (e: MouseEvent) => {
      const next = Math.max(120, Math.min(1000, Math.round(startW + (e.clientX - startX))));
      setRowHeaderWidth(next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      onPersistProperty("general", "rowHeaderWidth", rowHeaderWidthRef.current);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [allowInteractions, rowHeaderWidth, onPersistProperty]);

  const getDataBarRange = useCallback((rowKey: string, colKey: string, measureIndex: number): { min: number; max: number } => {
    const mode = settings.dataBars.normalizeBy;
    if (mode === "global") {
      return globalStats.get(measureIndex) || { min: 0, max: 0 };
    }
    if (mode === "row") {
      return getRowStatsCached(rowKey, measureIndex);
    }
    return getColumnStatsCached(colKey, measureIndex);
  }, [settings.dataBars.normalizeBy, globalStats, getRowStatsCached, getColumnStatsCached]);

  // A new evaluator (with empty caches) is created whenever any conditional
  // formatting setting or the data changes, so edited rules apply immediately.
  const getCellStyle = useMemo(
    () => createCellStyleEvaluator({
      rows,
      columns,
      cellMap,
      measureCount: measures.length,
      conditionalFormatting: settings.conditionalFormatting,
      globalStats,
    }),
    [rows, columns, cellMap, measures.length, settings.conditionalFormatting, globalStats]
  );


  const handleApplyBulkOperation = useCallback((
    operation: BulkOperationType,
    value?: string,
    options?: { applyToLocked?: boolean }
  ) => {
    const edits = JSON.parse(settings.manualData.edits || "{}");
    const locks = JSON.parse(settings.manualData.locks || "[]") as string[];

    selectedRange.cells.forEach(cell => {
      // Skip locked cells unless explicitly allowed
      if (!options?.applyToLocked && locks.includes(cell.rowKey)) {
        return;
      }

      const key = `${cell.rowKey}|${cell.colKey}|${cell.measureIndex}`;
      const currentValue = getCellValue(cellMap, cell.rowKey, cell.colKey, cell.measureIndex)?.value;

      switch (operation) {
        case "setValue":
          if (value && value.trim() !== "") {
            edits[key] = value;
          }
          break;
        case "clear":
          delete edits[key];
          break;
        case "add":
          if (currentValue !== null && currentValue !== undefined && value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              edits[key] = String(currentValue + numValue);
            }
          }
          break;
        case "multiply":
          if (currentValue !== null && currentValue !== undefined && value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              edits[key] = String(currentValue * numValue);
            }
          }
          break;
        case "percentageChange":
          if (currentValue !== null && currentValue !== undefined && value) {
            const pct = parseFloat(value);
            if (!isNaN(pct)) {
              edits[key] = String(currentValue * (1 + pct / 100));
            }
          }
          break;
        case "formula":
          if (value && value.trim().startsWith("=")) {
            // Simple formula evaluation - replace CELL() with current value
            let formula = value.trim().slice(1); // Remove leading =
            const cellVal = currentValue ?? 0;
            formula = formula.replace(/CELL\(\)/g, String(cellVal));
            // For simplicity, we'll store the evaluated result
            // In a full implementation, you'd use the FormulaEngine
            try {
              // Basic math evaluation (safety note: in production use a safe math parser)
              const result = Function('"use strict"; return (' + formula + ')')();
              edits[key] = String(result);
            } catch {
              // If formula fails, keep current value
            }
          }
          break;
      }
    });

    onPersistProperty("manualData", "edits", JSON.stringify(edits));
    setBulkOperationsOpen(false);
  }, [selectedRange.cells, settings.manualData, cellMap, onPersistProperty]);

  const hasLockedCellsInSelection = useMemo(() => {
    const locks = JSON.parse(settings.manualData.locks || "[]") as string[];
    return selectedRange.cells.some(cell => locks.includes(cell.rowKey));
  }, [selectedRange.cells, settings.manualData.locks]);

  const intelliSenseContextObj = useMemo(() => ({
    measures: measures,
    calculatedMeasures: intelliSenseContext?.calculatedMeasures || [],
    columns: columns,
    rows: rows,
    rowHierarchyLevels: intelliSenseContext?.rowHierarchyLevels || [],
    columnHierarchyLevels: intelliSenseContext?.columnHierarchyLevels || [],
  }), [measures, columns, rows, intelliSenseContext]);

  const designStyles = useMemo((): React.CSSProperties => {
    const effect = settings.appearance.backgroundEffect || "none";
    const gradientStart = settings.appearance.gradientStart || "#f8fbff";
    const gradientEnd = settings.appearance.gradientEnd || "#e8f1ff";
    const gradientAngle = settings.appearance.gradientAngle ?? 135;
    const backgroundImage = settings.appearance.backgroundImage?.trim();
    const gradientLayer = `linear-gradient(${gradientAngle}deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
    const imageLayer = backgroundImage ? `url(${backgroundImage})` : "";

    const backgroundImageValue =
      effect === "gradient" ? gradientLayer :
      effect === "image" ? (imageLayer || "none") :
      effect === "hybrid" ? [gradientLayer, imageLayer].filter(Boolean).join(", ") :
      imageLayer || "none";

    const layoutStyle = settings.appearance.layoutStyle || "standard";
    return {
      backgroundImage: backgroundImageValue,
      backgroundSize: effect === "image" ? "cover" : effect === "hybrid" ? "cover, cover" : "cover",
      backgroundPosition: "center",
      borderRadius: settings.appearance.cornerRadius,
      overflow: "hidden",
      position: "relative",
      backgroundColor: settings.appearance.surfaceColor === defaultSettings.appearance.surfaceColor ? "var(--mx-surface)" : settings.appearance.surfaceColor,
      boxShadow:
        layoutStyle === "floating" ? "0 24px 70px rgba(15, 23, 42, 0.18)" :
        layoutStyle === "framed" ? "inset 0 0 0 1px rgba(255,255,255,0.14), 0 18px 48px rgba(15, 23, 42, 0.14)" :
        layoutStyle === "spotlight" ? "0 0 0 1px rgba(148,163,184,0.14), 0 32px 80px rgba(2, 132, 199, 0.18)" :
        undefined,
      transform: layoutStyle === "floating" ? "translateY(4px)" : undefined,
    };
  }, [settings.appearance]);

  const glassEffect = useMemo((): React.CSSProperties => {
    const overlayOpacity = Math.max(0, Math.min(1, (settings.appearance.overlayOpacity ?? 0) / 100));
    return {
      background: settings.appearance.glassmorphism
        ? `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.1)), ${toAlphaColor(settings.appearance.overlayColor, Math.max(overlayOpacity, 0.24), "rgba(15,23,42,0.24)")}`
        : settings.appearance.overlayColor
          ? toAlphaColor(settings.appearance.overlayColor, overlayOpacity, "transparent")
          : "transparent",
      opacity: settings.appearance.glassmorphism ? Math.max(0.2, overlayOpacity || 0.28) : overlayOpacity,
      backdropFilter: `blur(${settings.appearance.backgroundBlur || 0}px) saturate(${settings.appearance.glassmorphism ? 1.2 : 1})`,
      WebkitBackdropFilter: `blur(${settings.appearance.backgroundBlur || 0}px) saturate(${settings.appearance.glassmorphism ? 1.2 : 1})`,
      border: settings.appearance.glassmorphism ? "1px solid rgba(255, 255, 255, 0.14)" : undefined,
      boxShadow: settings.appearance.glassmorphism ? "inset 0 1px 0 rgba(255,255,255,0.18)" : undefined,
    };
  }, [settings.appearance, toAlphaColor]);

  const surfaceAlpha = Math.max(0, Math.min(1, (settings.appearance.surfaceOpacity ?? 92) / 100));
  // While the canvas surface is still the default, follow the theme's surface token so dark
  // and tinted presets reach the grid; a color the user picked is used as-is.
  const surfaceIsDefault = settings.appearance.surfaceColor === defaultSettings.appearance.surfaceColor;
  const surfaceTone = (alpha: number, fallback: string) => surfaceIsDefault
    ? `color-mix(in srgb, var(--mx-surface) ${Math.round(alpha * 100)}%, transparent)`
    : toAlphaColor(settings.appearance.surfaceColor, alpha, fallback);
  const shellBackground = settings.appearance.glassmorphism
    ? surfaceTone(Math.max(0.08, surfaceAlpha - 0.34), "rgba(255,255,255,0.12)")
    : surfaceTone(surfaceAlpha, settings.appearance.surfaceColor);
  const shellStrongBackground = settings.appearance.glassmorphism
    ? surfaceTone(Math.max(0.12, surfaceAlpha - 0.2), "rgba(255,255,255,0.16)")
    : surfaceTone(Math.min(1, surfaceAlpha + 0.04), settings.appearance.surfaceColor);
  const gridCellBackground = surfaceAlpha < 0.98
    ? "transparent"
    : surfaceTone(0.86, settings.appearance.surfaceColor);
  const rowBandBackground = surfaceAlpha < 0.98
    ? surfaceTone(Math.min(0.18, surfaceAlpha * 0.28), "transparent")
    : "var(--mx-surface-subtle)";
  const quietGrandTotal = settings.totals.grandTotalBackgroundColor === defaultSettings.totals.grandTotalBackgroundColor;
  const quietSubtotal = settings.totals.subtotalBackgroundColor === defaultSettings.totals.subtotalBackgroundColor;
  // An untouched default resolves to the theme token here on the container (custom properties
  // defined on the root would resolve before the theme class applies); an edited value wins.
  const themed = (value: string, fallback: string, token: string) => (value === fallback ? `var(${token})` : value);
  const structuralStyleVars = useMemo(() => ({
    // Untouched default fills give way to the quiet look: totals are marked by
    // weight and rule lines (see .mx-quiet-totals) instead of gray bands.
    "--mx-gt-bg": quietGrandTotal ? "transparent" : settings.totals.grandTotalBackgroundColor,
    "--mx-grandtotal-bg": quietGrandTotal ? "transparent" : settings.totals.grandTotalBackgroundColor,
    "--mx-gt-fg": themed(settings.totals.grandTotalTextColor, defaultSettings.totals.grandTotalTextColor, "--mx-text"),
    "--mx-gt-fw": settings.totals.grandTotalBold ? 700 : 400,
    "--mx-st-bg": quietSubtotal ? "transparent" : settings.totals.subtotalBackgroundColor,
    "--mx-subtotal-bg": quietSubtotal ? "transparent" : settings.totals.subtotalBackgroundColor,
    "--mx-st-fg": themed(settings.totals.subtotalTextColor, defaultSettings.totals.subtotalTextColor, "--mx-text"),
    "--mx-st-fw": settings.totals.subtotalBold ? 700 : 400,
    "--mx-row-parent-fw": settings.headers.rowHeaderParentBold ? 700 : 400,
    "--mx-row-parent-color": themed(settings.headers.rowHeaderParentColor, defaultSettings.headers.rowHeaderParentColor, "--mx-text"),
    "--mx-row-child-color": themed(settings.headers.rowHeaderChildColor, defaultSettings.headers.rowHeaderChildColor, "--mx-text-secondary"),
    "--mx-col-l0-color": themed(settings.headers.colHeaderLevel0Color, defaultSettings.headers.colHeaderLevel0Color, "--mx-text"),
    "--mx-col-l1-color": themed(settings.headers.colHeaderLevel1Color, defaultSettings.headers.colHeaderLevel1Color, "--mx-text-secondary"),
    "--mx-col-leaf-color": themed(settings.headers.colHeaderLeafColor, defaultSettings.headers.colHeaderLeafColor, "--mx-text-secondary"),
    "--mx-header-bg": themed(settings.headers.backgroundColor, defaultSettings.headers.backgroundColor, "--mx-surface-subtle"),
    "--mx-header-fg": themed(settings.headers.textColor, defaultSettings.headers.textColor, "--mx-text"),
    "--mx-cell-bg": gridCellBackground,
    "--mx-row-odd": rowBandBackground,
    "--mx-row-header-bg": shellStrongBackground,
  } as React.CSSProperties), [gridCellBackground, rowBandBackground, shellStrongBackground, settings.headers, settings.totals, quietGrandTotal, quietSubtotal]);

  return (
    <div className={`matrix-container ${quietGrandTotal || quietSubtotal ? "mx-quiet-totals" : ""} ${formulaBarEditMode ? "formula-edit-mode" : ""} ${(settings.appearance as any).glassmorphism ? "is-glassmorphic" : ""}`} style={{ height, ...designStyles, ...structuralStyleVars }} onClick={handleBackgroundClick} onScroll={handleContainerScroll}>
      <div style={{ position: "absolute", inset: 0, ...glassEffect, pointerEvents: "none", zIndex: 0 }} />
      {allowInteractions && (
        <div
          className={`matrix-formula-shell ${showFormulaBar ? "has-cell" : "is-idle"}`}
          style={{ height: FORMULA_BAR_HEIGHT, background: shellStrongBackground }}
        >
          <FormulaBar
            ref={formulaBarRef}
            value={activeCell?.value || ""}
            activeCellLabel={activeCell?.label || ""}
            disabled={!showFormulaBar}
            onCommit={handleCommitEdit}
            onCancel={handleCancelEdit}
            context={intelliSenseContextObj}
            onEditModeChange={setFormulaBarEditMode}
            onInsertReference={() => { }}
          />
        </div>
      )}
      <div ref={headerAreaRef} className="matrix-header-area" style={{ height: columnHeaderHeight, position: "relative", zIndex: 1, background: shellStrongBackground }}>
        <div
          className="matrix-col-headers"
          style={{ height: columnHeaderHeight }}
        >
            <MergedColumnHeaders
              columns={columns}
              measures={measures}
              arrangement={((settings.general as any).columnArrangement ?? "time-then-measure") as ColumnArrangement}
              sortConfig={sortConfig}
              onSort={onSort}
              onContextMenu={(e, c, m) => handleContextMenu(e, undefined, c, m)}
              onColumnReorder={handleColumnReorder}
              allowInteractions={allowInteractions}
              rowHeaderWidth={rowHeaderWidth}
              columnWidth={safeColumnWidthPx}
              scrollLeft={scrollLeft}
              totalContentWidth={totalContentWidth}
              selectedColumnKeys={selectedColumnKeysSet}
              onColumnHeaderClick={handleColumnHeaderClick}
              onStartResize={startColumnResize}
              onStartRowHeaderResize={startRowHeaderWidthResize}
              colFormats={parseColFormats(settings.manualData.colFormats)}
              colWidths={colWidths}
              gridColumns={gridColumns}
              settings={settings}
              labelOverrides={labelOverrides}
              columnLevelNames={columnLevelNames}
            />
        </div>
      </div>

      <MatrixSearch
        isOpen={findOpen}
        onClose={closeFind}
        target={searchTarget}
        onNavigateToResult={handleFindNavigate}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}

      <div
        className={`matrix-body-area ${hasVScroll ? 'has-v-scroll' : ''} ${hasHScroll ? 'has-h-scroll' : ''}`}
        style={{ height: viewportHeight, position: "relative", zIndex: 1, background: shellBackground }}
        onScroll={handleScroll}
        onWheel={handleMatrixWheel}
        onKeyDown={handleMatrixKeyDown}
        onMouseDownCapture={handleMatrixPointerDown}
        ref={scrollContainerRef}
        tabIndex={0}
        role="region"
        aria-label="Matrix data grid"
      >
        <div
          className="matrix-row-headers"
          ref={rowHeadersRef}
          style={{
            width: rowHeaderWidth,
            height: totalContentHeight,
            zIndex: 80,
            opacity: 1,
            background: shellStrongBackground,
            backdropFilter: settings.appearance.glassmorphism ? `blur(${Math.max(6, settings.appearance.backgroundBlur || 0)}px)` : undefined,
            top: "auto",
          }}
        >
          <div
            className="matrix-row-headers-inner"
            ref={rowHeadersInnerRef}
            style={{ height: totalContentHeight }}
          >
            {visibleRowItems.map(({ row, actualIndex, top }) => {
              const isSelected = selectedRowKeys.has(row.key);
              const prevRow = actualIndex > 0 ? rows[actualIndex - 1] : undefined;
              const rowFormat = rowFormats[row.key] || (row.calcRowDefId ? rowFormats[`__calcrow__${row.calcRowDefId}`] || rowFormats[row.calcRowDefId] : undefined);
              const breakStyle = prevRow && prevRow.path?.[0] !== row.path?.[0]
                ? settings.layout.rowBreak === "section"
                  ? "8px solid var(--mx-canvas-bg, transparent)"
                  : settings.layout.rowBreak === "page"
                    ? "12px solid var(--mx-canvas-bg, transparent)"
                    : undefined
                : undefined;

              // Build sparkline series for this row across leaf columns for the configured measure
              let sparklineValues: (number | null)[] | undefined;
              let sparklineLabels: string[] | undefined;
              if (settings.sparklines.enabled && sparklineColumns.length > 0 && measures.length > 0) {
                const mIdx = Math.max(0, Math.min(measures.length - 1, sparklineMeasureIndex));
                const values: (number | null)[] = [];
                const labels: string[] = [];
                for (const col of sparklineColumns) {
                  const cell = getCellValue(cellMap, row.key, col.key, mIdx);
                  values.push(cell?.value ?? null);
                  labels.push(col.label);
                }
                if (values.some(v => v !== null)) {
                  sparklineValues = values;
                  sparklineLabels = labels;
                }
              }

              return (
                <RowHeader
                  key={row.key}
                  row={row}
                  index={actualIndex}
                  settings={settings}
                  tooltipService={tooltipService}
                  isSelected={isSelected}
                  isFormatSelected={selectedRowKeysForFormatSet.has(row.key)}
                  style={{
                    ...getRowStyle(settings, actualIndex, row.isSubtotal, row.isGrandTotal, isSelected),
                    ...(rowFormat?.backgroundColor ? { backgroundColor: rowFormat.backgroundColor } : {}),
                    ...(rowFormat?.textColor ? { color: rowFormat.textColor } : {}),
                    ...(rowFormat?.bold !== undefined ? { fontWeight: rowFormat.bold ? 700 : 400 } : {}),
                    ...(rowFormat?.italic !== undefined ? { fontStyle: rowFormat.italic ? "italic" : "normal" } : {}),
                    ...(rowFormat?.underline !== undefined ? { textDecoration: rowFormat.underline ? "underline" : "none" } : {}),
                    ...(breakStyle ? { borderTop: breakStyle } : {}),
                    ...(breakStyle ? { boxSizing: "border-box" } : {}),
                    position: "absolute",
                    top,
                    height: safeRowHeightPx,
                    width: rowHeaderWidth,
                  }}
                  onToggleExpand={onToggleRowExpand}
                  onClick={(e) => {
                    const ctrl = e.ctrlKey || e.metaKey;
                    const shift = e.shiftKey;
                    if (ctrl || shift) {
                      handleRowHeaderClick(row, { ctrl, shift });
                    } else {
                      handleRowClick(e, row);
                      // Also select for format on plain click
                      handleRowHeaderClick(row, { ctrl: false, shift: false });
                    }
                  }}
                  onStartResize={startRowResize}
                  sparklineValues={sparklineValues}
                  sparklineLabels={sparklineLabels}
                  onContextMenu={(e, r) => handleContextMenu(e, r)}
                  onDragStart={handleRowDragStart}
                  onDragOver={handleRowDragOver}
                  onDrop={handleRowDrop}
                  onDragEnd={handleRowDragEnd}
                  isDragOver={dragOverRowKey === row.key}
                  dropPosition={dragOverRowKey === row.key ? dropPosition : null}
                  sparklineGlobalMin={sparklineScale.min}
                  sparklineGlobalMax={sparklineScale.max}
                  labelOverrides={labelOverrides}
                  hideExpandIcon={hiddenRowExpandIconSet.has(row.key)}
                  isFindMatch={!!findMatch && findMatch.type === "label" && findMatch.rowKey === row.key}
                />
              );
            })}
          </div>
        </div>

        <div
          className="matrix-cells"
          style={{ width: totalContentWidth, minWidth: totalContentWidth }}
        >
          <div
            className="matrix-cells-inner"
            style={{
              width: totalContentWidth,
              height: totalContentHeight,
              position: "relative",
            }}
          >
            {visibleRowItems.map(({ row, actualIndex, top }) => {
              const prevRowKey = actualIndex > 0 ? rows[actualIndex - 1]?.key ?? null : null;
              const isSelected = selectedRowKeys.has(row.key);
              const showRowBreak = actualIndex > 0
                && rows[actualIndex - 1]?.path?.[0] !== row.path?.[0]
                && settings.layout.rowBreak !== "none";

              return (
                <Row
                  key={row.key}
                  row={row}
                  rowIndex={actualIndex}
                  topOffset={top}
                  prevRowKey={prevRowKey}
                  visibleColumns={renderedGridColumns}
                  visibleRange={renderedColumnRange}
                  cellMap={cellMap}
                  measures={measures}
                  settings={settings}
                  isSelected={isSelected}
                  isFormatSelected={selectedRowKeysForFormatSet.has(row.key)}
                  showRowBreak={showRowBreak}
                  sparklineMeasureIndex={sparklineMeasureIndex}
                  rowHeight={safeRowHeightPx}
                  columnWidth={safeColumnWidthPx}
                  getCellStyle={getCellStyle}
                  getDataBarRange={getDataBarRange}
                  onClick={(e) => {
                    handleRowClick(e, row);
                  }}
                  onContextMenu={(e, r, c, m) => handleContextMenu(e, r, c, m)}
                  onCellClick={(c, m, ci) => handleCellSelect(row, c, m, actualIndex, ci)}
                  activeCell={activeCell}
                  findMatch={findMatch && findMatch.type === "value" && findMatch.rowKey === row.key ? findMatch : null}
                  selectedColumnKeys={selectedColumnKeysSet}
                  columnWidthMap={columnWidthMap}
                />
              );
            })}
          </div>
        </div>
      </div>

      {hasHScroll && (
        <div
          className="matrix-horizontal-scrollbar-shell is-active"
          style={{ height: HORIZONTAL_SCROLLBAR_HEIGHT }}
          aria-hidden="true"
        >
          <div
            className="matrix-horizontal-scrollbar-spacer"
            style={{ width: rowHeaderWidth }}
          />
          <div
            ref={horizontalScrollRef}
            className="matrix-horizontal-scrollbar"
            style={{ width: viewportWidth, height: HORIZONTAL_SCROLLBAR_HEIGHT }}
            onScroll={handleHorizontalScroll}
          >
            <div
              className="matrix-horizontal-scrollbar-content"
              style={{ width: Math.max(totalContentWidth, viewportWidth) + vScrollbarPx, height: 1 }}
            />
          </div>
        </div>
      )}

      {bulkOperationsOpen && (
        <BulkOperationsPanel
          isOpen={bulkOperationsOpen}
          selectedCells={selectedRange.cells}
          onClose={() => setBulkOperationsOpen(false)}
          onApply={handleApplyBulkOperation}
          hasLockedCells={hasLockedCellsInSelection}
        />
      )}
    </div>
  );
};
