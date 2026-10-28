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
import { Button, ColorWell, EmptyNote, Field, IconButton, Overlay, Segmented, Switch } from "./overlayKit";
import { IconChevronDown, IconGrip, IconInsertRow, IconPlus, IconSearch, IconTrash } from "./icons";

export interface CalcRowPanelProps {
  rows: FlattenedNode[];
  measures?: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onApply: (rows: InsertedRow[]) => void;
}

// The shared icon set has no eye glyphs yet; these follow its 16px / 1.5 stroke grid.
const EyeOpen: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const EyeOff: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6.6 3.65A6 6 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.6 2.1M4.1 4.9C2.4 6.1 1.5 8 1.5 8S4 12.5 8 12.5c1.3 0 2.4-.45 3.3-1.1" />
    <path d="M2 2l12 12" />
  </svg>
);

const ellipsis: React.CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// ─── Kind metadata ───────────────────────────────────────────────────────────

const KIND_LABEL: Record<InsertedRowKind, string> = {
  calculated: "Calculated",
  blank: "Blank",
  group: "Group",
  child: "Child",
  divider: "Divider",
};
const ADD_MENU: [InsertedRowKind, string][] = [
  ["calculated", "Calculated row"],
  ["blank", "Blank row"],
  ["group", "Row group"],
  ["child", "Child calculated row"],
  ["divider", "Divider"],
];

