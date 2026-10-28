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
      const items = Array.from(listEl.querySelectorAll(".intellisense-item"));
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

  if (suggestions.length === 0 || !anchorRect) return null;

  const dropdownStyle: React.CSSProperties = {
    position: "fixed",
    left: anchorRect.left,
    top: anchorRect.bottom + 4,
    zIndex: 100003,
    minWidth: 260,
    maxWidth: 380,
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    borderRadius: 12,
    boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    animation: "fadeIn 0.1s ease-out",
  };

  const firstOtherIdx = groupedSuggestions.calculated.length;

  return (
    <div className="intellisense-dropdown" style={dropdownStyle}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="intellisense-list" ref={listRef} style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
        {groupedSuggestions.calculated.length > 0 && (
          <div style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2 }}>Calculated Rows</div>
        )}
        {groupedSuggestions.calculated.map((suggestion, i) => (
          <IntelliSenseItem key={`calc-${i}`} suggestion={suggestion} selected={selectedIndex === i} onSelect={() => onSelect(suggestion)} onHover={() => handleMouseEnter(suggestion)} />
        ))}

        {groupedSuggestions.others.length > 0 && (
          <div style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2, borderTop: groupedSuggestions.calculated.length > 0 ? "1px solid #f1f5f9" : "none", marginTop: groupedSuggestions.calculated.length > 0 ? 4 : 0 }}>Suggestions</div>
        )}
        {groupedSuggestions.others.map((suggestion, i) => {
          const index = i + firstOtherIdx;
          return <IntelliSenseItem key={`other-${i}`} suggestion={suggestion} selected={selectedIndex === index} onSelect={() => onSelect(suggestion)} onHover={() => handleMouseEnter(suggestion)} />;
        })}
      </div>

      {hoveredFunction && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 16px", background: "#f8fafc", fontSize: 12 }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#2563eb" }}><FunctionIcon /></span>
            {hoveredFunction.signature}
          </div>
          <div style={{ color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>{hoveredFunction.description}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
            Returns: <code style={{ color: "#0891b2", background: "#ecfeff", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>{hoveredFunction.returnType}</code>
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
      className={`intellisense-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        background: selected ? "#2563eb" : "transparent",
        color: selected ? "#ffffff" : "#334155",
        fontSize: 13,
        transition: "all 0.1s ease",
      }}
    >
      <span style={{
        width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, background: selected ? "rgba(255,255,255,0.2)" : getIconBg(suggestion.type),
        color: selected ? "#ffffff" : getIconColor(suggestion.type),
        flexShrink: 0,
      }}>
        <Icon />
      </span>
      <span style={{ flex: 1, fontWeight: selected ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {suggestion.label}
      </span>
      {!selected && suggestion.detail && (
        <span style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic", flexShrink: 0 }}>{suggestion.detail}</span>
      )}
    </div>
  );
};

function getIconBg(type: string): string {
  switch (type) {
    case "measure": return "#dcfce7";
    case "calculatedMeasure": return "#dbeafe";
    case "column": return "#fef3c7";
    case "row": return "#fae8ff";
    case "function": return "#f1f5f9";
    case "shortcut": return "#ecfeff";
    default: return "#f3f4f6";
  }
}

function getIconColor(type: string): string {
  switch (type) {
    case "measure": return "#16a34a";
    case "calculatedMeasure": return "#2563eb";
    case "column": return "#d97706";
    case "row": return "#a21caf";
    case "function": return "#475569";
    case "shortcut": return "#0891b2";
    default: return "#64748b";
  }
}

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
        style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 10, outline: "none", background: "#f8fafc", fontFamily: "'Cascadia Code', 'Consolas', monospace", minHeight: rows * 20 }}
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
