import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// ---------- public API ----------

export interface ConditionalFormattingDropdownProps {
  anchor: DOMRect;
  onClose: () => void;
  /**
   * Fires with an action identifier. See the `CF_ACTION_IDS` export below
   * for the full contract — callers should handle every id they expose to
   * users (missing ids are silently ignored by the dropdown).
   */
  onSelect: (action: string, payload?: any) => void;
}

export const CF_ACTION_IDS = {
  // Quick Rule
  QUICK_POSITIVE: "quick-positive",
  QUICK_NEGATIVE: "quick-negative",
  // Color Scales — sequential
  SCALE_SEQ_BLUE: "scale-seq-blue",
  SCALE_SEQ_ORANGE: "scale-seq-orange",
  SCALE_SEQ_GREEN: "scale-seq-green",
  // Color Scales — qualitative
  SCALE_QUAL_COOL: "scale-qual-cool",
  SCALE_QUAL_EARTH: "scale-qual-earth",
  // Color Scales — diverging
  SCALE_DIV_RWG: "scale-div-rwg",
  SCALE_DIV_RWB: "scale-div-rwb",
  SCALE_DIV_BYG: "scale-div-byg",
  // Color Scales — continuous
  SCALE_CONT_WARM: "scale-cont-warm",
  SCALE_CONT_DIV: "scale-cont-div",
  // Classification — text
  CLASS_TEXT_ABC: "class-text-abc",
  CLASS_TEXT_LEVELS: "class-text-levels",
  // Classification — icons
  CLASS_ICON_CHECK: "class-icon-check",
  CLASS_ICON_FLAGS: "class-icon-flags",
  CLASS_ICON_ARROWS3: "class-icon-arrows3",
  CLASS_ICON_ARROWS5: "class-icon-arrows5",
  // Classification — rating
  CLASS_RATING_SQUARES: "class-rating-squares",
  CLASS_RATING_STARS: "class-rating-stars",
  CLASS_RATING_CIRCLES: "class-rating-circles",
  // Data Bars
  BAR_BLUE: "bar-blue",
  BAR_GREEN: "bar-green",
  BAR_RED: "bar-red",
  BAR_ORANGE: "bar-orange",
  BAR_PINK: "bar-pink",
  // Action Analysis
  ACTION_DOT: "action-dot",
  ACTION_COLOR: "action-color",
  ACTION_BUBBLE_CHART: "action-bubble-chart",
  ACTION_BUBBLE_ONLY: "action-bubble-only",
  // Bottom items
  CREATE_RULE: "create-rule",
  MANAGE_RULES: "manage-rules",
} as const;

// ---------- shared inline styles ----------

const COLORS = {
  text: "#111827",
  textMuted: "#6b7280",
  textLabel: "#9ca3af",
  border: "#e5e7eb",
  hover: "#f3f4f6",
  surface: "#ffffff",
  accent: "#2563eb",
};

const panelStyle: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  boxShadow: "0 12px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)",
  padding: 6,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 13,
  color: COLORS.text,
  minWidth: 220,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  userSelect: "none",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: COLORS.text,
  padding: "8px 10px 4px",
};

// ---------- main menu row ----------

interface MainRow {
  id: string;
  label: string;
  icon: React.ReactNode;
  submenu?: (closeAll: () => void, emit: (id: string) => void) => React.ReactNode;
  action?: string;
}

// ---------- tiny inline thumbnail components ----------

const QuickThumb: React.FC<{ kind: "pos" | "neg" }> = ({ kind }) => (
  <div
    style={{
      width: 36, height: 36, border: `2px solid ${kind === "pos" ? "#2563eb" : "#dc2626"}`,
      borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, fontWeight: 800, color: kind === "pos" ? "#2563eb" : "#dc2626",
      background: "#fff",
    }}
  >
    {kind === "pos" ? ">" : "<"}
  </div>
);

const BarStrip: React.FC<{ colors: string[] }> = ({ colors }) => (
  <div style={{ display: "flex", width: 180, height: 16, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
    {colors.map((c, i) => (
      <div key={i} style={{ flex: 1, background: c }} />
    ))}
  </div>
);

const GradientStrip: React.FC<{ from: string; to: string; via?: string }> = ({ from, to, via }) => (
  <div
    style={{
      width: 180, height: 16, borderRadius: 3, border: "1px solid rgba(0,0,0,0.05)",
      background: via
        ? `linear-gradient(90deg, ${from}, ${via}, ${to})`
        : `linear-gradient(90deg, ${from}, ${to})`,
    }}
  />
);

const SolidBar: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 160, height: 14, borderRadius: 2, background: color }} />
);

