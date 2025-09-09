// frontend/src/services/api.ts
// Se o seu http.ts exporta NOMEADO:   export const api = axios.create(...)
// use esta linha:
import api from "./http";
// Se ele exporta DEFAULT:              export default api
// troque a linha acima por:  import api from "./http";

/** ============================
 *  COMPONENTES (Produto.tipo="componente")
 *  ============================ */
export const ComponenteAPI = {
  list:   (params?: any) => api.get("/componentes/", { params }),
  create: (data: any)     => api.post("/componentes/", { ...data, tipo: "componente" }),
  update: (id: number, data: any) =>
    api.put(`/componentes/${id}/`, { ...data, tipo: "componente" }),
  remove: (id: number)    => api.delete(`/componentes/${id}/`),
};

/** ============================
 *  LISTA TÉCNICA
 *  ============================ */
export const ListaTecnicaAPI = {
  list:   (params?: any) => api.get("/listas-tecnicas/", { params }),
  create: (data: any)    => api.post("/listas-tecnicas/", data),
  update: (id: number, data: any) =>
    api.put(`/listas-tecnicas/${id}/`, data),
  remove: (id: number)   => api.delete(`/listas-tecnicas/${id}/`),
};

/** ============================
 *  ORDENS DE PRODUÇÃO
 *  ============================ */
export type OrdemProducao = {
  id: number;
  lista: number;        // id da lista técnica
  lista_nome: string;   // ex.: "8500 (SÉRIE)"
  lista_codigo: string; // ex.: "8500"
  quantidade: number;
  data_entrega: string; // 'YYYY-MM-DD'
};

export const OrdemAPI = {
  list:   (params?: any) => api.get<OrdemProducao[]>("/ordens/", { params }),
  create: (data: { lista: number; quantidade: number; data_entrega: string }) =>
    api.post("/ordens/", data),

  update: (id: number, data: Partial<{ lista: number; quantidade: number; data_entrega: string }>) =>
    api.put(`/ordens/${id}/`, data),

  remove: (id: number) => api.delete(`/ordens/${id}/`),
};

/** ============================
 *  BOM (LEGADO) — mantém p/ compatibilidade,
 *  mas o novo fluxo usa BOMSublistas/BOMComponentes
 *  ============================ */
export type BOMItem = {
  id?: number;
  lista_pai: number;
  sublista?: number | null; // LEGADO
  componente: number;       // LEGADO
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

export type BOMCreatePayload = Omit<
  BOMItem,
  "id" | "quant_ponderada" |
  "lista_pai_codigo" | "lista_pai_nome" |
  "sublista_codigo" | "sublista_nome" |
  "componente_codigo" | "componente_nome"
>;
export type BOMUpdatePayload = Partial<BOMCreatePayload>;

export const BOMAPI = {
  list:   (params?: any) => api.get<BOMItem[]>("/bom/", { params }),
  create: (data: BOMCreatePayload) => api.post("/bom/", data),
  update: (id: number, data: BOMUpdatePayload) => api.put(`/bom/${id}/`, data),
  remove: (id: number) => api.delete(`/bom/${id}/`),

  // helpers antigos
  listas:      (params?: any) => api.get("/listas-tecnicas/", { params }),
  componentes: (params?: any) => api.get("/componentes/", { params }),
};

/** ============================
 *  BOM FLAT (seu endpoint de listagem consolidada)
 *  ============================ */
export const BOMFlatAPI = {
  list: (params?: { lista_id?: number | string; search?: string }) =>
    api.get("/bom-flat/", { params }),
};

/** ============================
 *  NOVOS RECURSOS — Sublistas e Componentes separados
 *  ============================ */
export const BOMSublistasAPI = {
  list:   (params?: any) => api.get("/bom-sublistas/", { params }), // aceita ?lista_pai=
  create: (data: { lista_pai: number; sublista: number }) =>
    api.post("/bom-sublistas/", data),
  remove: (id: number) => api.delete(`/bom-sublistas/${id}/`),
};

export const BOMComponentesAPI = {
  list:   (params?: any) => api.get("/bom-componentes/", { params }), // aceita ?lista_pai= e ?componente=
  create: (data: {
    lista_pai: number;
    componente: number;
    quantidade: number;
    ponderacao: number;
    comentarios?: string;
  }) => api.post("/bom-componentes/", data),
  update: (id: number, data: Partial<{
    lista_pai: number;
    componente: number;
    quantidade: number;
    ponderacao: number;
    comentarios?: string;
  }>) => api.patch(`/bom-componentes/${id}/`, data),
  remove: (id: number) => api.delete(`/bom-componentes/${id}/`),
};

/** ============================
 *  HELPERS usados pelos Selects assíncronos
 *  ============================ */
export const fetchListasTecnicas = (params?: { search?: string; page?: number; page_size?: number }) =>
  api.get("/listas-tecnicas/", { params });

export const fetchProdutosComponentes = (params?: { search?: string; page?: number; page_size?: number }) =>
  // Se seu backend separa em /componentes/, troque a linha abaixo por:
  // api.get("/componentes/", { params });
  api.get("/produtos/", { params: { ...params, tipo: "componente" } });

/** ============================
 *  Interceptor (útil no dev; desative em produção)
 *  ============================ */
api.interceptors.request.use((config) => {
  // console.log("🚀 Enviando para backend:", config.method, config.url, config.params ?? config.data);
  return config;
});
