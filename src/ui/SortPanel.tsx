import React, { useState } from "react";
import { MeasureInfo } from "../model/pivot";
import { VisualSettings } from "../settings/settings";
import { Button, EmptyNote, IconButton, Overlay, Segmented } from "./overlayKit";
import { IconArrowDown, IconArrowUp, IconPlus, IconSort, IconTrash } from "./icons";

export interface SortRule {
  measureIndex: number;
  direction: "asc" | "desc";
  priority: number;
}

interface SortPanelProps {
  measures: MeasureInfo[];
  settings: VisualSettings;
  onClose: () => void;
  onApply: (rules: SortRule[]) => void;
}

export const SortPanel: React.FC<SortPanelProps> = ({ measures, settings, onClose, onApply }) => {
  const initialRules: SortRule[] = (() => {
    try {
      const parsed = JSON.parse(settings.manualData.sortRules || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const [rules, setRules] = useState<SortRule[]>(initialRules);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      { measureIndex: 0, direction: "asc", priority: prev.length },
    ]);
  };

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, priority: i })));
  };

  const updateRule = (idx: number, patch: Partial<SortRule>) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const movePriority = (idx: number, dir: -1 | 1) => {
    const next = [...rules];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setRules(next.map((r, i) => ({ ...r, priority: i })));
  };

  const measureOptions = measures.length > 0
    ? measures.map((m, mi) => <option key={mi} value={mi}>{m.name}</option>)
    : <option value={0}>No measures</option>;

  return (
    <Overlay
      title="Sort"
      subtitle="Rows follow the first rule; each later rule breaks ties."
      width={520}
      onClose={onClose}
      footerStart={rules.length > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => setRules([])}>Clear all</Button>
      ) : null}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onApply(rules)}>Apply</Button>
        </>
      }
    >
      {rules.length === 0 ? (
        <EmptyNote
          icon={<IconSort size={20} />}
          title="No sort rules"
          hint="The matrix keeps its source order until you add a rule."
          action={<Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={addRule} disabled={measures.length === 0}>Add rule</Button>}
        />
      ) : (
        <div className="mx-stack is-tight">
          <ol className="mx-list">
            {rules.map((rule, idx) => (
              <li key={idx} className="mx-item">
                <span className="mx-item-index">{idx + 1}</span>
                <select
                  className="mx-select is-sm"
                  style={{ flex: 1 }}
                  aria-label={`Rule ${idx + 1} measure`}
                  value={rule.measureIndex}
                  onChange={(e) => updateRule(idx, { measureIndex: parseInt(e.target.value, 10) })}
                >
                  {measureOptions}
                </select>
                <Segmented
                  size="sm"
                  ariaLabel={`Rule ${idx + 1} direction`}
                  value={rule.direction}
                  onChange={(direction) => updateRule(idx, { direction })}
                  options={[
                    { value: "asc", label: "Low → high", title: "Ascending" },
                    { value: "desc", label: "High → low", title: "Descending" },
                  ]}
                />
                <div className="mx-item-actions">
                  <IconButton label="Move up" icon={<IconArrowUp size={14} />} onClick={() => movePriority(idx, -1)} disabled={idx === 0} />
                  <IconButton label="Move down" icon={<IconArrowDown size={14} />} onClick={() => movePriority(idx, 1)} disabled={idx === rules.length - 1} />
                  <IconButton label="Remove rule" tone="danger" icon={<IconTrash size={14} />} onClick={() => removeRule(idx)} />
                </div>
              </li>
            ))}
          </ol>
          <div>
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={addRule}>Add rule</Button>
          </div>
        </div>
      )}
    </Overlay>
  );
};
