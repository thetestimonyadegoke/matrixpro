import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { secureRandomId } from "../model/keys";

export interface ManageColumnsPanelProps {
  columns: FlattenedNode[];
  rows: FlattenedNode[];
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onHiddenColsChange?: (keys: string[]) => void;
  onHiddenRowKeysChange?: (keys: string[]) => void;
  onOpenCalcMeasureWizard?: (id?: string) => void;
  onDeleteCalcMeasure?: (id: string) => void;
  onDeleteCalcRow?: (rowKey: string) => void;
}

type TabId = "measures" | "columns" | "rows" | "visualColumns" | "design";
type VisualColumnFrequency = "all" | "yearly" | "quarterly" | "specific";
type VisualColumnPosition = "normal" | "beginning" | "end" | "specific";
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
  bg: "#0B0C10",
  surface: "#12141A",
  surfaceHover: "#1A1D24",
  surfaceActive: "#222630",
  border: "rgba(255, 255, 255, 0.06)",
  borderStrong: "rgba(255, 255, 255, 0.12)",
  text: "#F8FAFC",
  textMuted: "#8B95A5",
  accent: "#00E5FF", 
  accentStrong: "#00B8D9",
  accentSoft: "rgba(0, 229, 255, 0.1)",
  danger: "#FF0055",
  dangerSoft: "rgba(255, 0, 85, 0.1)",
  shadow: "0 32px 64px -12px rgba(0,0,0,0.8)",
  shadowSoft: "0 8px 16px -4px rgba(0,0,0,0.5)",
  glow: "0 0 12px rgba(0, 229, 255, 0.3)",
};

const overlayStyles: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(4, 5, 8, 0.8)",
  backdropFilter: "blur(16px) saturate(120%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Inter', sans-serif",
  animation: "matrix-fade-in 0.3s ease-out",
};

