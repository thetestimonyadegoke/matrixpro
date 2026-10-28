import React, { useMemo } from "react";
import { ThemePresetId } from "../settings/settings";
import { THEMES, THEME_ORDER, ThemeSpec } from "./themes";
import { Overlay } from "./overlayKit";

export interface ThemeGalleryProps {
  open: boolean;
  currentPreset: ThemePresetId;
  onClose: () => void;
  onApply: (preset: ThemePresetId) => void;
}

/**
 * Live-preview theme picker. Renders one card per preset with a miniature
 * 5-row × 3-col matrix rendered in the theme's own palette so the user can
 * see at a glance how the theme looks before committing.
 */
export const ThemeGallery: React.FC<ThemeGalleryProps> = ({
  open,
  currentPreset,
  onClose,
  onApply,
}) => {
  if (!open) return null;

  return (
    <Overlay
      kind="dialog"
      title="Themes"
      subtitle="Each preview uses the theme's own palette and type."
      width={920}
      onClose={onClose}
    >
      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {THEME_ORDER.map((preset) => {
          const spec = THEMES[preset];
          const active = preset === currentPreset;
          return (
            <ThemeCard
              key={preset}
              preset={preset}
              spec={spec}
              active={active}
              onSelect={() => {
                onApply(preset);
                onClose();
              }}
            />
          );
        })}
      </div>
    </Overlay>
  );
};

ThemeGallery.displayName = "ThemeGallery";

// ---------------------------------------------------------------------------
// Card + miniature
// ---------------------------------------------------------------------------

interface ThemeCardProps {
  preset: ThemePresetId;
  spec: ThemeSpec;
  active: boolean;
  onSelect: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ preset: _preset, spec, active, onSelect }) => {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onSelect}
      aria-pressed={active}
      className={"mx-item is-clickable" + (active ? " is-selected" : "")}
      style={{
        font: "inherit",
        textAlign: "left",
        flexDirection: "column",
        alignItems: "stretch",
        padding: 10,
        gap: 8,
      }}
    >
      <MiniMatrix spec={spec} />
      <div className="mx-row is-between">
        <div className="mx-item-main">
          <span className="mx-item-title">{spec.label}</span>
          <span className="mx-item-meta">{spec.description}</span>
        </div>
        {active && <span className="mx-badge is-accent">Current</span>}
      </div>
    </button>
  );
};

const MiniMatrix: React.FC<{ spec: ThemeSpec }> = ({ spec }) => {
  // Fabricate a tiny 5-row × 3-col dataset so each preview shows realistic
  // numeric and text content.
  const rows = useMemo(
    () => [
      { label: "Revenue", a: "1.2M", b: "950K", c: "+26%" },
      { label: "COGS", a: "480K", b: "410K", c: "+17%" },
      { label: "Gross Profit", a: "720K", b: "540K", c: "+33%" },
      { label: "OpEx", a: "260K", b: "230K", c: "+13%" },
    ],
    []
  );
  const totalRow = { label: "Net Income", a: "460K", b: "310K", c: "+48%" };

  const borderCss = spec.borderStyle === "none"
    ? "none"
    : `1px ${spec.borderStyle} ${spec.gridColor}`;

  const cellBase: React.CSSProperties = {
    padding: "3px 6px",
    fontSize: 10,
    fontFamily: spec.fontFamily,
    color: spec.cellFg,
    borderRight: borderCss,
    borderBottom: borderCss,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div
      aria-hidden
      style={{
        borderRadius: 6,
        overflow: "hidden",
        border: spec.borderStyle === "none" ? "1px solid var(--mx-ov-line)" : `1px ${spec.borderStyle} ${spec.gridColor}`,
        background: spec.rowBandEven,
        fontFamily: spec.fontFamily,
      }}
    >
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.9fr", background: spec.headerBg }}>
        {["Item", "2024", "2023", "Δ"].map((h) => (
          <div
            key={h}
            style={{
              ...cellBase,
              color: spec.headerFg,
              fontWeight: spec.headerFontWeight,
              borderBottom: borderCss,
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 0.9fr",
            background: i % 2 === 0 ? spec.rowBandEven : spec.rowBandOdd,
          }}
        >
          <div style={cellBase}>{r.label}</div>
          <div style={{ ...cellBase, textAlign: "right" }}>{r.a}</div>
          <div style={{ ...cellBase, textAlign: "right" }}>{r.b}</div>
          <div style={{ ...cellBase, textAlign: "right", color: spec.accent, fontWeight: 600 }}>{r.c}</div>
        </div>
      ))}
      {/* Total */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 0.9fr",
          background: spec.totalBg,
          borderTop: `2px ${spec.borderStyle === "none" ? "solid" : spec.borderStyle} ${spec.gridColor === "transparent" ? spec.accent : spec.gridColor}`,
        }}
      >
        <div style={{ ...cellBase, color: spec.totalFg, fontWeight: 700 }}>{totalRow.label}</div>
        <div style={{ ...cellBase, color: spec.totalFg, fontWeight: 700, textAlign: "right" }}>{totalRow.a}</div>
        <div style={{ ...cellBase, color: spec.totalFg, fontWeight: 700, textAlign: "right" }}>{totalRow.b}</div>
        <div style={{ ...cellBase, color: spec.accent, fontWeight: 700, textAlign: "right" }}>{totalRow.c}</div>
      </div>
    </div>
  );
};
