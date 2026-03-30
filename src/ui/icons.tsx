import React from "react";

export type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

const Svg: React.FC<React.PropsWithChildren<IconProps>> = ({
  size = 16,
  className,
  title,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? "img" : "presentation"}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconExport: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M8 2v7" />
    <path {...stroke} d="M5 6l3 3 3-3" />
    <path {...stroke} d="M3 10.5v2A1.5 1.5 0 004.5 14h7A1.5 1.5 0 0013 12.5v-2" />
  </Svg>
);

export const IconGrid: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 2.5h11v11h-11z" />
    <path {...stroke} d="M2.5 6h11" />
    <path {...stroke} d="M2.5 10h11" />
    <path {...stroke} d="M6 2.5v11" />
    <path {...stroke} d="M10 2.5v11" />
  </Svg>
);

export const IconRows: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h11" />
    <path {...stroke} d="M2.5 8h11" />
    <path {...stroke} d="M2.5 12h11" />
  </Svg>
);

export const IconColumns: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 2.5v11" />
    <path {...stroke} d="M8 2.5v11" />
    <path {...stroke} d="M12 2.5v11" />
  </Svg>
);

export const IconSpark: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 11l3-3 2 2 4-6 2 2" />
    <path {...stroke} d="M2.5 13.5h11" />
  </Svg>
);

export const IconBars: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 12.5h3" />
    <path {...stroke} d="M3 9.5h7" />
    <path {...stroke} d="M3 6.5h5" />
    <path {...stroke} d="M3 3.5h9" />
  </Svg>
);

export const IconKpi: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 12.5V9" />
    <path {...stroke} d="M6.5 12.5V6.5" />
    <path {...stroke} d="M10 12.5V8" />
    <path {...stroke} d="M13 12.5V4" />
  </Svg>
);

export const IconCheck: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 8.5l2.5 2.5L13 4.5" />
  </Svg>
);

export const IconChevronDown: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 6.5l4 4 4-4" />
  </Svg>
);

export const IconBold: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 3h5a2.5 2.5 0 010 5H4V3z" />
    <path {...stroke} d="M4 8h6a2.5 2.5 0 010 5H4V8z" />
  </Svg>
);

export const IconItalic: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M6 3h6" />
    <path {...stroke} d="M9 3l-3 10" />
    <path {...stroke} d="M4 13h6" />
  </Svg>
);

export const IconUnderline: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 3v6a4 4 0 008 0V3" />
    <path {...stroke} d="M3 13h10" />
  </Svg>
);

export const IconFontSize: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 13V4" />
    <path {...stroke} d="M2 4h4" />
    <path {...stroke} d="M10 13V7" />
    <path {...stroke} d="M8 7h4" />
    <path {...stroke} d="M2 13h12" />
  </Svg>
);

export const IconFontColor: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M8 3l3 8" />
    <path {...stroke} d="M5 11l3-8" />
    <path {...stroke} d="M4 13h8" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" />
  </Svg>
);

export const IconFillColor: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 9l5-5 5 5" />
    <path {...stroke} d="M12 13a3 3 0 01-6 0" />
    <path {...stroke} d="M8 4v10" />
  </Svg>
);

export const IconAlignLeft: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h6" />
    <path {...stroke} d="M2.5 7h11" />
    <path {...stroke} d="M2.5 10h8" />
    <path {...stroke} d="M2.5 13h11" />
  </Svg>
);

export const IconAlignCenter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M5 4h6" />
    <path {...stroke} d="M2.5 7h11" />
    <path {...stroke} d="M4 10h8" />
    <path {...stroke} d="M2.5 13h11" />
  </Svg>
);

export const IconAlignRight: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M7.5 4h6" />
    <path {...stroke} d="M2.5 7h11" />
    <path {...stroke} d="M4 10h8" />
    <path {...stroke} d="M2.5 13h11" />
  </Svg>
);

export const IconBorders: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 2.5h11v11h-11z" />
    <path {...stroke} d="M2.5 8h11" />
    <path {...stroke} d="M8 2.5v11" />
  </Svg>
);

export const IconChart: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 13V9" />
    <path {...stroke} d="M6 13V6" />
    <path {...stroke} d="M9 13V4" />
    <path {...stroke} d="M12 13V7" />
    <path {...stroke} d="M2.5 13h11" />
  </Svg>
);

export const IconPieChart: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M8 3v5h5" />
  </Svg>
);

export const IconLineChart: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 11.5l3-3 2 2 4-6 2 2" />
    <path {...stroke} d="M2.5 13.5h11" />
  </Svg>
);

