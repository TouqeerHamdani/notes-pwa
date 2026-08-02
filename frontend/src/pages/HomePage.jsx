import { useState } from 'react';
import Folder from '../components/Folder';
import List from '../components/List';
import Preview from '../components/Preview';
import CommandPalette from '../components/CommandPalette';
import { useTheme } from '../hooks/useTheme';
import { v4 as uuidv4 } from 'uuid';
import { createNote } from '../hooks/useDb';
import { getUserId } from '../hooks/useAuth';
import { triggerDebouncedSync } from '../lib/syncManager';

function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('notes');
  const [selectedTag, setSelectedTag] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  const handleSelectNote = (id) => {
    setSelectedId(id);
    if (id) {
      setMobileView('preview');
    }
  };

  const handleCreateNewNote = async () => {
    try {
      const now = new Date().toISOString();
      const id = uuidv4();
      const userId = await getUserId();
      await createNote(id, userId || 'local-user', '', '', now, now);
      triggerDebouncedSync(300);
      setSelectedId(id);
      setMobileView('preview');
    } catch (err) {
      console.error('Failed to create new note in HomePage:', err);
    }
  };

  const handleDeleteNote = (deletedId) => {
    if (selectedId === deletedId) {
      setSelectedId(null);
      setMobileView('list');
    }
  };

  return (
    <div className="HomePage h-screen w-screen flex bg-[var(--bg-canvas)] text-[var(--text-main)] overflow-hidden font-sans select-none transition-layout">
      {/* Collapsible Left Navigation Sidebar (~240px) */}
      {!isFocusMode && !isSidebarCollapsed && (
        <div
          className={`h-full ${
            mobileView === 'folders'
              ? 'flex w-full fixed inset-0 z-30 bg-[var(--bg-sidebar)]'
              : 'hidden md:flex'
          }`}
        >
          <Folder
            selectedFolder={selectedFolder}
            onSelectFolder={(folderId) => {
              setSelectedFolder(folderId);
              setSelectedTag(null);
              setMobileView('list');
            }}
            selectedTag={selectedTag}
            onSelectTag={(tag) => {
              setSelectedTag(tag);
              setMobileView('list');
            }}
            onNewNote={handleCreateNewNote}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>
      )}

      {/* Middle Note List / Preview Panel (~300px) */}
      {!isFocusMode && (
        <div
          className={`h-full ${
            mobileView === 'list'
              ? 'flex w-full md:w-[300px]'
              : 'hidden md:flex'
          }`}
        >
          <List
            selectedId={selectedId}
            onUserClick={handleSelectNote}
            onNoteCreated={(newId) => {
              setSelectedId(newId);
              setMobileView('preview');
            }}
            selectedFolder={selectedFolder}
            selectedTag={selectedTag}
          />
        </div>
      )}

      {/* Main Writing Canvas (Right, Flex-1) */}
      <main
        className={`h-full flex-1 ${
          mobileView === 'preview'
            ? 'flex w-full fixed inset-0 z-30 md:static'
            : 'hidden md:flex'
        }`}
      >
        <Preview
          id={selectedId}
          onBack={() => setMobileView('list')}
          onDeleteNote={handleDeleteNote}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </main>

      {/* Global Floating Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNewNote}
        onToggleTheme={toggleTheme}
        theme={theme}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        onSelectFolder={(f) => {
          setSelectedFolder(f);
          setSelectedTag(null);
        }}
        onSelectTag={(t) => setSelectedTag(t)}
      />
    </div>
  );
}

export default HomePage;