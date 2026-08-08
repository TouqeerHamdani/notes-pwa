import { LuPin } from 'react-icons/lu';
import { FiTrash2 } from 'react-icons/fi';

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

const NoteListItem = ({ note, isSelected, onClick, onTogglePin, onDelete }) => {
  const displayTitle = note.title && note.title.trim() !== '' ? note.title : 'Untitled Note';
  const displayBody = note.content && note.content.trim() !== '' ? note.content : 'No content yet...';
  const displayDate = formatNoteDate(note.last_modified || note.created_at);

  return (
    <div
      onClick={() => onClick && onClick(note.id)}
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
            onClick={(e) => onTogglePin(e, note)}
            className={`p-1 rounded hover:bg-[var(--bg-sidebar)] transition cursor-pointer ${
              note.is_pinned ? 'text-[var(--accent-terracotta)]' : 'text-[var(--text-subtle)]'
            }`}
            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
          >
            <LuPin className="text-xs" />
          </button>
          <button
            onClick={(e) => onDelete(e, note.id)}
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
};

export default NoteListItem;
