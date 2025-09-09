import { useEffect, useMemo, useState } from "react";
import api from "../services/http"; // sua instância axios (default export)
import { fetchListasTecnicas, fetchProdutosComponentes } from "../services/api"; // helpers centralizados

type ListaTecnica = {
  id: number;
  nome: string;
  tipo?: string;
  codigo?: string;
};

type Produto = {
  id: number;
  nome: string;
  codigo?: string;
  unidade?: string;
  tipo?: string; // esperamos "componente"
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultListaPai?: number | null;
};

export default function ComponenteModal({ open, onClose, onSaved, defaultListaPai }: Props) {
  const [saving, setSaving] = useState(false);

  // estados do form
  const [listaPaiId, setListaPaiId] = useState<number | null>(defaultListaPai ?? null);
  const [componenteId, setComponenteId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [ponderacao, setPonderacao] = useState<number>(100);
  const [comentarios, setComentarios] = useState<string>("");

  // caches dos itens selecionados (para mostrar nome)
  const [listaPaiSel, setListaPaiSel] = useState<ListaTecnica | null>(null);
  const [compSel, setCompSel] = useState<Produto | null>(null);

  // busca assíncrona
  const [qPai, setQPai] = useState("");
  const [qComp, setQComp] = useState("");
  const [paiPage, setPaiPage] = useState(1);
  const [compPage, setCompPage] = useState(1);
  const [paiOpts, setPaiOpts] = useState<ListaTecnica[]>([]);
  const [compOpts, setCompOpts] = useState<Produto[]>([]);
  const [paiHasMore, setPaiHasMore] = useState(false);
  const [compHasMore, setCompHasMore] = useState(false);
  const [loadingPai, setLoadingPai] = useState(false);
  const [loadingComp, setLoadingComp] = useState(false);

  // carrega opções do select Pai
  useEffect(() => {
    if (!open) return;
    setLoadingPai(true);
    fetchListasTecnicas({ search: qPai, page: paiPage, page_size: 15 })
      .then((r) => {
        const data = r.data;
        const results = Array.isArray(data) ? data : data.results ?? [];
        const next = Array.isArray(data) ? null : data.next ?? null;
        setPaiHasMore(Boolean(next));
        setPaiOpts((prev) => (paiPage === 1 ? results : [...prev, ...results]));
      })
      .finally(() => setLoadingPai(false));
  }, [open, qPai, paiPage]);

  // carrega opções do select Componente (Produto.tipo === "componente")
  useEffect(() => {
    if (!open) return;
    setLoadingComp(true);
    fetchProdutosComponentes({ search: qComp, page: compPage, page_size: 15 })
      .then((r) => {
        const data = r.data;
        const results = Array.isArray(data) ? data : data.results ?? [];
        const next = Array.isArray(data) ? null : data.next ?? null;
        setCompHasMore(Boolean(next));
        setCompOpts((prev) => (compPage === 1 ? results : [...prev, ...results]));
      })
      .finally(() => setLoadingComp(false));
  }, [open, qComp, compPage]);

  // se veio defaultListaPai, tentar buscar label
  useEffect(() => {
    if (!open) return;
    if (defaultListaPai && !listaPaiSel) {
      api.get(`/listas-tecnicas/${defaultListaPai}/`).then((r) => {
        setListaPaiSel(r.data);
      }).catch(() => {});
    }
  }, [open, defaultListaPai]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = useMemo(
    () =>
      Boolean(listaPaiId && componenteId && quantidade > 0 && ponderacao >= 0 && ponderacao <= 100 && !saving),
    [listaPaiId, componenteId, quantidade, ponderacao, saving]
  );

  const salvar = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post("/bom-componentes/", {
        lista_pai: listaPaiId,
        componente: componenteId,
        quantidade,
        ponderacao,
        comentarios,
      });
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const closeAndReset = () => {
    setQPai("");
    setQComp("");
    setPaiPage(1);
    setCompPage(1);
    setPaiOpts([]);
    setCompOpts([]);
    setListaPaiSel(null);
    setCompSel(null);
    setComponenteId(null);
    setQuantidade(1);
    setPonderacao(100);
    setComentarios("");
    if (!defaultListaPai) setListaPaiId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Adicionar Componente</h3>

        {/* Select: Lista Técnica (Pai) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Lista Técnica (Pai)</label>

          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-64"
              placeholder="Buscar por nome..."
              value={qPai}
              onChange={(e) => {
                setPaiPage(1);
                setQPai(e.target.value);
              }}
              disabled={Boolean(defaultListaPai)}
            />
            {defaultListaPai && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100">
                Pré-fixada pelo filtro
              </span>
            )}
          </div>

          <div className="mt-2 max-h-44 overflow-auto border rounded-xl">
            {loadingPai && paiPage === 1 ? (
              <div className="p-3 text-gray-500">Carregando...</div>
            ) : (
              paiOpts.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setListaPaiId(opt.id);
                    setListaPaiSel(opt);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                    listaPaiId === opt.id ? "bg-blue-50" : ""
                  }`}
                  disabled={Boolean(defaultListaPai)}
                  title={opt.tipo ? `Tipo: ${opt.tipo}` : ""}
                >
                  <div className="font-medium">{opt.nome}</div>
                  <div className="text-xs text-gray-500">ID: {opt.id}{opt.codigo ? ` • Código: ${opt.codigo}` : ""}</div>
                </button>
              ))
            )}
            {!loadingPai && paiOpts.length === 0 && (
              <div className="p-3 text-gray-500">Nenhum resultado.</div>
            )}
          </div>

          {paiHasMore && !defaultListaPai && (
            <div className="mt-2">
              <button
                className="text-sm px-3 py-1 border rounded-lg"
                onClick={() => setPaiPage((p) => p + 1)}
                disabled={loadingPai}
              >
                {loadingPai ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}

          {/* Preview da seleção */}
          {listaPaiSel && (
            <div className="mt-2 text-sm text-gray-700">
              Selecionado: <strong>{listaPaiSel.nome}</strong> (ID {listaPaiSel.id})
            </div>
          )}
        </div>

        {/* Select: Componente (Produto do tipo "componente") */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Componente (Produto)</label>

          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-64"
              placeholder="Buscar por nome ou código..."
              value={qComp}
              onChange={(e) => {
                setCompPage(1);
                setQComp(e.target.value);
              }}
            />
          </div>

          <div className="mt-2 max-h-44 overflow-auto border rounded-xl">
            {loadingComp && compPage === 1 ? (
              <div className="p-3 text-gray-500">Carregando...</div>
            ) : (
              compOpts.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setComponenteId(opt.id);
                    setCompSel(opt);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                    componenteId === opt.id ? "bg-blue-50" : ""
                  }`}
                  title={opt.unidade ? `Unidade: ${opt.unidade}` : ""}
                >
                  <div className="font-medium">{opt.nome}</div>
                  <div className="text-xs text-gray-500">
                    ID: {opt.id}{opt.codigo ? ` • Código: ${opt.codigo}` : ""}{opt.unidade ? ` • ${opt.unidade}` : ""}
                  </div>
                </button>
              ))
            )}
            {!loadingComp && compOpts.length === 0 && (
              <div className="p-3 text-gray-500">Nenhum resultado.</div>
            )}
          </div>

          {compHasMore && (
            <div className="mt-2">
              <button
                className="text-sm px-3 py-1 border rounded-lg"
                onClick={() => setCompPage((p) => p + 1)}
                disabled={loadingComp}
              >
                {loadingComp ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}

          {/* Preview da seleção */}
          {compSel && (
            <div className="mt-2 text-sm text-gray-700">
              Selecionado: <strong>{compSel.nome}</strong> (ID {compSel.id})
            </div>
          )}
        </div>

        {/* Quantidade / Ponderação / Comentários */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input
              type="number"
              step="0.001"
              className="border rounded-lg w-full px-3 py-2"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ponderação (%)</label>
            <input
              type="number"
              step="0.01"
              className="border rounded-lg w-full px-3 py-2"
              value={ponderacao}
              onChange={(e) => setPonderacao(Number(e.target.value) || 0)}
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Comentários</label>
          <textarea
            className="border rounded-lg w-full px-3 py-2"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={closeAndReset} className="px-4 py-2 rounded-xl border">Cancelar</button>
          <button
            onClick={salvar}
            disabled={!canSave}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
