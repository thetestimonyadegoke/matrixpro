import React, { useState, useMemo } from 'react';
import { FlattenedNode } from '../model/tree';
import { MeasureInfo } from '../model/pivot';
import { VisualSettings } from '../settings/settings';

export interface ManageColumnsPanelProps {
  columns: FlattenedNode[];
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
  onOpenCalcMeasureWizard?: () => void;
}

export const ManageColumnsPanel: React.FC<ManageColumnsPanelProps> = ({
  columns,
  measures,
  settings,
  onClose,
  onPersistProperty,
  onOpenCalcMeasureWizard
}) => {
  const [activeTab, setActiveTab] = useState<"columns" | "measures">("measures");

  const colOrder = useMemo(() => {
    try {
      return JSON.parse(settings.manualData.colOrder || "[]") as string[];
    } catch {
      return [];
    }
  }, [settings.manualData.colOrder]);

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedItem) {
      setDragOverItem(id);
    }
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      // Create comprehensive list of keys for the current context
      let currentOrder: string[] = [...colOrder];

      const allKeys = activeTab === "measures"
         ? measures.map(m => `m_${m.index}`)
         : columns.filter(c => c.isLeaf || c.isSubtotal).map(c => c.key);

      if (currentOrder.length === 0) {
         currentOrder = allKeys;
      } else {
         // Ensure all keys are in order array
         for (const key of allKeys) {
            if (!currentOrder.includes(key)) currentOrder.push(key);
         }
      }

      const draggedIdx = currentOrder.indexOf(draggedItem);
      const dropIdx = currentOrder.indexOf(dragOverItem);

      if (draggedIdx > -1 && dropIdx > -1) {
        currentOrder.splice(draggedIdx, 1);
        currentOrder.splice(dropIdx, 0, draggedItem);
        onPersistProperty("manualData", "colOrder", JSON.stringify(currentOrder));
      }
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="wizard-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="wizard-modal" style={{ width: 600, height: 500, display: 'flex', background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden' }}>

        {/* Left Sidebar */}
        <div style={{ width: 200, background: '#f8f9fa', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', fontWeight: 'bold' }}>Manage</div>
          <div
             style={{ padding: '12px 16px', cursor: 'pointer', background: activeTab === 'measures' ? '#e6f2ff' : 'transparent', borderLeft: activeTab === 'measures' ? '3px solid #0071e3' : '3px solid transparent' }}
             onClick={() => setActiveTab('measures')}
          >
            Measures
          </div>
          <div
             style={{ padding: '12px 16px', cursor: 'pointer', background: activeTab === 'columns' ? '#e6f2ff' : 'transparent', borderLeft: activeTab === 'columns' ? '3px solid #0071e3' : '3px solid transparent' }}
             onClick={() => setActiveTab('columns')}
          >
            Columns
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {activeTab === 'measures' ? 'Manage Measures' : 'Manage Columns'}
            </h2>
            {activeTab === 'measures' && onOpenCalcMeasureWizard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCalcMeasureWizard();
                }}
                style={{ padding: '6px 12px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
              >
                + Add Measure
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Drag and drop items to reorder them in the matrix view.
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
            {activeTab === 'measures' ? (
              <div>
                {measures.map((measure, idx) => {
                  const id = `m_${measure.index}`;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, id)}
                      onDragOver={(e) => handleDragOver(e, id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #eee',
                        background: dragOverItem === id ? '#f0f7ff' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'grab'
                      }}
                    >
                      <span style={{ marginRight: 12, color: '#aaa' }}>☰</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{measure.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Format: {measure.format || "General"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {columns.filter(c => c.isLeaf || c.isSubtotal).map((col) => {
                  const id = col.key;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, id)}
                      onDragOver={(e) => handleDragOver(e, id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #eee',
                        background: dragOverItem === id ? '#f0f7ff' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'grab'
                      }}
                    >
                      <span style={{ marginRight: 12, color: '#aaa' }}>☰</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{col.label || "(Empty)"}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Level {col.level}</div>
                      </div>
                    </div>
                  );
                })}
                {columns.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No columns defined in the visual.</div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
