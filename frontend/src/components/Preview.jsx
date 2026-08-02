import { useState, useEffect, useRef } from 'react';
import { getNote, updateNote, deleteNote } from '../hooks/useDb';
import { triggerDebouncedSync } from '../lib/syncManager';
import InlineFormattingBar from './InlineFormattingBar';
import {
  FiChevronLeft,
  FiTrash2,
  FiShare2,
  FiLock,
  FiEdit2,
  FiMaximize2,
  FiMinimize2,
  FiMoreHorizontal,
  FiCheckCircle,
  FiCloud,
  FiSmile,
  FiImage,
  FiTag,
  FiSidebar
} from 'react-icons/fi';
import { LuPin } from 'react-icons/lu';

const EMOJI_OPTIONS = ['📝', '💡', '🚀', '📌', '🌿', '🎯', '🎨', '🛠️', '⚡', '📚', '🧠', '✨'];
const COVER_OPTIONS = [
  'none',
  'linear-gradient(to right, #6E8B74, #A8C3B0)',
  'linear-gradient(to right, #D97706, #FBBF24)',
  'linear-gradient(to right, #4F46E5, #818CF8)',
  'linear-gradient(to right, #EC4899, #F472B6)',
  'linear-gradient(to right, #10B981, #6EE7B7)'
];

