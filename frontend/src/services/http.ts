import axios from "axios";

// Se você já coloca /api no .env, mantenha assim.
// Ex.: VITE_API_URL=https://seu-servidor/app.github.dev/api
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

export default api;
