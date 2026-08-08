import { useState } from 'react';
import { FiImage, FiTag } from 'react-icons/fi';

const EMOJI_OPTIONS = ['📝', '💡', '🚀', '📌', '🌿', '🎯', '🎨', '🛠️', '⚡', '📚', '🧠', '✨'];
const COVER_OPTIONS = [
  'none',
  'linear-gradient(to right, #6E8B74, #A8C3B0)',
  'linear-gradient(to right, #D97706, #FBBF24)',
  'linear-gradient(to right, #4F46E5, #818CF8)',
  'linear-gradient(to right, #EC4899, #F472B6)',
  'linear-gradient(to right, #10B981, #6EE7B7)'
];

const NoteMetadata = ({
  icon,
  onChangeIcon,
  coverImage,
  onChangeCoverImage,
  tags,
  onAddTag,
  onRemoveTag
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const handleAddTagInput = (e) => {
    if (e.key === 'Enter' && newTagText.trim()) {
      e.preventDefault();
      onAddTag(newTagText);
      setNewTagText('');
      setShowTagInput(false);
    }
  };

  return (
    <>
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
                    onChangeIcon(e);
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
                      onChangeCoverImage(c);
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

      <div className="flex items-center flex-wrap gap-1.5 text-xs">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-lg bg-[var(--accent-sage-light)] text-[var(--accent-sage)] font-semibold flex items-center space-x-1"
          >
            <span>#{tag}</span>
            <button
              onClick={() => onRemoveTag(tag)}
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
            onKeyDown={handleAddTagInput}
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
    </>
  );
};

export default NoteMetadata;
