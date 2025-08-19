// api.ts
import api from "./http"; // ✅ Essa linha estava faltando!


export const ComponenteAPI = {
  list: () => api.get("/produtos/"),
  create: (data) => api.post("/produtos/", { ...data, tipo: "produto" }),
  update: (id, data) => api.put(`/produtos/${id}/`, { ...data, tipo: "produto" }),
  remove: (id) => api.delete(`/produtos/${id}/`),
};

export const ListaTecnicaAPI = {
  list: () => api.get("/listas-tecnicas/"),
  create: (data) => api.post("/listas-tecnicas/", { ...data, tipo: "lista" }),
  update: (id, data) => api.put(`/listas-tecnicas/${id}/`, { ...data, tipo: "lista" }),
  remove: (id) => api.delete(`/listas-tecnicas/${id}/`),
};
