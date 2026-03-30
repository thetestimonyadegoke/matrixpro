import React, { useState, useCallback, useRef, useEffect } from "react";

export interface DragState {
  isDragging: boolean;
  dragType: "row" | "column" | null;
  dragKey: string | null;
  dragIndex: number | null;
  dropIndex: number | null;
  dropPosition: "before" | "after" | null;
}

export interface DragDropContextValue {
  dragState: DragState;
  startDrag: (type: "row" | "column", key: string, index: number) => void;
  updateDrop: (index: number, position: "before" | "after") => void;
  endDrag: () => void;
  cancelDrag: () => void;
}

const initialDragState: DragState = {
  isDragging: false,
  dragType: null,
  dragKey: null,
  dragIndex: null,
  dropIndex: null,
  dropPosition: null,
};

export const DragDropContext = React.createContext<DragDropContextValue | null>(null);

export interface DragDropProviderProps {
  children: React.ReactNode;
  onRowReorder?: (fromIndex: number, toIndex: number, position: "before" | "after") => void;
  onColumnReorder?: (fromIndex: number, toIndex: number, position: "before" | "after") => void;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onRowReorder,
  onColumnReorder,
}) => {
  const [dragState, setDragState] = useState<DragState>(initialDragState);

  const startDrag = useCallback((type: "row" | "column", key: string, index: number) => {
    setDragState({
      isDragging: true,
      dragType: type,
      dragKey: key,
      dragIndex: index,
      dropIndex: null,
      dropPosition: null,
    });
  }, []);

  const updateDrop = useCallback((index: number, position: "before" | "after") => {
    setDragState(prev => ({
      ...prev,
      dropIndex: index,
      dropPosition: position,
    }));
  }, []);

  const endDrag = useCallback(() => {
    const { dragType, dragIndex, dropIndex, dropPosition } = dragState;
    
    if (dragIndex !== null && dropIndex !== null && dropPosition && dragIndex !== dropIndex) {
      if (dragType === "row" && onRowReorder) {
        onRowReorder(dragIndex, dropIndex, dropPosition);
      } else if (dragType === "column" && onColumnReorder) {
        onColumnReorder(dragIndex, dropIndex, dropPosition);
      }
    }
    
    setDragState(initialDragState);
  }, [dragState, onRowReorder, onColumnReorder]);

  const cancelDrag = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  // Handle escape key to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragState.isDragging) {
        cancelDrag();
      }
    };

    if (dragState.isDragging) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [dragState.isDragging, cancelDrag]);

  const value: DragDropContextValue = {
    dragState,
    startDrag,
    updateDrop,
    endDrag,
    cancelDrag,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};

export function useDragDrop() {
  const context = React.useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
}

// Drag handle component
export interface DragHandleProps {
  type: "row" | "column";
  itemKey: string;
  index: number;
  disabled?: boolean;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  type,
  itemKey,
  index,
  disabled = false,
}) => {
  const { startDrag, endDrag, dragState } = useDragDrop();
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(type, itemKey, index);

    const handleMouseUp = () => {
      endDrag();
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mouseup", handleMouseUp);
  }, [disabled, type, itemKey, index, startDrag, endDrag]);

  const isDragging = dragState.isDragging && dragState.dragKey === itemKey;

  return (
    <div
      ref={handleRef}
      className={`drag-handle ${isDragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Drag to reorder ${type}`}
      title={`Drag to reorder`}
    >
      <span className="drag-handle-icon">⋮⋮</span>
    </div>
  );
};

// Drop indicator component
export interface DropIndicatorProps {
  show: boolean;
  position: "before" | "after";
  orientation: "horizontal" | "vertical";
}

export const DropIndicator: React.FC<DropIndicatorProps> = ({
  show,
  position,
  orientation,
}) => {
  if (!show) return null;

  return (
    <div
      className={`drop-indicator ${orientation} ${position}`}
      aria-hidden="true"
    />
  );
};

DragDropProvider.displayName = "DragDropProvider";
DragHandle.displayName = "DragHandle";
DropIndicator.displayName = "DropIndicator";
