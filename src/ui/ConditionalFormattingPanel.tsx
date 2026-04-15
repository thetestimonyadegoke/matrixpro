import React, { useState, useMemo, useCallback } from "react";
import { VisualSettings } from "../settings/settings";
import { MeasureInfo } from "../model/pivot";
import {
  ConditionalRule,
  RulesCondition,
  RuleOp,
  FormatBy,
  ClassificationRange,
  parseRules,
  stringifyRules,
  defaultRule,
  newRuleId,
  COLOR_SCHEME_PRESETS,
} from "../format/conditional";

export interface ConditionalFormattingPanelProps {
  settings: VisualSettings;
  measures: MeasureInfo[];
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  /**
   * When provided, the panel opens directly on the Create/Edit Rule view with
   * this rule pre-selected (or a fresh rule if `"new"`).
   */
  initialRuleId?: string | "new" | null;
}

type View = "list" | "edit";

// ---------- Small styled primitives (kept local so we don't pull in a design system) ----

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(15, 23, 42, 0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: 560,
  maxHeight: "92%",
  background: "#ffffff",
  borderRadius: 8,
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 13,
  color: "#1f2937",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 18px",
  borderBottom: "1px solid #e5e7eb",
};

const bodyStyle: React.CSSProperties = {
  padding: "16px 18px",
  overflowY: "auto",
  flex: 1,
  background: "#f8fafc",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "12px 18px",
  borderTop: "1px solid #e5e7eb",
  background: "#ffffff",
};

const fieldRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "130px 1fr",
  alignItems: "center",
  columnGap: 16,
  rowGap: 10,
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  color: "#374151",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  fontSize: 13,
  color: "#111827",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 18px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 18px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 13,
};

// =============================================================================
// Top-level component
// =============================================================================

