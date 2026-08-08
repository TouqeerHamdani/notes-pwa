import { useState } from 'react';
import {
  FiChevronLeft,
  FiShare2,
  FiTrash2,
  FiMaximize2,
  FiMinimize2,
  FiMoreHorizontal,
  FiCheckCircle,
  FiSidebar
} from 'react-icons/fi';
import { LuPin } from 'react-icons/lu';

const NoteToolbar = ({
  onBack,
  onToggleSidebar,
  isSidebarCollapsed,
  title,
  description,
  saveStatus,
  updatedAt,
  fontFamily,
  setFontFamily,
  isFocusMode,
  onToggleFocusMode,
  isPinned,
  onTogglePin,
  onExportMarkdown,
  onDeleteNote
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
  const charCount = description.length;

  const formatLastSaved = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-[var(--bg-canvas)] border-b border-[var(--border-color)] px-4 py-2 flex items-center justify-between text-xs select-none flex-shrink-0">
      <div className="flex items-center space-x-2 truncate">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center space-x-1 text-[var(--accent-terracotta)] font-medium pr-2 border-r border-[var(--border-color)] cursor-pointer"
          >
            <FiChevronLeft className="text-base" />
            <span>Notes</span>
          </button>
        )}

        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          className={`hidden md:flex p-1.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition cursor-pointer ${
            isSidebarCollapsed ? 'text-[var(--accent-terracotta)] bg-[var(--accent-terracotta-light)]' : 'text-[var(--text-muted)]'
          }`}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <FiSidebar className="text-sm" />
        </button>

        {/* Breadcrumb Path */}
        <div className="flex items-center space-x-1 text-[var(--text-subtle)] font-medium truncate">
          <span>Workspace</span>
          <span>/</span>
          <span className="truncate text-[var(--text-main)]">{title || 'Untitled'}</span>
        </div>
      </div>

      {/* Center/Right Metrics & Saved Indicator */}
      <div className="flex items-center space-x-3 text-[11px] text-[var(--text-muted)] font-medium">
        <div className="hidden sm:flex items-center space-x-2">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>

        <div className="flex items-center space-x-1 text-[var(--accent-sage)]">
          <FiCheckCircle className="text-xs" />
          <span className="hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : `Saved • ${formatLastSaved(updatedAt)}`}
          </span>
        </div>

        {/* Typography Font Switcher */}
        <div className="flex items-center bg-[var(--bg-sidebar)] p-0.5 rounded-lg border border-[var(--border-color)]">
          <button
            onClick={() => setFontFamily('sans')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
              fontFamily === 'sans' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs' : 'text-[var(--text-subtle)]'
            }`}
          >
            Sans
          </button>
          <button
            onClick={() => setFontFamily('serif')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-serif transition cursor-pointer ${
              fontFamily === 'serif' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs' : 'text-[var(--text-subtle)]'
            }`}
          >
            Serif
          </button>
          <button
            onClick={() => setFontFamily('mono')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer ${
              fontFamily === 'mono' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs' : 'text-[var(--text-subtle)]'
            }`}
          >
            Mono
          </button>
        </div>

        {/* Focus Mode Button */}
        <button
          onClick={onToggleFocusMode}
          className={`p-1.5 rounded-lg border border-[var(--border-color)] transition cursor-pointer ${
            isFocusMode
              ? 'bg-[var(--accent-terracotta-light)] text-[var(--accent-terracotta)]'
              : 'hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)]'
          }`}
          title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {isFocusMode ? <FiMinimize2 className="text-sm" /> : <FiMaximize2 className="text-sm" />}
        </button>

        {/* Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title="More Actions"
          >
            <FiMoreHorizontal className="text-base" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-floating py-1 z-30 text-xs">
              <button
                onClick={() => {
                  onTogglePin();
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] flex items-center space-x-2"
              >
                <LuPin className="text-sm" />
                <span>{isPinned ? 'Unpin Note' : 'Pin Note'}</span>
              </button>

              <button
                onClick={() => {
                  onExportMarkdown();
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] flex items-center space-x-2"
              >
                <FiShare2 className="text-sm" />
                <span>Export as Markdown</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onDeleteNote();
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] text-red-500 flex items-center space-x-2"
              >
                <FiTrash2 className="text-sm" />
                <span>Delete Note</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteToolbar;