const modalStyles: React.CSSProperties = {
  width: "min(840px, 95%)",
  height: "min(720px, 90%)",
  background: "rgba(11, 12, 16, 0.7)",
  backdropFilter: "blur(32px)",
  borderRadius: 24,
  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.1), ${ui.shadow}`,
  display: "flex",
  flexDirection: "row",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  overflow: "hidden",
};

const sidebarStyles: React.CSSProperties = {
  width: 200,
  borderRight: `1px solid ${ui.border}`,
  background: "rgba(0, 0, 0, 0.2)",
  display: "flex", flexDirection: "column",
  padding: "32px 16px",
};

const contentStyles: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
  background: "transparent",
};

const actionBtn: React.CSSProperties = {
  height: 36,
  padding: "0 16px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
};

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    style={{
      width: 44, height: 24, borderRadius: 12,
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
  onClose,
  onPersistProperty,
  onHiddenColsChange,
  onHiddenRowKeysChange,
  onOpenCalcMeasureWizard,
  onDeleteCalcMeasure,
  onDeleteCalcRow,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("measures");
  const [search, setSearch] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingWidth, setEditingWidth] = useState<string | null>(null);
  const [widthInput, setWidthInput] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");


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
    () => parseJSON<Record<string, string>>(settings.manualData.aggregationOverrides, {}),
    [settings.manualData.aggregationOverrides]
  );

  const visualColumnRules = useMemo(
    () => parseJSON<VisualColumnRule[]>(settings.calculations.visualColumns || "[]", []),
    [settings.calculations.visualColumns]
  );

  // â”€â”€ derived item lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const measureItems = useMemo(() => {
    const base = measures.map((m, index) => ({ id: `m_${m.index ?? index}`, label: m.name, sub: m.format || "General", measure: m }));
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
    const base = columns
      .filter(c => c.key && c.key !== "col:root")
      .map(c => ({
        id: c.key,
        label: c.label || (c.isGrandTotal ? "Column Grand Total" : "(Empty)"),
        sub: c.isGrandTotal
          ? "Grand total"
          : c.isSubtotal
            ? `Subtotal - Level ${c.level}`
            : c.hasChildren
              ? `Group - Level ${c.level}`
              : `Level ${c.level}`,
        col: c,
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
  }, [columns, colOrder, search]);

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
      .filter(r => !r.isGrandTotal && !r.key.startsWith("__group__"))
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
            ? `Subtotal â€¢ Level ${r.level + 1}`
            : `Level ${r.level + 1}`,
        row: r,
      }));
  }, [rows, search]);

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
  const persistOrder = useCallback((next: string[]) => {
    onPersistProperty("manualData", "colOrder", JSON.stringify(next));
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
      position: "end",
      specificColumnKeys: [],
    };
    persistVisualColumnRules([...visualColumnRules, next]);
  }, [measures, persistVisualColumnRules, visualColumnRules]);

  const addVisualRuleForMeasure = useCallback((measure: MeasureInfo) => {
    const exists = visualColumnRules.some(rule =>
      rule.sourceMeasureIndex === measure.index ||
      (measure.id && rule.sourceMeasureId === measure.id) ||
      rule.sourceMeasureName === measure.name
    );
    const next: VisualColumnRule = {
      id: `visual_${secureRandomId(8)}`,
      enabled: true,
      sourceMeasureId: measure.id,
      sourceMeasureName: measure.name,
      sourceMeasureIndex: measure.index,
      frequency: "all",
      position: "end",
      specificColumnKeys: [],
    };
    persistVisualColumnRules(exists
      ? visualColumnRules.map(rule =>
        rule.sourceMeasureIndex === measure.index ||
        (measure.id && rule.sourceMeasureId === measure.id) ||
        rule.sourceMeasureName === measure.name
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
        rule.sourceMeasureIndex === measure.index ||
        (measure.id && rule.sourceMeasureId === measure.id) ||
        rule.sourceMeasureName === measure.name
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

  const updateVisualColumnRule = useCallback((id: string, patch: Partial<VisualColumnRule>) => {
    persistVisualColumnRules(visualColumnRules.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  }, [persistVisualColumnRules, visualColumnRules]);

  const deleteVisualColumnRule = useCallback((id: string) => {
    persistVisualColumnRules(visualColumnRules.filter(rule => rule.id !== id));
  }, [persistVisualColumnRules, visualColumnRules]);


  const saveWidth = useCallback((id: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 20 && n <= 600) {
      onPersistProperty("manualData", "colWidths", JSON.stringify({ ...colWidths, [id]: n }));
    }
    setEditingWidth(null);
  }, [colWidths, onPersistProperty]);

  const saveAggregation = useCallback((measureIndex: number, val: string) => {
    onPersistProperty("manualData", "aggregationOverrides", JSON.stringify({ ...aggregationOverrides, [measureIndex]: val }));
  }, [aggregationOverrides, onPersistProperty]);

  // â”€â”€ drag-and-drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allKeys = (activeTab === "measures" ? measureItems : columnItems).map(i => i.id);

  const buildOrder = useCallback(() => {
    let base = [...colOrder];
    for (const k of allKeys) if (!base.includes(k)) base.push(k);
    return base;
  }, [colOrder, allKeys]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (activeTab === "rows") return;
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (activeTab === "rows") return;
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (activeTab === "rows") return;
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const order = buildOrder();
    const fi = order.indexOf(draggedId);
    const ti = order.indexOf(targetId);
    if (fi > -1 && ti > -1) {
      order.splice(fi, 1);
      order.splice(ti, 0, draggedId);
      persistOrder(order);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

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
      onDeleteCalcMeasure(item.measure.id);
      return;
    }
    if (item.row?.key?.startsWith("__calcrow__") && onDeleteCalcRow) {
      onDeleteCalcRow(item.row.key);
    }
  }, [onDeleteCalcMeasure, onDeleteCalcRow]);

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
          margin: "2px 10px",
          padding: "10px 14px",
          cursor: "pointer", 
          fontSize: 11,
          borderRadius: 12,
          background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
          color: active ? ui.accent : ui.textMuted,
          fontWeight: active ? 700 : 500,
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
          background: active ? ui.accent : "rgba(255,255,255,0.1)",
          boxShadow: active ? ui.glow : "none",
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
        .btn-pulse:hover { animation: glow-pulse 2s infinite; }
      `}</style>
      <div style={modalStyles} onClick={e => e.stopPropagation()}>
        <div style={sidebarStyles}>
          <div style={{ padding: "0 14px 32px 14px", fontWeight: 900, fontSize: 18, color: ui.text, letterSpacing: "-0.04em" }}>
            STUDIO<span style={{ color: ui.accent }}>.</span>
          </div>
          <TabBtn id="measures" label="Measures" />
          <TabBtn id="columns" label="Columns" />
          <TabBtn id="visualColumns" label="Visuals" />
          <TabBtn id="rows" label="Rows" />
          <TabBtn id="design" label="Design Studio" />
        </div>

        <div style={contentStyles}>
          {/* Grid Overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${ui.border} 1px, transparent 1px)`, backgroundSize: "24px 24px", opacity: 0.2, pointerEvents: "none" }} />
          
          <div style={{ padding: "32px 32px 16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{activeTab.toUpperCase()}</h1>
            <div style={{ display: "flex", gap: 12 }}>
              {(activeTab === "measures" || activeTab === "visualColumns") && (
                <button
                  onClick={activeTab === "measures" ? () => { onClose(); onOpenCalcMeasureWizard?.(); } : addVisualColumnRule}
                  style={{
                    ...actionBtn,
                    background: ui.accent,
                    color: "#000",
                    border: "none",
                    boxShadow: ui.glow,
                  }}
                >
                  <PlusIcon /> {activeTab === "measures" ? "New Measure" : "Add Rule"}
                </button>
              )}
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          <div style={{ padding: "0 32px 20px 32px", zIndex: 1 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${ui.border}`,
                  padding: "12px 16px 12px 44px",
                  color: ui.text,
                  fontSize: 13,
                  borderRadius: 12,
                  outline: "none",
                }}
              />
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: ui.textMuted }}>
                <SearchIcon />
              </div>
            </div>
            <div style={{ height: 1, background: ui.border, margin: "24px -32px 0 -32px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <div style={{ color: ui.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {items.length} {activeTab} available
              </div>
              <button 
                onClick={toggleAll}
                style={{ background: "none", border: "none", color: ui.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 8px" }}
              >
                Toggle Visibility
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px 32px", zIndex: 1 }} className="matrix-scrollbar">
            {activeTab === "visualColumns" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 16 }}>
                {filteredVisualColumnRules.map(rule => (
                  <div key={rule.id} style={{ background: ui.surface, border: `1px solid ${ui.border}`, padding: 20, borderRadius: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                       <div style={{ fontSize: 14, fontWeight: 700, color: ui.accent }}>{rule.sourceMeasureName || "Unnamed Rule"}</div>
                       <div style={{ display: "flex", gap: 8 }}>
                          <Toggle checked={rule.enabled !== false} onChange={() => updateVisualColumnRule(rule.id, { enabled: rule.enabled === false })} />
                          <button onClick={() => deleteVisualColumnRule(rule.id)} style={{ background: "none", border: "none", color: ui.danger, cursor: "pointer" }}><TrashIcon /></button>
                       </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                       <select value={rule.frequency} onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as any })} style={{ background: ui.bg, border: `1px solid ${ui.border}`, color: ui.text, padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                          <option value="all">Everywhere</option>
                          <option value="yearly">Yearly</option>
                          <option value="quarterly">Quarterly</option>
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
                <div style={{ background: ui.surface, border: `1px solid ${ui.border}`, padding: 24, borderRadius: 20 }}>
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

                <div style={{ background: ui.surface, border: `1px solid ${ui.border}`, padding: 24, borderRadius: 20 }}>
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
                      draggable={activeTab !== "rows"}
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: "12px 16px",
                        background: isDragOver ? ui.accentSoft : isHidden ? "transparent" : ui.surface,
                        border: `1px solid ${isDragOver ? ui.accent : isHidden ? "transparent" : ui.border}`,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        opacity: isHidden ? 0.4 : 1,
                        transition: "all 0.2s",
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
                            style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: `1px solid ${ui.accent}`, color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 13, outline: "none" }}
                          />
                        ) : (
                          <div 
                            style={{ fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onClick={() => {
                              setRenamingId(item.id);
                              setRenameInput(labelOverrides[item.id] || item.label);
                            }}
                          >
                            {labelOverrides[item.id] || item.label}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </div>
                        )}

                        <div style={{ fontSize: 10, color: ui.textMuted, marginTop: 2 }}>{item.sub}</div>
                      </div>
                      <Toggle checked={!isHidden} onChange={() => toggleVisibility(item.id)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: "20px 32px", borderTop: `1px solid ${ui.border}`, display: "flex", justifyContent: "flex-end", gap: 12, zIndex: 1 }}>
             <button onClick={onClose} style={{ ...actionBtn, background: "none", color: ui.textMuted }}>Discard</button>
             <button onClick={onClose} style={{ ...actionBtn, background: ui.accent, color: "#000", boxShadow: ui.glow }} className="btn-pulse">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};