// Tiny icon row renderers for Classification submenu
const TextPreview: React.FC<{ tokens: { text: string; color: string }[] }> = ({ tokens }) => (
  <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
    {tokens.map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: 700, fontSize: 14 }}>{t.text}</span>
    ))}
  </div>
);

const IconRow: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "4px 0" }}>
    {items.map((el, i) => <span key={i}>{el}</span>)}
  </div>
);

const Check = ({ color }: { color: string }) => <span style={{ color, fontSize: 16, fontWeight: 700 }}>✓</span>;
const Excl = ({ color }: { color: string }) => <span style={{ color, fontSize: 16, fontWeight: 700 }}>!</span>;
const Cross = ({ color }: { color: string }) => <span style={{ color, fontSize: 16, fontWeight: 700 }}>✕</span>;
const Flag = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>⚑</span>;
const ArrowUp = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>↑</span>;
const ArrowRight = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>→</span>;
const ArrowDown = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>↓</span>;
const ArrowUR = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>↗</span>;
const ArrowDR = ({ color }: { color: string }) => <span style={{ color, fontSize: 16 }}>↘</span>;

const RatingSquare: React.FC<{ filled: number }> = ({ filled }) => {
  // filled: 0..1
  const bg = filled >= 0.999 ? "#111827" : filled <= 0 ? "transparent" : undefined;
  return (
    <span style={{ display: "inline-block", width: 16, height: 16, border: "1.5px solid #111827", background: bg, position: "relative", overflow: "hidden" }}>
      {filled > 0 && filled < 1 && (
        <span style={{ position: "absolute", inset: 0, background: "#111827", width: `${filled * 100}%` }} />
      )}
    </span>
  );
};
const RatingStar: React.FC<{ filled: boolean }> = ({ filled }) => (
  <span style={{ fontSize: 16, color: "#111827" }}>{filled ? "★" : "☆"}</span>
);
const RatingCircle: React.FC<{ filled: number }> = ({ filled }) => {
  // Quarter-filled pie via conic-gradient
  const angle = Math.round(filled * 360);
  return (
    <span
      style={{
        display: "inline-block", width: 14, height: 14, borderRadius: "50%",
        border: "1.5px solid #111827",
        background: filled >= 0.999
          ? "#111827"
          : filled <= 0
            ? "transparent"
            : `conic-gradient(#111827 0deg ${angle}deg, transparent ${angle}deg 360deg)`,
      }}
    />
  );
};

// ---------- submenu renderers ----------

const QuickRuleSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <div style={{ ...panelStyle, minWidth: 180, padding: 8 }}>
    <SubRow icon={<QuickThumb kind="pos" />} label="Positive" onClick={() => onSelect(CF_ACTION_IDS.QUICK_POSITIVE)} />
    <SubRow icon={<QuickThumb kind="neg" />} label="Negative" onClick={() => onSelect(CF_ACTION_IDS.QUICK_NEGATIVE)} />
  </div>
);

const ColorScalesSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <div style={{ ...panelStyle, minWidth: 240, padding: 10 }}>
    <div style={sectionHeaderStyle}>Sequential</div>
    <SubRow icon={<BarStrip colors={["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_BLUE)} />
    <SubRow icon={<BarStrip colors={["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_ORANGE)} />
    <SubRow icon={<BarStrip colors={["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_GREEN)} />

    <div style={sectionHeaderStyle}>Qualitative</div>
    <SubRow icon={<BarStrip colors={["#10b981", "#7c3aed", "#ef4444", "#eab308", "#3b82f6", "#6b7280"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_QUAL_COOL)} />
    <SubRow icon={<BarStrip colors={["#93c5fd", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5", "#a8a29e"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_QUAL_EARTH)} />

    <div style={sectionHeaderStyle}>Diverging</div>
    <SubRow icon={<BarStrip colors={["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_RWG)} />
    <SubRow icon={<BarStrip colors={["#b91c1c", "#fca5a5", "#fef9c3", "#bae6fd", "#1d4ed8"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_RWB)} />
    <SubRow icon={<BarStrip colors={["#854d0e", "#d97706", "#ecfeff", "#22d3ee", "#0e7490"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_BYG)} />

    <div style={sectionHeaderStyle}>Continuous</div>
    <SubRow icon={<GradientStrip from="#f97316" to="#be123c" />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_CONT_WARM)} />

    <div style={sectionHeaderStyle}>Continuous — Diverging</div>
    <SubRow icon={<GradientStrip from="#ef4444" via="#ffffff" to="#6366f1" />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_CONT_DIV)} />
  </div>
);

const ClassificationSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <div style={{ ...panelStyle, minWidth: 240, padding: 10 }}>
    <div style={sectionHeaderStyle}>Text</div>
    <SubRow
      icon={<TextPreview tokens={[{ text: "A", color: "#16a34a" }, { text: "B", color: "#f97316" }, { text: "C", color: "#dc2626" }]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_TEXT_ABC)}
    />
    <SubRow
      icon={<TextPreview tokens={[{ text: "HIGH", color: "#16a34a" }, { text: "MEDIUM", color: "#f97316" }, { text: "LOW", color: "#dc2626" }]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_TEXT_LEVELS)}
    />

    <div style={sectionHeaderStyle}>Icon Set</div>
    <SubRow icon={<IconRow items={[<Check color="#16a34a" />, <Excl color="#f97316" />, <Cross color="#dc2626" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_CHECK)} />
    <SubRow icon={<IconRow items={[<Flag color="#dc2626" />, <Flag color="#f59e0b" />, <Flag color="#16a34a" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_FLAGS)} />
    <SubRow icon={<IconRow items={[<ArrowUp color="#f59e0b" />, <ArrowRight color="#f59e0b" />, <ArrowDown color="#f59e0b" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_ARROWS3)} />
    <SubRow icon={<IconRow items={[<ArrowUp color="#16a34a" />, <ArrowUR color="#16a34a" />, <ArrowRight color="#f59e0b" />, <ArrowDR color="#dc2626" />, <ArrowDown color="#dc2626" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_ARROWS5)} />

    <div style={sectionHeaderStyle}>Rating</div>
    <SubRow icon={<IconRow items={[<RatingSquare filled={0} />, <RatingSquare filled={1} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_SQUARES)} />
    <SubRow icon={<IconRow items={[<RatingStar filled={false} />, <RatingStar filled={true} />, <RatingStar filled={true} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_STARS)} />
    <SubRow icon={<IconRow items={[<RatingCircle filled={0} />, <RatingCircle filled={0.25} />, <RatingCircle filled={0.5} />, <RatingCircle filled={0.75} />, <RatingCircle filled={1} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_CIRCLES)} />
  </div>
);

const DataBarsSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <div style={{ ...panelStyle, minWidth: 200, padding: 8 }}>
    <SubRow icon={<SolidBar color="#3b82f6" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_BLUE)} />
    <SubRow icon={<SolidBar color="#22c55e" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_GREEN)} />
    <SubRow icon={<SolidBar color="#fb7185" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_RED)} />
    <SubRow icon={<SolidBar color="#f59e0b" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_ORANGE)} />
    <SubRow icon={<SolidBar color="#ec4899" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_PINK)} />
  </div>
);

const ActionAnalysisSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <div style={{ ...panelStyle, minWidth: 220, padding: 6 }}>
    <SubRow
      icon={<span style={{ display: "inline-block", width: 18, height: 18, background: "#3b82f6", borderRadius: "50%" }} />}
      label="Action Dot"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_DOT)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 18, height: 18, background: "linear-gradient(135deg,#22c55e,#eab308,#dc2626)", borderRadius: 3 }} />}
      label="Action Color"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_COLOR)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 18, height: 18, background: "radial-gradient(circle, #3b82f6 50%, transparent 52%)" }} />}
      label="Bubble Chart"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_BUBBLE_CHART)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 14, height: 14, background: "#3b82f6", borderRadius: "50%" }} />}
      label="Bubble Only"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_BUBBLE_ONLY)}
    />
  </div>
);

