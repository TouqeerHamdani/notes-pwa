import { axiosInstance } from './axios.js';

export const UserSignUp = async (email, password) => {
  try {
    const response = await axiosInstance.post('/auth/register', {
      "email": email,
      "password": password
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}