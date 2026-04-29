import React, { useState, useMemo, useCallback, useRef } from "react";
import { FormulaEditor } from "./IntelliSenseDropdown";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";
import {
  InsertedRow,
  InsertedRowKind,
  migrateInsertedRows,
  VisualSettings,
} from "../settings/settings";
import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";
import { generateCalcRowId } from "../calculations/calculatedRows";

export interface CalcRowPanelProps {
  rows: FlattenedNode[];
  measures?: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onApply: (rows: InsertedRow[]) => void;
}

// ─── Icons (local to avoid coupling to icons.tsx styling) ────────────────────

const EyeOpen: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const DragHandle: React.FC = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" style={{ color: "#9ca3af" }}>
    <circle cx="4" cy="3" r="1.2" /><circle cx="8" cy="3" r="1.2" />
    <circle cx="4" cy="7" r="1.2" /><circle cx="8" cy="7" r="1.2" />
    <circle cx="4" cy="11" r="1.2" /><circle cx="8" cy="11" r="1.2" />
  </svg>
);
const PencilIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const TrashIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const SearchIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const ChevronDown: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" />
  </svg>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9000,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};
const modal: React.CSSProperties = {
  width: 920, height: 600,
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
  display: "flex", flexDirection: "column",
  overflow: "hidden",
};
const headerBar: React.CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};
const body: React.CSSProperties = {
  flex: 1, display: "flex", minHeight: 0,
};
const leftCol: React.CSSProperties = {
  width: 320,
  borderRight: "1px solid #e5e7eb",
  background: "#fafbfc",
  display: "flex", flexDirection: "column", minHeight: 0,
};
const rightCol: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
  background: "#ffffff",
};
const footerBar: React.CSSProperties = {
  padding: "12px 18px",
  borderTop: "1px solid #e5e7eb",
  display: "flex", justifyContent: "flex-end", gap: 8,
  background: "#ffffff",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 18px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  padding: "7px 16px", background: "#f3f4f6", color: "#374151",
  border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13,
};
const searchWrap: React.CSSProperties = {
  position: "relative", padding: "12px 12px 8px",
};
const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px 7px 30px",
  border: "1px solid #d1d5db", borderRadius: 6,
  fontSize: 12, outline: "none", background: "#ffffff",
  boxSizing: "border-box",
};
const searchIconPos: React.CSSProperties = {
  position: "absolute", left: 22, top: 20, color: "#9ca3af",
  pointerEvents: "none",
};

// ─── Kind metadata ───────────────────────────────────────────────────────────

const KIND_LABEL: Record<InsertedRowKind, string> = {
  calculated: "Calculated",
  blank: "Blank",
  group: "Group",
  child: "Child",
  divider: "Divider",
};
const KIND_BADGE_BG: Record<InsertedRowKind, string> = {
  calculated: "#dbeafe",
  blank: "#f3f4f6",
  group: "#ede9fe",
  child: "#e0f2fe",
  divider: "#fef3c7",
};
const KIND_BADGE_FG: Record<InsertedRowKind, string> = {
  calculated: "#1d4ed8",
  blank: "#4b5563",
  group: "#6d28d9",
  child: "#0369a1",
  divider: "#92400e",
};

