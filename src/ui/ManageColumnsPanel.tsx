import React, { useState, useMemo, useCallback } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export interface ManageColumnsPanelProps {
  columns: FlattenedNode[];
  rows: FlattenedNode[];
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onOpenCalcMeasureWizard?: (id?: string) => void;
  onDeleteCalcMeasure?: (id: string) => void;
  onDeleteCalcRow?: (rowKey: string) => void;
}

type TabId = "measures" | "columns" | "rows";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v as T;
  } catch {
    return fallback;
  }
}

// ─── small presentational pieces ─────────────────────────────────────────────

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

const DragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#aaa" }}>
    <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
    <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
    <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
  </svg>
);

// ─── shared styles (using design system tokens) ───────────────────────────────

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--mx-font-family, sans-serif)",
  animation: "matrix-fade-in 0.3s ease-out",
};

const modal: React.CSSProperties = {
  width: "min(980px, 98vw)", 
  height: "min(720px, 92vh)",
  background: "var(--mx-surface, #ffffff)",
  borderRadius: 16,
  boxShadow: "0 32px 64px -16px rgba(0,0,0,0.45)",
  display: "flex", 
  flexDirection: "row",
  border: "1px solid var(--mx-border, #e2e8f0)",
  overflow: "hidden",
  animation: "matrix-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
};

const sidebar: React.CSSProperties = {
  width: 260,
  borderRight: "1px solid var(--mx-border, #e2e8f0)",
  background: "var(--mx-surface-subtle, #f8fafc)",
  display: "flex", flexDirection: "column", minHeight: 0,
  padding: "24px 0",
};

const content: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
  background: "var(--mx-surface, #ffffff)",
};

// ─── New Toggle Switch Component ─────────────────────────────────────────────

const Toggle = ({ checked, onChange, title }: { checked: boolean, onChange: () => void, title?: string }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    title={title}
    style={{
      width: 38, height: 20, borderRadius: 12,
      background: checked ? "var(--mx-accent, #2563eb)" : "var(--mx-surface-subtle, #f1f5f9)",
      position: "relative", cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex", alignItems: "center",
      padding: 3,
      border: `1px solid ${checked ? "var(--mx-accent, #2563eb)" : "var(--mx-border, #e2e8f0)"}`,
    }}
  >
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
      transform: checked ? "translateX(18px)" : "translateX(0)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }} />
  </div>
);

// ─── Modern Icons ────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// ─── component ───────────────────────────────────────────────────────────────

