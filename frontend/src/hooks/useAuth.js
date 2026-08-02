import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

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
  console.log("User ID:", user ? user.id : "No user");
  return user ? user.id : null;
};