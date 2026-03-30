/**
 * Enhanced Formula Bar System
 * Provides Excel-like formula editing with IntelliSense, validation, and cell reference highlighting
 */

import { useState, useCallback, useRef, useEffect, KeyboardEvent, useImperativeHandle, forwardRef } from 'react';

export type FormulaBarMode = 'view' | 'edit' | 'formula';

export interface FormulaBarState {
  value: string;
  displayValue: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
  isDirty: boolean;
  validationError?: string;
  suggestions: FormulaSuggestion[];
  showSuggestions: boolean;
  activeSuggestionIndex: number;
}

export interface FormulaSuggestion {
  type: 'function' | 'reference' | 'measure' | 'operator';
  label: string;
  description: string;
  insertText: string;
  syntax?: string;
  parameters?: string[];
}

export interface FormulaValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  references: string[];
}

// Comprehensive formula function library
export const FORMULA_FUNCTIONS: FormulaSuggestion[] = [
  // Arithmetic
  { type: 'function', label: 'SUM', description: 'Adds all numbers in a range', insertText: 'SUM()', syntax: 'SUM(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'AVERAGE', description: 'Returns the average of numbers', insertText: 'AVERAGE()', syntax: 'AVERAGE(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'MAX', description: 'Returns the maximum value', insertText: 'MAX()', syntax: 'MAX(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'MIN', description: 'Returns the minimum value', insertText: 'MIN()', syntax: 'MIN(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'COUNT', description: 'Counts numeric values', insertText: 'COUNT()', syntax: 'COUNT(value1, [value2], ...)', parameters: ['value1', 'value2'] },
  { type: 'function', label: 'ABS', description: 'Returns absolute value', insertText: 'ABS()', syntax: 'ABS(number)', parameters: ['number'] },
  { type: 'function', label: 'ROUND', description: 'Rounds to specified digits', insertText: 'ROUND()', syntax: 'ROUND(number, num_digits)', parameters: ['number', 'num_digits'] },
  
  // MatrixPro Specific
  { type: 'function', label: 'ROW', description: 'Returns current row data', insertText: 'ROW()', syntax: 'ROW()' },
  { type: 'function', label: 'COL', description: 'Returns current column data', insertText: 'COL()', syntax: 'COL()' },
  { type: 'function', label: 'CELL', description: 'Returns value from specific cell', insertText: 'CELL()', syntax: 'CELL(rowKey, colKey)', parameters: ['rowKey', 'colKey'] },
  { type: 'function', label: 'ROWPATH', description: 'Returns full row path', insertText: 'ROWPATH()', syntax: 'ROWPATH()' },
  { type: 'function', label: 'SCOPE', description: 'Filters by scope member', insertText: 'SCOPE[]', syntax: 'SCOPE[Member]' },
  
  // Statistical
  { type: 'function', label: 'STDEV', description: 'Standard deviation', insertText: 'STDEV()', syntax: 'STDEV(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'VAR', description: 'Variance', insertText: 'VAR()', syntax: 'VAR(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'MEDIAN', description: 'Median value', insertText: 'MEDIAN()', syntax: 'MEDIAN(number1, [number2], ...)', parameters: ['number1', 'number2'] },
  { type: 'function', label: 'PERCENTILE', description: 'Returns k-th percentile', insertText: 'PERCENTILE()', syntax: 'PERCENTILE(array, k)', parameters: ['array', 'k'] },
  
  // Logical
  { type: 'function', label: 'IF', description: 'Conditional logic', insertText: 'IF()', syntax: 'IF(logical_test, value_if_true, value_if_false)', parameters: ['logical_test', 'value_if_true', 'value_if_false'] },
  { type: 'function', label: 'AND', description: 'Logical AND', insertText: 'AND()', syntax: 'AND(logical1, [logical2], ...)', parameters: ['logical1', 'logical2'] },
  { type: 'function', label: 'OR', description: 'Logical OR', insertText: 'OR()', syntax: 'OR(logical1, [logical2], ...)', parameters: ['logical1', 'logical2'] },
  { type: 'function', label: 'NOT', description: 'Logical NOT', insertText: 'NOT()', syntax: 'NOT(logical)', parameters: ['logical'] },
  
  // Financial
  { type: 'function', label: 'CAGR', description: 'Compound annual growth rate', insertText: 'CAGR()', syntax: 'CAGR(begin_value, end_value, periods)', parameters: ['begin_value', 'end_value', 'periods'] },
  { type: 'function', label: 'NPV', description: 'Net present value', insertText: 'NPV()', syntax: 'NPV(rate, value1, [value2], ...)', parameters: ['rate', 'value1', 'value2'] },
  { type: 'function', label: 'IRR', description: 'Internal rate of return', insertText: 'IRR()', syntax: 'IRR(values, [guess])', parameters: ['values', 'guess'] },
];

export class FormulaBarEngine {
  private state: FormulaBarState;
  private history: string[];
  private historyIndex: number;
  private maxHistorySize: number;
  private listeners: Set<(state: FormulaBarState) => void>;

  constructor(initialValue: string = '') {
    this.state = {
      value: initialValue,
      displayValue: initialValue,
      cursorPosition: 0,
      selectionStart: 0,
      selectionEnd: 0,
      isDirty: false,
      suggestions: [],
      showSuggestions: false,
      activeSuggestionIndex: 0,
    };
    this.history = [initialValue];
    this.historyIndex = 0;
    this.maxHistorySize = 50;
    this.listeners = new Set();
  }

  /**
   * Set formula value
   */
  setValue(value: string, cursorPosition?: number): void {
    this.state.value = value;
    this.state.displayValue = value;
    this.state.isDirty = true;
    
    if (cursorPosition !== undefined) {
      this.state.cursorPosition = cursorPosition;
    }

    this.updateSuggestions();
    this.notifyListeners();
  }

  /**
   * Insert text at cursor position
   */
  insertText(text: string): void {
    const { value, cursorPosition } = this.state;
    const newValue = value.slice(0, cursorPosition) + text + value.slice(cursorPosition);
    const newPosition = cursorPosition + text.length;

    this.setValue(newValue, newPosition);
  }

  /**
   * Insert cell reference at cursor position
   */
  insertCellReference(reference: string): void {
    // Check if we need to wrap in brackets
    const insertText = reference.startsWith('[') ? reference : `[${reference}]`;
    this.insertText(insertText);
  }

  /**
   * Navigate through suggestions
   */
  navigateSuggestions(direction: 'up' | 'down'): boolean {
    if (!this.state.showSuggestions || this.state.suggestions.length === 0) {
      return false;
    }

    const delta = direction === 'up' ? -1 : 1;
    const newIndex = this.state.activeSuggestionIndex + delta;

    if (newIndex >= 0 && newIndex < this.state.suggestions.length) {
      this.state.activeSuggestionIndex = newIndex;
      this.notifyListeners();
      return true;
    }

    return false;
  }

  /**
   * Accept current suggestion
   */
  acceptSuggestion(): boolean {
    if (!this.state.showSuggestions || this.state.suggestions.length === 0) {
      return false;
    }

    const suggestion = this.state.suggestions[this.state.activeSuggestionIndex];
    if (!suggestion) return false;

    // Find word boundary before cursor
    const { value, cursorPosition } = this.state;
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);

    // Match partial word
    const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
    
    if (match) {
      const wordStart = cursorPosition - match[1].length;
      const newValue = value.slice(0, wordStart) + suggestion.insertText + afterCursor;
      const newPosition = wordStart + suggestion.insertText.length;
      this.setValue(newValue, newPosition);
    } else {
      this.insertText(suggestion.insertText);
    }

    this.state.showSuggestions = false;
    this.notifyListeners();
    return true;
  }

  /**
   * Validate current formula
   */
  validate(): FormulaValidationResult {
    const { value } = this.state;
    
    if (!value.startsWith('=')) {
      return { isValid: true, warnings: [], references: [] };
    }

    const formula = value.slice(1);
    const warnings: string[] = [];
    const references: string[] = [];

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return { isValid: false, error: 'Unbalanced parentheses', warnings, references };
      }
    }
    if (parenCount !== 0) {
      return { isValid: false, error: 'Unbalanced parentheses', warnings, references };
    }

    // Extract references
    const refRegex = /\[([^\]]+)\]/g;
    let match;
    while ((match = refRegex.exec(formula)) !== null) {
      references.push(match[1]);
    }

    // Check for unknown functions
    const funcRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    while ((match = funcRegex.exec(formula)) !== null) {
      const funcName = match[1].toUpperCase();
      const isKnown = FORMULA_FUNCTIONS.some(f => f.label === funcName);
      if (!isKnown && !['ROW', 'COL', 'CELL', 'ROWPATH'].includes(funcName)) {
        warnings.push(`Unknown function: ${funcName}`);
      }
    }

    return { isValid: warnings.length === 0, warnings, references };
  }

  /**
   * Commit formula to history
   */
  commit(): void {
    const { value } = this.state;

    // Remove any future history (redo stack)
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new value
    if (this.history[this.history.length - 1] !== value) {
      this.history.push(value);
      
      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }

    this.state.isDirty = false;
    this.notifyListeners();
  }

  /**
   * Undo last change
   */
  undo(): boolean {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    this.state.value = this.history[this.historyIndex];
    this.state.displayValue = this.history[this.historyIndex];
    this.notifyListeners();
    return true;
  }

  /**
   * Redo last undone change
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    this.state.value = this.history[this.historyIndex];
    this.state.displayValue = this.history[this.historyIndex];
    this.notifyListeners();
    return true;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getState(): FormulaBarState {
    return { ...this.state };
  }

  /**
   * Get current value
   */
  getValue(): string {
    return this.state.value;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: FormulaBarState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private updateSuggestions(): void {
    const { value, cursorPosition } = this.state;
    
    if (!value.startsWith('=')) {
      this.state.suggestions = [];
      this.state.showSuggestions = false;
      return;
    }

    // Get text before cursor
    const beforeCursor = value.slice(0, cursorPosition);
    
    // Match partial word
    const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
    
    if (match && match[1].length >= 1) {
      const partial = match[1].toUpperCase();
      this.state.suggestions = FORMULA_FUNCTIONS.filter(
        f => f.label.startsWith(partial) && f.label !== partial
      );
      this.state.showSuggestions = this.state.suggestions.length > 0;
      this.state.activeSuggestionIndex = 0;
    } else {
      this.state.suggestions = [];
      this.state.showSuggestions = false;
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('FormulaBar listener error:', error);
      }
    });
  }
}

