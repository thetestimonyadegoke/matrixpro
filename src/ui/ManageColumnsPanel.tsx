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
  { value: "hierarchy", label: "Hierarchy Level" },
  { value: "detail", label: "Detail Column" },
  { value: "hiddenKey", label: "Hidden Key" },
  { value: "groupingOnly", label: "Grouping Only" },
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
  { value: "sameElseMultiple", label: "Show if same else Multiple" },
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

// â”€â”€â”€ small presentational pieces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);



const ui = {
  bg: "#f8fbff",
  panel: "linear-gradient(180deg, #eef4ff 0%, #f8fafc 48%, #f7fbff 100%)",
  panelSoft: "rgba(255, 255, 255, 0.72)",
  surface: "rgba(255,255,255,0.82)",
  surfaceHover: "rgba(255,255,255,0.96)",
  surfaceActive: "rgba(237, 246, 255, 0.96)",
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(148, 163, 184, 0.24)",
  text: "#0f172a",
  textMuted: "#64748b",
  accent: "#0ea5e9",
  accentStrong: "#0284c7",
  accentSoft: "rgba(14,165,233,0.12)",
  danger: "#e11d48",
  dangerSoft: "rgba(225,29,72,0.10)",
  shadow: "-24px 0 60px rgba(15, 23, 42, 0.18)",
  shadowSoft: "0 14px 40px rgba(15, 23, 42, 0.08)",
  glow: "0 0 18px rgba(14,165,233,0.18)",
};

const overlayStyles: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 7600,
  background: "linear-gradient(180deg, rgba(15,23,42,0.18), rgba(15,23,42,0.34))",
  backdropFilter: "blur(12px) saturate(112%)",
  display: "flex", alignItems: "stretch", justifyContent: "flex-end",
  fontFamily: "'Segoe UI Variable Display', 'Segoe UI', sans-serif",
  animation: "matrix-fade-in 0.3s ease-out",
};

const actionBtn: React.CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
};

