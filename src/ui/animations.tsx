/**
 * Animation and Transition Components
 * Provides smooth animations for MatrixPro UI interactions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'expand';
  duration?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  onAnimationEnd?: () => void;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fadeIn',
  duration = 200,
  delay = 0,
  className = '',
  style = {},
  onAnimationEnd,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    };

    switch (animation) {
      case 'fadeIn':
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
        };
      case 'slideIn':
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
        };
      case 'scaleIn':
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        };
      case 'expand':
        return {
          ...base,
          maxHeight: isVisible ? '1000px' : '0',
          opacity: isVisible ? 1 : 0,
          overflow: 'hidden',
        };
      default:
        return base;
    }
  };

  return (
    <div
      className={`matrix-animated ${className}`}
      style={{ ...getAnimationStyles(), ...style }}
      onTransitionEnd={onAnimationEnd}
    >
      {children}
    </div>
  );
};

interface RippleEffectProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
  disabled?: boolean;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  duration = 600,
  disabled = false,
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const idCounter = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = idCounter.current++;

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, duration);
  }, [disabled, duration]);

  return (
    <div
      className="matrix-ripple-container"
      onClick={handleClick}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="matrix-ripple-effect"
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            marginLeft: -5,
            marginTop: -5,
            backgroundColor: color,
            borderRadius: '50%',
            transform: 'scale(0)',
            animation: `matrix-ripple ${duration}ms ease-out`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

interface StaggeredListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  staggerDelay?: number;
  baseDelay?: number;
  className?: string;
}

export function StaggeredList<T>({
  items,
  renderItem,
  keyExtractor,
  staggerDelay = 50,
  baseDelay = 0,
  className = '',
}: StaggeredListProps<T>) {
  return (
    <div className={`matrix-staggered-list ${className}`}>
      {items.map((item, index) => (
        <AnimatedContainer
          key={keyExtractor(item, index)}
          animation="slideIn"
          delay={baseDelay + index * staggerDelay}
          duration={200}
        >
          {renderItem(item, index)}
        </AnimatedContainer>
      ))}
    </div>
  );
}

interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}

export const HoverScale: React.FC<HoverScaleProps> = ({
  children,
  scale = 1.02,
  duration = 150,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`matrix-hover-scale ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transition: `transform ${duration}ms ease`,
        transform: isHovered ? `scale(${scale})` : 'scale(1)',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

interface FadeTransitionProps {
  children: React.ReactNode;
  show: boolean;
  duration?: number;
  unmountOnExit?: boolean;
  className?: string;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  show,
  duration = 200,
  unmountOnExit = true,
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to allow render before animating opacity
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpacity(1));
      });
      return undefined;
    } else {
      setOpacity(0);
      const timer = setTimeout(() => {
        if (unmountOnExit) {
          setShouldRender(false);
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, unmountOnExit]);

  if (!shouldRender) return null;

  return (
    <div
      className={`matrix-fade-transition ${className}`}
      style={{
        opacity,
        transition: `opacity ${duration}ms ease`,
      }}
    >
      {children}
    </div>
  );
};

interface PulseIndicatorProps {
  color?: string;
  size?: number;
  pulse?: boolean;
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  color = 'var(--matrix-primary)',
  size = 8,
  pulse = true,
}) => {
  return (
    <span
      className="matrix-pulse-indicator"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        animation: pulse ? 'matrix-pulse 2s ease-in-out infinite' : undefined,
      }}
    />
  );
};

interface LoadingDotsProps {
  color?: string;
  size?: number;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = 'var(--matrix-text-secondary)',
  size = 8,
}) => {
  return (
    <span
      className="matrix-loading-dots"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: '50%',
            animation: `matrix-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
};

interface CollapseProps {
  children: React.ReactNode;
  expanded: boolean;
  duration?: number;
  className?: string;
}

export const Collapse: React.FC<CollapseProps> = ({
  children,
  expanded,
  duration = 300,
  className = '',
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(expanded ? undefined : 0);

  useEffect(() => {
    if (contentRef.current) {
      if (expanded) {
        setHeight(contentRef.current.scrollHeight);
        const timer = setTimeout(() => setHeight(undefined), duration);
        return () => clearTimeout(timer);
      } else {
        setHeight(contentRef.current.scrollHeight);
        requestAnimationFrame(() => setHeight(0));
      }
    }
    return undefined;
  }, [expanded, duration]);

  return (
    <div
      className={`matrix-collapse ${className}`}
      style={{
        height,
        overflow: 'hidden',
        transition: `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

// CSS for ripple animation
export const animationCSS = `
@keyframes matrix-ripple {
  to {
    transform: scale(40);
    opacity: 0;
  }
}

.matrix-animated {
  will-change: transform, opacity;
}

.matrix-hover-scale {
  cursor: pointer;
}

.matrix-fade-transition {
  will-change: opacity;
}

.matrix-collapse {
  will-change: height;
}
`;

// Export all
export const Animations = {
  AnimatedContainer,
  RippleEffect,
  StaggeredList,
  HoverScale,
  FadeTransition,
  PulseIndicator,
  LoadingDots,
  Collapse,
  animationCSS,
};

export default Animations;
