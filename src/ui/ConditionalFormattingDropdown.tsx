import React, { useState, useRef, useEffect } from "react";
import { VisualPortal } from "./overlayKit";
import { IconBars, IconCheck, IconChevronRight, IconPlus, IconSettings } from "./icons";

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

// ---------- main menu row ----------

interface MainRow {
  id: string;
  label: string;
  icon: React.ReactNode;
  submenu?: (closeAll: () => void, emit: (id: string) => void) => React.ReactNode;
  action?: string;
}

// ---------- previews (the colors here are the formats being offered) ----------

const QuickThumb: React.FC<{ kind: "pos" | "neg" }> = ({ kind }) => {
  const color = kind === "pos" ? "#2563eb" : "#dc2626";
  return (
    <span
      style={{
        width: 20, height: 20, border: `1.5px solid ${color}`, borderRadius: 4,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color,
      }}
    >
      {kind === "pos" ? ">" : "<"}
    </span>
  );
};

const BarStrip: React.FC<{ colors: string[] }> = ({ colors }) => (
  <span style={{ display: "flex", width: 168, height: 14, borderRadius: 3, overflow: "hidden" }}>
    {colors.map((c, i) => (
      <span key={i} style={{ flex: 1, background: c }} />
    ))}
  </span>
);

const GradientStrip: React.FC<{ from: string; to: string; via?: string }> = ({ from, to, via }) => (
  <span
    style={{
      display: "block", width: 168, height: 14, borderRadius: 3,
      background: via
        ? `linear-gradient(90deg, ${from}, ${via}, ${to})`
        : `linear-gradient(90deg, ${from}, ${to})`,
    }}
  />
);

const SolidBar: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ display: "block", width: 150, height: 12, borderRadius: 2, background: color }} />
);

const TextPreview: React.FC<{ tokens: { text: string; color: string }[] }> = ({ tokens }) => (
  <span style={{ display: "flex", gap: 10 }}>
    {tokens.map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: 700, fontSize: 12 }}>{t.text}</span>
    ))}
  </span>
);

const IconRow: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {items.map((el, i) => <span key={i} style={{ display: "inline-flex" }}>{el}</span>)}
  </span>
);

const Glyph: React.FC<{ color: string; bold?: boolean; children: React.ReactNode }> = ({ color, bold, children }) => (
  <span style={{ color, fontSize: 14, lineHeight: 1, fontWeight: bold ? 700 : 400 }}>{children}</span>
);
const Check = ({ color }: { color: string }) => <Glyph color={color} bold>✓</Glyph>;
const Excl = ({ color }: { color: string }) => <Glyph color={color} bold>!</Glyph>;
const Cross = ({ color }: { color: string }) => <Glyph color={color} bold>✕</Glyph>;
const Flag = ({ color }: { color: string }) => <Glyph color={color}>⚑</Glyph>;
const ArrowUp = ({ color }: { color: string }) => <Glyph color={color}>↑</Glyph>;
const ArrowRight = ({ color }: { color: string }) => <Glyph color={color}>→</Glyph>;
const ArrowDown = ({ color }: { color: string }) => <Glyph color={color}>↓</Glyph>;
const ArrowUR = ({ color }: { color: string }) => <Glyph color={color}>↗</Glyph>;
const ArrowDR = ({ color }: { color: string }) => <Glyph color={color}>↘</Glyph>;

// Rating glyphs are monochrome: they follow the text color.
const RatingSquare: React.FC<{ filled: number }> = ({ filled }) => (
  <span style={{
    display: "inline-block", width: 13, height: 13, border: "1.5px solid currentColor",
    background: filled >= 0.999 ? "currentColor" : "transparent",
  }} />
);
const RatingStar: React.FC<{ filled: boolean }> = ({ filled }) => (
  <span style={{ fontSize: 14, lineHeight: 1 }}>{filled ? "★" : "☆"}</span>
);
const RatingCircle: React.FC<{ filled: number }> = ({ filled }) => {
  const angle = Math.round(filled * 360);
  return (
    <span
      style={{
        display: "inline-block", width: 13, height: 13, borderRadius: "50%",
        border: "1.5px solid currentColor",
        background: filled >= 0.999
          ? "currentColor"
          : filled <= 0
            ? "transparent"
            : `conic-gradient(currentColor 0deg ${angle}deg, transparent ${angle}deg 360deg)`,
      }}
    />
  );
};

// ---------- submenu renderers ----------

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-popover-heading">{children}</div>
);

const QuickRuleSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <>
    <SubRow icon={<QuickThumb kind="pos" />} label="Positive" onClick={() => onSelect(CF_ACTION_IDS.QUICK_POSITIVE)} />
    <SubRow icon={<QuickThumb kind="neg" />} label="Negative" onClick={() => onSelect(CF_ACTION_IDS.QUICK_NEGATIVE)} />
  </>
);

const ColorScalesSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <>
    <Heading>Sequential</Heading>
    <SubRow title="Sequential blue" icon={<BarStrip colors={["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_BLUE)} />
    <SubRow title="Sequential orange" icon={<BarStrip colors={["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_ORANGE)} />
    <SubRow title="Sequential green" icon={<BarStrip colors={["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_SEQ_GREEN)} />

    <Heading>Qualitative</Heading>
    <SubRow title="Qualitative cool" icon={<BarStrip colors={["#10b981", "#7c3aed", "#ef4444", "#eab308", "#3b82f6", "#6b7280"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_QUAL_COOL)} />
    <SubRow title="Qualitative earth" icon={<BarStrip colors={["#93c5fd", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5", "#a8a29e"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_QUAL_EARTH)} />

    <Heading>Diverging</Heading>
    <SubRow title="Red, white, green" icon={<BarStrip colors={["#b91c1c", "#f87171", "#fef3c7", "#86efac", "#166534"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_RWG)} />
    <SubRow title="Red, white, blue" icon={<BarStrip colors={["#b91c1c", "#fca5a5", "#fef9c3", "#bae6fd", "#1d4ed8"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_RWB)} />
    <SubRow title="Brown, cyan, teal" icon={<BarStrip colors={["#854d0e", "#d97706", "#ecfeff", "#22d3ee", "#0e7490"]} />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_DIV_BYG)} />

    <Heading>Continuous</Heading>
    <SubRow title="Continuous warm" icon={<GradientStrip from="#f97316" to="#be123c" />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_CONT_WARM)} />

    <Heading>Continuous diverging</Heading>
    <SubRow title="Continuous diverging" icon={<GradientStrip from="#ef4444" via="#ffffff" to="#6366f1" />} onClick={() => onSelect(CF_ACTION_IDS.SCALE_CONT_DIV)} />
  </>
);

const ClassificationSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <>
    <Heading>Text</Heading>
    <SubRow
      title="A, B, C"
      icon={<TextPreview tokens={[{ text: "A", color: "#16a34a" }, { text: "B", color: "#f97316" }, { text: "C", color: "#dc2626" }]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_TEXT_ABC)}
    />
    <SubRow
      title="High, medium, low"
      icon={<TextPreview tokens={[{ text: "HIGH", color: "#16a34a" }, { text: "MEDIUM", color: "#f97316" }, { text: "LOW", color: "#dc2626" }]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_TEXT_LEVELS)}
    />

    <Heading>Icon set</Heading>
    <SubRow title="Check, warning, cross" icon={<IconRow items={[<Check color="#16a34a" />, <Excl color="#f97316" />, <Cross color="#dc2626" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_CHECK)} />
    <SubRow title="Flags" icon={<IconRow items={[<Flag color="#dc2626" />, <Flag color="#f59e0b" />, <Flag color="#16a34a" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_FLAGS)} />
    <SubRow title="3 arrows" icon={<IconRow items={[<ArrowUp color="#f59e0b" />, <ArrowRight color="#f59e0b" />, <ArrowDown color="#f59e0b" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_ARROWS3)} />
    <SubRow title="5 arrows" icon={<IconRow items={[<ArrowUp color="#16a34a" />, <ArrowUR color="#16a34a" />, <ArrowRight color="#f59e0b" />, <ArrowDR color="#dc2626" />, <ArrowDown color="#dc2626" />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_ICON_ARROWS5)} />

    <Heading>Rating</Heading>
    <SubRow title="Squares" icon={<IconRow items={[<RatingSquare filled={0} />, <RatingSquare filled={1} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_SQUARES)} />
    <SubRow title="Stars" icon={<IconRow items={[<RatingStar filled={false} />, <RatingStar filled={true} />, <RatingStar filled={true} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_STARS)} />
    <SubRow title="Circles" icon={<IconRow items={[<RatingCircle filled={0} />, <RatingCircle filled={0.25} />, <RatingCircle filled={0.5} />, <RatingCircle filled={0.75} />, <RatingCircle filled={1} />]} />}
      onClick={() => onSelect(CF_ACTION_IDS.CLASS_RATING_CIRCLES)} />
  </>
);

const DataBarsSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <>
    <SubRow title="Blue bars" icon={<SolidBar color="#3b82f6" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_BLUE)} />
    <SubRow title="Green bars" icon={<SolidBar color="#22c55e" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_GREEN)} />
    <SubRow title="Red bars" icon={<SolidBar color="#fb7185" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_RED)} />
    <SubRow title="Orange bars" icon={<SolidBar color="#f59e0b" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_ORANGE)} />
    <SubRow title="Pink bars" icon={<SolidBar color="#ec4899" />} onClick={() => onSelect(CF_ACTION_IDS.BAR_PINK)} />
  </>
);

const ActionAnalysisSubmenu: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => (
  <>
    <SubRow
      icon={<span style={{ display: "inline-block", width: 12, height: 12, background: "#3b82f6", borderRadius: "50%" }} />}
      label="Action dot"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_DOT)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 14, height: 14, background: "linear-gradient(135deg,#22c55e,#eab308,#dc2626)", borderRadius: 3 }} />}
      label="Action color"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_COLOR)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 14, height: 14, background: "radial-gradient(circle, #3b82f6 50%, transparent 52%)" }} />}
      label="Bubble chart"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_BUBBLE_CHART)}
    />
    <SubRow
      icon={<span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: "50%" }} />}
      label="Bubble only"
      onClick={() => onSelect(CF_ACTION_IDS.ACTION_BUBBLE_ONLY)}
    />
  </>
);

