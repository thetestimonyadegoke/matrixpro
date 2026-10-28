import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { secureRandomId } from "../model/keys";
import {
  LevelAwareAggregation,
  LevelAwareColumnGroupVisibility,
  LevelAwareDisplayMode,
  LevelAwareFieldConfig,
  LevelAwarePlacement,
  LevelAwareRowVisibility,
  RowFieldAggregation,
  RowFieldDisplayAt,
  RowFieldPlacement,
  RowFieldRole,
  findRowFieldConfig,
  findFieldConfig,
  getLevelAwareConfig,
  measureFieldId,
  serializeLevelAwareColumns,
  upsertFieldConfig,
  upsertRowFieldConfig,
} from "../model/levelAwareColumns";
import { Button, ColorWell, EmptyNote, Field, IconButton, Overlay, Section, Segmented, Switch, Tabs } from "./overlayKit";
import { IconArrowDown, IconArrowUp, IconGrip, IconPlus, IconTrash } from "./icons";

export interface ManageColumnsPanelProps {
  columns: FlattenedNode[];
  rows: FlattenedNode[];
  measures: MeasureInfo[];
  settings: VisualSettings;
  rowLevelNames?: string[];
  visualWidth?: number;
  visualHeight?: number;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onHiddenColsChange?: (keys: string[]) => void;
  onHiddenRowKeysChange?: (keys: string[]) => void;
  onOpenCalcMeasureWizard?: (id?: string) => void;
  onDeleteCalcMeasure?: (id: string) => void;
  onDeleteCalcRow?: (rowKey: string) => void;
}

type TabId = "measures" | "columns" | "rows" | "visualColumns" | "levelAware" | "design";
type VisualColumnFrequency = "all" | "yearly" | "quarterly" | "specific" | "ytd";
type VisualColumnPosition = "normal" | "beginning" | "end" | "specific";
type AggregationType = "none" | "formula" | "sum" | "first" | "last" | "average" | "min" | "max" | "count" | "countDistinct";
type VisualColumnRule = {
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
  applyTo?: "headers" | "values" | "both";
};

const AGGREGATION_OPTIONS: Array<{ value: AggregationType; label: string }> = [
  { value: "none", label: "None" },
  { value: "formula", label: "Formula" },
  { value: "sum", label: "Sum" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "average", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "count", label: "Count" },
  { value: "countDistinct", label: "Count distinct" },
];

const DISPLAY_MODE_OPTIONS: Array<{ value: LevelAwareDisplayMode; label: string }> = [
  { value: "distributed", label: "Distributed measure" },
  { value: "detail", label: "Standalone detail column" },
  { value: "totalOnly", label: "Total-only column" },
  { value: "visual", label: "Visual column" },
];

const ROW_VISIBILITY_OPTIONS: Array<{ value: LevelAwareRowVisibility; label: string }> = [
  { value: "all", label: "All levels" },
  { value: "parent", label: "Parent levels only" },
  { value: "leaf", label: "Leaf/detail level only" },
  { value: "selected", label: "Selected levels" },
];

const COLUMN_GROUP_OPTIONS: Array<{ value: LevelAwareColumnGroupVisibility; label: string }> = [
  { value: "all", label: "All groups" },
  { value: "selected", label: "Selected group only" },
  { value: "notRepeated", label: "Not repeated under column groups" },
];

const PLACEMENT_OPTIONS: Array<{ value: LevelAwarePlacement; label: string }> = [
  { value: "afterRowHeaders", label: "After row headers" },
  { value: "beforeDistributed", label: "Before distributed columns" },
  { value: "afterDistributed", label: "After distributed columns" },
  { value: "end", label: "End of matrix" },
  { value: "frozenWithRowHeaders", label: "Frozen with row headers" },
];

const ROW_FIELD_ROLE_OPTIONS: Array<{ value: RowFieldRole; label: string }> = [
  { value: "hierarchy", label: "Hierarchy level" },
  { value: "detail", label: "Detail column" },
  { value: "hiddenKey", label: "Hidden key" },
  { value: "groupingOnly", label: "Grouping only" },
];

const ROW_FIELD_DISPLAY_OPTIONS: Array<{ value: RowFieldDisplayAt; label: string }> = [
  { value: "all", label: "All levels" },
  { value: "parent", label: "Parent levels only" },
  { value: "leaf", label: "Leaf/detail level only" },
  { value: "selected", label: "Selected level" },
];

const ROW_FIELD_PLACEMENT_OPTIONS: Array<{ value: RowFieldPlacement; label: string }> = [
  { value: "rowHeader", label: "Row header area" },
  { value: "detailColumns", label: "Detail columns area" },
  { value: "beforeDistributed", label: "Before distributed measures" },
  { value: "afterDistributed", label: "After distributed measures" },
  { value: "hidden", label: "Hidden" },
];

const ROW_FIELD_AGG_OPTIONS: Array<{ value: RowFieldAggregation; label: string }> = [
  { value: "none", label: "None" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "count", label: "Count" },
  { value: "countDistinct", label: "Count distinct" },
  { value: "concatenate", label: "Concatenate" },
  { value: "sameElseMultiple", label: "Show if same, else “Multiple”" },
];

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v as T;
  } catch {
    return fallback;
  }
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const TABS: Array<{ value: TabId; label: string }> = [
  { value: "measures", label: "Measures" },
  { value: "columns", label: "Columns" },
  { value: "visualColumns", label: "Visual columns" },
  { value: "levelAware", label: "Level aware" },
  { value: "rows", label: "Rows" },
  { value: "design", label: "Design" },
];

type DesignTemplateId = "vendor" | "billing" | "customers" | "glassPills" | "columnCards";

const DESIGN_TEMPLATES: Array<[DesignTemplateId, string, string]> = [
  ["vendor", "Vendor activity", "Directory rows with progress bars and soft pills"],
  ["billing", "Billing history", "Invoice-style rows with status and action columns"],
  ["customers", "Customer table", "Spacious app-style directory rows"],
  ["glassPills", "Glass pills", "Floating glass rows with pill labels"],
  ["columnCards", "Column cards", "Rounded vertical-card matrix"],
];

// --- component ---------------------------------------------------------------

