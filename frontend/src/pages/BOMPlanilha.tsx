// frontend/src/pages/BOMPlanilha.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/http";
import { BOMComponentesAPI, BOMSublistasAPI } from "../services/api";
import ModalEditarComponente from "../components/ModalEditarComponente";
import ModalEditarSublista from "../components/ModalEditarSublista";

type LinhaFlat = {
  // Hierarquia/textos
  serie_nome?: string | null;
  sistema_nome?: string | null;
  conjunto_nome?: string | null;
  subconjunto_nome?: string | null;
  item_nome?: string | null;

  componente_codigo?: string | null;
  componente_nome?: string | null;

  quantidade?: number | string | null;
  ponderacao?: number | string | null;
  quant_ponderada?: number | string | null;

  tipo_revisao?: string | null;
  comentarios?: string | null;

  // metadados p/ ações
  linha_tipo?: "componente" | "sublista" | null;
  linha_id?: number | null;
  lista_pai_id?: number | null;
  sublista_id?: number | null;

  // possíveis fallbacks
  serie?: string | null;
  sistema?: string | null;
  conjunto?: string | null;
  subconjunto?: string | null;
  item?: string | null;
  codigo?: string | null;
  componente?: string | null;
  qtd_ponderada?: number | string | null; // variação
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

// =====================
// Normalização robusta
// =====================
function normalize(s: any): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")           // remove acentos (combining marks)
    .replace(/[\u00A0\u2000-\u200D\u2060]/g, " ") // NBSP/zero-width -> espaço
    .replace(/\s+/g, " ")                      // colapsa espaços
    .trim()
    .toLowerCase();
}

