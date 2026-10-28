import fs from 'fs';

const filePath = 'src/ui/ManageColumnsPanel.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Prefix: imports and interfaces
const prefix = lines.slice(0, 46).join('\n');

// Helper components (EyeOpen, Toggle, Icons etc.)
// We'll redefine them to match our new style
const helpers = \`
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);
const DragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "rgba(0, 229, 255, 0.4)" }}><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    style={{
      width: 38, height: 18, borderRadius: 9,
      background: checked ? "#00E5FF" : "rgba(255,255,255,0.1)",
      position: "relative", cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex", alignItems: "center",
      padding: 2,
      boxShadow: checked ? "0 0 10px rgba(0, 229, 255, 0.5)" : "none",
    }}
  >
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      background: checked ? "#000" : "#FFF",
      transform: checked ? "translateX(20px)" : "translateX(0)",
      transition: "transform 0.3s ease",
    }} />
  </div>
);
\`;

const newUI = \`
const ui = {
  bg: "#050508",
  surface: "#0D0E14",
  surfaceHover: "#15171F",
  surfaceActive: "#1E212B",
  border: "rgba(0, 229, 255, 0.15)",
  borderStrong: "rgba(0, 229, 255, 0.3)",
  text: "#E2E8F0",
  textMuted: "#64748B",
  accent: "#00E5FF", 
  accentSecondary: "#FF00E5",
  accentSoft: "rgba(0, 229, 255, 0.1)",
  danger: "#FF3D00",
  shadow: "0 0 40px rgba(0, 229, 255, 0.1)",
  glow: "0 0 15px rgba(0, 229, 255, 0.4)",
};

const overlayStyles: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(0, 0, 0, 0.85)",
  backdropFilter: "blur(20px) saturate(180%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Inter', sans-serif",
  animation: "matrix-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
};

const modalStyles: React.CSSProperties = {
  width: "min(1000px, 95%)",
  height: "min(750px, 90%)",
  background: ui.bg,
  borderRadius: 4,
  boxShadow: \\\`0 0 0 1px \\\${ui.border}, \\\${ui.shadow}\\\`,
  display: "flex",
  flexDirection: "row",
  overflow: "hidden",
  border: \\\`1px solid rgba(255, 255, 255, 0.05)\\\`,
};

const sidebarStyles: React.CSSProperties = {
  width: 220,
  borderRight: \\\`1px solid \\\${ui.border}\\\`,
  background: "rgba(13, 14, 20, 0.8)",
  display: "flex", flexDirection: "column",
  padding: "40px 0",
};

const mainContentStyles: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
  position: "relative",
};
\`;

// Logic part needs careful extraction. We'll use lines 197-533 from original
const logic = lines.slice(196, 533).join('\\n');

const newJSX = \`
  const TabBtn = ({ id, label }: { id: TabId; label: string }) => {
    const active = activeTab === id;
    return (
      <div
        onClick={() => { setActiveTab(id); setSearch(""); setShowHiddenOnly(false); setEditingWidth(null); }}
        style={{
          margin: "8px 20px",
          padding: "12px 16px",
          cursor: "pointer", 
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: active ? ui.accent : ui.textMuted,
          borderLeft: \\\`2px solid \\\${active ? ui.accent : "transparent"}\\\`,
          background: active ? "rgba(0, 229, 255, 0.05)" : "transparent",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {label}
        {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ui.accent, boxShadow: ui.glow }} />}
      </div>
    );
  };

  return (
    <div style={overlayStyles} onClick={onClose}>
      <style>{\\\`
        @keyframes matrix-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .matrix-scrollbar::-webkit-scrollbar { width: 6px; }
        .matrix-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .matrix-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); borderRadius: 10px; }
        .matrix-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.4); }
      \\\`}</style>
      <div style={modalStyles} onClick={e => e.stopPropagation()}>
        <div style={sidebarStyles}>
          <div style={{ padding: "0 24px 40px 24px" }}>
             <div style={{ color: ui.accent, fontWeight: 900, fontSize: 24, letterSpacing: "-0.05em" }}>
               MATRIX<span style={{ color: ui.accentSecondary }}>.</span>
             </div>
             <div style={{ color: ui.textMuted, fontSize: 10, fontWeight: 600, marginTop: 4 }}>POWER BI STUDIO</div>
          </div>
          <TabBtn id="measures" label="Measures" />
          <TabBtn id="columns" label="Columns" />
          <TabBtn id="visualColumns" label="Visuals" />
          <TabBtn id="rows" label="Rows" />
          
          <div style={{ marginTop: "auto", padding: "0 24px", color: ui.textMuted, fontSize: 10, lineHeight: 1.6 }}>
            <div style={{ borderTop: \\\`1px solid \\\${ui.border}\\\`, paddingTop: 20 }}>
               CTRL + REORDER <br/> 
               TO SNAP TO GRID
            </div>
          </div>
        </div>

        <div style={mainContentStyles}>
          {/* Grid Overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: \\\`linear-gradient(\\\${ui.border} 1px, transparent 1px), linear-gradient(90deg, \\\${ui.border} 1px, transparent 1px)\\\`,
            backgroundSize: "40px 40px",
            opacity: 0.05,
            pointerEvents: "none",
          }} />
          
          {/* Header */}
          <div style={{ 
            padding: "40px 40px 20px 40px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            zIndex: 1
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#FFF", letterSpacing: "-0.02em" }}>
                {activeTab.toUpperCase()}
              </h1>
              <div style={{ marginTop: 8, color: ui.textMuted, fontSize: 12, fontWeight: 500 }}>
                {activeTab === "visualColumns" 
                  ? \\\`\\\${visualColumnRules.length} ACTIVE DISPLAY PROTOCOLS\\\`
                  : \\\`\\\${baseItems.length} ELEMENTS DETECTED IN DATALAYER\\\`}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              {(activeTab === "measures" || activeTab === "visualColumns") && (
                <button
                  onClick={activeTab === "measures" ? () => { onClose(); onOpenCalcMeasureWizard?.(); } : addVisualColumnRule}
                  style={{
                    background: "transparent",
                    border: \\\`1px solid \\\${ui.accent}\\\`,
                    color: ui.accent,
                    padding: "10px 20px",
                    borderRadius: 2,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    transition: "all 0.2s",
                    boxShadow: ui.glow,
                  }}
                >
                  + {activeTab === "measures" ? "NEW MEASURE" : "ADD RULE"}
                </button>
              )}
              <button 
                onClick={onClose}
                style={{ 
                  background: "rgba(255,255,255,0.05)", 
                  border: "none", 
                  color: "#FFF", 
                  width: 40, height: 40, 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  borderRadius: 2
                }}
              >
                âœ•
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: "0 40px 20px 40px", zIndex: 1 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="SEARCH SYSTEM_DATABASE..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.4)",
                  border: \\\`1px solid \\\${ui.border}\\\`,
                  padding: "16px 20px 16px 50px",
                  color: ui.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 2,
                  outline: "none",
                }}
              />
              <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: ui.accent }}>
                <SearchIcon />
              </div>
            </div>
          </div>

          {/* Items List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 40px 40px 40px", zIndex: 1 }} className="matrix-scrollbar">
            {activeTab === "visualColumns" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {filteredVisualColumnRules.map(rule => (
                  <div key={rule.id} style={{ 
                    background: ui.surface, 
                    border: \\\`1px solid \\\${ui.border}\\\`, 
                    padding: 24,
                    borderRadius: 4,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                       <div style={{ fontSize: 16, fontWeight: 800, color: ui.accent }}>{rule.sourceMeasureName || "UNNAMED RULE"}</div>
                       <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <Toggle checked={rule.enabled !== false} onChange={() => updateVisualColumnRule(rule.id, { enabled: rule.enabled === false })} />
                          <button onClick={() => deleteVisualColumnRule(rule.id)} style={{ background: "none", border: "none", color: ui.danger, cursor: "pointer" }}><TrashIcon /></button>
                       </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                       <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: ui.textMuted }}>FREQUENCY</label>
                          <select 
                            value={rule.frequency} 
                            onChange={e => updateVisualColumnRule(rule.id, { frequency: e.target.value as any })}
                            style={{ background: "#000", border: \\\`1px solid \\\${ui.border}\\\`, color: "#FFF", padding: 10, borderRadius: 2 }}
                          >
                             <option value="all">EVERYWHERE</option>
                             <option value="yearly">YEARLY ONLY</option>
                             <option value="quarterly">QUARTERLY ONLY</option>
                             <option value="specific">SPECIFIC COLUMNS</option>
                          </select>
                       </div>
                       <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: ui.textMuted }}>POSITION</label>
                          <select 
                            value={rule.position} 
                            onChange={e => updateVisualColumnRule(rule.id, { position: e.target.value as any })}
                            style={{ background: "#000", border: \\\`1px solid \\\${ui.border}\\\`, color: "#FFF", padding: 10, borderRadius: 2 }}
                          >
                             <option value="normal">NORMAL</option>
                             <option value="beginning">START</option>
                             <option value="end">END</option>
                             <option value="specific">AT INDEX</option>
                          </select>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((item: any) => {
                  const isHidden = activeTab === "rows" ? hiddenRowKeys.has(item.id) : hiddenCols.has(item.id);
                  const isDragOver = dragOverId === item.id;
                  return (
                    <div 
                      key={item.id}
                      draggable={activeTab !== "rows"}
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: "14px 20px",
                        background: isDragOver ? "rgba(0, 229, 255, 0.1)" : isHidden ? "rgba(0,0,0,0.2)" : ui.surface,
                        border: \\\`1px solid \\\${isDragOver ? ui.accent : isHidden ? "transparent" : "rgba(255,255,255,0.05)"}\\\`,
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        transition: "all 0.2s",
                        opacity: isHidden ? 0.4 : 1,
                      }}
                    >
                      {activeTab !== "rows" && <DragHandle />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: isHidden ? ui.textMuted : "#FFF" }}>{labelOverrides[item.id] || item.label}</div>
                        <div style={{ fontSize: 10, color: ui.textMuted, marginTop: 2, fontWeight: 600 }}>{item.sub}</div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                         {activeTab === "measures" && (
                            <button 
                              onClick={() => addVisualRuleForMeasure(item.measure)} 
                              style={{ background: "none", border: \\\`1px solid \\\${ui.border}\\\`, color: ui.accent, fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 2, cursor: "pointer" }}
                            >
                              VISUAL
                            </button>
                         )}
                         <Toggle checked={!isHidden} onChange={() => toggleVisibility(item.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            padding: "20px 40px", 
            borderTop: \\\`1px solid \\\${ui.border}\\\`, 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 12,
            background: "rgba(13, 14, 20, 0.9)",
            zIndex: 1
          }}>
             <button
               onClick={onClose}
               style={{
                 background: "none", border: "none", color: ui.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase"
               }}
             >
               Discard
             </button>
             <button
               onClick={onClose}
               style={{
                 background: ui.accent,
                 color: "#000",
                 border: "none",
                 padding: "12px 32px",
                 borderRadius: 2,
                 fontSize: 12,
                 fontWeight: 800,
                 cursor: "pointer",
                 textTransform: "uppercase",
                 letterSpacing: "0.1em",
                 boxShadow: ui.glow,
               }}
             >
               Commit Changes
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
\`;

const finalContent = prefix + '\\n' + helpers + '\\n' + newUI + '\\n' + logic + '\\n' + newJSX;

fs.writeFileSync(filePath, finalContent, 'utf-8');
console.log('Final Cyber Matrix redesign applied successfully.');
