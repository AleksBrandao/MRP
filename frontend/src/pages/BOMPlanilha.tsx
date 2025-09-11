// frontend/src/pages/BOMPlanilha.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/http";
import { BOMComponentesAPI, BOMSublistasAPI } from "../services/api";
import ModalEditarComponente from "../components/ModalEditarComponente";
import ModalEditarSublista from "../components/ModalEditarSublista";

type LinhaFlat = {
  // Hierarquia/textos (backend)
  serie_nome?: string | null;
  sistema_nome?: string | null;
  conjunto_nome?: string | null;
  subconjunto_nome?: string | null;
  item_nome?: string | null;

  componente_codigo?: string | null;
  componente_nome?: string | null;

  quantidade?: number | null;
  ponderacao?: number | null;        // percentual (ex: 10)
  quant_ponderada?: number | null;   // quantidade * ponderacao
  comentarios?: string | null;
  tipo_revisao?: string | null;

  // Campos para a coluna Ações
  linha_tipo?: "componente" | "sublista" | null;
  linha_id?: number | null;
  lista_pai_id?: number | null;
  sublista_id?: number | null;
};

type ListParams = {
  search?: string;
  lista_id?: number | string;
  incluir_grupos?: "1" | undefined;
  limit?: number;
};

const BOMFlatAPI = {
  list: (params?: ListParams) => api.get("/bom-flat/", { params }),
};