// ---------- sub-row primitive ----------

const SubRow: React.FC<{ icon: React.ReactNode; label?: string; title?: string; onClick: () => void }> = ({ icon, label, title, onClick }) => (
  <button
    type="button"
    className="mx-popover-item"
    title={title}
    aria-label={label ? undefined : title}
    onClick={onClick}
  >
    {label ? (
      <>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, flexShrink: 0 }}>{icon}</span>
        <span className="mx-popover-label">{label}</span>
      </>
    ) : (
      <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
    )}
  </button>
);

// ---------- main menu icons ----------

const ColorScaleSwatch: React.FC = () => (
  <span style={{ display: "block", width: 14, height: 10, borderRadius: 2, background: "linear-gradient(90deg,#dc2626,#fde68a,#16a34a)" }} />
);

const QuickGlyph: React.FC = () => (
  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>&gt;</span>
);

const DotGlyph: React.FC = () => (
  <span style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />
);

// ---------- main dropdown ----------

export const ConditionalFormattingDropdown: React.FC<ConditionalFormattingDropdownProps> = ({
  anchor, onClose, onSelect,
}) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ id: string; rect: DOMRect } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Close when clicking outside both main and submenu
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
      label: "Quick rule",
      icon: <QuickGlyph />,
      submenu: () => <QuickRuleSubmenu onSelect={emit} />,
    },
    {
      id: "color-scales",
      label: "Color scales",
      icon: <ColorScaleSwatch />,
      submenu: () => <ColorScalesSubmenu onSelect={emit} />,
    },
    {
      id: "classification",
      label: "Classification",
      icon: <IconCheck size={14} />,
      submenu: () => <ClassificationSubmenu onSelect={emit} />,
    },
    {
      id: "data-bars",
      label: "Data bars",
      icon: <IconBars size={14} />,
      submenu: () => <DataBarsSubmenu onSelect={emit} />,
    },
    {
      id: "action-analysis",
      label: "Action analysis",
      icon: <DotGlyph />,
      submenu: () => <ActionAnalysisSubmenu onSelect={emit} />,
    },
  ];

  const bottomRows: MainRow[] = [
    {
      id: "create-rule",
      label: "New rule…",
      icon: <IconPlus size={14} />,
      action: CF_ACTION_IDS.CREATE_RULE,
    },
    {
      id: "manage-rules",
      label: "Manage rules…",
      icon: <IconSettings size={14} />,
      action: CF_ACTION_IDS.MANAGE_RULES,
    },
  ];

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const menuLeft = Math.min(anchor.left, viewportW - 260);

  // Submenu placement: to the right of the hovered row, or flipped left when it won't fit.
  const submenuWidth = 280;
  const subLeft = active
    ? (viewportW - active.rect.right >= submenuWidth + 8
      ? active.rect.right + 4
      : Math.max(8, active.rect.left - submenuWidth - 4))
    : 0;

  return (
    <VisualPortal>
      <div
        ref={mainRef}
        className="mx-popover"
        role="menu"
        aria-label="Conditional formatting"
        style={{ top: anchor.bottom + 4, left: Math.max(8, menuLeft), minWidth: 220 }}
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
        <div className="mx-popover-sep" />
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
      </div>

      {active && (
        <div
          data-cf-submenu="true"
          className="mx-popover"
          role="menu"
          style={{ top: Math.max(8, active.rect.top - 6), left: subLeft, zIndex: 100001, minWidth: 180 }}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleCloseSub}
        >
          {rows.find(r => r.id === active.id)?.submenu?.(onClose, emit)}
        </div>
      )}
    </VisualPortal>
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
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-haspopup={row.submenu ? "menu" : undefined}
      aria-expanded={row.submenu ? isActive : undefined}
      className={`mx-popover-item${isActive ? " is-active" : ""}`}
      onMouseEnter={() => { if (ref.current) onEnter(ref.current); }}
      onMouseLeave={onLeave}
      onClick={() => {
        if (onClick) onClick();
        else if (ref.current) onEnter(ref.current);
      }}
    >
      <span className="mx-popover-icon">{row.icon}</span>
      <span className="mx-popover-label">{row.label}</span>
      {row.submenu && (
        <span className="mx-popover-hint" style={{ display: "inline-flex" }}><IconChevronRight size={12} /></span>
      )}
    </button>
  );
};
