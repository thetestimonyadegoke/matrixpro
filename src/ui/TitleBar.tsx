import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TitleSettings } from "../settings/settings";

export interface TitleBarProps {
  settings: TitleSettings;
  allowInteractions: boolean;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

type TitlePresetStyle = {
  shell: React.CSSProperties;
  text: React.CSSProperties;
  accent?: React.CSSProperties;
  ornament?: React.CSSProperties;
  badge?: string;
};

const presetStyles = (): Record<TitleSettings["stylePreset"], TitlePresetStyle> => ({
  classic: {
    shell: { borderBottom: "1px solid rgba(15,23,42,0.08)", boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.35)", background: "linear-gradient(to bottom, #ffffff, #f8fafc)" },
    text: { fontWeight: 760, color: "#0f172a" },
    accent: { width: 4, height: "54%", borderRadius: 999, background: "var(--mx-accent, #2563eb)" },
  },
  editorial: {
    shell: { borderBottom: "2px solid #1a1a1a", padding: "12px 20px", background: "#fff" },
    text: { fontFamily: "'Iowan Old Style', Georgia, serif", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#1a1a1a" },
    accent: { width: "100%", height: 1, background: "#1a1a1a", position: "absolute", bottom: 4, left: 0 },
  },
  hero: {
    shell: { 
      background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
      color: "#fff",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
    },
    text: { fontWeight: 900, fontSize: "1.2em", letterSpacing: "-0.02em", color: "#fff" },
    ornament: { right: -20, top: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)", filter: "blur(20px)" },
  },
  capsule: {
    shell: { margin: "8px 12px", borderRadius: "999px", background: "rgba(15, 23, 42, 0.05)", border: "1px solid rgba(15, 23, 42, 0.1)", padding: "4px 16px" },
    text: { fontWeight: 600, fontSize: "0.95em", color: "#334155" },
    badge: "ALPHA",
  },
  mono: {
    shell: { background: "#0f172a", borderBottom: "1px solid #334155", fontFamily: "'Fira Code', monospace" },
    text: { color: "#38bdf8", fontWeight: 500, letterSpacing: "0.05em" },
    accent: { width: 12, height: 12, background: "#10b981", borderRadius: "2px", marginRight: 8 },
  },
  glow: {
    shell: { background: "#020617", borderBottom: "1px solid rgba(56, 189, 248, 0.2)" },
    text: { 
      color: "#f8fafc", 
      fontWeight: 800, 
      textShadow: "0 0 10px rgba(56, 189, 248, 0.8), 0 0 20px rgba(56, 189, 248, 0.4)" 
    },
    accent: { width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 15px #38bdf8" },
  },
  product: {
    shell: { 
      background: "radial-gradient(at top left, #fff, #f1f5f9)",
      borderBottom: "1px solid #e2e8f0"
    },
    text: { fontWeight: 800, color: "#0f172a", fontFamily: "Inter, sans-serif" },
    badge: "PRO",
    accent: { width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", marginRight: 12 },
  },
  executive: {
    shell: { background: "#1e293b", borderLeft: "6px solid #fbbf24", color: "#f8fafc" },
    text: { fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#f8fafc" },
  },
  spotlight: {
    shell: { background: "#fff", justifyContent: "center" },
    text: { fontWeight: 900, fontSize: "1.4em", textAlign: "center", background: "linear-gradient(to right, #1e293b, #64748b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    ornament: { bottom: 0, left: "25%", width: "50%", height: 4, background: "linear-gradient(to right, transparent, #3b82f6, transparent)" },
  },
  glass: {
    shell: { 
      background: "rgba(255, 255, 255, 0.4)", 
      backdropFilter: "blur(12px)", 
      borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    },
    text: { fontWeight: 700, color: "#1e293b" },
  },
  pill: {
    shell: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", margin: "10px", height: "calc(100% - 20px)" },
    text: { fontWeight: 800, color: "#0f172a", fontSize: "0.9em" },
    badge: "METRICS",
  },
  dashboard: {
    shell: { background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" },
    text: { fontWeight: 800, color: "#334155" },
    accent: { width: 20, height: 20, background: "#94a3b8", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" },
  },
  serif: {
    shell: { background: "#fffaf0", borderBottom: "1px solid #ed8936" },
    text: { fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, color: "#7b341e" },
  },
  banner: {
    shell: { background: "#ef4444", color: "#fff", textAlign: "center" },
    text: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#fff" },
  },
  minimal: {
    shell: { background: "transparent", border: "none" },
    text: { fontWeight: 400, color: "#64748b", fontSize: "0.85em" },
    accent: { width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" },
  },
});

export const TitleBar: React.FC<TitleBarProps> = ({
  settings,
  allowInteractions,
  onPersistProperty,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(settings.text);
  }, [settings.text, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    const next = draft.trim();
    if (next !== settings.text) {
      onPersistProperty("title", "text", next);
    }
    setEditing(false);
  }, [draft, onPersistProperty, settings.text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") {
      setDraft(settings.text);
      setEditing(false);
    }
  }, [commitEdit, settings.text]);

  const alignMap: Record<string, React.CSSProperties["textAlign"]> = {
    left: "left",
    center: "center",
    right: "right",
  };

  const preset = useMemo(() => {
    const presets = presetStyles();
    return presets[settings.stylePreset] || presets.classic;
  }, [settings.stylePreset]);
  const isCompact = settings.height <= 40;
  const baseFontSize = Math.max(12, settings.fontSize);

  const barStyle: React.CSSProperties = {
    minHeight: settings.height,
    height: settings.height,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: isCompact ? "0 12px" : "0 16px",
    backgroundColor: settings.backgroundColor,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    ...preset.shell,
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: baseFontSize,
    textAlign: alignMap[settings.alignment] ?? "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: allowInteractions ? "text" : "default",
    userSelect: "none",
    letterSpacing: `${settings.letterSpacing}px`,
    fontStyle: settings.italic ? "italic" : "normal",
    ...preset.text,
    color: settings.color,
    textTransform: settings.uppercase ? "uppercase" : preset.text.textTransform,
  };

  const inputStyle: React.CSSProperties = {
    ...textStyle,
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(15,23,42,0.12)",
    outline: "2px solid var(--mx-accent, #2563eb)",
    borderRadius: 10,
    padding: "6px 10px",
  };

  return (
    <div style={barStyle} className="mx-title-bar">
      {preset.ornament && <span aria-hidden="true" style={{ position: "absolute", pointerEvents: "none", ...preset.ornament }} />}
      {preset.accent && <span aria-hidden="true" style={{ flex: "0 0 auto", color: settings.color, ...preset.accent }} />}
      {editing ? (
        <input
          ref={inputRef}
          style={inputStyle}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          style={textStyle}
          onDoubleClick={() => allowInteractions && setEditing(true)}
          title={allowInteractions ? "Double-click to edit title" : undefined}
        >
          {settings.text || <span style={{ opacity: 0.45, fontWeight: 500, fontStyle: "italic" }}>Untitled</span>}
        </span>
      )}
      {preset.badge && !editing && (
        <span
          aria-hidden="true"
          style={{
            border: "1px solid rgba(15,23,42,0.12)",
            background: "rgba(255,255,255,0.52)",
            color: settings.color,
            borderRadius: 999,
            padding: "4px 8px",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
          }}
        >
          {preset.badge}
        </span>
      )}
    </div>
  );
};

TitleBar.displayName = "TitleBar";
