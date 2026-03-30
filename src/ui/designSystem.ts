/**
 * Modern CSS Variables and Design System for MatrixPro
 * Provides consistent theming, animations, and responsive design
 */

export interface ThemeVariables {
  // Colors
  '--matrix-primary': string;
  '--matrix-primary-light': string;
  '--matrix-primary-dark': string;
  '--matrix-secondary': string;
  '--matrix-accent': string;
  '--matrix-success': string;
  '--matrix-warning': string;
  '--matrix-error': string;
  '--matrix-info': string;
  
  // Backgrounds
  '--matrix-bg-primary': string;
  '--matrix-bg-secondary': string;
  '--matrix-bg-tertiary': string;
  '--matrix-bg-hover': string;
  '--matrix-bg-active': string;
  '--matrix-bg-selected': string;
  '--matrix-bg-edited': string;
  '--matrix-bg-subtotal': string;
  '--matrix-bg-grandtotal': string;
  
  // Text
  '--matrix-text-primary': string;
  '--matrix-text-secondary': string;
  '--matrix-text-muted': string;
  '--matrix-text-inverse': string;
  
  // Borders
  '--matrix-border-color': string;
  '--matrix-border-light': string;
  '--matrix-border-active': string;
  '--matrix-border-focus': string;
  
  // Spacing
  '--matrix-spacing-xs': string;
  '--matrix-spacing-sm': string;
  '--matrix-spacing-md': string;
  '--matrix-spacing-lg': string;
  '--matrix-spacing-xl': string;
  
  // Typography
  '--matrix-font-family': string;
  '--matrix-font-mono': string;
  '--matrix-font-size-xs': string;
  '--matrix-font-size-sm': string;
  '--matrix-font-size-md': string;
  '--matrix-font-size-lg': string;
  '--matrix-font-weight-normal': string;
  '--matrix-font-weight-medium': string;
  '--matrix-font-weight-semibold': string;
  '--matrix-font-weight-bold': string;
  
  // Transitions
  '--matrix-transition-fast': string;
  '--matrix-transition-normal': string;
  '--matrix-transition-slow': string;
  
  // Shadows
  '--matrix-shadow-sm': string;
  '--matrix-shadow-md': string;
  '--matrix-shadow-lg': string;
  '--matrix-shadow-focus': string;
  
  // Z-index
  '--matrix-z-dropdown': string;
  '--matrix-z-sticky': string;
  '--matrix-z-modal': string;
  '--matrix-z-tooltip': string;
  '--matrix-z-context-menu': string;
}

// Modern light theme
export const lightTheme: Partial<ThemeVariables> = {
  '--matrix-primary': '#2563eb',
  '--matrix-primary-light': '#3b82f6',
  '--matrix-primary-dark': '#1d4ed8',
  '--matrix-secondary': '#64748b',
  '--matrix-accent': '#8b5cf6',
  '--matrix-success': '#10b981',
  '--matrix-warning': '#f59e0b',
  '--matrix-error': '#ef4444',
  '--matrix-info': '#06b6d4',
  
  '--matrix-bg-primary': '#ffffff',
  '--matrix-bg-secondary': '#f8fafc',
  '--matrix-bg-tertiary': '#f1f5f9',
  '--matrix-bg-hover': '#f8fafc',
  '--matrix-bg-active': '#eff6ff',
  '--matrix-bg-selected': '#dbeafe',
  '--matrix-bg-edited': '#fef3c7',
  '--matrix-bg-subtotal': '#f8fafc',
  '--matrix-bg-grandtotal': '#e2e8f0',
  
  '--matrix-text-primary': '#0f172a',
  '--matrix-text-secondary': '#475569',
  '--matrix-text-muted': '#94a3b8',
  '--matrix-text-inverse': '#ffffff',
  
  '--matrix-border-color': '#e2e8f0',
  '--matrix-border-light': '#f1f5f9',
  '--matrix-border-active': '#3b82f6',
  '--matrix-border-focus': '#2563eb',
  
  '--matrix-spacing-xs': '2px',
  '--matrix-spacing-sm': '4px',
  '--matrix-spacing-md': '8px',
  '--matrix-spacing-lg': '16px',
  '--matrix-spacing-xl': '24px',
  
  '--matrix-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--matrix-font-mono': '"SF Mono", Monaco, "Cascadia Code", monospace',
  '--matrix-font-size-xs': '10px',
  '--matrix-font-size-sm': '12px',
  '--matrix-font-size-md': '14px',
  '--matrix-font-size-lg': '16px',
  '--matrix-font-weight-normal': '400',
  '--matrix-font-weight-medium': '500',
  '--matrix-font-weight-semibold': '600',
  '--matrix-font-weight-bold': '700',
  
  '--matrix-transition-fast': '100ms ease',
  '--matrix-transition-normal': '200ms ease',
  '--matrix-transition-slow': '300ms ease',
  
  '--matrix-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--matrix-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '--matrix-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '--matrix-shadow-focus': '0 0 0 3px rgba(37, 99, 235, 0.3)',
  
  '--matrix-z-dropdown': '100',
  '--matrix-z-sticky': '50',
  '--matrix-z-modal': '200',
  '--matrix-z-tooltip': '300',
  '--matrix-z-context-menu': '250',
};