// devolve o 1º campo não-vazio entre as chaves
function getStr(l: any, keys: string[]) {
  for (const k of keys) {
    const v = l?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
}

// força número mesmo que venha string; aceita vírgula
function getNum(l: any, keys: string[]) {
  const raw = getStr(l, keys);
  if (raw === "") return NaN;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function inRange(val: number, minStr: string, maxStr: string) {
  const hasMin = minStr !== "";
  const hasMax = maxStr !== "";
  const min = hasMin ? Number(minStr) : -Infinity;
  const max = hasMax ? Number(maxStr) : Infinity;
  if (Number.isNaN(val)) return !hasMin && !hasMax;
  return val >= min && val <= max;
}

// debounce simples
function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function BOMPlanilha() {
  const [linhas, setLinhas] = useState<LinhaFlat[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros globais/controle
  const [search, setSearch] = useState("");
  const [listaId, setListaId] = useState<number | string | undefined>(undefined);
  const [incluirGrupos, setIncluirGrupos] = useState<boolean>(false);

  // modais
  const [editCompOpen, setEditCompOpen] = useState(false);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [linhaEdit, setLinhaEdit] = useState<LinhaFlat | null>(null);

  // filtros por coluna (texto)
  const [fSerie, setFSerie] = useState("");
  const [fSistema, setFSistema] = useState("");
  const [fConjunto, setFConjunto] = useState("");
  const [fSubconjunto, setFSubconjunto] = useState("");
  const [fItem, setFItem] = useState("");
  const [fCodigo, setFCodigo] = useState("");
  const [fComponente, setFComponente] = useState("");
  const [fTipoRev, setFTipoRev] = useState("");
  const [fComentarios, setFComentarios] = useState("");

  // filtros por coluna (numéricos)
  const [fQtdMin, setFQtdMin] = useState<string>("");
  const [fQtdMax, setFQtdMax] = useState<string>("");
  const [fPondMin, setFPondMin] = useState<string>("");
  const [fPondMax, setFPondMax] = useState<string>("");
  const [fQtdPondMin, setFQtdPondMin] = useState<string>("");
  const [fQtdPondMax, setFQtdPondMax] = useState<string>("");

  // debounce
  const dSerie = useDebounced(fSerie);
  const dSistema = useDebounced(fSistema);
  const dConjunto = useDebounced(fConjunto);
  const dSubconjunto = useDebounced(fSubconjunto);
  const dItem = useDebounced(fItem);
  const dCodigo = useDebounced(fCodigo);
  const dComponente = useDebounced(fComponente);
  const dTipoRev = useDebounced(fTipoRev);
  const dComentarios = useDebounced(fComentarios);
  const dQtdMin = useDebounced(fQtdMin);
  const dQtdMax = useDebounced(fQtdMax);
  const dPondMin = useDebounced(fPondMin);
  const dPondMax = useDebounced(fPondMax);
  const dQtdPondMin = useDebounced(fQtdPondMin);
  const dQtdPondMax = useDebounced(fQtdPondMax);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params: ListParams = {
        search: search || undefined,
        lista_id: listaId || undefined,
        incluir_grupos: incluirGrupos ? "1" : undefined,
        limit: 1000,
      };
      const resp = await BOMFlatAPI.list(params);
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setLinhas(data);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Erro ao carregar a planilha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (l.linha_tipo === "componente") setEditCompOpen(true);
    else setEditSubOpen(true);
  }

  // =====================
  // Aplicação dos filtros
  // =====================
  const linhasFiltradas = useMemo(() => {
    const term = normalize(search);

    return linhas.filter((l) => {
      // 1) filtro global
      if (term) {
        const combo = normalize(
          [
            getStr(l, ["serie_nome", "serie"]),
            getStr(l, ["sistema_nome", "sistema"]),
            getStr(l, ["conjunto_nome", "conjunto"]),
            getStr(l, ["subconjunto_nome", "subconjunto"]),
            getStr(l, ["item_nome", "item"]),
            getStr(l, ["componente_codigo", "codigo"]),
            getStr(l, ["componente_nome", "componente"]),
            getStr(l, ["tipo_revisao"]),
            getStr(l, ["comentarios"]),
          ].join(" ")
        );
        if (!combo.includes(term)) return false;
      }

      // 2) filtros por coluna (strings)
      if (dSerie && !normalize(getStr(l, ["serie_nome", "serie"])).includes(normalize(dSerie)))
        return false;
      if (dSistema && !normalize(getStr(l, ["sistema_nome", "sistema"])).includes(normalize(dSistema)))
        return false;
      if (dConjunto && !normalize(getStr(l, ["conjunto_nome", "conjunto"])).includes(normalize(dConjunto)))
        return false;
      if (dSubconjunto && !normalize(getStr(l, ["subconjunto_nome", "subconjunto"])).includes(normalize(dSubconjunto)))
        return false;
      if (dItem && !normalize(getStr(l, ["item_nome", "item"])).includes(normalize(dItem)))
        return false;

      if (dCodigo && !normalize(getStr(l, ["componente_codigo", "codigo"])).includes(normalize(dCodigo)))
        return false;
      if (dComponente && !normalize(getStr(l, ["componente_nome", "componente"])).includes(normalize(dComponente)))
        return false;

      if (dTipoRev && !normalize(getStr(l, ["tipo_revisao"])).includes(normalize(dTipoRev)))
        return false;
      if (dComentarios && !normalize(getStr(l, ["comentarios"])).includes(normalize(dComentarios)))
        return false;

      // 3) filtros numéricos (ranges)
      const qtd = getNum(l, ["quantidade"]);
      const pond = getNum(l, ["ponderacao"]);
      const qpond = getNum(l, ["quant_ponderada", "qtd_ponderada", "quant_ponderada"]);

      if (!inRange(qtd, dQtdMin, dQtdMax)) return false;
      if (!inRange(pond, dPondMin, dPondMax)) return false;
      if (!inRange(qpond, dQtdPondMin, dQtdPondMax)) return false;

      return true;
    });
  }, [
    linhas,
    search,
    dSerie,
    dSistema,
    dConjunto,
    dSubconjunto,
    dItem,
    dCodigo,
    dComponente,
    dTipoRev,
    dComentarios,
    dQtdMin,
    dQtdMax,
    dPondMin,
    dPondMax,
    dQtdPondMin,
    dQtdPondMax,
  ]);

  return (
    <div className="p-4 space-y-4">
      <section className="full-bleed">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">BOM (Planilha)</h1>
            <span className="text-xs opacity-70">
              {linhasFiltradas.length} / {linhas.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="border rounded-lg px-3 py-2 text-sm"
              onPaste={(e) => {
                e.preventDefault();
                const pasted = (e.clipboardData || (window as any).clipboardData).getData("text");
                setSearch(normalize(pasted));
              }}
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
              title="Recarregar"
            >
              Recarregar
            </button>
            <button
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              onClick={() => {
                setFSerie(""); setFSistema(""); setFConjunto(""); setFSubconjunto("");
                setFItem(""); setFCodigo(""); setFComponente(""); setFTipoRev(""); setFComentarios("");
                setFQtdMin(""); setFQtdMax(""); setFPondMin(""); setFPondMax(""); setFQtdPondMin(""); setFQtdPondMax("");
              }}
              title="Limpar filtros por coluna"
            >
              Limpar filtros
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
              {/* LINHA DE FILTROS (STICKY) */}
              <tr className="bg-white/80 sticky top-0 z-10">
                {/* Série */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Série"
                    value={fSerie}
                    onChange={(e) => setFSerie(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFSerie(normalize(t));
                    }}
                  />
                </th>
                {/* Sistema */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Sistema"
                    value={fSistema}
                    onChange={(e) => setFSistema(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFSistema(normalize(t));
                    }}
                  />
                </th>
                {/* Conjunto */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Conjunto"
                    value={fConjunto}
                    onChange={(e) => setFConjunto(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFConjunto(normalize(t));
                    }}
                  />
                </th>
                {/* Subconjunto */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Subconjunto"
                    value={fSubconjunto}
                    onChange={(e) => setFSubconjunto(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFSubconjunto(normalize(t));
                    }}
                  />
                </th>
                {/* Item */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Item"
                    value={fItem}
                    onChange={(e) => setFItem(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFItem(normalize(t));
                    }}
                  />
                </th>
                {/* Código */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Código"
                    value={fCodigo}
                    onChange={(e) => setFCodigo(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFCodigo(normalize(t));
                    }}
                  />
                </th>
                {/* Componente/Grupo */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Componente / Grupo"
                    value={fComponente}
                    onChange={(e) => setFComponente(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFComponente(normalize(t));
                    }}
                  />
                </th>
                {/* Qtd (min–máx) */}
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="Qtd min"
                      value={fQtdMin}
                      onChange={(e) => setFQtdMin(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="máx"
                      value={fQtdMax}
                      onChange={(e) => setFQtdMax(e.target.value)}
                    />
                  </div>
                </th>
                {/* Ponderação (%) (min–máx) */}
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="% min"
                      value={fPondMin}
                      onChange={(e) => setFPondMin(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="máx"
                      value={fPondMax}
                      onChange={(e) => setFPondMax(e.target.value)}
                    />
                  </div>
                </th>
                {/* Qtd Ponderada (min–máx) */}
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="QP min"
                      value={fQtdPondMin}
                      onChange={(e) => setFQtdPondMin(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-1/2 border rounded px-2 py-1 text-sm"
                      placeholder="máx"
                      value={fQtdPondMax}
                      onChange={(e) => setFQtdPondMax(e.target.value)}
                    />
                  </div>
                </th>
                {/* Tipo Revisão */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Tipo Revisão"
                    value={fTipoRev}
                    onChange={(e) => setFTipoRev(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFTipoRev(normalize(t));
                    }}
                  />
                </th>
                {/* Comentários */}
                <th className="px-2 py-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Comentários"
                    value={fComentarios}
                    onChange={(e) => setFComentarios(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const t = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setFComentarios(normalize(t));
                    }}
                  />
                </th>
                {/* Ações (vazio) */}
                <th className="px-2 py-2" />
              </tr>

              {/* TÍTULOS */}
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
                linhasFiltradas.map((l, i) => (
                  <tr key={(l.linha_tipo ?? "x") + "-" + (l.linha_id ?? i)} className="border-t">
                    <td className="px-4 py-2">{getStr(l, ["serie_nome", "serie"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["sistema_nome", "sistema"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["conjunto_nome", "conjunto"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["subconjunto_nome", "subconjunto"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["item_nome", "item"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["componente_codigo", "codigo"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["componente_nome", "componente"])}</td>
                    <td className="px-4 py-2 text-right">
                      {Number.isFinite(getNum(l, ["quantidade"])) ? getNum(l, ["quantidade"]) : ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number.isFinite(getNum(l, ["ponderacao"])) ? `${getNum(l, ["ponderacao"])}%` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number.isFinite(getNum(l, ["quant_ponderada", "qtd_ponderada", "quant_ponderada"]))
                        ? fmtNumber(getNum(l, ["quant_ponderada", "qtd_ponderada", "quant_ponderada"]))
                        : ""}
                    </td>
                    <td className="px-4 py-2">{getStr(l, ["tipo_revisao"])}</td>
                    <td className="px-4 py-2">{getStr(l, ["comentarios"])}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="px-2 py-1 rounded border hover:bg-gray-50"
                          onClick={() => editarLinha(l)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="px-2 py-1 rounded border hover:bg-gray-50"
                          onClick={() => excluirLinha(l)}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
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
            lista_pai_id: linhaEdit?.lista_pai_id,
            quantidade: Number.isFinite(getNum(linhaEdit ?? {}, ["quantidade"])) ? getNum(linhaEdit ?? {}, ["quantidade"]) : undefined,
            ponderacao: Number.isFinite(getNum(linhaEdit ?? {}, ["ponderacao"])) ? getNum(linhaEdit ?? {}, ["ponderacao"]) : undefined,
            tipo_revisao: getStr(linhaEdit ?? {}, ["tipo_revisao"]) || undefined,
            comentarios: getStr(linhaEdit ?? {}, ["comentarios"]) || undefined,
            componente_nome: getStr(linhaEdit ?? {}, ["componente_nome", "componente"]) || undefined,
            componente_codigo: getStr(linhaEdit ?? {}, ["componente_codigo", "codigo"]) || undefined,
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

/** 2 casas decimais */
function fmtNumber(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return r.toFixed(2);
}
