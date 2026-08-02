import { useState, useEffect } from 'react';
import {
  FiFileText,
  FiStar,
  FiTag,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiUser,
  FiFolder,
  FiLogOut,
  FiCheckCircle
} from 'react-icons/fi';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import supabase from '../lib/supabaseClient';
import { logout } from '../lib/api';

const Folder = ({
  selectedFolder = 'notes',
  onSelectFolder,
  selectedTag = null,
  onSelectTag,
  onNewNote,
  onOpenCommandPalette,
  theme,
  onToggleTheme
}) => {
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('Local User');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/auth';
    }
  };

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

  const mainNav = [
    { id: 'notes', label: 'All Notes', icon: FiFileText, count: notesCount },
    { id: 'favorites', label: 'Favorites', icon: FiStar, count: pinnedCount },
    { id: 'trash', label: 'Trash', icon: FiTrash2, count: trashCount }
  ];

  const defaultFolders = [
    { id: 'work', label: 'Work', count: allNotes.filter(n => n.folder_id === 'work').length },
    { id: 'personal', label: 'Personal', count: allNotes.filter(n => n.folder_id === 'personal').length },
    { id: 'ideas', label: 'Ideas & Drafts', count: allNotes.filter(n => n.folder_id === 'ideas').length }
  ];

  return (
    <aside className="Folder bg-[var(--bg-sidebar)] w-full md:w-[240px] border-r border-[var(--border-color)] flex flex-col justify-between select-none flex-shrink-0 h-full p-3.5 text-[var(--text-main)] transition-all">
      {/* Top Header Actions */}
      <div className="space-y-4">
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-[var(--accent-terracotta)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              N
            </div>
            <span className="font-bold text-sm tracking-tight">Workspace</span>
          </div>
        </div>

        {/* High Affordance "+ New Note" CTA */}
        <button
          type="button"
          onClick={onNewNote}
          className="w-full flex items-center justify-center space-x-2 bg-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta)]/90 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-all shadow-soft active:scale-[0.98] cursor-pointer"
        >
          <FiPlus className="text-base" />
          <span>New Note</span>
        </button>

        {/* Search Bar with ⌘K Command Shortcut Indicator */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center space-x-2 truncate">
            <FiSearch className="text-sm flex-shrink-0 group-hover:text-[var(--accent-terracotta)] transition" />
            <span className="truncate">Search notes...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-subtle)] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded">
            ⌘K
          </kbd>
        </button>

        {/* Main Navigation Links */}
        <div className="space-y-0.5 pt-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedFolder === item.id && !selectedTag;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onSelectTag) onSelectTag(null);
                  if (onSelectFolder) onSelectFolder(item.id);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-card-active)] text-[var(--text-main)] font-semibold shadow-2xs'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`text-sm flex-shrink-0 ${isSelected ? 'text-[var(--accent-terracotta)]' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-subtle)] px-1.5 py-0.5 rounded bg-[var(--bg-card)]/50">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Folder Taxonomy Tree Accordion */}
        <div className="pt-2">
          <div
            onClick={() => setFoldersOpen(!foldersOpen)}
            className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] cursor-pointer hover:text-[var(--text-muted)] transition mb-1"
          >
            <div className="flex items-center space-x-1">
              <FiFolder className="text-xs" />
              <span>Folders</span>
            </div>
            {foldersOpen ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
          </div>

          {foldersOpen && (
            <div className="space-y-0.5 pl-1">
              {defaultFolders.map((f) => {
                const isSelected = selectedFolder === f.id && !selectedTag;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      if (onSelectTag) onSelectTag(null);
                      if (onSelectFolder) onSelectFolder(f.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-card-active)] text-[var(--text-main)] font-semibold shadow-2xs'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span className="truncate">{f.label}</span>
                    <span className="text-[10px] font-mono text-[var(--text-subtle)]">{f.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags Taxonomy Accordion */}
        <div className="pt-1">
          <div
            onClick={() => setTagsOpen(!tagsOpen)}
            className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] cursor-pointer hover:text-[var(--text-muted)] transition mb-1"
          >
            <div className="flex items-center space-x-1">
              <FiTag className="text-xs" />
              <span>Tags</span>
            </div>
            {tagsOpen ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
          </div>

          {tagsOpen && (
            <div className="space-y-0.5 pl-1">
              {Object.keys(tagCounts).length === 0 ? (
                <p className="text-[11px] text-[var(--text-subtle)] px-2 py-1 italic">No tags yet</p>
              ) : (
                Object.entries(tagCounts).map(([tag, count]) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectTag && onSelectTag(tag)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-sage-light)] text-[var(--accent-sage)] font-semibold shadow-2xs'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span className="truncate">#{tag}</span>
                      <span className="text-[10px] font-mono text-[var(--text-subtle)]">{count}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: User Profile Toggle & Popover and Light/Dark Mode Switcher */}
      <div className="relative pt-3 border-t border-[var(--border-color)]">
        {showAccountMenu && (
          <div className="absolute bottom-12 left-0 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-floating p-3 space-y-3.5 z-40 animate-fade-in">
            <div className="flex items-center space-x-2.5 border-b border-[var(--border-color)] pb-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-sage-light)] text-[var(--accent-sage)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                <FiUser className="text-sm" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">{userEmail}</span>
                <span className="text-[10px] text-[var(--accent-sage)] flex items-center space-x-1 font-medium">
                  <FiCheckCircle className="text-[10px]" />
                  <span>Authenticated</span>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl transition cursor-pointer font-medium"
              >
                <FiLogOut className="text-sm" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center space-x-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] px-1 py-1 rounded-xl hover:bg-[var(--bg-card-hover)] transition cursor-pointer flex-1 truncate mr-1"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--accent-sage-light)] text-[var(--accent-sage)] flex items-center justify-center font-bold text-xs flex-shrink-0">
              <FiUser className="text-xs" />
            </div>
            <span className="font-medium truncate max-w-[110px]">{userEmail}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer flex-shrink-0"
          >
            {theme === 'dark' ? <FiSun className="text-sm text-amber-400" /> : <FiMoon className="text-sm text-slate-700" />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Folder;