const Preview = ({
  id,
  onBack,
  onDeleteNote,
  isFocusMode,
  onToggleFocusMode,
  isSidebarCollapsed,
  onToggleSidebar
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [icon, setIcon] = useState('📝');
  const [coverImage, setCoverImage] = useState('none');
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans'); // 'sans', 'serif', 'mono'
  const [hasChanged, setHasChanged] = useState(false);
  const [loadedNoteId, setLoadedNoteId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'

  // Emoji and cover popover states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Selection formatting bar position
  const [selectionPosition, setSelectionPosition] = useState(null);

  const textareaRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (!id || id === -1) {
      setTitle('');
      setDescription('');
      setUpdatedAt('');
      setIcon('📝');
      setCoverImage('none');
      setTags([]);
      setIsPinned(false);
      setLoadedNoteId(null);
      setHasChanged(false);
      return;
    }

    if (loadedNoteId && loadedNoteId !== id && hasChanged) {
      updateNote(loadedNoteId, {
        title,
        content: description,
        icon,
        cover_image: coverImage,
        tags,
        is_pinned: isPinned,
        last_modified: new Date().toISOString(),
        synced: false
      });
      triggerDebouncedSync(300);
    }

    getNote(id).then((data) => {
      if (isMounted) {
        if (data) {
          setTitle(data.title || '');
          setDescription(data.content || '');
          setIcon(data.icon || '📝');
          setCoverImage(data.cover_image || 'none');
          setTags(data.tags || []);
          setIsPinned(Boolean(data.is_pinned));
          setUpdatedAt(data.last_modified || data.created_at || new Date().toISOString());
          setLoadedNoteId(id);
        } else {
          setTitle('');
          setDescription('');
          setUpdatedAt('');
          setLoadedNoteId(null);
        }
        setHasChanged(false);
        setSaveStatus('saved');
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!loadedNoteId || !hasChanged) return;

    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const now = new Date().toISOString();
      setUpdatedAt(now);
      await updateNote(loadedNoteId, {
        title,
        content: description,
        icon,
        cover_image: coverImage,
        tags,
        is_pinned: isPinned,
        last_modified: now,
        synced: false
      });
      triggerDebouncedSync(1000);
      setHasChanged(false);
      setSaveStatus('saved');
    }, 400);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, description, icon, coverImage, tags, isPinned, loadedNoteId, hasChanged]);

  // Handle Text Selection for Floating Toolbar
  const handleSelectText = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && start !== undefined) {
      const rect = textarea.getBoundingClientRect();
      setSelectionPosition({
        top: rect.top + 20,
        left: rect.left + rect.width / 2
      });
    } else {
      setSelectionPosition(null);
    }
  };

  const applyFormatting = (syntax) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);

    let replacement = '';
    if (syntax.endsWith(' ')) {
      replacement = `${syntax}${selectedText}`;
    } else {
      replacement = `${syntax}${selectedText}${syntax}`;
    }

    const newContent = description.substring(0, start) + replacement + description.substring(end);
    setDescription(newContent);
    setHasChanged(true);
    setSelectionPosition(null);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTagText.trim()) {
      e.preventDefault();
      const cleaned = newTagText.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(cleaned)) {
        const updated = [...tags, cleaned];
        setTags(updated);
        setHasChanged(true);
      }
      setNewTagText('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    setHasChanged(true);
  };

  const handleExportMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([`# ${title}\n\n${description}`], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'note'}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
  const charCount = description.length;

  const formatLastSaved = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!id || id === -1 || !loadedNoteId) {
    return (
      <div className="Preview bg-[var(--bg-canvas)] flex flex-col flex-1 items-center justify-center text-[var(--text-muted)] select-none p-6 h-full transition-all">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] flex items-center justify-center mb-4 shadow-soft">
          <FiEdit2 className="text-2xl text-[var(--accent-terracotta)]" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text-main)]">No note selected</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 text-center max-w-sm">
          Select a note from the preview panel or press <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded">⌘K</kbd> to search.
        </p>
      </div>
    );
  }

  return (
    <div className="Preview bg-[var(--bg-canvas)] flex flex-col flex-1 overflow-hidden h-full text-[var(--text-main)] transition-all">
      {/* Top Utility Bar */}
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
                    setIsPinned(!isPinned);
                    setHasChanged(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] flex items-center space-x-2"
                >
                  <LuPin className="text-sm" />
                  <span>{isPinned ? 'Unpin Note' : 'Pin Note'}</span>
                </button>

                <button
                  onClick={() => {
                    handleExportMarkdown();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card-hover)] flex items-center space-x-2"
                >
                  <FiShare2 className="text-sm" />
                  <span>Export as Markdown</span>
                </button>

                <button
                  onClick={async () => {
                    setShowMoreMenu(false);
                    await deleteNote(loadedNoteId);
                    triggerDebouncedSync(300);
                    if (onDeleteNote) onDeleteNote(loadedNoteId);
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

      {/* Main Writing Body Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Cover Banner (Optional) */}
        {coverImage !== 'none' && (
          <div className="h-28 w-full transition-all duration-300" style={{ background: coverImage }} />
        )}

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Header Controls: Emoji Icon & Cover Banner Picker */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-3xl p-2 rounded-2xl hover:bg-[var(--bg-sidebar)] transition cursor-pointer border border-transparent hover:border-[var(--border-color)]"
                title="Change Icon"
              >
                {icon}
              </button>

              {showEmojiPicker && (
                <div className="absolute left-0 mt-2 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-floating grid grid-cols-6 gap-1 z-30">
                  {EMOJI_OPTIONS.map((e, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIcon(e);
                        setHasChanged(true);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 text-xl hover:bg-[var(--bg-card-hover)] rounded-xl cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <div className="relative">
                <button
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-color)] hover:text-[var(--text-main)] transition cursor-pointer"
                >
                  <FiImage className="text-sm" />
                  <span>Cover</span>
                </button>

                {showCoverPicker && (
                  <div className="absolute right-0 mt-2 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-floating space-y-1.5 z-30 w-40">
                    {COVER_OPTIONS.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCoverImage(c);
                          setHasChanged(true);
                          setShowCoverPicker(false);
                        }}
                        className="w-full h-6 rounded-lg cursor-pointer border border-[var(--border-color)]"
                        style={{ background: c === 'none' ? 'var(--bg-sidebar)' : c }}
                      >
                        {c === 'none' && <span className="text-[10px] text-[var(--text-subtle)]">None</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags List */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-[var(--accent-sage-light)] text-[var(--accent-sage)] font-semibold flex items-center space-x-1"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 cursor-pointer ml-1"
                >
                  ×
                </button>
              </span>
            ))}

            {showTagInput ? (
              <input
                type="text"
                autoFocus
                placeholder="tag_name..."
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={handleAddTag}
                onBlur={() => setShowTagInput(false)}
                className="bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg px-2 py-0.5 text-xs focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] flex items-center space-x-1 cursor-pointer py-0.5 px-1.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition"
              >
                <FiTag className="text-xs" />
                <span>+ Tag</span>
              </button>
            )}
          </div>

          {/* Editable Note Title Field */}
          <input
            type="text"
            placeholder="Untitled Note"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasChanged(true);
            }}
            className="bg-transparent border-0 text-3xl md:text-4xl font-extrabold text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-0 w-full tracking-tight"
          />

          {/* Markdown Writing Canvas */}
          <div className="relative min-h-[400px]">
            <InlineFormattingBar position={selectionPosition} onFormat={applyFormatting} />

            <textarea
              ref={textareaRef}
              placeholder="Start writing in markdown..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setHasChanged(true);
              }}
              onSelect={handleSelectText}
              onMouseUp={handleSelectText}
              className={`w-full bg-transparent border-0 text-base text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-0 resize-none leading-relaxed min-h-[450px] ${
                fontFamily === 'serif'
                  ? 'font-serif-editor'
                  : fontFamily === 'mono'
                  ? 'font-mono-editor'
                  : 'font-sans'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;