export const IconSort: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 6l2-2 2 2" />
    <path {...stroke} d="M4 10l2 2 2-2" />
    <path {...stroke} d="M10 4v8" />
    <path {...stroke} d="M13 4v8" />
  </Svg>
);

export const IconFilter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h11" />
    <path {...stroke} d="M5 4v3a3 3 0 006 0V4" />
    <path {...stroke} d="M8 10v4" />
  </Svg>
);

export const IconNote: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 2.5h8a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0112 14.5H4A1.5 1.5 0 012.5 13V4A1.5 1.5 0 014 2.5z" />
    <path {...stroke} d="M5 5.5h6" />
    <path {...stroke} d="M5 8h4" />
    <path {...stroke} d="M5 10.5h3" />
  </Svg>
);

export const IconTemplate: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h11" />
    <path {...stroke} d="M2.5 8h11" />
    <path {...stroke} d="M2.5 12h6" />
    <rect x="10" y="10" width="3" height="3" rx="0.5" {...stroke} />
  </Svg>
);

export const IconDisplay: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="12" height="9" rx="1" {...stroke} />
    <path {...stroke} d="M6 15h4" />
    <path {...stroke} d="M8 12v3" />
  </Svg>
);

export const IconUndo: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 8h6a3 3 0 013 3v1" />
    <path {...stroke} d="M7 5L4 8l3 3" />
  </Svg>
);

export const IconRedo: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M12 8H6a3 3 0 00-3 3v1" />
    <path {...stroke} d="M9 5l3 3-3 3" />
  </Svg>
);

export const IconInsertRow: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h11" />
    <path {...stroke} d="M2.5 8h11" />
    <path {...stroke} d="M2.5 12h11" />
    <path {...stroke} d="M8 2v12" />
    <path {...stroke} d="M6 8h4" />
  </Svg>
);

export const IconFormula: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M6 3l-2 5 2 5" />
    <path {...stroke} d="M10 3l2 5-2 5" />
    <path {...stroke} d="M4 8h8" />
  </Svg>
);

export const IconCalculator: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="2" width="10" height="12" rx="1" {...stroke} />
    <path {...stroke} d="M6 5h4" />
    <circle cx="5.5" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="8" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="10.5" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="5.5" cy="11" r="0.8" fill="currentColor" />
    <circle cx="8" cy="11" r="0.8" fill="currentColor" />
    <circle cx="10.5" cy="11" r="0.8" fill="currentColor" />
  </Svg>
);

export const IconBlend: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="6" cy="6" r="3" {...stroke} />
    <circle cx="10" cy="10" r="3" {...stroke} />
  </Svg>
);

export const IconSimulate: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M8 2v3" />
    <path {...stroke} d="M8 11v3" />
    <path {...stroke} d="M3 8h3" />
    <path {...stroke} d="M10 8h3" />
    <circle cx="8" cy="8" r="2" {...stroke} />
    <path {...stroke} d="M4.2 4.2l2.1 2.1" />
    <path {...stroke} d="M9.7 9.7l2.1 2.1" />
    <path {...stroke} d="M4.2 11.8l2.1-2.1" />
    <path {...stroke} d="M9.7 4.3l2.1-2.1" />
  </Svg>
);

export const IconDataInput: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 4h11" />
    <path {...stroke} d="M2.5 8h11" />
    <path {...stroke} d="M2.5 12h6" />
    <path {...stroke} d="M11 10l2 2-2 2" />
  </Svg>
);

export const IconVariables: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 4h10" />
    <path {...stroke} d="M3 8h10" />
    <path {...stroke} d="M3 12h6" />
    <text x="11" y="13" fontSize="6" fill="currentColor">x</text>
  </Svg>
);

export const IconGoalSeek: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="5" r="2" {...stroke} />
    <path {...stroke} d="M4 13c0-2 2-4 4-4s4 2 4 4" />
    <path {...stroke} d="M12 3l2 2" />
    <path {...stroke} d="M14 3v2h-2" />
  </Svg>
);

export const IconBulkEdit: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="5" height="4" rx="0.5" {...stroke} />
    <rect x="9" y="3" width="5" height="4" rx="0.5" {...stroke} />
    <rect x="2" y="9" width="5" height="4" rx="0.5" {...stroke} />
    <rect x="9" y="9" width="5" height="4" rx="0.5" {...stroke} />
  </Svg>
);

export const IconSmartAnalysis: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M8 2l1.5 3h3L10 7l1 3.5L8 8.5 5 10.5l1-3.5L3.5 5h3L8 2z" />
    <path {...stroke} d="M2 14h12" />
  </Svg>
);

