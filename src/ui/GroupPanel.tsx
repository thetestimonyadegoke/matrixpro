import React, { useState } from "react";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";

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

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 600, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Group Rows</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Select rows and create a named group</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left — row selector */}
          <div style={{ flex: 1, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>
              SELECT ROWS ({selectedKeys.size} selected)
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
              {rows.length === 0 && (
                <div style={{ textAlign: "center", color: "#9ca3af", padding: 16, fontSize: 12 }}>No row data available.</div>
              )}
              {rows.map((row) => (
                <label
                  key={row.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
                    cursor: "pointer", background: selectedKeys.has(row.key) ? "#eff6ff" : "transparent",
                    borderLeft: selectedKeys.has(row.key) ? "3px solid #2563eb" : "3px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(row.key)}
                    onChange={() => toggleRow(row.key)}
                  />
                  <span style={{ paddingLeft: row.indent * 10, fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.label || row.key}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb" }}>
              <input
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createGroup(); }}
              />
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || selectedKeys.size === 0}
                style={{
                  width: "100%", marginTop: 6, padding: "7px", background: "#2563eb", color: "#fff",
                  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  opacity: (!groupName.trim() || selectedKeys.size === 0) ? 0.5 : 1,
                }}
              >
                Create Group
              </button>
            </div>
          </div>

          {/* Right — existing groups */}
          <div style={{ width: 220, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 14px", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>
              EXISTING GROUPS
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
              {groups.length === 0 && (
                <div style={{ textAlign: "center", color: "#9ca3af", padding: 16, fontSize: 12 }}>No groups yet.</div>
              )}
              {groups.map((g) => (
                <div key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "7px 14px", gap: 6 }}>
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6b7280", padding: 0 }}
                    >
                      {expandedGroup === g.id ? "▼" : "▶"}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151" }}>{g.label}</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{g.rowKeys.length}</span>
                    <button
                      onClick={() => removeGroup(g.id)}
                      style={{ padding: "1px 6px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                  {expandedGroup === g.id && (
                    <div style={{ paddingLeft: 28, paddingBottom: 6 }}>
                      {g.rowKeys.map((k, i) => (
                        <div key={i} style={{ fontSize: 11, color: "#6b7280", padding: "1px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {rows.find(r => r.key === k)?.label || k}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
