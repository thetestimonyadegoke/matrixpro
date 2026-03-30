/**
 * Touch and Mobile Support Components
 * Provides gesture handling and touch-optimized interactions
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TouchGestureConfig {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  longPressDelay?: number;
  swipeThreshold?: number;
}

export function useTouchGestures(config: TouchGestureConfig) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Handle long press
    if (config.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        config.onLongPress?.();
        touchStartRef.current = null;
      }, config.longPressDelay || 500);
    }

    // Handle pinch
    if (e.touches.length === 2 && (config.onPinchIn || config.onPinchOut)) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [config]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    clearLongPress();

    // Handle pinch
    if (e.touches.length === 2 && initialDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / initialDistanceRef.current;

      if (scale > 1.2) {
        config.onPinchOut?.();
      } else if (scale < 0.8) {
        config.onPinchIn?.();
      }
    }
  }, [config, clearLongPress]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPress();
    initialDistanceRef.current = null;

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const start = touchStartRef.current;
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const deltaTime = endTime - start.time;
    const threshold = config.swipeThreshold || 50;

    // Determine if swipe or tap
    const isSwipe = Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;

    if (isSwipe) {
      // Horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          config.onSwipeRight?.();
        } else {
          config.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          config.onSwipeDown?.();
        } else {
          config.onSwipeUp?.();
        }
      }
    } else {
      // Handle tap
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 300;

      if (isDoubleTap && config.onDoubleTap) {
        config.onDoubleTap();
      } else if (config.onTap) {
        config.onTap();
      }

      lastTapRef.current = now;
    }

    touchStartRef.current = null;
  }, [config, clearLongPress]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

interface TouchScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export const TouchScrollContainer: React.FC<TouchScrollContainerProps> = ({
  children,
  className = '',
  style = {},
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; scrollTop: number; scrollLeft: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      scrollTop: container.scrollTop,
      scrollLeft: container.scrollLeft,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const deltaX = touchStartRef.current.x - e.touches[0].clientX;
    const deltaY = touchStartRef.current.y - e.touches[0].clientY;

    container.scrollTop = touchStartRef.current.scrollTop + deltaY;
    container.scrollLeft = touchStartRef.current.scrollLeft + deltaX;

    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    if (containerRef.current) {
      onScroll?.(containerRef.current.scrollTop, containerRef.current.scrollLeft);
    }
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      className={`matrix-touch-scroll ${className}`}
      style={{
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x pan-y',
        ...style,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  pullDistance?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  pullDistance = 80,
  className = '',
}) => {
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable pull when at top
    if (container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      const progress = Math.min(deltaY / pullDistance, 1);
      setPullProgress(progress);
      e.preventDefault();
    }
  }, [pulling, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;

    if (pullProgress >= 1) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }

    setPulling(false);
    setPullProgress(0);
  }, [pulling, pullProgress, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`matrix-pull-refresh ${className}`}
      style={{ overflow: 'auto', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: pullDistance,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${(pulling ? pullProgress * pullDistance : 0) - pullDistance}px)`,
          transition: pulling ? undefined : 'transform 0.3s',
          opacity: pulling || refreshing ? 1 : 0,
        }}
      >
        {refreshing ? (
          <span>Refreshing...</span>
        ) : (
          <span>{pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}</span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pulling ? pullProgress * pullDistance : 0}px)`,
          transition: pulling ? undefined : 'transform 0.3s',
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface TouchFriendlyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'small' | 'medium' | 'large';
  feedback?: 'scale' | 'highlight' | 'ripple';
}

export const TouchFriendlyButton: React.FC<TouchFriendlyButtonProps> = ({
  children,
  size = 'medium',
  feedback = 'scale',
  style = {},
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const sizeStyles = {
    small: { padding: '12px 16px', fontSize: 14 },
    medium: { padding: '16px 24px', fontSize: 16 },
    large: { padding: '20px 32px', fontSize: 18 },
  };

  const feedbackStyles = {
    scale: { transform: isPressed ? 'scale(0.96)' : 'scale(1)' },
    highlight: { backgroundColor: isPressed ? 'var(--matrix-bg-hover)' : undefined },
    ripple: {}, // Ripple handled separately
  };

  return (
    <button
      {...props}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        ...sizeStyles[size],
        ...feedbackStyles[feedback],
        minHeight: 44, // Minimum touch target size
        minWidth: 44,
        border: 'none',
        borderRadius: 8,
        backgroundColor: 'var(--matrix-primary)',
        color: 'white',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

interface VirtualKeyboardProps {
  isOpen: boolean;
  onKeyPress: (key: string) => void;
  onClose: () => void;
  inputValue: string;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  onKeyPress,
  onClose,
  inputValue,
}) => {
  if (!isOpen) return null;

  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['+', '-', '*', '/', '(', ')', '.', '=', '[', ']'],
  ];

  return (
    <div
      className="matrix-virtual-keyboard"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--matrix-bg-secondary)',
        borderTop: '1px solid var(--matrix-border-color)',
        padding: 16,
        zIndex: 10000,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      }}
    >
      {/* Display */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--matrix-bg-primary)',
          borderRadius: 8,
          marginBottom: 12,
          fontFamily: 'var(--matrix-font-mono)',
          fontSize: 18,
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {inputValue || '0'}
      </div>

      {/* Keys */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {keys.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {row.map((key) => (
              <TouchFriendlyButton
                key={key}
                size="small"
                onClick={() => onKeyPress(key)}
                style={{ minWidth: 36, padding: '12px' }}
              >
                {key}
              </TouchFriendlyButton>
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
        <TouchFriendlyButton size="small" onClick={() => onKeyPress('BACKSPACE')}>
          ⌫
        </TouchFriendlyButton>
        <TouchFriendlyButton size="small" onClick={() => onKeyPress('CLEAR')}>
          Clear
        </TouchFriendlyButton>
        <TouchFriendlyButton size="small" onClick={onClose} style={{ backgroundColor: 'var(--matrix-success)' }}>
          Done
        </TouchFriendlyButton>
      </div>
    </div>
  );
};

// Detect if device is touch-enabled
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Hook for detecting touch capability
export function useTouchDevice(): boolean {
  const [touchEnabled, setTouchEnabled] = useState(false);

  useEffect(() => {
    setTouchEnabled(isTouchDevice());
  }, []);

  return touchEnabled;
}

export const TouchSupport = {
  useTouchGestures,
  TouchScrollContainer,
  PullToRefresh,
  TouchFriendlyButton,
  VirtualKeyboard,
  isTouchDevice,
  useTouchDevice,
};

export default TouchSupport;
