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
  
  /* Ribbon Variables */
  --mx-toolbar-bg: #f3f2f1;
  --mx-toolbar-tab-hover: #edebe9;
  --mx-toolbar-tab-active: #ffffff;
  --mx-toolbar-content-bg: #ffffff;
  --mx-toolbar-text: #323130;
  --mx-toolbar-border: #edebe9;
}

/* Theme Overrides */
.theme-modern-dark {
  --matrix-bg-primary: #0f172a;
  --matrix-bg-secondary: #1e293b;
  --matrix-bg-tertiary: #334155;
  --matrix-text-primary: #f8fafc;
  --matrix-text-secondary: #cbd5e1;
  --matrix-border-color: #334155;
  --mx-toolbar-bg: #1e293b;
  --mx-toolbar-tab-hover: #334155;
  --mx-toolbar-tab-active: #0f172a;
  --mx-toolbar-content-bg: #0f172a;
  --mx-toolbar-text: #f8fafc;
  --mx-toolbar-border: #334155;
}

.theme-finance-dark {
  --matrix-bg-primary: #121212;
  --matrix-bg-secondary: #1e1e1e;
  --matrix-text-primary: #e0e0e0;
  --mx-toolbar-bg: #1e1e1e;
  --mx-toolbar-content-bg: #121212;
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
  background-color: var(--matrix-bg-secondary);
}

.merged-column-headers {
  display: flex;
  flex-direction: column;
}

.merged-header-row {
  display: flex;
  height: 32px;
  border-bottom: 1px solid var(--matrix-border-color);
}

.merged-header-row-track {
  display: flex;
  height: 100%;
}

.merged-header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-right: 1px solid var(--matrix-border-color);
  background-color: var(--matrix-bg-secondary);
  font-size: 12px;
  font-weight: 600;
  color: var(--matrix-text-secondary);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.merged-header-cell.corner {
  position: sticky;
  left: 0;
  z-index: 10;
  background-color: var(--matrix-bg-tertiary);
  border-right: 2px solid var(--matrix-border-color);
}

.merged-header-cell.leaf {
  cursor: pointer;
}

.merged-header-cell.leaf:hover {
  background-color: var(--matrix-bg-hover);
}

.merged-header-cell.col-selected {
  background-color: var(--matrix-bg-selected);
  color: var(--matrix-primary);
}

.merged-header-sort-icon {
  margin-left: 4px;
  font-size: 10px;
  color: var(--matrix-primary);
}

.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 5;
}

