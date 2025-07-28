import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ajuste se usar ngrok ou IP da rede local
});

export default api;
