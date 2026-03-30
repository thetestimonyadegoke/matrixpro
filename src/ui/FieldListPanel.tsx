/**
 * FieldListPanel Component
 * Drag-drop field configuration panel for pivot operations
 */

import React, { useState, useCallback } from "react";
import {
  Field,
  HierarchyLevel,
  FilterItem,
  FieldPlacement,
  DropZone,
} from "../hierarchy/hierarchyManager";

interface FieldListPanelProps {
  availableFields: Field[];
  placement: FieldPlacement;
  onFieldAdd: (field: Field, zone: DropZone, index?: number) => void;
  onFieldRemove: (fieldId: string, zone: DropZone, index: number) => void;
  onFieldReorder: (zone: DropZone, fromIndex: number, toIndex: number) => void;
  onFieldMove: (
    field: Field,
    sourceZone: DropZone,
    sourceIndex: number,
    targetZone: DropZone,
    targetIndex: number
  ) => void;
  onClose?: () => void;
}

interface DropZoneProps {
  title: string;
  zone: DropZone;
  items: Array<HierarchyLevel | Field>;
  isMeasureZone?: boolean;
  onDrop: (zone: DropZone, index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  draggedField: Field | null;
}

interface FilterZoneProps {
  title: string;
  filters: FilterItem[];
  draggedField: Field | null;
  onDrop: (index: number) => void;
  onRemove: (index: number) => void;
}

const FilterZone: React.FC<FilterZoneProps> = ({
  title,
  filters,
  draggedField,
  onDrop,
  onRemove,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const canAcceptDrop = () => draggedField && !draggedField.isMeasure;

  return (
    <div className="field-zone">
      <div className="field-zone-header">
        <span className="field-zone-title">{title}</span>
        <span className="field-zone-count">{filters.length}</span>
      </div>
      <div
        className={`field-zone-content ${canAcceptDrop() ? "can-drop" : ""} ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(filters.length); }}
        onDragLeave={() => setDragOver(false)}
      >
        {filters.length === 0 && (
          <div className="field-zone-empty">
            {canAcceptDrop() ? "Drop field here" : "Drag hierarchy fields here"}
          </div>
        )}
        {filters.map((filter: FilterItem, index: number) => (
          <div key={filter.fieldId} className="field-item hierarchy">
            <span className="field-item-icon">⊡</span>
            <span className="field-item-name">{filter.fieldName}</span>
            <button className="field-item-remove" onClick={() => onRemove(index)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const DropZonePanel: React.FC<DropZoneProps> = ({
  title,
  zone,
  items,
  isMeasureZone,
  onDrop,
  onRemove,
  onReorder,
  draggedField,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      onDrop(zone, index);
    },
    [zone, onDrop]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const canAcceptDrop = () => {
    if (!draggedField) return false;
    if (zone === "values") return draggedField.isMeasure;
    return !draggedField.isMeasure;
  };

  return (
    <div className="field-zone">
      <div className="field-zone-header">
        <span className="field-zone-title">{title}</span>
        <span className="field-zone-count">{items.length}</span>
      </div>
      <div
        className={`field-zone-content ${canAcceptDrop() ? "can-drop" : ""} ${
          dragOverIndex !== null ? "drag-over" : ""
        }`}
        onDragOver={(e) => handleDragOver(e, items.length)}
        onDrop={(e) => handleDrop(e, items.length)}
        onDragLeave={handleDragLeave}
      >
        {items.length === 0 && (
          <div className="field-zone-empty">
            {canAcceptDrop()
              ? `Drop ${isMeasureZone ? "measure" : "field"} here`
              : `Drag ${isMeasureZone ? "measures" : "hierarchy fields"} here`}
          </div>
        )}
        {items.map((item: HierarchyLevel | Field, index: number) => {
          const isHierarchy = "fieldId" in item;
          const displayName = isHierarchy
            ? (item as HierarchyLevel).displayName
            : (item as Field).displayName;
          const isMeasure = !isHierarchy && (item as Field).isMeasure;

          return (
            <div
              key={isHierarchy ? (item as HierarchyLevel).fieldId : (item as Field).id}
              className={`field-item ${isMeasure ? "measure" : "hierarchy"} ${
                dragOverIndex === index ? "drop-target" : ""
              }`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ item, zone, index })
                );
              }}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => {
                e.stopPropagation();
                const data = e.dataTransfer.getData("application/json");
                if (data) {
                  const parsed = JSON.parse(data);
                  if (parsed.zone === zone) {
                    onReorder(parsed.index, index);
                  }
                }
                handleDrop(e, index);
              }}
              onDragLeave={handleDragLeave}
            >
              <span className="field-item-icon">
                {isMeasure ? "∑" : isHierarchy ? "⊟" : "⊡"}
              </span>
              <span className="field-item-name">{displayName}</span>
              {isHierarchy && (
                <span className="field-item-level">
                  L{((item as HierarchyLevel).level || 0) + 1}
                </span>
              )}
              <button
                className="field-item-remove"
                onClick={() => onRemove(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FieldListPanel: React.FC<FieldListPanelProps> = ({
  availableFields,
  placement,
  onFieldAdd,
  onFieldRemove,
  onFieldReorder,
  onFieldMove,
  onClose,
}) => {
  const [draggedField, setDraggedField] = useState<Field | null>(null);
  const [dragSource, setDragSource] = useState<DropZone | null>(null);

  const handleDragStart = useCallback((field: Field, source: DropZone | null) => {
    setDraggedField(field);
    setDragSource(source);
  }, []);

  const handleDrop = useCallback(
    (zone: DropZone, index: number) => {
      if (!draggedField) return;

      if (dragSource && dragSource !== zone) {
        const sourceIndex = getFieldIndex(dragSource, draggedField.id, placement);
        if (sourceIndex !== -1) {
          onFieldMove(draggedField, dragSource, sourceIndex, zone, index);
        }
      } else if (!dragSource) {
        onFieldAdd(draggedField, zone, index);
      }

      setDraggedField(null);
      setDragSource(null);
    },
    [draggedField, dragSource, placement, onFieldAdd, onFieldMove]
  );

  const getFieldIndex = (zone: DropZone, fieldId: string, placement: FieldPlacement): number => {
    switch (zone) {
      case "rows":
        return placement.rowHierarchies.findIndex((h: HierarchyLevel) => h.fieldId === fieldId);
      case "columns":
        return placement.columnHierarchies.findIndex((h: HierarchyLevel) => h.fieldId === fieldId);
      case "values":
        return placement.measures.findIndex((m: Field) => m.id === fieldId);
      case "filters":
        return placement.filters.findIndex((f: FilterItem) => f.fieldId === fieldId);
      default:
        return -1;
    }
  };

  const hierarchyFields = availableFields.filter((f: Field) => !f.isMeasure && f.isHierarchy);
  const measureFields = availableFields.filter((f: Field) => f.isMeasure);

  return (
    <div className="field-list-panel">
      <div className="field-list-header">
        <h3>Field List</h3>
        {onClose && (
          <button className="field-list-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="field-list-content">
        <div className="field-list-section">
          <h4>Available Fields</h4>
          <div className="field-list-available">
            <div className="field-category">
              <span className="field-category-title">Hierarchies</span>
              {hierarchyFields.length === 0 && (
                <span className="field-category-empty">No hierarchy fields</span>
              )}
              {hierarchyFields.map((field: Field) => (
                <div
                  key={field.id}
                  className="field-available-item"
                  draggable
                  onDragStart={() => handleDragStart(field, null)}
                >
                  <span className="field-icon">⊟</span>
                  <span>{field.displayName}</span>
                </div>
              ))}
            </div>

            <div className="field-category">
              <span className="field-category-title">Measures</span>
              {measureFields.length === 0 && (
                <span className="field-category-empty">No measures</span>
              )}
              {measureFields.map((field: Field) => (
                <div
                  key={field.id}
                  className="field-available-item measure"
                  draggable
                  onDragStart={() => handleDragStart(field, null)}
                >
                  <span className="field-icon">∑</span>
                  <span>{field.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="field-zones">
          <FilterZone
            title="Filters"
            filters={placement.filters}
            draggedField={draggedField}
            onDrop={(index: number) => handleDrop("filters", index)}
            onRemove={(index: number) => onFieldRemove(placement.filters[index].fieldId, "filters", index)}
          />

          <DropZonePanel
            title="Columns"
            zone="columns"
            items={placement.columnHierarchies}
            draggedField={draggedField}
            onDrop={handleDrop}
            onRemove={(index: number) =>
              onFieldRemove(placement.columnHierarchies[index].fieldId, "columns", index)
            }
            onReorder={(from: number, to: number) => onFieldReorder("columns", from, to)}
          />

          <DropZonePanel
            title="Rows"
            zone="rows"
            items={placement.rowHierarchies}
            draggedField={draggedField}
            onDrop={handleDrop}
            onRemove={(index: number) =>
              onFieldRemove(placement.rowHierarchies[index].fieldId, "rows", index)
            }
            onReorder={(from: number, to: number) => onFieldReorder("rows", from, to)}
          />

          <DropZonePanel
            title="Values"
            zone="values"
            items={placement.measures}
            isMeasureZone
            draggedField={draggedField}
            onDrop={handleDrop}
            onRemove={(index: number) => onFieldRemove(placement.measures[index].id, "values", index)}
            onReorder={(from: number, to: number) => onFieldReorder("values", from, to)}
          />
        </div>
      </div>

      <div className="field-list-actions">
        <button className="action-btn reset" onClick={() => window.location.reload()}>
          Reset Layout
        </button>
        <button className="action-btn apply">Apply Changes</button>
      </div>
    </div>
  );
};

export default FieldListPanel;
