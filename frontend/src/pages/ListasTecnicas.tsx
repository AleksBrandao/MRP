import { useEffect, useState } from "react";
import { ListaTecnicaAPI } from "../services/api";

interface ListaTecnica {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
}

export default function ListasTecnicas() {
  const [listas, setListas] = useState<ListaTecnica[]>([]);
  const [form, setForm] = useState<Omit<ListaTecnica, "id">>({
    codigo: "",
    nome: "",
    tipo: "SISTEMA",
  });
  const [editId, setEditId] = useState<number | null>(null);

  // Carregar listas do backend
  const carregarListas = async () => {
    const res = await ListaTecnicaAPI.list();
    setListas(res.data);
  };

  useEffect(() => {
    carregarListas();
  }, []);

  // Salvar nova lista ou atualizar existente
  const salvar = async () => {
    if (editId) {
      await api.put(`/listas-tecnicas/${editId}/`, form);
    } else {
      await api.post("/listas-tecnicas/", form);
    }
    setForm({ codigo: "", nome: "", tipo: "SISTEMA" });
    setEditId(null);
    carregarListas();
  };

  const editar = (lista: ListaTecnica) => {
    setForm({ codigo: lista.codigo, nome: lista.nome, tipo: lista.tipo });
    setEditId(lista.id);
  };

  const excluir = async (id: number) => {
    await api.delete(`/listas-tecnicas/${id}/`);
    carregarListas();
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Listas Técnicas</h2>

      {/* Formulário */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Código"
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          className="border p-2 rounded w-40"
        />
        <input
          type="text"
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="border p-2 rounded w-64"
        />
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="SERIE">Série</option>
          <option value="SISTEMA">Sistema</option>
          <option value="CONJUNTO">Conjunto</option>
          <option value="SUBCONJUNTO">Sub-Conjunto</option>
          <option value="ITEM">Item</option>
        </select>
        <button
          onClick={salvar}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {editId ? "Salvar" : "Adicionar"}
        </button>
      </div>

      {/* Tabela */}
      <table className="table-auto border-collapse border border-gray-400 w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Código</th>
            <th className="border p-2">Nome</th>
            <th className="border p-2">Tipo</th>
            <th className="border p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {listas.map((l) => (
            <tr key={l.id}>
              <td className="border p-2">{l.codigo}</td>
              <td className="border p-2">{l.nome}</td>
              <td className="border p-2">{l.tipo}</td>
              <td className="border p-2">
                <button
                  onClick={() => editar(l)}
                  className="text-blue-600 mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(l.id)}
                  className="text-red-600"
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
