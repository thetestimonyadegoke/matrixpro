/**
 * Skeleton UI Components
 * Loading states for MatrixPro
 * Provides visual feedback while data is loading
 */

import React, { memo } from 'react';
import { VisualSettings } from '../settings/settings';

// Deterministic pseudo-random for skeleton widths (not security sensitive, used for UI variation)
function getSkeletonWidth(base: number, variance: number, seed: number): number {
  return base + (seed % variance);
}

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  circle?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = memo(({
  width = '100%',
  height = 20,
  className = '',
  circle = false,
  animate = true,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : '4px',
  };

  return (
    <div
      className={`matrix-skeleton ${animate ? 'animate' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
});

Skeleton.displayName = 'Skeleton';

interface MatrixSkeletonProps {
  settings: VisualSettings;
  width: number;
  height: number;
  rowCount?: number;
  columnCount?: number;
}

export const MatrixSkeleton: React.FC<MatrixSkeletonProps> = memo(({
  settings,
  width,
  height,
  rowCount = 10,
  columnCount = 5,
}) => {
  const rowHeight = settings.theme.density === 'compact' ? 24 : 32;
  const columnWidth = settings.general.defaultColumnWidth;
  const headerHeight = 56;
  const rowHeaderWidth = Math.max(120, Math.min(480, settings.general.rowHeaderWidth || 150));

  // Generate skeleton rows
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  const cols = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div
      className="matrix-skeleton-container"
      style={{
        width,
        height,
        backgroundColor: 'var(--matrix-bg-primary)',
      }}
      role="progressbar"
      aria-label="Loading matrix data"
      aria-busy="true"
    >
      {/* Header */}
      <div
        className="matrix-skeleton-header"
        style={{
          height: headerHeight,
          display: 'flex',
          borderBottom: '1px solid var(--matrix-border-color)',
        }}
      >
        {/* Corner cell */}
        <div
          style={{
            width: rowHeaderWidth,
            height: headerHeight,
            borderRight: '1px solid var(--matrix-border-color)',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Skeleton width={80} height={16} />
        </div>
        {/* Column headers */}
        <div style={{ display: 'flex', flex: 1 }}>
          {cols.map(i => (
            <div
              key={`header-${i}`}
              style={{
                width: columnWidth,
                height: headerHeight,
                borderRight: '1px solid var(--matrix-border-color)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Skeleton width={columnWidth - 20} height={14} />
              <Skeleton width={(columnWidth - 20) * 0.6} height={12} />
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', height: height - headerHeight }}>
        {/* Row headers */}
        <div
          style={{
            width: rowHeaderWidth,
            borderRight: '1px solid var(--matrix-border-color)',
          }}
        >
          {rows.map(i => (
            <div
              key={`row-header-${i}`}
              style={{
                height: rowHeight,
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid var(--matrix-border-light)',
              }}
            >
              <Skeleton
                width={getSkeletonWidth(80, 60, i * 17)}
                height={14}
                animate={i % 2 === 0}
              />
            </div>
          ))}
        </div>

        {/* Data cells */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {rows.map(rowIndex => (
            <div
              key={`row-${rowIndex}`}
              style={{
                height: rowHeight,
                display: 'flex',
                borderBottom: '1px solid var(--matrix-border-light)',
              }}
            >
              {cols.map(colIndex => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={{
                    width: columnWidth,
                    height: rowHeight,
                    borderRight: '1px solid var(--matrix-border-light)',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: settings.values.alignment === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Skeleton
                    width={getSkeletonWidth(50, 40, (rowIndex + colIndex) * 13)}
                    height={14}
                    animate={(rowIndex + colIndex) % 3 === 0}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MatrixSkeleton.displayName = 'MatrixSkeleton';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  progress,
}) => {
  if (!visible) return null;

  return (
    <div
      className="matrix-loading-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="matrix-loading-spinner"
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--matrix-border-color)',
          borderTopColor: 'var(--matrix-primary)',
          borderRadius: '50%',
          animation: 'matrix-spin 1s linear infinite',
        }}
        aria-hidden="true"
      />
      <p
        style={{
          marginTop: 16,
          color: 'var(--matrix-text-secondary)',
          fontSize: '14px',
        }}
      >
        {message}
      </p>
      {progress !== undefined && (
        <div
          style={{
            width: 200,
            height: 4,
            backgroundColor: 'var(--matrix-border-color)',
            borderRadius: 2,
            marginTop: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--matrix-primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
};

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div
      className="matrix-error-state"
      style={{
        padding: 24,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid var(--matrix-error)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
      role="alert"
      aria-live="assertive"
    >
      <span
        style={{
          fontSize: 32,
          color: 'var(--matrix-error)',
        }}
        aria-hidden="true"
      >
        ⚠️
      </span>
      <p
        style={{
          color: 'var(--matrix-text-primary)',
          fontSize: '14px',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            className="matrix-btn matrix-btn-primary"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--matrix-primary)',
              color: 'var(--matrix-text-inverse)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="matrix-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'var(--matrix-text-secondary)',
              border: '1px solid var(--matrix-border-color)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  message = 'There is no data to display in this matrix.',
  icon = '📊',
  action,
}) => {
  return (
    <div
      className="matrix-empty-state"
      style={{
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          fontSize: 48,
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3
        style={{
          margin: 0,
          color: 'var(--matrix-text-primary)',
          fontSize: '18px',
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: 'var(--matrix-text-secondary)',
          fontSize: '14px',
          maxWidth: 400,
        }}
      >
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="matrix-btn matrix-btn-primary"
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--matrix-primary)',
            color: 'var(--matrix-text-inverse)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Export all
export const LoadingStates = {
  Skeleton,
  MatrixSkeleton,
  LoadingOverlay,
  ErrorState,
  EmptyState,
};

export default LoadingStates;
