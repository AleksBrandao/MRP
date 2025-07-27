import { useEffect, useState } from "react";
import api from "../services/api";
import HistoricoProduto from "../components/HistoricoProduto";


interface Produto {
  id: number;
  codigo: string;
  nome: string;
  estoque: number;
  lead_time: number;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<Omit<Produto, "id">>({
    codigo: "",
    nome: "",
    estoque: 0,
    lead_time: 0,
  });
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = () => {
    api.get("/produtos/")
      .then((res) => setProdutos(res.data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      api.put(`/produtos/${editId}/`, form)
        .then(() => {
          setEditId(null);
          setForm({ codigo: "", nome: "", estoque: 0, lead_time: 0 });
          carregarProdutos();
        })
        .catch((err) => console.error("Erro ao editar produto:", err));
    } else {
      api.post("/produtos/", form)
        .then(() => {
          setForm({ codigo: "", nome: "", estoque: 0, lead_time: 0 });
          carregarProdutos();
        })
        .catch((err) => console.error("Erro ao adicionar produto:", err));
    }
  };

  const iniciarEdicao = (produto: Produto) => {
    setEditId(produto.id);
    setForm({
      codigo: produto.codigo,
      nome: produto.nome,
      estoque: produto.estoque,
      lead_time: produto.lead_time,
    });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    setForm({ codigo: "", nome: "", estoque: 0, lead_time: 0 });
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir este produto?")) {
      api.delete(`/produtos/${id}/`)
        .then(carregarProdutos)
        .catch((err) => console.error("Erro ao excluir produto:", err));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Editar Produto" : "Cadastro de Produto"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Código"
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          className="border px-3 py-1 w-full"
          required
        />
        <input
          type="text"
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="border px-3 py-1 w-full"
          required
        />
        <input
          type="number"
          placeholder="Estoque"
          value={form.estoque}
          onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
        />
        <input
          type="number"
          placeholder="Lead Time (dias)"
          value={form.lead_time}
          onChange={(e) => setForm({ ...form, lead_time: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
        />
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editId ? "Salvar Alterações" : "Adicionar Produto"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {editId && (
  <HistoricoProduto produtoId={editId} />
)}


      <h2 className="text-xl font-semibold mb-2">Lista de Produtos</h2>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Código</th>
            <th className="border px-4 py-2">Nome</th>
            <th className="border px-4 py-2">Estoque</th>
            <th className="border px-4 py-2">Lead Time</th>
            <th className="border px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id}>
              <td className="border px-4 py-2">{p.codigo}</td>
              <td className="border px-4 py-2">{p.nome}</td>
              <td className="border px-4 py-2">{p.estoque}</td>
              <td className="border px-4 py-2">{p.lead_time} dias</td>
              <td className="border px-4 py-2 text-center space-x-2">
                <button
                  onClick={() => iniciarEdicao(p)}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600 hover:underline"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
