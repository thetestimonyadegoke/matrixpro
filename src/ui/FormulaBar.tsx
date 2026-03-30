import React, { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import { FormulaEditor } from "./IntelliSenseDropdown";
import { IntelliSenseContext } from "../intellisense/FormulaIntelliSense";

export interface FormulaBarRef {
  insertCellReference: (reference: string) => void;
  focus: () => void;
  blur: () => void;
}

export interface FormulaBarProps {
  value: string;
  activeCellLabel: string;
  onCommit: (newValue: string) => void;
  onCancel: () => void;
  onFocus?: () => void;
  context: IntelliSenseContext;
  onEditModeChange?: (isEditing: boolean) => void;
  onInsertReference?: (reference: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const FormulaBar = forwardRef<FormulaBarRef, FormulaBarProps>(({
  value,
  activeCellLabel,
  onCommit,
  onCancel,
  onFocus,
  context,
  onEditModeChange,
  onInsertReference,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}, ref) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    onEditModeChange?.(isEditing);
  }, [isEditing, onEditModeChange]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    // Intentionally keep edit mode active when focus moves, so that
    // clicking cells can continue to insert references into the formula bar.
  }, []);

  const handleChange = useCallback((newValue: string) => {
    setInternalValue(newValue);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCommit(internalValue);
      setIsEditing(false);
    } else if (e.key === "Escape") {
      onCancel();
      setIsEditing(false);
    }
  }, [internalValue, onCommit, onCancel]);

  const insertCellReference = useCallback((reference: string) => {
    if (!isEditing) return;

    // Get current cursor position from the textarea
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || internalValue.length;
    const end = textarea.selectionEnd || internalValue.length;

    // Insert reference at cursor position
    const before = internalValue.substring(0, start);
    const after = internalValue.substring(end);
    const newValue = before + reference + after;

    setInternalValue(newValue);

    // Move cursor after inserted reference
    setTimeout(() => {
      const newPosition = start + reference.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
    
    // Notify parent
    onInsertReference?.(reference);
  }, [isEditing, internalValue, onInsertReference]);

  // Expose imperative handle for parent component
  useImperativeHandle(ref, () => ({
    insertCellReference,
    focus: () => editorRef.current?.focus(),
    blur: () => editorRef.current?.blur(),
  }), [insertCellReference]);

  return (
    <div className="matrix-formula-bar" onClick={handleFocus}>
      <div className="formula-bar-address">
        {activeCellLabel || "A1"}
      </div>
      <div className="formula-bar-fx">
        fx
      </div>
      <div className="formula-bar-input-wrapper">
        <FormulaEditor
          value={internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          context={context}
          placeholder="Enter value or formula (e.g. = [Measure] * 2)"
          rows={1}
          className="formula-bar-editor"
          textareaRef={editorRef}
        />
      </div>
      <div className="formula-bar-actions">
        {onUndo && (
          <button
            className="formula-bar-btn undo"
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            disabled={canUndo === false}
            title="Undo last edit"
          >
            ⟲
          </button>
        )}
        {onRedo && (
          <button
            className="formula-bar-btn redo"
            onClick={(e) => {
              e.stopPropagation();
              onRedo();
            }}
            disabled={canRedo === false}
            title="Redo edit"
          >
            ⟳
          </button>
        )}
        {internalValue !== value && (
          <>
            <button className="formula-bar-btn cancel" onClick={onCancel} title="Cancel (Esc)">
              ✕
            </button>
            <button className="formula-bar-btn commit" onClick={() => onCommit(internalValue)} title="Commit (Enter)">
              ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
});

FormulaBar.displayName = "FormulaBar";
