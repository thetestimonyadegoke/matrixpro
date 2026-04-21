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
  /**
   * Full preconfigured rule to open the editor with. Used by the ribbon's
   * Quick Conditional Formatting shortcuts so selecting, e.g., "Quick Positive"
   * opens the rule builder pre-populated rather than silently appending a rule.
   * Takes precedence over initialRuleId when set.
   */
  initialDraft?: ConditionalRule | null;
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
      fontSize: 12,
      fontWeight: 600,
      color: "#111827",
      marginBottom: 8,
      marginTop: 14,
    }}
  >
    {children}
  </div>
);

// ---------- FormRow (label | control) ---------------------------------------
// Used throughout the Rule editor so every field follows the same two-column
// layout as the reference screenshots: label on the left, control on the right.
const FormRow: React.FC<{ label: string; children: React.ReactNode; align?: "center" | "start" }> = ({
  label,
  children,
  align = "center",
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "130px 1fr",
      columnGap: 12,
      alignItems: align === "center" ? "center" : "start",
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6",
    }}
  >
    <div style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{label}</div>
    <div style={{ minWidth: 0 }}>{children}</div>
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
  initialDraft = null,
}) => {
  const initialRules = useMemo(() => parseRules(settings.conditionalFormatting), [settings.conditionalFormatting]);
  const [rules, setRules] = useState<ConditionalRule[]>(initialRules);

  const hasInitialEdit = !!(initialDraft || initialRuleId);
  const [view, setView] = useState<View>(() => (hasInitialEdit ? "edit" : "list"));
  const [editingId, setEditingId] = useState<string | null>(() => {
    if (initialDraft) return null; // Quick preset = new (unsaved) rule
    if (!initialRuleId) return null;
    if (initialRuleId === "new") return null;
    return initialRuleId;
  });
  const [draft, setDraft] = useState<ConditionalRule | null>(() => {
    if (initialDraft) return JSON.parse(JSON.stringify(initialDraft));
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

  const duplicateRule = (rule: ConditionalRule) => {
    const next: ConditionalRule = JSON.parse(JSON.stringify(rule));
    next.id = `rule_${Date.now()}`;
    next.title = `${rule.title} (Copy)`;
    persistRules([...rules, next]);
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
            onDuplicate={duplicateRule}
            onToggle={toggleRule}
            onReorder={persistRules}
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
        {view === "edit" && (
          <div style={footerStyle}>
            <button type="button" style={secondaryBtn} onClick={goBack}>Back</button>
            <button type="button" style={primaryBtn} onClick={applyDraft}>Apply</button>
          </div>
        )}
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
  onDuplicate: (r: ConditionalRule) => void;
  onToggle: (id: string) => void;
  onReorder: (next: ConditionalRule[]) => void;
}> = ({ rules, onCreate, onEdit, onDelete, onDuplicate, onToggle, onReorder }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const next = [...rules];
    const fi = next.findIndex(r => r.id === draggedId);
    const ti = next.findIndex(r => r.id === targetId);
    if (fi > -1 && ti > -1) {
      const [item] = next.splice(fi, 1);
      next.splice(ti, 0, item);
      onReorder(next);
    }
    setDraggedId(null);
  };

  const TypeIcon = ({ formatBy }: { formatBy: FormatBy }) => {
    switch (formatBy) {
      case "rules": return <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 11 }}>IF</span>;
      case "colorScale": return <span style={{ color: "#ea580c" }}>🎨</span>;
      case "classification": return <span style={{ color: "#16a34a" }}>📊</span>;
      case "dataBars": return <span style={{ color: "#2563eb" }}>❚❚</span>;
      case "ranking": return <span style={{ color: "#9333ea", fontWeight: 700, fontSize: 11 }}>№</span>;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px" }}>
      <button
        type="button"
        onClick={onCreate}
        style={{
          width: "100%",
          padding: "10px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add new rule
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            draggable
            onDragStart={e => handleDragStart(e, rule.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, rule.id)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              gap: 12,
              boxShadow: draggedId === rule.id ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
              opacity: draggedId === rule.id ? 0.5 : 1,
            }}
          >
            <div style={{ cursor: "grab", color: "#9ca3af" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
                <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
                <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
              </svg>
            </div>

            <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", borderRadius: 4 }}>
              <TypeIcon formatBy={rule.formatBy} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {rule.title}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Apply to: {rule.scope.targetType}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button 
                onClick={() => onToggle(rule.id)} 
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} 
                title={rule.enabled ? "Disable" : "Enable"}
              >
                <div style={{ width: 32, height: 16, background: rule.enabled ? "#2563eb" : "#d1d5db", borderRadius: 10, position: "relative", transition: "background 0.2s" }}>
                  <div style={{ width: 12, height: 12, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: rule.enabled ? 18 : 2, transition: "left 0.2s" }} />
                </div>
              </button>
              <button 
                onClick={() => onEdit(rule)} 
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px" }}
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button 
                onClick={() => onDuplicate(rule)} 
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px" }}
                title="Duplicate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button 
                onClick={() => onDelete(rule.id)} 
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>
            No conditional formatting rules yet.
          </div>
        )}
      </div>
    </div>
  );
};


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
    if (formatBy === "dataBars" && !next.dataBarsConfig) {
      next.dataBarsConfig = {
        basedOnMeasure: -1,
        positiveColor: "#2563eb",
        negativeColor: "#dc2626",
        axisPosition: "auto",
        showBarOnly: false,
        barDirection: "leftToRight",
      };
    }
    if (formatBy === "ranking" && !next.rankingConfig) {
      next.rankingConfig = {
        basedOnMeasure: -1,
        topCount: 10,
        mode: "top",
        usePercentage: false,
        style: { color: "#1d4ed8", fontWeight: "600" },
        impactOn: ["label"],
      };
    }
    setDraft(next);
  };

  return (
    <div style={bodyStyle}>
      {/* --- Common header form (matches screenshots 2/3/4/5) ------------- */}
      <FormRow label="Title">
        <input
          style={inputStyle}
          value={draft.title}
          onChange={e => update({ title: e.target.value })}
          placeholder="Rule name"
        />
      </FormRow>

      <FormRow label="Apply to">
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
      </FormRow>

      <FormRow label="Target">
        <select
          style={inputStyle}
          value={draft.scope.targetType}
          onChange={e => updateScope({ targetType: e.target.value as any })}
        >
          <option value="rows">Values (cells)</option>
          <option value="columns">Individual columns</option>
          <option value="rowHeaders">Row headers</option>
          <option value="columnHeaders">Column headers</option>
        </select>
      </FormRow>

      <FormRow label="Row hierarchy levels">
        <select
          style={inputStyle}
          value={draft.scope.rowHierarchyLevels}
          onChange={e => updateScope({ rowHierarchyLevels: e.target.value as any })}
        >
          <option value="valuesOnly">Values only</option>
          <option value="totalsOnly">Totals only</option>
          <option value="valuesAndTotals">Values and Totals</option>
        </select>
      </FormRow>

      <FormRow label="Exclude">
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={draft.scope.excludeColumnGrandTotal}
            onChange={e => updateScope({ excludeColumnGrandTotal: e.target.checked })}
          />
          <span>Column grand total</span>
        </label>
      </FormRow>

      <FormRow label="Format by">
        <select
          style={inputStyle}
          value={draft.formatBy}
          onChange={e => switchFormatBy(e.target.value as FormatBy)}
        >
          <option value="rules">Rules (If Conditions)</option>
          <option value="colorScale">Color Scale</option>
          <option value="classification">Classification</option>
          <option value="dataBars">Data Bars</option>
          <option value="ranking">Ranking</option>
        </select>
      </FormRow>

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
      {draft.formatBy === "dataBars" && draft.dataBarsConfig && (
        <DataBarsEditor
          cfg={draft.dataBarsConfig}
          onChange={c => update({ dataBarsConfig: c })}
          measures={measures}
        />
      )}
      {draft.formatBy === "ranking" && draft.rankingConfig && (
        <RankingEditor
          cfg={draft.rankingConfig}
          onChange={c => update({ rankingConfig: c })}
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
  const impactsLabel = cfg.impactOn.includes("label");
  const impactsChart = cfg.impactOn.includes("chart");

  return (
    <>
      <FormRow label="Impact on">
        <ImpactChipList
          selected={cfg.impactOn}
          onChange={v => onChange({ ...cfg, impactOn: v as any })}
        />
      </FormRow>

      <FormRow label="Text style" align="start">
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
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
          <StyleToggleButton
            label="U"
            active={cfg.style.textDecoration === "underline"}
            onClick={() => setStyle({ textDecoration: cfg.style.textDecoration === "underline" ? undefined : "underline" })}
          />
          <StyleToggleButton
            label="H"
            active={!!cfg.style.hatched}
            onClick={() => setStyle({ hatched: !cfg.style.hatched })}
            title="Hatched Pattern"
          />
        </div>
      </FormRow>

      <FormRow label="Text color">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ColorSwatchButton
            color={cfg.style.color || "#111827"}
            onChange={c => setStyle({ color: c })}
            icon="text"
            title="Text color"
          />
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {impactsLabel ? "Applied to matching cell text." : "Add `label` under Impact on to apply text formatting."}
          </span>
        </div>
      </FormRow>

      <FormRow label="Background color">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ColorSwatchButton
            color={cfg.style.backgroundColor || "#ffffff"}
            onChange={c => setStyle({ backgroundColor: c })}
            icon="fill"
            title="Background color"
          />
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {impactsChart
              ? "Applied to matching cell background."
              : "Applied to matching cells when a fill is defined."}
          </span>
        </div>
      </FormRow>

      <SectionTitle>Conditions</SectionTitle>
      {cfg.conditions.map((cond, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "30px 1fr 110px 80px 20px",
            columnGap: 6,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>
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
            <option value="notEquals">Not equal</option>
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
            style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}
            title="Remove condition"
          >
            ×
          </button>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button
          type="button"
          onClick={() =>
            setConditions([
              ...cfg.conditions,
              { basedOnMeasure: -1, op: "greaterThan", value: 0 },
            ])
          }
          style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, padding: "4px 0", fontWeight: 500 }}
        >
          + Add Condition
        </button>
      </div>
    </>
  );
};

// ---------- Impact chip list (removable chips) -------------------------------
// Renders impactOn as removable chips like the "chart ×" shown in screenshot 3.
const ImpactChipList: React.FC<{
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ selected, onChange }) => {
  const allOptions: { value: string; label: string }[] = [
    { value: "label", label: "label" },
    { value: "chart", label: "chart" },
  ];
  const remaining = allOptions.filter(o => !selected.includes(o.value));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        padding: "4px 6px",
        border: "1px solid #d1d5db",
        borderRadius: 5,
        background: "#ffffff",
        minHeight: 28,
        boxSizing: "border-box",
      }}
    >
      {selected.map(v => {
        const opt = allOptions.find(o => o.value === v);
        if (!opt) return null;
        return (
          <span
            key={v}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              fontSize: 12,
              color: "#111827",
            }}
          >
            {opt.label}
            <button
              type="button"
              onClick={() => onChange(selected.filter(x => x !== v))}
              style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
              aria-label={`Remove ${opt.label}`}
            >
              ×
            </button>
          </span>
        );
      })}
      {remaining.length > 0 && (
        <select
          value=""
          onChange={e => e.target.value && onChange([...selected, e.target.value])}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 12,
            color: "#6b7280",
            outline: "none",
            cursor: "pointer",
            flex: 1,
            minWidth: 60,
          }}
        >
          <option value="">+ Add…</option>
          {remaining.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );
};

