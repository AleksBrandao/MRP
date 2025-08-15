import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ProdutoFormModal, { Produto } from "../components/ProdutoFormModal";

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const tipoLabels: Record<Produto["tipo"], string> = useMemo(
    () => ({ produto: "Produto Acabado", materia_prima: "Matéria-Prima", lista: "Lista Técnica (BOM)" }),
    []
  );

  async function fetchProdutos() {
    setLoading(true);
    try {
      const res = await api.get("/produtos/");
      setProdutos(res.data);
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProdutos();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Produto) {
    setEditing(p);
    setModalOpen(true);
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    if (!confirm("Confirma excluir este item?")) return;
    try {
      await api.delete(`/produtos/${id}/`);
      setProdutos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Erro ao excluir:", e);
    }
  }

  return (
    // Layout desktop: ocupa toda a largura disponível, sem "janela"/card
    <div className="w-full px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Componentes</h1>
        <button
          onClick={openCreate}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:bg-blue-700"
        >
          + Novo Componente
        </button>
      </div>

      {/* Tabela em largura total, sem container estreito e sem rolagem horizontal */}
      <div className="mt-2">
        <table className="w-full table-auto text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 text-gray-700">
            <tr className="border-y">
              <th className="px-3 py-2">CÓDIGO GMAO</th>
              <th className="px-3 py-2">COMPONENTES</th>
              <th className="px-3 py-2">Estoque</th>
              <th className="px-3 py-2">Lead Time</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Fabricante</th>
              <th className="px-3 py-2">Código Fabricante</th>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td className="px-3 py-3" colSpan={9}>Carregando...</td>
              </tr>
            )}
            {!loading && produtos.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-gray-500" colSpan={9}>Nenhum item cadastrado.</td>
              </tr>
            )}
            {produtos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{p.codigo}</td>
                <td className="px-3 py-2 break-words">{p.nome}</td>
                <td className="px-3 py-2">{p.estoque}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.lead_time} dias</td>
                <td className="px-3 py-2 whitespace-nowrap">{tipoLabels[p.tipo]}</td>
                <td className="px-3 py-2 break-words">{p.fabricante || "-"}</td>
                <td className="px-3 py-2 break-all">{p.codigo_fabricante || "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.unidade || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ProdutoFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editing}
        onSaved={(saved) => {
          setProdutos((prev) => {
            if (editing?.id) return prev.map((x) => (x.id === editing.id ? { ...x, ...saved } : x));
            return [saved, ...prev];
          });
        }}
      />
    </div>
  );
}