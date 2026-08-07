import { db } from '../lib/db.js';
import { syncAllNotes } from '../lib/api.js';

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
    await db.notes.add({
      id,
      userId: String(userId), // always normalize
      title,
      content,
      synced: false,
      created_at,
      last_modified,
      is_deleted: false,
    });
  } catch (error) {
    console.error("Failed to add note:", error);
  }
}

export async function deleteNote(id) {
  try {
    await db.notes.delete(id);
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
      .where("userId")
      .equals(userId)
      .toArray();
  } catch (error) {
    console.error("Failed to get user notes:", error);
    return [];
  }
}

export async function getNote(id) {
  try {
    return await db.notes.get(id);
  } catch (error) {
    console.error("Failed to get note: ", error);
    return null;
  }
}

export async function updateNote(id, updatedFields) {
  try {
    await db.notes.update(id, updatedFields);
  } catch (error) {
    console.error("Failed to update note: ", error);
  }
}

export async function syncNotes() {
  try {
    const unsyncedNotes = await db.notes.filter(note => !note.synced).toArray();
    const lastSyncTimestamp = localStorage.getItem("last_sync_timestamp") || null;
    const payload = {
      notes: unsyncedNotes,
      last_sync_timestamp: lastSyncTimestamp,
    };

    const response = await syncAllNotes(payload);
    if (response) {
      for (const note of unsyncedNotes) {
        await db.notes.update(note.id, { synced: true });
      }
      const newSyncTimestamp = response.last_sync_timestamp || new Date().toISOString();
      localStorage.setItem("last_sync_timestamp", newSyncTimestamp);
    }
    return response;
  } catch (error) {
    console.error("Failed to sync notes:", error);
  }
}