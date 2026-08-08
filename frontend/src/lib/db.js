import { Dexie } from "dexie";

export const db = new Dexie("NotesDatabase");
db.version(1).stores({
  notes: "++id, user_id, title, content, synced, last_modified, created_at, is_deleted", // Primary key and indexed props
});

db.version(2).stores({
  notes: "++id, userId, title, content, synced, last_modified, created_at, is_deleted", // Changed user_id to userId
}).upgrade(tx => {
  return tx.table('notes').toCollection().modify(note => {
    note.userId = note.user_id;
    delete note.user_id;
  });
});

db.version(3).stores({
  notes: "id, userId, synced, last_modified, is_deleted",
});

db.version(4).stores({
  notes: "id, title, folder_id, created_at, updated_at, user_id, is_dirty, is_deleted, version",
  syncOutbox: "++id, note_id, action, timestamp, status",
});