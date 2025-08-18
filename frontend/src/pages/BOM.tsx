import { useEffect, useState } from "react";
import api from "../services/http";

interface Produto {
  id: number;
  nome: string;
}

interface BOMItem {
  id: number;
  produto_pai: number;
  produto_pai_nome: string;
  componente: number;
  componente_nome: string;
  quantidade: number;
}

export default function BOM() {
  const [bom, setBOM] = useState<BOMItem[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState({ produto_pai: 0, componente: 0, quantidade: 1 });
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    carregarBOM();
    carregarProdutos();
  }, []);

  const carregarBOM = () => {
    api.get("/bom/")
      .then((res) => setBOM(res.data))
      .catch((err) => console.error("Erro ao carregar BOM:", err));
  };

  const carregarProdutos = () => {
    api.get("/produtos/")
      .then((res) => setProdutos(res.data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      api.put(`/bom/${editId}/`, form)
        .then(() => {
          setEditId(null);
          setForm({ produto_pai: 0, componente: 0, quantidade: 1 });
          carregarBOM();
        })
        .catch((err) => console.error("Erro ao editar item da BOM:", err));
    } else {
      api.post("/bom/", form)
        .then(() => {
          setForm({ produto_pai: 0, componente: 0, quantidade: 1 });
          carregarBOM();
        })
        .catch((err) => console.error("Erro ao adicionar item à BOM:", err));
    }
  };

  const iniciarEdicao = (item: BOMItem) => {
    setEditId(item.id);
    setForm({
      produto_pai: item.produto_pai,
      componente: item.componente,
      quantidade: item.quantidade,
    });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    setForm({ produto_pai: 0, componente: 0, quantidade: 1 });
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir este item da BOM?")) {
      api.delete(`/bom/${id}/`)
        .then(carregarBOM)
        .catch((err) => console.error("Erro ao excluir item da BOM:", err));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Editar Estrutura de Produto (BOM)" : "Cadastro de Estrutura de Produto (BOM)"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <select
          value={form.produto_pai}
          onChange={(e) => setForm({ ...form, produto_pai: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
          required
        >
          <option value={0}>Produto Pai</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        <select
          value={form.componente}
          onChange={(e) => setForm({ ...form, componente: Number(e.target.value) })}
          className="border px-3 py-1 w-full"
          required
        >
          <option value={0}>Componente</option>
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
          min={1}
          required
        />

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {editId ? "Salvar Alterações" : "Adicionar Componente"}
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

      <h2 className="text-xl font-semibold mb-2">Estrutura Atual</h2>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Produto Pai</th>
            <th className="border px-4 py-2">Componente</th>
            <th className="border px-4 py-2">Quantidade</th>
            <th className="border px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {bom.map((item) => (
            <tr key={item.id}>
              <td className="border px-4 py-2">{item.produto_pai_nome}</td>
              <td className="border px-4 py-2">{item.componente_nome}</td>
              <td className="border px-4 py-2">{item.quantidade}</td>
              <td className="border px-4 py-2 text-center space-x-2">
                <button
                  onClick={() => iniciarEdicao(item)}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
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
