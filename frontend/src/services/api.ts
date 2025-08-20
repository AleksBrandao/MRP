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

export type OrdemProducao = {
  id: number;
  lista: number;           // id da lista técnica
  lista_nome: string;      // ex.: "8500 (SÉRIE)"
  lista_codigo: string;    // ex.: "8500"
  quantidade: number;
  data_entrega: string;    // 'YYYY-MM-DD'
};

export const OrdemAPI = {
  list: () => api.get<OrdemProducao[]>("/ordens/"),
  create: (data: { lista: number; quantidade: number; data_entrega: string }) =>
    api.post("/ordens/", data),

  update: (id: number, data: Partial<{ lista: number; quantidade: number; data_entrega: string }>) =>
    api.put(`/ordens/${id}/`, data),

  remove: (id: number) => api.delete(`/ordens/${id}/`),
};

// ===== BOM =====
export type BOMCreatePayload = {
  lista_pai: number;
  componente: number;
  quantidade: number;
};

export const BOMAPI = {
  list: () => api.get("/bom/"),
  create: (data: BOMCreatePayload) => api.post("/bom/", data),
  update: (id: number, data: BOMCreatePayload) => api.put(`/bom/${id}/`, data),
  remove: (id: number) => api.delete(`/bom/${id}/`),
  tree: (listaId: number) => api.get(`/bom/${listaId}/tree/`),
};