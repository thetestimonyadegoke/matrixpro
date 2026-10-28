/**
 * Matrix Search and Find Component
 * Provides Excel-like Find (Ctrl+F) over row labels and displayed cell text.
 *
 * The matching logic (`findMatches`, `textMatches`) is pure so it can be unit
 * tested; the grid supplies the text each row/cell shows on screen through a
 * `SearchTarget`, so matches always reflect what the user sees.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FlattenedNode } from '../model/tree';
import { CellValue } from '../model/pivot';
import { GridColumn } from '../model/gridColumns';
import { VisualSettings } from '../settings/settings';
import { CalcRowFormat, resolveCalcRowFormat, resolveCellDisplay } from '../format/cellDisplay';
import { parseColFormats, parseRowFormats } from '../format/directFormats';
import { parseJsonObjectCached } from '../utils/jsonCache';
import { getRowDisplayLabel } from './RowHeader';

export interface SearchOptions {
  caseSensitive: boolean;
  matchWholeWord: boolean;
  searchInValues: boolean;
  searchInLabels: boolean;
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  matchWholeWord: false,
  searchInValues: true,
  searchInLabels: true,
};

/** Upper bound on collected matches so a one-character search on a huge grid stays responsive. */
export const MAX_SEARCH_RESULTS = 5000;

export interface SearchResult {
  rowKey: string;
  /** Index into the flattened rows array (drives vertical scrolling). */
  rowIndex: number;
  /** Grid column key, or null for a row-label match. */
  colKey: string | null;
  measureIndex: number | null;
  /** Index into the grid columns array, or -1 for a row-label match. */
  gridColIndex: number;
  /** The displayed text that matched. */
  text: string;
  type: 'label' | 'value';
}

/** What the grid shows, as seen by the search. */
export interface SearchTarget {
  rows: FlattenedNode[];
  gridColumns: GridColumn[];
  getRowLabel: (row: FlattenedNode) => string;
  getCellText: (row: FlattenedNode, gridCol: GridColumn) => string;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** True when `term` occurs in `text` under the given case / whole-word options. */
export function textMatches(text: string, term: string, options: Pick<SearchOptions, 'caseSensitive' | 'matchWholeWord'>): boolean {
  if (!term || !text) return false;
  const haystack = options.caseSensitive ? text : text.toLowerCase();
  const needle = options.caseSensitive ? term : term.toLowerCase();
  if (!options.matchWholeWord) return haystack.includes(needle);

  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) return false;
    const before = idx > 0 ? haystack[idx - 1] : '';
    const after = haystack[idx + needle.length] ?? '';
    if (!(before && WORD_CHAR.test(before)) && !(after && WORD_CHAR.test(after))) return true;
    from = idx + 1;
  }
}

/**
 * All matches in display order: row by row, the row label first and then
 * each grid column left to right. Spacer rows (blank / divider) are skipped
 * and group header rows only expose their label, mirroring what the grid renders.
 */
