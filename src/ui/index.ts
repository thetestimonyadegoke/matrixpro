/**
 * UI Module Index
 * Exports all UI components, hooks, and utilities for MatrixPro
 */

// Core Components
export { Matrix } from './Matrix';
export { Cell } from './Cell';
export { Row } from './Row';
export { RowHeader } from './RowHeader';
export { MergedColumnHeaders } from './MergedColumnHeaders';
export { FormulaBar } from './FormulaBar';
export { ContextMenu, buildCellMenuItems, buildRowHeaderMenuItems, buildColumnHeaderMenuItems } from './ContextMenu';

// Design System
export {
  DesignSystem,
  lightTheme,
  darkTheme,
  applyTheme,
  generateThemeCSS,
  animationKeyframes,
  utilityClasses,
} from './designSystem';

// Loading States
export {
  LoadingStates,
  Skeleton,
  MatrixSkeleton,
  LoadingOverlay,
  ErrorState,
  EmptyState,
} from './loadingStates';

// Error Handling
export {
  ErrorHandling,
  MatrixErrorBoundary,
  useErrorHandler,
  safeAsync,
  safeSync,
} from './errorBoundary';

// Animations
export {
  Animations,
  AnimatedContainer,
  RippleEffect,
  StaggeredList,
  HoverScale,
  FadeTransition,
  PulseIndicator,
  LoadingDots,
  Collapse,
  animationCSS,
} from './animations';

// Accessibility
export {
  Accessibility,
  Announcer,
  SkipLink,
  VisuallyHidden,
  AccessibleButton,
  AccessibleTooltip,
  AccessibleCell,
  AccessibleProgress,
  StatusMessage,
  useAnnouncer,
  useFocusTrap,
  useHighContrastMode,
  useReducedMotion,
} from './accessibility';

// Inline Editing
export {
  InlineEditing,
  InlineCellEditor,
  EditableCell,
  CellValidators,
  CellFormatters,
} from './inlineEditing';

// Matrix Search
export {
  MatrixSearchComponent,
  MatrixSearch,
  useSearchShortcut,
  highlightText,
  DEFAULT_SEARCH_OPTIONS,
} from './matrixSearch';

// Touch Support
export {
  TouchSupport,
  useTouchGestures,
  TouchScrollContainer,
  PullToRefresh,
  TouchFriendlyButton,
  VirtualKeyboard,
  isTouchDevice,
  useTouchDevice,
} from './touchSupport';

// Visual Feedback
export {
  VisualFeedback,
  ResizeIndicator,
  ResizeHandle,
  VisualFeedbackProvider,
  DragPreview,
  DropZoneIndicator,
} from './visualFeedback';

// Cell Editing Engine
export {
  CellEditing,
  CellEditingEngine,
  useCellEditingEngine,
  DEFAULT_EDITOR_OPTIONS,
} from './cellEditing';

// Formula Bar Engine
export {
  FormulaBar as FormulaBarSystem,
  FormulaBarEngine,
  useFormulaBarEngine,
  FORMULA_FUNCTIONS,
  formatFormula,
  highlightFormulaSyntax,
} from './formulaBarEngine';

// Keyboard Navigation
export {
  KeyboardNavigation,
  KeyboardNavigationEngine,
  useKeyboardNavigation,
  DEFAULT_SHORTCUTS,
  ARIA_LABELS,
} from './keyboardNavigation';

// Styles
export {
  Styles,
  matrixProStyles,
  injectStyles,
} from './styles';

// Re-export types
export type { 
  FormulaBarState, 
  FormulaSuggestion, 
  FormulaValidationResult 
} from './formulaBarEngine';

export type { 
  EditState, 
  SelectionState, 
  CellPosition, 
  CellRange, 
  CellEditorOptions 
} from './cellEditing';

export type { 
  KeyboardShortcut, 
  KeyboardAction, 
  KeyCombo,
  KeyboardHandler 
} from './keyboardNavigation';

export type {
  SearchOptions,
  SearchResult,
} from './matrixSearch';

// Utility function to initialize all UI systems
export function initializeUI(): void {
  // Import and call injectStyles
  const { injectStyles } = require('./styles');
  injectStyles();
}
