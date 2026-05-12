import React, { useEffect, useRef, useCallback } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportWidth) adjustedX = viewportWidth - rect.width - 8;
    if (y + rect.height > viewportHeight) adjustedY = viewportHeight - rect.height - 8;

    menuRef.current.style.left = `${Math.max(8, adjustedX)}px`;
    menuRef.current.style.top = `${Math.max(8, adjustedY)}px`;
  }, [x, y]);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled || item.divider) return;
    item.action?.();
    onClose();
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, index) => {
        if (item.divider) return <div key={index} className="context-menu-divider" />;
        return (
          <button
            key={item.id}
            className={`context-menu-item ${item.disabled ? "disabled" : ""}`}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            role="menuitem"
            type="button"
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
          </button>
        );
      })}
    </div>
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
    { id: "copy", label: "Copy Value", icon: "Copy", action: onCopy },
    { id: "copyRow", label: "Copy Row", icon: "Row", action: onCopyRow },
    { id: "divider1", label: "", divider: true },
    { id: "addNote", label: "Add/Edit Note", icon: "Note", action: onAddNote },
    { id: "revert", label: "Revert to Model Value", icon: "Undo", action: onRevert, disabled: !hasEdit },
    { id: "divider2", label: "", divider: true },
    { id: "createCalc", label: "Create Calculated Measure...", icon: "Calc", action: onOpenCalcWizard },
    { id: "addVariance", label: "Variance vs Previous", icon: "Delta", action: onAddVariance },
    { id: "divider3", label: "", divider: true },
    { id: "export", label: "Export Selection", icon: "Export", action: onExport },
  ];
  if (onDrillThrough) {
    items.push({ id: "divider4", label: "", divider: true });
    items.push({ id: "drillThrough", label: "Drill Through...", icon: "Open", action: onDrillThrough });
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
  onEditRow?: () => void,
  onDeleteRow?: () => void,
  onDrillThrough?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "expandAll", label: "Expand All Under This", icon: "Expand", action: onExpandAll },
    { id: "collapseAll", label: "Collapse All Under This", icon: "Collapse", action: onCollapseAll },
    { id: "divider1", label: "", divider: true },
    { id: "addCalcRow", label: "Add Calculated Row...", icon: "Add", action: onAddCalcRow },
    { id: "renameRow", label: "Rename Row", icon: "Edit", action: onRenameRow },
    { id: "moveToGroup", label: "Move to Group...", icon: "Group", action: onMoveToGroup },
    { id: "hideRow", label: "Hide Row/Hierarchy", icon: "Hide", action: onHide },
    { id: "divider2", label: "", divider: true },
    { id: "lockRow", label: isLocked ? "Unlock Row" : "Lock Row", icon: isLocked ? "Unlock" : "Lock", action: onLockRow },
  ];

  if (isCalculated) {
    items.push({ id: "dividerCalc", label: "", divider: true });
    items.push({ id: "editCalcRow", label: "Edit Calculated Row", icon: "Settings", action: onEditRow });
    items.push({ id: "deleteCalcRow", label: "Delete Calculated Row", icon: "Delete", action: onDeleteRow });
  }

  if (onDrillThrough) {
    items.push({ id: "divider3", label: "", divider: true });
    items.push({ id: "drillThrough", label: "Drill Through...", icon: "Open", action: onDrillThrough });
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
    { id: "sortAsc", label: "Sort Ascending", icon: "Up", action: onSortAsc },
    { id: "sortDesc", label: "Sort Descending", icon: "Down", action: onSortDesc },
    { id: "divider1", label: "", divider: true },
    { id: "renameColumn", label: "Rename Header", icon: "Edit", action: onRenameColumn },
    { id: "dividerRename", label: "", divider: true },
    { id: "moveLeft", label: "Move Left", icon: "Left", action: onMoveLeft },
    { id: "moveRight", label: "Move Right", icon: "Right", action: onMoveRight },
    { id: "divider2", label: "", divider: true },
    { id: "pin", label: isPinned ? "Unpin Column" : "Pin/Freeze", icon: "Pin", action: onPin },
    { id: "addVariance", label: "Add Variance Column", icon: "Delta", action: onAddVariance },
  ];

  if (onHideColumn) {
    items.push({ id: "divider3", label: "", divider: true });
    items.push({ id: "hideColumn", label: "Hide Column", icon: "Hide", action: onHideColumn });
  }

  return items;
}

ContextMenu.displayName = "ContextMenu";