type TabFilter = "all" | InsertedRowKind;
const TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "All types" },
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
    <Overlay
      kind="dialog"
      title="Inserted rows"
      subtitle="Calculated rows, blanks, groups and dividers added to the matrix."
      width={920}
      flush
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onApply(items)}>Apply</Button>
        </>
      }
    >
      <div className="mx-split" style={{ flex: "1 1 560px", gridTemplateColumns: "320px 1fr" }}>
        {/* ── Row list ─────────────────────────────────────────── */}
        <div className="mx-split-nav">
          <div className="mx-row" style={{ gap: 6 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <span className="mx-muted" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
                <IconSearch size={14} />
              </span>
              <input
                type="search"
                className="mx-input is-sm"
                style={{ paddingLeft: 28 }}
                placeholder="Search rows"
                aria-label="Search rows"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="mx-select is-sm"
              style={{ width: 112, flexShrink: 0 }}
              aria-label="Filter by type"
              value={tab}
              onChange={e => setTab(e.target.value as TabFilter)}
            >
              {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p className="mx-muted" style={{ margin: 0, padding: "24px 8px", textAlign: "center" }}>
                {items.length === 0 ? "No inserted rows yet." : "No rows match your filter."}
              </p>
            ) : (
              <ul className="mx-list">
                {filtered.map(row => {
                  const active = row.id === selectedId;
                  const isHover = hoverId === row.id;
                  const cls = [
                    "mx-item", "is-clickable",
                    active && "is-selected",
                    draggedId === row.id && "is-dragging",
                    dragOverId === row.id && "is-drop-target",
                  ].filter(Boolean).join(" ");
                  return (
                    <li
                      key={row.id}
                      className={cls}
                      draggable
                      onDragStart={e => handleDragStart(e, row.id)}
                      onDragOver={e => handleDragOver(e, row.id)}
                      onDrop={e => handleDrop(e, row.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedId(row.id)}
                      onMouseEnter={() => setHoverId(row.id)}
                      onMouseLeave={() => setHoverId(null)}
                      aria-current={active ? "true" : undefined}
                      style={{ paddingLeft: 6 }}
                    >
                      <span className="mx-item-grip" title="Drag to reorder"><IconGrip size={14} /></span>
                      <div className="mx-item-main" style={{ opacity: row.enabled ? 1 : 0.55 }}>
                        <span className="mx-item-title">{row.name || "Untitled"}</span>
                        <span className="mx-item-meta">{KIND_LABEL[row.kind]}{row.enabled ? "" : " · hidden"}</span>
                      </div>
                      <div className="mx-item-actions">
                        {isHover && (
                          <IconButton
                            label="Delete row"
                            tone="danger"
                            icon={<IconTrash size={14} />}
                            onClick={e => { e.stopPropagation(); deleteRow(row.id); }}
                          />
                        )}
                        <IconButton
                          label={row.enabled ? "Hide row" : "Show row"}
                          aria-pressed={!row.enabled}
                          icon={row.enabled ? <EyeOpen /> : <EyeOff />}
                          onClick={e => { e.stopPropagation(); toggleEnabled(row.id); }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Add row + type menu */}
          <div ref={addBtnRef} style={{ position: "relative" }}>
            <div className="mx-row" style={{ gap: 4 }}>
              <Button icon={<IconPlus size={14} />} onClick={() => addRow("calculated")} style={{ flex: 1 }}>
                Add calculated row
              </Button>
              <IconButton
                label="Add another row type"
                aria-haspopup="menu"
                aria-expanded={addMenuOpen}
                icon={<IconChevronDown size={14} />}
                onClick={() => setAddMenuOpen(v => !v)}
              />
            </div>
            {addMenuOpen && (
              <div
                className="mx-popover"
                role="menu"
                onMouseLeave={() => setAddMenuOpen(false)}
                style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, minWidth: 0, zIndex: 10 }}
              >
                {ADD_MENU.map(([k, label]) => (
                  <button key={k} type="button" role="menuitem" className="mx-popover-item" onClick={() => addRow(k)}>
                    <span className="mx-popover-label">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────────────── */}
        <div className="mx-split-main">
          {!selected ? (
            <EmptyNote
              icon={<IconInsertRow size={20} />}
              title="No row selected"
              hint="Pick a row on the left to edit it, or add a calculated row, blank, group or divider."
            />
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
    </Overlay>
  );
};

CalcRowPanel.displayName = "CalcRowPanel";

// ─── Row detail form ─────────────────────────────────────────────────────────

interface RowDetailFormProps {
  row: InsertedRow;
  sourceRows: FlattenedNode[];
  allRows: InsertedRow[];
  measures?: MeasureInfo[];
  onChange: (patch: Partial<InsertedRow>) => void;
}

const RowDetailForm: React.FC<RowDetailFormProps> = ({ row, sourceRows, measures = [], onChange }) => {
  const intelliSenseContext: IntelliSenseContext = useMemo(() => ({
    measures: measures,
    calculatedMeasures: [] as any[],
    columns: [] as any[], // Column context not strictly required for row formulas, but could be added
    rows: sourceRows,
    rowHierarchyLevels: [] as string[],
    columnHierarchyLevels: [] as string[],
  }), [measures, sourceRows]);

  const anyRow = row as any;
  const isCalc = row.kind === "calculated" || row.kind === "child";

  return (
    <div className="mx-stack">
      <div className="mx-stack is-tight" style={{ gap: 2 }}>
        <span className="mx-muted" style={{ fontSize: 11 }}>{KIND_LABEL[row.kind]} row</span>
        <span style={{ ...ellipsis, fontSize: 15, fontWeight: 600, color: "var(--mx-text)" }}>{row.name || "Untitled row"}</span>
      </div>

      {/* Name — common to all kinds */}
      <Field label="Name" htmlFor="crp-name">
        <input
          id="crp-name"
          type="text"
          className="mx-input"
          value={row.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </Field>

      {/* Calculated / child */}
      {isCalc && (
        <>
          <Field label="Calculation">
            <Segmented
              block
              ariaLabel="Formula type"
              value={row.formulaType}
              onChange={v => onChange({ formulaType: v })}
              options={[
                { value: "sum", label: "Sum of rows" },
                { value: "subtract", label: "First minus others", title: "A − B − C …" },
                { value: "custom", label: "Custom formula" },
              ]}
            />
          </Field>

          {row.formulaType !== "custom" ? (
            <Field label="Source rows" hint={row.formulaType === "subtract" ? "The first row you tick is the base; later rows are subtracted from it." : undefined}>
              {sourceRows.length === 0 ? (
                <p className="mx-muted" style={{ margin: 0 }}>No rows available</p>
              ) : (
                <div
                  role="group"
                  aria-label="Source rows"
                  style={{ maxHeight: 180, overflowY: "auto", padding: "4px 8px", border: "1px solid var(--mx-ov-field-line)", borderRadius: "var(--mx-control-radius, 6px)" }}
                >
                  {sourceRows.map(sr => {
                    const order = row.rowReferences.indexOf(sr.key) + 1;
                    const checked = order > 0;
                    return (
                      <label key={sr.key} className="mx-check" style={{ paddingLeft: (sr.indent ?? 0) * 14 }}>
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
                        <span style={{ ...ellipsis, flex: 1 }}>{sr.label}</span>
                        {sr.isSubtotal && <span className="mx-badge">Subtotal</span>}
                        {row.formulaType === "subtract" && checked && (
                          <span className={`mx-badge${order === 1 ? " is-accent" : ""}`}>{order === 1 ? "Base" : `− ${order - 1}`}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
          ) : (
            <Field label="Formula" hint="Reference rows and measures by name in brackets, e.g. [Revenue]. Ctrl+Space shows suggestions.">
              <FormulaEditor
                value={row.customFormula ?? ""}
                onChange={val => onChange({ customFormula: val })}
                context={intelliSenseContext}
                placeholder="e.g. [Revenue] - [COGS]"
              />
            </Field>
          )}

          <div className="mx-grid-2">
            <Field label="Position">
              <Segmented
                block
                ariaLabel="Placement"
                value={row.placement ?? "after"}
                onChange={v => onChange({ placement: v })}
                options={[
                  { value: "before", label: "Before" },
                  { value: "after", label: "After" },
                  { value: "child", label: "Inside", title: "Insert as child of the target row" },
                ]}
              />
            </Field>
            <Field label="Target row" htmlFor="crp-target">
              <select
                id="crp-target"
                className="mx-select"
                value={row.targetRowKey ?? ""}
                onChange={e => onChange({ targetRowKey: e.target.value })}
              >
                <option value="">None</option>
                {sourceRows.map(sr => (
                  <option key={sr.key} value={sr.key}>
                    {"—".repeat(sr.indent ?? 0)}{sr.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Switch
            label="Include in column totals"
            checked={row.includeInTotals !== false}
            onChange={v => onChange({ includeInTotals: v })}
          />

          <div className="mx-divider" />

          <div className="mx-grid-2">
            <Field label="Scale" htmlFor="crp-scale">
              <select
                id="crp-scale"
                className="mx-select"
                value={anyRow.scalingFactor ?? "none"}
                onChange={e => onChange({ scalingFactor: e.target.value as any })}
              >
                <option value="none">None</option>
                <option value="thousands">Thousands</option>
                <option value="millions">Millions</option>
                <option value="billions">Billions</option>
                <option value="trillions">Trillions</option>
                <option value="auto">Auto</option>
              </select>
            </Field>
            <Field label="Quick format" htmlFor="crp-quick">
              <select
                id="crp-quick"
                className="mx-select"
                value={anyRow.quickFormat ?? "none"}
                onChange={e => onChange({ quickFormat: e.target.value as any })}
              >
                <option value="none">None</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
              </select>
            </Field>
            <Field label="Number format" htmlFor="crp-format">
              <select
                id="crp-format"
                className="mx-select"
                value={anyRow.numberFormat ?? ""}
                onChange={e => onChange({ numberFormat: e.target.value })}
              >
                <option value="">General</option>
                <option value="#,##0">Number</option>
                <option value="#,##0.00">Number, 2 decimals</option>
                <option value="$#,##0.00">Currency</option>
                <option value="0.0%">Percentage</option>
              </select>
            </Field>
            <Field label="Decimals" htmlFor="crp-decimals">
              <input
                id="crp-decimals"
                type="number"
                min={0}
                max={8}
                className="mx-input is-num"
                value={anyRow.decimals ?? 1}
                onChange={e => onChange({ decimals: Math.max(0, Math.min(8, Number(e.target.value) || 0)) })}
              />
            </Field>
          </div>

          <Switch
            label="Override column formatting"
            hint="Use this row's format instead of the column's."
            checked={!!anyRow.overrideColumnFormat}
            onChange={v => onChange({ overrideColumnFormat: v })}
          />
        </>
      )}

      {/* Blank */}
      {row.kind === "blank" && (
        <Field label="Row height" hint="In pixels." htmlFor="crp-height">
          <input
            id="crp-height"
            type="number"
            min={8} max={200}
            className="mx-input is-num"
            style={{ width: 96 }}
            value={row.height ?? 22}
            onChange={e => onChange({ height: Number(e.target.value) || 22 })}
          />
        </Field>
      )}

      {/* Group */}
      {row.kind === "group" && (
        <Field label="Display label" htmlFor="crp-label">
          <input
            id="crp-label"
            type="text"
            className="mx-input"
            value={row.label ?? row.name}
            onChange={e => onChange({ label: e.target.value })}
          />
        </Field>
      )}

      {/* Divider */}
      {row.kind === "divider" && (
        <>
          <Field label="Line style">
            <Segmented
              ariaLabel="Line style"
              value={row.lineStyle ?? "single"}
              onChange={v => onChange({ lineStyle: v })}
              options={[
                { value: "single", label: "Single" },
                { value: "double", label: "Double" },
                { value: "dashed", label: "Dashed" },
              ]}
            />
          </Field>
          <Field label="Line color" inline>
            <ColorWell
              label="Line color"
              value={row.lineColor ?? "#d1d5db"}
              onChange={v => onChange({ lineColor: v })}
            />
          </Field>
        </>
      )}
    </div>
  );
};
