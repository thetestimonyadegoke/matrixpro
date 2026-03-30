import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import powerbi from "powerbi-visuals-api";
import { FlattenedNode } from "../model/tree";
import { CellValue, MeasureInfo, getCellValue, computeGlobalStats } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { SortConfig } from "../model/sorting";
import { SelectionState } from "../powerbi/selection";
import { ViewportRange, computeVisibleRange, ViewportConfig } from "../virtualization/viewport";
import { ScrollManager } from "../virtualization/scroll";
import { Row } from "./Row";
import { RowHeader } from "./RowHeader";
import { MergedColumnHeaders } from "./MergedColumnHeaders";
import { CellStyle, evaluateConditionalFormatting } from "../format/conditional";
import { getRowStyle } from "../format/styles";
import { TooltipServiceWrapper } from "../powerbi/tooltip";
import { ContextMenu, ContextMenuItem, buildCellMenuItems, buildRowHeaderMenuItems, buildColumnHeaderMenuItems } from "./ContextMenu";
import { FormulaBar, FormulaBarRef } from "./FormulaBar";
import { getThemePreset, applyThemeTokensToElement } from "../themes/themeTokens";
import { BulkOperationsPanel, BulkOperationType } from "./BulkOperationsPanel";
import { generateCellLabel, formatCellReferenceForFormula } from "../utils/cellNaming";

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
  intelliSenseContext?: {
    calculatedMeasures: { name: string; formula: string }[];
    rowHierarchyLevels: string[];
    columnHierarchyLevels: string[];
  };
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
  sparklineMeasureIndex,
  onSort,
  onToggleRowExpand,
  onToggleColumnExpand,
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
}) => {
  type GridColumn = {
    key: string;
    col: FlattenedNode;
    measure: MeasureInfo;
    measureIndex: number;
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowHeadersRef = useRef<HTMLDivElement>(null);
  const colHeadersRef = useRef<HTMLDivElement>(null);
  const formulaBarRef = useRef<FormulaBarRef>(null);

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
  const [selectedRange, setSelectedRange] = useState<{
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

      // Remove dragged row if already exists
      currentOrder = currentOrder.filter((k: string) => k !== draggedRowKey);

      // Find target position in current order
      const targetIdx = currentOrder.indexOf(dragOverRowKey);

      if (targetIdx === -1) {
        // Target not in order, append dragged row
        currentOrder.push(draggedRowKey);
      } else {
        // Insert at appropriate position
        let insertIdx: number;
        if (dropPosition === "before") {
          insertIdx = targetIdx;
        } else if (dropPosition === "after") {
          insertIdx = targetIdx + 1;
        } else {
          // "child" - insert after the target and its descendants
          insertIdx = targetIdx + 1;
          // Find the last descendant of the target
          const targetRow = rows.find(r => r.key === dragOverRowKey);
          if (targetRow) {
            const targetLevel = targetRow.level;
            for (let i = targetIdx + 1; i < currentOrder.length; i++) {
              const row = rows.find(r => r.key === currentOrder[i]);
              if (row && row.level > targetLevel) {
                insertIdx = i + 1;
              } else {
                break;
              }
            }
          }
        }
        currentOrder.splice(insertIdx, 0, draggedRowKey);
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

  // Row header width is fully configurable from settings, with sane bounds
  const rowHeaderWidth = useMemo(() => {
    const raw = settings.general.rowHeaderWidth || 0;
    const min = 120;
    const max = 480;
    return Math.max(min, Math.min(max, Math.round(raw)));
  }, [settings.general.rowHeaderWidth]);

  // Column header height based on merged header rows (hierarchy levels + measure row)
  const columnHeaderHeight = useMemo(() => {
    if (measures.length === 0) return 0;
    if (columns.length === 0) return 28;
    const maxLevel = Math.max(...columns.map(c => c.level), 0);
    const headerRowCount = maxLevel + 2; // hierarchy levels + measure row
    return headerRowCount * 28;
  }, [columns, measures.length]);

  const minRowHeightPx = useMemo(() => {
    const headerFontPx = Math.max(8, Math.round(settings.headers.fontSize || 0));
    const valueFontPx = Math.max(8, Math.round(settings.values.fontSize || 0));
    const lineBoxPx = Math.ceil(Math.max(headerFontPx, valueFontPx) * 1.2);
    const chromePx = 8;
    return Math.max(18, lineBoxPx + chromePx);
  }, [settings.headers.fontSize, settings.values.fontSize]);

  const safeRowHeightPx = Math.max(minRowHeightPx, Math.round(rowHeightPx || 0));
  const safeColumnWidthPx = Math.max(60, Math.round(columnWidthPx || 0));

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

    const baseResult: GridColumn[] = [];
    for (const col of visualLeafs) {
      for (let m = 0; m < measures.length; m++) {
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
        const found = baseResult.find(c => c.key === key);
        if (found) {
          sorted.push(found);
          used.add(key);
        }
      }

      // Add remaining columns not in manual order
      for (const col of baseResult) {
        if (!used.has(col.key)) {
          sorted.push(col);
        }
      }
      return sorted;
    }

    return baseResult;
  }, [columns, measures, settings.manualData.colOrder]);

  const viewportConfig: ViewportConfig = useMemo(() => ({
    rowHeight: safeRowHeightPx,
    columnWidth: safeColumnWidthPx,
    rowBuffer: ROW_BUFFER,
    columnBuffer: COL_BUFFER,
    viewportWidth: width - rowHeaderWidth,
    viewportHeight: height - columnHeaderHeight,
    totalRows: rows.length,
    totalColumns: gridColumns.length,
    rowHeaderWidth,
    columnHeaderHeight,
  }), [safeRowHeightPx, safeColumnWidthPx, width, height, rows.length, gridColumns.length, rowHeaderWidth, columnHeaderHeight]);

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
        () => {
          // Quick Variance: Measure comparing current with previous column
          console.log("Quick Variance requested for", colKey);
        },
        () => console.log("Export triggered"),
        () => {
          const edits = JSON.parse(settings.manualData.edits || "{}");
          delete edits[`${row.key}|${colKey}|${measureIndex}`];
          onPersistProperty("manualData", "edits", JSON.stringify(edits));
        },
        !!JSON.parse(settings.manualData.edits || "{}")[`${row.key}|${colKey}|${measureIndex}`]
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
        JSON.parse(settings.manualData.locks || "[]").includes(row.key)
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
  }, [allowInteractions, cellMap, onToggleRowExpand, onOpenCalcMeasureWizard, onOpenCalcRowWizard, onSort, onPersistProperty, settings.manualData, settings.general, gridColumns, onAddQuickVariance]);

  const visibleRange: ViewportRange = useMemo(() => {
    return computeVisibleRange(scrollTop, scrollLeft, viewportConfig);
  }, [scrollTop, scrollLeft, viewportConfig]);

  const visibleRows = useMemo(() => {
    return rows.slice(visibleRange.startRow, visibleRange.endRow);
  }, [rows, visibleRange.startRow, visibleRange.endRow]);

  const visibleGridColumns = useMemo(() => {
    return gridColumns.slice(visibleRange.startCol, visibleRange.endCol);
  }, [gridColumns, visibleRange.startCol, visibleRange.endCol]);

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

    scrollManagerRef.current?.handleScroll(scrollTop, scrollLeft);
  }, []);

  const handleRowClick = useCallback((
    e: React.MouseEvent,
    row: FlattenedNode
  ) => {
    if (!allowInteractions) return;
    const multiSelect = e.ctrlKey || e.metaKey;
    onRowSelect(row.key, row.selectionId, multiSelect);
  }, [onRowSelect, allowInteractions]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!allowInteractions) return;
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  }, [onClearSelection, allowInteractions]);

  const totalContentWidth = gridColumns.length * safeColumnWidthPx;
  const totalContentHeight = rows.length * safeRowHeightPx;

  const canUndo = editHistoryIndex > 0;
  const canRedo = editHistoryIndex >= 0 && editHistoryIndex < editHistory.length - 1;

  useEffect(() => {
    const viewportHeight = Math.max(0, height - columnHeaderHeight);
    const viewportWidth = Math.max(0, width - rowHeaderWidth);
    const maxScrollTop = Math.max(0, totalContentHeight - viewportHeight);
    const maxScrollLeft = Math.max(0, totalContentWidth - viewportWidth);

    const el = scrollContainerRef.current;
    if (el) {
      if (el.scrollTop > maxScrollTop) el.scrollTop = maxScrollTop;
      if (el.scrollLeft > maxScrollLeft) el.scrollLeft = maxScrollLeft;
    }

    setScrollTop((prev) => Math.min(prev, maxScrollTop));
    setScrollLeft((prev) => Math.min(prev, maxScrollLeft));
  }, [totalContentHeight, totalContentWidth, height, width, rowHeaderWidth, columnHeaderHeight]);

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

    const minColWidth = 60;
    const maxColWidth = 420;

    const onMove = (e: MouseEvent) => {
      const next = Math.max(minColWidth, Math.min(maxColWidth, Math.round(startW + (e.clientX - startX))));
      setColumnWidthPx(next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const next = Math.max(minColWidth, Math.min(maxColWidth, Math.round(columnWidthRef.current)));
      onPersistProperty("general", "defaultColumnWidth", next);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [allowInteractions, safeColumnWidthPx, onPersistProperty]);

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

    if (!settings.conditionalFormatting.applyToAllMeasures && measureIndex !== settings.conditionalFormatting.targetMeasure) {
      return {};
    }

    const styleKey = `${rowKey}::${colKey}::m${measureIndex}`;
    const cached = conditionalStyleCacheRef.current.get(styleKey);
    if (cached) return cached;

    const stats = getColumnStatsCached(colKey, measureIndex);
    const style = evaluateConditionalFormatting(value, stats.min, stats.max, settings.conditionalFormatting);
    conditionalStyleCacheRef.current.set(styleKey, style);
    return style;
  }, [settings.conditionalFormatting, getColumnStatsCached]);

  // Bulk Operations Handlers
  const handleCellSelectWithRange = useCallback((
    row: FlattenedNode,
    colKey: string,
    measureIndex: number,
    rowIndex?: number,
    colIndex?: number,
    isShiftClick?: boolean,
    isCtrlClick?: boolean
  ) => {
    const cellKey = { rowKey: row.key, colKey, measureIndex };

    if (isShiftClick && selectedRange.anchorCell) {
      // Range selection: select all cells between anchor and current
      const anchorRowIdx = rows.findIndex(r => r.key === selectedRange.anchorCell!.rowKey);
      const currentRowIdx = rows.findIndex(r => r.key === row.key);
      const anchorColIdx = gridColumns.findIndex(c => c.key === `${selectedRange.anchorCell!.colKey}::m${selectedRange.anchorCell!.measureIndex}`);
      const currentColIdx = gridColumns.findIndex(c => c.key === `${colKey}::m${measureIndex}`);

      const startRowIdx = Math.min(anchorRowIdx, currentRowIdx);
      const endRowIdx = Math.max(anchorRowIdx, currentRowIdx);
      const startColIdx = Math.min(anchorColIdx, currentColIdx);
      const endColIdx = Math.max(anchorColIdx, currentColIdx);

      const newCells: { rowKey: string; colKey: string; measureIndex: number }[] = [];
      for (let r = startRowIdx; r <= endRowIdx; r++) {
        for (let c = startColIdx; c <= endColIdx; c++) {
          const gridCol = gridColumns[c];
          if (gridCol) {
            newCells.push({
              rowKey: rows[r]?.key || "",
              colKey: gridCol.col.key,
              measureIndex: gridCol.measureIndex,
            });
          }
        }
      }

      setSelectedRange(prev => ({
        cells: newCells,
        anchorCell: prev.anchorCell,
      }));
    } else if (isCtrlClick) {
      // Toggle selection
      const exists = selectedRange.cells.some(
        c => c.rowKey === row.key && c.colKey === colKey && c.measureIndex === measureIndex
      );
      if (exists) {
        setSelectedRange(prev => ({
          cells: prev.cells.filter(
            c => !(c.rowKey === row.key && c.colKey === colKey && c.measureIndex === measureIndex)
          ),
          anchorCell: prev.anchorCell,
        }));
      } else {
        setSelectedRange(prev => ({
          cells: [...prev.cells, cellKey],
          anchorCell: cellKey,
        }));
      }
    } else {
      // Single selection - clear range and select just this cell
      setSelectedRange({ cells: [cellKey], anchorCell: cellKey });
      // Also update active cell for formula bar
      handleCellSelect(row, colKey, measureIndex, rowIndex, colIndex);
    }
  }, [rows, gridColumns, selectedRange.anchorCell, handleCellSelect]);

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
      <div className="matrix-header-area" style={{ height: columnHeaderHeight }}>
        <div
          className="matrix-col-headers"
          ref={colHeadersRef}
          style={{ width }}
        >
          <MergedColumnHeaders
            columns={columns}
            measures={measures}
            arrangement="time-then-measure"
            sortConfig={sortConfig}
            onSort={onSort}
            allowInteractions={allowInteractions}
            rowHeaderWidth={rowHeaderWidth}
            columnWidth={safeColumnWidthPx}
            scrollLeft={scrollLeft}
            totalContentWidth={totalContentWidth}
            onContextMenu={(e, c, m) => handleContextMenu(e, undefined, c, m)}
          />
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
        className="matrix-body-area"
        style={{ height: height - columnHeaderHeight }}
        onScroll={handleScroll}
        ref={scrollContainerRef}
      >
        <div
          className="matrix-row-headers"
          ref={rowHeadersRef}
          style={{ width: rowHeaderWidth }}
        >
          <div
            className="matrix-row-headers-inner"
            style={{ height: totalContentHeight }}
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
                  style={{
                    ...getRowStyle(settings, actualIndex, row.isSubtotal, row.isGrandTotal, isSelected),
                    position: "absolute",
                    top: actualIndex * safeRowHeightPx,
                    height: safeRowHeightPx,
                    width: rowHeaderWidth,
                  }}
                  onToggleExpand={onToggleRowExpand}
                  onClick={(e) => handleRowClick(e, row)}
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
          style={{ width: totalContentWidth }}
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
                  visibleColumns={visibleGridColumns}
                  visibleRange={visibleRange}
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
                />
              );
            })}
          </div>
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
