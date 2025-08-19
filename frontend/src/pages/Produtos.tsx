import { useEffect, useState } from "react";
import { ComponenteAPI } from "../services/api";
import CadastrarComponente from "../components/CadastrarComponente";

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  fabricante: string;
  codigo_fabricante: string;
  unidade: string;
  estoque: number;
  lead_time: number;
  tipo: string;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);

  const fetchProdutos = async () => {
    try {
      const response = await ComponenteAPI.list();
      console.log("📦 Todos os produtos:", response.data); // 👈 LOG
      const todos = response.data;
      const componentes = todos.filter((p: Produto) => p.tipo === "produto"); // ✅ mantém "produto"
      setProdutos(componentes);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };


  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleEditar = (produto: Produto) => {
    setEditando(produto);
    setShowModal(true);
  };

  const handleExcluir = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este componente?")) {
      try {
        await ComponenteAPI.remove(id);
        fetchProdutos(); // atualiza a lista
      } catch (err) {
        console.error("Erro ao excluir:", err);
        alert("Erro ao excluir componente.");
      }
    }
  };


  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "produto":
        return "Componente";
      case "materia_prima":
        return "Matéria-Prima";
      case "lista":
        return "Lista Técnica";
      default:
        return tipo;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Produtos (Componentes)</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={() => setShowModal(true)}
        >
          + Novo Componente
        </button>
      </div>

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">Código</th>
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">Fabricante</th>
            <th className="px-4 py-2">Código Fab.</th>
            <th className="px-4 py-2">Unidade</th>
            <th className="px-4 py-2">Estoque</th>
            <th className="px-4 py-2">Lead Time</th>
            <th className="px-4 py-2">Tipo</th> {/* ✅ nova coluna */}
            <th className="px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => (
            <tr key={produto.id} className="border-b">
              <td className="px-4 py-2">{produto.codigo}</td>
              <td className="px-4 py-2">{produto.nome}</td>
              <td className="px-4 py-2">{produto.fabricante}</td>
              <td className="px-4 py-2">{produto.codigo_fabricante}</td>
              <td className="px-4 py-2">{produto.unidade}</td>
              <td className="px-4 py-2">{produto.estoque}</td>
              <td className="px-4 py-2">{produto.lead_time}</td>
              <td className="px-4 py-2">{getTipoLabel(produto.tipo)}</td> {/* ✅ uso aqui */}
              <td className="px-4 py-2">
                <button
                  onClick={() => handleEditar(produto)}
                  className="text-blue-600 hover:underline mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(produto.id)}
                  className="text-red-600 hover:underline"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-[600px]">
            <CadastrarComponente
              onClose={() => {
                setShowModal(false);
                setEditando(null);
              }}
              onSuccess={() => {
                fetchProdutos();
                setEditando(null);
              }}
              initialData={editando}
            />

          </div>
        </div>
      )}
    </div>
  );
}
