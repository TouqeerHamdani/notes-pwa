import { FiEdit2 } from 'react-icons/fi';
import { useNoteEditor } from '../hooks/useNoteEditor';
import NoteToolbar from './NoteToolbar';
import NoteEditor from './NoteEditor';

const Preview = ({
  id,
  onBack,
  onDeleteNote,
  isFocusMode,
  onToggleFocusMode,
  isSidebarCollapsed,
  onToggleSidebar
}) => {
  const {
    title,
    description,
    updatedAt,
    icon,
    coverImage,
    tags,
    isPinned,
    fontFamily,
    loadedNoteId,
    saveStatus,
    setFontFamily,
    handleChangeTitle,
    handleChangeDescription,
    handleChangeIcon,
    handleChangeCoverImage,
    handleTogglePin,
    handleAddTag,
    handleRemoveTag,
    handleDeleteNote,
    handleExportMarkdown
  } = useNoteEditor(id, onDeleteNote);

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
      <NoteToolbar
        onBack={onBack}
        onToggleSidebar={onToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        title={title}
        description={description}
        saveStatus={saveStatus}
        updatedAt={updatedAt}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        isFocusMode={isFocusMode}
        onToggleFocusMode={onToggleFocusMode}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onExportMarkdown={handleExportMarkdown}
        onDeleteNote={handleDeleteNote}
      />

      <NoteEditor
        title={title}
        onChangeTitle={handleChangeTitle}
        description={description}
        onChangeDescription={handleChangeDescription}
        fontFamily={fontFamily}
        coverImage={coverImage}
        icon={icon}
        onChangeIcon={handleChangeIcon}
        onChangeCoverImage={handleChangeCoverImage}
        tags={tags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
};

export default Preview;