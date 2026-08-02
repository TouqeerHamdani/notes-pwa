import { useState, useEffect, useRef } from 'react';
import {
  FiSearch,
  FiPlus,
  FiMoon,
  FiSun,
  FiMaximize2,
  FiFolder,
  FiTag,
  FiStar,
  FiTrash2,
  FiFileText,
  FiLogOut
} from 'react-icons/fi';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import supabase from '../lib/supabaseClient';
import { logout } from '../lib/api';

const CommandPalette = ({
  isOpen,
  onClose,
  onToggle,
  onSelectNote,
  onCreateNote,
  onToggleTheme,
  theme,
  onToggleFocusMode,
  onSelectFolder,
  onSelectTag
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const notes = useLiveQuery(async () => {
    if (!isOpen) return [];
    const all = await db.notes.filter(n => !n.is_deleted).toArray();
    return all.sort((a, b) => new Date(b.last_modified || 0) - new Date(a.last_modified || 0));
  }, [isOpen]) || [];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onToggle) {
          onToggle();
        } else if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onToggle]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter((n) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
  }).slice(0, 5);

  const quickActions = [
    {
      id: 'create-note',
      label: 'Create New Note',
      icon: FiPlus,
      action: () => {
        onCreateNote();
        onClose();
      }
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? FiSun : FiMoon,
      action: () => {
        onToggleTheme();
        onClose();
      }
    },
    {
      id: 'toggle-focus',
      label: 'Toggle Focus Mode',
      icon: FiMaximize2,
      action: () => {
        onToggleFocusMode();
        onClose();
      }
    },
    {
      id: 'view-favorites',
      label: 'Go to Favorites / Pinned',
      icon: FiStar,
      action: () => {
        onSelectFolder('favorites');
        onClose();
      }
    },
    {
      id: 'view-trash',
      label: 'Go to Trash',
      icon: FiTrash2,
      action: () => {
        onSelectFolder('trash');
        onClose();
      }
    },
    {
      id: 'filter-work',
      label: 'Filter by Tag: #work',
      icon: FiTag,
      action: () => {
        onSelectTag('work');
        onClose();
      }
    },
    {
      id: 'log-out',
      label: 'Log Out',
      icon: FiLogOut,
      action: async () => {
        try {
          await supabase.auth.signOut();
          await logout();
        } catch (e) {
          console.error(e);
        }
        window.location.href = '/auth';
      }
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-floating overflow-hidden text-[var(--text-main)] transition-all transform"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <FiSearch className="text-[var(--text-muted)] text-lg mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none placeholder-[var(--text-subtle)] font-medium"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-muted)] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-3">
          {/* Quick Actions */}
          {!query && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 block mb-1">
                Quick Actions
              </span>
              <div className="space-y-0.5">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={act.action}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-[var(--bg-card-hover)] transition cursor-pointer font-medium"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-[var(--accent-sage-light)] text-[var(--accent-sage)]">
                          <Icon className="text-sm" />
                        </div>
                        <span>{act.label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-subtle)]">Action</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes matching query */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 block mb-1">
              {query ? 'Search Results' : 'Recent Notes'}
            </span>
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-[var(--text-subtle)] px-3 py-2 italic">
                No matching notes found.
              </p>
            ) : (
              <div className="space-y-0.5">
                {filteredNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      onSelectNote(n.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-[var(--bg-card-hover)] transition cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <FiFileText className="text-[var(--accent-terracotta)] text-sm flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {n.title || 'Untitled Note'}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] truncate block">
                          {n.content || 'No text snippet'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center space-x-3">
            <span>Navigation: ↑ ↓</span>
            <span>Select: ↵</span>
          </div>
          <span>Command Palette</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
