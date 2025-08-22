// services/api.ts
import api from "./http";

// export const ComponenteAPI = {
//   list: () => api.get("/produtos/"),
//   create: (data) => api.post("/produtos/", data),            // ← não envia tipo
//   update: (id, data) => api.put(`/produtos/${id}/`, data),   // ← não envia tipo
//   remove: (id) => api.delete(`/produtos/${id}/`),
// };


export const ComponenteAPI = {
  list:   () => api.get("/componentes/"),
  create: (data: any) => api.post("/componentes/", { ...data, tipo: "componente" }),
  update: (id: number, data: any) => api.put(`/componentes/${id}/`, { ...data, tipo: "componente" }),
  remove: (id: number) => api.delete(`/componentes/${id}/`),
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


// ====== NOVO: Tipos ======
// ...restante do arquivo

// Final, corrigido e completo
export type BOMItem = {
  id?: number;
  lista_pai: number;
  sublista?: number | null;
  componente: number;
  quantidade: number;
  ponderacao_operacao: number;
  quant_ponderada?: number;
  comentarios?: string;
  lista_pai_codigo?: string;
  lista_pai_nome?: string;
  sublista_codigo?: string;
  sublista_nome?: string;
  componente_codigo?: string;
  componente_nome?: string;
};

export  type BOMCreatePayload = Omit<BOMItem, "id" | "quant_ponderada" | "lista_pai_codigo" | "lista_pai_nome" | "sublista_codigo" | "sublista_nome" | "componente_codigo" | "componente_nome">;
type BOMUpdatePayload = Partial<BOMCreatePayload>;

export const BOMAPI = {
  list: () => api.get<BOMItem[]>("/bom/"),
  create: (data: BOMCreatePayload) => api.post("/bom/", data),
  update: (id: number, data: BOMUpdatePayload) => api.put(`/bom/${id}/`, data),
  remove: (id: number) => api.delete(`/bom/${id}/`),
  listas: () => api.get("/listas-tecnicas/"),
  componentes: () => api.get("/componentes/"),
};

api.interceptors.request.use((config) => {
  console.log("🚀 Enviando para backend:", config.data);
  return config;
});