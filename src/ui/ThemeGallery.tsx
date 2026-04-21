import React, { useMemo } from "react";
import { ThemePresetId } from "../settings/settings";
import { THEMES, THEME_ORDER, ThemeSpec } from "./themes";

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Theme Gallery"
      className="theme-gallery-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="theme-gallery-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 92vw)",
          maxHeight: "86vh",
          background: "#ffffff",
          borderRadius: 10,
          boxShadow: "0 24px 48px rgba(15,23,42,0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Theme Gallery</h2>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Choose a design — preview matrices reflect each theme's palette and typography
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              fontSize: 18,
              color: "#6b7280",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </header>

        <div
          className="theme-gallery-grid"
          style={{
            padding: 16,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
            background: "#f9fafb",
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

        <footer
          style={{
            padding: "10px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            background: "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 14px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
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
      onClick={onSelect}
      aria-pressed={active}
      style={{
        textAlign: "left",
        padding: 10,
        background: "#ffffff",
        border: active ? `2px solid ${spec.accent}` : "1px solid #e5e7eb",
        borderRadius: 8,
        cursor: "pointer",
        boxShadow: active ? `0 0 0 3px ${hexWithAlpha(spec.accent, 0.2)}` : "none",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <MiniMatrix spec={spec} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{spec.label}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{spec.description}</div>
        </div>
        {active && (
          <span
            aria-label="selected"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: spec.accent,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ✓
          </span>
        )}
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
        border: spec.borderStyle === "none" ? "1px solid #e5e7eb" : `1px ${spec.borderStyle} ${spec.gridColor}`,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a #rrggbb colour to rgba(r,g,b,a). Non-hex inputs are returned
 * unchanged — caller is responsible for providing a reasonable fallback.
 */
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
