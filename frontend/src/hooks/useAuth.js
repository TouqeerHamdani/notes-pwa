import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { db } from "../lib/db";
import { logout as apiLogout } from "../lib/api";

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { authenticated, loading };
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ? user.id : null;
}

export async function logout() {
  try {
    await db.notes.clear();
  } catch (e) {
    console.error("Failed to clear local database:", e);
  }
  await supabase.auth.signOut();
  try {
    await apiLogout();
  } catch (e) {
    console.error("API logout failed:", e);
  }
}