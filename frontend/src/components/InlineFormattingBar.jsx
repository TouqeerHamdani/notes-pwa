import { FiBold, FiItalic, FiCode, FiList, FiCheckSquare } from 'react-icons/fi';
import { BiParagraph } from 'react-icons/bi';
import { LuQuote } from 'react-icons/lu';

const InlineFormattingBar = ({ position, onFormat }) => {
  if (!position) return null;

  const tools = [
    { label: 'Bold', syntax: '**', icon: FiBold, title: 'Bold (**text**)' },
    { label: 'Italic', syntax: '*', icon: FiItalic, title: 'Italic (*text*)' },
    { label: 'H1', syntax: '# ', icon: () => <span className="font-bold text-xs">H1</span>, title: 'Heading 1' },
    { label: 'H2', syntax: '## ', icon: () => <span className="font-bold text-xs">H2</span>, title: 'Heading 2' },
    { label: 'H3', syntax: '### ', icon: () => <span className="font-bold text-xs">H3</span>, title: 'Heading 3' },
    { label: 'Code', syntax: '`', icon: FiCode, title: 'Code (`code`)' },
    { label: 'Quote', syntax: '> ', icon: LuQuote, title: 'Blockquote' },
    { label: 'Checklist', syntax: '- [ ] ', icon: FiCheckSquare, title: 'Checklist (- [ ])' },
  ];

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-40 transform -translate-x-1/2 -translate-y-full mb-2 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-floating rounded-xl p-1 flex items-center space-x-0.5 text-[var(--text-main)] animate-fade-in"
    >
      {tools.map((t, idx) => {
        const Icon = t.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onFormat(t.syntax, t.label)}
            title={t.title}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer text-xs font-semibold"
          >
            <Icon className="text-sm" />
          </button>
        );
      })}
    </div>
  );
};

export default InlineFormattingBar;
