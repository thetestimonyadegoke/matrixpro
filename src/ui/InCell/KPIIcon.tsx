import React, { memo } from "react";

export interface KPIIconProps {
  delta: number;
  upThreshold: number;
  downThreshold: number;
  upColor: string;
  neutralColor: string;
  downColor: string;
}

export const KPIIcon: React.FC<KPIIconProps> = memo(({
  delta,
  upThreshold,
  downThreshold,
  upColor,
  neutralColor,
  downColor,
}) => {
  let icon: string;
  let color: string;
  let className: string;

  if (delta >= upThreshold) {
    icon = "▲";
    color = upColor;
    className = "up";
  } else if (delta <= downThreshold) {
    icon = "▼";
    color = downColor;
    className = "down";
  } else {
    icon = "●";
    color = neutralColor;
    className = "neutral";
  }

  return (
    <span
      className={`kpi-icon ${className}`}
      style={{ color }}
    >
      {icon}
    </span>
  );
});

KPIIcon.displayName = "KPIIcon";
