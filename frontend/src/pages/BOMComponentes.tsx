import { useEffect, useMemo, useState } from "react";
import {
  fetchListasTecnicas,
  fetchProdutosComponentes,
  BOMComponentesAPI,
  type Paged,
} from "../services/api";

type LT = { id: number; nome: string; codigo?: string };
type Comp = { id: number; nome: string; codigo?: string; unidade?: string };

// O serializer do backend expõe: id, lista_pai, componente, quantidade, ponderacao, comentarios,
// e campos somente leitura: lista_pai_nome, componente_nome.
type BOMComponenteRow = {
  id: number;
  lista_pai: number;
  componente: number;
  quantidade: number;
  ponderacao?: number | null;
  comentarios?: string | null;
  lista_pai_nome?: string;
  componente_nome?: string;
};

export default function BOMComponentes() {
  // Filtros/buscas
  const [qPai, setQPai] = useState("");
  const [qComp, setQComp] = useState("");

  // Opções dos selects
  const [paiOpts, setPaiOpts] = useState<LT[]>([]);
  const [compOpts, setCompOpts] = useState<Comp[]>([]);

  // Seleções atuais
  const [pai, setPai] = useState<number | "">("");
  const [comp, setComp] = useState<number | "">("");

  // Linhas já vinculadas ao pai
  const [linhas, setLinhas] = useState<BOMComponenteRow[]>([]);
  const [loadingLinhas, setLoadingLinhas] = useState(false);

  // Form de adição
  const [quantidade, setQuantidade] = useState<number>(1);
  const [ponderacao, setPonderacao] = useState<number>(100);
  const [comentarios, setComentarios] = useState<string>("");

  // Estados de ação
  const [savingAdd, setSavingAdd] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Carregar PAI
  useEffect(() => {
    fetchListasTecnicas({ search: qPai, page: 1, page_size: 20 }).then((r: any) => {
      const data = r.data?.results ?? r.data ?? [];
      setPaiOpts(data);
    });
  }, [qPai]);

  // Carregar opções de componentes (tipo=“componente”)
  useEffect(() => {
    fetchProdutosComponentes({ search: qComp, page: 1, page_size: 20 }).then((r: any) => {
      const data = r.data?.results ?? r.data ?? [];
      setCompOpts(data);
    });
  }, [qComp]);

  // Carregar componentes vinculados ao selecionar o PAI
  useEffect(() => {
    if (!pai) {
      setLinhas([]);
      return;
    }
    setLoadingLinhas(true);
    BOMComponentesAPI.list({ lista_pai: Number(pai), page_size: 500 })
      .then((resp: any) => {
        const data = Array.isArray(resp?.data?.results) ? resp.data.results : resp?.data ?? [];
        setLinhas(data as BOMComponenteRow[]);
      })
      .finally(() => setLoadingLinhas(false));
  }, [pai]);

  const paiLabel = useMemo(() => {
    const it = paiOpts.find((x) => x.id === pai);
    return it ? `${it.nome}${it.codigo ? " · " + it.codigo : ""}` : "";
  }, [pai, paiOpts]);

  async function onAdd() {
    if (!pai || !comp) {
      alert("Selecione a Lista (Pai) e o Componente.");
      return;
    }
    if (quantidade <= 0) {
      alert("Quantidade deve ser maior que zero.");
      return;
    }

    setSavingAdd(true);
    try {
      // Evita duplicado exato (mesmo componente) — se quiser permitir repetição, remova este trecho
      const exists = linhas.some((r) => Number(r.componente) === Number(comp));
      if (exists) {
        alert("Este componente já está vinculado a esta lista.");
        return;
      }

      await BOMComponentesAPI.create({
        lista_pai: Number(pai),
        componente: Number(comp),
        quantidade,
        ponderacao,
        comentarios: comentarios || undefined,
      });

      const list = await BOMComponentesAPI.list({ lista_pai: Number(pai), page_size: 500 });
      const data = Array.isArray(list?.data?.results) ? list.data.results : list?.data ?? [];
      setLinhas(data as BOMComponenteRow[]);

      // Limpa form de adição
      setComp("");
      setQComp("");
      setQuantidade(1);
      setPonderacao(100);
      setComentarios("");
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msg = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
          .join("\n");
        alert(msg || "Falha ao adicionar componente.");
      } else {
        alert("Falha ao adicionar componente.");
      }
    } finally {
      setSavingAdd(false);
    }
  }

  async function onRemove(id: number) {
    if (!confirm("Remover este componente da lista?")) return;
    setRemovingId(id);
    try {
      await BOMComponentesAPI.remove(id);
      setLinhas((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">BOM — Componentes</h1>

      {/* Seleção do Pai */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Lista Técnica (Pai)</label>
        <input
          className="border rounded w-full p-2 mb-2"
          placeholder="Buscar por nome/código"
          value={qPai}
          onChange={(e) => setQPai(e.target.value)}
        />
        <select
          className="border rounded w-full p-2"
          value={pai}
          onChange={(e) => setPai(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- selecione --</option>
          {paiOpts.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.nome}
              {lt.codigo ? ` · ${lt.codigo}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de componentes vinculados */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">
            Componentes{pai ? ` da lista: ${paiLabel}` : ""}
          </h2>
          {loadingLinhas && <span className="text-sm opacity-70">carregando…</span>}
        </div>

        <div className="border rounded overflow-x-auto">
          <div className="grid grid-cols-12 text-sm font-medium bg-gray-50 border-b px-3 py-2">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Componente</div>
            <div className="col-span-2 text-right">Qtd</div>
            <div className="col-span-2 text-right">% Ponder.</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>

          {(!pai || linhas.length === 0) && (
            <div className="px-3 py-3 text-sm opacity-70">
              {pai ? "Nenhum componente vinculado a esta lista." : "Selecione uma lista-pai acima."}
            </div>
          )}

          {linhas.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-12 items-center border-t px-3 py-2 text-sm">
              <div className="col-span-1">{idx + 1}</div>
              <div className="col-span-6">{r.componente_nome ?? r.componente}</div>
              <div className="col-span-2 text-right">{r.quantidade}</div>
              <div className="col-span-2 text-right">
                {typeof r.ponderacao === "number" ? `${r.ponderacao}%` : "—"}
              </div>
              <div className="col-span-1 text-right">
                <button
                  className="px-2 py-1 rounded border hover:bg-gray-50"
                  onClick={() => onRemove(r.id)}
                  disabled={removingId === r.id}
                  title="Remover"
                >
                  {removingId === r.id ? "…" : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar novo componente */}
      {pai && (
        <div className="mt-8">
          <h3 className="text-base font-medium mb-2">Adicionar Componente</h3>
          <div className="grid gap-2 md:grid-cols-5">
            <div className="md:col-span-2">
              <input
                className="border rounded p-2 w-full"
                placeholder="Buscar por nome/código do componente"
                value={qComp}
                onChange={(e) => setQComp(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <select
                className="border rounded p-2 w-full"
                value={comp}
                onChange={(e) => setComp(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- selecione --</option>
                {compOpts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.codigo ? ` · ${c.codigo}` : ""}
                    {c.unidade ? ` (${c.unidade})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="number"
              className="border rounded p-2 w-full"
              placeholder="Quantidade"
              min={0}
              step="0.0001"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
            <input
              type="number"
              className="border rounded p-2 w-full"
              placeholder="Ponderação (%)"
              min={0}
              max={1000}
              step="0.01"
              value={ponderacao}
              onChange={(e) => setPonderacao(Number(e.target.value))}
            />
            <input
              className="border rounded p-2 md:col-span-3 w-full"
              placeholder="Comentários (opcional)"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />

            <button
              className="p-2 rounded bg-blue-600 text-white disabled:opacity-50 md:col-span-2"
              onClick={onAdd}
              disabled={savingAdd || !pai || !comp || quantidade <= 0}
            >
              {savingAdd ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
