import { useEffect, useState } from "react";
import { ComponenteAPI } from "../services/api";
import CadastrarComponente from "../components/CadastrarComponente";

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  fabricante?: string | null;
  codigo_fabricante?: string | null;
  unidade?: string | null;
  estoque: number;
  lead_time: number;
  tipo: string; // "componente"
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");

  const fetchProdutos = async () => {
    try {
      setCarregando(true);
      const { data } = await ComponenteAPI.list(); // /componentes/
      setProdutos(data ?? []);
    } catch (e) {
      console.error("Erro ao buscar componentes:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  // Fecha modal com ESC
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  // Opcional: travar scroll do body quando modal aberto
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  const filtrados = produtos.filter((p) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      p.codigo?.toLowerCase().includes(q) ||
      p.nome?.toLowerCase().includes(q) ||
      p.fabricante?.toLowerCase().includes(q) ||
      p.codigo_fabricante?.toLowerCase().includes(q)
    );
  });

  const handleEditar = (produto: Produto) => {
    setEditando(produto);
    setShowModal(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este componente?")) return;
    try {
      await ComponenteAPI.remove(id);
      await fetchProdutos();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir componente.");
    }
  };

  // ⬇️ Atualiza a tabela na hora (criação/edição)
  const handleSaved = (saved: Produto) => {
    setProdutos((prev) => {
      const i = prev.findIndex((p) => p.id === saved.id);
      if (i >= 0) {
        const arr = [...prev];
        arr[i] = saved;
        return arr;
      }
      // insere no topo (ou troque por [...prev, saved] se preferir no fim)
      return [saved, ...prev];
    });
    setShowModal(false);
    setEditando(null);

    // opcional: garantir consistência com o backend
    void fetchProdutos();
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Produtos <span className="text-gray-500">(Componentes)</span>
        </h1>

        <div className="flex items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, nome, fabricante..."
            className="h-10 w-72 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => { setEditando(null); setShowModal(true); }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
          >
            + Novo Componente
          </button>
        </div>
      </div>

      {/* Tabela em página cheia, sem “janela” */}
      <div className="relative">
        <table className="w-full table-fixed text-left">
          {/* controle de largura das colunas */}
          <colgroup>
            {["w-40", "w-64", "w-56", "w-56", "w-24", "w-24", "w-28", "w-32"].map((w, i) => (
              <col key={i} className={w} />
            ))}
          </colgroup>


          <thead className="bg-gray-50 text-sm">
            <tr className="text-gray-700">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Fabricante</th>
              <th className="px-4 py-3 font-medium">Código Fab.</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Lead Time</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {carregando ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Carregando…
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Nenhum componente encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono whitespace-normal break-words">{p.codigo}</td>
                  <td className="px-4 py-3 whitespace-normal break-words">{p.nome}</td>
                  <td className="px-4 py-3 whitespace-normal break-words">{p.fabricante ?? "-"}</td>
                  <td className="px-4 py-3 whitespace-normal break-words">{p.codigo_fabricante ?? "-"}</td>
                  <td className="px-4 py-3">{p.unidade ?? "-"}</td>
                  <td className="px-4 py-3">{p.estoque}</td>
                  <td className="px-4 py-3">{p.lead_time}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditar(p)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(p.id)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal único (overlay + conteúdo) */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setEditando(null);
            }
          }}
        >
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <CadastrarComponente
              initialData={editando ?? undefined}
              onClose={() => { setShowModal(false); setEditando(null); }}
              onSaved={(saved) => {              // ⬅️ troque onSuccess por onSaved
                setProdutos(prev => {
                  const i = prev.findIndex(p => p.id === saved.id);
                  if (i >= 0) { const arr = [...prev]; arr[i] = saved; return arr; }
                  return [saved, ...prev];
                });
                setShowModal(false);
                setEditando(null);
                // opcional: void fetchProdutos();
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
