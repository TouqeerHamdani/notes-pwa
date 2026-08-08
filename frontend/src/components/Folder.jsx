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
import supabase from '../lib/supabaseClient';
import { logout } from '../lib/api';
import { useFolderState } from '../hooks/useFolderState';
import { useSyncStatus } from '../hooks/useSyncStatus';
import FolderItem from './FolderItem';

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

  const {
    notesCount,
    pinnedCount,
    trashCount,
    tagCounts,
    defaultFolders
  } = useFolderState();

  const syncState = useSyncStatus();

  const mainNav = [
    { id: 'notes', label: 'All Notes', icon: FiFileText, count: notesCount },
    { id: 'favorites', label: 'Favorites', icon: FiStar, count: pinnedCount },
    { id: 'trash', label: 'Trash', icon: FiTrash2, count: trashCount }
  ];

  const handleSelectFolder = (id) => {
    if (onSelectTag) onSelectTag(null);
    if (onSelectFolder) onSelectFolder(id);
  };

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
          {mainNav.map((item) => (
            <FolderItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              count={item.count}
              isSelected={selectedFolder === item.id && !selectedTag}
              onClick={handleSelectFolder}
              type="main"
            />
          ))}
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
              {defaultFolders.map((f) => (
                <FolderItem
                  key={f.id}
                  id={f.id}
                  label={f.label}
                  count={f.count}
                  isSelected={selectedFolder === f.id && !selectedTag}
                  onClick={handleSelectFolder}
                  type="folder"
                />
              ))}
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
                Object.entries(tagCounts).map(([tag, count]) => (
                  <FolderItem
                    key={tag}
                    id={tag}
                    label={tag}
                    count={count}
                    isSelected={selectedTag === tag}
                    onClick={() => onSelectTag && onSelectTag(tag)}
                    type="tag"
                  />
                ))
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
                <span className="text-[10px] text-[var(--text-subtle)] block mt-1">
                  Sync: {syncState.status}
                  {syncState.pendingCount > 0 && ` (${syncState.pendingCount} pending)`}
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