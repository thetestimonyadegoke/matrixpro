import fs from 'fs';

const filePath = 'src/ui/ManageColumnsPanel.tsx';
let content = fs.readFileSync('src/ui/ManageColumnsPanel.tsx', 'utf-8');

// 1. Replace the `ui` object and shared styles
const uiAndStylesReplacement = `
const ui = {
  bg: "#0B0C10",
  surface: "#12141A",
  surfaceHover: "#1A1D24",
  surfaceActive: "#222630",
  border: "rgba(255, 255, 255, 0.06)",
  borderStrong: "rgba(255, 255, 255, 0.12)",
  text: "#F8FAFC",
  textMuted: "#8B95A5",
  accent: "#00E5FF", // Neon Cyan
  accentStrong: "#00B8D9",
  accentSoft: "rgba(0, 229, 255, 0.1)",
  accentWash: "rgba(0, 229, 255, 0.03)",
  danger: "#FF0055", // Neon Pink/Red
  dangerSoft: "rgba(255, 0, 85, 0.1)",
  shadow: "0 32px 64px -12px rgba(0,0,0,0.8)",
  shadowSoft: "0 8px 16px -4px rgba(0,0,0,0.5)",
  shadowHover: "0 12px 24px -4px rgba(0, 229, 255, 0.2)",
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(4, 5, 8, 0.75)",
  backdropFilter: "blur(16px) saturate(120%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--mx-font-family, 'Inter', sans-serif)",
  animation: "matrix-fade-in 0.3s ease-out",
  padding: 32,
};

const modal: React.CSSProperties = {
  width: "min(960px, 100%)",
  height: "min(720px, 100%)",
  background: "rgba(11, 12, 16, 0.65)", // Glassy
  backdropFilter: "blur(24px)",
  borderRadius: 24,
  boxShadow: \`inset 0 1px 1px rgba(255,255,255,0.1), \${ui.shadow}\`,
  display: "flex",
  flexDirection: "row",
  border: \`1px solid rgba(255, 255, 255, 0.08)\`,
  overflow: "hidden",
  animation: "matrix-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
};

const sidebar: React.CSSProperties = {
  width: 240,
  borderRight: \`1px solid \${ui.border}\`,
  background: "rgba(0, 0, 0, 0.2)",
  display: "flex", flexDirection: "column", minHeight: 0,
  padding: "32px 16px",
};

const content: React.CSSProperties = {
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
  letterSpacing: "0.02em",
};

const Toggle = ({ checked, onChange, title }: { checked: boolean, onChange: () => void, title?: string }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    title={title}
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)" : "rgba(255,255,255,0.1)",
      position: "relative", cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex", alignItems: "center",
      padding: 3,
      boxShadow: checked ? "0 0 12px rgba(0, 229, 255, 0.4)" : "inset 0 2px 4px rgba(0,0,0,0.2)",
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
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
          margin: "4px 0",
          padding: "12px 16px",
          cursor: "pointer", 
          fontSize: 14,
          borderRadius: 14,
          background: active ? "linear-gradient(90deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 119, 255, 0.05) 100%)" : "transparent",
          color: active ? "#FFF" : ui.textMuted,
          fontWeight: active ? 700 : 600,
          display: "flex", alignItems: "center", gap: 12,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: active ? "inset 2px 0 0 #00E5FF" : "inset 0 0 0 transparent",
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = ui.surface;
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
          width: 8, height: 8, borderRadius: "50%",
          background: active ? "#00E5FF" : "rgba(255,255,255,0.15)",
          boxShadow: active ? "0 0 8px #00E5FF" : "none",
        }} />
        <span style={{ flex: 1, letterSpacing: "0.02em" }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={sidebar}>
          <div style={{ 
            padding: "0 12px 32px 12px",
            fontWeight: 800,
            fontSize: 20,
            color: "#FFF",
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0, 119, 255, 0.4)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M4 4h16v16H4z"/><path d="M4 12h16M12 4v16"/></svg>
            </div>
            Matrix Studio
          </div>
          <div style={{ padding: "0", flex: 1 }}>
            <TabBtn id="measures" label="Measures" />
            <TabBtn id="columns" label="Data Columns" />
            <TabBtn id="visualColumns" label="Visual Columns" />
            <TabBtn id="rows" label="Rows" />
          </div>
          <div style={{ 
            padding: "20px 16px",
            fontSize: 12, 
            color: "rgba(255,255,255,0.5)", 
            background: "rgba(0,0,0,0.3)",
            borderRadius: 16,
            lineHeight: 1.6,
            border: \`1px solid \${ui.border}\`,
          }}>
            <strong style={{ color: ui.accent, fontWeight: 700, display: "block", marginBottom: 6 }}>SYSTEM TIP</strong>
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
            padding: "32px 32px 24px 32px",
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 24, color: "#FFF", letterSpacing: "-0.03em" }}>
                {activeTab === "measures"
                  ? "Matrix Measures"
                  : activeTab === "columns"
                    ? "Structure & Groups"
                    : activeTab === "visualColumns"
                      ? "Visual Columns"
                      : "Matrix Rows"}
              </div>
              <div style={{ fontSize: 13, color: ui.textMuted, marginTop: 8, fontWeight: 500 }}>
                {activeTab === "visualColumns"
                  ? \`\${visualColumnRules.length} display rule\${visualColumnRules.length === 1 ? "" : "s"} configured\`
                  : \`\${baseItems.length} elements in this collection\`}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              {activeTab === "measures" && onOpenCalcMeasureWizard && (
                <button
                  onClick={() => { onClose(); onOpenCalcMeasureWizard!(); }}
                  style={{
                    ...actionBtn,
                    background: "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)",
                    color: "#FFF",
                    border: "none", 
                    boxShadow: "0 4px 16px rgba(0, 119, 255, 0.4)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 119, 255, 0.6)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 119, 255, 0.4)";
                  }}
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
                    background: "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)",
                    color: "#FFF",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(0, 119, 255, 0.4)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 119, 255, 0.6)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 119, 255, 0.4)";
                  }}
                >
                  <PlusIcon />
                  New Rule
                </button>
              )}
              <button 
                onClick={onClose} 
                style={{ 
                  background: "rgba(255,255,255,0.05)",
                  border: \`1px solid \${ui.border}\`,
                  cursor: "pointer", 
                  width: 36, height: 36,
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: ui.textMuted,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#FFF";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = ui.textMuted;
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Toolbar row */}
          <div style={{ 
            padding: "0 32px 20px 32px",
            display: "flex", 
            alignItems: "center", 
            gap: 16,
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
                  height: 40,
                  padding: "0 36px 0 40px",
                  border: \`1px solid \${ui.border}\`, 
                  borderRadius: 12, 
                  fontSize: 14, 
                  outline: "none",
                  background: "rgba(0,0,0,0.2)",
                  color: "#FFF",
                  transition: "all 0.2s",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = ui.accent;
                  e.currentTarget.style.background = "rgba(0, 229, 255, 0.05)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 229, 255, 0.1)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = ui.border;
                  if (!search) e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: ui.textMuted, display: "flex" }}>
                <SearchIcon />
              </div>
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                    width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#FFF"
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
                height: 40,
                border: \`1px solid \${showHiddenOnly ? ui.accent : ui.border}\`,
                background: showHiddenOnly ? ui.accentSoft : "rgba(0,0,0,0.2)",
                color: showHiddenOnly ? ui.accent : ui.textMuted,
                boxShadow: showHiddenOnly ? "0 0 12px rgba(0, 229, 255, 0.15)" : "none",
              }}
            >
              <FilterIcon />
              {showHiddenOnly ? "Hidden Only" : "All Items"}
            </button>
            )}
            {activeTab !== "visualColumns" && (
            <button
              onClick={toggleAll}
              style={{ 
                ...actionBtn,
                height: 40,
                border: \`1px solid \${ui.border}\`, 
                background: "rgba(0,0,0,0.2)", 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                color: ui.textMuted,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#FFF";
                e.currentTarget.style.borderColor = ui.borderStrong;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                e.currentTarget.style.color = ui.textMuted;
                e.currentTarget.style.borderColor = ui.border;
              }}
            >
              {allHidden ? <EyeOpen /> : <EyeOff />}
              <span>{allHidden ? "Show all" : "Hide all"}</span>
            </button>
            )}
          </div>

          {/* List content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px 32px" }} className="matrix-scrollbar">
            {activeTab === "visualColumns" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {filteredVisualColumnRules.length === 0 && (
                  <div style={{ padding: "60px 0", textAlign: "center", color: ui.textMuted, fontSize: 14 }}>
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
                        background: "rgba(255,255,255,0.02)",
                        border: \`1px solid \${ui.borderStrong}\`,
                        borderRadius: 16,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: rule.enabled !== false ? "linear-gradient(180deg, #00E5FF 0%, #0077FF 100%)" : ui.borderStrong }} />
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#FFF" }}>
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
                            background: "rgba(255, 0, 85, 0.05)",
                            border: "1px solid rgba(255, 0, 85, 0.2)",
                            cursor: "pointer",
                            color: ui.danger,
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = ui.dangerSoft;
                            e.currentTarget.style.borderColor = "rgba(255, 0, 85, 0.4)";
                            e.currentTarget.style.boxShadow = "0 0 12px rgba(255, 0, 85, 0.3)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255, 0, 85, 0.05)";
                            e.currentTarget.style.borderColor = "rgba(255, 0, 85, 0.2)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, fontWeight: 600, color: ui.textMuted }}>
                          SOURCE MEASURE
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
                            style={{ padding: "10px 14px", borderRadius: 8, border: \`1px solid \${ui.border}\`, background: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: 14, outline: "none" }}
                          >
                            {measures.map((measure, idx) => (
                              <option key={\`\${measure.name}-\${idx}\`} value={idx}>{measure.name}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, fontWeight: 600, color: ui.textMuted }}>
                          DISPLAY FREQUENCY
                          <select
                            value={rule.frequency || "all"}
                            onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as VisualColumnFrequency })}
                            style={{ padding: "10px 14px", borderRadius: 8, border: \`1px solid \${ui.border}\`, background: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: 14, outline: "none" }}
                          >
                            <option value="all">Everywhere</option>
                            <option value="yearly">Year-ends only</option>
                            <option value="quarterly">Quarter-ends only</option>
                            <option value="specific">Specific columns...</option>
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, fontWeight: 600, color: ui.textMuted }}>
                          POSITION
                          <select
                            value={rule.position || "normal"}
                            onChange={e => updateVisualColumnRule(rule.id, { position: e.target.value as VisualColumnPosition })}
                            style={{ padding: "10px 14px", borderRadius: 8, border: \`1px solid \${ui.border}\`, background: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: 14, outline: "none" }}
                          >
                            <option value="normal">Normal</option>
                            <option value="beginning">Beginning</option>
                            <option value="end">End</option>
                            <option value="specific">Specific Index</option>
                          </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, fontWeight: 600, color: ui.textMuted }}>
                          INDEX / LEVEL
                          <div style={{ display: "flex", gap: 12 }}>
                            <input
                              type="number"
                              min={0}
                              disabled={(rule.position || "normal") !== "specific"}
                              value={rule.positionIndex ?? 0}
                              onChange={e => updateVisualColumnRule(rule.id, { positionIndex: Number(e.target.value) || 0 })}
                              placeholder="Idx"
                              style={{ width: "50%", padding: "10px 14px", borderRadius: 8, border: \`1px solid \${ui.border}\`, background: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: 14, opacity: (rule.position || "normal") === "specific" ? 1 : 0.4 }}
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="Lvl"
                              value={rule.hierarchyLevel ?? ""}
                              onChange={e => updateVisualColumnRule(rule.id, { hierarchyLevel: e.target.value === "" ? undefined : Number(e.target.value) })}
                              style={{ width: "50%", padding: "10px 14px", borderRadius: 8, border: \`1px solid \${ui.border}\`, background: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: 14 }}
                            />
                          </div>
                        </label>
                      </div>

                      {(rule.frequency || "all") === "specific" && (
                        <div style={{ borderTop: \`1px solid \${ui.border}\`, paddingTop: 20 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: ui.text, marginBottom: 16 }}>
                            SELECT SPECIFIC COLUMNS
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                            {selectableColumnItems.map(col => (
                              <label
                                key={col.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "10px 14px",
                                  border: \`1px solid \${selectedColumnSet.has(col.id) ? ui.accent : ui.borderStrong}\`,
                                  borderRadius: 10,
                                  background: selectedColumnSet.has(col.id) ? ui.accentWash : "rgba(0,0,0,0.2)",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
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
                                  style={{ accentColor: ui.accent, transform: "scale(1.1)" }}
                                />
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.label}</span>
                                  <span style={{ display: "block", fontSize: 11, color: ui.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{col.sub}</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.length === 0 && (
              <div style={{ padding: "60px 0", textAlign: "center", color: ui.textMuted, fontSize: 14 }}>
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
                    padding: "14px 20px",
                    background: isDragOver ? ui.surfaceHover : "rgba(255,255,255,0.02)",
                    borderRadius: 14,
                    gap: 16,
                    border: isDragOver ? \`1px solid \${ui.accent}\` : \`1px solid \${ui.border}\`,
                    opacity: hidden ? 0.4 : 1,
                    cursor: activeTab === "rows" ? "default" : "grab",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isDragOver ? ui.shadowHover : "none",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.background = ui.surfaceHover;
                      e.currentTarget.style.borderColor = ui.borderStrong;
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDragOver) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = ui.border;
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  {activeTab !== "rows" && (
                    <div style={{ color: ui.textMuted, opacity: 0.6 }}>
                      <DragHandle />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {displayLabel}
                    </div>
                    <div style={{ fontSize: 11, color: ui.accentStrong, marginTop: 4, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {item.sub}
                    </div>
                  </div>

                  {/* Aggregation */}
                  {activeTab === "measures" && "measure" in item ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                       <select
                        value={aggregationOverrides[item.measure.index] || "sum"}
                        onChange={e => saveAggregation(item.measure.index, e.target.value)}
                        style={{ 
                          height: 34,
                          padding: "0 12px",
                          fontSize: 13, 
                          borderRadius: 8, 
                          border: \`1px solid \${ui.borderStrong}\`, 
                          outline: "none", 
                          background: "rgba(0,0,0,0.3)", 
                          color: "#FFF",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = ui.accent;
                          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0, 229, 255, 0.2)";
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = ui.borderStrong;
                          e.currentTarget.style.boxShadow = "none";
                        }}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                            width: 64, 
                            height: 34,
                            padding: "0 10px",
                            border: \`1px solid \${ui.accent}\`, 
                            borderRadius: 8, 
                            fontSize: 13, 
                            outline: "none",
                            textAlign: "right",
                            background: "rgba(0,0,0,0.3)",
                            color: "#FFF",
                            boxShadow: "0 0 0 2px rgba(0, 229, 255, 0.2)",
                          }}
                        />
                      ) : (
                        <div 
                          onClick={() => { setEditingWidth(item.id); setWidthInput(String(customWidth ?? settings.general.defaultColumnWidth)); }}
                          style={{ 
                            fontSize: 13,
                            color: customWidth ? ui.accent : ui.textMuted, 
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: customWidth ? ui.accentWash : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            minWidth: 54,
                            textAlign: "right",
                            border: \`1px solid \${customWidth ? ui.accentSoft : 'transparent'}\`,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = ui.surfaceActive;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = customWidth ? ui.accentWash : "transparent";
                          }}
                        >
                          {customWidth ? \`\${customWidth}px\` : "Auto"}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16, borderLeft: \`1px solid \${ui.border}\` }}>
                    {activeTab === "measures" && "measure" in item && item.measure.id && onOpenCalcMeasureWizard && (
                      <button
                        title="Configure Logic"
                        onClick={() => { onClose(); onOpenCalcMeasureWizard!(item.measure.id ?? ""); }}
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          cursor: "pointer", 
                          color: ui.textMuted, 
                          width: 32, height: 32, 
                          borderRadius: 8, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = ui.surfaceActive;
                          e.currentTarget.style.color = ui.accent;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = ui.textMuted;
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                    )}
                    {activeTab === "measures" && "measure" in item && (
                      <button
                        title="Convert measure to visual column rule"
                        onClick={() => addVisualRuleForMeasure(item.measure)}
                        style={{
                          background: "transparent",
                          border: \`1px solid \${ui.borderStrong}\`,
                          cursor: "pointer",
                          color: "#FFF",
                          height: 30,
                          borderRadius: 8,
                          padding: "0 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = ui.accent;
                          e.currentTarget.style.color = ui.accent;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = ui.borderStrong;
                          e.currentTarget.style.color = "#FFF";
                        }}
                      >
                        Visual
                      </button>
                    )}
                    {activeTab === "columns" && "col" in item && (
                      <button
                        title="Use this data column as a visual-column display point"
                        onClick={() => addVisualRulesForColumn(item.col)}
                        style={{
                          background: "transparent",
                          border: \`1px solid \${ui.borderStrong}\`,
                          cursor: "pointer",
                          color: "#FFF",
                          height: 30,
                          borderRadius: 8,
                          padding: "0 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = ui.accent;
                          e.currentTarget.style.color = ui.accent;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = ui.borderStrong;
                          e.currentTarget.style.color = "#FFF";
                        }}
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
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
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
            padding: "20px 32px",
            borderTop: \`1px solid \${ui.border}\`, 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 16,
            background: "rgba(0,0,0,0.2)"
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
                height: 44,
                background: "transparent", 
                border: "1px solid transparent", 
                color: ui.textMuted, 
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#FFF"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ui.textMuted; }}
            >
              {activeTab === "visualColumns" ? "Clear rules" : "Reset defaults"}
            </button>
            <button
              onClick={onClose}
              style={{ 
                ...actionBtn,
                height: 44,
                padding: "0 32px",
                background: "linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)",
                color: "#FFF", 
                border: "none",
                boxShadow: "0 4px 16px rgba(0, 119, 255, 0.4)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 119, 255, 0.6)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 119, 255, 0.4)";
              }}
            >
              Save & Apply
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
console.log('Update complete with Dark Studio Aesthetic.');
