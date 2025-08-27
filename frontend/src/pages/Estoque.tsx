import { useEffect, useMemo, useState } from "react";

// Use base URL relativa ou via VITE_API_URL (se já usar no projeto)
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "";

type EstoqueRow = {
  org: string;
  warehouse?: string;
  pieza: string;
  descricao?: string;
  bis_qty?: number;
  preco_medio?: number;
  nivel_qtdoc?: number;
  lead_time_dias?: number | null;
  // extras possíveis
  uso?: string;
  classificacao?: string;
  familia?: string;
  reparable?: number | null;
};

type ApiResponse = {
  count: number;
  results: EstoqueRow[];
};

export default function Estoque() {
  // filtros
  const [pieza, setPieza] = useState("");
  const [org, setOrg] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [search, setSearch] = useState("");

  // server limit (quanto o backend retorna por chamada)
  const [limit, setLimit] = useState(200);

  // dados
  const [rows, setRows] = useState<EstoqueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // paginação local (cliente)
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const queryAndLoad = async () => {
    setLoading(true);
    setErrorMsg(null);
    setPage(1);
    try {
      const params = new URLSearchParams();
      if (pieza.trim()) params.set("pieza", pieza.trim());
      if (org.trim()) params.set("org", org.trim());
      if (warehouse.trim()) params.set("warehouse", warehouse.trim());
      if (search.trim()) params.set("search", search.trim());
      if (limit) params.set("limit", String(limit));

      const url = `${API_BASE}/estoque/?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.detail || `Falha ao buscar estoque (HTTP ${res.status})`
        );
      }
      const data: ApiResponse = await res.json();
      setRows(data.results || []);
      setTotal(data.count || (data.results ? data.results.length : 0));
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro inesperado");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // carregamento inicial (sem filtros)
    queryAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // upload opcional do arquivo de estoque
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/estoque/upload/`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.detail || `Falha no upload (HTTP ${res.status})`
        );
      }
      // recarrega lista após upload
      await queryAndLoad();
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Estoque</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="Pieza (ex: ALS-101001)"
          value={pieza}
          onChange={(e) => setPieza(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="ORG (ex: CPTM)"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Warehouse"
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Busca livre (descrição, família, etc.)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          title="Quantas linhas o servidor retorna por requisição"
        >
          {[100, 200, 500, 1000].map((n) => (
            <option key={n} value={n}>
              limit {n}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={queryAndLoad}
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Carregando..." : "Buscar"}
          </button>
          <label className="px-4 py-2 rounded border cursor-pointer hover:bg-gray-50">
            {uploading ? "Enviando..." : "Upload arquivo"}
            <input
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0] || null)}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Status / Erros */}
      <div className="mb-3 text-sm text-gray-600">
        <span className="mr-4">Total (resposta): {total}</span>
        <span>Mostrando {rows.length} itens (paginados no cliente)</span>
      </div>
      {errorMsg && (
        <div className="mb-3 text-red-600 text-sm">Erro: {errorMsg}</div>
      )}

      {/* Tabela */}
      <div className="overflow-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 border-b">ORG</th>
              <th className="px-3 py-2 border-b">Warehouse</th>
              <th className="px-3 py-2 border-b">Pieza</th>
              <th className="px-3 py-2 border-b">Descrição</th>
              <th className="px-3 py-2 border-b">Bis Qty</th>
              <th className="px-3 py-2 border-b">Preço Médio</th>
              <th className="px-3 py-2 border-b">Qtd (NIVEL_QTDOC)</th>
              <th className="px-3 py-2 border-b">Lead Time (d)</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr key={`${r.org}-${r.pieza}-${i}`} className="odd:bg-white even:bg-gray-50">
                <td className="px-3 py-2 border-b">{r.org}</td>
                <td className="px-3 py-2 border-b">{r.warehouse || "-"}</td>
                <td className="px-3 py-2 border-b font-medium">{r.pieza}</td>
                <td className="px-3 py-2 border-b">{r.descricao || "-"}</td>
                <td className="px-3 py-2 border-b text-right">{r.bis_qty ?? "-"}</td>
                <td className="px-3 py-2 border-b text-right">{r.preco_medio ?? "-"}</td>
                <td className="px-3 py-2 border-b text-right">{r.nivel_qtdoc ?? "-"}</td>
                <td className="px-3 py-2 border-b text-right">
                  {r.lead_time_dias ?? "-"}
                </td>
              </tr>
            ))}

            {!loading && pagedRows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação local */}
      <div className="flex items-center gap-2 mt-4">
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ◀ Anterior
        </button>
        <span className="text-sm">
          Página {page} de {pageCount}
        </span>
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={page >= pageCount}
        >
          Próxima ▶
        </button>
      </div>
    </div>
  );
}
