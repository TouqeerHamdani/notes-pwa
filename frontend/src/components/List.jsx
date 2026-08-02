import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { deleteNote, createNote, updateNote } from '../hooks/useDb';
import { getUserId } from '../hooks/useAuth';
import { triggerDebouncedSync } from '../lib/syncManager';
import { FiSearch, FiEdit3, FiTrash2, FiX, FiStar } from 'react-icons/fi';
import { LuPin } from 'react-icons/lu';
import { v4 as uuidv4 } from 'uuid';

const List = ({
  selectedId,
  onUserClick,
  onNoteCreated,
  selectedFolder = 'notes',
  selectedTag = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const rawNotes = useLiveQuery(async () => {
    let query = db.notes;
    if (selectedFolder === 'trash') {
      const notes = await query.filter(n => Boolean(n.is_deleted)).toArray();
      return notes;
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

  const handleCreateNote = async () => {
    try {
      const now = new Date().toISOString();
      const id = uuidv4();
      const userId = await getUserId();
      await createNote(id, userId || 'local-user', '', '', now, now);
      triggerDebouncedSync(300);
      if (onNoteCreated) {
        onNoteCreated(id);
      } else if (onUserClick) {
        onUserClick(id);
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!id) return;
    try {
      await deleteNote(id);
      triggerDebouncedSync(300);
      if (selectedId === id && onUserClick) {
        onUserClick(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (e, note) => {
    e.stopPropagation();
    try {
      await updateNote(note.id, { is_pinned: !note.is_pinned, synced: false });
      triggerDebouncedSync(300);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const formatNoteDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getHeaderTitle = () => {
    if (selectedTag) return `#${selectedTag}`;
    if (selectedFolder === 'favorites') return 'Favorites';
    if (selectedFolder === 'trash') return 'Trash';
    if (selectedFolder === 'work') return 'Work';
    if (selectedFolder === 'personal') return 'Personal';
    if (selectedFolder === 'ideas') return 'Ideas & Drafts';
    return 'All Notes';
  };

  return (
    <div className="List bg-[var(--bg-canvas)] w-full md:w-[300px] border-r border-[var(--border-color)] flex flex-col select-none flex-shrink-0 h-full text-[var(--text-main)] transition-all">
      {/* List Panel Header */}
      <div className="p-3.5 border-b border-[var(--border-color)] space-y-2 bg-[var(--bg-canvas)]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base tracking-tight">{getHeaderTitle()}</h2>
          <button
            onClick={handleCreateNote}
            className="p-1.5 rounded-xl bg-[var(--accent-terracotta-light)] text-[var(--accent-terracotta)] hover:opacity-90 transition cursor-pointer"
            title="Create New Note"
          >
            <FiEdit3 className="text-base" />
          </button>
        </div>

        <div className="relative flex items-center">
          <FiSearch className="absolute left-3 text-[var(--text-subtle)] text-xs" />
          <input
            type="text"
            placeholder="Filter list..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-sidebar)] text-[var(--text-main)] text-xs rounded-xl pl-8 pr-7 py-1.5 focus:outline-none border border-[var(--border-color)] placeholder-[var(--text-subtle)] font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Note List Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-[var(--text-muted)] text-xs font-medium">
              {searchTerm ? 'No matching notes found.' : 'No notes in this view.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateNote}
                className="mt-3 text-xs text-[var(--accent-terracotta)] hover:underline font-semibold cursor-pointer"
              >
                + Create new note
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = selectedId === note.id;
            const displayTitle = note.title && note.title.trim() !== '' ? note.title : 'Untitled Note';
            const displayBody = note.content && note.content.trim() !== '' ? note.content : 'No content yet...';
            const displayDate = formatNoteDate(note.last_modified || note.created_at);

            return (
              <div
                key={note.id}
                onClick={() => onUserClick && onUserClick(note.id)}
                className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] border-[var(--accent-terracotta)]/40 shadow-soft'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-1.5 truncate pr-2">
                    {note.is_pinned && (
                      <LuPin className="text-[var(--accent-terracotta)] text-xs flex-shrink-0 transform rotate-45" />
                    )}
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'
                      }`}
                    >
                      {displayTitle}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => handleTogglePin(e, note)}
                      className={`p-1 rounded hover:bg-[var(--bg-sidebar)] transition cursor-pointer ${
                        note.is_pinned ? 'text-[var(--accent-terracotta)]' : 'text-[var(--text-subtle)]'
                      }`}
                      title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                    >
                      <LuPin className="text-xs" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, note.id)}
                      className="p-1 rounded hover:bg-[var(--bg-sidebar)] text-[var(--text-subtle)] hover:text-red-500 transition cursor-pointer"
                      title="Delete note"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {displayBody}
                </p>

                <div className="flex items-center justify-between text-[10px] mt-2 text-[var(--text-subtle)] font-medium">
                  <span>{displayDate}</span>
                  {Array.isArray(note.tags) && note.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {note.tags.slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded-md bg-[var(--accent-sage-light)] text-[var(--accent-sage)] font-semibold"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default List;