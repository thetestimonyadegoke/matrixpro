import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FormulaIntelliSense,
  Suggestion,
  FunctionSignature,
  FORMULA_FUNCTIONS,
  IntelliSenseContext,
} from "../intellisense/FormulaIntelliSense";

export interface IntelliSenseDropdownProps {
  context: IntelliSenseContext;
  value: string;
  cursorPosition: number;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

export const IntelliSenseDropdown: React.FC<IntelliSenseDropdownProps> = ({
  context,
  value,
  cursorPosition,
  onSelect,
  onClose,
  anchorRect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredFunction, setHoveredFunction] = useState<FunctionSignature | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const intelliSense = useMemo(() => new FormulaIntelliSense(context), [context]);

  const suggestions = useMemo(() => {
    return intelliSense.getSuggestions(value, cursorPosition);
  }, [intelliSense, value, cursorPosition]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  useEffect(() => {
    if (listRef.current && suggestions.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, suggestions.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          onSelect(suggestions[selectedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [suggestions, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleMouseEnter = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === "function") {
      const sig = FORMULA_FUNCTIONS.find(f => f.name === suggestion.label);
      setHoveredFunction(sig || null);
    } else {
      setHoveredFunction(null);
    }
  }, []);

  if (suggestions.length === 0 || !anchorRect) {
    return null;
  }

  const style: React.CSSProperties = {
    position: "fixed",
    left: anchorRect.left,
    top: anchorRect.bottom + 4,
    zIndex: 10003,
  };

  return (
    <div className="intellisense-dropdown" style={style}>
      <div className="intellisense-list" ref={listRef}>
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${suggestion.label}`}
            className={`intellisense-item ${index === selectedIndex ? "selected" : ""}`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => {
              setSelectedIndex(index);
              handleMouseEnter(suggestion);
            }}
          >
            <span className={`intellisense-icon ${suggestion.type}`}>
              {getTypeIcon(suggestion.type)}
            </span>
            <span className="intellisense-label">{suggestion.label}</span>
            {suggestion.detail && (
              <span className="intellisense-detail">{suggestion.detail}</span>
            )}
          </div>
        ))}
      </div>

      {hoveredFunction && (
        <div className="intellisense-signature">
          <div className="intellisense-sig-header">{hoveredFunction.signature}</div>
          <div className="intellisense-sig-desc">{hoveredFunction.description}</div>
          {hoveredFunction.parameters.length > 0 && (
            <div className="intellisense-sig-params">
              {hoveredFunction.parameters.map((param, i) => (
                <div key={i} className="intellisense-sig-param">
                  <span className="param-name">{param.name}</span>
                  {param.optional && <span className="param-optional">?</span>}
                  <span className="param-desc">{param.description}</span>
                </div>
              ))}
            </div>
          )}
          <div className="intellisense-sig-return">
            Returns: <code>{hoveredFunction.returnType}</code>
          </div>
        </div>
      )}
    </div>
  );
};

function getTypeIcon(type: string): string {
  switch (type) {
    case "measure":
      return "M";
    case "calculatedMeasure":
      return "Σ";
    case "column":
      return "C";
    case "row":
      return "R";
    case "rowPath":
      return "⟂";
    case "function":
      return "ƒ";
    case "shortcut":
      return "→";
    case "operator":
      return "±";
    default:
      return "•";
  }
}

IntelliSenseDropdown.displayName = "IntelliSenseDropdown";

export interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  context: IntelliSenseContext;
  placeholder?: string;
  rows?: number;
  className?: string;
  onCellClick?: (insertText: string) => void;
  errors?: { message: string; position: number; length: number }[];
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  value,
  onChange,
  context,
  placeholder,
  rows = 3,
  className = "",
  errors = [],
  onFocus,
  onBlur,
  onKeyDown,
  textareaRef: externalTextareaRef,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || internalRef;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newCursor = e.target.selectionStart;
      onChange(newValue);
      setCursorPosition(newCursor);

      // Check if we should show IntelliSense
      const textBeforeCursor = newValue.substring(0, newCursor);
      const shouldShow =
        textBeforeCursor.endsWith("[") ||
        textBeforeCursor.endsWith("(") ||
        /\w$/.test(textBeforeCursor) ||
        textBeforeCursor.endsWith('"');

      if (shouldShow && textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setAnchorRect(rect);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    },
    [onChange]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === " " && e.ctrlKey) {
      e.preventDefault();
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setAnchorRect(rect);
        setShowDropdown(true);
      }
    }
    if (onKeyDown) {
      onKeyDown(e as React.KeyboardEvent<HTMLTextAreaElement>);
    }
  }, [onKeyDown]);

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const beforeCursor = value.substring(0, cursorPosition);
      const afterCursor = value.substring(cursorPosition);

      // Find what to replace
      let replaceStart = cursorPosition;
      const triggerMatch = beforeCursor.match(/(\[[\w\s]*|\w+|\(")$/);
      if (triggerMatch) {
        replaceStart = cursorPosition - triggerMatch[1].length;
      }

      const newValue =
        value.substring(0, replaceStart) + suggestion.insertText + afterCursor;
      onChange(newValue);

      // Set cursor position
      const newCursor =
        replaceStart +
        suggestion.insertText.length +
        (suggestion.cursorOffset || 0);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);

      setShowDropdown(false);
    },
    [value, cursorPosition, onChange]
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  // Render error squiggles
  const errorHighlights = useMemo(() => {
    return errors.map((err, i) => ({
      start: err.position,
      end: err.position + err.length,
      message: err.message,
    }));
  }, [errors]);

  return (
    <div className={`formula-editor ${className}`}>
      <div className="formula-editor-container">
        <textarea
          ref={textareaRef}
          className={`formula-editor-textarea ${errors.length > 0 ? "has-errors" : ""}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={(e) => {
            handleBlur();
            onBlur?.(e);
          }}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
        />
        {errorHighlights.length > 0 && (
          <div className="formula-editor-errors">
            {errorHighlights.map((err, i) => (
              <div key={i} className="formula-error-marker" title={err.message}>
                {value.substring(err.start, err.end)}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDropdown && (
        <IntelliSenseDropdown
          context={context}
          value={value}
          cursorPosition={cursorPosition}
          onSelect={handleSelect}
          onClose={() => setShowDropdown(false)}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
};

FormulaEditor.displayName = "FormulaEditor";
