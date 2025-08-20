// services/api.ts
import api from "./http";

export const ComponenteAPI = {
  list: () => api.get("/produtos/"),
  create: (data) => api.post("/produtos/", data),            // ← não envia tipo
  update: (id, data) => api.put(`/produtos/${id}/`, data),   // ← não envia tipo
  remove: (id) => api.delete(`/produtos/${id}/`),
};

export const ListaTecnicaAPI = {
  list: () => api.get("/listas-tecnicas/"),
  create: (data: any) => api.post("/listas-tecnicas/", data),          // ✅ sem sobrescrever
  update: (id: number, data: any) => api.put(`/listas-tecnicas/${id}/`, data), // ✅
  remove: (id: number) => api.delete(`/listas-tecnicas/${id}/`),
};
