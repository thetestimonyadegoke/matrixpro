import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import powerbi from "powerbi-visuals-api";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue, computeGlobalStats } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { SortConfig } from "../model/sorting";
import { SelectionState, SelectionManagerWrapper } from "../powerbi/selection";
import {
  ViewportRange,
  ViewportConfig,
  createColumnWidthMap,
  setColumnWidth,
  getTotalWidthWithVariableWidths,
  computeVisibleRangeWithVariableWidths,
} from "../virtualization/viewport";
import { ScrollManager } from "../virtualization/scroll";
import { Row } from "./Row";
import { RowHeader } from "./RowHeader";
import { MergedColumnHeaders, ColumnArrangement } from "./MergedColumnHeaders";
import { CellStyle, evaluateCellStyle, EvaluationContext } from "../format/conditional";
import { parseColFormats } from "../format/directFormats";
import { getRowStyle } from "../format/styles";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { ContextMenu, ContextMenuItem, buildCellMenuItems, buildRowHeaderMenuItems, buildColumnHeaderMenuItems } from "./ContextMenu";
import { FormulaBar, FormulaBarRef } from "./FormulaBar";
import { BulkOperationsPanel, BulkOperationType } from "./BulkOperationsPanel";
import { generateCellLabel, formatCellReferenceForFormula } from "../utils/cellNaming";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";

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
  onEditCalcRow?: (rowKey: string) => void;
  onDeleteCalcRow?: (rowKey: string) => void;
}

