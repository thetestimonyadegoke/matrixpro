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

// ---------- Style primitives --------------------------------------------------

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
  width: 480,
  maxWidth: 480,
  maxHeight: "90vh",
  background: "#ffffff",
  borderRadius: 8,
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  overflowX: "hidden",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontSize: 12,
  color: "#1f2937",
  boxSizing: "border-box",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  borderBottom: "1px solid #e5e7eb",
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  padding: "12px 16px",
  overflowY: "auto",
  overflowX: "hidden",
  flex: 1,
  background: "#ffffff",
  boxSizing: "border-box",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "8px 16px",
  borderTop: "1px solid #e5e7eb",
  background: "#ffffff",
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  borderRadius: 5,
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#ffffff",
  color: "#111827",
};

const primaryBtn: React.CSSProperties = {
  padding: "6px 14px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const secondaryBtn: React.CSSProperties = {
  padding: "6px 14px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 12,
};

// ---------- SectionTitle component -------------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      color: "#9ca3af",
      marginBottom: 8,
      marginTop: 12,
    }}
  >
    {children}
  </div>
);

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

  const goBack = () => { setView("list"); setDraft(null); setEditingId(null); };

  return (
    <div style={overlayStyle} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle} onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {view === "edit" && (
              <button
                type="button"
                onClick={goBack}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#6b7280",
                  lineHeight: 1,
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Back to rules"
              >
                ←
              </button>
            )}
            <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
              {view === "edit"
                ? (editingId ? "Edit Formatting Rule" : "Create Formatting Rule")
                : "Conditional Formatting"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 18, color: "#6b7280", cursor: "pointer", lineHeight: 1, padding: "2px 4px" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
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

        {/* Footer */}
        <div style={footerStyle}>
          {view === "list" ? (
            <>
              <button type="button" style={secondaryBtn} onClick={onClose}>Close</button>
              <button type="button" style={primaryBtn} onClick={openCreate}>+ Create Rule</button>
            </>
          ) : (
            <>
              <button type="button" style={secondaryBtn} onClick={goBack}>Back</button>
              <button type="button" style={primaryBtn} onClick={applyDraft}>Apply</button>
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
      <div style={{ ...bodyStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎨</div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: "#111827" }}>No rules yet</div>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          Create your first rule to highlight cells based on value conditions,
          apply a color scale, or classify data into icon bands.
        </div>
        <button type="button" style={primaryBtn} onClick={onCreate}>+ Create Rule</button>
      </div>
    );
  }

  return (
    <div style={bodyStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rules.map(rule => (
          <div
            key={rule.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
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
              style={{ flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.title}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
                {formatByLabel(rule.formatBy)} · {scopeLabel(rule.scope.rowHierarchyLevels)}
              </div>
            </div>
            <button
              type="button"
              style={{ ...secondaryBtn, padding: "3px 8px", fontSize: 11, flexShrink: 0 }}
              onClick={() => onEdit(rule)}
            >
              Edit
            </button>
            <button
              type="button"
              style={{ ...secondaryBtn, padding: "3px 8px", fontSize: 11, color: "#b91c1c", borderColor: "#fecaca", flexShrink: 0 }}
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
    case "rules": return "Rules";
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

  const switchFormatBy = (formatBy: FormatBy) => {
    const next: ConditionalRule = { ...draft, formatBy };
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
  };

  const formatByOptions: { value: FormatBy; label: string }[] = [
    { value: "rules", label: "Rules" },
    { value: "colorScale", label: "Color Scale" },
    { value: "classification", label: "Classification" },
  ];

  return (
    <div style={bodyStyle}>
      {/* Scope card */}
      <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "10px 12px", marginBottom: 12, boxSizing: "border-box" }}>
        <SectionTitle>Apply to scope</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Target Field */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Target Field</div>
            <select
              style={inputStyle}
              value={draft.scope.targetMeasure}
              onChange={e => updateScope({ targetMeasure: Number(e.target.value) })}
            >
              <option value={-1}>All Measures</option>
              {measures.map(m => (
                <option key={m.index} value={m.index}>{m.name}</option>
              ))}
            </select>
          </div>
          {/* Hierarchy Control */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Hierarchy Control</div>
            <select
              style={inputStyle}
              value={draft.scope.rowHierarchyLevels}
              onChange={e => updateScope({ rowHierarchyLevels: e.target.value as any })}
            >
              <option value="valuesOnly">Values Only</option>
              <option value="totalsOnly">Totals Only</option>
              <option value="valuesAndTotals">Values and Totals</option>
            </select>
          </div>
        </div>
        {/* Exclude checkbox */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={draft.scope.excludeColumnGrandTotal}
            onChange={e => updateScope({ excludeColumnGrandTotal: e.target.checked })}
          />
          <span>Exclude Column Grand Totals</span>
        </label>
      </div>

      {/* Format configuration section */}
      <SectionTitle>Format configuration</SectionTitle>

      {/* Pill buttons for format type */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {formatByOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => switchFormatBy(opt.value)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 500,
              border: draft.formatBy === opt.value ? "none" : "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              background: draft.formatBy === opt.value ? "#111827" : "#ffffff",
              color: draft.formatBy === opt.value ? "#ffffff" : "#374151",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Name field */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#6b7280", minWidth: 36, flexShrink: 0 }}>Name</span>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={draft.title}
          onChange={e => update({ title: e.target.value })}
          placeholder="Rule name"
        />
      </div>

      {/* Sub-editor */}
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
          { value: "label", label: "Label" },
          { value: "chart", label: "Chart" },
        ]}
        selected={cfg.impactOn}
        onChange={v => onChange({ ...cfg, impactOn: v as any })}
      />

      <SectionTitle>Style</SectionTitle>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Text</span>
          <input
            type="color"
            value={cfg.style.color || "#111827"}
            onChange={e => setStyle({ color: e.target.value })}
            style={{ width: 24, height: 24, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Fill</span>
          <input
            type="color"
            value={cfg.style.backgroundColor || "#ffffff"}
            onChange={e => setStyle({ backgroundColor: e.target.value })}
            style={{ width: 24, height: 24, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer" }}
          />
        </div>
      </div>

      <SectionTitle>Conditions</SectionTitle>
      {cfg.conditions.map((cond, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 130px 80px 28px",
            gap: 4,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", textAlign: "right", paddingRight: 2 }}>
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
            <option value="greaterThan">&gt;</option>
            <option value="greaterThanOrEqual">&gt;=</option>
            <option value="lessThan">&lt;</option>
            <option value="lessThanOrEqual">&lt;=</option>
            <option value="equals">=</option>
            <option value="notEquals">!=</option>
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
            style={{ background: "transparent", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
            title="Remove condition"
          >
            ×
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
        style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, padding: "4px 0" }}
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
      {/* Two-column grid: Based on + Color scale for */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Based on</div>
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
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Color scale for</div>
          <select
            style={inputStyle}
            value={cfg.applyTo}
            onChange={e => onChange({ ...cfg, applyTo: e.target.value as any })}
          >
            <option value="background">Background</option>
            <option value="foreground">Foreground</option>
            <option value="both">Both</option>
            <option value="dataBar">Data bar</option>
          </select>
        </div>
      </div>

      {/* Two-column grid: Heat map type + Color scale type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Heat map type</div>
          <select
            style={inputStyle}
            value={cfg.heatMapType}
            onChange={e => onChange({ ...cfg, heatMapType: e.target.value as any })}
          >
            <option value="columnWise">Column wise</option>
            <option value="rowWise">Row wise</option>
            <option value="tableWise">Table wise</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Color scale type</div>
          <select
            style={inputStyle}
            value={cfg.scaleType}
            onChange={e => onChange({ ...cfg, scaleType: e.target.value as any })}
          >
            <option value="sequential">Sequential</option>
            <option value="diverging">Diverging</option>
          </select>
        </div>
      </div>

      <SectionTitle>Color scheme</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151", cursor: "pointer", flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={cfg.reverse}
            onChange={e => onChange({ ...cfg, reverse: e.target.checked })}
          />
          Reverse
        </label>
      </div>

      {/* Gradient preview — height 16px */}
      <div
        style={{
          height: 16,
          borderRadius: 4,
          border: "1px solid #d1d5db",
          marginBottom: 10,
          background: `linear-gradient(to right, ${(cfg.reverse ? [...cfg.colorScheme].reverse() : cfg.colorScheme).join(", ")})`,
        }}
      />

      {/* Number of bands */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#374151", minWidth: 96, flexShrink: 0 }}>Number of bands</span>
        <input
          style={{ ...inputStyle, width: 72 }}
          type="number"
          min={0}
          max={12}
          value={cfg.numberOfBands}
          onChange={e => onChange({ ...cfg, numberOfBands: Number(e.target.value) })}
        />
      </div>

      {/* Checkboxes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.hideValue}
            onChange={e => onChange({ ...cfg, hideValue: e.target.checked })}
          />
          Hide value
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.autoFontColor}
            onChange={e => onChange({ ...cfg, autoFontColor: e.target.checked })}
          />
          Auto font color
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
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
          { value: "label", label: "Label" },
          { value: "chart", label: "Chart" },
        ]}
        selected={cfg.impactOn}
        onChange={v => onChange({ ...cfg, impactOn: v as any })}
      />

      {/* Settings grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Based on</div>
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
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Icon position</div>
          <select
            style={inputStyle}
            value={cfg.iconPosition}
            onChange={e => onChange({ ...cfg, iconPosition: e.target.value as any })}
          >
            <option value="leftOfData">Left of data</option>
            <option value="rightOfData">Right of data</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.displayIcons}
            onChange={e => onChange({ ...cfg, displayIcons: e.target.checked })}
          />
          Display icons
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.applyToCharts}
            onChange={e => onChange({ ...cfg, applyToCharts: e.target.checked })}
          />
          Apply to charts
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.showAsNewColumn}
            onChange={e => onChange({ ...cfg, showAsNewColumn: e.target.checked })}
          />
          Show as new column
        </label>
      </div>

      <SectionTitle>Classification ranges</SectionTitle>
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
          <input
            type="radio"
            checked={cfg.rangeMode === "value"}
            onChange={() => onChange({ ...cfg, rangeMode: "value" })}
          />
          Value
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
          <input
            type="radio"
            checked={cfg.rangeMode === "percentage"}
            onChange={() => onChange({ ...cfg, rangeMode: "percentage" })}
          />
          Percentage
        </label>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 64px 36px 28px", columnGap: 4, alignItems: "center", fontSize: 10, color: "#6b7280", marginBottom: 4 }}>
        <div>From (&gt;=)</div>
        <div>To (&lt;=)</div>
        <div>Icon</div>
        <div>Color</div>
        <div />
      </div>

      {cfg.ranges.map((r, i) => (
        <div
          key={i}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 64px 36px 28px", columnGap: 4, alignItems: "center", marginBottom: 5 }}
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
            <option value="check">✓ Check</option>
            <option value="warn">! Warn</option>
            <option value="cross">✕ Cross</option>
          </select>
          <input
            type="color"
            value={r.color}
            onChange={e => setRange(i, { color: e.target.value })}
            style={{ width: "100%", height: 26, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => removeRange(i)}
            style={{ background: "transparent", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
            title="Remove range"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRange}
        style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, padding: "4px 0" }}
      >
        + Add range
      </button>
    </>
  );
};

// ---------- Small shared components ------------------------------------------

const ChipToggle: React.FC<{
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ options, selected, onChange }) => (
  <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
    {options.map(opt => {
      const active = selected.includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
          style={{
            padding: "3px 10px",
            background: active ? "#dbeafe" : "#ffffff",
            border: `1px solid ${active ? "#93c5fd" : "#d1d5db"}`,
            color: active ? "#1d4ed8" : "#374151",
            borderRadius: 999,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {opt.label}{active ? " ×" : ""}
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
      width: 26,
      height: 26,
      background: active ? "#e0e7ff" : "#ffffff",
      border: `1px solid ${active ? "#818cf8" : "#d1d5db"}`,
      color: "#111827",
      borderRadius: 4,
      fontWeight: 700,
      fontStyle: italic ? "italic" : "normal",
      cursor: "pointer",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {label}
  </button>
);
