import React, { useState } from 'react';
import { VisualSettings } from '../settings/settings';
import { MeasureInfo } from '../model/pivot';

export interface ConditionalFormattingPanelProps {
  settings: VisualSettings;
  measures: MeasureInfo[];
  onClose: () => void;
  onPersistProperty: (objectName: string, propertyName: string, value: any) => void;
}

export const ConditionalFormattingPanel: React.FC<ConditionalFormattingPanelProps> = ({
  settings,
  measures,
  onClose,
  onPersistProperty
}) => {
  const currentSettings = settings.conditionalFormatting;

  const [enabled, setEnabled] = useState(currentSettings.enabled);
  const [ruleType, setRuleType] = useState<"thresholds" | "bands">(currentSettings.ruleType);
  const [lowColor, setLowColor] = useState(currentSettings.lowColor);
  const [midColor, setMidColor] = useState(currentSettings.midColor);
  const [highColor, setHighColor] = useState(currentSettings.highColor);
  const [lowThreshold, setLowThreshold] = useState(currentSettings.lowThreshold);
  const [highThreshold, setHighThreshold] = useState(currentSettings.highThreshold);
  const [applyToAll, setApplyToAll] = useState(currentSettings.applyToAllMeasures);
  const [targetMeasure, setTargetMeasure] = useState(currentSettings.targetMeasure);

  const handleApply = () => {
    onPersistProperty("conditionalFormatting", "enabled", enabled);
    onPersistProperty("conditionalFormatting", "ruleType", ruleType);
    onPersistProperty("conditionalFormatting", "lowColor", lowColor);
    onPersistProperty("conditionalFormatting", "midColor", midColor);
    onPersistProperty("conditionalFormatting", "highColor", highColor);
    onPersistProperty("conditionalFormatting", "lowThreshold", lowThreshold);
    onPersistProperty("conditionalFormatting", "highThreshold", highThreshold);
    onPersistProperty("conditionalFormatting", "applyToAllMeasures", applyToAll);
    onPersistProperty("conditionalFormatting", "targetMeasure", targetMeasure);
    onClose();
  };

  return (
    <div className="wizard-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="wizard-modal" style={{ width: 450, background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, borderBottom: '1px solid #eee', paddingBottom: 8 }}>Conditional Formatting</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Enable Conditional Formatting
          </label>

          <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Rule Type</label>
              <select
                value={ruleType}
                onChange={e => setRuleType(e.target.value as "thresholds" | "bands")}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="thresholds">Thresholds (Gradients)</option>
                <option value="bands">Color Bands (Discrete)</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Apply To</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={applyToAll ? "all" : targetMeasure}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "all") {
                      setApplyToAll(true);
                    } else {
                      setApplyToAll(false);
                      setTargetMeasure(Number(val));
                    }
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                >
                  <option value="all">All Measures</option>
                  {measures.map(m => (
                    <option key={m.index} value={m.index}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Low Threshold (%)</label>
                <input
                  type="number"
                  value={lowThreshold}
                  onChange={e => setLowThreshold(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>High Threshold (%)</label>
                <input
                  type="number"
                  value={highThreshold}
                  onChange={e => setHighThreshold(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Low Color</label>
                <input type="color" value={lowColor} onChange={e => setLowColor(e.target.value)} style={{ width: '100%', height: 32, cursor: 'pointer', padding: 0, border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Mid Color</label>
                <input type="color" value={midColor} onChange={e => setMidColor(e.target.value)} style={{ width: '100%', height: 32, cursor: 'pointer', padding: 0, border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>High Color</label>
                <input type="color" value={highColor} onChange={e => setHighColor(e.target.value)} style={{ width: '100%', height: 32, cursor: 'pointer', padding: 0, border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ background: `linear-gradient(to right, ${lowColor} 0%, ${midColor} 50%, ${highColor} 100%)`, height: 20, borderRadius: 4, marginTop: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginTop: 4 }}>
              <span>Low ({lowThreshold}%)</span>
              <span>Mid</span>
              <span>High ({highThreshold}%)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{ padding: '8px 16px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