// ---------- sub-row primitive ----------

const SubRow: React.FC<{ icon: React.ReactNode; label?: string; onClick: () => void }> = ({ icon, label, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...rowStyle, background: hover ? COLORS.hover : "transparent" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 36 }}>{icon}</div>
      {label && <div style={{ flex: 1, fontSize: 13 }}>{label}</div>}
    </div>
  );
};

// ---------- submenu portal wrapper ----------

interface SubmenuPortalProps {
  anchor: DOMRect;
  estimatedWidth: number;
  children: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const SubmenuPortal: React.FC<SubmenuPortalProps> = ({ anchor, estimatedWidth, children, onMouseEnter, onMouseLeave }) => {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const spaceRight = viewportWidth - anchor.right;
  const left = spaceRight >= estimatedWidth + 8 ? anchor.right + 4 : Math.max(8, anchor.left - estimatedWidth - 4);

  return createPortal(
    <div
      style={{ position: "fixed", top: Math.max(8, anchor.top - 4), left, zIndex: 100001 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
};

// ---------- main dropdown ----------

export const ConditionalFormattingDropdown: React.FC<ConditionalFormattingDropdownProps> = ({
  anchor, onClose, onSelect,
}) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ id: string; rect: DOMRect } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Close when clicking outside both main and submenu portals
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMain = mainRef.current?.contains(target);
      // Submenu DOM lives outside main; detect by data attribute
      const inSub = !!(target as HTMLElement).closest?.('[data-cf-submenu="true"]');
      if (!inMain && !inSub) onClose();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [onClose]);

  const emit = (id: string) => {
    onSelect(id);
    onClose();
  };

  const openSub = (id: string, target: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActive({ id, rect: target.getBoundingClientRect() });
  };
  const scheduleCloseSub = () => {
    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => setActive(null), 180);
  };
  const cancelScheduledClose = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const rows: MainRow[] = [
    {
      id: "quick-rule",
      label: "Quick Rule",
      icon: <MainIcon bg="#eff6ff" content={<span style={{ color: "#2563eb", fontWeight: 700 }}>⧉</span>} />,
      submenu: () => <QuickRuleSubmenu onSelect={emit} />,
    },
    {
      id: "color-scales",
      label: "Color Scales",
      icon: <ColorScalesMainIcon />,
      submenu: () => <ColorScalesSubmenu onSelect={emit} />,
    },
    {
      id: "classification",
      label: "Classification",
      icon: <MainIcon bg="#f9fafb" content={<ClassificationMainGlyph />} />,
      submenu: () => <ClassificationSubmenu onSelect={emit} />,
    },
    {
      id: "data-bars",
      label: "Data Bars",
      icon: <DataBarsMainIcon />,
      submenu: () => <DataBarsSubmenu onSelect={emit} />,
    },
    {
      id: "action-analysis",
      label: "Action Analysis",
      icon: <MainIcon bg="#f3f4f6" content={<ActionAnalysisGlyph />} />,
      submenu: () => <ActionAnalysisSubmenu onSelect={emit} />,
    },
  ];

  const bottomRows: MainRow[] = [
    {
      id: "create-rule",
      label: "Create Rule",
      icon: <MainIcon bg="#eff6ff" content={<span style={{ color: "#2563eb", fontWeight: 700, fontSize: 14 }}>＋</span>} />,
      action: CF_ACTION_IDS.CREATE_RULE,
    },
    {
      id: "manage-rules",
      label: "Manage Rules",
      icon: <MainIcon bg="#f3f4f6" content={<span style={{ color: "#374151", fontWeight: 700, fontSize: 14 }}>⚙</span>} />,
      action: CF_ACTION_IDS.MANAGE_RULES,
    },
  ];

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const menuLeft = Math.min(anchor.left, viewportW - 260);