const miniBtn: React.CSSProperties = {
  height: 26,
  padding: "0 8px",
  borderRadius: 8,
  border: `1px solid ${ui.border}`,
  background: "rgba(255,255,255,0.72)",
  color: ui.textMuted,
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    style={{
      width: 44, height: 24, borderRadius: 12,
      minWidth: 44,
      flex: "0 0 44px",
      boxSizing: "border-box",
      background: checked ? "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)" : "rgba(255,255,255,0.1)",
      position: "relative", cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex", alignItems: "center",
      padding: 3,
      boxShadow: checked ? "0 0 12px rgba(0, 229, 255, 0.4)" : "none",
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      transform: checked ? "translateX(20px)" : "translateX(0)",
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }} />
  </div>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const DragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "rgba(255, 255, 255, 0.2)" }}><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>
);

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
  const compact = visualWidth < 980 || visualHeight < 620;
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

  const applyDesignTemplate = useCallback((template: "vendor" | "billing" | "customers" | "glassPills" | "columnCards") => {
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


  // â”€â”€ tab button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const TabBtn = ({ id, label }: { id: TabId; label: string }) => {
    const active = activeTab === id;
    return (
      <div
        onClick={() => { setActiveTab(id); setSearch(""); setShowHiddenOnly(false); setEditingWidth(null); }}
        style={{
          margin: "0 0 4px",
          padding: compact ? "8px 0" : "9px 0",
          cursor: "pointer", 
          fontSize: compact ? 11 : 12,
          borderRadius: 0,
          border: "none",
          borderBottom: `1px solid ${active ? "rgba(14,165,233,0.28)" : "transparent"}`,
          background: "transparent",
          color: active ? ui.accent : ui.textMuted,
          fontWeight: active ? 800 : 600,
          display: "flex", alignItems: "center", gap: 12,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          if (!active) e.currentTarget.style.color = ui.text;
        }}
        onMouseLeave={e => {
          if (!active) e.currentTarget.style.color = ui.textMuted;
        }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: active ? ui.accent : "rgba(100,116,139,0.25)",
          boxShadow: "none",
        }} />
        {label}
      </div>
    );
  };

  return (
    <div style={overlayStyles} onClick={onClose}>
      <style>{`
        @keyframes matrix-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glow-pulse { 0% { box-shadow: 0 0 5px rgba(0, 229, 255, 0.4); } 50% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.8); } 100% { box-shadow: 0 0 5px rgba(0, 229, 255, 0.4); } }
        .matrix-scrollbar::-webkit-scrollbar { width: 4px; }
        .matrix-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .matrix-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
        .matrix-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .studio-card {
          background: ${ui.panelSoft};
          border: 1px solid ${ui.border};
          border-radius: 18px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
        }
      `}</style>
      <div
        style={{
          width: `min(${panelWidth}px, 100%)`,
          height: "100%",
          background: ui.panel,
          borderLeft: `1px solid ${ui.borderStrong}`,
          boxShadow: ui.shadow,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: compact ? 154 : 176, borderRight: `1px solid ${ui.border}`, background: "rgba(255,255,255,0.24)", display: "flex", flexDirection: "column", padding: compact ? "18px 12px 18px" : "20px 14px 20px" }}>
          <div style={{ padding: compact ? "0 2px 14px" : "0 4px 16px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: ui.textMuted, fontWeight: 800 }}>Design Studio</div>
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: compact ? 18 : 20, lineHeight: 1.04, color: ui.text, letterSpacing: "-0.04em" }}>
              Manage Columns
            </div>
          </div>
          <TabBtn id="measures" label="Measures" />
          <TabBtn id="columns" label="Columns" />
          <TabBtn id="visualColumns" label="Visuals" />
          <TabBtn id="levelAware" label="Level Aware" />
          <TabBtn id="rows" label="Rows" />
          <TabBtn id="design" label="Design Studio" />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(255,255,255,0.12)", position: "relative" }}>
          {/* Grid Overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)", backgroundSize: "26px 26px", opacity: 0.22, pointerEvents: "none" }} />
          
          <div style={{ padding: compact ? "16px 16px 14px" : "18px 18px 16px", borderBottom: `1px solid ${ui.border}`, display: "grid", gap: 12, zIndex: 1, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: ui.textMuted, fontWeight: 800 }}>Design Studio</div>
                <h1 style={{ margin: "6px 0 0", fontSize: compact ? 20 : 22, fontWeight: 800, color: ui.text, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                  {activeTab === "design" ? "Design Studio" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
              </div>
              <button
                onClick={onClose}
                style={{ border: "none", background: "rgba(255,255,255,0.72)", borderRadius: 12, width: 36, height: 36, fontSize: 18, color: "#475569", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {(activeTab === "measures" || activeTab === "columns" || activeTab === "rows") && (
                <button
                  type="button"
                  onClick={() => setShowHiddenOnly(prev => !prev)}
                  style={{
                    ...actionBtn,
                    background: showHiddenOnly ? ui.accentSoft : "rgba(255,255,255,0.62)",
                    color: showHiddenOnly ? ui.accent : ui.text,
                    border: `1px solid ${showHiddenOnly ? "rgba(14,165,233,0.28)" : ui.border}`,
                  }}
                >
                  {showHiddenOnly ? "Showing Hidden" : "Show Hidden"}
                </button>
              )}
              {(activeTab === "measures" || activeTab === "visualColumns") && (
                <button
                  onClick={activeTab === "measures" ? () => { onClose(); onOpenCalcMeasureWizard?.(); } : addVisualColumnRule}
                  style={{
                    ...actionBtn,
                    background: ui.accent,
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 10px 24px rgba(14,165,233,0.2)",
                  }}
                >
                  <PlusIcon /> {activeTab === "measures" ? "New Measure" : "Add Rule"}
                </button>
              )}
              {activeTab === "levelAware" && (
                <button
                  type="button"
                  onClick={() => persistLevelAwareConfig({ ...levelAwareConfig, enabled: !levelAwareConfig.enabled })}
                  style={{
                    ...actionBtn,
                    background: levelAwareConfig.enabled ? ui.accent : "rgba(255,255,255,0.62)",
                    color: levelAwareConfig.enabled ? "#fff" : ui.text,
                    border: levelAwareConfig.enabled ? "none" : `1px solid ${ui.border}`,
                  }}
                >
                  {levelAwareConfig.enabled ? "Level Aware On" : "Enable Layout"}
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: compact ? "14px 16px 12px" : "16px 18px 14px", zIndex: 1 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.78)",
                  border: `1px solid ${ui.border}`,
                  padding: compact ? "10px 14px 10px 40px" : "11px 14px 11px 42px",
                  color: ui.text,
                  fontSize: compact ? 12 : 13,
                  borderRadius: 12,
                  outline: "none",
                }}
              />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: ui.textMuted }}>
                <SearchIcon />
              </div>
            </div>
            <div style={{ height: 1, background: ui.border, margin: compact ? "14px -16px 0 -16px" : "16px -18px 0 -18px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <div style={{ color: ui.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {activeTab === "levelAware" ? levelAwareItems.length : items.length} {activeTab} available
              </div>
              <button 
                onClick={toggleAll}
                style={{ background: "none", border: "none", color: ui.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 8px" }}
              >
                Toggle Visibility
              </button>
            </div>
          </div>

          <div ref={listScrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 22px 22px", zIndex: 1 }} className="matrix-scrollbar">
            {activeTab === "levelAware" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
                <div className="studio-card" style={{ padding: 14, borderColor: levelAwareConfig.enabled ? "rgba(14,165,233,0.28)" : ui.border }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ui.text }}>Level-Aware Columns</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: ui.textMuted, lineHeight: 1.45 }}>
                    Optional asymmetric layout for aging and transaction-detail reports. Detail fields render once in their own zone; distributed measures continue across buckets.
                  </div>
                </div>
                {rowFieldItems.length > 0 && (
                  <div className="studio-card" style={{ padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: ui.text, marginBottom: 10 }}>Row Field Roles</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {rowFieldItems.map(item => {
                        const role = item.config?.role || "hierarchy";
                        const displayAt = item.config?.displayAt || (role === "detail" ? "leaf" : "all");
                        const placement = item.config?.placement || (role === "detail" ? "detailColumns" : role === "hiddenKey" ? "hidden" : "rowHeader");
                        const aggregation = item.config?.aggregation || "none";
                        return (
                          <div key={item.levelIndex} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1.1fr) repeat(4, minmax(120px, 1fr))", gap: 8, alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: ui.text }}>{item.fieldName}</div>
                              <div style={{ fontSize: 10, color: ui.textMuted }}>Level {item.levelIndex + 1}</div>
                            </div>
                            <select value={role} onChange={e => updateRowField(item.levelIndex, item.fieldName, { role: e.target.value as RowFieldRole, placement: e.target.value === "detail" ? "detailColumns" : e.target.value === "hiddenKey" ? "hidden" : "rowHeader" })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                              {ROW_FIELD_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={displayAt} onChange={e => updateRowField(item.levelIndex, item.fieldName, { displayAt: e.target.value as RowFieldDisplayAt })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                              {ROW_FIELD_DISPLAY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={placement} onChange={e => updateRowField(item.levelIndex, item.fieldName, { placement: e.target.value as RowFieldPlacement })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                              {ROW_FIELD_PLACEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={aggregation} onChange={e => updateRowField(item.levelIndex, item.fieldName, { aggregation: e.target.value as RowFieldAggregation })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                              {ROW_FIELD_AGG_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {levelAwareItems.map((item, index) => {
                  const field = item.field;
                  const displayMode = field?.displayMode || "distributed";
                  const rowVisibility = field?.rowVisibility || (displayMode === "detail" ? "leaf" : "all");
                  const columnGroupVisibility = field?.columnGroupVisibility || (displayMode === "detail" ? "notRepeated" : "all");
                  const aggregation = (field?.aggregation || (displayMode === "detail" ? "none" : "sum")) as LevelAwareAggregation;
                  const placement = field?.placement || "beforeDistributed";
                  const enabled = field?.enabled !== false && field?.hidden !== true;
                  return (
                    <div key={item.id} className="studio-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: ui.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                          <div style={{ fontSize: 10, color: ui.textMuted, marginTop: 2 }}>{item.sub}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button type="button" disabled={index === 0} onClick={() => moveLevelAwareField(item.measureIndex, -1)} style={{ ...miniBtn, opacity: index === 0 ? 0.45 : 1 }}>Up</button>
                          <button type="button" disabled={index === levelAwareItems.length - 1} onClick={() => moveLevelAwareField(item.measureIndex, 1)} style={{ ...miniBtn, opacity: index === levelAwareItems.length - 1 ? 0.45 : 1 }}>Down</button>
                          <Toggle checked={enabled} onChange={() => updateLevelAwareField(item.measure, item.measureIndex, { hidden: enabled, enabled: true })} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                        <select value={displayMode} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { displayMode: e.target.value as LevelAwareDisplayMode })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                          {DISPLAY_MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <select value={rowVisibility} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { rowVisibility: e.target.value as LevelAwareRowVisibility })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                          {ROW_VISIBILITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <select value={columnGroupVisibility} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { columnGroupVisibility: e.target.value as LevelAwareColumnGroupVisibility })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                          {COLUMN_GROUP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <select value={aggregation} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { aggregation: e.target.value as LevelAwareAggregation })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                          {AGGREGATION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <select value={placement} onChange={e => updateLevelAwareField(item.measure, item.measureIndex, { placement: e.target.value as LevelAwarePlacement })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 10px", borderRadius: 8, fontSize: 11 }}>
                          {PLACEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === "visualColumns" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 16 }}>
                {filteredVisualColumnRules.map(rule => (
                  <div key={rule.id} className="studio-card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                       <div style={{ fontSize: 14, fontWeight: 700, color: ui.accent }}>{rule.sourceMeasureName || "Unnamed Rule"}</div>
                       <div style={{ display: "flex", gap: 8 }}>
                          <Toggle checked={rule.enabled !== false} onChange={() => updateVisualColumnRule(rule.id, { enabled: rule.enabled === false })} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVisualColumnRule(rule.id);
                            }}
                            style={{ background: "none", border: "none", color: ui.danger, cursor: "pointer" }}
                          >
                            <TrashIcon />
                          </button>
                       </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                       <select value={rule.frequency} onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as any })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                          <option value="all">Everywhere</option>
                          <option value="yearly">Yearly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="ytd">YTD Total</option>
                          <option value="specific">Specific</option>
                       </select>
                       <select value={rule.position} onChange={e => updateVisualColumnRule(rule.id, { position: e.target.value as any })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                          <option value="normal">Normal</option>
                          <option value="beginning">Beginning</option>
                          <option value="end">End</option>
                       </select>
                    </div>
                    <div style={{ marginTop: 12 }}>
                       <div style={{ fontSize: 10, color: ui.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>Style Application</div>
                       <select 
                         value={rule.applyTo || "both"} 
                         onChange={e => updateVisualColumnRule(rule.id, { applyTo: e.target.value as any })} 
                         style={{ width: "100%", background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}
                       >
                          <option value="both">Apply to Headers & Values</option>
                          <option value="headers">Headers Only</option>
                          <option value="values">Values Only</option>
                       </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === "design" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 16 }}>
                <div className="studio-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Report Design Templates</div>
                  <div style={{ fontSize: 12, color: ui.textMuted, marginBottom: 16 }}>
                    Presets inspired by modern SaaS tables, billing ledgers, customer directories, glass pill reports, and rounded card matrices.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                    {[
                      ["vendor", "Vendor Activity", "Searchable SaaS directory with progress bars and soft pills"],
                      ["billing", "Billing History", "Invoice-style rows with clean status and action columns"],
                      ["customers", "Customer Table", "Avatar/payment/category report with spacious app rows"],
                      ["glassPills", "Glass Pills", "Floating glass rows with turquoise pill labels"],
                      ["columnCards", "Column Cards", "Rounded vertical-card matrix inspired by data cards"],
                    ].map(([id, label, description]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => applyDesignTemplate(id as any)}
                        style={{
                          textAlign: "left",
                          border: `1px solid ${ui.border}`,
                          background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                          color: ui.text,
                          borderRadius: 14,
                          padding: "12px 14px",
                          cursor: "pointer",
                          minHeight: 86,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 10, lineHeight: 1.4, color: ui.textMuted }}>{description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="studio-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Surface Aesthetics</div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Background Color</div>
                      <input 
                        type="color" 
                        value={settings.appearance.surfaceColor || "#ffffff"} 
                        onChange={e => onPersistProperty("appearance", "surfaceColor", e.target.value)}
                        style={{ width: "100%", height: 40, border: "none", background: "none", cursor: "pointer" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Corner Radius</div>
                      <input 
                        type="range" min="0" max="40" 
                        value={settings.appearance.cornerRadius || 0}
                        onChange={e => onPersistProperty("appearance", "cornerRadius", parseInt(e.target.value))}
                        style={{ width: "100%", accentColor: ui.accent }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Background Image URL</div>
                    <input 
                      type="text" 
                      placeholder="https://example.com/image.jpg"
                      value={(settings.appearance as any).backgroundImage || ""}
                      onChange={e => onPersistProperty("appearance", "backgroundImage", e.target.value)}
                      style={{ width: "100%", background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Blur Intensity</div>
                      <input 
                        type="range" min="0" max="40" 
                        value={(settings.appearance as any).backgroundBlur || 0}
                        onChange={e => onPersistProperty("appearance", "backgroundBlur", parseInt(e.target.value))}
                        style={{ width: "100%", accentColor: ui.accent }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Glassmorphism</div>
                      <Toggle 
                        checked={(settings.appearance as any).glassmorphism || false} 
                        onChange={() => onPersistProperty("appearance", "glassmorphism", !(settings.appearance as any).glassmorphism)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="studio-card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Typography & Contrast</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Primary Font Size</div>
                      <input 
                        type="number" 
                        value={settings.values.fontSize}
                        onChange={e => onPersistProperty("values", "fontSize", parseInt(e.target.value))}
                        style={{ width: "100%", background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ui.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Header Alignment</div>
                      <select 
                        value={settings.values.alignment}
                        onChange={e => onPersistProperty("values", "alignment", e.target.value)}
                        style={{ width: "100%", background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8 }}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
                {items.map((item: any) => {
                  const isHidden = activeTab === "rows" ? hiddenRowKeysState.has(item.id) : hiddenColsState.has(item.id);
                  const isDragOver = dragOverId === item.id;
                  return (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: compact ? "12px 12px" : "13px 14px",
                        marginLeft: activeTab === "columns" && item.level ? Math.min(28, item.level * 10) : 0,
                        background: isDragOver ? ui.accentSoft : isHidden ? "rgba(255,255,255,0.38)" : ui.panelSoft,
                        border: `1px solid ${isDragOver ? ui.accent : isHidden ? ui.border : ui.border}`,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        opacity: isHidden ? 0.4 : 1,
                        transition: "all 0.2s",
                        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
                      }}
                    >
                      <DragHandle />
                      <div style={{ flex: 1 }}>
                                                {renamingId === item.id ? (
                          <input 
                            autoFocus
                            value={renameInput}
                            onChange={e => setRenameInput(e.target.value)}
                            onBlur={() => saveRename(item.id, renameInput)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveRename(item.id, renameInput);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            style={{ width: "100%", background: "rgba(255,255,255,0.96)", border: `1px solid ${ui.accent}`, color: ui.text, padding: "7px 9px", borderRadius: 10, fontSize: 12, outline: "none" }}
                          />
                        ) : (
                          <div 
                            style={{ fontWeight: 700, fontSize: 12, color: ui.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onClick={() => {
                              if (activeTab === "measures" && item.isCalculatedMeasure && item.measure?.id) {
                                onOpenCalcMeasureWizard?.(item.measure.id);
                                return;
                              }
                              setRenamingId(item.id);
                              setRenameInput(labelOverrides[item.id] || item.label);
                            }}
                          >
                            {labelOverrides[item.id] || item.label}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </div>
                        )}

                        <div style={{ fontSize: 10, color: ui.textMuted, marginTop: 4 }}>{item.sub}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", flex: "0 1 auto", minWidth: 0 }}>
                      {activeTab === "columns" && (item.col?.isSubtotal || item.col?.isGrandTotal) && (
                        <select
                          title="Place this total/subtotal at the beginning or end of its hierarchy"
                          value={totalPositions[item.col.key] || "inherit"}
                          onChange={(e) => updateTotalPosition(item.col.key, e.target.value as "inherit" | "beginning" | "end")}
                          style={{
                            background: ui.bg,
                            border: `1px solid ${ui.border}`,
                            color: ui.text,
                            borderRadius: 8,
                            height: 30,
                            padding: "0 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <option value="inherit">Inherit total position</option>
                          <option value="beginning">Beginning</option>
                          <option value="end">End</option>
                        </select>
                      )}
                      {(activeTab === "measures" || activeTab === "columns") && (
                        <>
                        {activeTab === "measures" && (
                          <select
                            title="Move measure to position across every column"
                            value={Math.max(0, buildOrder().indexOf(item.id))}
                            onChange={(e) => moveItemToPosition(item.id, parseInt(e.target.value, 10))}
                            style={{
                              background: ui.bg,
                              border: `1px solid ${ui.border}`,
                              color: ui.text,
                              borderRadius: 8,
                              height: 30,
                              padding: "0 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {measureItems.map((measureItem, index) => (
                              <option key={measureItem.id} value={index}>{index + 1}</option>
                            ))}
                          </select>
                        )}
                        {activeTab === "measures" && item.isCalculatedMeasure && item.measure?.id && (
                          <button
                            type="button"
                            title="Edit calculated measure"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCalcMeasureWizard?.(item.measure.id);
                            }}
                            style={{
                              border: `1px solid ${ui.border}`,
                              background: ui.surfaceActive,
                              color: ui.text,
                              borderRadius: 8,
                              height: 30,
                              padding: "0 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {activeTab === "measures" && item.isCalculatedMeasure && item.measure?.id && onDeleteCalcMeasure && (
                          <button
                            type="button"
                            title="Delete calculated measure"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item);
                            }}
                            style={{
                              border: `1px solid ${ui.border}`,
                              background: ui.dangerSoft,
                              color: ui.danger,
                              borderRadius: 8,
                              height: 30,
                              padding: "0 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Delete
                          </button>
                        )}
                        {item.measure && (
                          <select
                            title="Aggregation Type"
                            value={getAggregationValue(item.measure.index)}
                            onChange={(e) => saveAggregation(item.measure.index, e.target.value as AggregationType)}
                            style={{
                              background: ui.bg,
                              border: `1px solid ${ui.border}`,
                              color: ui.text,
                              borderRadius: 8,
                              height: 30,
                              padding: "0 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {AGGREGATION_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        )}
                      <button
                        type="button"
                        title="Convert to visual column"
                          onClick={() => {
                            if (activeTab === "measures" && item.measure) addVisualRuleForMeasure(item.measure);
                            if (activeTab === "columns" && item.col && item.measure) addVisualRuleForColumnMeasure(item.col, item.measure);
                            else if (activeTab === "columns" && item.col) addVisualRulesForColumn(item.col);
                          }}
                          style={{
                            border: `1px solid ${ui.border}`,
                            background: ui.accentSoft,
                            color: ui.accent,
                            borderRadius: 8,
                            height: 30,
                            padding: "0 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Visual
                        </button>
                        {activeTab === "measures" && item.measure && hasVisualRuleForMeasure(item.measure) && (
                          <button
                            type="button"
                            title="Delete calculated/visual column rules for this measure"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVisualRulesForMeasure(item.measure);
                            }}
                            style={{
                              border: `1px solid ${ui.border}`,
                              background: ui.dangerSoft,
                              color: ui.danger,
                              borderRadius: 8,
                              height: 30,
                              padding: "0 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Delete Visual
                          </button>
                        )}
                        </>
                      )}
                      </div>
                      <div style={{ flex: "0 0 52px", display: "flex", justifyContent: "flex-end", overflow: "visible" }}>
                        <Toggle checked={!isHidden} onChange={() => toggleVisibility(item.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: compact ? "14px 16px" : "16px 18px", borderTop: `1px solid ${ui.border}`, display: "flex", justifyContent: "flex-end", gap: 10, zIndex: 1 }}>
             <button onClick={onClose} style={{ ...actionBtn, background: "rgba(255,255,255,0.72)", color: ui.textMuted, border: `1px solid ${ui.border}`, borderRadius: 14 }}>Discard</button>
             <button onClick={onClose} style={{ ...actionBtn, background: ui.accent, color: "#fff", boxShadow: "0 10px 24px rgba(14,165,233,0.2)", borderRadius: 14, padding: "0 18px" }}>Save Changes</button>
          </div>
          {confirmRequest && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100002,
                background: "rgba(15,23,42,0.28)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRequest(null);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={confirmRequest.title}
                style={{
                  width: "min(420px, 100%)",
                  borderRadius: 20,
                  border: `1px solid ${ui.borderStrong}`,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
                  boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
                  padding: 20,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 15, fontWeight: 900, color: ui.text }}>{confirmRequest.title}</div>
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: ui.textMuted }}>{confirmRequest.message}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={() => setConfirmRequest(null)}
                    style={{ ...actionBtn, height: 32, background: "rgba(255,255,255,0.8)", color: ui.textMuted, border: `1px solid ${ui.border}` }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = confirmRequest.onConfirm;
                      setConfirmRequest(null);
                      action();
                    }}
                    style={{ ...actionBtn, height: 32, background: ui.danger, color: "#fff", border: "none" }}
                  >
                    {confirmRequest.confirmLabel || "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




