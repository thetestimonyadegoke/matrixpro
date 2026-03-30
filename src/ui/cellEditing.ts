/**
 * Enhanced Cell Editing System
 * Provides Excel-like cell editing experience with advanced features
 * Supports inline editing, range selection, copy-paste, and fill operations
 */

import { useState, useCallback, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { CellValue } from "../model/pivot";

export type EditMode = 'view' | 'edit' | 'formula';
export type SelectionMode = 'cell' | 'range' | 'column' | 'row';

export interface CellPosition {
  rowKey: string;
  colKey: string;
  measureIndex: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
  rowKeys: string[];
  colKeys: string[];
}

export interface EditState {
  mode: EditMode;
  position: CellPosition | null;
  value: string;
  originalValue: string;
  isDirty: boolean;
  validationError?: string;
}

export interface SelectionState {
  mode: SelectionMode;
  primary: CellPosition;
  range: CellRange | null;
  clipboard: CellRange | null;
}

export interface CellEditorOptions {
  enableAutoComplete: boolean;
  enableIntelliSense: boolean;
  validateOnType: boolean;
  commitOnBlur: boolean;
  cancelOnEscape: boolean;
}

export const DEFAULT_EDITOR_OPTIONS: CellEditorOptions = {
  enableAutoComplete: true,
  enableIntelliSense: true,
  validateOnType: true,
  commitOnBlur: false,
  cancelOnEscape: true,
};

export class CellEditingEngine {
  private editState: EditState;
  private selectionState: SelectionState;
  private options: CellEditorOptions;
  private listeners: Set<(state: { edit: EditState; selection: SelectionState }) => void>;
  private history: Array<{ edit: EditState; selection: SelectionState }>;
  private historyIndex: number;
  private maxHistorySize: number;

  constructor(options: Partial<CellEditorOptions> = {}) {
    this.options = { ...DEFAULT_EDITOR_OPTIONS, ...options };
    this.editState = {
      mode: 'view',
      position: null,
      value: '',
      originalValue: '',
      isDirty: false,
    };
    this.selectionState = {
      mode: 'cell',
      primary: { rowKey: '', colKey: '', measureIndex: 0 },
      range: null,
      clipboard: null,
    };
    this.listeners = new Set();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;
  }

  /**
   * Start editing a cell
   */
  startEdit(position: CellPosition, initialValue: string, mode: EditMode = 'edit'): boolean {
    if (this.editState.mode !== 'view') {
      this.cancelEdit();
    }

    this.pushHistory();

    this.editState = {
      mode,
      position,
      value: initialValue,
      originalValue: initialValue,
      isDirty: false,
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Update edit value
   */
  updateValue(value: string): void {
    if (this.editState.mode === 'view') return;

    this.editState.value = value;
    this.editState.isDirty = value !== this.editState.originalValue;

    if (this.options.validateOnType) {
      this.validateValue(value);
    }

    this.notifyListeners();
  }

  /**
   * Commit the current edit
   */
  commitEdit(): { success: boolean; position: CellPosition | null; value: string } {
    if (this.editState.mode === 'view') {
      return { success: false, position: null, value: '' };
    }

    const { position, value, isDirty } = this.editState;

    if (!isDirty) {
      this.cancelEdit();
      return { success: false, position, value };
    }

    // Validate
    const error = this.validateValue(value);
    if (error) {
      this.editState.validationError = error;
      this.notifyListeners();
      return { success: false, position, value };
    }

    this.pushHistory();

    const result = { success: true, position, value };

    this.editState = {
      mode: 'view',
      position: null,
      value: '',
      originalValue: '',
      isDirty: false,
    };

    this.notifyListeners();
    return result;
  }

  /**
   * Cancel the current edit
   */
  cancelEdit(): void {
    this.pushHistory();

    this.editState = {
      mode: 'view',
      position: null,
      value: '',
      originalValue: '',
      isDirty: false,
    };

    this.notifyListeners();
  }

  /**
   * Select a cell or range
   */
  selectCell(position: CellPosition, mode: SelectionMode = 'cell'): void {
    this.pushHistory();

    this.selectionState = {
      mode,
      primary: position,
      range: null,
      clipboard: this.selectionState.clipboard,
    };

    this.notifyListeners();
  }

  /**
   * Extend selection to create a range
   */
  extendSelection(toPosition: CellPosition, allRowKeys: string[], allColKeys: string[]): void {
    this.pushHistory();

    const start = this.selectionState.primary;
    const end = toPosition;

    // Determine range boundaries
    const startRowIndex = allRowKeys.indexOf(start.rowKey);
    const endRowIndex = allRowKeys.indexOf(end.rowKey);
    const startColIndex = allColKeys.indexOf(start.colKey);
    const endColIndex = allColKeys.indexOf(end.colKey);

    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);

    const rowKeys = allRowKeys.slice(minRow, maxRow + 1);
    const colKeys = allColKeys.slice(minCol, maxCol + 1);

    this.selectionState = {
      mode: 'range',
      primary: start,
      range: { start, end, rowKeys, colKeys },
      clipboard: this.selectionState.clipboard,
    };

    this.notifyListeners();
  }

  /**
   * Copy selected range to clipboard
   */
  copy(): CellRange | null {
    if (!this.selectionState.range) return null;

    this.pushHistory();

    this.selectionState = {
      ...this.selectionState,
      clipboard: this.selectionState.range,
    };

    this.notifyListeners();
    return this.selectionState.clipboard;
  }

  /**
   * Get paste target range
   */
  getPasteRange(): CellRange | null {
    return this.selectionState.clipboard;
  }

  /**
   * Clear clipboard
   */
  clearClipboard(): void {
    this.selectionState = {
      ...this.selectionState,
      clipboard: null,
    };
    this.notifyListeners();
  }

  /**
   * Handle keyboard navigation
   */
  handleNavigation(
    event: KeyboardEvent,
    allRowKeys: string[],
    allColKeys: string[],
    allMeasures: number[]
  ): CellPosition | null {
    const { primary } = this.selectionState;
    const rowIndex = allRowKeys.indexOf(primary.rowKey);
    const colIndex = allColKeys.indexOf(primary.colKey);
    const measureIndex = allMeasures.indexOf(primary.measureIndex);

    let newRowIndex = rowIndex;
    let newColIndex = colIndex;
    let newMeasureIndex = measureIndex;

    switch (event.key) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(allRowKeys.length - 1, rowIndex + 1);
        break;
      case 'ArrowLeft':
        if (event.shiftKey) {
          // Extend selection
          return null;
        }
        if (measureIndex > 0) {
          newMeasureIndex = measureIndex - 1;
        } else if (colIndex > 0) {
          newColIndex = colIndex - 1;
          newMeasureIndex = allMeasures.length - 1;
        }
        break;
      case 'ArrowRight':
        if (event.shiftKey) {
          // Extend selection
          return null;
        }
        if (measureIndex < allMeasures.length - 1) {
          newMeasureIndex = measureIndex + 1;
        } else if (colIndex < allColKeys.length - 1) {
          newColIndex = colIndex + 1;
          newMeasureIndex = 0;
        }
        break;
      case 'Tab':
        if (event.shiftKey) {
          // Move left
          if (measureIndex > 0) {
            newMeasureIndex = measureIndex - 1;
          } else if (colIndex > 0) {
            newColIndex = colIndex - 1;
            newMeasureIndex = allMeasures.length - 1;
          }
        } else {
          // Move right
          if (measureIndex < allMeasures.length - 1) {
            newMeasureIndex = measureIndex + 1;
          } else if (colIndex < allColKeys.length - 1) {
            newColIndex = colIndex + 1;
            newMeasureIndex = 0;
          }
        }
        event.preventDefault();
        break;
      case 'Enter':
        if (this.editState.mode === 'view') {
          newRowIndex = Math.min(allRowKeys.length - 1, rowIndex + 1);
        }
        break;
      case 'Home':
        newColIndex = 0;
        newMeasureIndex = 0;
        break;
      case 'End':
        newColIndex = allColKeys.length - 1;
        newMeasureIndex = allMeasures.length - 1;
        break;
      case 'PageUp':
        newRowIndex = Math.max(0, rowIndex - 10);
        break;
      case 'PageDown':
        newRowIndex = Math.min(allRowKeys.length - 1, rowIndex + 10);
        break;
      default:
        return null;
    }

    if (newRowIndex !== rowIndex || newColIndex !== colIndex || newMeasureIndex !== measureIndex) {
      return {
        rowKey: allRowKeys[newRowIndex],
        colKey: allColKeys[newColIndex],
        measureIndex: allMeasures[newMeasureIndex],
      };
    }

    return null;
  }

  /**
   * Fill down (Ctrl+D)
   */
  fillDown(allRowKeys: string[]): CellRange | null {
    if (!this.selectionState.range || this.selectionState.range.rowKeys.length < 2) {
      return null;
    }

    this.pushHistory();

    const { range } = this.selectionState;
    const startRowIndex = allRowKeys.indexOf(range.start.rowKey);
    const endRowIndex = allRowKeys.indexOf(range.end.rowKey);

    return {
      start: range.start,
      end: range.end,
      rowKeys: allRowKeys.slice(startRowIndex, endRowIndex + 1),
      colKeys: range.colKeys,
    };
  }

  /**
   * Fill right (Ctrl+R)
   */
  fillRight(allColKeys: string[]): CellRange | null {
    if (!this.selectionState.range || this.selectionState.range.colKeys.length < 2) {
      return null;
    }

    this.pushHistory();

    const { range } = this.selectionState;
    const startColIndex = allColKeys.indexOf(range.start.colKey);
    const endColIndex = allColKeys.indexOf(range.end.colKey);

    return {
      start: range.start,
      end: range.end,
      rowKeys: range.rowKeys,
      colKeys: allColKeys.slice(startColIndex, endColIndex + 1),
    };
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    const state = this.history[this.historyIndex];

    this.editState = { ...state.edit };
    this.selectionState = { ...state.selection };

    this.notifyListeners();
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    const state = this.history[this.historyIndex];

    this.editState = { ...state.edit };
    this.selectionState = { ...state.selection };

    this.notifyListeners();
    return true;
  }

  /**
   * Get current state
   */
  getState(): { edit: EditState; selection: SelectionState } {
    return {
      edit: { ...this.editState },
      selection: { ...this.selectionState },
    };
  }

  /**
   * Check if in edit mode
   */
  isEditing(): boolean {
    return this.editState.mode !== 'view';
  }

  /**
   * Get current edit value
   */
  getEditValue(): string {
    return this.editState.value;
  }

  /**
   * Get current edit position
   */
  getEditPosition(): CellPosition | null {
    return this.editState.position;
  }

  /**
   * Get selected range
   */
  getSelectedRange(): CellRange | null {
    return this.selectionState.range;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: { edit: EditState; selection: SelectionState }) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dispose engine
   */
  dispose(): void {
    this.listeners.clear();
    this.history = [];
  }

  private pushHistory(): void {
    // Remove any states after current index (redo history)
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new state
    this.history.push({
      edit: { ...this.editState },
      selection: { ...this.selectionState },
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Cell editing listener error:', error);
      }
    });
  }

  private validateValue(value: string): string | undefined {
    // Basic validation
    if (value.startsWith('=')) {
      // Formula validation
      if (value.length < 2) {
        return 'Formula cannot be empty';
      }
      // TODO: Add more formula validation
    } else {
      // Number validation
      const num = parseFloat(value);
      if (isNaN(num) && value.trim() !== '') {
        return 'Invalid number';
      }
    }
    return undefined;
  }
}

// React hook for cell editing
export function useCellEditingEngine(options?: Partial<CellEditorOptions>) {
  const [engine] = useState(() => new CellEditingEngine(options));
  const [state, setState] = useState(engine.getState());

  useEffect(() => {
    return engine.subscribe(newState => setState(newState));
  }, [engine]);

  return { engine, ...state };
}

// Export all
export const CellEditing = {
  CellEditingEngine,
  useCellEditingEngine,
  DEFAULT_EDITOR_OPTIONS,
};

export default CellEditingEngine;
