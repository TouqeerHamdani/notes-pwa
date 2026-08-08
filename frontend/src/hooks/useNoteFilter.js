import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';

export function useNoteFilter(selectedFolder, selectedTag) {
  const [searchTerm, setSearchTerm] = useState('');

  const rawNotes = useLiveQuery(async () => {
    let query = db.notes;
    if (selectedFolder === 'trash') {
      return await query.filter(n => Boolean(n.is_deleted)).toArray();
    }

    let notes = await query.filter(n => !n.is_deleted).toArray();

    if (selectedFolder === 'favorites') {
      notes = notes.filter(n => n.is_pinned || n.is_favorite);
    } else if (['work', 'personal', 'ideas'].includes(selectedFolder)) {
      notes = notes.filter(n => n.folder_id === selectedFolder);
    }

    if (selectedTag) {
      notes = notes.filter(n => Array.isArray(n.tags) && n.tags.includes(selectedTag));
    }

    return notes.sort((a, b) => {
      // Pinned notes stay at top
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      const dateA = new Date(a.last_modified || a.created_at || 0).getTime();
      const dateB = new Date(b.last_modified || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [selectedFolder, selectedTag]) || [];

  const filteredNotes = rawNotes.filter((note) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (note.title || '').toLowerCase().includes(term) ||
      (note.content || '').toLowerCase().includes(term)
    );
  });

  const getHeaderTitle = () => {
    if (selectedTag) return `#${selectedTag}`;
    if (selectedFolder === 'favorites') return 'Favorites';
    if (selectedFolder === 'trash') return 'Trash';
    if (selectedFolder === 'work') return 'Work';
    if (selectedFolder === 'personal') return 'Personal';
    if (selectedFolder === 'ideas') return 'Ideas & Drafts';
    return 'All Notes';
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredNotes,
    headerTitle: getHeaderTitle()
  };
}
