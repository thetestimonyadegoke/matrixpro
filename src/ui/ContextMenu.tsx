import React, { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { VisualPortal } from "./overlayKit";

export type ContextMenuType = "cell" | "rowHeader" | "columnHeader" | "total";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  type: ContextMenuType;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  // The menu mounts one render late (VisualPortal resolves its host first), so
  // track the element in state to run positioning once it actually exists.
  const [menuEl, setMenuEl] = useState<HTMLDivElement | null>(null);
  const setMenuRef = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el;
    setMenuEl(el);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Flip horizontally if overflowing right
    if (x + rect.width > viewportWidth) {
      adjustedX = x - rect.width;
      if (adjustedX < 8) adjustedX = viewportWidth - rect.width - 8;
    }

    // Flip vertically if overflowing bottom or if in bottom half of screen
    const spaceBelow = viewportHeight - y;
    const spaceAbove = y;
    
    if (spaceBelow < rect.height && spaceAbove > spaceBelow) {
      // Not enough space below, and more space above -> flip up
      adjustedY = y - rect.height;
    } else if (y + rect.height > viewportHeight) {
      // Simply overflowing bottom, move up to fit
      adjustedY = viewportHeight - rect.height - 8;
    }

    menuRef.current.style.left = `${Math.max(8, adjustedX)}px`;
    menuRef.current.style.top = `${Math.max(8, adjustedY)}px`;
    menuRef.current.style.opacity = "1";
  }, [x, y, menuEl]);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled || item.divider) return;
    item.action?.();
    onClose();
  }, [onClose]);

  const renderIcon = (name: string) => {
    const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (name) {
      case "Copy": return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
      case "Row": return <svg {...common}><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
      case "Note": return <svg {...common}><path d="M4 4h16v14H7l-3 3z" /></svg>;
      case "Undo": return <svg {...common}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-1" /></svg>;
      case "Calc": return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2" /></svg>;
      case "Delta": return <svg {...common}><path d="M12 3 3 21h18z" /></svg>;
      case "Export": return <svg {...common}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;
      case "Open": return <svg {...common}><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>;
      case "Expand": return <svg {...common}><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>;
      case "Collapse": return <svg {...common}><path d="m7 9 5 5 5-5" /></svg>;
      case "Add": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
      case "Edit": return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
      case "Group": return <svg {...common}><rect x="3" y="4" width="7" height="7" rx="1" /><rect x="14" y="4" width="7" height="7" rx="1" /><rect x="8.5" y="14" width="7" height="7" rx="1" /></svg>;
      case "Hide": return <svg {...common}><path d="M3 3l18 18" /><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" /><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 10 8 10 8a17.2 17.2 0 0 1-3.2 4.4" /><path d="M6.1 6.1C3.4 7.9 2 12 2 12s3 8 10 8a10.8 10.8 0 0 0 4-.8" /></svg>;
      case "Lock": return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
      case "Unlock": return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></svg>;
      case "Settings": return <svg {...common}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 18l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 8A2 2 0 1 1 7 5.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
      case "Delete": return <svg {...common}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>;
      case "Up": return <svg {...common}><path d="m18 15-6-6-6 6" /></svg>;
      case "Down": return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
      case "Left": return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
      case "Right": return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
      case "Pin": return <svg {...common}><path d="m14 4 6 6-4 1-5 5-3-3 5-5z" /><path d="m5 19 5-5" /></svg>;
      default: return <span aria-hidden="true">{name.slice(0, 1)}</span>;
    }
  };

  return (
    <VisualPortal>
      <div
        ref={setMenuRef}
        className="mx-popover"
        style={{
          left: x,
          top: y,
          maxHeight: "min(80vh, 600px)",
          overscrollBehavior: "contain",
          opacity: 0,
        }}
        role="menu"
        aria-label="Context menu"
      >
        {items.map((item, index) => {
          if (item.divider) return <div key={index} className="mx-popover-sep" role="separator" />;
          const danger = item.icon === "Delete";
          return (
            <button
              key={item.id}
              className={`mx-popover-item${danger ? " is-danger" : ""}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              role="menuitem"
              type="button"
            >
              {item.icon && <span className="mx-popover-icon" aria-hidden="true">{renderIcon(item.icon)}</span>}
              <span className="mx-popover-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </VisualPortal>
  );
};

export function buildCellMenuItems(
  onCopy: () => void,
  onCopyRow: () => void,
  onAddNote: () => void,
  onOpenCalcWizard: () => void,
  onAddVariance: () => void,
  onExport: () => void,
  onRevert: () => void,
  hasEdit: boolean,
  onDrillThrough?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "copy", label: "Copy value", icon: "Copy", action: onCopy },
    { id: "copyRow", label: "Copy row", icon: "Row", action: onCopyRow },
    { id: "divider1", label: "", divider: true },
    { id: "addNote", label: "Add or edit note", icon: "Note", action: onAddNote },
    { id: "revert", label: "Revert to model value", icon: "Undo", action: onRevert, disabled: !hasEdit },
    { id: "divider2", label: "", divider: true },
    { id: "createCalc", label: "Create calculated measure…", icon: "Calc", action: onOpenCalcWizard },
    { id: "addVariance", label: "Variance vs previous", icon: "Delta", action: onAddVariance },
    { id: "divider3", label: "", divider: true },
    { id: "export", label: "Export selection", icon: "Export", action: onExport },
  ];
  if (onDrillThrough) {
    items.push({ id: "divider4", label: "", divider: true });
    items.push({ id: "drillThrough", label: "Drill through…", icon: "Open", action: onDrillThrough });
  }
  return items;
}

export function buildRowHeaderMenuItems(
  onExpandAll: () => void,
  onCollapseAll: () => void,
  onAddCalcRow: () => void,
  onRenameRow: () => void,
  onMoveToGroup: () => void,
  onLockRow: () => void,
  isLocked: boolean,
  isCalculated: boolean,
  onHide: () => void,
  expandIconHidden: boolean,
  onToggleExpandIcon: () => void,
  onEditRow?: () => void,
  onDeleteRow?: () => void,
  onDrillThrough?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "expandAll", label: "Expand all under this", icon: "Expand", action: onExpandAll },
    { id: "collapseAll", label: "Collapse all under this", icon: "Collapse", action: onCollapseAll },
    { id: "divider1", label: "", divider: true },
    { id: "addCalcRow", label: "Add calculated row…", icon: "Add", action: onAddCalcRow },
    { id: "renameRow", label: "Rename row", icon: "Edit", action: onRenameRow },
    { id: "moveToGroup", label: "Move to group…", icon: "Group", action: onMoveToGroup },
    { id: "hideRow", label: "Hide row or hierarchy", icon: "Hide", action: onHide },
    { id: "toggleExpandIcon", label: expandIconHidden ? "Show expand/collapse icon" : "Hide expand/collapse icon", icon: "Settings", action: onToggleExpandIcon },
    { id: "divider2", label: "", divider: true },
    { id: "lockRow", label: isLocked ? "Unlock row" : "Lock row", icon: isLocked ? "Unlock" : "Lock", action: onLockRow },
  ];

  if (isCalculated) {
    items.push({ id: "dividerCalc", label: "", divider: true });
    items.push({ id: "editCalcRow", label: "Edit calculated row", icon: "Settings", action: onEditRow });
    items.push({ id: "deleteCalcRow", label: "Delete calculated row", icon: "Delete", action: onDeleteRow });
  }

  if (onDrillThrough) {
    items.push({ id: "divider3", label: "", divider: true });
    items.push({ id: "drillThrough", label: "Drill through…", icon: "Open", action: onDrillThrough });
  }

  return items;
}

export function buildColumnHeaderMenuItems(
  onSortAsc: () => void,
  onSortDesc: () => void,
  onRenameColumn: () => void,
  onMoveLeft: () => void,
  onMoveRight: () => void,
  onPin: () => void,
  onAddVariance: () => void,
  isPinned: boolean,
  onHideColumn?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "sortAsc", label: "Sort ascending", icon: "Up", action: onSortAsc },
    { id: "sortDesc", label: "Sort descending", icon: "Down", action: onSortDesc },
    { id: "divider1", label: "", divider: true },
    { id: "renameColumn", label: "Rename header", icon: "Edit", action: onRenameColumn },
    { id: "dividerRename", label: "", divider: true },
    { id: "moveLeft", label: "Move left", icon: "Left", action: onMoveLeft },
    { id: "moveRight", label: "Move right", icon: "Right", action: onMoveRight },
    { id: "divider2", label: "", divider: true },
    { id: "pin", label: isPinned ? "Unpin column" : "Pin column", icon: "Pin", action: onPin },
    { id: "addVariance", label: "Add variance column", icon: "Delta", action: onAddVariance },
  ];

  if (onHideColumn) {
    items.push({ id: "divider3", label: "", divider: true });
    items.push({ id: "hideColumn", label: "Hide column", icon: "Hide", action: onHideColumn });
  }

  return items;
}

ContextMenu.displayName = "ContextMenu";
