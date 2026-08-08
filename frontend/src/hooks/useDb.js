import { db } from '../lib/db.js';

export async function createNote(
  id,
  userId,
  title,
  content,
  created_at,
  last_modified
) {
  if (!userId) {
    throw new Error("createNote called without userId");
  }

  try {
    await db.transaction('rw', db.notes, db.syncOutbox, async () => {
      await db.notes.add({
        id,
        user_id: String(userId), // align with new schema
        title,
        content,
        created_at,
        updated_at: last_modified,
        is_deleted: 0,
        is_dirty: 1,
        version: 1,
      });
      await db.syncOutbox.add({
        note_id: id,
        action: 'create',
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
    });
  } catch (error) {
    console.error("Failed to add note:", error);
  }
}

export async function deleteNote(id) {
  try {
    await db.transaction('rw', db.notes, db.syncOutbox, async () => {
      const note = await db.notes.get(id);
      if (note) {
        await db.notes.update(id, { is_deleted: 1, is_dirty: 1 });
        await db.syncOutbox.add({
          note_id: id,
          action: 'delete',
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      }
    });
  } catch (error) {
    console.error("Failed to delete note: ", error);
  }
}

function normalizeUserId(userId) {
  if (!userId) return null;
  if (typeof userId === "string") return userId;
  if (typeof userId === "number") return String(userId);
  if (typeof userId === "object" && userId.id) return String(userId.id);
  if (typeof userId === "object" && userId.uid) return String(userId.uid);
  return null;
}

export async function getUserNotes(rawuserId) {
  const userId = normalizeUserId(rawuserId);

  if (!userId) {
    return [];
  }

  try {
    return await db.notes
      .where("user_id")
      .equals(userId)
      .filter(note => !note.is_deleted)
      .toArray();
  } catch (error) {
    // fallback for old schema
    try {
      return await db.notes
        .where("userId")
        .equals(userId)
        .filter(note => !note.is_deleted)
        .toArray();
    } catch (e) {
      console.error("Failed to get user notes:", e);
      return [];
    }
  }
}

export async function getNote(id) {
  try {
    const note = await db.notes.get(id);
    return note && !note.is_deleted ? note : null;
  } catch (error) {
    console.error("Failed to get note: ", error);
    return null;
  }
}

export async function updateNote(id, updatedFields) {
  try {
    await db.transaction('rw', db.notes, db.syncOutbox, async () => {
      const note = await db.notes.get(id);
      if (note) {
        await db.notes.update(id, {
          ...updatedFields,
          is_dirty: 1,
          version: note.version ? note.version + 1 : 1,
          updated_at: updatedFields.updated_at || new Date().toISOString()
        });
        await db.syncOutbox.add({
          note_id: id,
          action: 'update',
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      }
    });
  } catch (error) {
    console.error("Failed to update note: ", error);
  }
}