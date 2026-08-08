import { useState, useRef } from 'react';
import InlineFormattingBar from './InlineFormattingBar';
import NoteMetadata from './NoteMetadata';

const NoteEditor = ({
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  fontFamily,
  coverImage,
  icon,
  onChangeIcon,
  onChangeCoverImage,
  tags,
  onAddTag,
  onRemoveTag
}) => {
  const [selectionPosition, setSelectionPosition] = useState(null);
  const textareaRef = useRef(null);

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
    onChangeDescription(newContent);
    setSelectionPosition(null);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {coverImage !== 'none' && (
        <div className="h-28 w-full transition-all duration-300" style={{ background: coverImage }} />
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <NoteMetadata
          icon={icon}
          onChangeIcon={onChangeIcon}
          coverImage={coverImage}
          onChangeCoverImage={onChangeCoverImage}
          tags={tags}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
        />

        <input
          type="text"
          placeholder="Untitled Note"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="bg-transparent border-0 text-3xl md:text-4xl font-extrabold text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-0 w-full tracking-tight"
        />

        <div className="relative min-h-[400px]">
          <InlineFormattingBar position={selectionPosition} onFormat={applyFormatting} />

          <textarea
            ref={textareaRef}
            placeholder="Start writing in markdown..."
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
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
  );
};

export default NoteEditor;