export default function BOMPlanilha() {
  const [linhas, setLinhas] = useState<LinhaFlat[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState("");
  const [listaId, setListaId] = useState<number | string | undefined>(undefined);
  const [incluirGrupos, setIncluirGrupos] = useState<boolean>(false);

  // estados dos modais
  const [editCompOpen, setEditCompOpen] = useState(false);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [linhaEdit, setLinhaEdit] = useState<LinhaFlat | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaId, incluirGrupos]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params: ListParams = {
        search: search || undefined,
        lista_id: listaId || undefined,
        incluir_grupos: incluirGrupos ? "1" : undefined,
        // limit: 500, // use se o backend suportar
      };

      const { data } = await BOMFlatAPI.list(params);

      // aceita formato lista simples ou paginado { results: [...] }
      const brutas: any[] = (Array.isArray(data) ? data : (data?.results ?? [])) as any[];

      // *** PRESERVAR TODOS OS CAMPOS ***
      // e normalizar nomes caso algum ambiente retorne camelCase
      const linhasComOrigem: LinhaFlat[] = brutas.map((r: any) => ({
        ...r,
        linha_tipo:   r.linha_tipo   ?? r.linhaTipo   ?? null,
        linha_id:     r.linha_id     ?? r.linhaId     ?? null,
        lista_pai_id: r.lista_pai_id ?? r.listaPaiId  ?? null,
        sublista_id:  r.sublista_id  ?? r.sublistaId  ?? null,
      }));

      setLinhas(linhasComOrigem);
    } catch (e: any) {
      console.error("Erro ao carregar BOM flat:", e);
      setErrorMsg(e?.response?.data?.detail || "Erro ao carregar BOM (Planilha).");
    } finally {
      setLoading(false);
    }
  };

  async function excluirLinha(l: LinhaFlat) {
    try {
      if (!l.linha_tipo || !l.linha_id) return;
      if (!confirm(`Confirma excluir esta ${l.linha_tipo}?`)) return;

      if (l.linha_tipo === "componente") {
        await BOMComponentesAPI.remove(l.linha_id);
      } else {
        await BOMSublistasAPI.remove(l.linha_id);
      }
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Erro ao excluir.");
    }
  }

  function editarLinha(l: LinhaFlat) {
    if (!l?.linha_tipo || !l?.linha_id) return;
    setLinhaEdit(l);
    if (l.linha_tipo === "componente") {
      setEditCompOpen(true);
    } else {
      setEditSubOpen(true);
    }
  }

  const linhasFiltradas = useMemo(() => {
    const term = (search || "").trim().toLowerCase();
    if (!term) return linhas;

    // filtro simples por texto em alguns campos (ajuste se quiser)
    return linhas.filter((l) => {
      const combo = [
        l.serie_nome,
        l.sistema_nome,
        l.conjunto_nome,
        l.subconjunto_nome,
        l.item_nome,
        l.componente_codigo,
        l.componente_nome,
        l.tipo_revisao,
        l.comentarios,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return combo.includes(term);
    });
  }, [linhas, search]);

  return (
    <div className="p-4 space-y-4">
      <section className="full-bleed">   {/* 👈 novo wrapper */}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">BOM (Planilha)</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={listaId ?? ""}
            onChange={(e) => setListaId(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Lista ID"
            className="border rounded-lg px-3 py-2 text-sm w-28"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={incluirGrupos}
              onChange={(e) => setIncluirGrupos(e.target.checked)}
            />
            Incluir grupos (sublistas)
          </label>
          <button
            onClick={fetchData}
            className="rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
          >
            Aplicar
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="text-red-600 text-sm border border-red-200 bg-red-50 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border overflow-x-hidden">
        <table className="table-tight w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left whitespace-nowrap">Série</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Sistema</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Conjunto</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Subconjunto</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Item</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Código</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Componente / Grupo</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Qtd</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Ponderação (%)</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Qtd Ponderada</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Tipo Revisão</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Comentários</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={13}>
                  Carregando...
                </td>
              </tr>
            ) : linhasFiltradas.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={13}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              linhasFiltradas.map((l, idx) => (
                <tr key={`${l.linha_tipo ?? "na"}-${l.linha_id ?? idx}-${idx}`} className="border-t">
                  <td className="px-4 py-2">{l.serie_nome ?? ""}</td>
                  <td className="px-4 py-2">{l.sistema_nome ?? ""}</td>
                  <td className="px-4 py-2">{l.conjunto_nome ?? ""}</td>
                  <td className="px-4 py-2">{l.subconjunto_nome ?? ""}</td>
                  <td className="px-4 py-2">{l.item_nome ?? ""}</td>
                  <td className="px-4 py-2">{l.componente_codigo ?? ""}</td>
                  <td className="px-4 py-2">{l.componente_nome ?? ""}</td>
                  <td className="px-4 py-2 text-right">{fmtNumber(l.quantidade)}</td>
                  <td className="px-4 py-2 text-right">{fmtNumber(l.ponderacao)}</td>
                  <td className="px-4 py-2 text-right">{fmtNumber(l.quant_ponderada)}</td>
                  <td className="px-4 py-2">{l.tipo_revisao ?? ""}</td>
                  <td className="px-4 py-2">{l.comentarios ?? ""}</td>

                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {l.linha_tipo && l.linha_id ? (
                      <>
                        <button
                          onClick={() => editarLinha(l)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100"
                          title="Editar"
                        >
                          ✏️ <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          onClick={() => excluirLinha(l)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-red-50 text-red-600"
                          title="Excluir"
                        >
                          🗑️ <span className="hidden sm:inline">Excluir</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modais */}
      <ModalEditarComponente
        open={editCompOpen}
        onClose={() => { setEditCompOpen(false); setLinhaEdit(null); }}
        onSaved={fetchData}
        linha={{
          linha_id: linhaEdit?.linha_id as number,
          quantidade: linhaEdit?.quantidade,
          ponderacao: linhaEdit?.ponderacao,
          tipo_revisao: linhaEdit?.tipo_revisao,
          comentarios: linhaEdit?.comentarios,
          componente_nome: linhaEdit?.componente_nome,
          componente_codigo: linhaEdit?.componente_codigo,
        }}
      />

      <ModalEditarSublista
        open={editSubOpen}
        onClose={() => { setEditSubOpen(false); setLinhaEdit(null); }}
        onSaved={fetchData}
        linha={{
          linha_id: linhaEdit?.linha_id as number,
          sublista_id: linhaEdit?.sublista_id,
          lista_pai_id: linhaEdit?.lista_pai_id,
        }}
      />
      </section>
    </div>
  );
}

/** Util: formata número simples (sem locale para não “quebrar” CSV/edição).
 *  Ajuste para Intl.NumberFormat se preferir.
 */
function fmtNumber(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return r.toFixed(2); // "6.80", "4.20", etc.
}
