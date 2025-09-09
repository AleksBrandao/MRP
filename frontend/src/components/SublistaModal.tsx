import { useEffect, useMemo, useState } from "react";
import api from "../services/http"; // sua instância axios (default export)
import { fetchListasTecnicas } from "../services/api"; // helper centralizado

type ListaTecnica = {
  id: number;
  nome: string;
  tipo?: string;
  codigo?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultListaPai?: number | null; // se você tiver um filtro externo, usamos aqui
};

export default function SublistaModal({ open, onClose, onSaved, defaultListaPai }: Props) {
  const [saving, setSaving] = useState(false);

  // estados do form
  const [listaPaiId, setListaPaiId] = useState<number | null>(defaultListaPai ?? null);
  const [sublistaId, setSublistaId] = useState<number | null>(null);

  // caches dos itens selecionados (para mostrar nome)
  const [listaPaiSel, setListaPaiSel] = useState<ListaTecnica | null>(null);
  const [sublistaSel, setSublistaSel] = useState<ListaTecnica | null>(null);

  // busca assíncrona para os selects
  const [qPai, setQPai] = useState("");
  const [qSub, setQSub] = useState("");
  const [paiPage, setPaiPage] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [paiOpts, setPaiOpts] = useState<ListaTecnica[]>([]);
  const [subOpts, setSubOpts] = useState<ListaTecnica[]>([]);
  const [paiHasMore, setPaiHasMore] = useState(false);
  const [subHasMore, setSubHasMore] = useState(false);
  const [loadingPai, setLoadingPai] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

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

  // carrega opções do select Sublista
  useEffect(() => {
    if (!open) return;
    setLoadingSub(true);
    fetchListasTecnicas({ search: qSub, page: subPage, page_size: 15 })
      .then((r) => {
        const data = r.data;
        const results = Array.isArray(data) ? data : data.results ?? [];
        const next = Array.isArray(data) ? null : data.next ?? null;
        setSubHasMore(Boolean(next));
        setSubOpts((prev) => (subPage === 1 ? results : [...prev, ...results]));
      })
      .finally(() => setLoadingSub(false));
  }, [open, qSub, subPage]);

  // se veio defaultListaPai, tentar buscar label
  useEffect(() => {
    if (!open) return;
    if (defaultListaPai && !listaPaiSel) {
      api.get(`/listas-tecnicas/${defaultListaPai}/`).then((r) => {
        setListaPaiSel(r.data);
      }).catch(() => {});
    }
  }, [open, defaultListaPai]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = useMemo(() => Boolean(listaPaiId && sublistaId && !saving), [listaPaiId, sublistaId, saving]);

  const salvar = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post("/bom-sublistas/", { lista_pai: listaPaiId, sublista: sublistaId });
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const closeAndReset = () => {
    setQPai("");
    setQSub("");
    setPaiPage(1);
    setSubPage(1);
    setPaiOpts([]);
    setSubOpts([]);
    setListaPaiSel(null);
    setSublistaSel(null);
    setSublistaId(null);
    if (!defaultListaPai) setListaPaiId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Vincular Sublista</h3>

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

        {/* Select: Sublista */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Sublista</label>

          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-64"
              placeholder="Buscar por nome..."
              value={qSub}
              onChange={(e) => {
                setSubPage(1);
                setQSub(e.target.value);
              }}
            />
          </div>

          <div className="mt-2 max-h-44 overflow-auto border rounded-xl">
            {loadingSub && subPage === 1 ? (
              <div className="p-3 text-gray-500">Carregando...</div>
            ) : (
              subOpts.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSublistaId(opt.id);
                    setSublistaSel(opt);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                    sublistaId === opt.id ? "bg-blue-50" : ""
                  }`}
                  title={opt.tipo ? `Tipo: ${opt.tipo}` : ""}
                >
                  <div className="font-medium">{opt.nome}</div>
                  <div className="text-xs text-gray-500">ID: {opt.id}{opt.codigo ? ` • Código: ${opt.codigo}` : ""}</div>
                </button>
              ))
            )}
            {!loadingSub && subOpts.length === 0 && (
              <div className="p-3 text-gray-500">Nenhum resultado.</div>
            )}
          </div>

          {subHasMore && (
            <div className="mt-2">
              <button
                className="text-sm px-3 py-1 border rounded-lg"
                onClick={() => setSubPage((p) => p + 1)}
                disabled={loadingSub}
              >
                {loadingSub ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}

          {/* Preview da seleção */}
          {sublistaSel && (
            <div className="mt-2 text-sm text-gray-700">
              Selecionado: <strong>{sublistaSel.nome}</strong> (ID {sublistaSel.id})
            </div>
          )}
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
