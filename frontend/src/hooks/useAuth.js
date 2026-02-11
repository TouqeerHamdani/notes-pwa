import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  
  const getSession = () => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setAuthenticated(true);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setAuthenticated(false);
        setLoading(false);
      }
    });
  };

    getSession();

  return { authenticated, loading };
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log("User ID:", user ? user.id : "No user");
  return user.id || null;
};