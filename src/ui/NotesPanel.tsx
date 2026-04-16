import React, { useState } from "react";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";

interface NoteEntry {
  rowKey: string;
  text: string;
}

interface NotesPanelProps {
  settings: VisualSettings;
  rows: FlattenedNode[];
  onClose: () => void;
  onPersistProperty: (obj: string, prop: string, val: unknown) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ settings, rows, onClose, onPersistProperty }) => {
  const parseNotes = (): Record<string, string> => {
    try {
      const parsed = JSON.parse(settings.manualData.notes || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const [notes, setNotes] = useState<Record<string, string>>(parseNotes);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const noteEntries: NoteEntry[] = Object.entries(notes).map(([rowKey, text]) => ({ rowKey, text }));

  const getRowLabel = (key: string): string => {
    const row = rows.find(r => r.key === key);
    return row?.label || key;
  };

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditText(notes[key] || "");
  };

  const saveEdit = () => {
    if (editingKey === null) return;
    const updated = { ...notes, [editingKey]: editText };
    setNotes(updated);
    onPersistProperty("manualData", "notes", JSON.stringify(updated));
    setEditingKey(null);
    setEditText("");
  };

  const deleteNote = (key: string) => {
    const updated = { ...notes };
    delete updated[key];
    setNotes(updated);
    onPersistProperty("manualData", "notes", JSON.stringify(updated));
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const panel: React.CSSProperties = {
    background: "#ffffff", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
  };
  const noteRow: React.CSSProperties = {
    padding: "10px 14px", borderBottom: "1px solid #f3f4f6",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Notes</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>View and manage all cell notes</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {noteEntries.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "32px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📝</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#6b7280" }}>No notes yet</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Add notes by right-clicking cells in the matrix.</div>
            </div>
          ) : (
            noteEntries.map(({ rowKey, text }) => (
              <div key={rowKey} style={noteRow}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 3 }}>
                      {getRowLabel(rowKey)}
                    </div>
                    {editingKey === rowKey ? (
                      <textarea
                        style={{
                          width: "100%", border: "1px solid #2563eb", borderRadius: 4,
                          padding: "6px 8px", fontSize: 12, resize: "vertical",
                          outline: "none", boxSizing: "border-box", minHeight: 60,
                        }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{text}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, paddingTop: 2 }}>
                    {editingKey === rowKey ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{ padding: "3px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          style={{ padding: "3px 8px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(rowKey)}
                          style={{ padding: "3px 8px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                          title="Edit note"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(rowKey)}
                          style={{ padding: "3px 7px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                          title="Delete note"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{noteEntries.length} note{noteEntries.length !== 1 ? "s" : ""}</span>
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
