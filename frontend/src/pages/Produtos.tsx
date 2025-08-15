import { useEffect, useState } from "react";
import api from "../services/api";
import HistoricoProduto from "../components/HistoricoProduto";

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  estoque: number;
  lead_time: number;
  tipo: string;
  fabricante?: string | null;
  codigo_fabricante?: string | null;
  unidade?: string | null;
}

const getTipoLabel = (tipo: string) => {
  switch (tipo) {
    case "produto":
      return "Produto Acabado";
    case "materia_prima":
      return "Matéria-Prima";
    case "lista":
      return "Lista Técnica (BOM)";
    default:
      return tipo;
  }
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<Omit<Produto, "id">>({
    codigo: "",
    nome: "",
    estoque: 0,
    lead_time: 0,
    tipo: "produto",
    fabricante: "",
    codigo_fabricante: "",
    unidade: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = () => {
    api
      .get("/produtos/")
      .then((res) => setProdutos(res.data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  };

  const limparForm = () =>
    setForm({
      codigo: "",
      nome: "",
      estoque: 0,
      lead_time: 0,
      tipo: "produto",
      fabricante: "",
      codigo_fabricante: "",
      unidade: "",
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      api
        .put(`/produtos/${editId}/`, form)
        .then(() => {
          setEditId(null);
          limparForm();
          carregarProdutos();
        })
        .catch((err) => console.error("Erro ao editar produto:", err));
    } else {
      api
        .post("/produtos/", form)
        .then(() => {
          limparForm();
          carregarProdutos();
        })
        .catch((err) => console.error("Erro ao adicionar produto:", err));
    }
  };

  const iniciarEdicao = (p: Produto) => {
    setEditId(p.id);
    setForm({
      codigo: p.codigo,
      nome: p.nome,
      estoque: p.estoque,
      lead_time: p.lead_time,
      tipo: p.tipo,
      fabricante: p.fabricante ?? "",
      codigo_fabricante: p.codigo_fabricante ?? "",
      unidade: p.unidade ?? "",
    });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    limparForm();
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir este produto?")) {
      api
        .delete(`/produtos/${id}/`)
        .then(carregarProdutos)
        .catch((err) => console.error("Erro ao excluir produto:", err));
    }
  };

  const produtosFiltrados = filtroTipo
    ? produtos.filter((p) => p.tipo === filtroTipo)
    : produtos;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Editar Produto" : "Cadastro de Componentes"}
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

        {/* Novos campos */}
        <input
          type="text"
          placeholder="Fabricante"
          value={form.fabricante ?? ""}
          onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
          className="border px-3 py-1 w-full"
        />
        <input
          type="text"
          placeholder="Código do Fabricante"
          value={form.codigo_fabricante ?? ""}
          onChange={(e) =>
            setForm({ ...form, codigo_fabricante: e.target.value })
          }
          className="border px-3 py-1 w-full"
        />
        <input
          type="text"
          placeholder="Unidade (ex: un, kg, m)"
          value={form.unidade ?? ""}
          onChange={(e) => setForm({ ...form, unidade: e.target.value })}
          className="border px-3 py-1 w-full"
        />

        <input
          type="number"
          placeholder="Estoque"
          value={form.estoque}
          onChange={(e) =>
            setForm({ ...form, estoque: Number(e.target.value) })
          }
          className="border px-3 py-1 w-full"
        />
        <input
          type="number"
          placeholder="Lead Time (dias)"
          value={form.lead_time}
          onChange={(e) =>
            setForm({ ...form, lead_time: Number(e.target.value) })
          }
          className="border px-3 py-1 w-full"
        />
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="border px-3 py-1 w-full"
        >
          <option value="produto">Produto Acabado</option>
          <option value="materia_prima">Matéria-Prima</option>
          <option value="lista">Lista Técnica (BOM)</option>
        </select>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
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

      {editId && <HistoricoProduto produtoId={editId} />}

      <h2 className="text-xl font-semibold mb-2">Lista de Produtos</h2>

      <div className="mb-4">
        <label className="block mb-1">Filtrar por tipo:</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="border px-3 py-1"
        >
          <option value="">Todos</option>
          <option value="produto">Produto Acabado</option>
          <option value="materia_prima">Matéria-Prima</option>
          <option value="lista">Lista Técnica (BOM)</option>
        </select>
      </div>

      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th>CODIGO GMAO</th>
            <th>COMPONENTES</th>
            <th>Estoque</th>
            <th>Lead Time</th>
            <th>Tipo</th>
            <th>Fabricante</th>
            <th>Código Fabricante</th>
            <th>Unidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtosFiltrados.map((p) => (
            <tr key={p.id}>
              <td className="border px-4 py-2">{p.codigo}</td>
              <td className="border px-4 py-2">{p.nome}</td>
              <td className="border px-4 py-2">{p.estoque}</td>
              <td className="border px-4 py-2">{p.lead_time} dias</td>
              <td className="border px-4 py-2">{getTipoLabel(p.tipo)}</td>
              <td className="border px-4 py-2">{p.fabricante ?? "-"}</td>
              <td className="border px-4 py-2">
                {p.codigo_fabricante ?? "-"}
              </td>
              <td className="border px-4 py-2">{p.unidade ?? "-"}</td>
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
