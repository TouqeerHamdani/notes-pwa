import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import React from 'react';
import { Dexie } from 'dexie';
import { syncNote } from '../lib/api.js';

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
};

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
    console.log("getUserNotes called without userId");
    return [];
  }

  try {
    await db.notes.toArray();
    console.log("All notes in DB:", await db.notes.toArray());

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
      const notes = useLiveQuery( async () => {
        const notes = await db.notes
            .where("id")
            .equals(id)
            .toArray()

        return notes
        },
        [id]
    );
    } catch (error) {
        console.error("Failed to get note: ", error);
    }
};

export async function updateNote(id, updatedFields) {
  try {
      await db.notes.update(id, updatedFields);
    } catch (error) {
        console.error("Failed to update note: ", error);
    }
};

export async function notesList() {
  const notes = useLiveQuery(() => db.notes.toArray())

  return notes;
};

export async function syncNotes() {
  try {
    const notesToSync = await db.notes.toArray();
    console.log("Notes to sync:", notesToSync);

    for (const note of notesToSync) {
      const response = await syncNote(note);
      if (response && response.synced) {
        await db.notes.update(note.id, { synced: true });
      }
    }
  } catch (error) {
    console.error("Failed to sync notes:", error);
  }
}