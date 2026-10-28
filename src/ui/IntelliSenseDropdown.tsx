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

// ─── Icons ──────────────────────────────────────────────────────────────────

const MeasureIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2v20M2 12h20M12 2l-4 4M12 2l4 4M12 22l-4-4M12 22l4-4" />
  </svg>
);
const CalcMeasureIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 7h-7l7 10h-7" />
    <path d="M16 4l4 4-4 4" />
  </svg>
);
const RowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="9" width="18" height="6" rx="1" />
  </svg>
);
const FunctionIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 17L12 12L9 7" />
    <path d="M15 17L18 12L15 7" />
  </svg>
);
const ShortcutIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);
const ColumnIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="9" y="3" width="6" height="18" rx="1" />
  </svg>
);

const TYPE_ICONS: Record<string, React.FC> = {
  measure: MeasureIcon,
  calculatedMeasure: CalcMeasureIcon,
  row: RowIcon,
  function: FunctionIcon,
  shortcut: ShortcutIcon,
  column: ColumnIcon,
};

// ─── Dropdown Component ───────────────────────────────────────────────────────

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
  const popoverRef = useRef<HTMLDivElement>(null);
  const keyboardNavigationRef = useRef(false);

  const intelliSense = useMemo(() => new FormulaIntelliSense(context), [context]);

  const groupedSuggestions = useMemo(() => {
    const raw = intelliSense.getSuggestions(value, cursorPosition);
    const calculated = raw.filter(s => s.isCalculated);
    const others = raw.filter(s => !s.isCalculated);
    return { all: [...calculated, ...others], calculated, others };
  }, [intelliSense, value, cursorPosition]);

  const suggestions = groupedSuggestions.all;

  useEffect(() => { setSelectedIndex(0); }, [suggestions]);

  useEffect(() => {
    if (keyboardNavigationRef.current && listRef.current && suggestions.length > 0) {
      const listEl = listRef.current;
      const items = Array.from(listEl.querySelectorAll("[data-suggestion]"));
      const selectedEl = items[selectedIndex] as HTMLElement;
      if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
      keyboardNavigationRef.current = false;
    }
  }, [selectedIndex, suggestions.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault(); keyboardNavigationRef.current = true;
          setSelectedIndex(prev => (prev + 1) % suggestions.length); break;
        case "ArrowUp":
          e.preventDefault(); keyboardNavigationRef.current = true;
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length); break;
        case "Enter":
        case "Tab":
          e.preventDefault(); onSelect(suggestions[selectedIndex]); break;
        case "Escape":
          e.preventDefault(); onClose(); break;
      }
    },
    [suggestions, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    // Overlay shells stop keydown propagation at the panel (so typing never
    // reaches grid shortcuts), which would starve a bubbling document
    // listener. Inside an overlay, listen in the capture phase instead; the
    // preventDefault on Escape then keeps the dialog open while suggestions
    // are dismissed. Elsewhere (formula bar) the original bubbling order stays.
    const capture = !!popoverRef.current?.closest(".mx-ov");
    document.addEventListener("keydown", handleKeyDown, capture);
    return () => document.removeEventListener("keydown", handleKeyDown, capture);
  }, [handleKeyDown]);

  const handleMouseEnter = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === "function") {
      const sig = FORMULA_FUNCTIONS.find(f => f.name === suggestion.label);
      setHoveredFunction(sig || null);
    } else {
      setHoveredFunction(null);
    }
  }, []);

  if (suggestions.length === 0 || !anchorRect) return null;

  // Position follows the editor; the surface comes from .mx-popover. The list
  // scrolls on its own so the signature help stays pinned underneath.
  const popoverStyle: React.CSSProperties = {
    left: anchorRect.left,
    top: anchorRect.bottom + 4,
    zIndex: 100003,
    minWidth: 260,
    maxWidth: 380,
    padding: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const firstOtherIdx = groupedSuggestions.calculated.length;
  const hasCalculated = groupedSuggestions.calculated.length > 0;

  return (
    <div ref={popoverRef} className="mx-popover" style={popoverStyle} role="listbox" aria-label="Formula suggestions">
      <div ref={listRef} style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}>
        {hasCalculated && <div className="mx-popover-heading">Calculated rows</div>}
        {groupedSuggestions.calculated.map((suggestion, i) => (
          <IntelliSenseItem key={`calc-${i}`} suggestion={suggestion} selected={selectedIndex === i} onSelect={() => onSelect(suggestion)} onHover={() => handleMouseEnter(suggestion)} />
        ))}

        {hasCalculated && groupedSuggestions.others.length > 0 && <div className="mx-popover-sep" />}
        {hasCalculated && groupedSuggestions.others.length > 0 && <div className="mx-popover-heading">Suggestions</div>}
        {groupedSuggestions.others.map((suggestion, i) => {
          const index = i + firstOtherIdx;
          return <IntelliSenseItem key={`other-${i}`} suggestion={suggestion} selected={selectedIndex === index} onSelect={() => onSelect(suggestion)} onHover={() => handleMouseEnter(suggestion)} />;
        })}
      </div>

      {hoveredFunction && (
        <div className="mx-stack is-tight" style={{ padding: "10px 12px", borderTop: "1px solid var(--mx-ov-line)", background: "var(--mx-surface-subtle)" }}>
          <code className="mx-code" style={{ alignSelf: "flex-start", fontWeight: 600, color: "var(--mx-text)" }}>{hoveredFunction.signature}</code>
          <div className="mx-muted" style={{ lineHeight: 1.45 }}>{hoveredFunction.description}</div>
          <div className="mx-muted" style={{ fontSize: 11 }}>
            Returns <code className="mx-code">{hoveredFunction.returnType}</code>
          </div>
        </div>
      )}
    </div>
  );
};

