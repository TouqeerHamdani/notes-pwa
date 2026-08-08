import { axiosInstance } from './axios.js';
import { db } from './db.js';
import supabase from './supabaseClient.js';

export async function login(email, password) {
  try {
    const response = await axiosInstance.post('/auth/login', { 
        email: email, 
        password: password
    });
    return response.data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

export async function logout() {
  // 1. Purge all local unencrypted IndexedDB data
  try {
    if (db && db.notes) {
      await db.notes.clear();
    }
  } catch (err) {
    console.error("Failed to clear local notes DB on logout:", err);
  }

  // 2. Sign out from Supabase client SDK
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Supabase signOut error:", err);
  }

  // 3. Call backend auth logout endpoint
  try {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error("Logout API request failed:", error);
    throw error;
  }
}

export async function syncAllNotes(data) {
  try {
    const response = await axiosInstance.post('/api/notes/sync', data);
    return response.data;
  } catch (error) {
    console.error("Failed to sync notes:", error);
    return null;
  }
}