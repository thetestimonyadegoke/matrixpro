/**
 * Matrix Search and Find Component
 * Provides Excel-like search functionality within the matrix
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CellValue } from '../model/pivot';
import { FlattenedNode } from '../model/tree';

export interface SearchOptions {
  caseSensitive: boolean;
  matchWholeWord: boolean;
  searchInValues: boolean;
  searchInLabels: boolean;
  searchInFormulas: boolean;
  direction: 'forward' | 'backward';
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  matchWholeWord: false,
  searchInValues: true,
  searchInLabels: true,
  searchInFormulas: true,
  direction: 'forward',
};

export interface SearchResult {
  rowKey: string;
  colKey: string;
  measureIndex: number;
  rowIndex: number;
  colIndex: number;
  value: string;
  type: 'value' | 'label' | 'formula';
}

interface MatrixSearchProps {
  isOpen: boolean;
  onClose: () => void;
  rows: FlattenedNode[];
  columns: FlattenedNode[];
  measures: { index: number; name: string }[];
  cellMap: { get: (key: string) => CellValue | undefined };
  currentPosition?: { rowKey: string; colKey: string; measureIndex: number };
  onNavigateToResult: (result: SearchResult) => void;
}

export const MatrixSearch: React.FC<MatrixSearchProps> = ({
  isOpen,
  onClose,
  rows,
  columns,
  measures,
  cellMap,
  currentPosition,
  onNavigateToResult,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        navigateResult('prev');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        navigateResult('next');
      } else if (e.key === 'F3' || (e.key === 'g' && e.ctrlKey)) {
        e.preventDefault();
        navigateResult(e.shiftKey ? 'prev' : 'next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, currentResultIndex, onClose]);

  const performSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    setIsSearching(true);
    
    const searchResults: SearchResult[] = [];
    const term = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();

    // Search in row labels
    if (options.searchInLabels) {
      rows.forEach((row, rowIndex) => {
        const label = options.caseSensitive ? row.label : row.label.toLowerCase();
        if (options.matchWholeWord ? label === term : label.includes(term)) {
          searchResults.push({
            rowKey: row.key,
            colKey: columns[0]?.key || '',
            measureIndex: 0,
            rowIndex,
            colIndex: 0,
            value: row.label,
            type: 'label',
          });
        }
      });
    }

    // Search in cell values and formulas
    rows.forEach((row, rowIndex) => {
      columns.forEach((col, colIndex) => {
        measures.forEach((measure, measureIndex) => {
          const cellKey = `${row.key}|${col.key}|${measure.index}`;
          const cell = cellMap.get(cellKey);
          
          if (!cell) return;

          // Search in values
          if (options.searchInValues && cell.value !== null && cell.value !== undefined) {
            const value = String(cell.value);
            const compareValue = options.caseSensitive ? value : value.toLowerCase();
            if (options.matchWholeWord ? compareValue === term : compareValue.includes(term)) {
              searchResults.push({
                rowKey: row.key,
                colKey: col.key,
                measureIndex: measure.index,
                rowIndex,
                colIndex,
                value,
                type: 'value',
              });
            }
          }

          // Search in formatted values (display)
          if (options.searchInValues && cell.formattedValue) {
            const formatted = options.caseSensitive 
              ? cell.formattedValue 
              : cell.formattedValue.toLowerCase();
            if (options.matchWholeWord ? formatted === term : formatted.includes(term)) {
              // Only add if not already added as raw value
              const alreadyAdded = searchResults.some(
                r => r.rowKey === row.key && r.colKey === col.key && r.measureIndex === measure.index
              );
              if (!alreadyAdded) {
                searchResults.push({
                  rowKey: row.key,
                  colKey: col.key,
                  measureIndex: measure.index,
                  rowIndex,
                  colIndex,
                  value: cell.formattedValue,
                  type: 'value',
                });
              }
            }
          }
        });
      });
    });

    setResults(searchResults);
    setCurrentResultIndex(searchResults.length > 0 ? 0 : -1);
    setIsSearching(false);

    // Auto-navigate to first result
    if (searchResults.length > 0) {
      onNavigateToResult(searchResults[0]);
    }
  }, [searchTerm, options, rows, columns, measures, cellMap, onNavigateToResult]);

  const navigateResult = useCallback((direction: 'next' | 'prev') => {
    if (results.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentResultIndex + 1;
      if (newIndex >= results.length) newIndex = 0;
    } else {
      newIndex = currentResultIndex - 1;
      if (newIndex < 0) newIndex = results.length - 1;
    }

    setCurrentResultIndex(newIndex);
    onNavigateToResult(results[newIndex]);
  }, [results, currentResultIndex, onNavigateToResult]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, options, performSearch]);

  if (!isOpen) return null;

  return (
    <div
      className="matrix-search-panel"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 380,
        backgroundColor: 'var(--matrix-bg-primary)',
        border: '1px solid var(--matrix-border-color)',
        borderRadius: 8,
        boxShadow: 'var(--matrix-shadow-lg)',
        zIndex: 1000,
        padding: 16,
      }}
      role="search"
      aria-label="Find in matrix"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid var(--matrix-border-color)',
            borderRadius: 4,
            fontSize: 14,
            outline: 'none',
          }}
          aria-label="Search term"
        />
        <span style={{ fontSize: 12, color: 'var(--matrix-text-muted)' }}>
          {results.length > 0 ? `${currentResultIndex + 1} of ${results.length}` : '0 results'}
        </span>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={options.caseSensitive}
            onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
          />
          Match case
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={options.matchWholeWord}
            onChange={(e) => setOptions({ ...options, matchWholeWord: e.target.checked })}
          />
          Whole word
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={options.searchInValues}
            onChange={(e) => setOptions({ ...options, searchInValues: e.target.checked })}
          />
          Values
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={options.searchInLabels}
            onChange={(e) => setOptions({ ...options, searchInLabels: e.target.checked })}
          />
          Labels
        </label>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigateResult('prev')}
            disabled={results.length === 0}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--matrix-bg-secondary)',
              border: '1px solid var(--matrix-border-color)',
              borderRadius: 4,
              cursor: results.length > 0 ? 'pointer' : 'not-allowed',
              opacity: results.length > 0 ? 1 : 0.5,
              fontSize: 12,
            }}
            title="Previous (Shift+Enter)"
          >
            ← Prev
          </button>
          <button
            onClick={() => navigateResult('next')}
            disabled={results.length === 0}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--matrix-bg-secondary)',
              border: '1px solid var(--matrix-border-color)',
              borderRadius: 4,
              cursor: results.length > 0 ? 'pointer' : 'not-allowed',
              opacity: results.length > 0 ? 1 : 0.5,
              fontSize: 12,
            }}
            title="Next (Enter)"
          >
            Next →
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--matrix-border-color)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Close (Esc)
        </button>
      </div>

      {isSearching && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--matrix-text-muted)' }}>
          Searching...
        </div>
      )}

      {results.length === 0 && searchTerm && !isSearching && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--matrix-text-muted)' }}>
          No results found
        </div>
      )}
    </div>
  );
};

// Hook for keyboard shortcut to open search
export function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}

// Highlight matching text
export function highlightText(text: string, searchTerm: string, caseSensitive = false): React.ReactNode {
  if (!searchTerm) return text;

  const parts = caseSensitive
    ? text.split(new RegExp(`(${escapeRegExp(searchTerm)})`, 'g'))
    : text.split(new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi'));

  return parts.map((part, i) => {
    const isMatch = caseSensitive
      ? part === searchTerm
      : part.toLowerCase() === searchTerm.toLowerCase();
    
    if (isMatch) {
      return (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--matrix-primary)',
            color: 'white',
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
  DEFAULT_SEARCH_OPTIONS,
};

export default MatrixSearch;
