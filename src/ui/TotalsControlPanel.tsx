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
  const [activeTab, setActiveTab] = useState<"rows" | "columns" | "styling">("rows");

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
          <button
            style={{
              padding: '6px 12px', border: 'none', background: activeTab === 'styling' ? '#0071e3' : '#f0f0f0',
              color: activeTab === 'styling' ? '#fff' : '#333', borderRadius: 4, cursor: 'pointer'
            }}
            onClick={() => setActiveTab('styling')}
          >
            Structural Styling
          </button>
        </div>

        <div style={{ minHeight: 280, maxHeight: 400, overflowY: 'auto' }}>
          {activeTab === "rows" ? (
            <div>
              {/* Row Subtotals content ... */}
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
                </div>
              )}
            </div>
          ) : activeTab === "columns" ? (
            <div>
              {/* Column Subtotals content ... */}
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
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* GRAND TOTALS */}
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 13, color: '#0071e3' }}>Grand Totals</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={settings.totals.grandTotalBold} onChange={(e) => onPersistProperty("totals", "grandTotalBold", e.target.checked)} />
                    Bold
                  </label>
                  <div />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Text Color</span>
                    <input type="color" value={settings.totals.grandTotalTextColor} onChange={(e) => onPersistProperty("totals", "grandTotalTextColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Background</span>
                    <input type="color" value={settings.totals.grandTotalBackgroundColor} onChange={(e) => onPersistProperty("totals", "grandTotalBackgroundColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                </div>
              </div>

              {/* SUBTOTALS */}
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 13, color: '#0071e3' }}>Subtotals</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={settings.totals.subtotalBold} onChange={(e) => onPersistProperty("totals", "subtotalBold", e.target.checked)} />
                    Bold
                  </label>
                  <div />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Text Color</span>
                    <input type="color" value={settings.totals.subtotalTextColor} onChange={(e) => onPersistProperty("totals", "subtotalTextColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Background</span>
                    <input type="color" value={settings.totals.subtotalBackgroundColor} onChange={(e) => onPersistProperty("totals", "subtotalBackgroundColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                </div>
              </div>

              {/* ROW HEADERS */}
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 13, color: '#0071e3' }}>Row Headers</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={settings.headers.rowHeaderParentBold} onChange={(e) => onPersistProperty("headers", "rowHeaderParentBold", e.target.checked)} />
                    Parent Bold
                  </label>
                  <div />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Parent Color</span>
                    <input type="color" value={settings.headers.rowHeaderParentColor} onChange={(e) => onPersistProperty("headers", "rowHeaderParentColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>Child Color</span>
                    <input type="color" value={settings.headers.rowHeaderChildColor} onChange={(e) => onPersistProperty("headers", "rowHeaderChildColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                </div>
              </div>

              {/* COLUMN HEADERS */}
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 13, color: '#0071e3' }}>Column Headers</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#666' }}>L0 Color</span>
                    <input type="color" value={settings.headers.colHeaderLevel0Color} onChange={(e) => onPersistProperty("headers", "colHeaderLevel0Color", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#666' }}>L1 Color</span>
                    <input type="color" value={settings.headers.colHeaderLevel1Color} onChange={(e) => onPersistProperty("headers", "colHeaderLevel1Color", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#666' }}>Measure Color</span>
                    <input type="color" value={settings.headers.colHeaderLeafColor} onChange={(e) => onPersistProperty("headers", "colHeaderLeafColor", e.target.value)} style={{ width: '100%', height: 26, padding: 0, border: '1px solid #ddd' }} />
                  </div>
                </div>
              </div>
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
