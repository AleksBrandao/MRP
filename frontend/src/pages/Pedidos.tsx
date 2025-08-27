// src/pages/Pedidos.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/http";

type LinhaPedido = {
  pedido_num: string;
  pieza: string;
  qty: number;
  ord_qty: number;
  recv_qty: number;
  fornecedor: string;
  org: string;
  data_prevista: string | null;
};

type ApiResp = { count: number; results: LinhaPedido[] };

const CLIENT_PAGE = 50;               // itens por página (no cliente)
const LIMIT_OPTS = [50, 100, 200, 500];

export default function Pedidos() {
  console.log("🧭 Pedidos page mounted");
  // Filtros
  const [pieza, setPieza] = useState("");
  const [org, setOrg] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);

  // Ordenação (server-side)
  const [sortBy, setSortBy] = useState<string>("pieza");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dados e estado
  const [rows, setRows] = useState<LinhaPedido[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Paginação no cliente
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / CLIENT_PAGE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageSlice = useMemo(() => {
    const start = (page - 1) * CLIENT_PAGE;
    return rows.slice(start, start + CLIENT_PAGE);
  }, [rows, page]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("sort_by", sortBy);
    p.set("sort_dir", sortDir);
    if (pieza.trim()) p.set("pieza", pieza.trim());
    if (org.trim()) p.set("org", org.trim());
    if (fornecedor.trim()) p.set("fornecedor", fornecedor.trim());
    if (search.trim()) p.set("search", search.trim());
    return p;
  }, [limit, sortBy, sortDir, pieza, org, fornecedor, search]);

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get<ApiResp>(`/pedidos/?${params.toString()}`);
      setRows(data?.results ?? []);
      setTotal(data?.count ?? 0);
      setPage(1);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erro ao carregar pedidos");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Carrega automaticamente na primeira abertura
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
    fetchData();
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/pedidos/upload/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      await fetchData();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erro no upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pedidos (com filtros & paginação)</h1>

      {/* Filtros (sempre visíveis) */}
      <div className="flex flex-wrap items-end gap-3">
        <input className="w-[240px] rounded-md border px-3 py-2 text-sm"
               placeholder="Pieza" value={pieza} onChange={(e) => setPieza(e.target.value)} />
        <input className="w-[200px] rounded-md border px-3 py-2 text-sm"
               placeholder="ORG" value={org} onChange={(e) => setOrg(e.target.value)} />
        <input className="w-[220px] rounded-md border px-3 py-2 text-sm"
               placeholder="Fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
        <input className="flex-1 min-w-[260px] rounded-md border px-3 py-2 text-sm"
               placeholder="Busca livre" value={search} onChange={(e) => setSearch(e.target.value)} />

        <select className="rounded-md border px-3 py-2 text-sm"
                value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          { [50,100,200,500].map(n => <option key={n} value={n}>limit {n}</option>) }
        </select>

        <button onClick={fetchData} className="px-4 py-2 rounded-md bg-black text-white text-sm" disabled={loading}>
          Buscar
        </button>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                 onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
          Upload arquivo
        </label>
      </div>

      {/* Resumo */}
      <div className="text-sm text-gray-600">
        Total (resposta): <strong>{total.toLocaleString("pt-BR")}</strong>
        <span className="ml-3">Mostrando {pageSlice.length} itens (paginados no cliente)</span>
      </div>

      {/* Tabela */}
      <div className="overflow-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th label="Pedido" col="pedido_num" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <Th label="Pieza" col="pieza" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <Th label="Em Pedido" col="qty" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
              <Th label="Qtd Pedida" col="ord_qty" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
              <Th label="Qtd Recebida" col="recv_qty" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
              <Th label="Fornecedor" col="fornecedor" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <Th label="Org" col="org" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <Th label="Data Prevista" col="data_prevista" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-2">{r.pedido_num || "-"}</td>
                <td className="px-2 py-2 font-medium">{r.pieza}</td>
                <td className="px-2 py-2 text-right">{(r.qty ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-2 py-2 text-right">{(r.ord_qty ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-2 py-2 text-right">{(r.recv_qty ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-2 py-2">{r.fornecedor || "-"}</td>
                <td className="px-2 py-2">{r.org || "-"}</td>
                <td className="px-2 py-2">{r.data_prevista ?? "-"}</td>
              </tr>
            ))}
            {pageSlice.length === 0 && !loading && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={8}>Nenhum registro encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação (cliente) */}
      <div className="flex items-center gap-3">
        <button className="px-3 py-1 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!canPrev || loading}>
          ◀ Anterior
        </button>
        <span className="text-sm">
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>
        <button className="px-3 py-1 rounded-md border text-sm disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={!canNext || loading}>
          Próxima ▶
        </button>

        {loading && <span className="ml-2 text-sm text-gray-500">Carregando…</span>}
        {err && <span className="ml-4 text-sm text-red-600">Erro: {err}</span>}
      </div>
    </div>
  );
}

function Th({
  label, col, sortBy, sortDir, onSort, align = "left",
}: {
  label: string;
  col: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (c: string) => void;
  align?: "left" | "right" | "center";
}) {
  const isActive = sortBy === col;
  const arrow = isActive ? (sortDir === "asc" ? "▲" : "▼") : " ";
  const base = "px-2 py-2 text-xs font-semibold text-gray-700 select-none";
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`${base} ${alignClass} cursor-pointer hover:underline`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">{label} <span className="text-gray-400">{arrow}</span></span>
    </th>
  );
}
