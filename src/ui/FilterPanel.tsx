import React, { useState, useMemo } from "react";
import { MeasureInfo } from "../model/pivot";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";
import { secureRandomId } from "../model/keys";
import { Button, EmptyNote, IconButton, Overlay } from "./overlayKit";
import { IconFilter, IconPlus, IconTrash } from "./icons";

export interface FilterRule {
  id: string;
  measureIndex: number;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "between";
  value: number;
  value2?: number;
}

interface FilterPanelProps {
  settings: VisualSettings;
  measures: MeasureInfo[];
  rows: FlattenedNode[];
  onClose: () => void;
  onApply: (rules: FilterRule[]) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ settings, measures, onClose, onApply }) => {
  const initial = useMemo(() => {
    try {
      const parsed = JSON.parse(settings.manualData.filterRules || "[]");
      return Array.isArray(parsed) ? parsed as FilterRule[] : [];
    } catch { return []; }
  }, [settings.manualData.filterRules]);

  const [rules, setRules] = useState<FilterRule[]>(initial);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: `r_${Date.now()}_${secureRandomId(5)}`,
        measureIndex: 0,
        operator: "gt",
        value: 0,
      },
    ]);
  };

  const removeRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  return (
    <Overlay
      title="Value filters"
      subtitle="Hide rows whose measure values don't meet every rule."
      width={560}
      onClose={onClose}
      footerStart={
        <Button variant="ghost" size="sm" onClick={() => { setRules([]); onApply([]); onClose(); }}>Clear all</Button>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onApply(rules); onClose(); }}>Apply</Button>
        </>
      }
    >
      {rules.length === 0 ? (
        <EmptyNote
          icon={<IconFilter size={20} />}
          title="No filter rules"
          hint="All rows are shown until you add a rule."
          action={<Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={addRule}>Add filter</Button>}
        />
      ) : (
        <div className="mx-stack is-tight">
          <ul className="mx-list">
            {rules.map((rule, idx) => (
              <li key={rule.id} className="mx-item">
                <select
                  className="mx-select is-sm"
                  style={{ flex: 1, minWidth: 0 }}
                  aria-label={`Filter ${idx + 1} measure`}
                  value={rule.measureIndex}
                  onChange={(e) => updateRule(rule.id, { measureIndex: parseInt(e.target.value, 10) })}
                >
                  {measures.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
                  {measures.length === 0 && <option value={0}>No measures</option>}
                </select>
                <select
                  className="mx-select is-sm"
                  style={{ width: 96 }}
                  aria-label={`Filter ${idx + 1} condition`}
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterRule["operator"] })}
                >
                  <option value="gt">{">"}</option>
                  <option value="gte">{"≥"}</option>
                  <option value="lt">{"<"}</option>
                  <option value="lte">{"≤"}</option>
                  <option value="eq">{"="}</option>
                  <option value="neq">{"≠"}</option>
                  <option value="between">Between</option>
                </select>
                {rule.operator === "between" ? (
                  <div className="mx-row" style={{ flex: 1, gap: 4 }}>
                    <input
                      type="number"
                      className="mx-input is-sm is-num"
                      style={{ flex: 1, minWidth: 0 }}
                      aria-label={`Filter ${idx + 1} minimum`}
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      className="mx-input is-sm is-num"
                      style={{ flex: 1, minWidth: 0 }}
                      aria-label={`Filter ${idx + 1} maximum`}
                      value={rule.value2 ?? 0}
                      onChange={(e) => updateRule(rule.id, { value2: parseFloat(e.target.value) || 0 })}
                      placeholder="Max"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    className="mx-input is-sm is-num"
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label={`Filter ${idx + 1} value`}
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                  />
                )}
                <div className="mx-item-actions">
                  <IconButton label="Remove rule" tone="danger" icon={<IconTrash size={14} />} onClick={() => removeRule(rule.id)} />
                </div>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={addRule}>Add filter</Button>
          </div>
        </div>
      )}
    </Overlay>
  );
};
