import axios from "axios";

// Use VITE_API_URL se existir; remove barra final se tiver.
// Ex.: VITE_API_URL=http://localhost:8000/api  (sem / no fim)
const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
const baseURL = (envUrl ? envUrl.replace(/\/$/, "") : "http://localhost:8000/api");

const api = axios.create({
  baseURL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
  timeout: 20000, // evita chamadas penduradas
});

// Interceptores só em DEV (úteis pra depurar)
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    // console.debug("➡️", config.method?.toUpperCase(), config.baseURL + (config.url || ""), config.params ?? config.data);
    return config;
  });
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      // console.error("❌", err.config?.method?.toUpperCase(), err.config?.url, err.response?.status, err.response?.data);
      return Promise.reject(err);
    }
  );
}

export default api;