// Modern dark theme
export const darkTheme: Partial<ThemeVariables> = {
  '--matrix-primary': '#3b82f6',
  '--matrix-primary-light': '#60a5fa',
  '--matrix-primary-dark': '#2563eb',
  '--matrix-secondary': '#94a3b8',
  '--matrix-accent': '#a78bfa',
  '--matrix-success': '#34d399',
  '--matrix-warning': '#fbbf24',
  '--matrix-error': '#f87171',
  '--matrix-info': '#22d3ee',
  
  '--matrix-bg-primary': '#0f172a',
  '--matrix-bg-secondary': '#1e293b',
  '--matrix-bg-tertiary': '#334155',
  '--matrix-bg-hover': '#1e293b',
  '--matrix-bg-active': '#1e3a8a',
  '--matrix-bg-selected': '#1e40af',
  '--matrix-bg-edited': '#451a03',
  '--matrix-bg-subtotal': '#1e293b',
  '--matrix-bg-grandtotal': '#334155',
  
  '--matrix-text-primary': '#f8fafc',
  '--matrix-text-secondary': '#cbd5e1',
  '--matrix-text-muted': '#64748b',
  '--matrix-text-inverse': '#0f172a',
  
  '--matrix-border-color': '#334155',
  '--matrix-border-light': '#1e293b',
  '--matrix-border-active': '#60a5fa',
  '--matrix-border-focus': '#3b82f6',
  
  '--matrix-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  '--matrix-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  '--matrix-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  '--matrix-shadow-focus': '0 0 0 3px rgba(59, 130, 246, 0.4)',
};

// Apply theme to element
export function applyTheme(element: HTMLElement, theme: Partial<ThemeVariables>): void {
  Object.entries(theme).forEach(([key, value]) => {
    if (value !== undefined) {
      element.style.setProperty(key, value);
    }
  });
}

// Generate CSS string
export function generateThemeCSS(theme: Partial<ThemeVariables>): string {
  return Object.entries(theme)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
}

// Animation keyframes
export const animationKeyframes = `
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

@keyframes matrix-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes matrix-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes matrix-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes matrix-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes matrix-ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes matrix-expand {
  from { 
    max-height: 0;
    opacity: 0;
  }
  to { 
    max-height: 500px;
    opacity: 1;
  }
}

@keyframes matrix-highlight {
  0% { background-color: var(--matrix-bg-selected); }
  50% { background-color: var(--matrix-primary-light); }
  100% { background-color: var(--matrix-bg-selected); }
}
`;

// Utility classes
export const utilityClasses = `
.matrix-skeleton {
  background: linear-gradient(
    90deg,
    var(--matrix-bg-secondary) 25%,
    var(--matrix-bg-tertiary) 50%,
    var(--matrix-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: matrix-shimmer 1.5s infinite;
  border-radius: 4px;
}

.matrix-transition {
  transition: all var(--matrix-transition-normal);
}

.matrix-transition-fast {
  transition: all var(--matrix-transition-fast);
}

.matrix-hover:hover {
  background-color: var(--matrix-bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--matrix-shadow-sm);
}

.matrix-focus:focus {
  outline: none;
  box-shadow: var(--matrix-shadow-focus);
}

.matrix-active:active {
  transform: scale(0.98);
}

.matrix-ripple {
  position: relative;
  overflow: hidden;
}

.matrix-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

.matrix-ripple:focus:not(:active)::after {
  animation: matrix-ping 1s cubic-bezier(0, 0, 0.2, 1);
}

.matrix-glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.matrix-glass-dark {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.matrix-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.matrix-line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.matrix-no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.matrix-no-scrollbar::-webkit-scrollbar {
  display: none;
}

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
`;

// Export all
export const DesignSystem = {
  lightTheme,
  darkTheme,
  applyTheme,
  generateThemeCSS,
  animationKeyframes,
  utilityClasses,
};

export default DesignSystem;