const ROW_BUFFER = 10;
const COL_BUFFER = 2;

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
  onEditCalcRow,
  onDeleteCalcRow,
}) => {
  type GridColumn = {
    key: string;
    col: FlattenedNode;
    measure: MeasureInfo;
    measureIndex: number;
  };

  type VisualColumnFrequency = "all" | "yearly" | "quarterly" | "specific";
  type VisualColumnPosition = "normal" | "beginning" | "end" | "specific";
  type VisualColumnDefinition = {
    id: string;
    enabled?: boolean;
    sourceMeasureId?: string;
    sourceMeasureName?: string;
    sourceMeasureIndex?: number;
    frequency?: VisualColumnFrequency;
    position?: VisualColumnPosition;
    positionIndex?: number;
    specificColumnKeys?: string[];
    hierarchyLevel?: number;
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const rowHeadersRef = useRef<HTMLDivElement>(null);

  const formulaBarRef = useRef<FormulaBarRef>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(84);

  useEffect(() => {
    if (!contentRef.current) return () => {};
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Measure the natural height of the content
        const height = Math.max(56, entry.contentRect.height);
        setMeasuredHeaderHeight(height);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

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

  // Manual edit history for undo/redo
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState<number>(-1);

  // Initialize history with current edits snapshot on first render
  useEffect(() => {
    if (editHistoryIndex === -1) {
      const initial = settings.manualData.edits || "{}";
      setEditHistory([initial]);
      setEditHistoryIndex(0);
    }
  }, [settings.manualData.edits, editHistoryIndex]);

  // Drag & Drop State
  const [draggedRowKey, setDraggedRowKey] = useState<string | null>(null);
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "child" | null>(null);

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
  }, [formulaBarEditMode, columns, measures, cellMap, settings.manualData.edits]);

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

    const nextJson = JSON.stringify(edits);

    // Push new snapshot onto history, trimming any redo branch
    setEditHistory(prev => {
      if (editHistoryIndex === -1) {
        const base = [prevJson, nextJson];
        setEditHistoryIndex(1);
        return base;
      }
      const trimmed = prev.slice(0, editHistoryIndex + 1);
      const next = [...trimmed, nextJson];
      setEditHistoryIndex(next.length - 1);
      return next;
    });

    onPersistProperty("manualData", "edits", nextJson);
    // Keep selection but update value
    setActiveCell(prev => prev ? { ...prev, value: newValue } : null);
  }, [activeCell, onPersistProperty, settings.manualData.edits, editHistoryIndex]);

  const handleCancelEdit = useCallback(() => {
    // Just reset the input to original value
    const key = activeCell ? `${activeCell.rowKey}|${activeCell.colKey}|${activeCell.measureIndex}` : "";
    const edits = JSON.parse(settings.manualData.edits || "{}");
    const editValue = edits[key];
    const cellValue = activeCell ? getCellValue(cellMap, activeCell.rowKey, activeCell.colKey, activeCell.measureIndex) : null;

    setActiveCell(prev => prev ? {
      ...prev,
      value: editValue || (cellValue?.value !== null ? String(cellValue?.value) : "")
    } : null);
  }, [activeCell, cellMap, settings.manualData.edits]);

  const handleUndo = useCallback(() => {
    setEditHistoryIndex(prevIdx => {
      if (prevIdx <= 0) {
        return prevIdx;
      }
      const newIdx = prevIdx - 1;
      const targetJson = editHistory[newIdx] ?? "{}";
      onPersistProperty("manualData", "edits", targetJson);
      return newIdx;
    });
  }, [editHistory, onPersistProperty]);

  const handleRedo = useCallback(() => {
    setEditHistoryIndex(prevIdx => {
      if (prevIdx < 0 || prevIdx >= editHistory.length - 1) {
        return prevIdx;
      }
      const newIdx = prevIdx + 1;
      const targetJson = editHistory[newIdx] ?? (settings.manualData.edits || "{}");
      onPersistProperty("manualData", "edits", targetJson);
      return newIdx;
    });
  }, [editHistory, onPersistProperty, settings.manualData.edits]);

  const handleRowDragStart = useCallback((e: React.DragEvent, rowKey: string) => {
    setDraggedRowKey(rowKey);
    e.dataTransfer.setData("text/plain", rowKey);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, rowKey: string) => {
    e.preventDefault();
    if (rowKey === draggedRowKey) return;

    // Auto-scroll when dragging near edges
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const scrollSpeed = 15;
      const threshold = 50;

      if (e.clientY < rect.top + threshold) {
        container.scrollTop -= scrollSpeed;
      } else if (e.clientY > rect.bottom - threshold) {
        container.scrollTop += scrollSpeed;
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

  const handleRowDragEnd = useCallback(() => {
    if (draggedRowKey && dragOverRowKey && dropPosition && draggedRowKey !== dragOverRowKey) {
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

      // Remove dragged row and all its descendants from current order
      currentOrder = currentOrder.filter((k: string) => !draggedKeysToMove.includes(k));

      // Find target position in current order
      const targetIdx = currentOrder.indexOf(dragOverRowKey);

      if (targetIdx === -1) {
        // Target not in order, append dragged rows
        currentOrder.push(...draggedKeysToMove);
      } else {
        // Insert at appropriate position
        let insertIdx: number;
        if (dropPosition === "before") {
          insertIdx = targetIdx;
        } else if (dropPosition === "after") {
          // If inserting after, we need to skip past the target's descendants
          insertIdx = targetIdx + 1;
          const targetRowObj = rows.find(r => r.key === dragOverRowKey);
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
        currentOrder.splice(insertIdx, 0, ...draggedKeysToMove);
      }

      onPersistProperty("manualData", "rowOrder", JSON.stringify(currentOrder));
    }
    setDraggedRowKey(null);
    setDragOverRowKey(null);
    setDropPosition(null);
  }, [draggedRowKey, dragOverRowKey, dropPosition, settings.manualData.rowOrder, onPersistProperty, rows]);

  // Compute row height based on density setting
  const densityRowHeight = useMemo(() => {
    if (settings.theme.density === "compact") {
      return 24;
    }
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

  // Column header height based on merged header rows (hierarchy levels + measure row)
  // Column header height based on measured content height
  const columnHeaderHeight = measuredHeaderHeight;

  const FORMULA_BAR_HEIGHT = 40;
  const HORIZONTAL_SCROLLBAR_HEIGHT = 24;
  const formulaBarHeight = FORMULA_BAR_HEIGHT;

  const minRowHeightPx = useMemo(() => {
    const headerFontPx = Math.max(8, Math.round(settings.headers.fontSize || 0));
    const valueFontPx = Math.max(8, Math.round(settings.values.fontSize || 0));
    const lineBoxPx = Math.ceil(Math.max(headerFontPx, valueFontPx) * 1.2);
    const chromePx = 8;
    return Math.max(18, lineBoxPx + chromePx);
  }, [settings.headers.fontSize, settings.values.fontSize]);

  const safeRowHeightPx = Math.max(minRowHeightPx, Math.round(rowHeightPx || 0));
  const safeColumnWidthPx = Math.max(60, Math.round(columnWidthPx || 0));

  const visualColumnRules = useMemo(() => {
    try {
      const parsed = JSON.parse(settings.calculations.visualColumns || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((rule: VisualColumnDefinition) => rule && rule.enabled !== false)
        : [];
    } catch {
      return [] as VisualColumnDefinition[];
    }
  }, [settings.calculations.visualColumns]);

  const gridColumns: GridColumn[] = useMemo(() => {
    if (columns.length === 0 || measures.length === 0) return [];

    // Filter columns to only include those that should have a corresponding data cell in the grid.
    // These are truly leaf columns OR nodes that are collapsed (acting as leaves) OR subtotal nodes.
    const visualLeafs: FlattenedNode[] = [];
    const seenKeys = new Set<string>(); // Track keys to prevent duplicates

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const nextCol = columns[i + 1];
      const isLast = i === columns.length - 1;

      // It's a leaf for rendering purposes if:
      // 1. It's a true leaf node (isLeaf=true)
      // 2. It's a subtotal node (always acts as a leaf in the grid columns)
      // 3. The next node in the flattened list is not a child of this node (meaning this node is collapsed)
      if (col.isLeaf || col.isSubtotal || isLast || nextCol.level <= col.level) {
        // Skip if we've already seen this key (prevents duplicates)
        if (seenKeys.has(col.key)) {
          continue;
        }
        seenKeys.add(col.key);
        visualLeafs.push(col);
      }
    }

    const firstLeafKey = visualLeafs[0]?.key;
    const lastLeafKey = visualLeafs[visualLeafs.length - 1]?.key;
    const yearKey = (col: FlattenedNode) => String(col.path?.[0] ?? col.label ?? "");
    const quarterKey = (col: FlattenedNode) => {
      const label = col.path?.map(String).join(" ") || col.label;
      const explicit = label.match(/q([1-4])/i);
      if (explicit) return `${yearKey(col)}::Q${explicit[1]}`;
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const month = monthNames.findIndex(monthName => String(col.path?.[col.path.length - 1] ?? col.label).toLowerCase().startsWith(monthName));
      return `${yearKey(col)}::Q${month >= 0 ? Math.floor(month / 3) + 1 : 1}`;
    };
    const isYearEnd = (col: FlattenedNode, index: number) => {
      if (col.isSubtotal || col.isGrandTotal) return true;
      const next = visualLeafs[index + 1];
      return !next || yearKey(next) !== yearKey(col);
    };
    const isQuarterEnd = (col: FlattenedNode, index: number) => {
      if (col.isSubtotal || col.isGrandTotal) return true;
      const next = visualLeafs[index + 1];
      return !next || quarterKey(next) !== quarterKey(col);
    };
    const ruleForMeasure = (measure: MeasureInfo, measureIndex: number) => {
      return visualColumnRules.find(rule => {
        if (rule.sourceMeasureIndex === measureIndex) return true;
        if (rule.sourceMeasureId && rule.sourceMeasureId === measure.id) return true;
        if (rule.sourceMeasureName && rule.sourceMeasureName.toLowerCase() === measure.name.toLowerCase()) return true;
        return false;
      });
    };
    const shouldShowMeasureAtColumn = (
      measure: MeasureInfo,
      measureIndex: number,
      col: FlattenedNode,
      colIndex: number
    ) => {
      const rule = ruleForMeasure(measure, measureIndex);
      if (!rule) return true;
      if (rule.hierarchyLevel !== undefined && col.level !== rule.hierarchyLevel) return false;
      if (rule.position === "beginning" && col.key !== firstLeafKey) return false;
      if (rule.position === "end" && col.key !== lastLeafKey) return false;
      if (rule.position === "specific" && rule.positionIndex !== undefined && colIndex !== rule.positionIndex) return false;

      switch (rule.frequency || "all") {
        case "yearly":
          return isYearEnd(col, colIndex);
        case "quarterly":
          return isQuarterEnd(col, colIndex);
        case "specific":
          return !!rule.specificColumnKeys?.includes(col.key);
        case "all":
        default:
          return true;
      }
    };

    let baseResult: GridColumn[] = [];
    for (let colIndex = 0; colIndex < visualLeafs.length; colIndex++) {
      const col = visualLeafs[colIndex];
      for (let m = 0; m < measures.length; m++) {
        if (!shouldShowMeasureAtColumn(measures[m], m, col, colIndex)) continue;
        baseResult.push({
          key: `${col.key}::m${m}`,
          col,
          measure: measures[m],
          measureIndex: m,
        });
      }
    }

    const colOrder = JSON.parse(settings.manualData.colOrder || "[]");
    if (colOrder.length > 0) {
      const sorted: GridColumn[] = [];
      const used = new Set<string>();

      for (const key of colOrder) {
        // If the key is a measure key (starts with "m_"), we filter for all columns with this measure.
        if (key.startsWith("m_")) {
          const mIdx = parseInt(key.replace("m_", ""), 10);
          if (!isNaN(mIdx)) {
            const matches = baseResult.filter(c => c.measureIndex === mIdx);
            for (const match of matches) {
              if (!used.has(match.key)) {
                sorted.push(match);
                used.add(match.key);
              }
            }
          }
        } else {
          // Otherwise, it's a column key. Filter for all measures in this column.
          const matches = baseResult.filter(c => c.col.key === key);
          for (const match of matches) {
            if (!used.has(match.key)) {
              sorted.push(match);
              used.add(match.key);
            }
          }
        }
      }

      // Add remaining columns not in manual order
      for (const col of baseResult) {
        if (!used.has(col.key)) {
          sorted.push(col);
        }
      }
      baseResult = sorted;
    }

    // Apply hidden columns filter
    let finalResult = baseResult;
    const hiddenSet = new Set(
      (() => { try { return JSON.parse(settings.manualData.hiddenCols || "[]") as string[]; } catch { return []; } })()
    );
    if (hiddenSet.size > 0) {
      finalResult = finalResult.filter(gc => {
        // hide by measure key ("m_N")
        if (hiddenSet.has(`m_${gc.measureIndex}`)) return false;
        // hide by column key
        if (hiddenSet.has(gc.col.key)) return false;
        return true;
      });
    }

    return finalResult;
  }, [columns, measures, settings.manualData.colOrder, settings.manualData.hiddenCols, visualColumnRules]);

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
  const viewportHeight = Math.max(
    0,
    rawViewportHeight - HORIZONTAL_SCROLLBAR_HEIGHT
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

  const handleColumnHeaderClick = useCallback((
    columnKey: string,
    measureIndex: number,
    modifiers: { ctrl: boolean; shift: boolean }
  ) => {
    if (!allowInteractions) return;
    const key = `${columnKey}::m${measureIndex}`;
    let next: string[];
    
    if (modifiers.ctrl || modifiers.shift) {
      if (selectedColumnKeysArr?.includes(key)) {
        next = selectedColumnKeysArr.filter(k => k !== key);
      } else {
        next = [...(selectedColumnKeysArr || []), key];
      }
    } else {
      // Toggle if already selected, or select single
      if (selectedColumnKeysArr?.length === 1 && selectedColumnKeysArr[0] === key) {
        next = [];
      } else {
        next = [key];
      }
    }
    
    onColumnSelectionChange?.(next);
  }, [allowInteractions, selectedColumnKeysArr, onColumnSelectionChange]);

  const handleRowHeaderClick = useCallback((
    row: FlattenedNode,
    modifiers: { ctrl: boolean; shift: boolean }
  ) => {
    if (!allowInteractions) return;
    const key = row.key;
    let next: string[];

    if (modifiers.ctrl || modifiers.shift) {
      if (selectedRowKeysForFormatArr?.includes(key)) {
        next = selectedRowKeysForFormatArr.filter(k => k !== key);
      } else {
        next = [...(selectedRowKeysForFormatArr || []), key];
      }
    } else {
      if (selectedRowKeysForFormatArr?.length === 1 && selectedRowKeysForFormatArr[0] === key) {
        next = [];
      } else {
        next = [key];
      }
    }
    
    onRowSelectionForFormatChange?.(next);
  }, [allowInteractions, selectedRowKeysForFormatArr, onRowSelectionForFormatChange]);

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
        () => console.log("Export triggered"),
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
      setContextMenu({ x, y, type: "cell", items });
    } else if (row) {
      // Row Header Context Menu
      const items = buildRowHeaderMenuItems(
        () => onExpandAllUnder?.(row.key),
        () => onCollapseAllUnder?.(row.key),
        () => onOpenCalcRowWizard?.(row.key),
        () => {
          const newLabel = prompt("Enter new label:", row.label);
          if (newLabel !== null) {
            const labels = JSON.parse(settings.manualData.labelOverrides || "{}");
            labels[row.key] = newLabel;
            onPersistProperty("manualData", "labelOverrides", JSON.stringify(labels));
          }
        },
        () => console.log("Move to Group triggered"),
        () => {
          const locks = JSON.parse(settings.manualData.locks || "[]");
          const newLocks = locks.includes(row.key) ? locks.filter((l: string) => l !== row.key) : [...locks, row.key];
          onPersistProperty("manualData", "locks", JSON.stringify(newLocks));
        },
        JSON.parse(settings.manualData.locks || "[]").includes(row.key),
        !!row.isCalculatedRow,
        () => onHideRow?.(row.key),
        () => onEditCalcRow?.(row.key),
        () => onDeleteCalcRow?.(row.key),
        (selectionManager && row.selectionId)
          ? () => selectionManager.showContextMenu(row.selectionId!, { x, y })
          : undefined
      );
      setContextMenu({ x, y, type: "rowHeader", items });
    } else if (colKey !== undefined && measureIndex !== undefined) {
      // Column Header Context Menu
      const items = buildColumnHeaderMenuItems(
        () => onSort(colKey, measureIndex),
        () => onSort(colKey, measureIndex),
        () => {
          // Move Left
          let colOrder = JSON.parse(settings.manualData.colOrder || "[]");
          const idx = gridColumns.findIndex(c => c.key === `${colKey}::m${measureIndex}`);
          if (idx > 0) {
            const target = gridColumns[idx - 1].key;
            colOrder = colOrder.filter((k: string) => k !== `${colKey}::m${measureIndex}`);
            const targetIdx = colOrder.indexOf(target);
            colOrder.splice(targetIdx === -1 ? 0 : targetIdx, 0, `${colKey}::m${measureIndex}`);
            onPersistProperty("manualData", "colOrder", JSON.stringify(colOrder));
          }
        },
        () => {
          // Move Right
          let colOrder = JSON.parse(settings.manualData.colOrder || "[]");
          const idx = gridColumns.findIndex(c => c.key === `${colKey}::m${measureIndex}`);
          if (idx < gridColumns.length - 1) {
            const target = gridColumns[idx + 1].key;
            colOrder = colOrder.filter((k: string) => k !== `${colKey}::m${measureIndex}`);
            const targetIdx = colOrder.indexOf(target);
            colOrder.splice(targetIdx === -1 ? colOrder.length : targetIdx + 1, 0, `${colKey}::m${measureIndex}`);
            onPersistProperty("manualData", "colOrder", JSON.stringify(colOrder));
          }
        },
        () => onPersistProperty("general", "freezeFirstColumn", !settings.general.freezeFirstColumn),
        () => onAddQuickVariance?.(colKey, measureIndex),
        settings.general.freezeFirstColumn
      );
      setContextMenu({ x, y, type: "columnHeader", items });
    }
  }, [allowInteractions, cellMap, onToggleRowExpand, onOpenCalcMeasureWizard, onOpenCalcRowWizard, onSort, onPersistProperty, settings.manualData, settings.general, gridColumns, onAddQuickVariance, selectionManager, onExpandAllUnder, onCollapseAllUnder]);

  const visibleRange: ViewportRange = useMemo(() => {
    return computeVisibleRangeWithVariableWidths(scrollTop, scrollLeft, viewportConfig, columnWidthMap);
  }, [scrollTop, scrollLeft, viewportConfig, columnWidthMap]);

  const visibleRows = useMemo(() => {
    return rows.slice(visibleRange.startRow, visibleRange.endRow);
  }, [rows, visibleRange.startRow, visibleRange.endRow]);

  const renderedGridColumns = gridColumns;
  const renderedColumnRange: ViewportRange = useMemo(() => ({
    ...visibleRange,
    startCol: 0,
    endCol: gridColumns.length,
  }), [visibleRange, gridColumns.length]);

  const globalStats = useMemo(() => {
    const stats = new Map<number, { min: number; max: number }>();
    for (let m = 0; m < measures.length; m++) {
      stats.set(m, computeGlobalStats(cellMap, m));
    }
    return stats;
  }, [cellMap, measures.length]);

  const columnStatsCacheRef = useRef<Map<string, { min: number; max: number }[]>>(new Map());
  const rowStatsCacheRef = useRef<Map<string, { min: number; max: number }[]>>(new Map());
  const conditionalStyleCacheRef = useRef<Map<string, CellStyle>>(new Map());

  useEffect(() => {
    columnStatsCacheRef.current.clear();
    rowStatsCacheRef.current.clear();
    conditionalStyleCacheRef.current.clear();
  }, [
    cellMap,
    rows,
    columns,
    measures.length,
    settings.conditionalFormatting.enabled,
    settings.conditionalFormatting.ruleType,
    settings.conditionalFormatting.lowColor,
    settings.conditionalFormatting.midColor,
    settings.conditionalFormatting.highColor,
    settings.conditionalFormatting.lowThreshold,
    settings.conditionalFormatting.highThreshold,
    settings.conditionalFormatting.applyToAllMeasures,
    settings.conditionalFormatting.targetMeasure,
    settings.dataBars.normalizeBy,
  ]);

  const getColumnStatsCached = useCallback((colKey: string, measureIndex: number): { min: number; max: number } => {
    const cachedByMeasure = columnStatsCacheRef.current.get(colKey);
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

    columnStatsCacheRef.current.set(colKey, statsByMeasure);
    return statsByMeasure[measureIndex] ?? { min: 0, max: 0 };
  }, [rows, cellMap, measures.length]);

  const getRowStatsCached = useCallback((rowKey: string, measureIndex: number): { min: number; max: number } => {
    const cachedByMeasure = rowStatsCacheRef.current.get(rowKey);
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

    rowStatsCacheRef.current.set(rowKey, statsByMeasure);
    return statsByMeasure[measureIndex] ?? { min: 0, max: 0 };
  }, [columns, cellMap, measures.length]);

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
    setScrollTop(scrollTop);
    setScrollLeft(scrollLeft);
    if (horizontalScrollRef.current && horizontalScrollRef.current.scrollLeft !== scrollLeft) {
      horizontalScrollRef.current.scrollLeft = scrollLeft;
    }

    scrollManagerRef.current?.handleScroll(scrollTop, scrollLeft);
  }, []);

  const handleHorizontalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const nextScrollLeft = e.currentTarget.scrollLeft;
    const container = scrollContainerRef.current;
    if (container && container.scrollLeft !== nextScrollLeft) {
      container.scrollLeft = nextScrollLeft;
    }
    setScrollLeft(nextScrollLeft);
  }, []);

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
    const container = scrollContainerRef.current;
    if (!container) return;

    const horizontalDelta = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (horizontalDelta === 0) return;

    container.scrollLeft += horizontalDelta;
    setSyncedScrollLeft(container.scrollLeft);
    e.preventDefault();
  }, [hasHorizontalOverflow, setSyncedScrollLeft]);

  const handleMatrixKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement | null;
    if (
      target &&
      target !== container &&
      target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
    ) {
      return;
    }

    const pageHeight = Math.max(safeRowHeightPx, container.clientHeight - safeRowHeightPx);

    switch (e.key) {
      case "ArrowLeft":
        container.scrollBy({ left: -safeColumnWidthPx });
        break;
      case "ArrowRight":
        container.scrollBy({ left: safeColumnWidthPx });
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
          container.scrollTo({ top: 0, left: 0 });
        } else {
          container.scrollTo({ left: 0, top: container.scrollTop });
        }
        break;
      case "End":
        if (e.ctrlKey || e.metaKey) {
          container.scrollTo({
            top: container.scrollHeight,
            left: container.scrollWidth,
          });
        } else {
          container.scrollTo({
            left: container.scrollWidth,
            top: container.scrollTop,
          });
        }
        break;
      default:
        return;
    }

    e.preventDefault();
  }, [safeColumnWidthPx, safeRowHeightPx]);

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
      onClearSelection();
    }
  }, [onClearSelection, allowInteractions]);

  const SCROLL_BUFFER_BOTTOM = 40; // Extra room to scroll past the last row
  const totalContentHeight = (rows.length * safeRowHeightPx) + SCROLL_BUFFER_BOTTOM;
  const hasVScroll = totalContentHeight > viewportHeight;
  const hasHScroll = totalContentWidth > viewportWidth;

  const canUndo = editHistoryIndex > 0;
  const canRedo = editHistoryIndex >= 0 && editHistoryIndex < editHistory.length - 1;

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

  const getCellStyle = useCallback((rowKey: string, colKey: string, measureIndex: number, value: number | null) => {
    if (!settings.conditionalFormatting.enabled) {
      return {};
    }

    const styleKey = `${rowKey}::${colKey}::m${measureIndex}`;
    const cached = conditionalStyleCacheRef.current.get(styleKey);
    if (cached) return cached;

    // Locate the row so the rule engine can honor "values only / totals only" scope.
    const rowNode = rows.find(r => r.key === rowKey);
    const isSubtotal = !!rowNode?.isSubtotal;
    const isGrandTotal = !!rowNode?.isGrandTotal;
    const colNode = columns.find(c => c.key === colKey);
    const isColumnGrandTotal = !!colNode?.isGrandTotal;

    const ctx: EvaluationContext = {
      value,
      measureIndex,
      isSubtotal,
      isGrandTotal,
      isColumnGrandTotal,
      getStatsForMeasure: (m, scope) => {
        if (scope === "tableWise") {
          return globalStats.get(m) || { min: 0, max: 0 };
        }
        if (scope === "rowWise") {
          return getRowStatsCached(rowKey, m);
        }
        return getColumnStatsCached(colKey, m);
      },
      getValueForMeasure: (m) => {
        const c = getCellValue(cellMap, rowKey, colKey, m);
        return c?.value ?? null;
      },
    };

    const style = evaluateCellStyle(ctx, settings.conditionalFormatting);
    conditionalStyleCacheRef.current.set(styleKey, style);
    return style;
  }, [settings.conditionalFormatting, getColumnStatsCached, getRowStatsCached, globalStats, rows, columns, cellMap]);


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

  return (
    <div className={`matrix-container ${formulaBarEditMode ? "formula-edit-mode" : ""}`} style={{ height }} onClick={handleBackgroundClick}>
      <div
        className="matrix-formula-shell"
        style={{ minHeight: FORMULA_BAR_HEIGHT, height: FORMULA_BAR_HEIGHT }}
      >
        <FormulaBar
          ref={formulaBarRef}
          value={activeCell?.value || ""}
          activeCellLabel={activeCell?.label || ""}
          onCommit={handleCommitEdit}
          onCancel={handleCancelEdit}
          context={intelliSenseContextObj}
          onEditModeChange={setFormulaBarEditMode}
          onInsertReference={() => { }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
      <div className="matrix-header-area" style={{ height: columnHeaderHeight }}>
        <div
          className="matrix-col-headers"
          style={{ height: columnHeaderHeight }}
        >
          <div ref={contentRef}> {/* Observed content wrapper */}
            <MergedColumnHeaders
        columns={columns}
        measures={measures}
        arrangement={((settings.general as any).columnArrangement ?? "time-then-measure") as ColumnArrangement}
        sortConfig={sortConfig}
        onSort={onSort}
        onContextMenu={(e, c, m) => handleContextMenu(e, undefined, c, m)}
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
        gridColumns={visualColumnRules.length > 0 ? gridColumns : undefined}
      />
          </div>
        </div>
      </div>

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
        style={{ height: viewportHeight }}
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
            height: viewportHeight,
            zIndex: 80,
            opacity: 1,
            backgroundColor: "var(--mx-row-header-bg, var(--mx-surface, #ffffff))",
          }}
        >
          <div
            className="matrix-row-headers-inner"
            style={{ height: viewportHeight }}
          >
            {visibleRows.map((row, idx) => {
              const actualIndex = visibleRange.startRow + idx;
              const isSelected = selectedRowKeys.has(row.key);

              // Build sparkline series for this row across leaf columns for the configured measure
              let sparklineValues: (number | null)[] | undefined;
              let sparklineLabels: string[] | undefined;
              if (settings.sparklines.enabled && columns.length > 0 && measures.length > 0) {
                const mIdx = Math.max(0, Math.min(measures.length - 1, sparklineMeasureIndex));
                const values: (number | null)[] = [];
                const labels: string[] = [];
                for (const col of columns) {
                  if (col.hasChildren) continue;
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
                    position: "absolute",
                    top: (actualIndex * safeRowHeightPx) - scrollTop,
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
                  onDragEnd={handleRowDragEnd}
                  isDragOver={dragOverRowKey === row.key}
                  dropPosition={dragOverRowKey === row.key ? dropPosition : null}
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
            {visibleRows.map((row, idx) => {
              const actualIndex = visibleRange.startRow + idx;
              const prevRowKey = actualIndex > 0 ? rows[actualIndex - 1]?.key ?? null : null;
              const isSelected = selectedRowKeys.has(row.key);

              return (
                <Row
                  key={row.key}
                  row={row}
                  rowIndex={actualIndex}
                  prevRowKey={prevRowKey}
                  visibleColumns={renderedGridColumns}
                  visibleRange={renderedColumnRange}
                  cellMap={cellMap}
                  measures={measures}
                  settings={settings}
                  isSelected={isSelected}
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
                  selectedColumnKeys={selectedColumnKeysSet}
                  columnWidthMap={columnWidthMap}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`matrix-horizontal-scrollbar-shell ${hasHScroll ? "is-active" : "is-idle"}`}
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
          style={{ width: viewportWidth, height: 18 }}
          onScroll={handleHorizontalScroll}
        >
          <div
            className="matrix-horizontal-scrollbar-content"
            style={{ width: Math.max(totalContentWidth, viewportWidth), height: 1 }}
          />
        </div>
      </div>

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
