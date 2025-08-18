// src/services/api.ts
import axios from "axios";

/**
 * Base URL:
 * - Use VITE_API_URL (ex.: "https://...app.github.dev/api" ou "http://localhost:8000/api")
 * - Se vier sem "/api", adicionamos automaticamente.
 */
const RAW_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const BASE_URL = RAW_BASE.endsWith("/api")
  ? RAW_BASE.replace(/\/+$/, "/api") // normaliza barras múltiplas
  : RAW_BASE.replace(/\/+$/, "") + "/api";

export const api = axios.create({ baseURL: BASE_URL });
export const http = api; // alias, caso prefira importar como http

/**
 * Normaliza resposta (array direto ou paginada do DRF: {results: [...]})
 */
export const normalize = <T = any>(data: any): T[] =>
  Array.isArray(data) ? data : data?.results ?? [];

/* =========================
   Recursos / Endpoints
========================= */

// Produtos (todos os itens cadastrados; útil para selects)
export const ProdutosAPI = {
  list: () => api.get("/produtos/"),
  // create/update/remove opcionais, caso precise:
  create: (data: any) => api.post("/produtos/", data),
  update: (id: number, data: any) => api.put(`/produtos/${id}/`, data),
  remove: (id: number) => api.delete(`/produtos/${id}/`),
};

// Componentes (separado, se você mantém endpoint dedicado)
export const ComponentesAPI = {
  list: () => api.get("/componentes/"),
  create: (data: any) => api.post("/componentes/", data), // tipo forçado no backend
  update: (id: number, data: any) => api.put(`/componentes/${id}/`, data),
  remove: (id: number) => api.delete(`/componentes/${id}/`),
};

// Matérias-Primas (separado, se você mantém endpoint dedicado)
export const MateriasPrimasAPI = {
  list: () => api.get("/materias-primas/"),
  create: (data: any) => api.post("/materias-primas/", data),
  update: (id: number, data: any) => api.put(`/materias-primas/${id}/`, data),
  remove: (id: number) => api.delete(`/materias-primas/${id}/`),
};

// Listas Técnicas (BOM) — caso você exponha como /listas-tecnicas/
export const ListasTecnicasAPI = {
  list: () => api.get("/listas-tecnicas/"),
  create: (data: any) => api.post("/listas-tecnicas/", data),
  update: (id: number, data: any) => api.put(`/listas-tecnicas/${id}/`, data),
  remove: (id: number) => api.delete(`/listas-tecnicas/${id}/`),
};

// BOM “clássico” — se você também mantém /bom/ em paralelo
export const BOMAPI = {
  list: () => api.get("/bom/"),
  create: (data: { produto_pai: number; componente: number; quantidade: number }) =>
    api.post("/bom/", data),
  update: (id: number, data: { produto_pai: number; componente: number; quantidade: number }) =>
    api.put(`/bom/${id}/`, data), // ✅ necessário pro Editar/Salvar
  remove: (id: number) => api.delete(`/bom/${id}/`),
  tree: (produtoId: number) => api.get(`/bom/${produtoId}/tree/`),
};

export default api;
