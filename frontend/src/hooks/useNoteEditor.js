import { useState, useEffect, useRef, useCallback } from 'react';
import { getNote, updateNote, deleteNote } from './useDb';
import { triggerDebouncedSync } from '../lib/syncManager';

export function useNoteEditor(id, onDeleteCallback) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [icon, setIcon] = useState('📝');
  const [coverImage, setCoverImage] = useState('none');
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans');
  const [hasChanged, setHasChanged] = useState(false);
  const [loadedNoteId, setLoadedNoteId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving'

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

  const handleChangeTitle = (newTitle) => {
    setTitle(newTitle);
    setHasChanged(true);
  };

  const handleChangeDescription = (newDesc) => {
    setDescription(newDesc);
    setHasChanged(true);
  };

  const handleChangeIcon = (newIcon) => {
    setIcon(newIcon);
    setHasChanged(true);
  };

  const handleChangeCoverImage = (newCover) => {
    setCoverImage(newCover);
    setHasChanged(true);
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    setHasChanged(true);
  };

  const handleAddTag = (tag) => {
    const cleaned = tag.trim().toLowerCase().replace(/^#/, '');
    if (!tags.includes(cleaned) && cleaned) {
      setTags([...tags, cleaned]);
      setHasChanged(true);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
    setHasChanged(true);
  };

  const handleDeleteNote = async () => {
    if (loadedNoteId) {
      await deleteNote(loadedNoteId);
      triggerDebouncedSync(300);
      if (onDeleteCallback) onDeleteCallback(loadedNoteId);
    }
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

  return {
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
  };
}
