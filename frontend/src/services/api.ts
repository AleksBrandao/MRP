// src/services/api.ts
import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const ComponentesAPI = {
  list: () => api.get("/componentes/"),
  create: (data: any) => api.post("/componentes/", data), // tipo forçado no backend
  update: (id: number, data: any) => api.put(`/componentes/${id}/`, data),
  remove: (id: number) => api.delete(`/componentes/${id}/`),
};

export const MateriasPrimasAPI = {
  list: () => api.get("/materias-primas/"),
  create: (data: any) => api.post("/materias-primas/", data),
  update: (id: number, data: any) => api.put(`/materias-primas/${id}/`, data),
  remove: (id: number) => api.delete(`/materias-primas/${id}/`),
};

// BOM permanece
export const ListasTecnicasAPI = {
  list: () => api.get("/listas-tecnicas/"),
  create: (data: any) => api.post("/listas-tecnicas/", data),
  update: (id: number, data: any) => api.put(`/listas-tecnicas/${id}/`, data),
  remove: (id: number) => api.delete(`/listas-tecnicas/${id}/`),
};

export const BOMAPI = {
  tree: (produtoId: number) => api.get(`/listas-tecnicas/${produtoId}/tree/`),
};

export default api;