export const ConditionalFormattingPanel: React.FC<ConditionalFormattingPanelProps> = ({
  settings,
  measures,
  onClose,
  onPersistProperty,
  initialRuleId = null,
}) => {
  const initialRules = useMemo(() => parseRules(settings.conditionalFormatting), [settings.conditionalFormatting]);
  const [rules, setRules] = useState<ConditionalRule[]>(initialRules);

  const [view, setView] = useState<View>(() => (initialRuleId ? "edit" : "list"));
  const [editingId, setEditingId] = useState<string | null>(() => {
    if (!initialRuleId) return null;
    if (initialRuleId === "new") return null;
    return initialRuleId;
  });
  const [draft, setDraft] = useState<ConditionalRule | null>(() => {
    if (initialRuleId === "new") return defaultRule(`Rule ${initialRules.length + 1}`);
    if (initialRuleId && initialRuleId !== "new") {
      return initialRules.find(r => r.id === initialRuleId) || null;
    }
    return null;
  });

  const persistRules = useCallback((next: ConditionalRule[]) => {
    setRules(next);
    onPersistProperty("conditionalFormatting", "rules", stringifyRules(next));
    // Also flip the master enabled flag on when the user creates their first rule,
    // so rules actually show up in the grid without a second manual step.
    if (next.length > 0 && !settings.conditionalFormatting.enabled) {
      onPersistProperty("conditionalFormatting", "enabled", true);
    }
  }, [onPersistProperty, settings.conditionalFormatting.enabled]);

  const openCreate = () => {
    setDraft(defaultRule(`Rule ${rules.length + 1}`));
    setEditingId(null);
    setView("edit");
  };

  const openEdit = (rule: ConditionalRule) => {
    setDraft(JSON.parse(JSON.stringify(rule)));
    setEditingId(rule.id);
    setView("edit");
  };

  const deleteRule = (id: string) => {
    persistRules(rules.filter(r => r.id !== id));
  };

  const toggleRule = (id: string) => {
    persistRules(rules.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const applyDraft = () => {
    if (!draft) return;
    const existingIdx = rules.findIndex(r => r.id === draft.id);
    let next: ConditionalRule[];
    if (existingIdx >= 0) {
      next = rules.slice();
      next[existingIdx] = draft;
    } else {
      next = [...rules, draft];
    }
    persistRules(next);
    setView("list");
    setDraft(null);
    setEditingId(null);
  };

  return (
    <div style={overlayStyle} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle} onMouseDown={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {view === "edit" && (
              <button
                type="button"
                onClick={() => { setView("list"); setDraft(null); setEditingId(null); }}
                style={{ ...secondaryBtn, padding: "4px 8px" }}
                title="Back to rules"
              >
                ←
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Conditional Formatting
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 22, color: "#6b7280", cursor: "pointer", lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {view === "list" ? (
          <RuleListView
            rules={rules}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={deleteRule}
            onToggle={toggleRule}
          />
        ) : (
          draft && (
            <RuleEditor
              draft={draft}
              setDraft={setDraft}
              measures={measures}
            />
          )
        )}

        <div style={footerStyle}>
          {view === "list" ? (
            <>
              <button type="button" style={secondaryBtn} onClick={onClose}>Close</button>
              <button type="button" style={primaryBtn} onClick={openCreate}>+ Create Rule</button>
            </>
          ) : (
            <>
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => { setView("list"); setDraft(null); setEditingId(null); }}
              >
                Back
              </button>
              <button type="button" style={primaryBtn} onClick={applyDraft}>
                Apply
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Rule list view
// =============================================================================

const RuleListView: React.FC<{
  rules: ConditionalRule[];
  onCreate: () => void;
  onEdit: (r: ConditionalRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}> = ({ rules, onCreate, onEdit, onDelete, onToggle }) => {
  if (rules.length === 0) {
    return (
      <div style={{ ...bodyStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No rules yet</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
          Create your first rule to highlight cells based on value conditions,<br />
          apply a color scale, or classify data into icon bands.
        </div>
        <button type="button" style={primaryBtn} onClick={onCreate}>+ Create Rule</button>
      </div>
    );
  }

  return (
    <div style={bodyStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map(rule => (
          <div
            key={rule.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
            }}
          >
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={() => onToggle(rule.id)}
              title="Enable / disable rule"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{rule.title}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                {formatByLabel(rule.formatBy)} · {scopeLabel(rule.scope.rowHierarchyLevels)}
              </div>
            </div>
            <button
              type="button"
              style={{ ...secondaryBtn, padding: "4px 10px" }}
              onClick={() => onEdit(rule)}
            >
              Edit
            </button>
            <button
              type="button"
              style={{ ...secondaryBtn, padding: "4px 10px", color: "#b91c1c", borderColor: "#fecaca" }}
              onClick={() => onDelete(rule.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatByLabel(f: FormatBy): string {
  switch (f) {
    case "rules": return "Rules (if-conditions)";
    case "colorScale": return "Color scale";
    case "classification": return "Classification";
  }
}

function scopeLabel(s: ConditionalRule["scope"]["rowHierarchyLevels"]): string {
  switch (s) {
    case "valuesOnly": return "Values only";
    case "totalsOnly": return "Totals only";
    case "valuesAndTotals": return "Values and totals";
  }
}

// =============================================================================
// Rule editor (create / edit)
// =============================================================================

const RuleEditor: React.FC<{
  draft: ConditionalRule;
  setDraft: (r: ConditionalRule) => void;
  measures: MeasureInfo[];
}> = ({ draft, setDraft, measures }) => {
  const update = (patch: Partial<ConditionalRule>) => setDraft({ ...draft, ...patch });
  const updateScope = (patch: Partial<ConditionalRule["scope"]>) =>
    setDraft({ ...draft, scope: { ...draft.scope, ...patch } });

  return (
    <div style={bodyStyle}>
      <div style={fieldRowStyle}>
        <label style={labelStyle}>Title</label>
        <input
          style={inputStyle}
          value={draft.title}
          onChange={e => update({ title: e.target.value })}
        />

        <label style={labelStyle}>Apply to</label>
        <select
          style={inputStyle}
          value={draft.scope.targetMeasure}
          onChange={e => updateScope({ targetMeasure: Number(e.target.value) })}
        >
          <option value={-1}>All measures</option>
          {measures.map(m => (
            <option key={m.index} value={m.index}>{m.name}</option>
          ))}
        </select>

        <label style={labelStyle}>Row hierarchy levels</label>
        <select
          style={inputStyle}
          value={draft.scope.rowHierarchyLevels}
          onChange={e => updateScope({ rowHierarchyLevels: e.target.value as any })}
        >
          <option value="valuesOnly">Values only</option>
          <option value="totalsOnly">Totals only</option>
          <option value="valuesAndTotals">Values and totals</option>
        </select>

        <label style={labelStyle}>Exclude</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={draft.scope.excludeColumnGrandTotal}
            onChange={e => updateScope({ excludeColumnGrandTotal: e.target.checked })}
          />
          Column grand total
        </label>

        <label style={labelStyle}>Format by</label>
        <select
          style={inputStyle}
          value={draft.formatBy}
          onChange={e => {
            const formatBy = e.target.value as FormatBy;
            const next: ConditionalRule = { ...draft, formatBy };
            // Ensure the corresponding config exists so downstream inputs render.
            if (formatBy === "rules" && !next.rulesConfig) {
              next.rulesConfig = {
                impactOn: ["label"],
                conditions: [{ basedOnMeasure: -1, op: "greaterThan", value: 0 }],
                style: { color: "#15803d", fontWeight: "600" },
              };
            }
            if (formatBy === "colorScale" && !next.colorScaleConfig) {
              next.colorScaleConfig = {
                basedOnMeasure: -1,
                applyTo: "background",
                heatMapType: "columnWise",
                scaleType: "sequential",
                colorScheme: COLOR_SCHEME_PRESETS[0].colors,
                reverse: false,
                numberOfBands: 5,
                hideValue: false,
                autoFontColor: true,
                includeNull: false,
              };
            }
            if (formatBy === "classification" && !next.classificationConfig) {
              next.classificationConfig = {
                impactOn: ["label"],
                basedOnMeasure: -1,
                displayIcons: true,
                applyToCharts: true,
                showAsNewColumn: false,
                iconPosition: "leftOfData",
                rangeMode: "percentage",
                ranges: [
                  { from: -Infinity, to: -10, iconKind: "cross", color: "#dc2626" },
                  { from: -10, to: 10, iconKind: "warn", color: "#eab308" },
                  { from: 10, to: Infinity, iconKind: "check", color: "#16a34a" },
                ],
              };
            }
            setDraft(next);
          }}
        >
          <option value="rules">Rules (If Conditions)</option>
          <option value="colorScale">Color Scale</option>
          <option value="classification">Classification</option>
        </select>
      </div>

      <div style={{ height: 1, background: "#e5e7eb", margin: "14px 0" }} />

      {draft.formatBy === "rules" && draft.rulesConfig && (
        <RulesConfigEditor
          cfg={draft.rulesConfig}
          onChange={c => update({ rulesConfig: c })}
          measures={measures}
        />
      )}
      {draft.formatBy === "colorScale" && draft.colorScaleConfig && (
        <ColorScaleEditor
          cfg={draft.colorScaleConfig}
          onChange={c => update({ colorScaleConfig: c })}
          measures={measures}
        />
      )}
      {draft.formatBy === "classification" && draft.classificationConfig && (
        <ClassificationEditor
          cfg={draft.classificationConfig}
          onChange={c => update({ classificationConfig: c })}
          measures={measures}
        />
      )}
    </div>
  );
};

// ---------- Rules (If conditions) editor -------------------------------------

const RulesConfigEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["rulesConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["rulesConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  const setStyle = (patch: Partial<typeof cfg.style>) => onChange({ ...cfg, style: { ...cfg.style, ...patch } });
  const setConditions = (next: RulesCondition[]) => onChange({ ...cfg, conditions: next });

  return (
    <>
      <SectionTitle>Impact on</SectionTitle>
      <ChipToggle
        options={[
          { value: "label", label: "label" },
          { value: "chart", label: "chart" },
        ]}
        selected={cfg.impactOn}
        onChange={v => onChange({ ...cfg, impactOn: v as any })}
      />

      <SectionTitle>Style</SectionTitle>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <StyleToggleButton
          label="B"
          active={cfg.style.fontWeight === "600" || cfg.style.fontWeight === "700"}
          onClick={() => setStyle({ fontWeight: cfg.style.fontWeight === "600" ? undefined : "600" })}
        />
        <StyleToggleButton
          label="I"
          italic
          active={cfg.style.fontStyle === "italic"}
          onClick={() => setStyle({ fontStyle: cfg.style.fontStyle === "italic" ? undefined : "italic" })}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Text</span>
          <input
            type="color"
            value={cfg.style.color || "#111827"}
            onChange={e => setStyle({ color: e.target.value })}
            style={{ width: 28, height: 28, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Fill</span>
          <input
            type="color"
            value={cfg.style.backgroundColor || "#ffffff"}
            onChange={e => setStyle({ backgroundColor: e.target.value })}
            style={{ width: 28, height: 28, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer" }}
          />
        </div>
      </div>

      <SectionTitle>Conditions</SectionTitle>
      {cfg.conditions.map((cond, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 1fr 1fr auto",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
            {i === 0 ? "If" : "And"}
          </span>
          <select
            style={inputStyle}
            value={cond.basedOnMeasure}
            onChange={e => {
              const next = cfg.conditions.slice();
              next[i] = { ...cond, basedOnMeasure: Number(e.target.value) };
              setConditions(next);
            }}
          >
            <option value={-1}>Self</option>
            {measures.map(m => (
              <option key={m.index} value={m.index}>{m.name}</option>
            ))}
          </select>
          <select
            style={inputStyle}
            value={cond.op}
            onChange={e => {
              const next = cfg.conditions.slice();
              next[i] = { ...cond, op: e.target.value as RuleOp };
              setConditions(next);
            }}
          >
            <option value="greaterThan">Greater than</option>
            <option value="greaterThanOrEqual">Greater or equal</option>
            <option value="lessThan">Less than</option>
            <option value="lessThanOrEqual">Less or equal</option>
            <option value="equals">Equals</option>
            <option value="notEquals">Not equals</option>
            <option value="between">Between</option>
          </select>
          <input
            style={inputStyle}
            type="number"
            value={cond.value}
            onChange={e => {
              const next = cfg.conditions.slice();
              next[i] = { ...cond, value: Number(e.target.value) };
              setConditions(next);
            }}
          />
          <button
            type="button"
            onClick={() => setConditions(cfg.conditions.filter((_, idx) => idx !== i))}
            style={{ background: "transparent", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 16 }}
            title="Remove condition"
          >
            🗑
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setConditions([
            ...cfg.conditions,
            { basedOnMeasure: -1, op: "greaterThan", value: 0 },
          ])
        }
        style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13, padding: "4px 0" }}
      >
        + Add Condition
      </button>
    </>
  );
};

// ---------- Color scale editor -----------------------------------------------

const ColorScaleEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["colorScaleConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["colorScaleConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  return (
    <>
      <div style={fieldRowStyle}>
        <label style={labelStyle}>Based on</label>
        <select
          style={inputStyle}
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <option value={-1}>Self</option>
          {measures.map(m => (
            <option key={m.index} value={m.index}>{m.name}</option>
          ))}
        </select>

        <label style={labelStyle}>Color scale for</label>
        <select
          style={inputStyle}
          value={cfg.applyTo}
          onChange={e => onChange({ ...cfg, applyTo: e.target.value as any })}
        >
          <option value="background">Background</option>
          <option value="foreground">Foreground</option>
          <option value="both">Both</option>
        </select>

        <label style={labelStyle}>Heat map type</label>
        <select
          style={inputStyle}
          value={cfg.heatMapType}
          onChange={e => onChange({ ...cfg, heatMapType: e.target.value as any })}
        >
          <option value="columnWise">Column wise</option>
          <option value="rowWise">Row wise</option>
          <option value="tableWise">Table wise</option>
        </select>

        <label style={labelStyle}>Color scale type</label>
        <select
          style={inputStyle}
          value={cfg.scaleType}
          onChange={e => onChange({ ...cfg, scaleType: e.target.value as any })}
        >
          <option value="sequential">Sequential</option>
          <option value="diverging">Diverging</option>
        </select>
      </div>

      <SectionTitle>Color scheme</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <select
          style={{ ...inputStyle, flex: 1 }}
          value={findSchemeId(cfg.colorScheme)}
          onChange={e => {
            const preset = COLOR_SCHEME_PRESETS.find(p => p.id === e.target.value);
            if (preset) onChange({ ...cfg, colorScheme: preset.colors });
          }}
        >
          {COLOR_SCHEME_PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={cfg.reverse}
            onChange={e => onChange({ ...cfg, reverse: e.target.checked })}
          />
          Reverse color
        </label>
      </div>
      <div
        style={{
          height: 22,
          borderRadius: 4,
          border: "1px solid #d1d5db",
          marginBottom: 14,
          background: `linear-gradient(to right, ${(cfg.reverse ? [...cfg.colorScheme].reverse() : cfg.colorScheme).join(", ")})`,
        }}
      />

      <div style={fieldRowStyle}>
        <label style={labelStyle}>Number of bands</label>
        <input
          style={inputStyle}
          type="number"
          min={0}
          max={12}
          value={cfg.numberOfBands}
          onChange={e => onChange({ ...cfg, numberOfBands: Number(e.target.value) })}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.hideValue}
            onChange={e => onChange({ ...cfg, hideValue: e.target.checked })}
          />
          Hide value
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.autoFontColor}
            onChange={e => onChange({ ...cfg, autoFontColor: e.target.checked })}
          />
          Auto font color
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.includeNull}
            onChange={e => onChange({ ...cfg, includeNull: e.target.checked })}
          />
          Include null
        </label>
      </div>
    </>
  );
};

function findSchemeId(colors: string[]): string {
  const match = COLOR_SCHEME_PRESETS.find(p => p.colors.length === colors.length && p.colors.every((c, i) => c === colors[i]));
  return match ? match.id : COLOR_SCHEME_PRESETS[0].id;
}

// ---------- Classification editor --------------------------------------------

const ClassificationEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["classificationConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["classificationConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  const setRange = (i: number, patch: Partial<ClassificationRange>) => {
    const next = cfg.ranges.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...cfg, ranges: next });
  };
  const removeRange = (i: number) => onChange({ ...cfg, ranges: cfg.ranges.filter((_, idx) => idx !== i) });
  const addRange = () =>
    onChange({
      ...cfg,
      ranges: [...cfg.ranges, { from: 0, to: 100, iconKind: "check", color: "#16a34a" }],
    });

  return (
    <>
      <SectionTitle>Impact on</SectionTitle>
      <ChipToggle
        options={[
          { value: "label", label: "label" },
          { value: "chart", label: "chart" },
        ]}
        selected={cfg.impactOn}
        onChange={v => onChange({ ...cfg, impactOn: v as any })}
      />

      <div style={fieldRowStyle}>
        <label style={labelStyle}>Based on</label>
        <select
          style={inputStyle}
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <option value={-1}>Self</option>
          {measures.map(m => (
            <option key={m.index} value={m.index}>{m.name}</option>
          ))}
        </select>

        <label style={labelStyle}>Display</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.displayIcons}
            onChange={e => onChange({ ...cfg, displayIcons: e.target.checked })}
          />
          Icons
        </label>

        <label style={labelStyle}>Apply to charts</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.applyToCharts}
            onChange={e => onChange({ ...cfg, applyToCharts: e.target.checked })}
          />
          Yes
        </label>

        <label style={labelStyle}>Show as new column</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={cfg.showAsNewColumn}
            onChange={e => onChange({ ...cfg, showAsNewColumn: e.target.checked })}
          />
          Yes
        </label>

        <label style={labelStyle}>Icon position</label>
        <select
          style={inputStyle}
          value={cfg.iconPosition}
          onChange={e => onChange({ ...cfg, iconPosition: e.target.value as any })}
        >
          <option value="leftOfData">Left of data</option>
          <option value="rightOfData">Right of data</option>
        </select>
      </div>

      <SectionTitle>Classification ranges</SectionTitle>
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input
            type="radio"
            checked={cfg.rangeMode === "value"}
            onChange={() => onChange({ ...cfg, rangeMode: "value" })}
          />
          Value
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <input
            type="radio"
            checked={cfg.rangeMode === "percentage"}
            onChange={() => onChange({ ...cfg, rangeMode: "percentage" })}
          />
          Percentage
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "80px 80px 60px 60px 40px", columnGap: 8, rowGap: 6, alignItems: "center", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
        <div>From (&gt;=)</div>
        <div>To (&lt;=)</div>
        <div>Icon</div>
        <div>Color</div>
        <div />
      </div>

      {cfg.ranges.map((r, i) => (
        <div
          key={i}
          style={{ display: "grid", gridTemplateColumns: "80px 80px 60px 60px 40px", columnGap: 8, rowGap: 6, alignItems: "center", marginBottom: 6 }}
        >
          <input
            style={inputStyle}
            type="number"
            value={Number.isFinite(r.from) ? r.from : ""}
            onChange={e => setRange(i, { from: e.target.value === "" ? -Infinity : Number(e.target.value) })}
          />
          <input
            style={inputStyle}
            type="number"
            value={Number.isFinite(r.to) ? r.to : ""}
            onChange={e => setRange(i, { to: e.target.value === "" ? Infinity : Number(e.target.value) })}
          />
          <select
            style={inputStyle}
            value={r.iconKind}
            onChange={e => setRange(i, { iconKind: e.target.value as any })}
          >
            <option value="check">✓</option>
            <option value="warn">!</option>
            <option value="cross">✕</option>
          </select>
          <input
            type="color"
            value={r.color}
            onChange={e => setRange(i, { color: e.target.value })}
            style={{ width: "100%", height: 30, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none" }}
          />
          <button
            type="button"
            onClick={() => removeRange(i)}
            style={{ background: "transparent", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 14 }}
            title="Remove range"
          >
            🗑
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRange}
        style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13, padding: "4px 0" }}
      >
        + Add range
      </button>
    </>
  );
};

// ---------- Small shared components ------------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, marginTop: 4 }}>
    {children}
  </div>
);

const ChipToggle: React.FC<{
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ options, selected, onChange }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    {options.map(opt => {
      const active = selected.includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
          style={{
            padding: "4px 10px",
            background: active ? "#dbeafe" : "#ffffff",
            border: `1px solid ${active ? "#93c5fd" : "#d1d5db"}`,
            color: active ? "#1d4ed8" : "#374151",
            borderRadius: 999,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {opt.label} {active ? "×" : ""}
        </button>
      );
    })}
  </div>
);

const StyleToggleButton: React.FC<{
  label: string;
  active: boolean;
  italic?: boolean;
  onClick: () => void;
}> = ({ label, active, italic, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: 30,
      height: 30,
      background: active ? "#e0e7ff" : "#ffffff",
      border: `1px solid ${active ? "#818cf8" : "#d1d5db"}`,
      color: "#111827",
      borderRadius: 4,
      fontWeight: 700,
      fontStyle: italic ? "italic" : "normal",
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);
