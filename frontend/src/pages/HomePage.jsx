import NoteList from '../components/NoteList';
import AddNotes from '../components/AddNotes';
import { getUserId } from '../hooks/useAuth';
import { useState, useCallback } from "react";
import Logout from '../components/Logout';

function HomePage() {
  const [selectedId, setSelectedId] = useState(-1);
  const [newCreated, setNewCreated] = useState(false);
  const userId = getUserId();

  const handleUserClick = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const handleCreateItem = () => {
    setNewCreated(!newCreated);
  };

  return (
    <div className="HomePage flex">
      <AddNotes />
      <NoteList />
      <Logout />
    </div>
  );
}

export default HomePage;