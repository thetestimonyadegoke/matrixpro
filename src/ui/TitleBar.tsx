/**
 * TitleBar — custom in-visual title that the report author can switch on/off
 * and configure via the Power BI format pane (settings.title.*).
 *
 * Double-clicking the text enters inline-edit mode so the title can be
 * changed without leaving the visual.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TitleSettings } from "../settings/settings";

export interface TitleBarProps {
  settings: TitleSettings;
  allowInteractions: boolean;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  settings,
  allowInteractions,
  onPersistProperty,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if external settings change (e.g. via format pane)
  useEffect(() => {
    if (!editing) setDraft(settings.text);
  }, [settings.text, editing]);

  const commitEdit = useCallback(() => {
    const next = draft.trim();
    if (next !== settings.text) {
      onPersistProperty("title", "text", next);
    }
    setEditing(false);
  }, [draft, settings.text, onPersistProperty]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") {
      setDraft(settings.text);
      setEditing(false);
    }
  }, [commitEdit, settings.text]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const alignMap: Record<string, React.CSSProperties["textAlign"]> = {
    left: "left",
    center: "center",
    right: "right",
  };

  const barStyle: React.CSSProperties = {
    height: settings.height,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    backgroundColor: settings.backgroundColor,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    fontSize: settings.fontSize,
    color: settings.color,
    fontWeight: 600,
    textAlign: alignMap[settings.alignment] ?? "left",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: allowInteractions ? "text" : "default",
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    fontSize: settings.fontSize,
    color: settings.color,
    fontWeight: 600,
    textAlign: alignMap[settings.alignment] ?? "left",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "transparent",
    border: "none",
    outline: "2px solid var(--mx-accent, #2563eb)",
    borderRadius: 3,
    padding: "2px 4px",
    width: "100%",
    boxSizing: "border-box",
  };

  const actionButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(255,255,255,0.72)",
    color: settings.color,
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 11,
    cursor: allowInteractions ? "pointer" : "not-allowed",
    marginLeft: 8,
  };

  return (
    <div style={barStyle} className="mx-title-bar">
      {editing ? (
        <input
          ref={inputRef}
          style={inputStyle}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          style={textStyle}
          onDoubleClick={() => allowInteractions && setEditing(true)}
          title={allowInteractions ? "Double-click to edit title" : undefined}
        >
          {settings.text || <span style={{ opacity: 0.4, fontWeight: 400, fontStyle: "italic" }}>Untitled</span>}
        </span>
      )}
      {allowInteractions && !editing && (
        <>
          <button
            type="button"
            style={actionButtonStyle}
            onClick={() => setEditing(true)}
            title="Edit visual title"
          >
            Edit
          </button>
          <button
            type="button"
            style={actionButtonStyle}
            onClick={() => onPersistProperty("title", "show", false)}
            title="Hide visual title"
          >
            Hide
          </button>
        </>
      )}
    </div>
  );
};

TitleBar.displayName = "TitleBar";