// React hook for formula bar
export function useFormulaBarEngine(initialValue: string = '') {
  const [engine] = useState(() => new FormulaBarEngine(initialValue));
  const [state, setState] = useState(engine.getState());

  useEffect(() => {
    return engine.subscribe(newState => setState(newState));
  }, [engine]);

  return { engine, state };
}

// Utility functions
export function formatFormula(formula: string): string {
  if (!formula.startsWith('=')) return formula;

  // Add spaces around operators
  let formatted = formula
    .replace(/([+\-*/])/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();

  // Preserve function parentheses
  formatted = formatted
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  return formatted;
}

export function highlightFormulaSyntax(formula: string): string {
  if (!formula.startsWith('=')) return formula;

  let highlighted = formula
    // Functions
    .replace(/([A-Za-z_][A-Za-z0-9_]*)(?=\()/g, '<span class="formula-function">$1</span>')
    // References
    .replace(/(\[[^\]]+\])/g, '<span class="formula-reference">$1</span>')
    // Numbers
    .replace(/(\d+\.?\d*)/g, '<span class="formula-number">$1</span>')
    // Operators
    .replace(/([+\-*/=])/g, '<span class="formula-operator">$1</span>');

  return highlighted;
}

// Export
export const FormulaBar = {
  FormulaBarEngine,
  useFormulaBarEngine,
  FORMULA_FUNCTIONS,
  formatFormula,
  highlightFormulaSyntax,
};

export default FormulaBarEngine;
