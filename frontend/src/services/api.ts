// frontend/src/services/api.ts

// ⚠️ IMPORTANTE: seu http.ts deve fazer *default export*.
//   Ex.: export default axios.create({ baseURL: ... })
import api from "./http";

// ===== Tipos auxiliares (opcionais) =====
export type Paged<T> = { count: number; next?: string | null; previous?: string | null; results: T[] };
type MaybePaged<T> = Paged<T> | T[];

// Normaliza respostas paginadas e não paginadas
export function extractResults<T>(data: MaybePaged<T>): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as any).results)) return (data as any).results;
  return [] as T[];
}

/** ============================
 *  COMPONENTES (Produto.tipo="componente")
 *  ============================ */
export type Componente = {
  id: number;
  codigo: string;
  nome: string;
  fabricante?: string;
  codigo_fabricante?: string;
  unidade?: string;
  estoque?: number;
  lead_time?: number;
  tipo: "componente";
};

export const ComponenteAPI = {
  list:   (params?: any) => api.get<MaybePaged<Componente>>("/componentes/", { params }),
  create: (data: Partial<Componente>) =>
    api.post<Componente>("/componentes/", { ...data, tipo: "componente" }),
  update: (id: number, data: Partial<Componente>) =>
    api.put<Componente>(`/componentes/${id}/`, { ...data, tipo: "componente" }),
  remove: (id: number) => api.delete<void>(`/componentes/${id}/`),
};

/** ============================
 *  LISTA TÉCNICA
 *  ============================ */
export type ListaTecnica = {
  id: number;
  nome: string;
  codigo?: string;
  tipo?: string;
};

export const ListaTecnicaAPI = {
  list:   (params?: any) => api.get<MaybePaged<ListaTecnica>>("/listas-tecnicas/", { params }),
  create: (data: Partial<ListaTecnica>) => api.post<ListaTecnica>("/listas-tecnicas/", data),
  update: (id: number, data: Partial<ListaTecnica>) =>
    api.put<ListaTecnica>(`/listas-tecnicas/${id}/`, data),
  remove: (id: number) => api.delete<void>(`/listas-tecnicas/${id}/`),
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
  list:   (params?: any) => api.get<MaybePaged<OrdemProducao>>("/ordens/", { params }),
  create: (data: { lista: number; quantidade: number; data_entrega: string }) =>
    api.post<OrdemProducao>("/ordens/", data),
  update: (id: number, data: Partial<{ lista: number; quantidade: number; data_entrega: string }>) =>
    api.put<OrdemProducao>(`/ordens/${id}/`, data),
  remove: (id: number) => api.delete<void>(`/ordens/${id}/`),
};

/** ============================
 *  BOM (LEGADO) — mantém p/ compatibilidade
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
  list:   (params?: any) => api.get<MaybePaged<BOMItem>>("/bom/", { params }),
  create: (data: BOMCreatePayload) => api.post<BOMItem>("/bom/", data),
  update: (id: number, data: BOMUpdatePayload) => api.put<BOMItem>(`/bom/${id}/`, data),
  remove: (id: number) => api.delete<void>(`/bom/${id}/`),

  // helpers antigos
  listas:      (params?: any) => api.get<MaybePaged<ListaTecnica>>("/listas-tecnicas/", { params }),
  componentes: (params?: any) => api.get<MaybePaged<Componente>>("/componentes/", { params }),
};

/** ============================
 *  BOM FLAT (listagem consolidada)
 *  ============================ */
export const BOMFlatAPI = {
  list: (params?: { lista_id?: number | string; search?: string }) =>
    api.get<MaybePaged<any>>("/bom-flat/", { params }),
};

/** ============================
 *  NOVOS RECURSOS — Sublistas e Componentes
 *  ============================ */
export type BOMSublista = {
  id: number;
  lista_pai: number;
  sublista: number;
  lista_pai_nome?: string;
  sublista_nome?: string;
};

export const BOMSublistasAPI = {
  list:   (params?: any) => api.get<MaybePaged<BOMSublista>>("/bom-sublistas/", { params }),
  create: (data: { lista_pai: number; sublista: number }) =>
    api.post<BOMSublista>("/bom-sublistas/", data),
  update: (id: number, data: Partial<{ lista_pai: number; sublista: number }>) =>
    api.patch<BOMSublistas>(`/bom-sublistas/${id}/`, data),
  remove: (id: number) => api.delete<void>(`/bom-sublistas/${id}/`),
};

export type BOMComponente = {
  id: number;
  lista_pai: number;
  componente: number;
  quantidade: number;       // ⚠️ se o backend já migrou, pode ser quant_ponderada
  ponderacao: number;       // ⚠️ alinhar com backend (ponderacao/ponderacao_operacao)
  comentarios?: string;
  // campos derivados (opcional)
  lista_pai_nome?: string;
  componente_nome?: string;
  componente_codigo?: string;
};

export const BOMComponentesAPI = {
  list:   (params?: any) => api.get<MaybePaged<BOMComponente>>("/bom-componentes/", { params }),
  create: (data: {
    lista_pai: number;
    componente: number;
    quantidade: number;
    ponderacao: number;
    comentarios?: string;
    tipo_revisao?: string;     // 👈 adicionado
  }) => api.post<BOMComponente>("/bom-componentes/", data),
  update: (id: number, data: Partial<{
    lista_pai: number;
    componente: number;
    quantidade: number;
    ponderacao: number;
    comentarios?: string;
    tipo_revisao?: string;     // 👈 adicionado
  }>) => api.patch<BOMComponente>(`/bom-componentes/${id}/`, data),
  remove: (id: number) => api.delete<void>(`/bom-componentes/${id}/`),
};

/** ============================
 *  HELPERS usados pelos Selects assíncronos
 *  ============================ */
export const fetchListasTecnicas = (params?: { search?: string; page?: number; page_size?: number }) =>
  api.get<MaybePaged<ListaTecnica>>("/listas-tecnicas/", { params });

export const fetchProdutosComponentes = (params?: { search?: string; page?: number; page_size?: number }) =>
  // Se seu backend separa em /componentes/, mantenha esta linha:
  api.get<MaybePaged<Componente>>("/componentes/", { params });
//  Ou, se ainda usa /produtos/?tipo=componente, troque para:
//  api.get<MaybePaged<Componente>>("/produtos/", { params: { ...params, tipo: "componente" } });

/** ============================
 *  Interceptor (útil no dev; desative em produção)
 *  ============================ */
api.interceptors.request.use((config) => {
  // console.log("➡️", config.method?.toUpperCase(), config.url, config.params ?? config.data);
  return config;
});
