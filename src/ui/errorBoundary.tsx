/**
 * Error Boundary Component
 * Catches and gracefully handles React errors in the matrix UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  /** When this value changes while showing the error, the boundary resets (e.g. on new data). */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class MatrixErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to console for debugging
    console.error('MatrixPro Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="matrix-error-boundary"
          style={{
            padding: 32,
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            fontFamily: "var(--matrix-font-family, var(--mx-font-family, -apple-system, 'Segoe UI', sans-serif))",
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>🐛</span>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--matrix-text-primary, var(--mx-text, #1f2937))',
              }}
            >
              Something went wrong
            </h2>
          </div>
          
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: 14,
              color: 'var(--matrix-text-secondary, var(--mx-text-muted, #4b5563))',
              lineHeight: 1.5,
            }}
          >
            The matrix encountered an error. It will recover automatically when the data refreshes, or you can try again now.
          </p>

          {this.state.error && (
            <details
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'var(--matrix-font-mono, ui-monospace, Consolas, monospace)',
              }}
            >
              <summary style={{ cursor: 'pointer', color: 'var(--matrix-text-secondary, var(--mx-text-muted, #4b5563))' }}>
                Error details
              </summary>
              <pre
                style={{
                  margin: '12px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--matrix-error, #dc2626)',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--matrix-primary, var(--mx-accent, #2563eb))',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    // Could also report to error tracking service
  };
}

// Safe wrapper for async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorHandler?.(err);
    console.error('Safe async operation failed:', err);
    return null;
  }
}

// Safe wrapper for sync operations
export function safeSync<T>(
  operation: () => T,
  errorHandler?: (error: Error) => void
): T | null {
  try {
    return operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorHandler?.(err);
    console.error('Safe sync operation failed:', err);
    return null;
  }
}

export const ErrorHandling = {
  MatrixErrorBoundary,
  useErrorHandler,
  safeAsync,
  safeSync,
};

export default MatrixErrorBoundary;