// ---------- Color swatch button (opens native color picker) ------------------
// Visually mirrors the fill/text-color dropdowns in screenshot 3's Style row.
const ColorSwatchButton: React.FC<{
  color: string;
  onChange: (c: string) => void;
  icon: "text" | "fill";
  title: string;
}> = ({ color, onChange, icon, title }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <button
      type="button"
      title={title}
      onClick={() => inputRef.current?.click()}
      style={{
        width: 30,
        height: 26,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: 4,
        padding: 0,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
        {icon === "text" ? "A" : "▦"}
      </span>
      <span style={{ width: 14, height: 3, background: color, borderRadius: 1, border: "1px solid rgba(0,0,0,0.08)" }} />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={e => onChange(e.target.value)}
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />
    </button>
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
      <FormRow label="Based on">
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
      </FormRow>

      <FormRow label="Color scale for">
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
      </FormRow>

      <FormRow label="Heat map type">
        <select
          style={inputStyle}
          value={cfg.heatMapType}
          onChange={e => onChange({ ...cfg, heatMapType: e.target.value as any })}
        >
          <option value="columnWise">Column wise</option>
          <option value="rowWise">Row wise</option>
          <option value="tableWise">Table wise</option>
        </select>
      </FormRow>

      <FormRow label="Color scale type">
        <select
          style={inputStyle}
          value={cfg.scaleType}
          onChange={e => onChange({ ...cfg, scaleType: e.target.value as any })}
        >
          <option value="sequential">Sequential</option>
          <option value="diverging">Diverging</option>
        </select>
      </FormRow>

      {/* Color scheme — full-width preview row matching screenshot 4 */}
      <div style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>Color scheme</div>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={cfg.reverse}
              onChange={e => onChange({ ...cfg, reverse: e.target.checked })}
            />
            Reverse color
          </label>
        </div>
        <select
          style={{
            ...inputStyle,
            padding: 0,
            height: 34,
            backgroundImage: `linear-gradient(to right, ${(cfg.reverse ? [...cfg.colorScheme].reverse() : cfg.colorScheme).join(", ")})`,
            backgroundColor: "transparent",
            color: "transparent",
            textShadow: "0 0 0 transparent",
          }}
          value={findSchemeId(cfg.colorScheme)}
          onChange={e => {
            const preset = COLOR_SCHEME_PRESETS.find(p => p.id === e.target.value);
            if (preset) onChange({ ...cfg, colorScheme: preset.colors });
          }}
        >
          {COLOR_SCHEME_PRESETS.map(p => (
            <option key={p.id} value={p.id} style={{ color: "#111827" }}>{p.name}</option>
          ))}
        </select>
      </div>

      <FormRow label="Number of bands">
        <input
          style={{ ...inputStyle, width: 80 }}
          type="number"
          min={0}
          max={12}
          value={cfg.numberOfBands}
          onChange={e => onChange({ ...cfg, numberOfBands: Number(e.target.value) })}
        />
      </FormRow>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.hideValue}
            onChange={e => onChange({ ...cfg, hideValue: e.target.checked })}
          />
          Hide value
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cfg.autoFontColor}
            onChange={e => onChange({ ...cfg, autoFontColor: e.target.checked })}
          />
          Auto font color
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
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
      <FormRow label="Impact on">
        <ImpactChipList
          selected={cfg.impactOn}
          onChange={v => onChange({ ...cfg, impactOn: v as any })}
        />
      </FormRow>

      <FormRow label="Based on">
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
      </FormRow>

      <FormRow label="Display" align="start">
        <div>
          <select
            style={{ ...inputStyle, marginBottom: 6 }}
            value={cfg.displayIcons ? "icons" : "none"}
            onChange={e => onChange({ ...cfg, displayIcons: e.target.value === "icons" })}
          >
            <option value="icons">✓ ! ✕ Icon set</option>
            <option value="none">None</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer", marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={cfg.applyToCharts}
              onChange={e => onChange({ ...cfg, applyToCharts: e.target.checked })}
            />
            Apply to charts
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={cfg.showAsNewColumn}
              onChange={e => onChange({ ...cfg, showAsNewColumn: e.target.checked })}
            />
            Show as new column
          </label>
        </div>
      </FormRow>

      <FormRow label="Icon Position">
        <select
          style={inputStyle}
          value={cfg.iconPosition}
          onChange={e => onChange({ ...cfg, iconPosition: e.target.value as any })}
        >
          <option value="leftOfData">Left of data</option>
          <option value="rightOfData">Right of data</option>
        </select>
      </FormRow>

      {/* Classification ranges header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Classification ranges</div>
        <button
          type="button"
          title="Reset to defaults"
          onClick={() =>
            onChange({
              ...cfg,
              ranges: [
                { from: -Infinity, to: -10, iconKind: "cross", color: "#dc2626" },
                { from: -10, to: 10, iconKind: "warn", color: "#eab308" },
                { from: 10, to: Infinity, iconKind: "check", color: "#16a34a" },
              ],
            })
          }
          style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Value / Percentage radios */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 70px 42px 28px", columnGap: 6, alignItems: "center", fontSize: 11, color: "#374151", marginBottom: 6 }}>
        <div>From(&gt;=)</div>
        <div>To(&lt;=)</div>
        <div />
        <div />
        <div />
      </div>

      {cfg.ranges.map((r, i) => (
        <div
          key={i}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 70px 42px 28px", columnGap: 6, alignItems: "center", marginBottom: 6 }}
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
            style={{ width: "100%", height: 26, border: "1px solid #d1d5db", borderRadius: 4, padding: 0, background: "none", cursor: "pointer", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => removeRange(i)}
            style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Remove range"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRange}
        style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, padding: "6px 0", fontWeight: 500 }}
      >
        + Add range
      </button>
    </>
  );
};

// ---------- Data Bars Editor ---------------------------------------------------

const DataBarsEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["dataBarsConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["dataBarsConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  return (
    <>
      <FormRow label="Based on">
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
      </FormRow>

      <FormRow label="Axis position">
        <select
          style={inputStyle}
          value={cfg.axisPosition}
          onChange={e => onChange({ ...cfg, axisPosition: e.target.value as any })}
        >
          <option value="auto">Auto</option>
          <option value="middle">Middle</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </FormRow>

      <FormRow label="Positive color">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="color"
            value={cfg.positiveColor}
            onChange={e => onChange({ ...cfg, positiveColor: e.target.value })}
            style={{ width: 32, height: 26, padding: 0, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>{cfg.positiveColor}</span>
        </div>
      </FormRow>

      <FormRow label="Negative color">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="color"
            value={cfg.negativeColor}
            onChange={e => onChange({ ...cfg, negativeColor: e.target.value })}
            style={{ width: 32, height: 26, padding: 0, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>{cfg.negativeColor}</span>
        </div>
      </FormRow>

      <FormRow label="Bar direction">
        <select
          style={inputStyle}
          value={cfg.barDirection}
          onChange={e => onChange({ ...cfg, barDirection: e.target.value as any })}
        >
          <option value="leftToRight">Left to Right</option>
          <option value="rightToLeft">Right to Left</option>
        </select>
      </FormRow>

      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: "#374151", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={cfg.showBarOnly}
          onChange={e => onChange({ ...cfg, showBarOnly: e.target.checked })}
        />
        <span>Show bar only (hide value)</span>
      </label>
    </>
  );
};

// ---------- Ranking Editor ---------------------------------------------------

const RankingEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["rankingConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["rankingConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  const setStyle = (patch: Partial<typeof cfg.style>) => onChange({ ...cfg, style: { ...cfg.style, ...patch } });

  return (
    <>
      <SectionTitle>Apply to Top/Bottom</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Mode</div>
          <select
            style={inputStyle}
            value={cfg.mode}
            onChange={e => onChange({ ...cfg, mode: e.target.value as any })}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Count / %</div>
          <input
            type="number"
            style={inputStyle}
            value={cfg.topCount}
            onChange={e => onChange({ ...cfg, topCount: Number(e.target.value) })}
          />
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={cfg.usePercentage}
          onChange={e => onChange({ ...cfg, usePercentage: e.target.checked })}
        />
        <span>Use percentage instead of count</span>
      </label>

      <SectionTitle>Based on measure</SectionTitle>
      <select
        style={{ ...inputStyle, marginBottom: 16 }}
        value={cfg.basedOnMeasure}
        onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
      >
        <option value={-1}>Self</option>
        {measures.map(m => (
          <option key={m.index} value={m.index}>{m.name}</option>
        ))}
      </select>

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
        <StyleToggleButton
          label="U"
          active={cfg.style.textDecoration === "underline"}
          onClick={() => setStyle({ textDecoration: cfg.style.textDecoration === "underline" ? undefined : "underline" })}
        />
        <StyleToggleButton
          label="H"
          active={!!cfg.style.hatched}
          onClick={() => setStyle({ hatched: !cfg.style.hatched })}
          title="Hatched Pattern"
        />
        <input
          type="color"
          value={cfg.style.color || "#000000"}
          onChange={e => setStyle({ color: e.target.value })}
          title="Font Color"
          style={{ width: 28, height: 28, padding: 0, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
        />
        <div style={{ position: "relative" }}>
          <input
            type="color"
            value={cfg.style.backgroundColor || "#ffffff"}
            onChange={e => setStyle({ backgroundColor: e.target.value })}
            title="Background Color"
            style={{ width: 28, height: 28, padding: 0, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
          />
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 8, height: 8, background: "#ccc", border: "1px solid #fff" }} title="Background" />
        </div>
      </div>
    </>
  );
};

// ---------- Small shared components ------------------------------------------

const StyleToggleButton: React.FC<{
  label: string;
  active: boolean;
  italic?: boolean;
  onClick: () => void;
  title?: string;
}> = ({ label, active, italic, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
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
