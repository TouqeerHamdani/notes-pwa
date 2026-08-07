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

export async function logout() {
  try {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error("Logout failed:", error);
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