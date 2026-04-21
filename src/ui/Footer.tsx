import React, { useState, useRef, useEffect } from "react";
import { ToolbarMode } from "./Ribbon";

interface FooterProps {
  rowCount: number;
  zoomLevel: number;
  toolbarMode: ToolbarMode;
  explorerOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomSet: (level: number) => void;
  onToolbarModeChange: (mode: ToolbarMode) => void;
  onToggleExplorer: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  rowCount, zoomLevel, toolbarMode, explorerOpen,
  onZoomIn, onZoomOut, onZoomReset, onZoomSet, onToolbarModeChange, onToggleExplorer,
}) => {
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [zoomEditing, setZoomEditing] = useState(false);
  const [zoomInput, setZoomInput] = useState(String(zoomLevel));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modeMenuOpen) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setModeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [modeMenuOpen]);

  useEffect(() => {
    if (!zoomEditing) setZoomInput(String(zoomLevel));
  }, [zoomLevel, zoomEditing]);

  const commitZoom = () => {
    const parsed = parseInt(zoomInput, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(50, Math.min(200, parsed));
      if (clamped !== zoomLevel) onZoomSet(clamped);
    }
    setZoomEditing(false);
  };

  const modeLabels: Record<ToolbarMode, string> = {
    "full": "Full Toolbar",
    "minimal": "Minimal",
    "minimal-tabs": "Minimal + Tabs",
  };

  const footerStyle: React.CSSProperties = {
    height: 28,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    fontSize: 11,
    color: "#4b5563",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    zIndex: 50,
  };

  const iconBtn: React.CSSProperties = {
    background: "transparent", border: "none", cursor: "pointer",
    padding: "2px 6px", borderRadius: 3, color: "#4b5563",
    fontSize: 13, lineHeight: 1, display: "inline-flex", alignItems: "center",
  };

  return (
    <div style={footerStyle} className="mx-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>Total rows: <strong style={{ color: "#111827" }}>{rowCount.toLocaleString()}</strong></span>
        <span style={{ color: "#d1d5db" }}>|</span>
        <button
          onClick={onToggleExplorer}
          style={{ ...iconBtn, fontWeight: explorerOpen ? 600 : 400, color: explorerOpen ? "#2563eb" : "#4b5563" }}
          title="Toggle Explorer"
        >
          {explorerOpen ? "◨" : "◧"} Explorer
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }} ref={menuRef}>
        {/* Toolbar mode switcher */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setModeMenuOpen(v => !v)}
            style={iconBtn}
            title="Change toolbar mode"
          >
            ⚙ {modeLabels[toolbarMode]} ▾
          </button>
          {modeMenuOpen && (
            <div style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 4,
              background: "#fff", border: "1px solid #d1d5db", borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 170, padding: 4,
              zIndex: 9999,
            }}>
              {(Object.keys(modeLabels) as ToolbarMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { onToolbarModeChange(m); setModeMenuOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "6px 12px", background: toolbarMode === m ? "#eff6ff" : "transparent",
                    color: toolbarMode === m ? "#1d4ed8" : "#374151",
                    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
                    fontWeight: toolbarMode === m ? 600 : 400,
                  }}
                >
                  {toolbarMode === m ? "✓ " : "  "}{modeLabels[m]}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ color: "#d1d5db" }}>|</span>

        {/* Zoom controls */}
        <button
          onClick={onZoomOut}
          disabled={zoomLevel <= 50}
          style={{ ...iconBtn, fontSize: 14, fontWeight: 700, opacity: zoomLevel <= 50 ? 0.4 : 1 }}
          title="Zoom out"
        >−</button>
        {zoomEditing ? (
          <input
            type="number"
            value={zoomInput}
            onChange={(e) => setZoomInput(e.target.value)}
            onBlur={commitZoom}
            onKeyDown={(e) => { if (e.key === "Enter") commitZoom(); if (e.key === "Escape") setZoomEditing(false); }}
            autoFocus
            style={{ width: 50, fontSize: 11, padding: "2px 4px", border: "1px solid #2563eb", borderRadius: 3, textAlign: "center" }}
          />
        ) : (
          <button
            onClick={() => { setZoomInput(String(zoomLevel)); setZoomEditing(true); }}
            style={{ ...iconBtn, minWidth: 50, justifyContent: "center", border: "1px solid #d1d5db", borderRadius: 3, fontSize: 11 }}
            title="Click to reset (double-click to edit)"
            onDoubleClick={onZoomReset}
          >{zoomLevel}%</button>
        )}
        <button
          onClick={onZoomIn}
          disabled={zoomLevel >= 200}
          style={{ ...iconBtn, fontSize: 14, fontWeight: 700, opacity: zoomLevel >= 200 ? 0.4 : 1 }}
          title="Zoom in"
        >+</button>
      </div>
    </div>
  );
};
