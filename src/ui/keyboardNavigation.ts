/**
 * Keyboard Navigation System
 * Provides comprehensive keyboard shortcuts and navigation for MatrixPro
 * Excel-like keyboard experience with accessibility support
 */

import { KeyboardEvent, useState, useEffect, useCallback } from 'react';

export type KeyCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type KeyboardAction = 
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'moveFirst' | 'moveLast' | 'movePageUp' | 'movePageDown'
  | 'selectUp' | 'selectDown' | 'selectLeft' | 'selectRight'
  | 'editCell' | 'editFormula' | 'commitEdit' | 'cancelEdit'
  | 'copy' | 'cut' | 'paste' | 'fillDown' | 'fillRight'
  | 'undo' | 'redo' | 'delete' | 'clear'
  | 'expandRow' | 'collapseRow' | 'expandAll' | 'collapseAll'
  | 'search' | 'filter' | 'sort' | 'refresh'
  | 'toggleTotals' | 'toggleBanding' | 'exportData'
  | 'contextMenu' | 'help' | 'toggleFullscreen'
  | 'nextMeasure' | 'prevMeasure'
  | 'jumpToCell' | 'selectAll'
  | 'zoomIn' | 'zoomOut' | 'resetZoom';

export interface KeyboardShortcut {
  id: string;
  action: KeyboardAction;
  combos: KeyCombo[];
  description: string;
  category: 'navigation' | 'editing' | 'clipboard' | 'view' | 'data' | 'system';
  preventDefault: boolean;
  stopPropagation: boolean;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { id: 'move-up', action: 'moveUp', combos: [{ key: 'ArrowUp' }], description: 'Move to cell above', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'move-down', action: 'moveDown', combos: [{ key: 'ArrowDown' }], description: 'Move to cell below', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'move-left', action: 'moveLeft', combos: [{ key: 'ArrowLeft' }], description: 'Move to cell left', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'move-right', action: 'moveRight', combos: [{ key: 'ArrowRight' }], description: 'Move to cell right', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'move-first', action: 'moveFirst', combos: [{ key: 'Home' }, { key: 'Home', ctrl: true }], description: 'Move to first cell', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'move-last', action: 'moveLast', combos: [{ key: 'End' }, { key: 'End', ctrl: true }], description: 'Move to last cell', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'page-up', action: 'movePageUp', combos: [{ key: 'PageUp' }], description: 'Page up', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'page-down', action: 'movePageDown', combos: [{ key: 'PageDown' }], description: 'Page down', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'next-measure', action: 'nextMeasure', combos: [{ key: 'Tab' }], description: 'Next measure/column', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'prev-measure', action: 'prevMeasure', combos: [{ key: 'Tab', shift: true }], description: 'Previous measure/column', category: 'navigation', preventDefault: true, stopPropagation: false },
  
  // Selection
  { id: 'select-up', action: 'selectUp', combos: [{ key: 'ArrowUp', shift: true }], description: 'Extend selection up', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'select-down', action: 'selectDown', combos: [{ key: 'ArrowDown', shift: true }], description: 'Extend selection down', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'select-left', action: 'selectLeft', combos: [{ key: 'ArrowLeft', shift: true }], description: 'Extend selection left', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'select-right', action: 'selectRight', combos: [{ key: 'ArrowRight', shift: true }], description: 'Extend selection right', category: 'navigation', preventDefault: true, stopPropagation: false },
  { id: 'select-all', action: 'selectAll', combos: [{ key: 'a', ctrl: true }], description: 'Select all cells', category: 'navigation', preventDefault: true, stopPropagation: true },
  
  // Editing
  { id: 'edit-cell', action: 'editCell', combos: [{ key: 'Enter' }, { key: 'F2' }], description: 'Start editing cell', category: 'editing', preventDefault: true, stopPropagation: false },
  { id: 'edit-formula', action: 'editFormula', combos: [{ key: 'F2', ctrl: true }], description: 'Edit formula', category: 'editing', preventDefault: true, stopPropagation: false },
  { id: 'commit-edit', action: 'commitEdit', combos: [{ key: 'Enter' }], description: 'Commit edit', category: 'editing', preventDefault: true, stopPropagation: false },
  { id: 'cancel-edit', action: 'cancelEdit', combos: [{ key: 'Escape' }], description: 'Cancel edit', category: 'editing', preventDefault: true, stopPropagation: false },
  { id: 'delete', action: 'delete', combos: [{ key: 'Delete' }, { key: 'Backspace' }], description: 'Clear cell contents', category: 'editing', preventDefault: true, stopPropagation: false },
  { id: 'clear', action: 'clear', combos: [{ key: 'Delete', ctrl: true }], description: 'Clear all formats and content', category: 'editing', preventDefault: true, stopPropagation: false },
  
