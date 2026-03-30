import React, { useState, useMemo } from 'react';
import { VisualSettings } from '../settings/settings';

export interface TotalsControlPanelProps {
  settings: VisualSettings;
  rowLevels: string[];
  columnLevels: string[];
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

export const TotalsControlPanel: React.FC<TotalsControlPanelProps> = ({
  settings,
  rowLevels,
  columnLevels,
  onClose,
  onPersistProperty
}) => {
  const [activeTab, setActiveTab] = useState<"rows" | "columns">("rows");

  const hiddenRowLevels = useMemo(() => {
    try {
      return JSON.parse(settings.totals.rowSubtotalLevels || "[]") as string[];
    } catch {
      return [];
    }
  }, [settings.totals.rowSubtotalLevels]);

  const hiddenColLevels = useMemo(() => {
    try {
      return JSON.parse(settings.totals.colSubtotalLevels || "[]") as string[];
    } catch {
      return [];
    }
  }, [settings.totals.colSubtotalLevels]);

  const toggleRowLevel = (levelIndex: number) => {
    const levelStr = String(levelIndex);
    const newHidden = hiddenRowLevels.includes(levelStr)
      ? hiddenRowLevels.filter(l => l !== levelStr)
      : [...hiddenRowLevels, levelStr];
    onPersistProperty("totals", "rowSubtotalLevels", JSON.stringify(newHidden));
  };

  const toggleColLevel = (levelIndex: number) => {
    const levelStr = String(levelIndex);
    const newHidden = hiddenColLevels.includes(levelStr)
      ? hiddenColLevels.filter(l => l !== levelStr)
      : [...hiddenColLevels, levelStr];
    onPersistProperty("totals", "colSubtotalLevels", JSON.stringify(newHidden));
  };

  return (
    <div className="wizard-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="wizard-modal" style={{ width: 500, background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, borderBottom: '1px solid #eee', paddingBottom: 8 }}>Totals & Subtotals Configuration</h2>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            style={{
              padding: '6px 12px', border: 'none', background: activeTab === 'rows' ? '#0071e3' : '#f0f0f0',
              color: activeTab === 'rows' ? '#fff' : '#333', borderRadius: 4, cursor: 'pointer'
            }}
            onClick={() => setActiveTab('rows')}
          >
            Row Subtotals
          </button>
          <button
            style={{
              padding: '6px 12px', border: 'none', background: activeTab === 'columns' ? '#0071e3' : '#f0f0f0',
              color: activeTab === 'columns' ? '#fff' : '#333', borderRadius: 4, cursor: 'pointer'
            }}
            onClick={() => setActiveTab('columns')}
          >
            Column Subtotals
          </button>
        </div>

        <div style={{ minHeight: 200 }}>
          {activeTab === "rows" ? (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={settings.totals.showRowSubtotals}
                  onChange={() => onPersistProperty("totals", "showRowSubtotals", !settings.totals.showRowSubtotals)}
                />
                <span style={{ fontWeight: 'bold' }}>Enable Row Subtotals Globally</span>
              </label>

              {settings.totals.showRowSubtotals && (
                <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Configure visibility per hierarchy level:</div>
                  {rowLevels.map((levelName, idx) => (
                    <label key={`row-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!hiddenRowLevels.includes(String(idx))}
                        onChange={() => toggleRowLevel(idx)}
                      />
                      <span>Level {idx + 1}: <strong>{levelName}</strong></span>
                    </label>
                  ))}
                  {rowLevels.length === 0 && <div style={{ color: '#999', fontStyle: 'italic' }}>No row hierarchies found.</div>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={settings.totals.showColumnSubtotals}
                  onChange={() => onPersistProperty("totals", "showColumnSubtotals", !settings.totals.showColumnSubtotals)}
                />
                <span style={{ fontWeight: 'bold' }}>Enable Column Subtotals Globally</span>
              </label>

              {settings.totals.showColumnSubtotals && (
                <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Configure visibility per hierarchy level:</div>
                  {columnLevels.map((levelName, idx) => (
                    <label key={`col-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!hiddenColLevels.includes(String(idx))}
                        onChange={() => toggleColLevel(idx)}
                      />
                      <span>Level {idx + 1}: <strong>{levelName}</strong></span>
                    </label>
                  ))}
                  {columnLevels.length === 0 && <div style={{ color: '#999', fontStyle: 'italic' }}>No column hierarchies found.</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