export const IconGroup: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="3" width="4" height="4" rx="0.5" {...stroke} />
    <rect x="9" y="3" width="4" height="4" rx="0.5" {...stroke} />
    <rect x="3" y="9" width="4" height="4" rx="0.5" {...stroke} />
    <rect x="9" y="9" width="4" height="4" rx="0.5" {...stroke} />
  </Svg>
);

export const IconAggregation: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 13V8" />
    <path {...stroke} d="M6 13V5" />
    <path {...stroke} d="M9 13V7" />
    <path {...stroke} d="M12 13V4" />
    <path {...stroke} d="M2 13h12" />
  </Svg>
);

export const IconVersion: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M8 5v3l2 2" />
  </Svg>
);

export const IconCompare: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="6" height="10" rx="0.5" {...stroke} />
    <rect x="9" y="3" width="5" height="10" rx="0.5" {...stroke} />
    <path {...stroke} d="M5 8h7" />
  </Svg>
);

export const IconContext: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="5" r="2" {...stroke} />
    <circle cx="5" cy="11" r="2" {...stroke} />
    <circle cx="11" cy="11" r="2" {...stroke} />
    <path {...stroke} d="M7 6.5l-1.5 3" />
    <path {...stroke} d="M9 6.5l1.5 3" />
  </Svg>
);

export const IconAudit: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M5 8l2 2 4-4" />
  </Svg>
);

export const IconHeaderFooter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="2" width="12" height="3" rx="0.5" {...stroke} />
    <rect x="2" y="6" width="12" height="4" rx="0.5" {...stroke} />
    <rect x="2" y="11" width="12" height="3" rx="0.5" {...stroke} />
  </Svg>
);

export const IconTheme: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M8 3v10" />
    <path {...stroke} d="M3 8h10" />
  </Svg>
);

export const IconPageBreak: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="2" width="5" height="12" rx="0.5" {...stroke} />
    <rect x="9" y="2" width="5" height="12" rx="0.5" {...stroke} />
    <path {...stroke} d="M8 7v2" />
  </Svg>
);

export const IconReport: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 2.5h8a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0112 14.5H4A1.5 1.5 0 012.5 13V4A1.5 1.5 0 014 2.5z" />
    <path {...stroke} d="M5 5.5h6" />
    <path {...stroke} d="M5 8h6" />
    <path {...stroke} d="M5 10.5h4" />
  </Svg>
);

export const IconPageTotal: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="12" height="10" rx="0.5" {...stroke} />
    <path {...stroke} d="M2 11h12" />
    <text x="7" y="9" fontSize="5" fill="currentColor">123</text>
  </Svg>
);

export const IconGridlines: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2.5 2.5h11v11h-11z" />
    <path {...stroke} d="M2.5 6h11" />
    <path {...stroke} d="M2.5 10h11" />
    <path {...stroke} d="M6 2.5v11" />
    <path {...stroke} d="M10 2.5v11" />
  </Svg>
);

export const IconOutline: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="12" height="10" rx="0.5" {...stroke} />
    <path {...stroke} d="M5 3v10" />
    <path {...stroke} d="M2 7h3" />
  </Svg>
);

export const IconHighlight: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2 13l2-8 4-2 4 2 2 8H2z" />
    <path {...stroke} d="M4 8h8" />
  </Svg>
);

export const IconPdf: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 2.5h5l3.5 3.5v8H4V2.5z" />
    <path {...stroke} d="M9 3v3h3" />
    <text x="5.5" y="12" fontSize="4" fill="currentColor">PDF</text>
  </Svg>
);

export const IconExcel: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 2.5h5l3.5 3.5v8H4V2.5z" />
    <path {...stroke} d="M9 3v3h3" />
    <text x="5" y="12" fontSize="4" fill="currentColor">XLS</text>
  </Svg>
);

export const IconWriteback: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M12 4l-6 6-2 2 2-2 6-6" />
    <path {...stroke} d="M11 3l1 1" />
    <path {...stroke} d="M3 13h10" />
  </Svg>
);

export const IconSchedule: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M8 5v3l2 2" />
  </Svg>
);

export const IconSettings: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="2" {...stroke} />
    <path {...stroke} d="M8 2v2" />
    <path {...stroke} d="M8 12v2" />
    <path {...stroke} d="M2 8h2" />
    <path {...stroke} d="M12 8h2" />
    <path {...stroke} d="M3.8 3.8l1.4 1.4" />
    <path {...stroke} d="M10.8 10.8l1.4 1.4" />
    <path {...stroke} d="M3.8 12.2l1.4-1.4" />
    <path {...stroke} d="M10.8 5.2l1.4-1.4" />
  </Svg>
);

export const IconBackup: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 9a4 4 0 118 0v2" />
    <path {...stroke} d="M8 11v4" />
    <path {...stroke} d="M6 13l2 2 2-2" />
  </Svg>
);