export function findMatches(
  target: SearchTarget,
  term: string,
  options: SearchOptions,
  limit: number = MAX_SEARCH_RESULTS
): SearchResult[] {
  const results: SearchResult[] = [];
  if (!term.trim()) return results;

  const { rows, gridColumns, getRowLabel, getCellText } = target;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.calcRowKind === 'blank' || row.calcRowKind === 'divider') continue;

    if (options.searchInLabels) {
      const label = getRowLabel(row);
      if (textMatches(label, term, options)) {
        results.push({ rowKey: row.key, rowIndex, colKey: null, measureIndex: null, gridColIndex: -1, text: label, type: 'label' });
        if (results.length >= limit) return results;
      }
    }

    if (!options.searchInValues || row.calcRowKind === 'group') continue;
    for (let gridColIndex = 0; gridColIndex < gridColumns.length; gridColIndex++) {
      const gridCol = gridColumns[gridColIndex];
      const text = getCellText(row, gridCol);
      if (textMatches(text, term, options)) {
        results.push({
          rowKey: row.key,
          rowIndex,
          colKey: gridCol.col.key,
          measureIndex: gridCol.measureIndex,
          gridColIndex,
          text,
          type: 'value',
        });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

/** Placeholder the grid shows for a missing value; never a search hit. */
const MISSING_CELL_TEXT = '—';

/**
 * Search target over the live grid: row labels as the row header renders
 * them and cell text from `resolveCellDisplay` (the same path Row.tsx and
 * the exporters use), so matches are exactly what is on screen.
 */
export function createGridSearchTarget(
  rows: FlattenedNode[],
  gridColumns: GridColumn[],
  cellMap: { get: (key: string) => CellValue | undefined },
  settings: VisualSettings,
  labelOverrides?: Record<string, string>
): SearchTarget {
  const colFormats = parseColFormats(settings.manualData.colFormats);
  const rowFormats = parseRowFormats(settings.manualData.rowFormats);
  const manualEdits = parseJsonObjectCached<Record<string, unknown>>(settings.manualData.edits);
  const calcRowFormats = new Map<string, CalcRowFormat | null>();

  return {
    rows,
    gridColumns,
    getRowLabel: row => getRowDisplayLabel(row, settings, labelOverrides),
    getCellText: (row, gridCol) => {
      let calcRowFormat = calcRowFormats.get(row.key);
      if (calcRowFormat === undefined) {
        calcRowFormat = resolveCalcRowFormat(row.key, settings.calculations.rows);
        calcRowFormats.set(row.key, calcRowFormat);
      }
      const thisRowFormat = rowFormats[row.key]
        || (row.calcRowDefId ? rowFormats[`__calcrow__${row.calcRowDefId}`] || rowFormats[row.calcRowDefId] : undefined);
      const { displayFormatted } = resolveCellDisplay({
        row,
        gridCol,
        cellMap,
        settings,
        manualEdits,
        colFormats,
        thisRowFormat,
        calcRowFormat,
      });
      return displayFormatted === MISSING_CELL_TEXT ? '' : displayFormatted;
    },
  };
}

/** Index of the next / previous result, wrapping around. -1 when there are no results. */
export function stepResultIndex(current: number, count: number, direction: 'next' | 'prev'): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return direction === 'next' ? 0 : count - 1;
  return direction === 'next' ? (current + 1) % count : (current - 1 + count) % count;
}

/** True when keyboard focus is in a text-entry control that should keep its own shortcuts. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
}

/** Ctrl/Cmd+F without Shift/Alt (Ctrl+Shift+F etc. stay free for other uses). */
export function isFindShortcut(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): boolean {
  return (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'f' || e.key === 'F');
}

const PANEL_BORDER = 'var(--matrix-border-color, var(--mx-border, #e0e0e0))';
const PANEL_TEXT_MUTED = 'var(--matrix-text-muted, var(--mx-text-muted, #8a8a8a))';
const PANEL_BUTTON_BG = 'var(--matrix-bg-secondary, var(--mx-surface-subtle, #f5f5f5))';

interface MatrixSearchProps {
  isOpen: boolean;
  onClose: () => void;
  target: SearchTarget;
  onNavigateToResult: (result: SearchResult | null) => void;
  /** Debounce before re-running the search after typing (ms). */
  debounceMs?: number;
}

export const MatrixSearch: React.FC<MatrixSearchProps> = ({
  isOpen,
  onClose,
  target,
  onNavigateToResult,
  debounceMs = 200,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the latest callback without making it a dependency of the search
  // effects (parents often pass an inline function).
  const navigateRef = useRef(onNavigateToResult);
  navigateRef.current = onNavigateToResult;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const results = useMemo(
    () => (isOpen ? findMatches(target, debouncedTerm, options) : []),
    [isOpen, target, debouncedTerm, options]
  );

  // A new query (or reopening) jumps to the first match; a data refresh
  // with the same query only keeps the current index in range.
  const lastQueryRef = useRef<{ term: string; options: SearchOptions; open: boolean } | null>(null);
  useEffect(() => {
    const last = lastQueryRef.current;
    const queryChanged = !last || last.term !== debouncedTerm || last.options !== options || last.open !== isOpen;
    lastQueryRef.current = { term: debouncedTerm, options, open: isOpen };
    if (!isOpen) return;
    if (queryChanged) {
      const next = results.length > 0 ? 0 : -1;
      setCurrentResultIndex(next);
      navigateRef.current(next >= 0 ? results[0] : null);
    } else {
      setCurrentResultIndex(idx => (idx >= results.length ? results.length - 1 : idx));
    }
  }, [results, debouncedTerm, options, isOpen]);

  const navigateResult = useCallback((direction: 'next' | 'prev') => {
    if (results.length === 0) return;
    const newIndex = stepResultIndex(currentResultIndex, results.length, direction);
    setCurrentResultIndex(newIndex);
    navigateRef.current(results[newIndex]);
  }, [results, currentResultIndex]);

  // Keys are handled on the panel itself (not the document) so Enter/Escape
  // elsewhere in the visual keep their normal meaning.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter' || e.key === 'F3') {
      if (e.key === 'Enter' && e.target !== inputRef.current) return; // let buttons/checkboxes activate
      e.preventDefault();
      e.stopPropagation();
      navigateResult(e.shiftKey ? 'prev' : 'next');
    } else if (isFindShortcut(e.nativeEvent)) {
      // Ctrl+F while open re-selects the query instead of opening the browser's find.
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [navigateResult, onClose]);

  if (!isOpen) return null;

  const isPending = searchTerm !== debouncedTerm;
  const capped = results.length >= MAX_SEARCH_RESULTS;
  const countLabel = !debouncedTerm.trim()
    ? ''
    : results.length > 0
      ? `${currentResultIndex + 1} of ${results.length}${capped ? '+' : ''}`
      : 'No results';

  const checkbox = (key: keyof SearchOptions, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={options[key]}
        onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
      />
      {label}
    </label>
  );

  const navButtonStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    backgroundColor: PANEL_BUTTON_BG,
    color: 'inherit',
    border: `1px solid ${PANEL_BORDER}`,
    borderRadius: 4,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    fontSize: 12,
  });

  return (
    <div
      className="matrix-search-panel"
      style={{
        position: 'absolute',
        top: 8,
        right: 16,
        width: 340,
        maxWidth: 'calc(100% - 32px)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--matrix-bg-primary, var(--mx-surface, #ffffff))',
        color: 'var(--matrix-text-primary, var(--mx-text, #1a1a1a))',
        fontFamily: 'var(--mx-font-family, inherit)',
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 8,
        boxShadow: 'var(--matrix-shadow-lg, var(--mx-shadow-elevated, 0 8px 24px rgba(0, 0, 0, 0.16)))',
        zIndex: 1000,
        padding: 12,
      }}
      role="search"
      aria-label="Find in matrix"
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find in labels and values..."
          style={{
            flex: 1,
            minWidth: 0,
            padding: '6px 10px',
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 4,
            fontSize: 13,
            background: 'transparent',
            color: 'inherit',
          }}
          aria-label="Search term"
        />
        <span
          style={{ fontSize: 12, color: PANEL_TEXT_MUTED, whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}
          role="status"
          aria-live="polite"
        >
          {isPending ? '…' : countLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, fontSize: 12 }}>
        {checkbox('caseSensitive', 'Match case')}
        {checkbox('matchWholeWord', 'Whole word')}
        {checkbox('searchInLabels', 'Labels')}
        {checkbox('searchInValues', 'Values')}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigateResult('prev')}
            disabled={results.length === 0}
            style={navButtonStyle(results.length > 0)}
            title="Previous (Shift+Enter)"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => navigateResult('next')}
            disabled={results.length === 0}
            style={navButtonStyle(results.length > 0)}
            title="Next (Enter)"
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ ...navButtonStyle(true), backgroundColor: 'transparent' }}
          title="Close (Esc)"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/**
 * Opens search on Ctrl/Cmd+F anywhere in the document, except while the
 * user is typing in an input (formula bar, panels, ...), which keeps its
 * own Ctrl+F behaviour.
 */
export function useSearchShortcut(onOpen: () => void, enabled = true): void {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isFindShortcut(e) || isEditableTarget(e.target)) return;
      e.preventDefault();
      onOpenRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

// Highlight matching text
export function highlightText(text: string, searchTerm: string, caseSensitive = false): React.ReactNode {
  if (!searchTerm) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(searchTerm)})`, caseSensitive ? 'g' : 'gi'));

  return parts.map((part, i) => {
    const isMatch = caseSensitive
      ? part === searchTerm
      : part.toLowerCase() === searchTerm.toLowerCase();

    if (isMatch) {
      return (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--matrix-primary, var(--mx-accent, #2d74da))',
            color: 'var(--mx-text-inverse, #ffffff)',
            padding: '0 2px',
            borderRadius: 2,
          }}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const MatrixSearchComponent = {
  MatrixSearch,
  useSearchShortcut,
  highlightText,
  findMatches,
  DEFAULT_SEARCH_OPTIONS,
};

export default MatrixSearch;
