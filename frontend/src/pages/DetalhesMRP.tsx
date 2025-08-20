import { useEffect, useMemo, useState } from "react";
import api from "../services/http";

// ===== Tipos =====
interface Detalhe {
  ordem_producao?: string | null;
  produto_final?: string | null;
  qtd_produto?: number | string | null;
  qtd_componente_por_unidade?: number | string | null;
  qtd_necessaria?: number | string | null;
}

interface ComponenteDetalhado {
  codigo_componente?: string | null;
  nome_componente?: string | null;
  detalhes?: Detalhe[] | null;
  total_necessario?: number | string | null;
  em_estoque?: number | string | null;
  faltando?: number | string | null;
}

// ===== Helpers =====
const norm = (v: unknown) => String(v ?? "").toLowerCase();
const label = (codigo?: string | null, nome?: string | null) => {
  const c = String(codigo ?? "").trim();
  const n = String(nome ?? "").trim();
  if (!c && !n) return "—";
  if (c && n) return `[${c}] ${n}`;
  return c ? `[${c}]` : n;
};
const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (v: unknown) =>
  toNum(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildExportUrl = () => {
  const base = import.meta.env.VITE_API_URL ?? "";
  const clean = String(base).replace(/\/+$/, "");
  return `${clean}/exportar-mrp-excel/`;
};

export default function DetalhesMRP() {
  const [dados, setDados] = useState<ComponenteDetalhado[]>([]);
  const [filtroComponente, setFiltroComponente] = useState("");
  const [filtroOP, setFiltroOP] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/mrp/detalhado/");  // ✅ sem repetir /api

        if (!alive) return;
        const arr = Array.isArray(res.data) ? res.data : [];
        setDados(arr);
        setErro(null);
      } catch (e: any) {
        console.error("Erro ao carregar detalhes do MRP:", e);
        setErro("Não foi possível carregar os detalhes do MRP.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const exportar = () => {
    window.open(buildExportUrl(), "_blank");
  };

  const listaFiltrada = useMemo(() => {
    const qComp = norm(filtroComponente);
    const qOP = norm(filtroOP);
    const base = Array.isArray(dados) ? dados : [];

    return base
      .filter((comp) =>
        norm(comp?.nome_componente).includes(qComp) ||
        norm(comp?.codigo_componente).includes(qComp)
      )
      .map((comp) => {
        const detalhes = Array.isArray(comp?.detalhes) ? comp.detalhes! : [];
        const detFiltrados = qOP ? detalhes.filter((d) => norm(d?.ordem_producao).includes(qOP)) : detalhes;
        return { ...comp, __detalhesFiltrados: detFiltrados } as any;
      })
      .filter((comp: any) => (qOP ? comp.__detalhesFiltrados.length > 0 : true))
      .sort((a, b) => norm(a?.nome_componente).localeCompare(norm(b?.nome_componente)));
  }, [dados, filtroComponente, filtroOP]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Detalhamento do Cálculo MRP</h1>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={exportar}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📥 Exportar para Excel
        </button>

        {loading && <span className="text-gray-500">Carregando…</span>}
        {erro && <span className="text-red-600">{erro}</span>}
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Filtrar por componente (código ou nome)…"
          value={filtroComponente}
          onChange={(e) => setFiltroComponente(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por OP…"
          value={filtroOP}
          onChange={(e) => setFiltroOP(e.target.value)}
          className="border px-3 py-2 rounded"
        />
      </div>

      {!loading && listaFiltrada.length === 0 && (
        <div className="text-gray-500">Nenhum item encontrado com os filtros aplicados.</div>
      )}

      {listaFiltrada.map((comp: any, i: number) => {
        const detalhesFiltrados = Array.isArray(comp.__detalhesFiltrados)
          ? comp.__detalhesFiltrados
          : (Array.isArray(comp.detalhes) ? comp.detalhes : []);

        return (
          <div key={i} className="mb-6 border rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">
              {label(comp.codigo_componente ?? "", comp.nome_componente ?? "")}
            </h2>

            <div className="flex flex-wrap gap-6 text-sm">
              <p><strong>Total Necessário:</strong> {fmt2(comp.total_necessario)}</p>
              <p><strong>Em Estoque:</strong> {fmt2(comp.em_estoque)}</p>
              <p><strong>Faltando:</strong> <span className="text-red-600">{fmt2(comp.faltando)}</span></p>
            </div>

            <table className="w-full mt-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">OP</th>
                  <th className="border px-2 py-1 text-left">Produto Final</th>
                  <th className="border px-2 py-1 text-right">Qtd OP</th>
                  <th className="border px-2 py-1 text-right">Qtd por Unidade</th>
                  <th className="border px-2 py-1 text-right">Qtd Necessária</th>
                </tr>
              </thead>
              <tbody>
                {detalhesFiltrados.length === 0 ? (
                  <tr>
                    <td className="border px-2 py-3 text-center text-gray-500" colSpan={5}>
                      Sem detalhamento por OP (mostrando apenas os totais acima).
                    </td>
                  </tr>
                ) : (
                  detalhesFiltrados.map((d: any, j: number) => (
                    <tr key={j}>
                      <td className="border px-2 py-1">{d?.ordem_producao ?? "—"}</td>
                      <td className="border px-2 py-1">{d?.produto_final ?? "—"}</td>
                      <td className="border px-2 py-1 text-right">{fmt2(d?.qtd_produto)}</td>
                      <td className="border px-2 py-1 text-right">{fmt2(d?.qtd_componente_por_unidade)}</td>
                      <td className="border px-2 py-1 text-right">{fmt2(d?.qtd_necessaria)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
