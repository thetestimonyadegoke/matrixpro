/**
 * MatrixPro Modern CSS Styles
 * Comprehensive styling for all UI components
 */

export const matrixProStyles = `
/* ============================================
   MatrixPro Design System - Modern CSS
   ============================================ */

/* CSS Variables */
:root {
  /* Primary Colors */
  --matrix-primary: #2563eb;
  --matrix-primary-light: #3b82f6;
  --matrix-primary-dark: #1d4ed8;
  --matrix-secondary: #64748b;
  --matrix-accent: #8b5cf6;
  
  /* Status Colors */
  --matrix-success: #10b981;
  --matrix-warning: #f59e0b;
  --matrix-error: #ef4444;
  --matrix-info: #06b6d4;
  
  /* Background Colors */
  --matrix-bg-primary: #ffffff;
  --matrix-bg-secondary: #f8fafc;
  --matrix-bg-tertiary: #f1f5f9;
  --matrix-bg-hover: #f8fafc;
  --matrix-bg-active: #eff6ff;
  --matrix-bg-selected: #dbeafe;
  --matrix-bg-edited: #fef3c7;
  --matrix-bg-subtotal: #f8fafc;
  --matrix-bg-grandtotal: #e2e8f0;
  
  /* Text Colors */
  --matrix-text-primary: #0f172a;
  --matrix-text-secondary: #475569;
  --matrix-text-muted: #94a3b8;
  --matrix-text-inverse: #ffffff;
  
  /* Border Colors */
  --matrix-border-color: #e2e8f0;
  --matrix-border-light: #f1f5f9;
  --matrix-border-active: #3b82f6;
  
  /* Typography */
  --matrix-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --matrix-font-mono: "SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace;
  
  /* Spacing */
  --matrix-spacing-xs: 2px;
  --matrix-spacing-sm: 4px;
  --matrix-spacing-md: 8px;
  --matrix-spacing-lg: 16px;
  --matrix-spacing-xl: 24px;
  
  /* Shadows */
  --matrix-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --matrix-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --matrix-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --matrix-shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.3);
  
  /* Transitions */
  --matrix-transition-fast: 100ms ease;
  --matrix-transition-normal: 200ms ease;
  --matrix-transition-slow: 300ms ease;
  
  /* Z-Index Scale */
  --matrix-z-base: 0;
  --matrix-z-dropdown: 100;
  --matrix-z-sticky: 50;
  --matrix-z-modal: 200;
  --matrix-z-tooltip: 300;
  --matrix-z-context-menu: 250;
}

/* ============================================
   Matrix Container
   ============================================ */
.matrix-container {
  display: flex;
  flex-direction: column;
  font-family: var(--matrix-font-family);
  background-color: var(--matrix-bg-primary);
  color: var(--matrix-text-primary);
  overflow: hidden;
  position: relative;
}

/* ============================================
   Formula Bar
   ============================================ */
.matrix-formula-bar {
  display: flex;
  align-items: center;
  padding: var(--matrix-spacing-sm) var(--matrix-spacing-md);
  background-color: var(--matrix-bg-secondary);
  border-bottom: 1px solid var(--matrix-border-color);
  gap: var(--matrix-spacing-md);
}

.matrix-formula-bar .formula-bar-address {
  min-width: 80px;
  padding: var(--matrix-spacing-sm) var(--matrix-spacing-md);
  background-color: var(--matrix-bg-primary);
  border: 1px solid var(--matrix-border-color);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: var(--matrix-text-secondary);
}

.matrix-formula-bar .formula-bar-fx {
  font-family: var(--matrix-font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--matrix-primary);
  font-style: italic;
}

.matrix-formula-bar .formula-bar-input-wrapper {
  flex: 1;
  position: relative;
}

.matrix-formula-bar .formula-bar-editor {
  width: 100%;
  padding: var(--matrix-spacing-sm) var(--matrix-spacing-md);
  border: 1px solid var(--matrix-border-color);
  border-radius: 4px;
  font-family: var(--matrix-font-mono);
  font-size: 14px;
  background-color: var(--matrix-bg-primary);
  transition: var(--matrix-transition-normal);
  resize: none;
}

.matrix-formula-bar .formula-bar-editor:focus {
  outline: none;
  border-color: var(--matrix-primary);
  box-shadow: var(--matrix-shadow-focus);
}

.matrix-formula-bar .formula-bar-actions {
  display: flex;
  gap: var(--matrix-spacing-sm);
}

.matrix-formula-bar .formula-bar-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
  font-size: 14px;
  transition: var(--matrix-transition-fast);
}

.matrix-formula-bar .formula-bar-btn:hover:not(:disabled) {
  background-color: var(--matrix-bg-hover);
}

.matrix-formula-bar .formula-bar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.matrix-formula-bar .formula-bar-btn.commit {
  color: var(--matrix-success);
}

.matrix-formula-bar .formula-bar-btn.cancel {
  color: var(--matrix-error);
}

/* ============================================
   Headers
   ============================================ */
.matrix-header-area {
  background-color: var(--matrix-bg-secondary);
  border-bottom: 1px solid var(--matrix-border-color);
  z-index: var(--matrix-z-sticky);
}

.matrix-col-headers {
  overflow: hidden;
  position: relative;
}

/* ============================================
   Row Headers
   ============================================ */
.matrix-row-headers {
  background-color: var(--matrix-bg-secondary);
  border-right: 1px solid var(--matrix-border-color);
  overflow: hidden;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: var(--matrix-z-sticky);
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
}

.matrix-row-headers-inner {
  position: relative;
}

/* ============================================
   Data Grid
   ============================================ */
.matrix-body-area {
  display: flex;
  overflow: auto;
  position: relative;
  flex: 1;
}

.matrix-cells {
  flex: 1;
  overflow: visible;
}

.matrix-cells-inner {
  position: relative;
}

/* ============================================
   Rows
   ============================================ */
.matrix-row {
  display: flex;
  position: absolute;
  left: 0;
  right: 0;
  transition: background-color var(--matrix-transition-fast);
}

.matrix-row:hover {
  background-color: var(--matrix-bg-hover);
}

.matrix-row.selected {
  background-color: var(--matrix-bg-selected);
}

.matrix-row.banded {
  background-color: var(--matrix-bg-secondary);
}

.matrix-row.subtotal-row {
  background-color: var(--matrix-bg-subtotal);
  font-weight: 600;
}

.matrix-row.grandtotal-row {
  background-color: var(--matrix-bg-grandtotal);
  font-weight: 700;
  border-top: 2px solid var(--matrix-border-color);
}

/* ============================================
   Cells
   ============================================ */
.matrix-cell {
  display: flex;
  align-items: center;
  padding: 0 var(--matrix-spacing-md);
  border-right: 1px solid var(--matrix-border-light);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  transition: var(--matrix-transition-fast);
}

.matrix-cell:hover {
  background-color: var(--matrix-bg-hover);
}

.matrix-cell.active {
  outline: 2px solid var(--matrix-primary);
  outline-offset: -2px;
  z-index: 1;
}

.matrix-cell.edited {
  background-color: var(--matrix-bg-edited);
}

.matrix-cell .cell-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.matrix-cell .edited-marker {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 6px;
  height: 6px;
  background-color: var(--matrix-warning);
  border-radius: 50%;
}

.matrix-cell .note-marker {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 6px 6px;
  border-color: transparent transparent var(--matrix-info) transparent;
}

.matrix-cell .cell-edit-affordance {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 10px;
  color: var(--matrix-text-muted);
  opacity: 0;
  transition: opacity var(--matrix-transition-fast);
}

.matrix-cell:hover .cell-edit-affordance {
  opacity: 0.5;
}

/* Alignment classes */
.matrix-cell.align-left {
  justify-content: flex-start;
}

.matrix-cell.align-center {
  justify-content: center;
}

.matrix-cell.align-right {
  justify-content: flex-end;
}

/* ============================================
   Context Menu
   ============================================ */
.context-menu {
  position: fixed;
  background-color: var(--matrix-bg-primary);
  border: 1px solid var(--matrix-border-color);
  border-radius: 8px;
  box-shadow: var(--matrix-shadow-lg);
  padding: var(--matrix-spacing-sm) 0;
  min-width: 180px;
  z-index: var(--matrix-z-context-menu);
  animation: matrix-fade-in var(--matrix-transition-normal);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--matrix-spacing-md);
  padding: var(--matrix-spacing-md) var(--matrix-spacing-lg);
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--matrix-text-primary);
  text-align: left;
  transition: background-color var(--matrix-transition-fast);
}

.context-menu-item:hover:not(:disabled) {
  background-color: var(--matrix-bg-hover);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--matrix-border-color);
  margin: var(--matrix-spacing-sm) 0;
}

/* ============================================
   Inline Editor
   ============================================ */
.matrix-inline-editor {
  animation: matrix-scale-in var(--matrix-transition-normal);
}

/* ============================================
   Search Panel
   ============================================ */
.matrix-search-panel {
  animation: matrix-slide-in var(--matrix-transition-normal);
}

/* ============================================
   Skeleton Loading
   ============================================ */
.matrix-skeleton {
  background: linear-gradient(
    90deg,
    var(--matrix-bg-secondary) 25%,
    var(--matrix-bg-tertiary) 50%,
    var(--matrix-bg-secondary) 75%
  );
  background-size: 200% 100%;
}

.matrix-skeleton.animate {
  animation: matrix-shimmer 1.5s infinite;
}

/* ============================================
   Animations
   ============================================ */
@keyframes matrix-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes matrix-slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes matrix-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes matrix-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes matrix-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes matrix-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes matrix-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes matrix-highlight {
  0% { background-color: var(--matrix-bg-selected); }
  50% { background-color: var(--matrix-primary-light); }
  100% { background-color: var(--matrix-bg-selected); }
}

/* ============================================
   Scrollbar Styling
   ============================================ */
.matrix-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--matrix-border-color) transparent;
}

.matrix-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.matrix-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.matrix-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--matrix-border-color);
  border-radius: 4px;
}

.matrix-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--matrix-text-muted);
}

/* ============================================
   Focus States
   ============================================ */
.matrix-focus:focus-visible {
  outline: 2px solid var(--matrix-primary);
  outline-offset: -2px;
}

/* ============================================
   Utility Classes
   ============================================ */
.matrix-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.matrix-no-select {
  user-select: none;
  -webkit-user-select: none;
}

.matrix-glass {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ============================================
   Responsive Adjustments
   ============================================ */
@media (max-width: 768px) {
  .matrix-formula-bar {
    flex-wrap: wrap;
    padding: var(--matrix-spacing-xs);
  }
  
  .matrix-formula-bar .formula-bar-address {
    min-width: 60px;
  }
  
  .context-menu {
    max-width: calc(100vw - 32px);
  }
}

/* ============================================
   High Contrast Mode
   ============================================ */
@media (prefers-contrast: high) {
  .matrix-cell.active {
    outline: 3px solid currentColor;
  }
  
  .matrix-row.selected {
    border: 2px solid currentColor;
  }
}

/* ============================================
   Reduced Motion
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ============================================
   Dark Mode Support
   ============================================ */
@media (prefers-color-scheme: dark) {
  :root {
    --matrix-bg-primary: #0f172a;
    --matrix-bg-secondary: #1e293b;
    --matrix-bg-tertiary: #334155;
    --matrix-text-primary: #f8fafc;
    --matrix-text-secondary: #cbd5e1;
    --matrix-border-color: #334155;
    --matrix-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --matrix-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --matrix-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  }
}
`;

// Export CSS for injection
export function injectStyles(): void {
  if (typeof document === 'undefined') return;
  
  const styleId = 'matrix-pro-styles';
  if (document.getElementById(styleId)) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = matrixProStyles;
  document.head.appendChild(styleElement);
}

export const Styles = {
  matrixProStyles,
  injectStyles,
};

export default Styles;