export const IconMenu: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 4h10" />
    <path {...stroke} d="M3 8h10" />
    <path {...stroke} d="M3 12h10" />
  </Svg>
);

export const IconUnpin: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M8 2v6" />
    <path {...stroke} d="M5 8l3-3 3 3" />
    <path {...stroke} d="M5 14h6" />
  </Svg>
);

export const IconReading: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 4h10" />
    <path {...stroke} d="M3 7h10" />
    <path {...stroke} d="M3 10h10" />
    <path {...stroke} d="M3 13h7" />
  </Svg>
);

export const IconQuickAccess: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="7" cy="7" r="4" {...stroke} />
    <path {...stroke} d="M11 11l3 3" />
  </Svg>
);

export const IconFull: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="2" width="12" height="12" rx="0.5" {...stroke} />
    <path {...stroke} d="M2 5h12" />
    <path {...stroke} d="M2 10h12" />
    <path {...stroke} d="M6 2v12" />
  </Svg>
);

export const IconMinimal: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="4" y="4" width="8" height="8" rx="0.5" {...stroke} />
  </Svg>
);

export const IconTabs: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="4" width="4" height="8" rx="0.5" {...stroke} />
    <rect x="7" y="4" width="7" height="8" rx="0.5" {...stroke} />
    <path {...stroke} d="M2 2h12" />
  </Svg>
);

export const IconTopN: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 4h2" />
    <path {...stroke} d="M3 7h4" />
    <path {...stroke} d="M3 10h6" />
    <path {...stroke} d="M3 13h8" />
    <path {...stroke} d="M11 3v10" />
    <path {...stroke} d="M9 5l2-2 2 2" />
  </Svg>
);

export const IconExplorer: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 3h8" />
    <path {...stroke} d="M4 7h6" />
    <path {...stroke} d="M4 11h4" />
    <path {...stroke} d="M14 3v12" />
    <path {...stroke} d="M12 9l2 3 2-3" />
  </Svg>
);

export const IconActions: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="5" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="11" cy="8" r="1.5" fill="currentColor" />
  </Svg>
);

export const IconManageColumns: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="4" height="10" rx="0.5" {...stroke} />
    <rect x="7" y="3" width="3" height="10" rx="0.5" {...stroke} />
    <rect x="11" y="3" width="3" height="10" rx="0.5" {...stroke} />
    <path {...stroke} d="M12.5 6v4" />
    <path {...stroke} d="M11 8h3" />
  </Svg>
);

export const IconCondFormat: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="2" y="3" width="4" height="4" rx="0.5" fill="#ff6b6b" {...stroke} />
    <rect x="7" y="3" width="4" height="4" rx="0.5" fill="#ffd93d" {...stroke} />
    <rect x="2" y="9" width="4" height="4" rx="0.5" fill="#6bcb77" {...stroke} />
    <rect x="7" y="9" width="4" height="4" rx="0.5" fill="#4a90d9" {...stroke} />
  </Svg>
);

export const IconTotals: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2 5h12" />
    <path {...stroke} d="M2 9h12" />
    <path {...stroke} d="M2 13h12" />
    <path {...stroke} d="M8 2v11" />
  </Svg>
);

export const IconSubscription: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M2 5a6 6 0 0012 0" />
    <path {...stroke} d="M8 11v3" />
    <path {...stroke} d="M6 14l2-2 2 2" />
  </Svg>
);

export const IconNew: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="3" width="10" height="10" rx="0.5" {...stroke} />
    <path {...stroke} d="M8 6v6" />
    <path {...stroke} d="M5 9h6" />
  </Svg>
);

export const IconConfig: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="2" {...stroke} />
    <path {...stroke} d="M8 2v2" />
    <path {...stroke} d="M8 12v2" />
    <path {...stroke} d="M3.5 3.5l1.4 1.4" />
    <path {...stroke} d="M11.1 11.1l1.4 1.4" />
    <path {...stroke} d="M3.5 12.5l1.4-1.4" />
    <path {...stroke} d="M11.1 4.9l1.4-1.4" />
  </Svg>
);

export const IconReuse: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M4 8a4 4 0 118 0 4 4 0 01-8 0" />
    <path {...stroke} d="M12 4v4" />
    <path {...stroke} d="M10 6l2-2 2 2" />
  </Svg>
);

export const IconReset: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path {...stroke} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
    <path {...stroke} d="M3 3v9h9" />
  </Svg>
);

export const IconAllowed: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="5" {...stroke} />
    <path {...stroke} d="M5 8l2 2 4-4" />
  </Svg>
);
