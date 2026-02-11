import { useLiveQuery } from "dexie-react-hooks";
import { React, useEffect } from "react";
import { db } from "../lib/db.js";
import { getUserId } from "../hooks/useAuth.js";
import { deleteNote, getUserNotes, syncNotes, updateNote } from "../hooks/useDb.js";

 function NoteList() {

  // useEffect(() => {
  //   console.log("I am NoteList, loaded only once because I am within useEffect. Otherwise, I would load multiple times whenever each asynchronous function returns a value and updates the component that utilizes the value.");

  //   const fetchNotes = async () => {
  //     const userId = await getUserId();
  //     console.log("Fetched user ID in NoteList:", userId);
  //     const notes = await getUserNotes(userId);
  //     console.log("Fetched notes in NoteList:", notes);
  //   };
  // }, []);

  const notes = useLiveQuery(async () => {
    const userId = await getUserId();
    console.log("Fetched user ID in useLiveQuery:", userId);
    const notes = await getUserNotes(userId);
    console.log("Fetched notes in useLiveQuery:", notes);
    return notes;
  });

  const handleDelete = (id) => {
    deleteNote(id).then(() => {
      console.log(`Note with id ${id} deleted successfully.`);
    }).catch((error) => {
      console.error(`Failed to delete note with id ${id}:`, error);
    });
  };

  const handleUpdate = (id) => {
    updateNote(id, { title: "Updated Title", content: "Updated Content" }).then(() => {
      console.log(`Note with id ${id} updated successfully.`);
    }).catch((error) => {
      console.error(`Failed to update note with id ${id}:`, error);
    });

  };

  const handleSync = () => {
    syncNotes();
    console.log("Syncing notes...");
  };

  const notesCount = useLiveQuery(() => db.notes.count());
  if (!notes || notesCount == undefined) return null;

  return (
    <div>
      <p>
        You have <b>{notesCount}</b> notes in total.
      </p>
      <ul>
        {notes.map((note) => (
          <li key={note.id} >
            <span style={{ width: '300px', display: 'inline-block' }}>{note.title}, {note.content}</span>
            <button style={{ marginRight: '10px' }} onClick={() => handleDelete(note.id)}>Delete</button>
            <button onClick={() => handleUpdate(note.id)}>Update</button>
            <button style={{ marginLeft: '10px' }} onClick={() => handleSync()}>Sync Notes</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NoteList;