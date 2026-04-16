import React from "react";

interface SimulateBarProps {
  onExit: () => void;
}

export const SimulateBar: React.FC<SimulateBarProps> = ({ onExit }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 14px",
        background: "#fffbeb",
        borderBottom: "2px solid #f59e0b",
        fontSize: 12,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#92400e",
        userSelect: "none",
        zIndex: 100,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
      <span style={{ fontWeight: 600 }}>Simulation Mode</span>
      <span style={{ color: "#b45309" }}>—</span>
      <span>Changes are temporary and won't affect source data.</span>
      <span style={{ flex: 1 }} />
      <button
        onClick={onExit}
        style={{
          padding: "3px 12px",
          background: "#f59e0b",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        Exit Simulation
      </button>
    </div>
  );
};
