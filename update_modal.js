import fs from 'fs';

const filePath = 'src/ui/ManageColumnsPanel.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace the `ui` object and shared styles
const uiAndStylesReplacement = `
const ui = {
  bg: "#ffffff",
  surface: "#fafafa",
  surfaceHover: "#f4f4f5",
  surfaceActive: "#e4e4e7",
  border: "#e4e4e7",
  borderStrong: "#d4d4d8",
  text: "#09090b",
  textMuted: "#71717a",
  accent: "#000000",
  accentStrong: "#000000",
  accentSoft: "#f4f4f5",
  accentWash: "#fafafa",
  danger: "#ef4444",
  dangerSoft: "#fef2f2",
  shadow: "0 24px 48px -12px rgba(0,0,0,0.15)",
  shadowSoft: "0 2px 8px -2px rgba(0,0,0,0.05)",
  shadowHover: "0 8px 16px -4px rgba(0,0,0,0.08)",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--mx-font-family, 'Inter', sans-serif)",
  animation: "matrix-fade-in 0.2s ease-out",
  padding: 24,
};

const modal: React.CSSProperties = {
  width: "min(900px, 100%)",
  height: "min(680px, 100%)",
  background: ui.bg,
  borderRadius: 16,
  boxShadow: ui.shadow,
  display: "flex",
  flexDirection: "row",
  border: \`1px solid \${ui.border}\`,
  overflow: "hidden",
  animation: "matrix-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
};

const sidebar: React.CSSProperties = {
  width: 220,
  borderRight: \`1px solid \${ui.border}\`,
  background: ui.surface,
  display: "flex", flexDirection: "column", minHeight: 0,
  padding: "20px 12px",
};

const content: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
  background: ui.bg,
};

const actionBtn: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
};

const Toggle = ({ checked, onChange, title }: { checked: boolean, onChange: () => void, title?: string }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    title={title}
    style={{
      width: 36, height: 20, borderRadius: 10,
      background: checked ? ui.accent : ui.borderStrong,
      position: "relative", cursor: "pointer",
      transition: "background 0.2s",
      display: "flex", alignItems: "center",
      padding: 2,
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      transform: checked ? "translateX(16px)" : "translateX(0)",
      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    }} />
  </div>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
`;

const uiStartIdx = content.indexOf('const ui = {');
const uiEndIdx = content.indexOf('export const ManageColumnsPanel');
if (uiStartIdx !== -1 && uiEndIdx !== -1) {
  content = content.substring(0, uiStartIdx) + uiAndStylesReplacement + '\n// ─── component ───────────────────────────────────────────────────────────────\n\n' + content.substring(uiEndIdx);
}

