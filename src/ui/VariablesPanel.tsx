import React, { useState } from "react";
import { VisualSettings } from "../settings/settings";
import { Button, EmptyNote, IconButton, Overlay } from "./overlayKit";
import { IconPlus, IconTrash, IconVariables } from "./icons";

interface Variable {
  id: string;
  name: string;
  value: number;
  description: string;
}

interface VariablesPanelProps {
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (obj: string, prop: string, val: unknown) => void;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({ settings, onClose, onPersistProperty }) => {
  const parseVars = (): Variable[] => {
    try {
      const parsed = JSON.parse(settings.manualData.variables || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [vars, setVars] = useState<Variable[]>(parseVars);

  const addVariable = () => {
    setVars(prev => [
      ...prev,
      { id: `var_${Date.now()}`, name: "New Variable", value: 0, description: "" },
    ]);
  };

  const updateVar = (idx: number, patch: Partial<Variable>) => {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v));
  };

  const removeVar = (idx: number) => {
    setVars(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onPersistProperty("manualData", "variables", JSON.stringify(vars));
    onClose();
  };

  const colLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500 };

  return (
    <Overlay
      title="Variables"
      subtitle="Named values you can use in formulas."
      width={580}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </>
      }
    >
      {vars.length === 0 ? (
        <EmptyNote
          icon={<IconVariables size={20} />}
          title="No variables yet"
          hint="Add a variable to reference it by name in formulas."
          action={<Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={addVariable}>Add variable</Button>}
        />
      ) : (
        <div className="mx-stack is-tight">
          <div className="mx-row mx-muted" style={{ padding: "0 7px 0 11px" }} aria-hidden="true">
            <span style={{ ...colLabel, flex: 2 }}>Name</span>
            <span style={{ ...colLabel, flex: 1 }}>Value</span>
            <span style={{ ...colLabel, flex: 2 }}>Description</span>
            <span style={{ width: 28 }} />
          </div>
          <ul className="mx-list">
            {vars.map((v, idx) => (
              <li key={v.id} className="mx-item">
                <input
                  className="mx-input is-sm"
                  style={{ flex: 2, minWidth: 0 }}
                  aria-label={`Variable ${idx + 1} name`}
                  value={v.name}
                  onChange={(e) => updateVar(idx, { name: e.target.value })}
                  placeholder="Variable name"
                />
                <input
                  type="number"
                  className="mx-input is-sm is-num"
                  style={{ flex: 1, minWidth: 0 }}
                  aria-label={`Variable ${idx + 1} value`}
                  value={v.value}
                  onChange={(e) => updateVar(idx, { value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
                <input
                  className="mx-input is-sm"
                  style={{ flex: 2, minWidth: 0 }}
                  aria-label={`Variable ${idx + 1} description`}
                  value={v.description}
                  onChange={(e) => updateVar(idx, { description: e.target.value })}
                  placeholder="Optional"
                />
                <div className="mx-item-actions">
                  <IconButton label="Remove variable" tone="danger" icon={<IconTrash size={14} />} onClick={() => removeVar(idx)} />
                </div>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={addVariable}>Add variable</Button>
          </div>
        </div>
      )}
    </Overlay>
  );
};
