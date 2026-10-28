import React, { useState } from "react";
import { FlattenedNode } from "../model/tree";
import { VisualSettings } from "../settings/settings";
import { Button, EmptyNote, IconButton, Overlay } from "./overlayKit";
import { IconNote, IconTrash } from "./icons";

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

  return (
    <Overlay
      kind="sheet"
      title="Notes"
      subtitle={<span className="mx-num">{noteEntries.length} note{noteEntries.length !== 1 ? "s" : ""}</span>}
      width={420}
      onClose={onClose}
    >
      {noteEntries.length === 0 ? (
        <EmptyNote
          icon={<IconNote size={20} />}
          title="No notes yet"
          hint="Add notes by right-clicking cells in the matrix."
        />
      ) : (
        <ul className="mx-list">
          {noteEntries.map(({ rowKey, text }) => {
            const editing = editingKey === rowKey;
            return (
              <li key={rowKey} className="mx-item" style={{ alignItems: "flex-start" }}>
                <div className="mx-item-main" style={{ gap: 4, paddingTop: 2 }}>
                  <span className="mx-item-title">{getRowLabel(rowKey)}</span>
                  {editing ? (
                    <textarea
                      className="mx-textarea"
                      aria-label={`Note for ${getRowLabel(rowKey)}`}
                      style={{ minHeight: 60 }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        // Escape cancels the edit instead of closing the sheet.
                        if (e.key === "Escape") { e.preventDefault(); setEditingKey(null); }
                      }}
                      autoFocus
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--mx-text-secondary)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{text}</p>
                  )}
                  {editing && (
                    <div className="mx-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>Cancel</Button>
                      <Button size="sm" variant="primary" onClick={saveEdit}>Save</Button>
                    </div>
                  )}
                </div>
                {!editing && (
                  <div className="mx-item-actions">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(rowKey)}>Edit</Button>
                    <IconButton label="Delete note" tone="danger" icon={<IconTrash size={14} />} onClick={() => deleteNote(rowKey)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Overlay>
  );
};