export const ManageColumnsPanel: React.FC<ManageColumnsPanelProps> = ({
  columns,
  rows,
  measures,
  settings,
  rowLevelNames = [],
  visualWidth = 1200,
  visualHeight = 700,
  onClose,
  onPersistProperty,
  onHiddenColsChange,
  onHiddenRowKeysChange,
  onOpenCalcMeasureWizard,
  onDeleteCalcMeasure,
  onDeleteCalcRow,
}) => {
  const panelWidth = Math.max(520, Math.min(820, Math.round(visualWidth * 0.58)));
  const [activeTab, setActiveTab] = useState<TabId>("measures");
  const [search, setSearch] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingWidth, setEditingWidth] = useState<string | null>(null);
  const [widthInput, setWidthInput] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const requestDeleteConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = "Delete"
  ) => {
    setConfirmRequest({ title, message, confirmLabel, onConfirm });
  }, []);


  // â”€â”€ persisted state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const colOrder = useMemo(
    () => parseJSON<string[]>(settings.manualData.colOrder, []),
    [settings.manualData.colOrder]
  );

  const [hiddenColsState, setHiddenColsState] = useState<Set<string>>(
    () => new Set(parseJSON<string[]>(settings.manualData.hiddenCols, []))
  );
  const [hiddenRowKeysState, setHiddenRowKeysState] = useState<Set<string>>(
    () => new Set(parseJSON<string[]>(settings.manualData.hiddenRowKeys, []))
  );

  // Refs for "latest" state to handle rapid clicks
  const hiddenColsRef = useRef(new Set(parseJSON<string[]>(settings.manualData.hiddenCols, [])));
  const hiddenRowKeysRef = useRef(new Set(parseJSON<string[]>(settings.manualData.hiddenRowKeys, [])));
  
  // Refs for "last persisted" to avoid sync-back loops
  const lastHiddenColsPersisted = useRef(settings.manualData.hiddenCols);
  const lastHiddenRowsPersisted = useRef(settings.manualData.hiddenRowKeys);

  useEffect(() => {
    const incoming = settings.manualData.hiddenCols || "[]";
    // Robust comparison: parse and check equality
    const currentSet = hiddenColsRef.current;
    const incomingArr = parseJSON<string[]>(incoming, []);
    const incomingSet = new Set(incomingArr);
    
    const isSame = currentSet.size === incomingSet.size && [...currentSet].every(x => incomingSet.has(x));
    
    if (!isSame) {
      setHiddenColsState(incomingSet);
      hiddenColsRef.current = new Set(incomingSet);
      lastHiddenColsPersisted.current = incoming;
    }
  }, [settings.manualData.hiddenCols]);

  useEffect(() => {
    const incoming = settings.manualData.hiddenRowKeys || "[]";
    const currentSet = hiddenRowKeysRef.current;
    const incomingArr = parseJSON<string[]>(incoming, []);
    const incomingSet = new Set(incomingArr);
    
    const isSame = currentSet.size === incomingSet.size && [...currentSet].every(x => incomingSet.has(x));
    
    if (!isSame) {
      setHiddenRowKeysState(incomingSet);
      hiddenRowKeysRef.current = new Set(incomingSet);
      lastHiddenRowsPersisted.current = incoming;
    }
  }, [settings.manualData.hiddenRowKeys]);

  const colWidths = useMemo(
    () => parseJSON<Record<string, number>>(settings.manualData.colWidths, {}),
    [settings.manualData.colWidths]
  );

  const labelOverrides = useMemo(
    () => parseJSON<Record<string, string>>(settings.manualData.labelOverrides, {}),
    [settings.manualData.labelOverrides]
  );

  const aggregationOverrides = useMemo(
    () => parseJSON<Record<string, string | { row?: string; column?: string; type?: string }>>(settings.manualData.aggregationOverrides, {}),
    [settings.manualData.aggregationOverrides]
  );

  const visualColumnRules = useMemo(
    () => parseJSON<VisualColumnRule[]>(settings.calculations.visualColumns || "[]", []),
    [settings.calculations.visualColumns]
  );

  const levelAwareConfig = useMemo(
    () => getLevelAwareConfig(settings),
    [settings]
  );

  const totalPositions = useMemo(
    () => parseJSON<Record<string, "beginning" | "end">>(settings.manualData.totalPositions || "{}", {}),
    [settings.manualData.totalPositions]
  );

  // â”€â”€ derived item lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const measureItems = useMemo(() => {
    const base = measures.map((m, index) => ({
      id: `m_${m.index ?? index}`,
      label: m.name,
      sub: m.format || "General",
      measure: m,
      isCalculatedMeasure: Boolean(m.id && String(m.queryName || "").startsWith("__calc__")),
    }));
    const ordered = colOrder.length
      ? [...base].sort((a, b) => {
          const ia = colOrder.indexOf(a.id);
          const ib = colOrder.indexOf(b.id);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        })
      : base;
    return ordered.filter(item =>
      !search || item.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [measures, colOrder, search]);

  const columnItems = useMemo(() => {
    const visualLeafs = columns.filter((col, index) => {
      if (!col.key || col.key === "col:root") return false;
      const next = columns[index + 1];
      return col.isLeaf || col.isSubtotal || col.isGrandTotal || !next || next.level <= col.level;
    });
    const base = visualLeafs.flatMap(col => measures.map((measure, index) => {
      const measureIndex = measure.index ?? index;
      const path = (col.path || []).map(value => String(value ?? "")).filter(Boolean);
      return {
        id: `${col.key}::m${measureIndex}`,
        label: measure.name,
        sub: `${path.join(" / ") || col.label || "Column"}${col.isGrandTotal ? " / Grand total" : col.isSubtotal ? " / Subtotal" : ""}`,
        col,
        measure,
        level: Math.max(0, col.level),
      };
    }));
    const ordered = colOrder.length
      ? [...base].sort((a, b) => {
          const ia = colOrder.indexOf(a.id);
          const ib = colOrder.indexOf(b.id);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        })
      : base;
    return ordered.filter(item =>
      !search || `${item.label} ${item.sub}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [columns, measures, colOrder, search]);

  const selectableColumnItems = useMemo(() => columns
    .filter((col, index) => {
      const next = columns[index + 1];
      return col.isLeaf || col.isSubtotal || col.isGrandTotal || !next || next.level <= col.level;
    })
    .map(col => ({
      id: col.key,
      label: col.label || "(Empty)",
      sub: `${(col.path || []).map(value => String(value ?? "")).filter(Boolean).join(" / ") || `Level ${col.level}`}`,
    })), [columns]);

  const filteredVisualColumnRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visualColumnRules;
    return visualColumnRules.filter(rule => {
      const selectedColumns = selectableColumnItems
        .filter(col => rule.specificColumnKeys?.includes(col.id))
        .map(col => `${col.label} ${col.sub}`)
        .join(" ");
      return [
        rule.sourceMeasureName,
        rule.frequency,
        rule.position,
        selectedColumns,
      ].join(" ").toLowerCase().includes(q);
    });
  }, [search, selectableColumnItems, visualColumnRules]);

  const rowItems = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .filter(r => !r.isGrandTotal && !r.key.startsWith("__group__") && r.calcRowKind !== "blank")
      .filter((r) => {
        if (seen.has(r.key)) return false;
        seen.add(r.key);
        return !search || r.label.toLowerCase().includes(search.toLowerCase());
      })
      .map((r) => ({
        id: r.key,
        label: r.label || "(Empty)",
        sub: r.key.startsWith("__calcrow__")
          ? "Calculated row"
          : r.isSubtotal
            ? `Subtotal - Level ${r.level + 1}`
            : `Level ${r.level + 1}`,
        row: r,
      }));
  }, [rows, search]);

  const levelAwareItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return measures
      .map((measure, index) => {
        const field = findFieldConfig(levelAwareConfig, measure, index);
        return {
          id: measureFieldId(measure, index),
          label: measure.name,
          sub: field?.displayMode === "detail"
            ? "Standalone detail column"
            : field?.displayMode === "totalOnly"
              ? "Total-only column"
              : "Distributed measure",
          measure,
          measureIndex: index,
          field,
          order: field?.order ?? index,
        };
      })
      .filter(item => !q || `${item.label} ${item.sub}`.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order);
  }, [levelAwareConfig, measures, search]);

  const rowFieldItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .reduce<Array<{ levelIndex: number; fieldName: string; config: ReturnType<typeof findRowFieldConfig> }>>((acc, row) => {
        for (let levelIndex = 0; levelIndex < row.path.length; levelIndex++) {
          if (acc.some(item => item.levelIndex === levelIndex)) continue;
          const fieldName = rowLevelNames[levelIndex] || `Row level ${levelIndex + 1}`;
          acc.push({ levelIndex, fieldName, config: findRowFieldConfig(levelAwareConfig, levelIndex) });
        }
        return acc;
      }, [])
      .filter(item => !q || `${item.fieldName} ${item.config?.role || "hierarchy"}`.toLowerCase().includes(q));
  }, [levelAwareConfig, rowLevelNames, rows, search]);

  const baseItems = activeTab === "measures"
    ? measureItems
    : activeTab === "columns"
      ? columnItems
      : activeTab === "rows"
        ? rowItems
        : [];

  const items = useMemo(
    () => (showHiddenOnly
      ? baseItems.filter(item => (activeTab === "rows" ? hiddenRowKeysState.has(item.id) : hiddenColsState.has(item.id)))
      : baseItems),
    [activeTab, baseItems, hiddenColsState, hiddenRowKeysState, showHiddenOnly]
  );

  // â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const uniqueKeys = (keys: string[]) => Array.from(new Set(keys.filter(Boolean)));
  const isMeasureOrderKey = (key: string) => key.startsWith("m_") || key.startsWith("m:");
  const isColumnOrderKey = (key: string) => !isMeasureOrderKey(key);

  const persistOrder = useCallback((next: string[]) => {
    const cleaned = uniqueKeys(next);
    onPersistProperty("manualData", "colOrder", JSON.stringify(cleaned));
  }, [onPersistProperty]);

  const persistHiddenState = useCallback((next: Set<string>) => {
    const nextKeys = [...next];
    const json = JSON.stringify(nextKeys);
    if (activeTab === "rows") {
      hiddenRowKeysRef.current = new Set(next);
      setHiddenRowKeysState(new Set(next));
      lastHiddenRowsPersisted.current = json;
      if (onHiddenRowKeysChange) onHiddenRowKeysChange(nextKeys);
      else onPersistProperty("manualData", "hiddenRowKeys", json);
      return;
    }
    hiddenColsRef.current = new Set(next);
    setHiddenColsState(new Set(next));
    lastHiddenColsPersisted.current = json;
    if (onHiddenColsChange) onHiddenColsChange(nextKeys);
    else onPersistProperty("manualData", "hiddenCols", json);
  }, [activeTab, onHiddenColsChange, onHiddenRowKeysChange, onPersistProperty]);

  const toggleVisibility = useCallback((id: string) => {
    const ref = activeTab === "rows" ? hiddenRowKeysRef : hiddenColsRef;
    const next = new Set(ref.current);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistHiddenState(next);
  }, [activeTab, persistHiddenState]);

  const persistVisualColumnRules = useCallback((next: VisualColumnRule[]) => {
    onPersistProperty("calculations", "visualColumns", JSON.stringify(next));
  }, [onPersistProperty]);

  const addVisualColumnRule = useCallback(() => {
    const firstMeasure = measures[0];
    const next: VisualColumnRule = {
      id: `visual_${secureRandomId(8)}`,
      enabled: true,
      sourceMeasureId: firstMeasure?.id,
      sourceMeasureName: firstMeasure?.name,
      sourceMeasureIndex: firstMeasure?.index ?? 0,
      frequency: "all",
      position: "normal",
      specificColumnKeys: [],
    };
    persistVisualColumnRules([...visualColumnRules, next]);
  }, [measures, persistVisualColumnRules, visualColumnRules]);

  const addVisualRuleForMeasure = useCallback((measure: MeasureInfo) => {
    const exists = visualColumnRules.some(rule =>
      measure.id
        ? !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id
        : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name)
    );
    const next: VisualColumnRule = {
      id: `visual_${secureRandomId(8)}`,
      enabled: true,
      sourceMeasureId: measure.id,
      sourceMeasureName: measure.name,
      sourceMeasureIndex: measure.index,
      frequency: "all",
      position: "normal",
      specificColumnKeys: [],
    };
    persistVisualColumnRules(exists
      ? visualColumnRules.map(rule =>
        (measure.id
          ? !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id
          : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name))
          ? { ...rule, ...next, id: rule.id }
          : rule
      )
      : [...visualColumnRules, next]
    );
    setActiveTab("visualColumns");
    setSearch(measure.name);
  }, [persistVisualColumnRules, visualColumnRules]);

  const addVisualRulesForColumn = useCallback((col: FlattenedNode) => {
    if (measures.length === 0) return;
    const colKey = col.key;
    const nextRules = [...visualColumnRules];
    for (const measure of measures) {
      const existingIndex = nextRules.findIndex(rule =>
        measure.id
          ? !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id
          : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name)
      );
      const patch: VisualColumnRule = {
        id: existingIndex >= 0 ? nextRules[existingIndex].id : `visual_${secureRandomId(8)}`,
        enabled: true,
        sourceMeasureId: measure.id,
        sourceMeasureName: measure.name,
        sourceMeasureIndex: measure.index,
        frequency: "specific",
        position: "normal",
        specificColumnKeys: Array.from(new Set([...(existingIndex >= 0 ? nextRules[existingIndex].specificColumnKeys || [] : []), colKey])),
      };
      if (existingIndex >= 0) nextRules[existingIndex] = { ...nextRules[existingIndex], ...patch };
      else nextRules.push(patch);
    }
    persistVisualColumnRules(nextRules);
    setActiveTab("visualColumns");
    setSearch(col.label || colKey);
  }, [measures, persistVisualColumnRules, visualColumnRules]);

  const persistLevelAwareConfig = useCallback((next: typeof levelAwareConfig) => {
    onPersistProperty("calculations", "levelAwareColumns", serializeLevelAwareColumns(next));
  }, [levelAwareConfig, onPersistProperty]);

  const updateLevelAwareField = useCallback((
    measure: MeasureInfo,
    measureIndex: number,
    patch: Partial<LevelAwareFieldConfig>
  ) => {
    persistLevelAwareConfig(upsertFieldConfig(levelAwareConfig, measure, measureIndex, patch));
  }, [levelAwareConfig, persistLevelAwareConfig]);

  const updateRowField = useCallback((
    levelIndex: number,
    fieldName: string,
    patch: Parameters<typeof upsertRowFieldConfig>[3]
  ) => {
    persistLevelAwareConfig(upsertRowFieldConfig(levelAwareConfig, levelIndex, fieldName, patch));
  }, [levelAwareConfig, persistLevelAwareConfig]);

  const moveLevelAwareField = useCallback((measureIndex: number, direction: -1 | 1) => {
    const current = levelAwareItems.map((item, index) => ({
      item,
      order: item.field?.order ?? index,
    }));
    const from = current.findIndex(entry => entry.item.measureIndex === measureIndex);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.length) return;
    const reordered = current.map(entry => entry.item);
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    let next = levelAwareConfig;
    reordered.forEach((item, order) => {
      next = upsertFieldConfig(next, item.measure, item.measureIndex, { order });
    });
    persistLevelAwareConfig(next);
  }, [levelAwareConfig, levelAwareItems, persistLevelAwareConfig]);

  const addVisualRuleForColumnMeasure = useCallback((col: FlattenedNode, measure: MeasureInfo) => {
    const measureIndex = measure.index ?? measures.findIndex(m => m === measure);
    const existingIndex = visualColumnRules.findIndex(rule =>
      measure.id
        ? !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id
        : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name)
    );
    const patch: VisualColumnRule = {
      id: existingIndex >= 0 ? visualColumnRules[existingIndex].id : `visual_${secureRandomId(8)}`,
      enabled: true,
      sourceMeasureId: measure.id,
      sourceMeasureName: measure.name,
      sourceMeasureIndex: measureIndex,
      frequency: "specific",
      position: "normal",
      specificColumnKeys: Array.from(new Set([...(existingIndex >= 0 ? visualColumnRules[existingIndex].specificColumnKeys || [] : []), col.key])),
    };
    persistVisualColumnRules(existingIndex >= 0
      ? visualColumnRules.map((rule, index) => index === existingIndex ? { ...rule, ...patch } : rule)
      : [...visualColumnRules, patch]
    );
    setActiveTab("visualColumns");
    setSearch(measure.name);
  }, [measures, persistVisualColumnRules, visualColumnRules]);

  const updateVisualColumnRule = useCallback((id: string, patch: Partial<VisualColumnRule>) => {
    persistVisualColumnRules(visualColumnRules.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  }, [persistVisualColumnRules, visualColumnRules]);

  const updateTotalPosition = useCallback((columnKey: string, value: "inherit" | "beginning" | "end") => {
    const next = { ...totalPositions };
    if (value === "inherit") delete next[columnKey];
    else next[columnKey] = value;
    onPersistProperty("manualData", "totalPositions", JSON.stringify(next));
  }, [onPersistProperty, totalPositions]);

  const deleteVisualColumnRule = useCallback((id: string) => {
    requestDeleteConfirmation(
      "Delete visual column?",
      "Delete this visual column rule? This cannot be undone.",
      () => persistVisualColumnRules(visualColumnRules.filter(rule => rule.id !== id))
    );
  }, [persistVisualColumnRules, requestDeleteConfirmation, visualColumnRules]);

  const hasVisualRuleForMeasure = useCallback((measure: MeasureInfo) => (
    visualColumnRules.some(rule =>
      measure.id
        ? !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id
        : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name)
    )
  ), [visualColumnRules]);

  const deleteVisualRulesForMeasure = useCallback((measure: MeasureInfo) => {
    requestDeleteConfirmation(
      "Delete visual columns?",
      `Delete the visual column rules for "${measure.name}"? This cannot be undone.`,
      () => persistVisualColumnRules(visualColumnRules.filter(rule =>
        !(measure.id
          ? (!!rule.sourceMeasureId && rule.sourceMeasureId === measure.id)
          : (!rule.sourceMeasureId && rule.sourceMeasureName === measure.name))
      ))
    );
  }, [persistVisualColumnRules, requestDeleteConfirmation, visualColumnRules]);

  const applyDesignTemplate = useCallback((template: DesignTemplateId) => {
    const write = (objectName: string, values: Record<string, any>) => {
      Object.entries(values).forEach(([propertyName, value]) => onPersistProperty(objectName, propertyName, value));
    };
    const templates = {
      vendor: {
        theme: { preset: "figma-like", density: "comfortable", customAccentColor: "#5146E5", rowHover: true, dividerLines: true },
        appearance: { surfaceColor: "#ffffff", borderColor: "#E8EDF5", accentColor: "#5146E5", cornerRadius: 28, glassmorphism: false, surfaceOpacity: 100, layoutStyle: "framed" },
        general: { rowHeight: 52, defaultColumnWidth: 128, rowHeaderWidth: 230, showGridlines: false, rowBanding: false, fontFamily: "'Aptos', 'Segoe UI Variable', 'Segoe UI', sans-serif" },
        headers: { backgroundColor: "#F8FAFC", textColor: "#111827", fontSize: 12, bold: true },
        values: { fontSize: 12, textColor: "#111827", backgroundColor: "transparent", alignment: "left" },
        dataBars: { enabled: true, positiveColor: "#5146E5", showValueText: true, normalizeBy: "column" },
      },
      billing: {
        theme: { preset: "brand-blue", density: "comfortable", customAccentColor: "#4F46E5", rowHover: true, dividerLines: true },
        appearance: { surfaceColor: "#ffffff", borderColor: "#E5E7EB", accentColor: "#4F46E5", cornerRadius: 30, glassmorphism: false, surfaceOpacity: 100, layoutStyle: "framed" },
        general: { rowHeight: 58, defaultColumnWidth: 140, rowHeaderWidth: 300, showGridlines: false, rowBanding: false, fontFamily: "'Aptos', 'Segoe UI Variable', 'Segoe UI', sans-serif" },
        headers: { backgroundColor: "#FFFFFF", textColor: "#0F172A", fontSize: 12, bold: true },
        values: { fontSize: 13, textColor: "#111827", backgroundColor: "transparent", alignment: "left" },
      },
      customers: {
        theme: { preset: "minimal-whitespace", density: "spacious", customAccentColor: "#4F46E5", rowHover: true, dividerLines: false },
        appearance: { surfaceColor: "#FBFDFF", borderColor: "#E8EEF7", accentColor: "#4F46E5", cornerRadius: 18, glassmorphism: false, surfaceOpacity: 100, layoutStyle: "standard" },
        general: { rowHeight: 66, defaultColumnWidth: 170, rowHeaderWidth: 240, showGridlines: false, rowBanding: false, fontFamily: "'Aptos', 'Segoe UI Variable', 'Segoe UI', sans-serif" },
        headers: { backgroundColor: "#F8FBFF", textColor: "#0F172A", fontSize: 13, bold: true },
        values: { fontSize: 13, textColor: "#111827", backgroundColor: "transparent", alignment: "left" },
        dataBars: { enabled: true, positiveColor: "#5146E5", showValueText: false, normalizeBy: "column" },
      },
      glassPills: {
        theme: { preset: "kinetic-mint", density: "spacious", customAccentColor: "#22C7C9", rowHover: true, dividerLines: false },
        appearance: { surfaceColor: "#FFFFFF", borderColor: "rgba(148,163,184,0.35)", accentColor: "#22C7C9", cornerRadius: 30, glassmorphism: true, surfaceOpacity: 82, backgroundEffect: "gradient", gradientStart: "#F8FAFC", gradientEnd: "#ECFEFF", layoutStyle: "floating" },
        general: { rowHeight: 66, defaultColumnWidth: 160, rowHeaderWidth: 210, showGridlines: false, rowBanding: false, fontFamily: "'Aptos Display', 'Segoe UI Variable Display', 'Segoe UI', sans-serif" },
        headers: { backgroundColor: "rgba(255,255,255,0.78)", textColor: "#334155", fontSize: 13, bold: true },
        values: { fontSize: 13, textColor: "#475569", backgroundColor: "rgba(255,255,255,0.58)", alignment: "right" },
        totals: { grandTotalBold: true, grandTotalBackgroundColor: "rgba(255,255,255,0.78)", grandTotalTextColor: "#111827", subtotalBackgroundColor: "rgba(255,255,255,0.64)" },
      },
      columnCards: {
        theme: { preset: "apple-glass", density: "spacious", customAccentColor: "#38BDF8", rowHover: true, dividerLines: false },
        appearance: { surfaceColor: "#F8FAFC", borderColor: "rgba(148,163,184,0.28)", accentColor: "#38BDF8", cornerRadius: 34, glassmorphism: true, surfaceOpacity: 88, backgroundEffect: "gradient", gradientStart: "#F8FAFC", gradientEnd: "#EEF6FF", layoutStyle: "spotlight" },
        general: { rowHeight: 64, defaultColumnWidth: 150, rowHeaderWidth: 220, showGridlines: false, rowBanding: false, fontFamily: "'Aptos Display', 'Segoe UI Variable Display', 'Segoe UI', sans-serif" },
        headers: { backgroundColor: "#16BFD0", textColor: "#FFFFFF", fontSize: 13, bold: true },
        values: { fontSize: 13, textColor: "#475569", backgroundColor: "rgba(255,255,255,0.68)", alignment: "right" },
        totals: { grandTotalBold: true, grandTotalBackgroundColor: "#FFFFFF", grandTotalTextColor: "#111827", subtotalBackgroundColor: "#F8FAFC" },
      },
    }[template];
    Object.entries(templates).forEach(([objectName, values]) => write(objectName, values as Record<string, any>));
  }, [onPersistProperty]);


  const saveWidth = useCallback((id: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 20 && n <= 600) {
      onPersistProperty("manualData", "colWidths", JSON.stringify({ ...colWidths, [id]: n }));
    }
    setEditingWidth(null);
  }, [colWidths, onPersistProperty]);

  const getAggregationValue = useCallback((measureIndex: number): AggregationType => {
    const raw = aggregationOverrides[String(measureIndex)] ?? aggregationOverrides[`m:${measureIndex}`] ?? aggregationOverrides[`m_${measureIndex}`];
    const value = typeof raw === "string" ? raw : raw?.type || raw?.row || raw?.column;
    const normalized = String(value || "sum").toLowerCase();
    return (AGGREGATION_OPTIONS.some(option => option.value === normalized) ? normalized : "sum") as AggregationType;
  }, [aggregationOverrides]);

  const saveAggregation = useCallback((measureIndex: number, val: AggregationType) => {
    onPersistProperty("manualData", "aggregationOverrides", JSON.stringify({ ...aggregationOverrides, [measureIndex]: val }));
  }, [aggregationOverrides, onPersistProperty]);

  // â”€â”€ drag-and-drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allKeys = (activeTab === "measures" ? measureItems : columnItems).map(i => i.id);

  const buildOrder = useCallback(() => {
    const visibleKeys = uniqueKeys(allKeys);
    let base = uniqueKeys(colOrder).filter(key => visibleKeys.includes(key));
    for (const k of allKeys) if (!base.includes(k)) base.push(k);
    return base;
  }, [colOrder, allKeys]);

  const persistScopedOrder = useCallback((nextScoped: string[]) => {
    const scoped = uniqueKeys(nextScoped);
    const current = uniqueKeys(colOrder);
    const keep = activeTab === "measures"
      ? current.filter(isColumnOrderKey)
      : current.filter(isMeasureOrderKey);
    persistOrder([...keep, ...scoped]);
  }, [activeTab, colOrder, persistOrder]);

  const collectRowMoveKeys = useCallback((rowKey: string): string[] => {
    const row = rows.find(r => r.key === rowKey);
    if (!row) return [rowKey];
    const keys = new Set<string>([rowKey]);
    const start = rows.findIndex(r => r.key === rowKey);
    if (start >= 0) {
      for (let i = start + 1; i < rows.length; i++) {
        const candidate = rows[i];
        const isDescendant =
          candidate.path.length > row.path.length &&
          row.path.every((part, index) => candidate.path[index] === part);
        const isAttachedTotal =
          (candidate.isSubtotal || candidate.isGrandTotal) &&
          candidate.path.length >= row.path.length &&
          row.path.every((part, index) => candidate.path[index] === part);
        if (isDescendant || isAttachedTotal) {
          keys.add(candidate.key);
          continue;
        }
        if (candidate.level <= row.level) break;
      }
    }
    for (const candidate of rows) {
      const isAttachedTotal =
        (candidate.isSubtotal || candidate.isGrandTotal) &&
        candidate.path.length >= row.path.length &&
        row.path.every((part, index) => candidate.path[index] === part);
      if (isAttachedTotal) keys.add(candidate.key);
    }
    return rows.map(r => r.key).filter(key => keys.has(key));
  }, [rows]);

  const persistRowOrder = useCallback((draggedRowKey: string, targetRowKey: string) => {
    const draggedRow = rows.find(row => row.key === draggedRowKey);
    const targetRow = rows.find(row => row.key === targetRowKey);
    if (!draggedRow || !targetRow) return;
    const targetIsDescendant =
      targetRow.path.length > draggedRow.path.length &&
      draggedRow.path.every((part, index) => targetRow.path[index] === part);
    if (targetIsDescendant) return;

    const current = parseJSON<string[]>(settings.manualData.rowOrder || "[]", []);
    const baseline = current.length ? current.filter(key => rows.some(row => row.key === key)) : rows.map(row => row.key);
    for (const row of rows) {
      if (!baseline.includes(row.key)) baseline.push(row.key);
    }

    const moving = collectRowMoveKeys(draggedRowKey);
    const movingSet = new Set(moving);
    const next = baseline.filter(key => !movingSet.has(key));
    const targetIndex = next.indexOf(targetRowKey);
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, ...moving);
    onPersistProperty("manualData", "rowOrder", JSON.stringify(Array.from(new Set(next))));
  }, [collectRowMoveKeys, onPersistProperty, rows, settings.manualData.rowOrder]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (listScrollRef.current) {
      const rect = listScrollRef.current.getBoundingClientRect();
      const threshold = 54;
      const speed = 18;
      if (e.clientY < rect.top + threshold) listScrollRef.current.scrollTop -= speed;
      if (e.clientY > rect.bottom - threshold) listScrollRef.current.scrollTop += speed;
    }
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    if (activeTab === "rows") {
      persistRowOrder(draggedId, targetId);
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const order = buildOrder();
    const fi = order.indexOf(draggedId);
    const ti = order.indexOf(targetId);
    if (fi > -1 && ti > -1) {
      const [moved] = order.splice(fi, 1);
      order.splice(fi < ti ? ti - 1 : ti, 0, moved);
      persistScopedOrder(order);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const moveItemToPosition = useCallback((id: string, position: number) => {
    if (activeTab === "rows") return;
    const order = buildOrder().filter(key => key !== id);
    const target = Math.max(0, Math.min(position, order.length));
    order.splice(target, 0, id);
    persistScopedOrder(order);
  }, [activeTab, buildOrder, persistScopedOrder]);

  const handleDragEnd = () => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      if (activeTab === "rows") {
        persistRowOrder(draggedId, dragOverId);
      } else {
        const order = buildOrder();
        const fi = order.indexOf(draggedId);
        const ti = order.indexOf(dragOverId);
        if (fi > -1 && ti > -1) {
          const [moved] = order.splice(fi, 1);
          order.splice(fi < ti ? ti - 1 : ti, 0, moved);
          persistScopedOrder(order);
        }
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  // â”€â”€ show-all / hide-all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleAll = () => {
    const ref = activeTab === "rows" ? hiddenRowKeysRef : hiddenColsRef;
    const currentSet = ref.current;
    const isAllHidden = items.length > 0 && items.every(i => currentSet.has(i.id));
    
    const next = new Set(currentSet);
    if (isAllHidden) items.forEach(i => next.delete(i.id));
    else items.forEach(i => next.add(i.id));
    persistHiddenState(next);
  };

  const handleDeleteItem = useCallback((item: any) => {
    if (item.measure?.id && onDeleteCalcMeasure) {
      requestDeleteConfirmation(
        "Delete calculated measure?",
        `Delete calculated measure "${item.measure.name || item.label || "this measure"}"? This cannot be undone.`,
        () => onDeleteCalcMeasure(item.measure.id)
      );
      return;
    }
    if (item.row?.key?.startsWith("__calcrow__") && onDeleteCalcRow) {
      requestDeleteConfirmation(
        "Delete calculated row?",
        `Delete calculated row "${item.row.label ?? "this row"}"? This cannot be undone.`,
        () => onDeleteCalcRow(item.row.key)
      );
    }
  }, [onDeleteCalcMeasure, onDeleteCalcRow, requestDeleteConfirmation]);

  const saveRename = (id: string, newLabel: string) => {
    const next = { ...labelOverrides, [id]: newLabel };
    onPersistProperty("manualData", "labelOverrides", JSON.stringify(next));
    setRenamingId(null);
  };


  // ── presentation ─────────────────────────────────────────────────────────
  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setSearch("");
    setShowHiddenOnly(false);
    setEditingWidth(null);
  };

  const isVisibilityTab = activeTab === "measures" || activeTab === "columns" || activeTab === "rows";
  const hiddenSet = activeTab === "rows" ? hiddenRowKeysState : hiddenColsState;
  const allItemsHidden = items.length > 0 && items.every(i => hiddenSet.has(i.id));
  const noun = activeTab === "measures" ? "measure" : activeTab === "columns" ? "column" : "row";
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const renderList = () => {
    if (items.length === 0) {
      return (
        <EmptyNote
          title={search ? "No matches" : showHiddenOnly ? `No hidden ${noun}s` : `No ${noun}s`}
          hint={search ? "Try a different search." : showHiddenOnly ? `Every ${noun} is visible.` : undefined}
        />
      );
    }
    return (
      <ul className="mx-list">
        {items.map((item: any) => {
          const isHidden = hiddenSet.has(item.id);
          const displayLabel = labelOverrides[item.id] || item.label;
          const opensWizard = activeTab === "measures" && item.isCalculatedMeasure && item.measure?.id;
          return (
            <li
              key={item.id}
              draggable
              onDragStart={e => handleDragStart(e, item.id)}
              onDragOver={e => handleDragOver(e, item.id)}
              onDrop={e => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
              className={cx("mx-item", draggedId === item.id && "is-dragging", dragOverId === item.id && "is-drop-target")}
              style={{
                flexWrap: "wrap",
                marginLeft: activeTab === "columns" && item.level ? Math.min(28, item.level * 10) : 0,
              }}
            >
              <span className="mx-item-grip" aria-hidden="true"><IconGrip size={14} /></span>
              <div className="mx-item-main" style={{ minWidth: 140, opacity: isHidden ? 0.5 : 1 }}>
                {renamingId === item.id ? (
                  <input
                    className="mx-input is-sm"
                    autoFocus
                    aria-label="Name"
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    onBlur={() => saveRename(item.id, renameInput)}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveRename(item.id, renameInput);
                      if (e.key === "Escape") {
                        // Cancel the rename without closing the whole sheet.
                        e.preventDefault();
                        setRenamingId(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="mx-item-title"
                    title={opensWizard ? "Edit calculated measure" : "Rename"}
                    style={{ padding: 0, border: 0, background: "none", fontFamily: "inherit", textAlign: "left", cursor: "pointer", maxWidth: "100%" }}
                    onClick={() => {
                      if (opensWizard) {
                        onOpenCalcMeasureWizard?.(item.measure.id);
                        return;
                      }
                      setRenamingId(item.id);
                      setRenameInput(labelOverrides[item.id] || item.label);
                    }}
                  >
                    {displayLabel}
                  </button>
                )}
                <span className="mx-item-meta">{item.sub}</span>
              </div>
              <div className="mx-item-actions" style={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 4, flexShrink: 1, minWidth: 0 }}>
                {activeTab === "columns" && (item.col?.isSubtotal || item.col?.isGrandTotal) && (
                  <select
                    className="mx-select is-sm"
                    style={{ width: "auto" }}
                    aria-label="Total position"
                    title="Place this total at the beginning or end of its hierarchy"
                    value={totalPositions[item.col.key] || "inherit"}
                    onChange={(e) => updateTotalPosition(item.col.key, e.target.value as "inherit" | "beginning" | "end")}
                  >
                    <option value="inherit">Default position</option>
                    <option value="beginning">Beginning</option>
                    <option value="end">End</option>
                  </select>
                )}
                {(activeTab === "measures" || activeTab === "columns") && (
                  <>
                    {activeTab === "measures" && (
                      <select
                        className="mx-select is-sm mx-num"
                        style={{ width: "auto" }}
                        aria-label="Position"
                        title="Move measure to position across every column"
                        value={Math.max(0, buildOrder().indexOf(item.id))}
                        onChange={(e) => moveItemToPosition(item.id, parseInt(e.target.value, 10))}
                      >
                        {measureItems.map((measureItem, index) => (
                          <option key={measureItem.id} value={index}>{index + 1}</option>
                        ))}
                      </select>
                    )}
                    {item.measure && (
                      <select
                        className="mx-select is-sm"
                        style={{ width: "auto" }}
                        aria-label="Aggregation"
                        title="Aggregation"
                        value={getAggregationValue(item.measure.index)}
                        onChange={(e) => saveAggregation(item.measure.index, e.target.value as AggregationType)}
                      >
                        {AGGREGATION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                    {opensWizard && (
                      <Button size="sm" variant="ghost" title="Edit calculated measure" onClick={(e) => { e.stopPropagation(); onOpenCalcMeasureWizard?.(item.measure.id); }}>
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Convert to visual column"
                      onClick={() => {
                        if (activeTab === "measures" && item.measure) addVisualRuleForMeasure(item.measure);
                        if (activeTab === "columns" && item.col && item.measure) addVisualRuleForColumnMeasure(item.col, item.measure);
                        else if (activeTab === "columns" && item.col) addVisualRulesForColumn(item.col);
                      }}
                    >
                      Visual
                    </Button>
                    {activeTab === "measures" && item.measure && hasVisualRuleForMeasure(item.measure) && (
                      <Button size="sm" variant="ghost" title="Delete the visual column rules for this measure" onClick={(e) => { e.stopPropagation(); deleteVisualRulesForMeasure(item.measure); }}>
                        Remove visual
                      </Button>
                    )}
                    {opensWizard && onDeleteCalcMeasure && (
                      <IconButton label="Delete calculated measure" tone="danger" icon={<IconTrash size={14} />} onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }} />
                    )}
                  </>
                )}
              </div>
              <span title={isHidden ? `Show ${noun}` : `Hide ${noun}`}>
                <Switch checked={!isHidden} onChange={() => toggleVisibility(item.id)} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderLevelAware = () => (
    <>
      <Section
        title="Level-aware columns"
        description="An optional layout for aging and transaction-detail reports. Detail fields render once in their own zone; distributed measures repeat across buckets."
      >
        <Switch
          checked={!!levelAwareConfig.enabled}
          onChange={() => persistLevelAwareConfig({ ...levelAwareConfig, enabled: !levelAwareConfig.enabled })}
          label="Use level-aware layout"
        />
      </Section>

      {rowFieldItems.length > 0 && (
        <Section title="Row field roles">
          <div className="mx-stack is-tight">
            {rowFieldItems.map(item => {
              const role = item.config?.role || "hierarchy";
              const displayAt = item.config?.displayAt || (role === "detail" ? "leaf" : "all");
              const placement = item.config?.placement || (role === "detail" ? "detailColumns" : role === "hiddenKey" ? "hidden" : "rowHeader");
              const aggregation = item.config?.aggregation || "none";
              return (
                <div key={item.levelIndex} className="mx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: 10 }}>
                  <div className="mx-item-main" style={{ flex: "none" }}>
                    <span className="mx-item-title">{item.fieldName}</span>
                    <span className="mx-item-meta">Level {item.levelIndex + 1}</span>
                  </div>
                  <div className="mx-grid-2">
                    <Field label="Role">
                      <select className="mx-select is-sm" aria-label="Role" value={role} onChange={e => updateRowField(item.levelIndex, item.fieldName, { role: e.target.value as RowFieldRole, placement: e.target.value === "detail" ? "detailColumns" : e.target.value === "hiddenKey" ? "hidden" : "rowHeader" })}>
                        {ROW_FIELD_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Show at">
                      <select className="mx-select is-sm" aria-label="Show at" value={displayAt} onChange={e => updateRowField(item.levelIndex, item.fieldName, { displayAt: e.target.value as RowFieldDisplayAt })}>
                        {ROW_FIELD_DISPLAY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Placement">
                      <select className="mx-select is-sm" aria-label="Placement" value={placement} onChange={e => updateRowField(item.levelIndex, item.fieldName, { placement: e.target.value as RowFieldPlacement })}>
                        {ROW_FIELD_PLACEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Aggregation">
                      <select className="mx-select is-sm" aria-label="Aggregation" value={aggregation} onChange={e => updateRowField(item.levelIndex, item.fieldName, { aggregation: e.target.value as RowFieldAggregation })}>
                        {ROW_FIELD_AGG_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Measures">
        {levelAwareItems.length === 0 ? (
          <EmptyNote title={search ? "No matches" : "No measures"} hint={search ? "Try a different search." : undefined} />
        ) : (
          <div className="mx-stack is-tight">
            {levelAwareItems.map((item, index) => {
              const field = item.field;
              const displayMode = field?.displayMode || "distributed";
              const rowVisibility = field?.rowVisibility || (displayMode === "detail" ? "leaf" : "all");
              const columnGroupVisibility = field?.columnGroupVisibility || (displayMode === "detail" ? "notRepeated" : "all");
              const aggregation = (field?.aggregation || (displayMode === "detail" ? "none" : "sum")) as LevelAwareAggregation;
              const placement = field?.placement || "beforeDistributed";
              const enabled = field?.enabled !== false && field?.hidden !== true;
              return (
                <div key={item.id} className="mx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: 10 }}>
                  <div className="mx-row">
                    <div className="mx-item-main">
                      <span className="mx-item-title">{item.label}</span>
                      <span className="mx-item-meta">{item.sub}</span>
                    </div>
                    <div className="mx-item-actions">
                      <IconButton label="Move up" icon={<IconArrowUp size={14} />} disabled={index === 0} onClick={() => moveLevelAwareField(item.measureIndex, -1)} />
                      <IconButton label="Move down" icon={<IconArrowDown size={14} />} disabled={index === levelAwareItems.length - 1} onClick={() => moveLevelAwareField(item.measureIndex, 1)} />
                    </div>
                    <span title={enabled ? "Hide measure" : "Show measure"}>
                      <Switch checked={enabled} onChange={() => updateLevelAwareField(item.measure, item.measureIndex, { hidden: enabled, enabled: true })} />
                    </span>
                  </div>
                  <div className="mx-grid-2">
                    <Field label="Display as">
                      <select className="mx-select is-sm" aria-label="Display as" value={displayMode} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { displayMode: e.target.value as LevelAwareDisplayMode })}>
                        {DISPLAY_MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Rows">
                      <select className="mx-select is-sm" aria-label="Rows" value={rowVisibility} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { rowVisibility: e.target.value as LevelAwareRowVisibility })}>
                        {ROW_VISIBILITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Column groups">
                      <select className="mx-select is-sm" aria-label="Column groups" value={columnGroupVisibility} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { columnGroupVisibility: e.target.value as LevelAwareColumnGroupVisibility })}>
                        {COLUMN_GROUP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Aggregation">
                      <select className="mx-select is-sm" aria-label="Aggregation" value={aggregation} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { aggregation: e.target.value as LevelAwareAggregation })}>
                        {AGGREGATION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Placement">
                      <select className="mx-select is-sm" aria-label="Placement" value={placement} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { placement: e.target.value as LevelAwarePlacement })}>
                        {PLACEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );

  const renderVisualColumns = () => {
    if (filteredVisualColumnRules.length === 0) {
      return search ? (
        <EmptyNote title="No matches" hint="Try a different search." />
      ) : (
        <EmptyNote
          title="No visual columns"
          hint="Add a rule here, or use Visual on a measure or column."
        />
      );
    }
    return (
      <div className="mx-stack is-tight">
        {filteredVisualColumnRules.map(rule => (
          <div key={rule.id} className="mx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: 10 }}>
            <div className="mx-row">
              <div className="mx-item-main">
                <span className="mx-item-title">{rule.sourceMeasureName || "Unnamed rule"}</span>
              </div>
              <span title={rule.enabled !== false ? "Turn off" : "Turn on"}>
                <Switch checked={rule.enabled !== false} onChange={() => updateVisualColumnRule(rule.id, { enabled: rule.enabled === false })} />
              </span>
              <IconButton
                label="Delete visual column"
                tone="danger"
                icon={<IconTrash size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteVisualColumnRule(rule.id);
                }}
              />
            </div>
            <div className="mx-grid-2">
              <Field label="Frequency">
                <select className="mx-select is-sm" aria-label="Frequency" value={rule.frequency} onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as any })}>
                  <option value="all">Everywhere</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="ytd">YTD total</option>
                  <option value="specific">Specific</option>
                </select>
              </Field>
              <Field label="Position">
                <select className="mx-select is-sm" aria-label="Position" value={rule.position} onChange={e => updateVisualColumnRule(rule.id, { position: e.target.value as any })}>
                  <option value="normal">Normal</option>
                  <option value="beginning">Beginning</option>
                  <option value="end">End</option>
                </select>
              </Field>
            </div>
            <Field label="Style applies to">
              <Segmented
                size="sm"
                ariaLabel="Style applies to"
                value={rule.applyTo || "both"}
                onChange={(applyTo) => updateVisualColumnRule(rule.id, { applyTo })}
                options={[
                  { value: "both", label: "Headers and values" },
                  { value: "headers", label: "Headers" },
                  { value: "values", label: "Values" },
                ]}
              />
            </Field>
          </div>
        ))}
      </div>
    );
  };

  const renderDesign = () => (
    <>
      <Section title="Templates" description="Each template overwrites theme, layout, header and value settings.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {DESIGN_TEMPLATES.map(([id, label, description]) => (
            <button
              key={id}
              type="button"
              className="mx-item is-clickable"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: 10, textAlign: "left", fontFamily: "inherit" }}
              onClick={() => applyDesignTemplate(id)}
            >
              <span className="mx-item-title">{label}</span>
              <span className="mx-item-meta" style={{ whiteSpace: "normal" }}>{description}</span>
            </button>
          ))}
        </div>
      </Section>

      <div className="mx-divider" />

      <Section title="Surface">
        <div className="mx-stack">
          <Field label="Background" inline>
            <ColorWell
              label="Background color"
              value={settings.appearance.surfaceColor || "#ffffff"}
              onChange={value => onPersistProperty("appearance", "surfaceColor", value)}
            />
          </Field>
          <Field label="Corner radius" inline>
            <input
              type="range" min="0" max="40"
              aria-label="Corner radius"
              value={settings.appearance.cornerRadius || 0}
              onChange={e => onPersistProperty("appearance", "cornerRadius", parseInt(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: "var(--mx-accent)" }}
            />
            <span className="mx-num mx-muted" style={{ width: 28, textAlign: "right" }}>{settings.appearance.cornerRadius || 0}</span>
          </Field>
          <Field label="Background image URL">
            <input
              className="mx-input"
              type="text"
              placeholder="https://example.com/image.jpg"
              value={(settings.appearance as any).backgroundImage || ""}
              onChange={e => onPersistProperty("appearance", "backgroundImage", e.target.value)}
            />
          </Field>
          <Field label="Background blur" inline>
            <input
              type="range" min="0" max="40"
              aria-label="Background blur"
              value={(settings.appearance as any).backgroundBlur || 0}
              onChange={e => onPersistProperty("appearance", "backgroundBlur", parseInt(e.target.value))}
              style={{ flex: 1, minWidth: 0, accentColor: "var(--mx-accent)" }}
            />
            <span className="mx-num mx-muted" style={{ width: 28, textAlign: "right" }}>{(settings.appearance as any).backgroundBlur || 0}</span>
          </Field>
          <Switch
            label="Frosted glass"
            checked={(settings.appearance as any).glassmorphism || false}
            onChange={() => onPersistProperty("appearance", "glassmorphism", !(settings.appearance as any).glassmorphism)}
          />
        </div>
      </Section>

      <div className="mx-divider" />

      <Section title="Typography">
        <div className="mx-stack">
          <Field label="Value font size" inline>
            <input
              className="mx-input is-num"
              type="number"
              aria-label="Value font size"
              style={{ width: 80 }}
              value={settings.values.fontSize}
              onChange={e => onPersistProperty("values", "fontSize", parseInt(e.target.value))}
            />
          </Field>
          <Field label="Value alignment" inline>
            <Segmented
              ariaLabel="Value alignment"
              value={settings.values.alignment}
              onChange={value => onPersistProperty("values", "alignment", value)}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          </Field>
        </div>
      </Section>
    </>
  );

  const searchPlaceholder =
    activeTab === "visualColumns" ? "Search visual columns"
      : activeTab === "levelAware" ? "Search measures and fields"
        : `Search ${noun}s`;

  const countLabel = plural(items.length, noun) + (showHiddenOnly ? " hidden" : "");

  return (
    <>
      <Overlay
        kind="sheet"
        title="Manage columns"
        subtitle="Changes apply as you make them."
        width={panelWidth}
        onClose={onClose}
        flush
        toolbar={<Tabs<TabId> ariaLabel="Manage columns sections" tabs={TABS} value={activeTab} onChange={switchTab} />}
      >
        {activeTab !== "design" && (
          <div className="mx-stack is-tight" style={{ padding: "12px var(--mx-ov-pad) 10px", borderBottom: "1px solid var(--mx-ov-line)", flexShrink: 0 }}>
            <div className="mx-row">
              <input
                className="mx-input"
                type="search"
                aria-label="Search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              {activeTab === "measures" && (
                <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => { onClose(); onOpenCalcMeasureWizard?.(); }}>
                  New measure
                </Button>
              )}
              {activeTab === "visualColumns" && (
                <Button variant="primary" icon={<IconPlus size={14} />} onClick={addVisualColumnRule}>
                  Add rule
                </Button>
              )}
            </div>
            {isVisibilityTab && (
              <div className="mx-row is-between">
                <span className="mx-muted mx-num">{countLabel}</span>
                <div className="mx-row" style={{ gap: 12 }}>
                  <Switch checked={showHiddenOnly} onChange={setShowHiddenOnly} label="Hidden only" />
                  <Button variant="ghost" size="sm" disabled={items.length === 0} onClick={toggleAll}>
                    {allItemsHidden ? "Show all" : "Hide all"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          ref={listScrollRef}
          className="mx-stack"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px var(--mx-ov-pad) var(--mx-ov-pad)", gap: 20 }}
        >
          {activeTab === "levelAware"
            ? renderLevelAware()
            : activeTab === "visualColumns"
              ? renderVisualColumns()
              : activeTab === "design"
                ? renderDesign()
                : renderList()}
        </div>
      </Overlay>

      {confirmRequest && (
        <Overlay
          kind="dialog"
          title={confirmRequest.title}
          width={400}
          onClose={() => setConfirmRequest(null)}
          footer={
            <>
              <Button onClick={() => setConfirmRequest(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  const action = confirmRequest.onConfirm;
                  setConfirmRequest(null);
                  action();
                }}
              >
                {confirmRequest.confirmLabel || "Delete"}
              </Button>
            </>
          }
        >
          <p className="mx-muted" style={{ margin: 0, lineHeight: 1.5 }}>{confirmRequest.message}</p>
        </Overlay>
      )}
    </>
  );
};
