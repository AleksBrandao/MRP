import { useEffect, useMemo, useState } from "react";
import { BOMSublistasAPI, BOMComponentesAPI, fetchListasTecnicas, fetchProdutosComponentes } from "../services/api";
// import api from "../services/api";
import SublistaModal from "../components/SublistaModal";
import ComponenteModal from "../components/ComponenteModal";

type LT = { id: number; nome: string; codigo?: string; tipo?: string };
type Produto = { id: number; nome: string; codigo?: string; unidade?: string };

export default function BOMPage() {
  // --- Estado dos filtros --- //
  const [selLista, setSelLista] = useState<number | null>(null);       // filtro Lista Pai (ID)
  const [selComp, setSelComp] = useState<number | null>(null);         // filtro Componente (ID) — afeta só a grade de Componentes

  // Select assíncrono - Lista Pai
  const [qPai, setQPai] = useState("");
  const [paiPage, setPaiPage] = useState(1);
  const [paiOpts, setPaiOpts] = useState<LT[]>([]);
  const [paiHasMore, setPaiHasMore] = useState(false);
  const [loadingPai, setLoadingPai] = useState(false);
  const [paiSelObj, setPaiSelObj] = useState<LT | null>(null);

  // Select assíncrono - Componente (Produto tipo=componente)
  const [qComp, setQComp] = useState("");
  const [compPage, setCompPage] = useState(1);
  const [compOpts, setCompOpts] = useState<Produto[]>([]);
  const [compHasMore, setCompHasMore] = useState(false);
  const [loadingComp, setLoadingComp] = useState(false);
  const [compSelObj, setCompSelObj] = useState<Produto | null>(null);

  // --- Modais --- //
  const [openSublista, setOpenSublista] = useState(false);
  const [openComponente, setOpenComponente] = useState(false);

  // --- Dados --- //
  const [sublistas, setSublistas] = useState<any[]>([]);
  const [componentes, setComponentes] = useState<any[]>([]);

  // Carregar opções do select de Lista Pai
  useEffect(() => {
    setLoadingPai(true);
    fetchListasTecnicas({ search: qPai, page: paiPage, page_size: 15 })
      .then((r) => {
        const arr = Array.isArray(r.data) ? r.data : r.data.results ?? [];
        const next = Array.isArray(r.data) ? null : r.data.next ?? null;
        setPaiHasMore(Boolean(next));
        setPaiOpts((prev) => (paiPage === 1 ? arr : [...prev, ...arr]));
      })
      .finally(() => setLoadingPai(false));
  }, [qPai, paiPage]);

  // Carregar opções do select de Componente
  useEffect(() => {
    setLoadingComp(true);
    fetchProdutosComponentes({ search: qComp, page: compPage, page_size: 15 })
      .then((r) => {
        const arr = Array.isArray(r.data) ? r.data : r.data.results ?? [];
        const next = Array.isArray(r.data) ? null : r.data.next ?? null;
        setCompHasMore(Boolean(next));
        setCompOpts((prev) => (compPage === 1 ? arr : [...prev, ...arr]));
      })
      .finally(() => setLoadingComp(false));
  }, [qComp, compPage]);

  // Se usuário digitou ID manualmente (ou veio via state), buscar rótulos para preview
  useEffect(() => {
    if (selLista && !paiSelObj) {
      api.get(`/listas-tecnicas/${selLista}/`).then((r) => setPaiSelObj(r.data)).catch(() => {});
    }
    if (selComp && !compSelObj) {
      api.get(`/produtos/${selComp}/`).then((r) => setCompSelObj(r.data)).catch(() => {}); // troque para /componentes/ se for o seu
    }
  }, [selLista, selComp]); // eslint-disable-line react-hooks/exhaustive-deps

  const paramsSub = useMemo(() => (selLista ? { lista_pai: selLista } : undefined), [selLista]);
  const paramsComp = useMemo(() => {
    const p: Record<string, any> = {};
    if (selLista) p.lista_pai = selLista;
    if (selComp) p.componente = selComp;   // 👈 só grade de componentes usa
    return Object.keys(p).length ? p : undefined;
  }, [selLista, selComp]);

  const carregar = async () => {
    const [r1, r2] = await Promise.all([
      BOMSublistasAPI.list(paramsSub),
      BOMComponentesAPI.list(paramsComp),
    ]);
    setSublistas(r1.data?.results || r1.data || []);
    setComponentes(r2.data?.results || r2.data || []);
  };

  useEffect(() => {
    carregar();
  }, [selLista, selComp]);

  // limpar seleções dos selects (UX)
  const clearLista = () => {
    setSelLista(null);
    setPaiSelObj(null);
    setQPai(""); setPaiPage(1); setPaiOpts([]);
  };
  const clearComp = () => {
    setSelComp(null);
    setCompSelObj(null);
    setQComp(""); setCompPage(1); setCompOpts([]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lista Técnica (BOM)</h1>

      {/* --- Filtros de topo --- */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Filtro: Lista Técnica Pai */}
        <div>
          <label className="block text-sm font-medium mb-1">Lista Técnica (Pai)</label>
          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-72"
              placeholder="Buscar Lista Técnica por nome..."
              value={qPai}
              onChange={(e) => { setPaiPage(1); setQPai(e.target.value); }}
            />
            <button
              className="px-3 py-2 border rounded-lg"
              onClick={() => setPaiPage((p) => p + 1)}
              disabled={!paiHasMore || loadingPai}
              title={paiHasMore ? "Carregar mais" : "Sem mais resultados"}
            >
              {loadingPai ? "..." : "Mais"}
            </button>
          </div>
          <div className="mt-2 max-h-44 overflow-auto border rounded-xl">
            {paiOpts.map((lt) => (
              <button
                key={lt.id}
                onClick={() => { setSelLista(lt.id); setPaiSelObj(lt); }}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selLista === lt.id ? "bg-blue-50" : ""}`}
                title={lt.tipo ? `Tipo: ${lt.tipo}` : ""}
              >
                <div className="font-medium">{lt.nome}</div>
                <div className="text-xs text-gray-500">ID: {lt.id}{lt.codigo ? ` • Código: ${lt.codigo}` : ""}</div>
              </button>
            ))}
            {(!paiOpts || paiOpts.length === 0) && (
              <div className="p-3 text-gray-500">Nenhum resultado.</div>
            )}
          </div>

          {selLista && paiSelObj && (
            <div className="mt-2 text-sm">
              Selecionado: <b>{paiSelObj.nome}</b> (ID {paiSelObj.id}){" "}
              <button className="text-red-600 ml-1" onClick={clearLista}>Limpar</button>
            </div>
          )}
        </div>

        {/* Filtro: Componente (opcional, afeta só a grade de Componentes) */}
        <div>
          <label className="block text-sm font-medium mb-1">Componente (Produto)</label>
          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-72"
              placeholder="Buscar Componente por nome/código..."
              value={qComp}
              onChange={(e) => { setCompPage(1); setQComp(e.target.value); }}
            />
            <button
              className="px-3 py-2 border rounded-lg"
              onClick={() => setCompPage((p) => p + 1)}
              disabled={!compHasMore || loadingComp}
              title={compHasMore ? "Carregar mais" : "Sem mais resultados"}
            >
              {loadingComp ? "..." : "Mais"}
            </button>
          </div>
          <div className="mt-2 max-h-44 overflow-auto border rounded-xl">
            {compOpts.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelComp(p.id); setCompSelObj(p); }}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selComp === p.id ? "bg-blue-50" : ""}`}
                title={p.unidade ? `Unidade: ${p.unidade}` : ""}
              >
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-gray-500">ID: {p.id}{p.codigo ? ` • Código: ${p.codigo}` : ""}</div>
              </button>
            ))}
            {(!compOpts || compOpts.length === 0) && (
              <div className="p-3 text-gray-500">Nenhum resultado.</div>
            )}
          </div>

          {selComp && compSelObj && (
            <div className="mt-2 text-sm">
              Selecionado: <b>{compSelObj.nome}</b> (ID {compSelObj.id}){" "}
              <button className="text-red-600 ml-1" onClick={clearComp}>Limpar</button>
            </div>
          )}
          <div className="mt-1 text-xs text-gray-500">
            Dica: este filtro afeta apenas a tabela <b>Componentes vinculados</b>.
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 mb-6">
        <button className="px-3 py-2 rounded-xl border bg-gray-50 hover:bg-gray-100" onClick={() => setOpenSublista(true)}>
          Adicionar Sublista
        </button>
        <button className="px-3 py-2 rounded-xl border bg-gray-50 hover:bg-gray-100" onClick={() => setOpenComponente(true)}>
          Adicionar Componente
        </button>
      </div>

      {/* Sublistas */}
      <h2 className="text-xl font-semibold mb-2">Sublistas vinculadas</h2>
      <table className="min-w-full border rounded-xl overflow-hidden mb-8">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Lista Técnica (Pai)</th>
            <th className="px-4 py-2 text-left">Sublista</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sublistas.map((row: any) => (
            <tr key={row.id} className="border-t">
              <td className="px-4 py-2">{row.lista_pai_nome ?? row.lista_pai}</td>
              <td className="px-4 py-2">{row.sublista_nome ?? row.sublista}</td>
              <td className="px-4 py-2 text-right">
                <button
                  className="text-red-600 hover:underline"
                  onClick={async () => {
                    if (confirm("Excluir vínculo de sublista?")) {
                      await BOMSublistasAPI.remove(row.id);
                      carregar();
                    }
                  }}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {sublistas.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-gray-500 text-center">
                Nenhuma sublista vinculada.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Componentes */}
      <h2 className="text-xl font-semibold mb-2">Componentes vinculados</h2>
      <table className="min-w-full border rounded-xl overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Lista Técnica (Pai)</th>
            <th className="px-4 py-2 text-left">Componente</th>
            <th className="px-4 py-2 text-left">Qtd</th>
            <th className="px-4 py-2 text-left">Pond. (%)</th>
            <th className="px-4 py-2 text-left">Comentários</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((row: any) => (
            <tr key={row.id} className="border-t">
              <td className="px-4 py-2">{row.lista_pai_nome ?? row.lista_pai}</td>
              <td className="px-4 py-2">{row.componente_nome ?? row.componente}</td>
              <td className="px-4 py-2">{row.quantidade}</td>
              <td className="px-4 py-2">{row.ponderacao}</td>
              <td className="px-4 py-2">{row.comentarios || "—"}</td>
              <td className="px-4 py-2 text-right">
                <button
                  className="text-red-600 hover:underline"
                  onClick={async () => {
                    if (confirm("Excluir componente?")) {
                      await BOMComponentesAPI.remove(row.id);
                      carregar();
                    }
                  }}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {componentes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                Nenhum componente vinculado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modais */}
      <SublistaModal
        open={openSublista}
        onClose={() => setOpenSublista(false)}
        onSaved={carregar}
        defaultListaPai={selLista}
      />
      <ComponenteModal
        open={openComponente}
        onClose={() => setOpenComponente(false)}
        onSaved={carregar}
        defaultListaPai={selLista}
      />
    </div>
  );
}
