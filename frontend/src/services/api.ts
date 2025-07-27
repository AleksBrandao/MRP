import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api", // ajuste se usar ngrok ou IP da rede local
});

export default api;