.col-resize-handle:hover {
  background-color: var(--matrix-primary);
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

.matrix-cell.col-selected {
  background-color: rgba(37, 99, 235, 0.08); /* Selection tint */
  border-left: 1px solid rgba(37, 99, 235, 0.2);
  border-right: 1px solid rgba(37, 99, 235, 0.2);
}

.matrix-cell.col-selected:hover {
  background-color: rgba(37, 99, 235, 0.12);
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
   Ribbon Toolbar
   ============================================ */
.mx-ribbon {
  display: flex;
  flex-direction: column;
  background: var(--mx-toolbar-bg, #f3f2f1);
  border-bottom: 1px solid var(--mx-toolbar-border, #edebe9);
  flex-shrink: 0;
  user-select: none;
}

.mx-ribbon-top {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  background: var(--mx-toolbar-bg, #f3f2f1);
  border-bottom: 1px solid var(--mx-toolbar-border, #edebe9);
}

.mx-ribbon-tabs {
  display: flex;
  gap: 0;
  height: 100%;
}

.ribbon-tab {
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 13px;
  color: var(--mx-toolbar-text, #323130);
  cursor: pointer;
  height: 100%;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  text-transform: capitalize;
}

.ribbon-tab:hover {
  background: var(--mx-toolbar-tab-hover, #edebe9);
}

.ribbon-tab.active {
  border-bottom-color: var(--matrix-primary);
  color: var(--matrix-primary);
  font-weight: 600;
  background: var(--mx-toolbar-tab-active, #ffffff);
}

/* Ribbon Content with internal scrolling */
.mx-ribbon .mx-ribbon-content {
  display: flex !important;
  padding: 8px 12px !important;
  min-height: 84px !important;
  align-items: stretch !important;
  gap: 0 !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  background: var(--mx-toolbar-content-bg, #ffffff) !important;
}

.mx-ribbon .mx-ribbon-content::-webkit-scrollbar {
  height: 4px;
}

.mx-ribbon .mx-ribbon-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

.mx-ribbon .mx-ribbon-content::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

.ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  border-right: 1px solid var(--matrix-border-color);
  min-width: max-content;
}

.ribbon-group:last-child {
  border-right: none;
}

.ribbon-group-title {
  text-align: center;
  font-size: 10px;
  color: var(--matrix-text-secondary);
  margin-top: auto;
  padding-top: 4px;
}

/* CF Menu Portal Styles */
.mx-cf-menu {
  position: fixed;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--matrix-border-color);
  z-index: 10000000 !important; /* Extremely high to beat any PBI host elements */
  animation: matrix-fade-in 0.2s ease-out;
}

.dropdown-item:hover {
  background-color: var(--matrix-bg-hover);
}

.cf-submenu {
  animation: matrix-slide-in 0.2s ease-out;
}

/* ============================================
   Z-Index Scale Fixes for Portals
   ============================================ */
body > div[style*="fixed"] {
  z-index: 10000000 !important;
}

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

/* ============================================
   Conditional Formatting Dropdown
   ============================================ */
.cf-floating-menu {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 220px;
  font-family: var(--matrix-font-family);
  animation: matrix-fade-in 150ms ease-out;
}

.cf-floating-menu.submenu {
  animation: matrix-slide-in 150ms ease-out;
}

.cf-menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 3px;
  gap: 12px;
  color: #374151;
  font-size: 13px;
  position: relative;
  transition: background-color 0.1s;
}

.cf-menu-item:hover {
  background-color: #f3f4f6;
}

.cf-menu-item.menu-sub-header {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 8px;
  padding-bottom: 4px;
  cursor: default;
}

.cf-menu-item.menu-sub-header:hover {
  background-color: transparent;
}

.cf-menu-divider {
  padding: 0;
  height: 9px;
  display: flex;
  align-items: center;
}

.cf-menu-divider .divider-line {
  height: 1px;
  width: 100%;
  background-color: #e5e7eb;
}

.cf-item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cf-item-label {
  flex: 1;
}

.cf-item-chevron {
  color: #9ca3af;
  display: flex;
  align-items: center;
}

/* Thumbnails and Previews */
.cf-thumb-icon {
  width: 20px;
  height: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.cf-thumb-icon.positive { color: #16a34a; background: #f0fdf4; border-color: #bbf7d0; }
.cf-thumb-icon.negative { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

.cf-thumb-scales-icon {
  width: 24px;
  height: 12px;
  background: linear-gradient(90deg, #fee2e2, #fef3c7, #dcfce7);
  border: 1px solid #e5e7eb;
  border-radius: 2px;
}

.scale-thumb {
  width: 120px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #e5e7eb;
}

.scale-thumb.seq-blue { background: linear-gradient(90deg, #eff6ff, #1d4ed8); }
.scale-thumb.seq-orange { background: linear-gradient(90deg, #fff7ed, #ea580c); }
.scale-thumb.seq-green { background: linear-gradient(90deg, #f0fdf4, #16a34a); }
.scale-thumb.qual-1 { background: linear-gradient(90deg, #3b82f6 25%, #10b981 25% 50%, #f59e0b 50% 75%, #ef4444 75%); }
.scale-thumb.qual-2 { background: linear-gradient(90deg, #8b5cf6 25%, #ec4899 25% 50%, #06b6d4 50% 75%, #f97316 75%); }

.class-text-preview {
  font-weight: 600;
  font-size: 11px;
  white-space: nowrap;
}

.class-icons-preview {
  width: 80px;
  height: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.class-icons-preview.icons-std::before { content: '✓ ! ✗'; color: #374151; font-weight: bold; }
.class-icons-preview.icons-flags::before { content: '🚩 ⚐ 🏴'; font-size: 14px; }
.class-icons-preview.rating-sq::before { content: '■ □'; font-size: 14px; }
.class-icons-preview.rating-stars::before { content: '★ ☆'; font-size: 14px; color: #f59e0b; }
.class-icons-preview.rating-circ::before { content: '● ○'; font-size: 14px; }

.bar-thumb-full {
  width: 120px;
  height: 10px;
  border-radius: 1px;
}

.action-thumb {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.action-dot-thumb::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; }
.action-color-thumb { background: #3b82f6; }
.action-bubble-chart-thumb { background: radial-gradient(circle, #3b82f6 2px, transparent 2px), radial-gradient(circle, #10b981 3px, transparent 3px); background-position: 4px 4px, 10px 10px; }
.action-bubble-only-thumb { background: radial-gradient(circle, #3b82f6 4px, transparent 4px), radial-gradient(circle, #3b82f6 6px, transparent 6px); background-position: 2px 2px, 8px 8px; }

.text-blue-600 { color: #2563eb; }
.text-blue-500 { color: #3b82f6; }
.bg-blue-500 { background-color: #3b82f6; }
.bg-green-500 { background-color: #10b981; }
.bg-red-400 { background-color: #f87171; }
.bg-orange-400 { background-color: #fb923c; }
.bg-pink-400 { background-color: #f472b6; }
.-rotate-90 { transform: rotate(-90deg); }

/* Restore Toolbar Button */
.mx-restore-toolbar-btn {
  position: absolute;
  top: 8px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--matrix-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  z-index: 1000;
    --matrix-text-secondary: #cbd5e1;
    --matrix-border-color: #334155;
    --matrix-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --matrix-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --matrix-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  }
}

/* ============================================
   Conditional Formatting Dropdown
   ============================================ */
.cf-floating-menu {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 220px;
  font-family: var(--matrix-font-family);
  animation: matrix-fade-in 150ms ease-out;
}

.cf-floating-menu.submenu {
  animation: matrix-slide-in 150ms ease-out;
}

.cf-menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 3px;
  gap: 12px;
  color: #374151;
  font-size: 13px;
  position: relative;
  transition: background-color 0.1s;
}

.cf-menu-item:hover {
  background-color: #f3f4f6;
}

.cf-menu-item.menu-sub-header {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 8px;
  padding-bottom: 4px;
  cursor: default;
}

.cf-menu-item.menu-sub-header:hover {
  background-color: transparent;
}

.cf-menu-divider {
  padding: 0;
  height: 9px;
  display: flex;
  align-items: center;
}

.cf-menu-divider .divider-line {
  height: 1px;
  width: 100%;
  background-color: #e5e7eb;
}

.cf-item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cf-item-label {
  flex: 1;
}

.cf-item-chevron {
  color: #9ca3af;
  display: flex;
  align-items: center;
}

/* Thumbnails and Previews */
.cf-thumb-icon {
  width: 20px;
  height: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.cf-thumb-icon.positive { color: #16a34a; background: #f0fdf4; border-color: #bbf7d0; }
.cf-thumb-icon.negative { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

.cf-thumb-scales-icon {
  width: 24px;
  height: 12px;
  background: linear-gradient(90deg, #fee2e2, #fef3c7, #dcfce7);
  border: 1px solid #e5e7eb;
  border-radius: 2px;
}

.scale-thumb {
  width: 120px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #e5e7eb;
}

.scale-thumb.seq-blue { background: linear-gradient(90deg, #eff6ff, #1d4ed8); }
.scale-thumb.seq-orange { background: linear-gradient(90deg, #fff7ed, #ea580c); }
.scale-thumb.seq-green { background: linear-gradient(90deg, #f0fdf4, #16a34a); }
.scale-thumb.qual-1 { background: linear-gradient(90deg, #3b82f6 25%, #10b981 25% 50%, #f59e0b 50% 75%, #ef4444 75%); }
.scale-thumb.qual-2 { background: linear-gradient(90deg, #8b5cf6 25%, #ec4899 25% 50%, #06b6d4 50% 75%, #f97316 75%); }

.class-text-preview {
  font-weight: 600;
  font-size: 11px;
  white-space: nowrap;
}

.class-icons-preview {
  width: 80px;
  height: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.class-icons-preview.icons-std::before { content: '✓ ! ✗'; color: #374151; font-weight: bold; }
.class-icons-preview.icons-flags::before { content: '🚩 ⚐ 🏴'; font-size: 14px; }
.class-icons-preview.rating-sq::before { content: '■ □'; font-size: 14px; }
.class-icons-preview.rating-stars::before { content: '★ ☆'; font-size: 14px; color: #f59e0b; }
.class-icons-preview.rating-circ::before { content: '● ○'; font-size: 14px; }

.bar-thumb-full {
  width: 120px;
  height: 10px;
  border-radius: 1px;
}

.action-thumb {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.action-dot-thumb::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; }
.action-color-thumb { background: #3b82f6; }
.action-bubble-chart-thumb { background: radial-gradient(circle, #3b82f6 2px, transparent 2px), radial-gradient(circle, #10b981 3px, transparent 3px); background-position: 4px 4px, 10px 10px; }
.action-bubble-only-thumb { background: radial-gradient(circle, #3b82f6 4px, transparent 4px), radial-gradient(circle, #3b82f6 6px, transparent 6px); background-position: 2px 2px, 8px 8px; }

.text-blue-600 { color: #2563eb; }
.text-blue-500 { color: #3b82f6; }
.bg-blue-500 { background-color: #3b82f6; }
.bg-green-500 { background-color: #10b981; }
.bg-red-400 { background-color: #f87171; }
.bg-orange-400 { background-color: #fb923c; }
.bg-pink-400 { background-color: #f472b6; }
.-rotate-90 { transform: rotate(-90deg); }

/* Restore Toolbar Button */
.mx-restore-toolbar-btn {
  position: absolute;
  top: 8px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--matrix-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  z-index: 1000;
  box-shadow: var(--matrix-shadow-md);
  opacity: 0.2;
  transition: opacity 0.2s, transform 0.2s;
}

.mx-restore-toolbar-btn:hover {
  background: var(--mx-accent-heavy, #106ebe);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  opacity: 1;
}

.mx-restore-toolbar-btn:active {
  transform: translateY(0);
}

.mx-restore-toolbar-btn svg {
  transform: rotate(180deg);
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