  return createPortal(
    <div
      ref={mainRef}
      style={{
        ...panelStyle,
        position: "fixed",
        top: anchor.bottom + 4,
        left: Math.max(8, menuLeft),
        zIndex: 100000,
        minWidth: 240,
      }}
    >
      {rows.map((r) => (
        <MainRowView
          key={r.id}
          row={r}
          isActive={active?.id === r.id}
          onEnter={(target) => openSub(r.id, target)}
          onLeave={scheduleCloseSub}
        />
      ))}
      <div style={{ height: 1, background: COLORS.border, margin: "6px 4px" }} />
      {bottomRows.map((r) => (
        <MainRowView
          key={r.id}
          row={r}
          isActive={false}
          onEnter={() => setActive(null)}
          onLeave={() => {}}
          onClick={() => r.action && (onSelect(r.action), onClose())}
        />
      ))}

      {active && (
        <SubmenuPortal
          anchor={active.rect}
          estimatedWidth={280}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleCloseSub}
        >
          <div data-cf-submenu="true">
            {rows.find(r => r.id === active.id)?.submenu?.(onClose, emit)}
          </div>
        </SubmenuPortal>
      )}
    </div>,
    document.body
  );
};

// ---------- main-row view ----------

const MainRowView: React.FC<{
  row: MainRow;
  isActive: boolean;
  onEnter: (target: HTMLElement) => void;
  onLeave: () => void;
  onClick?: () => void;
}> = ({ row, isActive, onEnter, onLeave, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  return (
    <div
      ref={ref}
      style={{
        ...rowStyle,
        background: isActive || hover ? COLORS.hover : "transparent",
      }}
      onMouseEnter={() => { setHover(true); if (ref.current) onEnter(ref.current); }}
      onMouseLeave={() => { setHover(false); onLeave(); }}
      onClick={() => {
        if (onClick) onClick();
        else if (ref.current) onEnter(ref.current);
      }}
    >
      <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {row.icon}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 400 }}>{row.label}</div>
      {row.submenu && (
        <div style={{ color: COLORS.textMuted, fontSize: 12, paddingLeft: 6 }}>▸</div>
      )}
    </div>
  );
};

// ---------- main menu icons (left-side thumbnails) ----------

const MainIcon: React.FC<{ bg: string; content: React.ReactNode }> = ({ bg, content }) => (
  <div style={{
    width: 28, height: 28, borderRadius: 6, background: bg, border: "1px solid rgba(0,0,0,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
  }}>
    {content}
  </div>
);

const ColorScalesMainIcon: React.FC = () => (
  <div style={{
    width: 28, height: 28, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column",
  }}>
    <div style={{ flex: 1, background: "linear-gradient(90deg,#dc2626,#fca5a5)" }} />
    <div style={{ flex: 1, background: "linear-gradient(90deg,#fef3c7,#fde68a)" }} />
    <div style={{ flex: 1, background: "linear-gradient(90deg,#86efac,#16a34a)" }} />
  </div>
);

const ClassificationMainGlyph: React.FC = () => (
  <div style={{
    width: 20, height: 20,
    display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 1,
  }}>
    {[0, 1, 2, 3].map(i => (
      <div key={i} style={{ background: "#6b7280", borderRadius: 1 }} />
    ))}
  </div>
);

const DataBarsMainIcon: React.FC = () => (
  <div style={{
    width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(0,0,0,0.06)",
    padding: 4, display: "flex", flexDirection: "column", gap: 2, background: "#fff",
  }}>
    <div style={{ height: 3, width: "40%", background: "#3b82f6" }} />
    <div style={{ height: 3, width: "70%", background: "#3b82f6" }} />
    <div style={{ height: 3, width: "55%", background: "#3b82f6" }} />
    <div style={{ height: 3, width: "85%", background: "#3b82f6" }} />
  </div>
);

const ActionAnalysisGlyph: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 20 20">
    <circle cx={10} cy={10} r={3} fill="#374151" />
    <circle cx={3} cy={4} r={1.5} fill="#6b7280" />
    <circle cx={17} cy={4} r={1.5} fill="#6b7280" />
    <circle cx={3} cy={16} r={1.5} fill="#6b7280" />
    <circle cx={17} cy={16} r={1.5} fill="#6b7280" />
    <line x1={10} y1={10} x2={3} y2={4} stroke="#9ca3af" strokeWidth={1} />
    <line x1={10} y1={10} x2={17} y2={4} stroke="#9ca3af" strokeWidth={1} />
    <line x1={10} y1={10} x2={3} y2={16} stroke="#9ca3af" strokeWidth={1} />
    <line x1={10} y1={10} x2={17} y2={16} stroke="#9ca3af" strokeWidth={1} />
  </svg>
);
