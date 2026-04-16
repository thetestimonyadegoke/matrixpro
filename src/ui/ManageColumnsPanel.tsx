import React, { useState, useMemo, useCallback } from "react";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";

export interface ManageColumnsPanelProps {
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onOpenCalcMeasureWizard?: () => void;
}

type TabId = "measures" | "columns";

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

// ─── shared styles ────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.35)",
};

const modal: React.CSSProperties = {
  width: 680, height: 540,
  display: "flex", background: "#fff",
  borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const sidebar: React.CSSProperties = {
  width: 180, background: "#f8f9fa",
  borderRight: "1px solid #e0e0e0",
  display: "flex", flexDirection: "column",
};

const content: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
};

const rowBase: React.CSSProperties = {
  display: "flex", alignItems: "center",
  padding: "8px 12px", borderBottom: "1px solid #f0f0f0",
  gap: 8, transition: "background 0.1s",
};

// ─── component ───────────────────────────────────────────────────────────────

export const ManageColumnsPanel: React.FC<ManageColumnsPanelProps> = ({
  columns,
  measures,
  settings,
  onClose,
  onPersistProperty,
  onOpenCalcMeasureWizard,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("measures");
  const [search, setSearch] = useState("");
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

  const colWidths = useMemo(
    () => parseJSON<Record<string, number>>(settings.manualData.colWidths, {}),
    [settings.manualData.colWidths]
  );

  const labelOverrides = useMemo(
    () => parseJSON<Record<string, string>>(settings.manualData.labelOverrides, {}),
    [settings.manualData.labelOverrides]
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

  const items = activeTab === "measures" ? measureItems : columnItems;

  // ── helpers ───────────────────────────────────────────────────────────────
  const persistOrder = useCallback((next: string[]) => {
    onPersistProperty("manualData", "colOrder", JSON.stringify(next));
  }, [onPersistProperty]);

  const toggleVisibility = useCallback((id: string) => {
    const next = new Set(hiddenCols);
    if (next.has(id)) next.delete(id); else next.add(id);
    onPersistProperty("manualData", "hiddenCols", JSON.stringify([...next]));
  }, [hiddenCols, onPersistProperty]);

  const saveWidth = useCallback((id: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 20 && n <= 600) {
      onPersistProperty("manualData", "colWidths", JSON.stringify({ ...colWidths, [id]: n }));
    }
    setEditingWidth(null);
  }, [colWidths, onPersistProperty]);

  // ── drag-and-drop ─────────────────────────────────────────────────────────
  const allKeys = (activeTab === "measures" ? measureItems : columnItems).map(i => i.id);

  const buildOrder = useCallback(() => {
    let base = [...colOrder];
    for (const k of allKeys) if (!base.includes(k)) base.push(k);
    return base;
  }, [colOrder, allKeys]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
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
  const allHidden = items.every(i => hiddenCols.has(i.id));
  const toggleAll = () => {
    const next = new Set(hiddenCols);
    if (allHidden) items.forEach(i => next.delete(i.id));
    else items.forEach(i => next.add(i.id));
    onPersistProperty("manualData", "hiddenCols", JSON.stringify([...next]));
  };

  // ── tab button ────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: TabId; label: string }) => (
    <div
      onClick={() => { setActiveTab(id); setSearch(""); }}
      style={{
        padding: "10px 16px", cursor: "pointer", fontSize: 13,
        background: activeTab === id ? "#e6f2ff" : "transparent",
        borderLeft: activeTab === id ? "3px solid #0071e3" : "3px solid transparent",
        color: activeTab === id ? "#0071e3" : "#333",
        fontWeight: activeTab === id ? 600 : 400,
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={sidebar}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: 700, fontSize: 14 }}>
            Manage
          </div>
          <TabBtn id="measures" label="Measures" />
          <TabBtn id="columns" label="Columns" />
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 16px", fontSize: 11, color: "#999", borderTop: "1px solid #e0e0e0" }}>
            Drag rows to reorder · click eye to show/hide
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div style={content}>

          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
              {activeTab === "measures" ? "Measures" : "Columns"}
              <span style={{ fontSize: 12, fontWeight: 400, color: "#888", marginLeft: 8 }}>
                ({items.length} item{items.length !== 1 ? "s" : ""})
              </span>
            </div>
            {activeTab === "measures" && onOpenCalcMeasureWizard && (
              <button
                onClick={() => { onClose(); onOpenCalcMeasureWizard!(); }}
                style={{ padding: "5px 12px", background: "#0071e3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
              >
                + Add Measure
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", lineHeight: 1 }}>×</button>
          </div>

          {/* Toolbar row: search + show/hide all */}
          <div style={{ padding: "8px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "5px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, outline: "none" }}
            />
            <button
              onClick={toggleAll}
              title={allHidden ? "Show all" : "Hide all"}
              style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", background: "#fff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
            >
              {allHidden ? <EyeOpen /> : <EyeOff />}
              <span>{allHidden ? "Show all" : "Hide all"}</span>
            </button>
          </div>

          {/* Column header row */}
          <div style={{ display: "flex", padding: "4px 12px 4px 40px", borderBottom: "1px solid #eee", fontSize: 11, color: "#888", gap: 8 }}>
            <span style={{ flex: 1 }}>Name</span>
            <span style={{ width: 80, textAlign: "right" }}>Width (px)</span>
            <span style={{ width: 32 }} />
          </div>

          {/* Item list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#aaa", fontSize: 13 }}>
                {search ? "No items match your search." : "No items available."}
              </div>
            )}
            {items.map(item => {
              const hidden = hiddenCols.has(item.id);
              const isDragOver = dragOverId === item.id;
              const customWidth = colWidths[item.id];
              const displayLabel = labelOverrides[item.id] ?? item.label;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragOver={e => handleDragOver(e, item.id)}
                  onDrop={e => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...rowBase,
                    background: isDragOver ? "#e8f4ff" : hidden ? "#fafafa" : "#fff",
                    borderLeft: isDragOver ? "2px solid #0071e3" : "2px solid transparent",
                    opacity: hidden ? 0.55 : 1,
                    cursor: "grab",
                  }}
                >
                  <DragHandle />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {displayLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>{item.sub}</div>
                  </div>

                  {/* Custom width input */}
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
                      style={{ width: 64, padding: "2px 4px", border: "1px solid #0071e3", borderRadius: 3, fontSize: 12 }}
                    />
                  ) : (
                    <button
                      title="Set column width"
                      onClick={() => { setEditingWidth(item.id); setWidthInput(String(customWidth ?? settings.general.defaultColumnWidth)); }}
                      style={{ width: 64, padding: "3px 6px", border: "1px solid #e0e0e0", borderRadius: 3, background: customWidth ? "#e8f4ff" : "#fafafa", cursor: "pointer", fontSize: 12, color: customWidth ? "#0071e3" : "#555", textAlign: "right" }}
                    >
                      {customWidth ? `${customWidth}px` : "default"}
                    </button>
                  )}

                  {/* Visibility toggle */}
                  <button
                    title={hidden ? "Show" : "Hide"}
                    onClick={() => toggleVisibility(item.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: hidden ? "#aaa" : "#0071e3", display: "flex", alignItems: "center", padding: "2px 4px", borderRadius: 3 }}
                  >
                    {hidden ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => {
                // Reset order and widths for current tab
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
              style={{ padding: "7px 14px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", background: "#fff", fontSize: 12, color: "#555" }}
            >
              Reset tab
            </button>
            <button
              onClick={onClose}
              style={{ padding: "7px 18px", background: "#0071e3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
