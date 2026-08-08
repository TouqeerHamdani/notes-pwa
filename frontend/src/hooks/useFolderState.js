import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';

export function useFolderState() {
  const allNotes = useLiveQuery(() => db.notes.filter(n => !n.is_deleted).toArray()) || [];
  const trashNotes = useLiveQuery(() => db.notes.filter(n => n.is_deleted).toArray()) || [];

  const notesCount = allNotes.length;
  const pinnedCount = allNotes.filter(n => n.is_pinned || n.is_favorite).length;
  const trashCount = trashNotes.length;

  // Extract dynamic tags from notes
  const tagCounts = {};
  allNotes.forEach((n) => {
    if (Array.isArray(n.tags)) {
      n.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    }
  });

  const defaultFolders = [
    { id: 'work', label: 'Work', count: allNotes.filter(n => n.folder_id === 'work').length },
    { id: 'personal', label: 'Personal', count: allNotes.filter(n => n.folder_id === 'personal').length },
    { id: 'ideas', label: 'Ideas & Drafts', count: allNotes.filter(n => n.folder_id === 'ideas').length }
  ];

  // Placed for future folder CRUD and drag-and-drop state as per instructions
  const onDragStart = () => {};
  const onDrop = () => {};
  const addFolder = () => {};
  const deleteFolder = () => {};
  const updateFolder = () => {};

  return {
    notesCount,
    pinnedCount,
    trashCount,
    tagCounts,
    defaultFolders,
    onDragStart,
    onDrop,
    addFolder,
    deleteFolder,
    updateFolder
  };
}
