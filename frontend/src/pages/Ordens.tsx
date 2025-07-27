import { useEffect, useState } from "react";
import api from "../services/api";

interface Produto {
  id: number;
  nome: string;
}

interface OrdemProducao {
  id: number;
  produto: number;
  produto_nome: string;
  quantidade: number;
  data_entrega: string;
}

export default function Ordens() {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState({ produto: 0, quantidade: 1, data_entrega: "" });
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    carregarOrdens();
    carregarProdutos();
  }, []);

  const carregarOrdens = () => {
    api.get("/ordens/")
      .then((res) => setOrdens(res.data))
      .catch((err) => console.error("Erro ao carregar ordens:", err));
  };

  const carregarProdutos = () => {
    api.get("/produtos/")
      .then((res) => setProdutos(res.data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      api.put(`/ordens/${editId}/`, form)
        .then(() => {
          setEditId(null);
          setForm({ produto: 0, quantidade: 1, data_entrega: "" });
          carregarOrdens();
        })
        .catch((err) => console.error("Erro ao editar ordem:", err));
    } else {
      api.post("/ordens/", form)
        .then(() => {
          setForm({ produto: 0, quantidade: 1, data_entrega: "" });
          carregarOrdens();
        })
        .catch((err) => console.error("Erro ao adicionar ordem:", err));
    }
  };

  const iniciarEdicao = (ordem: OrdemProducao) => {
    setEditId(ordem.id);
    setForm({
      produto: ordem.produto,
      quantidade: ordem.quantidade,
      data_entrega: ordem.data_entrega,
    });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    setForm({ produto: 0, quantidade: 1, data_entrega: "" });
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir esta ordem?")) {
      api.delete(`/ordens/${id}/`)
        .then(carregarOrdens)
        .catch((err) => console.error("Erro ao excluir ordem:", err));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Editar Ordem de Produção" : "Cadastro de Ordem de Produção"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <select
          value={form.produto}
          onChange={(e) => setForm({ ...form, produto: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
          required
        >
          <option value={0}>Selecione um produto</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantidade"
          value={form.quantidade}
          onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
          required
        />

        <input
          type="date"
          value={form.data_entrega}
          onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
          className="border px-3 py-1 w-full"
          required
        />

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editId ? "Salvar Alterações" : "Adicionar Ordem"}
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

      <h2 className="text-xl font-semibold mb-2">Ordens de Produção</h2>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Produto</th>
            <th className="border px-4 py-2">Quantidade</th>
            <th className="border px-4 py-2">Entrega</th>
            <th className="border px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {ordens.map((o) => (
            <tr key={o.id}>
              <td className="border px-4 py-2">{o.produto_nome}</td>
              <td className="border px-4 py-2">{o.quantidade}</td>
              <td className="border px-4 py-2">
                {new Date(o.data_entrega).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2 text-center space-x-2">
                <button
                  onClick={() => iniciarEdicao(o)}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(o.id)}
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
