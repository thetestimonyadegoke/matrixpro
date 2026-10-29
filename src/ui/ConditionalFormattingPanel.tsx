import React, { useState, useMemo, useCallback } from "react";
import { VisualSettings } from "../settings/settings";
import { MeasureInfo } from "../model/pivot";
import {
  CellStyle,
  ConditionalRule,
  RulesCondition,
  RuleOp,
  FormatBy,
  ClassificationRange,
  ClassificationIconKind,
  parseRules,
  normalizeRule,
  stringifyRules,
  defaultRule,
  COLOR_SCHEME_PRESETS,
  CLASSIFICATION_ICON_OPTIONS,
  CLASSIFICATION_ICON_SETS,
  ClassificationIcon,
} from "../format/conditional";
import { RenderClassificationIcon } from "./Cell";
import { Button, ColorWell, EmptyNote, IconButton, Overlay, Section, Segmented, Switch } from "./overlayKit";
import {
  IconBold,
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconCondFormat,
  IconGrip,
  IconItalic,
  IconPlus,
  IconTrash,
  IconUnderline,
} from "./icons";

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

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const FORMAT_BY_LABELS: Record<FormatBy, string> = {
  rules: "If conditions",
  colorScale: "Color scale",
  classification: "Classification",
  dataBars: "Data bars",
  ranking: "Ranking",
};

const TARGET_LABELS: Record<ConditionalRule["scope"]["targetType"], string> = {
  rows: "Values (cells)",
  columns: "Individual columns",
  rowHeaders: "Row headers",
  columnHeaders: "Column headers",
};

// ---------- Local glyphs (not in the shared icon set) ------------------------

const Glyph: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 14, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const GlyphEdit = () => (
  <Glyph><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Glyph>
);
const GlyphCopy = () => (
  <Glyph><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Glyph>
);
const GlyphRefresh = () => (
  <Glyph><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Glyph>
);
const GlyphUpload = () => (
  <Glyph><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Glyph>
);
const GlyphHatch = () => (
  <Glyph><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 14L14 4M10 20L20 10" /></Glyph>
);

// ---------- FormRow (label | control) ----------------------------------------
// Inline field row on the kit's field grid. `align="start"` keeps the label at
// the top for tall controls and stacks the control's children.
const FormRow: React.FC<{ label: string; children: React.ReactNode; align?: "center" | "start" }> = ({
  label,
  children,
  align = "center",
}) => (
  <div className="mx-field is-inline" style={align === "start" ? { alignItems: "start" } : undefined}>
    <span className="mx-field-label" style={align === "start" ? { paddingTop: 7 } : undefined}>{label}</span>
    <div
      className="mx-field-control"
      style={align === "start" ? { flexDirection: "column", alignItems: "stretch" } : undefined}
    >
      {children}
    </div>
  </div>
);

const MeasureOptions: React.FC<{ measures: MeasureInfo[] }> = ({ measures }) => (
  <>
    <option value={-1}>Self</option>
    {measures.map(m => (
      <option key={m.index} value={m.index}>{m.name}</option>
    ))}
  </>
);

const RECOMMENDED_ICON_KINDS: ClassificationIconKind[] = [
  "check", "cross", "flat", "upRight", "downRight", "chevronLeft", "chevronRight",
  "triangleDown", "triangleUp", "up", "down", "triangleUp", "triangleDown",
  "caretUp", "caretDown", "doubleUp", "doubleDown", "flagFilled", "flagOutline",
  "outlineSquare", "filledSquare", "quarterCircle", "halfCircle", "pie", "emptyCircle",
  "quarterFilledCircle", "halfFilledCircle", "threeQuarterCircle", "filledCircle",
  "diamond", "heart", "bulb", "warn", "info", "bold", "underline", "italic",
  "checkCircle", "crossCircle", "starOutline", "starHalf", "starFilled",
];

// Selected-state for an icon tile (the kit has no toggle tile).
const selectedTileStyle: React.CSSProperties = {
  background: "var(--mx-accent-10)",
  color: "var(--mx-accent)",
  boxShadow: "inset 0 0 0 1px var(--mx-accent)",
};

