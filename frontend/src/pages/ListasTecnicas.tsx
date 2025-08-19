import { useEffect, useState } from "react";
import { ListaTecnicaAPI } from "../services/api";

interface ListaTecnica {
  id: number;
  codigo: string;
  nome: string;
  estoque: number;
  lead_time: number;
}

export default function ListasTecnicas() {
  const [listas, setListas] = useState<ListaTecnica[]>([]);
  const [form, setForm] = useState<Omit<ListaTecnica, "id">>({
    codigo: "",
    nome: "",
    estoque: 0,
    lead_time: 0,
  });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchListas = () => {
    ListaTecnicaAPI.list().then((res) => setListas(res.data));
  };

  useEffect(() => {
    fetchListas();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const action = editId
      ? ListaTecnicaAPI.update(editId, form)
      : ListaTecnicaAPI.create(form);

    action
      .then(() => {
        fetchListas();
        setForm({ codigo: "", nome: "", estoque: 0, lead_time: 0 });
        setEditId(null);
      })
      .catch((err) => {
        console.error("Erro ao salvar lista técnica:", err.response?.data || err.message);
      });
  };

  const handleEdit = (lista: ListaTecnica) => {
    setForm({
      codigo: lista.codigo,
      nome: lista.nome,
      estoque: lista.estoque,
      lead_time: lista.lead_time,
    });
    setEditId(lista.id);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja realmente excluir esta lista técnica?")) {
      ListaTecnicaAPI.remove(id).then(fetchListas);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Listas Técnicas</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          name="codigo"
          placeholder="Código"
          value={form.codigo}
          onChange={handleChange}
        />
        <input
          name="nome"
          placeholder="Nome"
          value={form.nome}
          onChange={handleChange}
        />
        <input
          name="estoque"
          placeholder="Estoque"
          type="number"
          value={form.estoque}
          onChange={handleChange}
        />
        <input
          name="lead_time"
          placeholder="Lead Time"
          type="number"
          value={form.lead_time}
          onChange={handleChange}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {editId ? "Atualizar" : "Adicionar"}
      </button>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Código</th>
            <th className="border px-2 py-1">Nome</th>
            <th className="border px-2 py-1">Estoque</th>
            <th className="border px-2 py-1">Lead Time</th>
            <th className="border px-2 py-1">Ações</th>
          </tr>
        </thead>
        <tbody>
          {listas.map((lista) => (
            <tr key={lista.id}>
              <td className="border px-2 py-1">{lista.codigo}</td>
              <td className="border px-2 py-1">{lista.nome}</td>
              <td className="border px-2 py-1">{lista.estoque}</td>
              <td className="border px-2 py-1">{lista.lead_time}</td>
              <td className="border px-2 py-1 space-x-2">
                <button
                  onClick={() => handleEdit(lista)}
                  className="text-blue-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(lista.id)}
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
