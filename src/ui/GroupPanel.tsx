import React, { useState } from "react";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";
import { Button, IconButton, Overlay, Section } from "./overlayKit";
import { IconChevronDown, IconChevronRight, IconPlus, IconTrash } from "./icons";

interface RowGroup {
  id: string;
  label: string;
  rowKeys: string[];
}

interface GroupPanelProps {
  rows: FlattenedNode[];
  settings: VisualSettings;
  onClose: () => void;
  onPersistProperty: (obj: string, prop: string, val: unknown) => void;
}

export const GroupPanel: React.FC<GroupPanelProps> = ({ rows, settings, onClose, onPersistProperty }) => {
  const parseGroups = (): RowGroup[] => {
    try {
      const parsed = JSON.parse(settings.manualData.groupings || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [groups, setGroups] = useState<RowGroup[]>(parseGroups);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleRow = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const createGroup = () => {
    const trimmed = groupName.trim();
    if (!trimmed || selectedKeys.size === 0) return;
    const newGroup: RowGroup = {
      id: `grp_${Date.now()}`,
      label: trimmed,
      rowKeys: Array.from(selectedKeys),
    };
    const updated = [...groups, newGroup];
    setGroups(updated);
    setSelectedKeys(new Set());
    setGroupName("");
    onPersistProperty("manualData", "groupings", JSON.stringify(updated));
  };

  const removeGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    onPersistProperty("manualData", "groupings", JSON.stringify(updated));
  };

  const canCreate = !!groupName.trim() && selectedKeys.size > 0;

  return (
    <Overlay kind="sheet" title="Group rows" width={420} onClose={onClose}>
      <Section title="Groups">
        {groups.length === 0 ? (
          <p className="mx-muted" style={{ margin: 0, fontSize: 12 }}>No groups yet.</p>
        ) : (
          <ul className="mx-list">
            {groups.map((g) => {
              const expanded = expandedGroup === g.id;
              return (
                <li key={g.id} className="mx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                  <div className="mx-row">
                    <IconButton
                      label={expanded ? "Hide rows" : "Show rows"}
                      aria-expanded={expanded}
                      icon={expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      onClick={() => setExpandedGroup(expanded ? null : g.id)}
                    />
                    <div className="mx-item-main">
                      <span className="mx-item-title">{g.label}</span>
                    </div>
                    <span className="mx-badge mx-num">{g.rowKeys.length}</span>
                    <div className="mx-item-actions">
                      <IconButton label="Remove group" tone="danger" icon={<IconTrash size={14} />} onClick={() => removeGroup(g.id)} />
                    </div>
                  </div>
                  {expanded && (
                    <div className="mx-item-main" style={{ paddingLeft: 38, paddingBottom: 4 }}>
                      {g.rowKeys.map((k, i) => (
                        <span key={i} className="mx-item-meta">
                          {rows.find(r => r.key === k)?.label || k}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <hr className="mx-divider" />

      <Section title="New group" description={<span className="mx-num">{selectedKeys.size} rows selected</span>}>
        <div className="mx-row">
          <input
            className="mx-input"
            style={{ flex: 1 }}
            aria-label="Group name"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createGroup(); }}
          />
          <Button variant="primary" icon={<IconPlus size={14} />} onClick={createGroup} disabled={!canCreate}>
            Create
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="mx-muted" style={{ margin: 0, fontSize: 12 }}>No row data available.</p>
        ) : (
          <div
            role="group"
            aria-label="Rows"
            style={{
              maxHeight: 320,
              overflowY: "auto",
              padding: "4px 10px",
              border: "1px solid var(--mx-ov-line)",
              borderRadius: 8,
            }}
          >
            {rows.map((row) => (
              <label key={row.key} className="mx-check">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(row.key)}
                  onChange={() => toggleRow(row.key)}
                />
                <span style={{ paddingLeft: row.indent * 10, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.label || row.key}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>
    </Overlay>
  );
};