const IconPicker: React.FC<{
  value?: ClassificationIcon;
  color: string;
  onChange: (icon: ClassificationIcon | undefined) => void;
}> = ({ value, color, onChange }) => {
  const [showMore, setShowMore] = useState(false);
  const selectedKind = value && value.kind !== "custom" && value.kind !== "text" ? value.kind : "";
  const safeColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color || "") ? color : "#2563eb";
  const visibleIcons = showMore
    ? CLASSIFICATION_ICON_OPTIONS.map(option => option.kind)
    : RECOMMENDED_ICON_KINDS;

  const uploadIcon = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) onChange({ kind: "custom", src: result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="mx-stack is-tight"
      style={{ padding: 8, border: "1px solid var(--mx-ov-line)", borderRadius: 8 }}
    >
      <div className="mx-row is-between">
        <span className="mx-muted" style={{ fontSize: 11.5 }}>{showMore ? "All icons" : "Recommended"}</span>
        <label className="mx-btn is-ghost is-sm" style={{ cursor: "pointer" }}>
          <span className="mx-btn-icon"><GlyphUpload /></span>
          Upload
          <input
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={e => uploadIcon(e.target.files?.[0])}
          />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 26px)", gap: 4 }}>
        {visibleIcons.map((kind, index) => {
          const selected = selectedKind === kind;
          const label = CLASSIFICATION_ICON_OPTIONS.find(option => option.kind === kind)?.label ?? kind;
          return (
            <button
              key={`${kind}-${index}`}
              type="button"
              className="mx-icon-btn"
              title={label}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onChange({ kind, color: safeColor })}
              style={selected ? selectedTileStyle : undefined}
            >
              <RenderClassificationIcon icon={{ kind, color: "currentColor" }} size={18} />
            </button>
          );
        })}
      </div>
      {value?.kind === "custom" && (
        <div className="mx-note mx-row">
          <RenderClassificationIcon icon={value} size={20} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value.name || "Custom icon"}
          </span>
          <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>
        </div>
      )}
      <div>
        <Button
          size="sm"
          variant="ghost"
          icon={showMore ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? "Fewer icons" : "More icons"}
        </Button>
      </div>
    </div>
  );
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
    if (initialDraft) return normalizeRule(JSON.parse(JSON.stringify(initialDraft)));
    if (initialRuleId === "new") return defaultRule(`Rule ${initialRules.length + 1}`);
    if (initialRuleId && initialRuleId !== "new") {
      const found = initialRules.find(r => r.id === initialRuleId);
      return found ? normalizeRule(JSON.parse(JSON.stringify(found))) : null;
    }
    return null;
  });
  const [confirmRequest, setConfirmRequest] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmRequest({ title, message, onConfirm });
  }, []);

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
    setDraft(normalizeRule(JSON.parse(JSON.stringify(rule))));
    setEditingId(rule.id);
    setView("edit");
  };

  const deleteRule = (id: string) => {
    requestConfirm(
      "Delete formatting rule?",
      "This conditional formatting rule will be permanently removed.",
      () => persistRules(rules.filter(r => r.id !== id))
    );
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
    const normalizedDraft = normalizeRule(draft);
    const existingIdx = rules.findIndex(r => r.id === normalizedDraft.id);
    let next: ConditionalRule[];
    if (existingIdx >= 0) {
      next = rules.slice();
      next[existingIdx] = normalizedDraft;
    } else {
      next = [...rules, normalizedDraft];
    }
    persistRules(next);
    setView("list");
    setDraft(null);
    setEditingId(null);
  };

  const goBack = () => { setView("list"); setDraft(null); setEditingId(null); };

  const isEdit = view === "edit";

  return (
    <Overlay
      kind="dialog"
      title={isEdit ? (editingId ? "Edit rule" : "New rule") : "Conditional formatting"}
      subtitle={isEdit ? undefined : "Rules apply from top to bottom. Drag to reorder."}
      width={isEdit ? 560 : 480}
      onClose={onClose}
      footer={isEdit ? (
        <>
          <Button onClick={goBack}>Back</Button>
          <Button variant="primary" onClick={applyDraft}>Apply</Button>
        </>
      ) : undefined}
    >
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
            requestConfirm={requestConfirm}
          />
        )
      )}

      {confirmRequest && (
        <Overlay
          kind="dialog"
          title={confirmRequest.title}
          width={360}
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
                Delete
              </Button>
            </>
          }
        >
          <p className="mx-muted" style={{ margin: 0, lineHeight: 1.5 }}>{confirmRequest.message}</p>
        </Overlay>
      )}
    </Overlay>
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
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setOverId(null);
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

  if (rules.length === 0) {
    return (
      <EmptyNote
        icon={<IconCondFormat size={20} />}
        title="No formatting rules"
        hint="Add a rule to color, flag or rank cells by their values."
        action={<Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={onCreate}>Add rule</Button>}
      />
    );
  }

  return (
    <div className="mx-stack is-tight">
      <ol className="mx-list">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cx(
              "mx-item",
              draggedId === rule.id && "is-dragging",
              overId === rule.id && draggedId !== rule.id && "is-drop-target",
            )}
            draggable
            onDragStart={e => handleDragStart(e, rule.id)}
            onDragOver={e => { e.preventDefault(); if (overId !== rule.id) setOverId(rule.id); }}
            onDrop={e => handleDrop(e, rule.id)}
            onDragEnd={() => { setDraggedId(null); setOverId(null); }}
          >
            <span className="mx-item-grip" aria-hidden="true"><IconGrip size={14} /></span>
            <div className="mx-item-main" style={rule.enabled ? undefined : { opacity: 0.55 }}>
              <span className="mx-item-title">{rule.title}</span>
              <span className="mx-item-meta">
                {FORMAT_BY_LABELS[rule.formatBy] ?? rule.formatBy} · {TARGET_LABELS[rule.scope.targetType] ?? rule.scope.targetType}
              </span>
            </div>
            <div className="mx-item-actions">
              <span title={rule.enabled ? "Disable" : "Enable"} style={{ marginRight: 4 }}>
                <Switch checked={rule.enabled} onChange={() => onToggle(rule.id)} />
              </span>
              <IconButton label="Edit" icon={<GlyphEdit />} onClick={() => onEdit(rule)} />
              <IconButton label="Duplicate" icon={<GlyphCopy />} onClick={() => onDuplicate(rule)} />
              <IconButton label="Delete" tone="danger" icon={<IconTrash size={14} />} onClick={() => onDelete(rule.id)} />
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={onCreate}>Add rule</Button>
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
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}> = ({ draft, setDraft, measures, requestConfirm }) => {
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
        showValueText: true,
        iconSet: "target-status",
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
    <div className="mx-stack" style={{ gap: 20 }}>
      <Section>
        <FormRow label="Title">
          <input
            className="mx-input"
            value={draft.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Rule name"
          />
        </FormRow>

        <FormRow label="Apply to" align="start">
          <MultiMeasureSelect
            measures={measures}
            selectedIndices={draft.scope.targetMeasures || (draft.scope.targetMeasure !== undefined ? [draft.scope.targetMeasure] : [-1])}
            onChange={next => {
              const final = next.length === 0 ? [-1] : next;
              updateScope({ targetMeasure: final[0], targetMeasures: final });
            }}
          />
        </FormRow>

        <FormRow label="Target">
          <select
            className="mx-select"
            value={draft.scope.targetType}
            onChange={e => updateScope({ targetType: e.target.value as any })}
          >
            <option value="rows">{TARGET_LABELS.rows}</option>
            <option value="columns">{TARGET_LABELS.columns}</option>
            <option value="rowHeaders">{TARGET_LABELS.rowHeaders}</option>
            <option value="columnHeaders">{TARGET_LABELS.columnHeaders}</option>
          </select>
        </FormRow>

        <FormRow label="Row levels">
          <Segmented
            size="sm"
            ariaLabel="Row hierarchy levels"
            value={draft.scope.rowHierarchyLevels}
            onChange={v => updateScope({ rowHierarchyLevels: v })}
            options={[
              { value: "valuesOnly", label: "Values", title: "Values only" },
              { value: "totalsOnly", label: "Totals", title: "Totals only" },
              { value: "valuesAndTotals", label: "Both", title: "Values and totals" },
            ]}
          />
        </FormRow>

        <Switch
          label="Exclude column grand total"
          checked={!!draft.scope.excludeColumnGrandTotal}
          onChange={checked => updateScope({ excludeColumnGrandTotal: checked })}
        />
      </Section>

      <hr className="mx-divider" />

      <Section>
        <FormRow label="Format by">
          <select
            className="mx-select"
            value={draft.formatBy}
            onChange={e => switchFormatBy(e.target.value as FormatBy)}
          >
            <option value="rules">{FORMAT_BY_LABELS.rules}</option>
            <option value="colorScale">{FORMAT_BY_LABELS.colorScale}</option>
            <option value="classification">{FORMAT_BY_LABELS.classification}</option>
            <option value="dataBars">{FORMAT_BY_LABELS.dataBars}</option>
            <option value="ranking">{FORMAT_BY_LABELS.ranking}</option>
          </select>
        </FormRow>

        {/* Sub-editor */}
        {draft.formatBy === "rules" && draft.rulesConfig && (
          <RulesConfigEditor
            cfg={draft.rulesConfig}
            onChange={c => update({ rulesConfig: c })}
            measures={measures}
            requestConfirm={requestConfirm}
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
            requestConfirm={requestConfirm}
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
      </Section>
    </div>
  );
};

// ---------- Rules (If conditions) editor -------------------------------------

const RulesConfigEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["rulesConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["rulesConfig"]>) => void;
  measures: MeasureInfo[];
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}> = ({ cfg, onChange, measures, requestConfirm }) => {
  const safeStyle = cfg.style ?? { color: "#111827" };
  const safeImpactOn = Array.isArray(cfg.impactOn) ? cfg.impactOn : ["label"];
  const safeConditions = Array.isArray(cfg.conditions) ? cfg.conditions : [];
  const setStyle = (patch: Partial<typeof safeStyle>) => onChange({ ...cfg, style: { ...safeStyle, ...patch } });
  const setConditions = (next: RulesCondition[]) => onChange({ ...cfg, conditions: next });
  const impactsLabel = safeImpactOn.includes("label");
  const impactsChart = safeImpactOn.includes("chart");
  const iconColor = safeStyle.icon && safeStyle.icon.kind !== "custom" && safeStyle.icon.kind !== "text"
    ? safeStyle.icon.color
    : (safeStyle.color || "#2563eb");

  return (
    <>
      <FormRow label="Impact on">
        <ImpactChipList
          selected={safeImpactOn}
          onChange={v => onChange({ ...cfg, impactOn: v as any })}
        />
      </FormRow>

      <FormRow label="Text style">
        <TextStyleToggles style={safeStyle} setStyle={setStyle} />
      </FormRow>

      <FormRow label="Text color">
        <ColorWell
          label="Text color"
          value={safeStyle.color || "#111827"}
          onChange={c => setStyle({ color: c })}
        />
        <span className="mx-muted" style={{ fontSize: 11.5 }}>
          {impactsLabel ? "Applied to matching cell text." : "Add Label under Impact on to apply text formatting."}
        </span>
      </FormRow>

      <FormRow label="Background">
        <ColorWell
          label="Background color"
          value={safeStyle.backgroundColor || "#ffffff"}
          onChange={c => setStyle({ backgroundColor: c })}
        />
        <span className="mx-muted" style={{ fontSize: 11.5 }}>
          {impactsChart
            ? "Applied to matching cell background."
            : "Applied to matching cells when a fill is defined."}
        </span>
      </FormRow>

      <FormRow label="Icon" align="start">
        <IconPicker
          value={safeStyle.icon}
          color={iconColor}
          onChange={icon => setStyle({ icon })}
        />
        <div className="mx-row">
          <Segmented
            size="sm"
            ariaLabel="Icon position"
            value={safeStyle.iconPosition ?? "leftOfData"}
            onChange={v => setStyle({ iconPosition: v })}
            options={[
              { value: "leftOfData", label: "Left edge", title: "Dock to left edge" },
              { value: "rightOfData", label: "Right edge", title: "Dock to right edge" },
            ]}
          />
          <ColorWell
            label="Icon color"
            value={iconColor}
            onChange={c => {
              const current = safeStyle.icon && safeStyle.icon.kind !== "custom" && safeStyle.icon.kind !== "text" ? safeStyle.icon.kind : "check";
              setStyle({ icon: { kind: current, color: c } });
            }}
          />
        </div>
      </FormRow>

      <Switch
        label="Display text"
        checked={!safeStyle.hideText}
        onChange={checked => setStyle({ hideText: !checked })}
      />

      <FormRow label="Border">
        <select
          className="mx-select"
          style={{ flex: 1 }}
          value={safeStyle.borderStyle ?? "none"}
          onChange={e => setStyle({ borderStyle: e.target.value as any })}
        >
          <option value="none">No border</option>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
        </select>
        <input
          type="number"
          min={1}
          max={6}
          className="mx-input is-num"
          style={{ width: 56, flexShrink: 0 }}
          value={safeStyle.borderWidth ?? 1}
          onChange={e => setStyle({ borderWidth: Math.max(1, Number(e.target.value) || 1) })}
          title="Border width"
          aria-label="Border width"
        />
        <ColorWell
          label="Border color"
          value={safeStyle.borderColor || "#d1d5db"}
          onChange={c => setStyle({ borderColor: c })}
        />
      </FormRow>

      <Section title="Conditions">
        {safeConditions.length > 0 && (
          <div className="mx-stack is-tight">
            {safeConditions.map((cond, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr) 128px 80px 26px",
                  columnGap: 6,
                  alignItems: "center",
                }}
              >
                <span className="mx-field-label">{i === 0 ? "If" : "And"}</span>
                <select
                  className="mx-select is-sm"
                  aria-label={`Condition ${i + 1} measure`}
                  value={cond.basedOnMeasure}
                  onChange={e => {
                    const next = safeConditions.slice();
                    next[i] = { ...cond, basedOnMeasure: Number(e.target.value) };
                    setConditions(next);
                  }}
                >
                  <MeasureOptions measures={measures} />
                </select>
                <select
                  className="mx-select is-sm"
                  aria-label={`Condition ${i + 1} operator`}
                  value={cond.op}
                  onChange={e => {
                    const next = safeConditions.slice();
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
                  className="mx-input is-sm is-num"
                  type="number"
                  aria-label={`Condition ${i + 1} value`}
                  value={cond.value}
                  onChange={e => {
                    const next = safeConditions.slice();
                    next[i] = { ...cond, value: Number(e.target.value) };
                    setConditions(next);
                  }}
                />
                <IconButton
                  label="Remove condition"
                  tone="danger"
                  icon={<IconClose size={12} />}
                  onClick={() => {
                    requestConfirm(
                      "Remove condition?",
                      "This condition will be removed from the formatting rule.",
                      () => setConditions(safeConditions.filter((_, idx) => idx !== i))
                    );
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPlus size={14} />}
            onClick={() =>
              setConditions([
                ...safeConditions,
                { basedOnMeasure: -1, op: "greaterThan", value: 0 },
              ])
            }
          >
            Add condition
          </Button>
        </div>
      </Section>
    </>
  );
};

// ---------- Removable chips (shared by measure + impact pickers) -------------

const Chip: React.FC<{ label: string; onRemove?: () => void }> = ({ label, onRemove }) => (
  <span className="mx-badge" style={{ gap: 2, paddingRight: onRemove ? 2 : 7, height: 22 }}>
    {label}
    {onRemove && <button
      type="button"
      className="mx-icon-btn"
      style={{ width: 18, height: 18 }}
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
      onClick={onRemove}
    >
      <IconClose size={10} />
    </button>}
  </span>
);

const MultiMeasureSelect: React.FC<{
  measures: MeasureInfo[];
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
}> = ({ measures, selectedIndices, onChange }) => {
  const isAll = selectedIndices.includes(-1) || selectedIndices.length === 0;
  const selectedMeasures = isAll ? [] : measures.filter(m => selectedIndices.includes(m.index));
  // In the "all" state the picker lists every measure, so choosing one narrows the rule to it.
  const remaining = isAll ? measures : measures.filter(m => !selectedIndices.includes(m.index));

  return (
    <div className="mx-row is-wrap" style={{ gap: 6 }}>
      {isAll ? (
        <Chip label="All measures" />
      ) : (
        selectedMeasures.map(m => (
          <Chip key={m.index} label={m.name} onRemove={() => onChange(selectedIndices.filter(i => i !== m.index))} />
        ))
      )}
      {remaining.length > 0 && (
        <select
          className="mx-select is-sm"
          style={{ width: "auto", flex: "1 1 120px" }}
          aria-label="Add measure"
          value=""
          onChange={e => {
            const val = Number(e.target.value);
            if (isNaN(val)) return;
            if (val === -1) onChange([-1]);
            else {
              const next = [...selectedIndices.filter(i => i !== -1), val];
              onChange(next);
            }
          }}
        >
          <option value="" disabled>{isAll ? "Limit to…" : "Add measure…"}</option>
          {!isAll && <option value="-1">All measures</option>}
          {remaining.map(m => (
            <option key={m.index} value={m.index}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  );
};


// ---------- Impact chip list (removable chips) -------------------------------
const ImpactChipList: React.FC<{
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ selected, onChange }) => {
  const allOptions: { value: string; label: string }[] = [
    { value: "label", label: "Label" },
    { value: "chart", label: "Chart" },
  ];
  const remaining = allOptions.filter(o => !selected.includes(o.value));
  return (
    <div className="mx-row is-wrap" style={{ gap: 6, flex: 1 }}>
      {selected.map(v => {
        const opt = allOptions.find(o => o.value === v);
        if (!opt) return null;
        return <Chip key={v} label={opt.label} onRemove={() => onChange(selected.filter(x => x !== v))} />;
      })}
      {remaining.length > 0 && (
        <select
          className="mx-select is-sm"
          style={{ width: "auto", flex: "1 1 100px" }}
          aria-label="Add impact target"
          value=""
          onChange={e => e.target.value && onChange([...selected, e.target.value])}
        >
          <option value="">Add…</option>
          {remaining.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );
};

// ---------- Color scale editor -----------------------------------------------

const ColorScaleEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["colorScaleConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["colorScaleConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  const shownScheme = cfg.reverse ? [...cfg.colorScheme].reverse() : cfg.colorScheme;
  return (
    <>
      <FormRow label="Based on">
        <select
          className="mx-select"
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <MeasureOptions measures={measures} />
        </select>
      </FormRow>

      <FormRow label="Color">
        <Segmented
          size="sm"
          ariaLabel="Color scale for"
          value={cfg.applyTo}
          onChange={v => onChange({ ...cfg, applyTo: v })}
          options={[
            { value: "background", label: "Fill", title: "Background" },
            { value: "foreground", label: "Text", title: "Foreground" },
            { value: "both", label: "Both" },
            { value: "dataBar", label: "Data bar" },
          ]}
        />
      </FormRow>

      <FormRow label="Heat map">
        <Segmented
          size="sm"
          ariaLabel="Heat map type"
          value={cfg.heatMapType}
          onChange={v => onChange({ ...cfg, heatMapType: v })}
          options={[
            { value: "columnWise", label: "By column", title: "Column wise" },
            { value: "rowWise", label: "By row", title: "Row wise" },
            { value: "tableWise", label: "Whole table", title: "Table wise" },
          ]}
        />
      </FormRow>

      <FormRow label="Scale type">
        <Segmented
          size="sm"
          ariaLabel="Color scale type"
          value={cfg.scaleType}
          onChange={v => onChange({ ...cfg, scaleType: v })}
          options={[
            { value: "sequential", label: "Sequential" },
            { value: "diverging", label: "Diverging" },
          ]}
        />
      </FormRow>

      <FormRow label="Color scheme" align="start">
        <span
          aria-hidden="true"
          style={{ display: "block", height: 14, borderRadius: 4, background: `linear-gradient(to right, ${shownScheme.join(", ")})` }}
        />
        <select
          className="mx-select"
          aria-label="Color scheme"
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
        <Switch
          label="Reverse colors"
          checked={cfg.reverse}
          onChange={checked => onChange({ ...cfg, reverse: checked })}
        />
      </FormRow>

      <FormRow label="Number of bands">
        <input
          className="mx-input is-num"
          style={{ width: 80 }}
          type="number"
          min={0}
          max={12}
          value={cfg.numberOfBands}
          onChange={e => onChange({ ...cfg, numberOfBands: Number(e.target.value) })}
        />
      </FormRow>

      <div className="mx-stack is-tight">
        <Switch label="Hide value" checked={cfg.hideValue} onChange={checked => onChange({ ...cfg, hideValue: checked })} />
        <Switch label="Auto font color" checked={cfg.autoFontColor} onChange={checked => onChange({ ...cfg, autoFontColor: checked })} />
        <Switch label="Include null values" checked={cfg.includeNull} onChange={checked => onChange({ ...cfg, includeNull: checked })} />
      </div>
    </>
  );
};

function findSchemeId(colors: string[]): string {
  const match = COLOR_SCHEME_PRESETS.find(p => p.colors.length === colors.length && p.colors.every((c, i) => c === colors[i]));
  return match ? match.id : COLOR_SCHEME_PRESETS[0].id;
}

// ---------- Classification editor --------------------------------------------

const DEFAULT_RANGES: ClassificationRange[] = [
  { from: -Infinity, to: -10, iconKind: "cross", color: "#dc2626" },
  { from: -10, to: 10, iconKind: "warn", color: "#eab308" },
  { from: 10, to: Infinity, iconKind: "check", color: "#16a34a" },
];

const iconOptionLabel = (kind: ClassificationIconKind) =>
  CLASSIFICATION_ICON_OPTIONS.find(option => option.kind === kind)?.label ?? kind;

const ClassificationEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["classificationConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["classificationConfig"]>) => void;
  measures: MeasureInfo[];
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}> = ({ cfg, onChange, measures, requestConfirm }) => {
  const safeRanges = Array.isArray(cfg.ranges) ? cfg.ranges.filter(Boolean) : [];
  const safeImpactOn = Array.isArray(cfg.impactOn) ? cfg.impactOn : ["label"];
  const setRange = (i: number, patch: Partial<ClassificationRange>) => {
    const next = safeRanges.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...cfg, ranges: next });
  };
  const removeRange = (i: number) => {
    requestConfirm(
      "Remove classification range?",
      "This classification range will be removed from the rule.",
      () => onChange({ ...cfg, ranges: safeRanges.filter((_, idx) => idx !== i) })
    );
  };
  const addRange = () =>
    onChange({
      ...cfg,
      ranges: [...safeRanges, { from: 0, to: 100, iconKind: "check", color: "#16a34a" }],
    });
  const applyIconSet = (setId: string) => {
    const iconSet = CLASSIFICATION_ICON_SETS.find(set => set.id === setId);
    if (!iconSet) return;
    onChange({
      ...cfg,
      iconSet: setId,
      ranges: safeRanges.map((range, index) => ({
        ...range,
        icon: undefined as ClassificationIcon | undefined,
        iconKind: iconSet.icons[Math.min(index, iconSet.icons.length - 1)],
      })),
    });
  };

  const rangeGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 120px 30px 26px",
    columnGap: 6,
    alignItems: "center",
  };

  return (
    <>
      <FormRow label="Impact on">
        <ImpactChipList
          selected={safeImpactOn}
          onChange={v => onChange({ ...cfg, impactOn: v as any })}
        />
      </FormRow>

      <FormRow label="Based on">
        <select
          className="mx-select"
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <MeasureOptions measures={measures} />
        </select>
      </FormRow>

      <FormRow label="Display" align="start">
        <Segmented
          size="sm"
          ariaLabel="Display icons"
          value={cfg.displayIcons ? "icons" : "none"}
          onChange={v => onChange({ ...cfg, displayIcons: v === "icons" })}
          options={[
            { value: "icons", label: "Icon set" },
            { value: "none", label: "None" },
          ]}
        />
        <select
          className="mx-select"
          aria-label="Icon set"
          value={cfg.iconSet ?? "target-status"}
          onChange={e => applyIconSet(e.target.value)}
          disabled={!cfg.displayIcons}
        >
          {CLASSIFICATION_ICON_SETS.map(set => (
            <option key={set.id} value={set.id}>{set.name}</option>
          ))}
        </select>
      </FormRow>

      <FormRow label="Icon position">
        <Segmented
          size="sm"
          ariaLabel="Icon position"
          value={cfg.iconPosition}
          onChange={v => onChange({ ...cfg, iconPosition: v })}
          options={[
            { value: "leftOfData", label: "Left of data" },
            { value: "rightOfData", label: "Right of data" },
          ]}
        />
      </FormRow>

      <div className="mx-stack is-tight">
        <Switch label="Apply to charts" checked={cfg.applyToCharts} onChange={checked => onChange({ ...cfg, applyToCharts: checked })} />
        <Switch label="Show as new column" checked={cfg.showAsNewColumn} onChange={checked => onChange({ ...cfg, showAsNewColumn: checked })} />
        <Switch label="Display text" checked={cfg.showValueText !== false} onChange={checked => onChange({ ...cfg, showValueText: checked })} />
      </div>

      <Section
        title="Classification ranges"
        actions={
          <IconButton
            label="Reset to defaults"
            icon={<GlyphRefresh />}
            onClick={() => onChange({ ...cfg, ranges: DEFAULT_RANGES.map(r => ({ ...r })) })}
          />
        }
      >
        <Segmented
          size="sm"
          ariaLabel="Range mode"
          value={cfg.rangeMode}
          onChange={v => onChange({ ...cfg, rangeMode: v })}
          options={[
            { value: "value", label: "Value" },
            { value: "percentage", label: "Percentage" },
          ]}
        />

        {safeRanges.length > 0 && (
          <div style={{ ...rangeGrid, paddingLeft: 11, paddingRight: 7 }} className="mx-muted">
            <span style={{ fontSize: 11 }}>From (≥)</span>
            <span style={{ fontSize: 11 }}>To (≤)</span>
            <span style={{ fontSize: 11 }}>Icon</span>
            <span />
            <span />
          </div>
        )}

        <ol className="mx-list">
          {safeRanges.map((r, i) => {
            const safeColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(r.color || "") ? r.color : "#16a34a";
            const safeIconKind = CLASSIFICATION_ICON_OPTIONS.some(option => option.kind === r.iconKind) ? r.iconKind : "check";
            const safeIcon = r.icon ?? { kind: safeIconKind, color: safeColor };
            return (
              <li key={i} className="mx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={rangeGrid}>
                  <input
                    className="mx-input is-sm is-num"
                    type="number"
                    aria-label={`Range ${i + 1} from`}
                    placeholder="Min"
                    value={Number.isFinite(r.from) ? r.from : ""}
                    onChange={e => setRange(i, { from: e.target.value === "" ? -Infinity : Number(e.target.value) })}
                  />
                  <input
                    className="mx-input is-sm is-num"
                    type="number"
                    aria-label={`Range ${i + 1} to`}
                    placeholder="Max"
                    value={Number.isFinite(r.to) ? r.to : ""}
                    onChange={e => setRange(i, { to: e.target.value === "" ? Infinity : Number(e.target.value) })}
                  />
                  <select
                    className="mx-select is-sm"
                    aria-label={`Range ${i + 1} icon`}
                    value={safeIconKind}
                    onChange={e => setRange(i, { iconKind: e.target.value as any })}
                  >
                    <option value="check">{iconOptionLabel("check")}</option>
                    <option value="warn">{iconOptionLabel("warn")}</option>
                    {CLASSIFICATION_ICON_OPTIONS
                      .filter(option => !["check", "warn", "cross"].includes(option.kind))
                      .map(option => (
                        <option key={option.kind} value={option.kind}>{option.label}</option>
                      ))}
                    <option value="cross">{iconOptionLabel("cross")}</option>
                  </select>
                  <ColorWell
                    label={`Range ${i + 1} color`}
                    value={safeColor}
                    onChange={c => {
                      const nextIcon = r.icon && r.icon.kind !== "custom" && r.icon.kind !== "text"
                        ? { ...r.icon, color: c }
                        : r.icon;
                      setRange(i, { color: c, icon: nextIcon });
                    }}
                  />
                  <IconButton label="Remove range" tone="danger" icon={<IconTrash size={14} />} onClick={() => removeRange(i)} />
                </div>
                <IconPicker
                  value={safeIcon}
                  color={safeColor}
                  onChange={icon => {
                    if (!icon) {
                      setRange(i, { icon: undefined });
                      return;
                    }
                    setRange(i, {
                      icon,
                      iconKind: icon.kind !== "custom" && icon.kind !== "text" ? icon.kind : safeIconKind,
                    });
                  }}
                />
              </li>
            );
          })}
        </ol>
        <div>
          <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={addRange}>Add range</Button>
        </div>
      </Section>
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
          className="mx-select"
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <MeasureOptions measures={measures} />
        </select>
      </FormRow>

      <FormRow label="Axis position">
        <Segmented
          size="sm"
          ariaLabel="Axis position"
          value={cfg.axisPosition}
          onChange={v => onChange({ ...cfg, axisPosition: v })}
          options={[
            { value: "auto", label: "Auto" },
            { value: "middle", label: "Middle" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
      </FormRow>

      <FormRow label="Positive color">
        <ColorWell label="Positive color" value={cfg.positiveColor} onChange={c => onChange({ ...cfg, positiveColor: c })} />
        <span className="mx-muted mx-num" style={{ fontSize: 11.5 }}>{cfg.positiveColor}</span>
      </FormRow>

      <FormRow label="Negative color">
        <ColorWell label="Negative color" value={cfg.negativeColor} onChange={c => onChange({ ...cfg, negativeColor: c })} />
        <span className="mx-muted mx-num" style={{ fontSize: 11.5 }}>{cfg.negativeColor}</span>
      </FormRow>

      <FormRow label="Bar direction">
        <Segmented
          size="sm"
          ariaLabel="Bar direction"
          value={cfg.barDirection}
          onChange={v => onChange({ ...cfg, barDirection: v })}
          options={[
            { value: "leftToRight", label: "Left to right" },
            { value: "rightToLeft", label: "Right to left" },
          ]}
        />
      </FormRow>

      <Switch
        label="Show bar only"
        hint="Hide the value and keep the bar."
        checked={cfg.showBarOnly}
        onChange={checked => onChange({ ...cfg, showBarOnly: checked })}
      />
    </>
  );
};

// ---------- Ranking Editor ---------------------------------------------------

const RankingEditor: React.FC<{
  cfg: NonNullable<ConditionalRule["rankingConfig"]>;
  onChange: (c: NonNullable<ConditionalRule["rankingConfig"]>) => void;
  measures: MeasureInfo[];
}> = ({ cfg, onChange, measures }) => {
  const safeStyle = cfg.style ?? { color: "#1d4ed8", fontWeight: "600" };
  const setStyle = (patch: Partial<typeof safeStyle>) => onChange({ ...cfg, style: { ...safeStyle, ...patch } });

  return (
    <>
      <FormRow label="Highlight">
        <Segmented
          size="sm"
          ariaLabel="Ranking mode"
          value={cfg.mode}
          onChange={v => onChange({ ...cfg, mode: v })}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
            { value: "both", label: "Both" },
          ]}
        />
      </FormRow>

      <FormRow label={cfg.usePercentage ? "Percent" : "Count"}>
        <input
          type="number"
          className="mx-input is-num"
          style={{ width: 80 }}
          value={cfg.topCount}
          onChange={e => onChange({ ...cfg, topCount: Number(e.target.value) })}
        />
      </FormRow>

      <Switch
        label="Use percentage instead of count"
        checked={cfg.usePercentage}
        onChange={checked => onChange({ ...cfg, usePercentage: checked })}
      />

      <FormRow label="Based on">
        <select
          className="mx-select"
          value={cfg.basedOnMeasure}
          onChange={e => onChange({ ...cfg, basedOnMeasure: Number(e.target.value) })}
        >
          <MeasureOptions measures={measures} />
        </select>
      </FormRow>

      <FormRow label="Style">
        <TextStyleToggles style={safeStyle} setStyle={setStyle} />
        <ColorWell label="Font color" value={safeStyle.color || "#000000"} onChange={c => setStyle({ color: c })} />
        <ColorWell label="Background color" value={safeStyle.backgroundColor || "#ffffff"} onChange={c => setStyle({ backgroundColor: c })} />
      </FormRow>
    </>
  );
};

// ---------- Small shared components ------------------------------------------

/** Bold / italic / underline / hatched toggles, composed on the segmented track. */
const TextStyleToggles: React.FC<{
  style: CellStyle;
  setStyle: (patch: Partial<CellStyle>) => void;
}> = ({ style, setStyle }) => (
  <div className="mx-seg" role="group" aria-label="Text style">
    <StyleToggleButton
      label="Bold"
      icon={<IconBold size={14} />}
      active={style.fontWeight === "600" || style.fontWeight === "700"}
      onClick={() => setStyle({ fontWeight: style.fontWeight === "600" || style.fontWeight === "700" ? "normal" : "600" })}
    />
    <StyleToggleButton
      label="Italic"
      icon={<IconItalic size={14} />}
      active={style.fontStyle === "italic"}
      onClick={() => setStyle({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })}
    />
    <StyleToggleButton
      label="Underline"
      icon={<IconUnderline size={14} />}
      active={style.textDecoration === "underline"}
      onClick={() => setStyle({ textDecoration: style.textDecoration === "underline" ? "none" : "underline" })}
    />
    <StyleToggleButton
      label="Hatched pattern"
      icon={<GlyphHatch />}
      active={!!style.hatched}
      onClick={() => setStyle({ hatched: !style.hatched })}
    />
  </div>
);

const StyleToggleButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ label, icon, active, onClick }) => (
  <button
    type="button"
    className={cx("mx-seg-item", active && "is-on")}
    style={{ padding: "0 7px" }}
    aria-pressed={active}
    aria-label={label}
    title={label}
    onClick={onClick}
  >
    {icon}
  </button>
);
