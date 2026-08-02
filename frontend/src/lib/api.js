import { axiosInstance } from './axios.js';

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

export async function register(email, password) {
  try {
    const response = await axiosInstance.post('/auth/register', { email, password });
    return response.data;
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
}

export async function fetchUserNotes() {
  try {
    const response = await axiosInstance.get('/api/notes');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user notes:", error);
    return [];
  }
}

export async function syncAllNotes(data) {
  try {
    const response = await axiosInstance.post('/api/sync', data);
    return response.data;
  } catch (error) {
    console.error("Failed to sync notes:", error);
    return null;
  }
}

export async function syncNote(note) {
  try {
    const response = await axiosInstance.post('/api/sync', {
      notes: [note]
    });
    return response.data;
  } catch (error) {
    console.error("Failed to sync note:", error);
    return null;
  }
}

export async function deleteNote(id) {
  try {
    const response = await axiosInstance.delete(`/api/notes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to delete note with id ${id}:`, error);
    return null;
  }
}