export const ManageColumnsPanel: React.FC<ManageColumnsPanelProps> = ({
  columns,
  rows,
  measures,
  settings,
  onClose,
  onPersistProperty,
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

  // ── persisted state ──────────────────────────────────────────────────────
  const colOrder = useMemo(
    () => parseJSON<string[]>(settings.manualData.colOrder, []),
    [settings.manualData.colOrder]
  );

  const hiddenCols = useMemo(
    () => new Set(parseJSON<string[]>(settings.manualData.hiddenCols, [])),
    [settings.manualData.hiddenCols]
  );

  const hiddenRowKeys = useMemo(
    () => new Set(parseJSON<string[]>(settings.manualData.hiddenRowKeys, [])),
    [settings.manualData.hiddenRowKeys]
  );

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

  // ── derived item lists ────────────────────────────────────────────────────
  const measureItems = useMemo(() => {
    const base = measures.map(m => ({ id: `m_${m.index}`, label: m.name, sub: m.format || "General", measure: m }));
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
    const leafCols = columns.filter(c => c.isLeaf || c.isSubtotal);
    const base = leafCols.map(c => ({ id: c.key, label: c.label || "(Empty)", sub: `Level ${c.level}`, col: c }));
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
            ? `Subtotal • Level ${r.level + 1}`
            : `Level ${r.level + 1}`,
        row: r,
      }));
  }, [rows, search]);

  const baseItems = activeTab === "measures"
    ? measureItems
    : activeTab === "columns"
      ? columnItems
      : rowItems;

  const items = useMemo(
    () => (showHiddenOnly
      ? baseItems.filter(item => (activeTab === "rows" ? hiddenRowKeys.has(item.id) : hiddenCols.has(item.id)))
      : baseItems),
    [activeTab, baseItems, hiddenCols, hiddenRowKeys, showHiddenOnly]
  );

  // ── helpers ───────────────────────────────────────────────────────────────
  const persistOrder = useCallback((next: string[]) => {
    onPersistProperty("manualData", "colOrder", JSON.stringify(next));
  }, [onPersistProperty]);

  const persistHiddenState = useCallback((next: Set<string>) => {
    if (activeTab === "rows") {
      onPersistProperty("manualData", "hiddenRowKeys", JSON.stringify([...next]));
      return;
    }
    onPersistProperty("manualData", "hiddenCols", JSON.stringify([...next]));
  }, [activeTab, onPersistProperty]);

  const toggleVisibility = useCallback((id: string) => {
    const next = new Set(activeTab === "rows" ? hiddenRowKeys : hiddenCols);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistHiddenState(next);
  }, [activeTab, hiddenCols, hiddenRowKeys, persistHiddenState]);

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

  // ── drag-and-drop ─────────────────────────────────────────────────────────
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

  // ── show-all / hide-all ───────────────────────────────────────────────────
  const allHidden = items.length > 0 && items.every(i => activeTab === "rows" ? hiddenRowKeys.has(i.id) : hiddenCols.has(i.id));
  const toggleAll = () => {
    const next = new Set(activeTab === "rows" ? hiddenRowKeys : hiddenCols);
    if (allHidden) items.forEach(i => next.delete(i.id));
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

  // ── tab button ────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: TabId; label: string }) => {
    const active = activeTab === id;
    return (
      <div
        onClick={() => { setActiveTab(id); setSearch(""); setShowHiddenOnly(false); setEditingWidth(null); }}
        style={{
          margin: "4px 12px",
          padding: "10px 16px", 
          cursor: "pointer", 
          fontSize: 14,
          borderRadius: 10,
          background: active ? "var(--mx-accent, #2563eb)" : "transparent",
          color: active ? "white" : "var(--mx-text-secondary, #475569)",
          fontWeight: active ? 600 : 500,
          display: "flex", alignItems: "center", gap: 12,
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: active ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = "var(--mx-hover-bg, #f1f5f9)";
            e.currentTarget.style.color = "var(--mx-text, #0f172a)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--mx-text-secondary, #475569)";
          }
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: active ? "white" : "var(--mx-border, #e2e8f0)",
          transition: "background 0.2s",
        }} />
        <span style={{ flex: 1 }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={sidebar}>
          <div style={{ 
            padding: "0 24px 16px 24px", 
            fontWeight: 800, 
            fontSize: 18,
            color: "var(--mx-text, #0f172a)",
            letterSpacing: "-0.01em",
          }}>
            Studio Layout
          </div>
          <div style={{ padding: "8px 0" }}>
            <TabBtn id="measures" label="Measures" />
            <TabBtn id="columns" label="Data Columns" />
            <TabBtn id="rows" label="Rows" />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ 
            padding: "20px", 
            fontSize: 11, 
            color: "var(--mx-text-muted, #94a3b8)", 
            borderTop: "1px solid var(--mx-border, #e2e8f0)",
            lineHeight: 1.5
          }}>
            <strong>Pro Tip:</strong><br />
            {activeTab === "rows"
              ? "Rows hidden from the matrix stay here so you can show them again whenever you need."
              : "Drag items to reorder them in the matrix. Use Hidden Only to quickly review anything you hid."}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div style={content}>

          {/* Header */}
          <div style={{ 
            padding: "20px 24px", 
            borderBottom: "1px solid var(--mx-border, #e2e8f0)", 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            background: "var(--mx-surface, #ffffff)"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: "var(--mx-text, #0f172a)", letterSpacing: "-0.02em" }}>
                {activeTab === "measures" ? "Matrix Measures" : activeTab === "columns" ? "Structure & Groups" : "Matrix Rows"}
              </div>
              <div style={{ fontSize: 13, color: "var(--mx-text-secondary, #475569)", marginTop: 4, fontWeight: 500 }}>
                {baseItems.length} elements in this collection
              </div>
            </div>
            
            {activeTab === "measures" && onOpenCalcMeasureWizard && (
              <button
                onClick={() => { onClose(); onOpenCalcMeasureWizard!(); }}
                style={{ 
                  padding: "10px 20px", 
                  background: "var(--mx-accent, #2563eb)", 
                  color: "var(--mx-text-inverse, #ffffff)", 
                  border: "none", 
                  borderRadius: 12, 
                  cursor: "pointer", 
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.35)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 12px 20px -4px rgba(37, 99, 235, 0.45)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 16px -4px rgba(37, 99, 235, 0.35)";
                }}
              >
                <PlusIcon />
                New Measure
              </button>
            )}
            <button 
              onClick={onClose} 
              style={{ 
                background: "var(--mx-surface-subtle, #f8fafc)", 
                border: "none", 
                cursor: "pointer", 
                width: 32, height: 32,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--mx-text-secondary, #475569)",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--mx-surface-elevated, #f1f5f9)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--mx-surface-subtle, #f8fafc)"}
            >
              ×
            </button>
          </div>

          {/* Toolbar row: search + show/hide all */}
          <div style={{ 
            padding: "12px 24px", 
            background: "var(--mx-surface-subtle, #f8fafc)",
            borderBottom: "1px solid var(--mx-border, #e2e8f0)", 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            flexWrap: "wrap"
          }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder={activeTab === "measures" ? "Find measures..." : activeTab === "columns" ? "Find columns..." : "Find rows..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: "100%",
                  padding: "12px 14px 12px 42px", 
                  border: "1px solid var(--mx-border, #e2e8f0)", 
                  borderRadius: 12, 
                  fontSize: 14, 
                  outline: "none",
                  background: "var(--mx-surface, #ffffff)",
                  color: "var(--mx-text, #0f172a)",
                  transition: "all 0.2s ease",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "var(--mx-accent, #2563eb)";
                  e.currentTarget.style.boxShadow = "var(--mx-shadow-focus)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "var(--mx-border, #e2e8f0)";
                  e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)";
                }}
              />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--matrix-text-muted)", display: "flex" }}>
                <SearchIcon />
              </div>
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "var(--matrix-bg-tertiary)", border: "none", borderRadius: "50%",
                    width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--matrix-text-secondary)"
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => setShowHiddenOnly(v => !v)}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--mx-border, #e2e8f0)",
                borderRadius: 8,
                cursor: "pointer",
                background: showHiddenOnly ? "var(--mx-selection-bg, #dbeafe)" : "var(--mx-surface, #ffffff)",
                fontSize: 13,
                color: showHiddenOnly ? "var(--mx-accent, #2563eb)" : "var(--mx-text, #0f172a)",
                fontWeight: 600,
              }}
            >
              {showHiddenOnly ? "Showing hidden only" : "Show hidden only"}
            </button>
            <button
              onClick={toggleAll}
              style={{ 
                padding: "8px 16px", 
                border: "1px solid var(--mx-border, #e2e8f0)", 
                borderRadius: 8, 
                cursor: "pointer", 
                background: "var(--mx-surface, #ffffff)", 
                fontSize: 13, 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                color: "var(--mx-text, #0f172a)",
                fontWeight: 500,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--mx-hover-bg, #f1f5f9)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--mx-surface, #ffffff)"}
            >
              {allHidden ? <EyeOpen /> : <EyeOff />}
              <span>{allHidden ? "Show all" : "Hide all"}</span>
            </button>
          </div>

          {/* List content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }} className="matrix-scrollbar">
            {items.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", color: "var(--mx-text-muted, #94a3b8)", fontSize: 14 }}>
                {showHiddenOnly
                  ? "No hidden items match this filter."
                  : search
                    ? "No items match your search."
                    : "No items available in this category."}
              </div>
            )}
            
            {items.map(item => {
              const hidden = activeTab === "rows" ? hiddenRowKeys.has(item.id) : hiddenCols.has(item.id);
              const isDragOver = dragOverId === item.id;
              const customWidth = colWidths[item.id];
              const displayLabel = labelOverrides[item.id] ?? item.label;
              const canDelete = Boolean(
                ("measure" in item && item.measure?.id && onDeleteCalcMeasure) ||
                ("row" in item && item.row?.key?.startsWith("__calcrow__") && onDeleteCalcRow)
              );

              return (
                <div
                  key={item.id}
                  draggable={activeTab !== "rows"}
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragOver={e => handleDragOver(e, item.id)}
                  onDrop={e => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: isDragOver ? "var(--mx-selection-bg, #dbeafe)" : "var(--mx-surface, #ffffff)",
                    borderRadius: 12,
                    marginBottom: 8,
                    gap: 16,
                    border: isDragOver ? "2px solid var(--mx-accent, #2563eb)" : "1px solid var(--mx-border, #e2e8f0)",
                    opacity: hidden ? 0.5 : 1,
                    cursor: activeTab === "rows" ? "default" : "grab",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isDragOver ? "var(--mx-shadow-elevated)" : "0 2px 4px rgba(0,0,0,0.02)",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.background = "var(--mx-hover-bg, #f8fafc)";
                      e.currentTarget.style.borderColor = "var(--mx-accent-secondary, #3b82f6)";
                      e.currentTarget.style.boxShadow = "var(--mx-shadow-subtle)";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.background = "var(--mx-surface, #ffffff)";
                      e.currentTarget.style.borderColor = "var(--mx-border, #e2e8f0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", cursor: activeTab === "rows" ? "default" : "move", color: "var(--mx-text-muted, #94a3b8)", opacity: activeTab === "rows" ? 0.35 : 1 }}>
                    <DragHandle />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--mx-text, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {displayLabel}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--mx-text-muted, #94a3b8)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 2 }}>
                      {item.sub}
                    </div>
                  </div>

                  {/* Aggregation */}
                  {activeTab === "measures" && "measure" in item ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <span style={{ fontSize: 9, fontWeight: 800, color: "var(--mx-text-muted, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Function</span>
                       <select
                        value={aggregationOverrides[item.measure.index] || "sum"}
                        onChange={e => saveAggregation(item.measure.index, e.target.value)}
                        style={{ 
                          padding: "6px 12px", 
                          fontSize: 12, 
                          borderRadius: 8, 
                          border: "1px solid var(--mx-border, #e2e8f0)", 
                          outline: "none", 
                          background: "var(--mx-surface, #ffffff)", 
                          color: "var(--mx-text, #0f172a)",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--mx-accent, #2563eb)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--mx-border, #e2e8f0)"}
                       >
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                        <option value="count">Count</option>
                       </select>
                    </div>
                  ) : null}

                  {/* Width */}
                  {activeTab === "columns" ? (
                    <div style={{ width: 100, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "var(--mx-text-muted, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Width</span>
                      {editingWidth === item.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={widthInput}
                          onChange={e => setWidthInput(e.target.value)}
                          onBlur={() => saveWidth(item.id, widthInput)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveWidth(item.id, widthInput);
                            if (e.key === "Escape") setEditingWidth(null);
                          }}
                          style={{ 
                            width: "100%", 
                            padding: "6px 10px", 
                            border: "2px solid var(--mx-accent, #2563eb)", 
                            borderRadius: 8, 
                            fontSize: 12, 
                            outline: "none",
                            fontWeight: 700,
                            textAlign: "right"
                          }}
                        />
                      ) : (
                        <div 
                          onClick={() => { setEditingWidth(item.id); setWidthInput(String(customWidth ?? settings.general.defaultColumnWidth)); }}
                          style={{ 
                            fontSize: 13, 
                            color: customWidth ? "var(--mx-accent, #2563eb)" : "var(--mx-text-secondary, #475569)", 
                            fontWeight: 700,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: customWidth ? "var(--mx-selection-bg, #dbeafe)" : "var(--mx-surface-subtle, #f1f5f9)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            minWidth: 60,
                            textAlign: "center",
                            border: "1px solid transparent",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--mx-accent, #2563eb)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          {customWidth ? `${customWidth}px` : "Auto"}
                        </div>
                      )}
                    </div>
                  ) : activeTab === "rows" ? (
                    <div style={{ minWidth: 100, textAlign: "right", color: "var(--mx-text-secondary, #475569)", fontSize: 12, fontWeight: 700 }}>
                      {"row" in item && item.row?.indent ? `Indent ${item.row.indent}` : "Top level"}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                    {activeTab === "measures" && "measure" in item && item.measure.id && onOpenCalcMeasureWizard && (
                      <button
                        title="Configure Logic"
                        onClick={() => { onClose(); onOpenCalcMeasureWizard!(item.measure.id ?? ""); }}
                        style={{ 
                          background: "var(--mx-surface-subtle, #f1f5f9)", 
                          border: "1px solid var(--mx-border, #e2e8f0)", 
                          cursor: "pointer", 
                          color: "var(--mx-text-secondary, #475569)", 
                          width: 32, height: 32, 
                          borderRadius: 8, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--mx-hover-bg, #f1f5f9)";
                          e.currentTarget.style.color = "var(--mx-accent, #2563eb)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "var(--mx-surface-subtle, #f1f5f9)";
                          e.currentTarget.style.color = "var(--mx-text-secondary, #475569)";
                        }}
                      >
                        <div style={{ margin: "0 auto", display: "flex" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        title={activeTab === "rows" ? "Delete calculated row" : "Delete calculated measure"}
                        onClick={() => handleDeleteItem(item)}
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          cursor: "pointer",
                          color: "#b91c1c",
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                    <Toggle 
                      checked={!hidden} 
                      onChange={() => toggleVisibility(item.id)} 
                      title={hidden ? "Hidden - Toggle to show" : "Visible - Toggle to hide"} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ 
            padding: "24px 32px", 
            borderTop: "1px solid var(--mx-border, #e2e8f0)", 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 16, 
            background: "var(--mx-surface-elevated, #f8fafc)" 
          }}>
            <button
              onClick={() => {
                if (activeTab === "rows") {
                  const nextHiddenRows = new Set(hiddenRowKeys);
                  rowItems.forEach(i => nextHiddenRows.delete(i.id));
                  onPersistProperty("manualData", "hiddenRowKeys", JSON.stringify([...nextHiddenRows]));
                  return;
                }
                const keys = (activeTab === "measures" ? measureItems : columnItems).map(i => i.id);
                const nextOrder = colOrder.filter(k => !keys.includes(k));
                onPersistProperty("manualData", "colOrder", JSON.stringify(nextOrder));
                const nextWidths = { ...colWidths };
                keys.forEach(k => delete nextWidths[k]);
                onPersistProperty("manualData", "colWidths", JSON.stringify(nextWidths));
                const nextHidden = new Set(hiddenCols);
                keys.forEach(k => nextHidden.delete(k));
                onPersistProperty("manualData", "hiddenCols", JSON.stringify([...nextHidden]));
              }}
              style={{ 
                padding: "10px 20px", 
                background: "transparent", 
                border: "1px solid var(--mx-border, #e2e8f0)", 
                color: "var(--mx-text-secondary, #475569)", 
                borderRadius: 12, 
                cursor: "pointer", 
                fontSize: 14, 
                fontWeight: 600,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--mx-hover-bg, #f1f5f9)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              Reset Tab
            </button>
            <button
              onClick={onClose}
              style={{ 
                padding: "10px 32px", 
                background: "var(--mx-accent, #2563eb)", 
                color: "var(--mx-text-inverse, #ffffff)", 
                border: "none", 
                borderRadius: 12, 
                cursor: "pointer", 
                fontSize: 14, 
                fontWeight: 700, 
                boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 20px -4px rgba(37, 99, 235, 0.45)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 16px -4px rgba(37, 99, 235, 0.35)";
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
