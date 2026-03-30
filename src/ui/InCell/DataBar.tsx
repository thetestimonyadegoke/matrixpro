import React, { memo } from "react";

export interface DataBarProps {
  value: number | null;
  width: number;
  positiveColor: string;
  negativeColor: string;
}

export const DataBar: React.FC<DataBarProps> = memo(({
  value,
  width,
  positiveColor,
  negativeColor,
}) => {
  if (value === null || width <= 0) {
    return null;
  }

  const isPositive = value >= 0;
  const color = isPositive ? positiveColor : negativeColor;

  return (
    <div
      className={`data-bar ${isPositive ? "positive" : "negative"}`}
      style={{
        width: `${Math.min(100, width)}%`,
        backgroundColor: color,
      }}
    />
  );
});

DataBar.displayName = "DataBar";
