/**
 * Accessibility Utilities and Components
 * WCAG 2.1 AA compliant accessibility features for MatrixPro
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ARIA_LABELS } from './keyboardNavigation';

interface A11yManager {
  announce(message: string, priority?: 'polite' | 'assertive'): void;
  setFocusTrap(element: HTMLElement): () => void;
  handleFocusVisible(element: HTMLElement): void;
}

// Screen reader announcements
export function useAnnouncer(): A11yManager['announce'] {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const ariaLive = document.getElementById(`matrix-aria-live-${priority}`);
    if (ariaLive) {
      ariaLive.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        ariaLive.textContent = '';
      }, 1000);
    }
  }, []);

  return announce;
}

// Screen Reader Live Region Component
export const Announcer: React.FC = () => {
  return (
    <>
      <div
        id="matrix-aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      />
      <div
        id="matrix-aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      />
    </>
  );
};

// Skip Link for keyboard navigation
interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  label = 'Skip to main content',
}) => {
  return (
    <a
      href={`#${targetId}`}
      className="matrix-skip-link"
      style={{
        position: 'absolute',
        top: -40,
        left: 0,
        background: 'var(--matrix-primary)',
        color: 'var(--matrix-text-inverse)',
        padding: '8px 16px',
        zIndex: 9999,
        textDecoration: 'none',
        borderRadius: '0 0 4px 0',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-40px';
      }}
    >
      {label}
    </a>
  );
};

// Focus trap for modals/dialogs
export function useFocusTrap(): (element: HTMLElement | null) => () => void {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((element: HTMLElement | null) => {
    // Clean up previous trap
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!element) return () => {};

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    const cleanup = () => {
      element.removeEventListener('keydown', handleKeyDown);
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, []);
}

// Visually hidden component for screen readers
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
};

// Accessible button with full keyboard support
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  shortcut?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  description,
  shortcut,
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      aria-label={label}
      aria-describedby={description ? `${props.id}-desc` : undefined}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {children}
      {description && (
        <span id={`${props.id}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </button>
  );
};

// Accessible tooltip
interface AccessibleTooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [visible, setVisible] = useState(false);
  const tooltipId = useRef(`tooltip-${Date.now().toString(36).substr(2, 9)}`).current;

  return (
    <>
      {React.cloneElement(children, {
        'aria-describedby': tooltipId,
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
      })}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            padding: '6px 12px',
            backgroundColor: 'var(--matrix-bg-secondary)',
            color: 'var(--matrix-text-primary)',
            borderRadius: 4,
            fontSize: 12,
            boxShadow: 'var(--matrix-shadow-md)',
            zIndex: 9999,
            ...getTooltipPosition(position),
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

function getTooltipPosition(position: string): React.CSSProperties {
  switch (position) {
    case 'top':
      return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 };
    case 'bottom':
      return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 };
    case 'left':
      return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 };
    case 'right':
      return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };
    default:
      return {};
  }
}

// Accessible cell for matrix
interface AccessibleCellProps {
  rowIndex: number;
  colIndex: number;
  rowHeader?: string;
  colHeader?: string;
  value: string;
  isEditable?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
  onActivate?: () => void;
}

export const AccessibleCell: React.FC<AccessibleCellProps> = ({
  rowIndex,
  colIndex,
  rowHeader,
  colHeader,
  value,
  isEditable,
  isActive,
  children,
  onActivate,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && cellRef.current) {
      cellRef.current.focus();
    }
  }, [isActive]);

  const ariaLabel = `${rowHeader || `Row ${rowIndex + 1}`}, ${colHeader || `Column ${colIndex + 1}`}: ${value}${isEditable ? '. Press Enter to edit' : ''}`;

  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-rowindex={rowIndex + 1}
      aria-colindex={colIndex + 1}
      aria-label={ariaLabel}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onActivate) {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {children}
    </div>
  );
};

// High contrast mode detector
export function useHighContrastMode(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}

// Reduced motion preference
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Accessible progress indicator
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      style={{
        width: '100%',
        height: 8,
        backgroundColor: 'var(--matrix-border-color)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: 'var(--matrix-primary)',
          transition: 'width 0.3s ease',
        }}
      />
      {showValue && (
        <VisuallyHidden>{`${percentage}% complete`}</VisuallyHidden>
      )}
    </div>
  );
};

// Accessible status message
interface StatusMessageProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  id?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  message,
  type = 'info',
  id,
}) => {
  const colors = {
    info: 'var(--matrix-info)',
    success: 'var(--matrix-success)',
    warning: 'var(--matrix-warning)',
    error: 'var(--matrix-error)',
  };

  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  };

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        backgroundColor: `${colors[type]}15`,
        border: `1px solid ${colors[type]}`,
        borderRadius: 6,
        color: colors[type],
        fontSize: 14,
      }}
    >
      <span aria-hidden="true">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
};

// Export all
export const Accessibility = {
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
};

export default Accessibility;
