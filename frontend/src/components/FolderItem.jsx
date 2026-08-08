const FolderItem = ({
  id,
  label,
  count,
  icon: Icon,
  isSelected,
  onClick,
  type = 'folder' // 'main', 'folder', 'tag'
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
        isSelected
          ? type === 'tag'
            ? 'bg-[var(--accent-sage-light)] text-[var(--accent-sage)] font-semibold shadow-2xs'
            : 'bg-[var(--bg-card-active)] text-[var(--text-main)] font-semibold shadow-2xs'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'
      }`}
    >
      <div className="flex items-center space-x-2.5 truncate">
        {Icon && (
          <Icon
            className={`text-sm flex-shrink-0 ${
              isSelected && type !== 'tag' ? 'text-[var(--accent-terracotta)]' : ''
            }`}
          />
        )}
        {type === 'tag' ? (
          <span className="truncate">#{label}</span>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </div>
      <span
        className={`text-[10px] font-mono text-[var(--text-subtle)] ${
          type === 'main' ? 'px-1.5 py-0.5 rounded bg-[var(--bg-card)]/50' : ''
        }`}
      >
        {count}
      </span>
    </button>
  );
};

export default FolderItem;
