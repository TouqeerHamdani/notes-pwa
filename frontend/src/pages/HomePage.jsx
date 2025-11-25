import React from "react";
import supabase from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate("/login");
  };

  return (
    <div>
      <h1>Hello, you are logged in.</h1>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default HomePage;