  // Clipboard
  { id: 'copy', action: 'copy', combos: [{ key: 'c', ctrl: true }], description: 'Copy selection', category: 'clipboard', preventDefault: true, stopPropagation: true },
  { id: 'cut', action: 'cut', combos: [{ key: 'x', ctrl: true }], description: 'Cut selection', category: 'clipboard', preventDefault: true, stopPropagation: true },
  { id: 'paste', action: 'paste', combos: [{ key: 'v', ctrl: true }], description: 'Paste', category: 'clipboard', preventDefault: true, stopPropagation: true },
  { id: 'fill-down', action: 'fillDown', combos: [{ key: 'd', ctrl: true }], description: 'Fill down', category: 'clipboard', preventDefault: true, stopPropagation: true },
  { id: 'fill-right', action: 'fillRight', combos: [{ key: 'r', ctrl: true }], description: 'Fill right', category: 'clipboard', preventDefault: true, stopPropagation: true },
  
  // Hierarchy
  { id: 'expand-row', action: 'expandRow', combos: [{ key: 'ArrowRight' }, { key: 'Plus' }], description: 'Expand row', category: 'data', preventDefault: true, stopPropagation: false },
  { id: 'collapse-row', action: 'collapseRow', combos: [{ key: 'ArrowLeft' }, { key: 'Minus' }], description: 'Collapse row', category: 'data', preventDefault: true, stopPropagation: false },
  { id: 'expand-all', action: 'expandAll', combos: [{ key: 'ArrowRight', ctrl: true, shift: true }], description: 'Expand all', category: 'data', preventDefault: true, stopPropagation: false },
  { id: 'collapse-all', action: 'collapseAll', combos: [{ key: 'ArrowLeft', ctrl: true, shift: true }], description: 'Collapse all', category: 'data', preventDefault: true, stopPropagation: false },
  
  // View
  { id: 'search', action: 'search', combos: [{ key: 'f', ctrl: true }], description: 'Find/Search', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'filter', action: 'filter', combos: [{ key: 'f', ctrl: true, shift: true }], description: 'Filter', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'sort', action: 'sort', combos: [{ key: 's', ctrl: true }], description: 'Sort', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'refresh', action: 'refresh', combos: [{ key: 'F5' }], description: 'Refresh data', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'toggle-totals', action: 'toggleTotals', combos: [{ key: 't', ctrl: true }], description: 'Toggle totals visibility', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'toggle-banding', action: 'toggleBanding', combos: [{ key: 'b', ctrl: true }], description: 'Toggle row banding', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'zoom-in', action: 'zoomIn', combos: [{ key: 'Plus', ctrl: true }], description: 'Zoom in', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'zoom-out', action: 'zoomOut', combos: [{ key: 'Minus', ctrl: true }], description: 'Zoom out', category: 'view', preventDefault: true, stopPropagation: false },
  { id: 'reset-zoom', action: 'resetZoom', combos: [{ key: '0', ctrl: true }], description: 'Reset zoom', category: 'view', preventDefault: true, stopPropagation: false },
  
  // System
  { id: 'undo', action: 'undo', combos: [{ key: 'z', ctrl: true }], description: 'Undo', category: 'system', preventDefault: true, stopPropagation: true },
  { id: 'redo', action: 'redo', combos: [{ key: 'y', ctrl: true }, { key: 'z', ctrl: true, shift: true }], description: 'Redo', category: 'system', preventDefault: true, stopPropagation: true },
  { id: 'context-menu', action: 'contextMenu', combos: [{ key: 'ContextMenu' }], description: 'Show context menu', category: 'system', preventDefault: true, stopPropagation: false },
  { id: 'help', action: 'help', combos: [{ key: 'F1' }], description: 'Show help', category: 'system', preventDefault: true, stopPropagation: false },
  { id: 'export', action: 'exportData', combos: [{ key: 'e', ctrl: true }], description: 'Export data', category: 'system', preventDefault: true, stopPropagation: false },
  { id: 'fullscreen', action: 'toggleFullscreen', combos: [{ key: 'f11' }], description: 'Toggle fullscreen', category: 'system', preventDefault: true, stopPropagation: false },
];

export interface KeyboardHandler {
  action: KeyboardAction;
  handler: (event: KeyboardEvent) => void | boolean;
  condition?: () => boolean;
}

export class KeyboardNavigationEngine {
  private shortcuts: Map<string, KeyboardShortcut>;
  private handlers: Map<KeyboardAction, Set<KeyboardHandler>>;
  private isEditMode: boolean;
  private isEnabled: boolean;
  private listeners: Set<(action: KeyboardAction, event: KeyboardEvent) => void>;

  constructor() {
    this.shortcuts = new Map();
    this.handlers = new Map();
    this.isEditMode = false;
    this.isEnabled = true;
    this.listeners = new Set();
    
    // Register default shortcuts
    this.registerShortcuts(DEFAULT_SHORTCUTS);
  }