// 2. Replace TabBtn and JSX
const jsxReplacement = `  // ── tab button ────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: TabId; label: string }) => {
    const active = activeTab === id;
    return (
      <div
        onClick={() => { setActiveTab(id); setSearch(""); setShowHiddenOnly(false); setEditingWidth(null); }}
        style={{
          margin: "2px 8px",
          padding: "8px 12px",
          cursor: "pointer", 
          fontSize: 13,
          borderRadius: 8,
          background: active ? ui.bg : "transparent",
          color: active ? ui.text : ui.textMuted,
          fontWeight: active ? 600 : 500,
          display: "flex", alignItems: "center", gap: 10,
          transition: "all 0.15s ease",
          boxShadow: active ? ui.shadowSoft : "none",
          border: \`1px solid \${active ? ui.border : 'transparent'}\`,
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = ui.surfaceHover;
            e.currentTarget.style.color = ui.text;
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = ui.textMuted;
          }
        }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: active ? ui.accent : "transparent",
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
            padding: "8px 12px 16px 12px",
            fontWeight: 700,
            fontSize: 15,
            color: ui.text,
            letterSpacing: "-0.01em",
          }}>
            Matrix Studio
          </div>
          <div style={{ padding: "4px 0", flex: 1 }}>
            <TabBtn id="measures" label="Measures" />
            <TabBtn id="columns" label="Data Columns" />
            <TabBtn id="visualColumns" label="Visual Columns" />
            <TabBtn id="rows" label="Rows" />
          </div>
          <div style={{ 
            padding: "16px 12px",
            fontSize: 11, 
            color: ui.textMuted, 
            borderTop: \`1px solid \${ui.border}\`,
            lineHeight: 1.5,
            background: ui.surface,
          }}>
            <strong style={{ color: ui.text, fontWeight: 600 }}>Pro Tip</strong><br />
            {activeTab === "visualColumns"
              ? "Visual columns let you show measures only where they add meaning: at year ends, quarters, specific months, or totals."
              : activeTab === "rows"
              ? "Rows hidden from the matrix stay here so you can show them again whenever you need."
              : "Drag items to reorder them in the matrix. Use Hidden Only to quickly review anything you hid."}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div style={content}>

          {/* Header */}
          <div style={{ 
            padding: "20px 24px 16px 24px",
            borderBottom: \`1px solid \${ui.border}\`,
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "space-between",
            background: ui.bg,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: ui.text, letterSpacing: "-0.02em" }}>
                {activeTab === "measures"
                  ? "Matrix Measures"
                  : activeTab === "columns"
                    ? "Structure & Groups"
                    : activeTab === "visualColumns"
                      ? "Visual Columns"
                      : "Matrix Rows"}
              </div>
              <div style={{ fontSize: 12, color: ui.textMuted, marginTop: 4 }}>
                {activeTab === "visualColumns"
                  ? \`\${visualColumnRules.length} display rule\${visualColumnRules.length === 1 ? "" : "s"} configured\`
                  : \`\${baseItems.length} elements in this collection\`}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 8 }}>
              {activeTab === "measures" && onOpenCalcMeasureWizard && (
                <button
                  onClick={() => { onClose(); onOpenCalcMeasureWizard!(); }}
                  style={{
                    ...actionBtn,
                    background: ui.accent,
                    color: ui.bg,
                    border: "1px solid transparent", 
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <PlusIcon />
                  New Measure
                </button>
              )}
              {activeTab === "visualColumns" && (
                <button
                  onClick={addVisualColumnRule}
                  style={{
                    ...actionBtn,
                    background: ui.accent,
                    color: ui.bg,
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <PlusIcon />
                  New Rule
                </button>
              )}
              <button 
                onClick={onClose} 
                style={{ 
                  background: ui.surface,
                  border: \`1px solid \${ui.border}\`,
                  cursor: "pointer", 
                  width: 32, height: 32,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: ui.textMuted,
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = ui.surfaceHover;
                  e.currentTarget.style.color = ui.text;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = ui.surface;
                  e.currentTarget.style.color = ui.textMuted;
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Toolbar row */}
          <div style={{ 
            padding: "12px 24px",
            background: ui.bg,
            borderBottom: \`1px solid \${ui.border}\`,
            display: "flex", 
            alignItems: "center", 
            gap: 12,
          }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder={activeTab === "measures"
                  ? "Search measures..."
                  : activeTab === "columns"
                    ? "Search columns..."
                    : activeTab === "visualColumns"
                      ? "Search rules..."
                      : "Search rows..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: "100%",
                  height: 32,
                  padding: "0 32px 0 32px",
                  border: \`1px solid \${ui.border}\`, 
                  borderRadius: 6, 
                  fontSize: 13, 
                  outline: "none",
                  background: ui.surface,
                  color: ui.text,
                  transition: "all 0.15s",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = ui.accent;
                  e.currentTarget.style.background = ui.bg;
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = ui.border;
                  if (!search) e.currentTarget.style.background = ui.surface;
                }}
              />
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: ui.textMuted, display: "flex" }}>
                <SearchIcon />
              </div>
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none",
                    width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: ui.textMuted
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {activeTab !== "visualColumns" && (
            <button
              onClick={() => setShowHiddenOnly(v => !v)}
              style={{
                ...actionBtn,
                border: \`1px solid \${showHiddenOnly ? ui.borderStrong : ui.border}\`,
                background: showHiddenOnly ? ui.surfaceHover : ui.surface,
                color: showHiddenOnly ? ui.text : ui.textMuted,
              }}
            >
              {showHiddenOnly ? "Hidden Only" : "All Items"}
            </button>
            )}
            {activeTab !== "visualColumns" && (
            <button
              onClick={toggleAll}
              style={{ 
                ...actionBtn,
                border: \`1px solid \${ui.border}\`, 
                background: ui.surface, 
                display: "flex", 
                alignItems: "center", 
                gap: 6,
                color: ui.textMuted,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = ui.surfaceHover;
                e.currentTarget.style.color = ui.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = ui.surface;
                e.currentTarget.style.color = ui.textMuted;
              }}
            >
              {allHidden ? <EyeOpen /> : <EyeOff />}
              <span>{allHidden ? "Show all" : "Hide all"}</span>
            </button>
            )}
          </div>

          {/* List content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", background: ui.surface }} className="matrix-scrollbar">
            {activeTab === "visualColumns" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredVisualColumnRules.length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", color: ui.textMuted, fontSize: 13 }}>
                    {search ? "No rules match your search." : "No visual columns yet. Add one to control where a measure appears."}
                  </div>
                )}

                {filteredVisualColumnRules.map(rule => {
                  const selectedColumnSet = new Set(rule.specificColumnKeys || []);
                  const selectedMeasureIndex = measures.findIndex(measure =>
                    measure.index === rule.sourceMeasureIndex ||
                    (rule.sourceMeasureId && measure.id === rule.sourceMeasureId) ||
                    measure.name === rule.sourceMeasureName
                  );

                  return (
                    <div
                      key={rule.id}
                      style={{
                        background: ui.bg,
                        border: \`1px solid \${ui.border}\`,
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: ui.shadowSoft,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: ui.text }}>
                            {rule.sourceMeasureName || "Measure display rule"}
                          </div>
                        </div>
                        <Toggle
                          checked={rule.enabled !== false}
                          onChange={() => updateVisualColumnRule(rule.id, { enabled: rule.enabled === false })}
                          title={rule.enabled === false ? "Rule is off" : "Rule is on"}
                        />
                        <button
                          title="Delete rule"
                          onClick={() => deleteVisualColumnRule(rule.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: ui.textMuted,
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = ui.dangerSoft;
                            e.currentTarget.style.color = ui.danger;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = ui.textMuted;
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 500, color: ui.text }}>
                          Source measure
                          <select
                            value={selectedMeasureIndex >= 0 ? String(selectedMeasureIndex) : "0"}
                            onChange={e => {
                              const measure = measures[Number(e.target.value)];
                              updateVisualColumnRule(rule.id, {
                                sourceMeasureId: measure?.id,
                                sourceMeasureName: measure?.name,
                                sourceMeasureIndex: measure?.index ?? Number(e.target.value),
                              });
                            }}
                            style={{ padding: "8px 12px", borderRadius: 6, border: \`1px solid \${ui.border}\`, background: ui.bg, color: ui.text, fontSize: 13, outline: "none" }}
                          >
                            {measures.map((measure, idx) => (
                              <option key={\`\${measure.name}-\${idx}\`} value={idx}>{measure.name}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 500, color: ui.text }}>
                          Display frequency
                          <select
                            value={rule.frequency || "all"}
                            onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as VisualColumnFrequency })}
                            style={{ padding: "8px 12px", borderRadius: 6, border: \`1px solid \${ui.border}\`, background: ui.bg, color: ui.text, fontSize: 13, outline: "none" }}
                          >
                            <option value="all">Everywhere</option>
                            <option value="yearly">Year-ends only</option>
                            <option value="quarterly">Quarter-ends only</option>
                            <option value="specific">Specific columns...</option>
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 500, color: ui.text }}>
                          Position
                          <select
                            value={rule.position || "normal"}
                            onChange={e => updateVisualColumnRule(rule.id, { position: e.target.value as VisualColumnPosition })}
                            style={{ padding: "8px 12px", borderRadius: 6, border: \`1px solid \${ui.border}\`, background: ui.bg, color: ui.text, fontSize: 13, outline: "none" }}
                          >
                            <option value="normal">Normal</option>
                            <option value="beginning">Beginning</option>
                            <option value="end">End</option>
                            <option value="specific">Specific Index</option>
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 500, color: ui.text }}>
                          Index / Level
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              type="number"
                              min={0}
                              disabled={(rule.position || "normal") !== "specific"}
                              value={rule.positionIndex ?? 0}
                              onChange={e => updateVisualColumnRule(rule.id, { positionIndex: Number(e.target.value) || 0 })}
                              placeholder="Idx"
                              style={{ width: "50%", padding: "8px 12px", borderRadius: 6, border: \`1px solid \${ui.border}\`, background: ui.bg, color: ui.text, fontSize: 13, opacity: (rule.position || "normal") === "specific" ? 1 : 0.4 }}
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="Lvl"
                              value={rule.hierarchyLevel ?? ""}
                              onChange={e => updateVisualColumnRule(rule.id, { hierarchyLevel: e.target.value === "" ? undefined : Number(e.target.value) })}
                              style={{ width: "50%", padding: "8px 12px", borderRadius: 6, border: \`1px solid \${ui.border}\`, background: ui.bg, color: ui.text, fontSize: 13 }}
                            />
                          </div>
                        </label>
                      </div>

                      {(rule.frequency || "all") === "specific" && (
                        <div style={{ borderTop: \`1px solid \${ui.border}\`, paddingTop: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: ui.text, marginBottom: 12 }}>
                            Select specific columns
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                            {selectableColumnItems.map(col => (
                              <label
                                key={col.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 12px",
                                  border: \`1px solid \${selectedColumnSet.has(col.id) ? ui.accent : ui.border}\`,
                                  borderRadius: 8,
                                  background: selectedColumnSet.has(col.id) ? ui.surfaceHover : ui.bg,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedColumnSet.has(col.id)}
                                  onChange={e => {
                                    const next = new Set(selectedColumnSet);
                                    if (e.target.checked) next.add(col.id); else next.delete(col.id);
                                    updateVisualColumnRule(rule.id, { specificColumnKeys: [...next] });
                                  }}
                                  style={{ accentColor: ui.accent }}
                                />
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: "block", fontWeight: 500, fontSize: 13, color: ui.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.label}</span>
                                  <span style={{ display: "block", fontSize: 11, color: ui.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.sub}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab !== "visualColumns" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: ui.textMuted, fontSize: 13 }}>
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
                    background: isDragOver ? ui.surfaceHover : ui.bg,
                    borderRadius: 10,
                    gap: 12,
                    border: isDragOver ? \`1px solid \${ui.accent}\` : \`1px solid \${ui.border}\`,
                    opacity: hidden ? 0.6 : 1,
                    cursor: activeTab === "rows" ? "default" : "grab",
                    transition: "all 0.2s ease",
                    boxShadow: isDragOver ? ui.shadowHover : "none",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.borderColor = ui.borderStrong;
                      e.currentTarget.style.boxShadow = ui.shadowSoft;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.borderColor = ui.border;
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {activeTab !== "rows" && (
                    <div style={{ color: ui.textMuted, opacity: 0.5 }}>
                      <DragHandle />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: ui.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {displayLabel}
                    </div>
                    <div style={{ fontSize: 11, color: ui.textMuted, marginTop: 2 }}>
                      {item.sub}
                    </div>
                  </div>

                  {/* Aggregation */}
                  {activeTab === "measures" && "measure" in item ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <select
                        value={aggregationOverrides[item.measure.index] || "sum"}
                        onChange={e => saveAggregation(item.measure.index, e.target.value)}
                        style={{ 
                          height: 30,
                          padding: "0 8px",
                          fontSize: 12, 
                          borderRadius: 6, 
                          border: \`1px solid \${ui.border}\`, 
                          outline: "none", 
                          background: ui.surface, 
                          color: ui.text,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "border-color 0.15s"
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = ui.accent}
                        onBlur={e => e.currentTarget.style.borderColor = ui.border}
                       >
                        <option value="sum">Sum</option>
                        <option value="avg">Avg</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                        <option value="count">Count</option>
                       </select>
                    </div>
                  ) : null}

                  {/* Width */}
                  {activeTab === "columns" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                            width: 60, 
                            height: 30,
                            padding: "0 8px",
                            border: \`1px solid \${ui.accent}\`, 
                            borderRadius: 6, 
                            fontSize: 12, 
                            outline: "none",
                            textAlign: "right"
                          }}
                        />
                      ) : (
                        <div 
                          onClick={() => { setEditingWidth(item.id); setWidthInput(String(customWidth ?? settings.general.defaultColumnWidth)); }}
                          style={{ 
                            fontSize: 12,
                            color: customWidth ? ui.text : ui.textMuted, 
                            fontWeight: 500,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: customWidth ? ui.surfaceHover : "transparent",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            minWidth: 48,
                            textAlign: "right",
                            border: "1px solid transparent",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = ui.surfaceHover;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = customWidth ? ui.surfaceHover : "transparent";
                          }}
                        >
                          {customWidth ? \`\${customWidth}px\` : "Auto"}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: \`1px solid \${ui.border}\` }}>
                    {activeTab === "measures" && "measure" in item && item.measure.id && onOpenCalcMeasureWizard && (
                      <button
                        title="Configure Logic"
                        onClick={() => { onClose(); onOpenCalcMeasureWizard!(item.measure.id ?? ""); }}
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          cursor: "pointer", 
                          color: ui.textMuted, 
                          width: 28, height: 28, 
                          borderRadius: 6, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = ui.surfaceHover;
                          e.currentTarget.style.color = ui.text;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = ui.textMuted;
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                    )}
                    {activeTab === "measures" && "measure" in item && (
                      <button
                        title="Convert measure to visual column rule"
                        onClick={() => addVisualRuleForMeasure(item.measure)}
                        style={{
                          background: ui.surface,
                          border: \`1px solid \${ui.border}\`,
                          cursor: "pointer",
                          color: ui.text,
                          height: 26,
                          borderRadius: 6,
                          padding: "0 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = ui.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = ui.surface}
                      >
                        Visual
                      </button>
                    )}
                    {activeTab === "columns" && "col" in item && (
                      <button
                        title="Use this data column as a visual-column display point"
                        onClick={() => addVisualRulesForColumn(item.col)}
                        style={{
                          background: ui.surface,
                          border: \`1px solid \${ui.border}\`,
                          cursor: "pointer",
                          color: ui.text,
                          height: 26,
                          borderRadius: 6,
                          padding: "0 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = ui.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = ui.surface}
                      >
                        Visual
                      </button>
                    )}
                    {canDelete && (
                      <button
                        title={activeTab === "rows" ? "Delete calculated row" : "Delete calculated measure"}
                        onClick={() => handleDeleteItem(item)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: ui.textMuted,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = ui.dangerSoft;
                          e.currentTarget.style.color = ui.danger;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = ui.textMuted;
                        }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                    <div style={{ marginLeft: 8 }}>
                      <Toggle 
                        checked={!hidden} 
                        onChange={() => toggleVisibility(item.id)} 
                        title={hidden ? "Hidden - Toggle to show" : "Visible - Toggle to hide"} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>

          <div style={{ 
            padding: "16px 24px",
            borderTop: \`1px solid \${ui.border}\`, 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 12,
            background: ui.bg
          }}>
            <button
              onClick={() => {
                if (activeTab === "visualColumns") {
                  persistVisualColumnRules([]);
                  return;
                }
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
                ...actionBtn,
                background: "transparent", 
                border: "1px solid transparent", 
                color: ui.textMuted, 
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = ui.surfaceHover; e.currentTarget.style.color = ui.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ui.textMuted; }}
            >
              {activeTab === "visualColumns" ? "Clear rules" : "Reset defaults"}
            </button>
            <button
              onClick={onClose}
              style={{ 
                ...actionBtn,
                padding: "0 24px",
                background: ui.accent,
                color: ui.bg, 
                border: "none", 
                transition: "all 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
`;

const jsxStartIdx = content.indexOf('  // ── tab button ────────────────────────────────────────────────────────────');
if (jsxStartIdx !== -1) {
  content = content.substring(0, jsxStartIdx) + jsxReplacement;
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update complete.');
