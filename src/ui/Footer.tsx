import React, { useState, useEffect } from "react";
import { IconUndo, IconRedo, IconExplorer } from "./icons";

interface FooterProps {
  rowCount: number;
  zoomLevel: number;
  explorerOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSet: (level: number) => void;
  onToggleExplorer: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRefresh: () => void;
  allowInteractions: boolean;
}

/** Status bar: what you're looking at on the left, how you're looking at it on the right. */
export const Footer: React.FC<FooterProps> = ({
  rowCount, zoomLevel, explorerOpen,
  onZoomIn, onZoomOut, onZoomSet, onToggleExplorer,
  canUndo, canRedo, onUndo, onRedo, onRefresh, allowInteractions,
}) => {
  const [zoomEditing, setZoomEditing] = useState(false);
  const [zoomInput, setZoomInput] = useState(String(zoomLevel));

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

  return (
    <div className="mx-footer" role="status">
      <div className="mx-footer-side">
        <span className="mx-footer-count">{rowCount.toLocaleString()} {rowCount === 1 ? "row" : "rows"}</span>
        <span className="mx-footer-sep" aria-hidden="true" />
        <button type="button" className="mx-footer-btn" onClick={onUndo} disabled={!canUndo || !allowInteractions} title="Undo (Ctrl+Z)" aria-label="Undo">
          <IconUndo size={14} />
        </button>
        <button type="button" className="mx-footer-btn" onClick={onRedo} disabled={!canRedo || !allowInteractions} title="Redo (Ctrl+Y)" aria-label="Redo">
          <IconRedo size={14} />
        </button>
        <button type="button" className="mx-footer-btn" onClick={onRefresh} disabled={!allowInteractions} title="Recalculate layout" aria-label="Recalculate layout">
          <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>↻</span>
        </button>
      </div>

      <div className="mx-footer-side">
        <button
          type="button"
          className={`mx-footer-btn has-label ${explorerOpen ? "is-active" : ""}`}
          onClick={onToggleExplorer}
          aria-pressed={explorerOpen}
          title="Show or hide the field explorer"
        >
          <IconExplorer size={14} />
          <span>Fields</span>
        </button>
        <span className="mx-footer-sep" aria-hidden="true" />
        <button type="button" className="mx-footer-btn" onClick={onZoomOut} disabled={zoomLevel <= 50} title="Zoom out" aria-label="Zoom out">−</button>
        {zoomEditing ? (
          <input
            type="number"
            className="mx-footer-zoom-input"
            value={zoomInput}
            min={50}
            max={200}
            onChange={(e) => setZoomInput(e.target.value)}
            onBlur={commitZoom}
            onKeyDown={(e) => { if (e.key === "Enter") commitZoom(); if (e.key === "Escape") setZoomEditing(false); }}
            autoFocus
            aria-label="Zoom percent"
          />
        ) : (
          <button
            type="button"
            className="mx-footer-btn mx-footer-zoom"
            onClick={() => { setZoomInput(String(zoomLevel)); setZoomEditing(true); }}
            title="Type a zoom level"
          >
            {zoomLevel}%
          </button>
        )}
        <button type="button" className="mx-footer-btn" onClick={onZoomIn} disabled={zoomLevel >= 200} title="Zoom in" aria-label="Zoom in">+</button>
      </div>
    </div>
  );
};