  /**
   * Register keyboard shortcuts
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    for (const shortcut of shortcuts) {
      this.shortcuts.set(shortcut.id, shortcut);
    }
  }

  /**
   * Register action handler
   */
  on(action: KeyboardAction, handler: KeyboardHandler['handler'], condition?: () => boolean): () => void {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, new Set());
    }
    
    const handlerObj: KeyboardHandler = { action, handler, condition };
    this.handlers.get(action)!.add(handlerObj);
    
    return () => {
      this.handlers.get(action)?.delete(handlerObj);
    };
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.isEnabled) return false;

    const combo: KeyCombo = {
      key: event.key,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    // Find matching shortcut
    const shortcut = this.findMatchingShortcut(combo);
    if (!shortcut) return false;

    // Check if we should handle this action
    if (this.shouldHandleAction(shortcut.action)) {
      // Execute handlers
      const handlers = this.handlers.get(shortcut.action);
      if (handlers) {
        for (const handler of handlers) {
          if (handler.condition && !handler.condition()) continue;
          
          const result = handler.handler(event);
          if (result === true) {
            // Handler consumed the event
            if (shortcut.preventDefault) event.preventDefault();
            if (shortcut.stopPropagation) event.stopPropagation();
            
            this.notifyListeners(shortcut.action, event);
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Set edit mode state
   */
  setEditMode(isEditMode: boolean): void {
    this.isEditMode = isEditMode;
  }

  /**
   * Check if in edit mode
   */
  isInEditMode(): boolean {
    return this.isEditMode;
  }

  /**
   * Enable/disable keyboard navigation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get all shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return this.getShortcuts().filter(s => s.category === category);
  }

  /**
   * Subscribe to keyboard actions
   */
  subscribe(callback: (action: KeyboardAction, event: KeyboardEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Format shortcut for display (e.g., "Ctrl+C")
   */
  formatShortcut(combo: KeyCombo): string {
    const parts: string[] = [];
    if (combo.ctrl) parts.push('Ctrl');
    if (combo.alt) parts.push('Alt');
    if (combo.shift) parts.push('Shift');
    if (combo.meta) parts.push('Cmd');
    parts.push(combo.key);
    return parts.join('+');
  }

  /**
   * Dispose engine
   */
  dispose(): void {
    this.shortcuts.clear();
    this.handlers.clear();
    this.listeners.clear();
  }

  private findMatchingShortcut(combo: KeyCombo): KeyboardShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      for (const shortcutCombo of shortcut.combos) {
        if (this.combosMatch(combo, shortcutCombo)) {
          return shortcut;
        }
      }
    }
    return null;
  }

  private combosMatch(a: KeyCombo, b: KeyCombo): boolean {
    return (
      a.key.toLowerCase() === b.key.toLowerCase() &&
      !!a.ctrl === !!b.ctrl &&
      !!a.shift === !!b.shift &&
      !!a.alt === !!b.alt &&
      !!a.meta === !!b.meta
    );
  }

  private shouldHandleAction(action: KeyboardAction): boolean {
    // In edit mode, only allow certain actions
    if (this.isEditMode) {
      const allowedInEditMode: KeyboardAction[] = [
        'commitEdit', 'cancelEdit', 'moveUp', 'moveDown', 'moveLeft', 'moveRight',
      ];
      return allowedInEditMode.includes(action);
    }
    return true;
  }

  private notifyListeners(action: KeyboardAction, event: KeyboardEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(action, event);
      } catch (error) {
        console.error('Keyboard navigation listener error:', error);
      }
    });
  }
}

// React hook
export function useKeyboardNavigation() {
  const [engine] = useState(() => new KeyboardNavigationEngine());
  const [lastAction, setLastAction] = useState<KeyboardAction | null>(null);

  useEffect(() => {
    return engine.subscribe((action) => setLastAction(action));
  }, [engine]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    return engine.handleKeyDown(event);
  }, [engine]);

  return { engine, handleKeyDown, lastAction };
}

// Accessibility helpers
export const ARIA_LABELS: Record<KeyboardAction, string> = {
  moveUp: 'Move to cell above',
  moveDown: 'Move to cell below',
  moveLeft: 'Move to cell left',
  moveRight: 'Move to cell right',
  moveFirst: 'Move to first cell',
  moveLast: 'Move to last cell',
  movePageUp: 'Page up',
  movePageDown: 'Page down',
  selectUp: 'Extend selection up',
  selectDown: 'Extend selection down',
  selectLeft: 'Extend selection left',
  selectRight: 'Extend selection right',
  editCell: 'Edit cell',
  editFormula: 'Edit formula',
  commitEdit: 'Commit edit',
  cancelEdit: 'Cancel edit',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',
  fillDown: 'Fill down',
  fillRight: 'Fill right',
  undo: 'Undo',
  redo: 'Redo',
  delete: 'Delete',
  clear: 'Clear',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  expandAll: 'Expand all rows',
  collapseAll: 'Collapse all rows',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  refresh: 'Refresh',
  toggleTotals: 'Toggle totals',
  toggleBanding: 'Toggle row banding',
  exportData: 'Export data',
  contextMenu: 'Context menu',
  help: 'Help',
  toggleFullscreen: 'Toggle fullscreen',
  nextMeasure: 'Next measure',
  prevMeasure: 'Previous measure',
  jumpToCell: 'Jump to cell',
  selectAll: 'Select all',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
};

// Export
export const KeyboardNavigation = {
  KeyboardNavigationEngine,
  useKeyboardNavigation,
  DEFAULT_SHORTCUTS,
  ARIA_LABELS,
};

export default KeyboardNavigationEngine;
