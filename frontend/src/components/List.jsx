import { FiSearch, FiEdit3, FiX, FiMenu } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { deleteNote, createNote, updateNote } from '../hooks/useDb';
import { getUserId } from '../hooks/useAuth';
import { triggerDebouncedSync } from '../lib/syncManager';
import { useNoteFilter } from '../hooks/useNoteFilter';
import NoteListItem from './NoteListItem';

const List = ({
  selectedId,
  onUserClick,
  onNoteCreated,
  selectedFolder = 'notes',
  selectedTag = null,
  onOpenFolders
}) => {
  const { searchTerm, setSearchTerm, filteredNotes, headerTitle } = useNoteFilter(selectedFolder, selectedTag);

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

  return (
    <div className="List bg-[var(--bg-canvas)] w-full md:w-[300px] border-r border-[var(--border-color)] flex flex-col select-none flex-shrink-0 h-full text-[var(--text-main)] transition-all">
      {/* List Panel Header */}
      <div className="p-3.5 border-b border-[var(--border-color)] space-y-2 bg-[var(--bg-canvas)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onOpenFolders && (
              <button
                onClick={onOpenFolders}
                className="md:hidden p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-subtle)]"
                title="Open Sidebar"
              >
                <FiMenu className="text-base" />
              </button>
            )}
            <h2 className="font-bold text-base tracking-tight">{headerTitle}</h2>
          </div>
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
          filteredNotes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={selectedId === note.id}
              onClick={onUserClick}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default List;