const IntelliSenseItem: React.FC<{
  suggestion: Suggestion;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}> = ({ suggestion, selected, onSelect, onHover }) => {
  const Icon = TYPE_ICONS[suggestion.type] || MeasureIcon;
  return (
    <div
      className={`mx-popover-item${selected ? " is-active" : ""}`}
      data-suggestion=""
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span className="mx-popover-icon" title={suggestion.type}><Icon /></span>
      <span className="mx-popover-label">{suggestion.label}</span>
      {suggestion.detail && <span className="mx-popover-hint">{suggestion.detail}</span>}
    </div>
  );
};

// ─── Editor Component ─────────────────────────────────────────────────────────

export interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  context: IntelliSenseContext;
  placeholder?: string;
  rows?: number;
  className?: string;
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const pos = e.target.selectionStart;
    onChange(v);
    setCursorPosition(pos);
    const before = v.substring(0, pos);
    const shouldShow = before.endsWith("[") || before.endsWith("(") || /\w$/.test(before) || before.endsWith('"');
    if (shouldShow && textareaRef.current) {
      setAnchorRect(textareaRef.current.getBoundingClientRect());
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [onChange]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === " " && e.ctrlKey) {
      e.preventDefault();
      if (textareaRef.current) {
        setAnchorRect(textareaRef.current.getBoundingClientRect());
        setShowDropdown(true);
      }
    }
    if (onKeyDown) onKeyDown(e);
  }, [onKeyDown]);

  const handleSelect = useCallback((suggestion: Suggestion) => {
    if (!textareaRef.current) return;
    const before = value.substring(0, cursorPosition);
    const after = value.substring(cursorPosition);
    let start = cursorPosition;
    const match = before.match(/(\[[\w\s]*|\w+|\(")$/);
    if (match) start = cursorPosition - match[1].length;
    const nv = value.substring(0, start) + suggestion.insertText + after;
    onChange(nv);
    const npos = start + suggestion.insertText.length + (suggestion.cursorOffset || 0);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(npos, npos);
    }, 0);
    setShowDropdown(false);
  }, [value, cursorPosition, onChange]);

  return (
    <div className={`formula-editor ${className}`} style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        className="mx-textarea is-code"
        style={{ minHeight: rows * 20 + 16 }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleEditorKeyDown}
        onFocus={onFocus}
        onBlur={(e) => {
          setTimeout(() => setShowDropdown(false), 200);
          if (onBlur) onBlur(e);
        }}
        placeholder={placeholder}
        spellCheck={false}
      />
      {showDropdown && <IntelliSenseDropdown context={context} value={value} cursorPosition={cursorPosition} onSelect={handleSelect} onClose={() => setShowDropdown(false)} anchorRect={anchorRect} />}
    </div>
  );
};

FormulaEditor.displayName = "FormulaEditor";
IntelliSenseDropdown.displayName = "IntelliSenseDropdown";
