/**
 * Inline Cell Editing Component
 * Provides Excel-like inline cell editing with validation and formatting
 */

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';

export interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  validate?: (value: string) => { valid: boolean; error?: string };
  format?: (value: string) => string;
  placeholder?: string;
  isFormula?: boolean;
  width?: number;
  height?: number;
  autoFocus?: boolean;
  selectOnFocus?: boolean;
}

export const InlineCellEditor: React.FC<InlineEditProps> = ({
  value: initialValue,
  onCommit,
  onCancel,
  onNavigate,
  validate,
  format,
  placeholder = 'Enter value...',
  isFormula = false,
  width = 120,
  height = 32,
  autoFocus = true,
  selectOnFocus = true,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (selectOnFocus) {
        inputRef.current.select();
      }
    }
  }, [autoFocus, selectOnFocus]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setIsDirty(newValue !== initialValue);
    
    if (validate) {
      const result = validate(newValue);
      setError(result.valid ? null : result.error || 'Invalid value');
    }
  }, [initialValue, validate]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!error) {
          const finalValue = format ? format(value) : value;
          onCommit(finalValue);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'Tab':
        e.preventDefault();
        if (!error) {
          const finalValue = format ? format(value) : value;
          onCommit(finalValue);
        }
        onNavigate?.(e.shiftKey ? 'left' : 'right');
        break;
      case 'ArrowUp':
        if (!e.shiftKey && !isDirty) {
          e.preventDefault();
          onNavigate?.('up');
        }
        break;
      case 'ArrowDown':
        if (!e.shiftKey && !isDirty) {
          e.preventDefault();
          onNavigate?.('down');
        }
        break;
    }
  }, [value, error, isDirty, isFormula, onCommit, onCancel, onNavigate, format]);

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to process
    setTimeout(() => {
      if (!error && isDirty) {
        const finalValue = format ? format(value) : value;
        onCommit(finalValue);
      } else if (!isDirty) {
        onCancel();
      }
    }, 150);
  }, [value, error, isDirty, onCommit, onCancel, format]);

  return (
    <div
      className="matrix-inline-editor"
      style={{
        position: 'absolute',
        width,
        height,
        zIndex: 100,
        boxShadow: 'var(--matrix-shadow-lg), 0 0 0 2px var(--matrix-primary)',
        borderRadius: 4,
        backgroundColor: 'var(--matrix-bg-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          height: '100%',
          border: error ? '2px solid var(--matrix-error)' : 'none',
          borderRadius: 4,
        }}
      >
        {isFormula && (
          <span
            style={{
              color: 'var(--matrix-primary)',
              fontWeight: 600,
              marginRight: 4,
              fontFamily: 'var(--matrix-font-mono)',
            }}
          >
            =
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--matrix-font-size-md)',
            fontFamily: isFormula ? 'var(--matrix-font-mono)' : 'var(--matrix-font-family)',
            color: error ? 'var(--matrix-error)' : 'var(--matrix-text-primary)',
            padding: 0,
            width: '100%',
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'inline-edit-error' : undefined}
        />
        {isDirty && !error && (
          <span
            style={{
              color: 'var(--matrix-success)',
              marginLeft: 4,
              fontSize: 12,
            }}
            aria-hidden="true"
          >
            ●
          </span>
        )}
      </div>
      {error && (
        <div
          id="inline-edit-error"
          role="alert"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            padding: '6px 8px',
            backgroundColor: 'var(--matrix-error)',
            color: 'white',
            fontSize: 12,
            borderRadius: 4,
            boxShadow: 'var(--matrix-shadow-md)',
            zIndex: 101,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

// Validation helpers
export const CellValidators = {
  number: (value: string): { valid: boolean; error?: string } => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Please enter a valid number' };
    }
    return { valid: true };
  },

  positiveNumber: (value: string): { valid: boolean; error?: string } => {
    const base = CellValidators.number(value);
    if (!base.valid) return base;
    if (value === '') return { valid: true };
    const num = parseFloat(value);
    if (num < 0) {
      return { valid: false, error: 'Value must be positive' };
    }
    return { valid: true };
  },

  percentage: (value: string): { valid: boolean; error?: string } => {
    if (value === '') return { valid: true };
    // Allow percentages like "50%" or "0.5"
    const cleanValue = value.replace('%', '');
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      return { valid: false, error: 'Please enter a valid percentage' };
    }
    return { valid: true };
  },

  formula: (value: string): { valid: boolean; error?: string } => {
    if (!value.startsWith('=')) {
      return { valid: false, error: 'Formula must start with =' };
    }
    if (value.length < 2) {
      return { valid: false, error: 'Formula cannot be empty' };
    }
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of value) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return { valid: false, error: 'Unbalanced parentheses' };
      }
    }
    if (parenCount !== 0) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }
    return { valid: true };
  },
};

// Format helpers
export const CellFormatters = {
  number: (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toString();
  },

  currency: (value: string, symbol = '$'): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${symbol}${num.toFixed(2)}`;
  },

  percentage: (value: string): string => {
    if (value.includes('%')) return value;
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num > 1) {
      return `${num.toFixed(1)}%`;
    }
    return `${(num * 100).toFixed(1)}%`;
  },
};

interface EditableCellProps {
  value: string;
  displayValue: string;
  isEditing: boolean;
  isEditable?: boolean;
  isDirty?: boolean;
  hasError?: boolean;
  width?: number;
  height?: number;
  onClick: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  validate?: (value: string) => { valid: boolean; error?: string };
  format?: (value: string) => string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  displayValue,
  isEditing,
  isEditable = true,
  isDirty = false,
  hasError = false,
  width = 120,
  height = 32,
  onClick,
  onCommit,
  onCancel,
  onNavigate,
  validate,
  format,
}) => {
  const isFormula = value?.startsWith('=');

  if (isEditing && isEditable) {
    return (
      <InlineCellEditor
        value={value}
        onCommit={onCommit}
        onCancel={onCancel}
        onNavigate={onNavigate}
        validate={validate}
        format={format}
        isFormula={isFormula}
        width={width}
        height={height}
      />
    );
  }

  return (
    <div
      className={`matrix-editable-cell ${isEditable ? 'editable' : ''} ${isDirty ? 'dirty' : ''} ${hasError ? 'error' : ''}`}
      onClick={isEditable ? onClick : undefined}
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        cursor: isEditable ? 'text' : 'default',
        position: 'relative',
        backgroundColor: isDirty
          ? 'var(--matrix-bg-edited)'
          : hasError
          ? 'rgba(239, 68, 68, 0.1)'
          : 'transparent',
      }}
      title={isEditable ? 'Click to edit' : undefined}
    >
      <span
        style={{
          fontFamily: isFormula ? 'var(--matrix-font-mono)' : 'inherit',
          color: isFormula
            ? 'var(--matrix-primary)'
            : hasError
            ? 'var(--matrix-error)'
            : 'inherit',
        }}
      >
        {displayValue || '—'}
      </span>
      {isDirty && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 6,
            height: 6,
            backgroundColor: 'var(--matrix-warning)',
            borderRadius: '50%',
          }}
          aria-hidden="true"
        />
      )}
      {isEditable && (
        <span
          className="edit-indicator"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            opacity: 0,
            fontSize: 10,
            color: 'var(--matrix-text-muted)',
            transition: 'opacity 0.2s',
          }}
        >
          ✎
        </span>
      )}
    </div>
  );
};

// Export all
export const InlineEditing = {
  InlineCellEditor,
  EditableCell,
  CellValidators,
  CellFormatters,
};

export default InlineCellEditor;
