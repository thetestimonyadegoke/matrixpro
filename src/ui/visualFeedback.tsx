/**
 * Resize Indicators and Visual Feedback
 * Provides visual cues during column/row resize operations
 */

import React, { useState, useEffect, useCallback } from 'react';

interface ResizeIndicatorProps {
  type: 'column' | 'row';
  position: number;
  size: number;
  isResizing: boolean;
  minSize?: number;
  maxSize?: number;
}

export const ResizeIndicator: React.FC<ResizeIndicatorProps> = ({
  type,
  position,
  size,
  isResizing,
  minSize = 60,
  maxSize = 500,
}) => {
  if (!isResizing) return null;

  const isValid = size >= minSize && size <= maxSize;

  return (
    <div
      className="matrix-resize-indicator"
      style={{
        position: 'absolute',
        [type === 'column' ? 'left' : 'top']: position,
        [type === 'column' ? 'width' : 'height']: 2,
        [type === 'column' ? 'height' : 'width']: '100%',
        backgroundColor: isValid ? 'var(--matrix-primary)' : 'var(--matrix-error)',
        zIndex: 9999,
        pointerEvents: 'none',
        [type === 'column' ? 'top' : 'left']: 0,
      }}
    >
      {/* Size tooltip */}
      <div
        style={{
          position: 'absolute',
          [type === 'column' ? 'left' : 'top']: '50%',
          [type === 'column' ? 'top' : 'left']: -40,
          transform: type === 'column' ? 'translateX(-50%)' : 'translateY(-50%)',
          backgroundColor: isValid ? 'var(--matrix-primary)' : 'var(--matrix-error)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: 'var(--matrix-shadow-md)',
        }}
      >
        {size}px {!isValid && (size < minSize ? '(min)' : '(max)')}
      </div>
    </div>
  );
};

interface ResizeHandleProps {
  type: 'column' | 'row';
  onResizeStart: (clientX: number, clientY: number) => void;
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  type,
  onResizeStart,
  onResize,
  onResizeEnd,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = React.useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startPosRef.current = type === 'column' ? e.clientX : e.clientY;
    onResizeStart(e.clientX, e.clientY);
  }, [type, onResizeStart]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = type === 'column' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = type === 'column' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, type, onResize, onResizeEnd]);

  return (
    <div
      className={`matrix-resize-handle ${type} ${isDragging ? 'dragging' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        [type === 'column' ? 'right' : 'bottom']: -4,
        [type === 'column' ? 'top' : 'left']: 0,
        [type === 'column' ? 'width' : 'height']: 8,
        [type === 'column' ? 'height' : 'width']: '100%',
        cursor: type === 'column' ? 'col-resize' : 'row-resize',
        zIndex: 100,
        backgroundColor: isDragging ? 'var(--matrix-primary)' : 'transparent',
        opacity: isDragging ? 0.5 : 0,
        transition: 'opacity 0.2s, background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.backgroundColor = 'var(--matrix-primary-light)';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.opacity = '0';
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      title={`Drag to resize ${type}`}
    />
  );
};

interface VisualFeedbackProviderProps {
  children: React.ReactNode;
}

export const VisualFeedbackProvider: React.FC<VisualFeedbackProviderProps> = ({ children }) => {
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    id: number;
  } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setFeedback({ type, message, id });
    setTimeout(() => {
      setFeedback(current => current?.id === id ? null : current);
    }, 3000);
  }, []);

  return (
    <>
      {children}
      {feedback && (
        <div
          className={`matrix-feedback-toast ${feedback.type}`}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: 8,
            backgroundColor: 
              feedback.type === 'success' ? 'var(--matrix-success)' :
              feedback.type === 'error' ? 'var(--matrix-error)' :
              'var(--matrix-info)',
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: 'var(--matrix-shadow-lg)',
            zIndex: 10000,
            animation: 'matrix-slide-in 0.3s ease',
          }}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      )}
    </>
  );
};

interface DragPreviewProps {
  isDragging: boolean;
  preview: React.ReactNode;
  position: { x: number; y: number };
}

export const DragPreview: React.FC<DragPreviewProps> = ({
  isDragging,
  preview,
  position,
}) => {
  if (!isDragging) return null;

  return (
    <div
      className="matrix-drag-preview"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.9,
        transform: 'rotate(-2deg) scale(1.02)',
        boxShadow: 'var(--matrix-shadow-lg)',
      }}
    >
      {preview}
    </div>
  );
};

interface DropZoneIndicatorProps {
  isActive: boolean;
  position: 'before' | 'after' | 'inside';
  label?: string;
}

export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  isActive,
  position,
  label,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="matrix-drop-zone-indicator"
      style={{
        position: 'absolute',
        [position === 'before' ? 'top' : position === 'after' ? 'bottom' : 'top']: position === 'inside' ? 4 : -2,
        left: 0,
        right: 0,
        height: position === 'inside' ? 'calc(100% - 8px)' : 4,
        backgroundColor: 'var(--matrix-primary)',
        borderRadius: 2,
        zIndex: 100,
        boxShadow: '0 0 8px var(--matrix-primary-light)',
      }}
    >
      {label && position !== 'inside' && (
        <span
          style={{
            position: 'absolute',
            [position === 'before' ? 'bottom' : 'top']: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--matrix-primary)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// Export all
export const VisualFeedback = {
  ResizeIndicator,
  ResizeHandle,
  VisualFeedbackProvider,
  DragPreview,
  DropZoneIndicator,
};

export default VisualFeedback;
