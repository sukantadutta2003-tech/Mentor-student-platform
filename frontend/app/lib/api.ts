import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const register = (data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) => api.post("/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

// Sessions
export const createSession = () => api.post("/sessions/create");
export const joinSession = (sessionId: string) =>
  api.post("/sessions/join", { sessionId });
export const endSession = (sessionId: string) =>
  api.post(`/sessions/${sessionId}/end`);
export const getSession = (sessionId: string) =>
  api.get(`/sessions/${sessionId}`);
export const getMySessions = () => api.get("/sessions/my");

// Chat
export const getSessionMessages = (sessionId: string) =>
  api.get(`/sessions/${sessionId}/messages`);

export default api;
