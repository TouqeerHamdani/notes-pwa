import { useState } from "react";
import React from 'react';
import { createNote } from "../hooks/useDb.js";
import { getUserId } from "../hooks/useAuth.js";
import {v4 as uuidv4} from 'uuid';

function AddNotes() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  console.log("I am AddNotes, loaded only once because there is no strict mode and no hook updating this component.");

  const handleClick = async () => {
    const now = new Date();
    const createdAt = now;
    const updatedAt = now;
    const id = uuidv4();
    const user = await getUserId();
    console.log("User ID in AddNotes:", user);
    createNote(id, user, title, content, createdAt, updatedAt);
  };

  return (
    <div>
      Title:
      <input
        type="text"
        value={title}
        onChange={(ev) => setTitle(ev.target.value)}
      />
      Content:
      <input
        type="text"
        value={content}
        onChange={(ev) => setContent(ev.target.value)}
      />
      <button onClick={handleClick}>Add</button>
    </div>
  );
}

export default AddNotes;