type TabFilter = "all" | InsertedRowKind;
const TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "calculated", label: "Calculated" },
  { id: "blank", label: "Blank" },
  { id: "group", label: "Group" },
  { id: "child", label: "Child" },
  { id: "divider", label: "Divider" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBlankRow(kind: InsertedRowKind, order: number): InsertedRow {
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
      kind === "child" ? "New child row" :
      "New calculated row",
    enabled: true,
    order,
    parentRowKey: null,
    insertAfterRowKey: null,
    insertAtTop: false,
  };
  switch (kind) {
    case "calculated":
    case "child":
      return {
        ...base, kind,
        formulaType: "sum",
        rowReferences: [],
        customFormula: "",
        style: { bold: false, italic: false },
        includeInTotals: true,
        isSubtotal: false,
      };
    case "blank":
      return { ...base, kind: "blank", height: 22 };
    case "group":
      return { ...base, kind: "group", label: base.name, style: { bold: true } };
    case "divider":
      return { ...base, kind: "divider", lineStyle: "single", lineColor: "#d1d5db" };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const CalcRowPanel: React.FC<CalcRowPanelProps> = ({
  rows,
  measures = [],
  settings,
  onClose,
  onApply,
}) => {
  const initialRows = useMemo<InsertedRow[]>(
    () => migrateInsertedRows(settings.calculations.rows),
    [settings.calculations.rows]
  );

  const [items, setItems] = useState<InsertedRow[]>(initialRows);
  const [selectedId, setSelectedId] = useState<string | null>(initialRows[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const addBtnRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r: InsertedRow) => {
      if (tab !== "all" && r.kind !== tab) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, search]);

  const selected = useMemo(
    () => items.find((r: InsertedRow) => r.id === selectedId) ?? null,
    [items, selectedId]
  );

  // ── row list operations ────────────────────────────────────────────────
  const addRow = useCallback((kind: InsertedRowKind) => {
    setItems(prev => {
      const next = [...prev, makeBlankRow(kind, prev.length)];
      setSelectedId(next[next.length - 1].id);
      return next;
    });
    setAddMenuOpen(false);
  }, []);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter((r: InsertedRow) => r.id !== id).map((r, i) => ({ ...r, order: i }));
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  const toggleEnabled = useCallback((id: string) => {
    setItems(prev => prev.map((r: InsertedRow) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const updateSelected = useCallback((patch: Partial<InsertedRow>) => {
    setItems(prev => prev.map((r: InsertedRow) => {
      if (r.id !== selectedId) return r;
      // Cast through `unknown` — the union is discriminated; callers only pass
      // shape-compatible patches for the currently selected row's kind.
      return { ...r, ...patch } as InsertedRow;
    }));
  }, [selectedId]);

  // ── drag & drop reorder ────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    setItems(prev => {
      const next = [...prev];
      const from = next.findIndex(r => r.id === draggedId);
      const to = next.findIndex(r => r.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((r, i) => ({ ...r, order: i }));
    });
    setDraggedId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  // ── selectable source rows (for calculated/child) ──────────────────────
  const selectableSources = useMemo(
    () => rows.filter(r => !r.isGrandTotal),
    [rows]
  );

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerBar}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Inserted Rows</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Manage calculated rows, blanks, groups and dividers inserted into the matrix
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex" }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div style={body}>

          {/* ── Left column ───────────────────────────────────────── */}
          <div style={leftCol}>

            {/* Search */}
            <div style={searchWrap}>
              <span style={searchIconPos}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search rows..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={searchInput}
              />
            </div>

            {/* Tab strip */}
            <div style={{ display: "flex", gap: 4, padding: "0 12px 8px", flexWrap: "wrap" }}>
              {TABS.map(t => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: "4px 9px",
                      fontSize: 11,
                      borderRadius: 12,
                      border: "1px solid " + (active ? "#2563eb" : "#d1d5db"),
                      background: active ? "#2563eb" : "#ffffff",
                      color: active ? "#ffffff" : "#374151",
                      cursor: "pointer",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Row list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "24px 12px", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                  {items.length === 0
                    ? "No inserted rows yet. Click + Add Row to get started."
                    : "No rows match your filter."}
                </div>
              )}
              {filtered.map(row => {
                const active = row.id === selectedId;
                const isDragOver = dragOverId === row.id;
                const isHover = hoverId === row.id;
                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={e => handleDragStart(e, row.id)}
                    onDragOver={e => handleDragOver(e, row.id)}
                    onDrop={e => handleDrop(e, row.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedId(row.id)}
                    onMouseEnter={() => setHoverId(row.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 8px",
                      marginBottom: 3,
                      borderRadius: 6,
                      background: active ? "#e0ecff" : isDragOver ? "#f0f7ff" : isHover ? "#f3f4f6" : "transparent",
                      border: "1px solid " + (active ? "#93b8ff" : "transparent"),
                      cursor: "pointer",
                      opacity: row.enabled ? 1 : 0.55,
                    }}
                  >
                    <span style={{ cursor: "grab", display: "flex", alignItems: "center" }} title="Drag to reorder">
                      <DragHandle />
                    </span>
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 12, fontWeight: 500, color: "#111827",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {row.name || "(untitled)"}
                    </span>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 10,
                      background: (KIND_BADGE_BG as any)[row.kind], color: (KIND_BADGE_FG as any)[row.kind],
                      fontWeight: 600, whiteSpace: "nowrap",
                    }}>
                      {(KIND_LABEL as any)[row.kind]}
                    </span>
                    {isHover && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedId(row.id); }}
                          title="Edit"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 2, display: "flex" }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteRow(row.id); }}
                          title="Delete"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2, display: "flex" }}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleEnabled(row.id); }}
                      title={row.enabled ? "Hide" : "Show"}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: row.enabled ? "#2563eb" : "#9ca3af",
                        padding: 2, display: "flex",
                      }}
                    >
                      {row.enabled ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Row button + chevron menu */}
            <div ref={addBtnRef} style={{ padding: 12, borderTop: "1px solid #e5e7eb", position: "relative" }}>
              <div style={{ display: "flex", gap: 0 }}>
                <button
                  onClick={() => addRow("calculated")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#2563eb", color: "#fff",
                    border: "none", borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}
                >
                  + Add Row
                </button>
                <button
                  onClick={() => setAddMenuOpen(v => !v)}
                  aria-label="More row types"
                  style={{
                    padding: "8px 10px",
                    background: "#2563eb", color: "#fff",
                    border: "none", borderLeft: "1px solid rgba(255,255,255,0.25)",
                    borderTopRightRadius: 6, borderBottomRightRadius: 6,
                    cursor: "pointer", display: "flex", alignItems: "center",
                  }}
                >
                  <ChevronDown />
                </button>
              </div>
              {addMenuOpen && (
                <div
                  onMouseLeave={() => setAddMenuOpen(false)}
                  style={{
                    position: "absolute", bottom: "calc(100% + 4px)", right: 12, left: 12,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb", borderRadius: 6,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                    padding: 4, zIndex: 10,
                  }}
                >
                  {([
                    ["calculated", "Calculated Row"],
                    ["blank", "Blank Row"],
                    ["group", "Row Group"],
                    ["child", "Child Calculated Row"],
                    ["divider", "Divider"],
                  ] as [InsertedRowKind, string][]).map(([k, label]) => (
                    <div
                      key={k}
                      onClick={() => addRow(k)}
                      style={{
                        padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4,
                        color: "#111827",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: detail / empty state ────────────────── */}
          <div style={rightCol}>
            {!selected ? (
              <EmptyState />
            ) : (
              <RowDetailForm
                row={selected}
                sourceRows={selectableSources}
                allRows={items}
                measures={measures}
                onChange={updateSelected}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={footerBar}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={() => onApply(items)}>Apply</button>
        </div>
      </div>
    </div>
  );
};

CalcRowPanel.displayName = "CalcRowPanel";

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div style={{
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: 32, color: "#6b7280", textAlign: "center",
  }}>
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect x="14" y="20" width="68" height="56" rx="6" stroke="#c7d2fe" strokeWidth="2" fill="#f5f7ff" />
      <path d="M22 36h52M22 48h52M22 60h32" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="62" r="10" fill="#dbeafe" stroke="#93b8ff" strokeWidth="2" />
      <path d="M70 58v8M66 62h8" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <div style={{ marginTop: 18, fontSize: 14, fontWeight: 600, color: "#111827" }}>
      No row selected
    </div>
    <div style={{ marginTop: 6, fontSize: 12, maxWidth: 320 }}>
      Select a row on the left to edit its properties, or click <b>+ Add Row</b> to insert a new calculated row, blank, group, or divider.
    </div>
  </div>
);

// ─── Row detail form ─────────────────────────────────────────────────────────

interface RowDetailFormProps {
  row: InsertedRow;
  sourceRows: FlattenedNode[];
  allRows: InsertedRow[];
  measures?: MeasureInfo[];
  onChange: (patch: Partial<InsertedRow>) => void;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#374151",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", fontSize: 13,
  border: "1px solid #d1d5db", borderRadius: 5, outline: "none",
  boxSizing: "border-box", background: "#ffffff",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const sectionStyle: React.CSSProperties = { marginBottom: 14 };

const RowDetailForm: React.FC<RowDetailFormProps> = ({ row, sourceRows, measures = [], onChange }) => {
  const intelliSenseContext: IntelliSenseContext = useMemo(() => ({
    measures: measures,
    calculatedMeasures: [] as any[],
    columns: [] as any[], // Column context not strictly required for row formulas, but could be added
    rows: sourceRows,
    rowHierarchyLevels: [] as string[],
    columnHierarchyLevels: [] as string[],
  }), [measures, sourceRows]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
        Kind: <b style={{ color: KIND_BADGE_FG[row.kind] }}>{KIND_LABEL[row.kind]}</b>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
        {row.name || "(untitled row)"}
      </div>

      {/* Name — common to all kinds */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          style={inputStyle}
          value={row.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </div>

      {/* Calculated / child */}
      {(row.kind === "calculated" || row.kind === "child") && (
        <>
          <div style={sectionStyle}>
            <label style={labelStyle}>Formula type</label>
            <select
              style={selectStyle}
              value={row.formulaType}
              onChange={e => onChange({ formulaType: e.target.value as "sum" | "subtract" | "custom" })}
            >
              <option value="sum">Sum of selected rows</option>
              <option value="subtract">First minus others (A − B − C…)</option>
              <option value="custom">Custom expression</option>
            </select>
          </div>

          {row.formulaType !== "custom" ? (
            <div style={sectionStyle}>
              <label style={labelStyle}>Source rows</label>
              <div style={{
                maxHeight: 180, overflowY: "auto",
                border: "1px solid #e5e7eb", borderRadius: 6, background: "#fafbfc",
              }}>
                {sourceRows.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: "#9ca3af" }}>No rows available</div>
                ) : sourceRows.map(sr => {
                  const checked = row.rowReferences.includes(sr.key);
                  return (
                    <label
                      key={sr.key}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 10px", paddingLeft: 10 + (sr.indent ?? 0) * 14,
                        fontSize: 12, cursor: "pointer",
                        background: checked ? "#eff6ff" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? row.rowReferences.filter(k => k !== sr.key)
                            : [...row.rowReferences, sr.key];
                          onChange({ rowReferences: next });
                        }}
                      />
                      <span style={{ flex: 1 }}>{sr.label}</span>
                      {sr.isSubtotal && (
                        <span style={{ fontSize: 10, color: "#6b7280" }}>subtotal</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={sectionStyle}>
              <label style={labelStyle}>Custom formula</label>
              <FormulaEditor
                value={row.customFormula ?? ""}
                onChange={val => onChange({ customFormula: val })}
                context={intelliSenseContext}
                placeholder="e.g., [Revenue] - [COGS]"
              />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                Reference rows and measures by name in brackets: [Row/Measure Name]
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...sectionStyle, flex: 1 }}>
              <label style={labelStyle}>Placement</label>
              <select
                style={selectStyle}
                value={row.placement ?? "after"}
                onChange={e => onChange({ placement: e.target.value as "before" | "after" | "child" })}
              >
                <option value="before">Insert before</option>
                <option value="after">Insert after</option>
                <option value="child">Insert as child of</option>
              </select>
            </div>
            <div style={{ ...sectionStyle, flex: 1 }}>
              <label style={labelStyle}>Target row</label>
              <select
                style={selectStyle}
                value={row.targetRowKey ?? ""}
                onChange={e => onChange({ targetRowKey: e.target.value })}
              >
                <option value="">— none —</option>
                {sourceRows.map(sr => (
                  <option key={sr.key} value={sr.key}>
                    {"—".repeat(sr.indent ?? 0)}{sr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
              <input
                type="checkbox"
                checked={row.includeInTotals !== false}
                onChange={e => onChange({ includeInTotals: e.target.checked })}
              />
              Include in column totals
            </label>
          </div>
        </>
      )}

      {/* Blank */}
      {row.kind === "blank" && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Row height (px)</label>
          <input
            type="number"
            min={8} max={200}
            style={inputStyle}
            value={row.height ?? 22}
            onChange={e => onChange({ height: Number(e.target.value) || 22 })}
          />
        </div>
      )}

      {/* Group */}
      {row.kind === "group" && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Display label</label>
          <input
            type="text"
            style={inputStyle}
            value={row.label ?? row.name}
            onChange={e => onChange({ label: e.target.value })}
          />
        </div>
      )}

      {/* Divider */}
      {row.kind === "divider" && (
        <>
          <div style={sectionStyle}>
            <label style={labelStyle}>Line style</label>
            <select
              style={selectStyle}
              value={row.lineStyle ?? "single"}
              onChange={e => onChange({ lineStyle: e.target.value as "single" | "double" | "dashed" })}
            >
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="dashed">Dashed</option>
            </select>
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Line color</label>
            <input
              type="color"
              style={{ ...inputStyle, height: 32, padding: 2 }}
              value={row.lineColor ?? "#d1d5db"}
              onChange={e => onChange({ lineColor: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
};
