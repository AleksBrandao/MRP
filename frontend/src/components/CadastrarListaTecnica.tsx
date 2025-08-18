import { useState } from "react";
import api from "../services/http";

interface FormData {
  codigo: string;
  nome: string;
  unidade: string;
  estoque: number;
  lead_time: number;
}

export default function CadastrarListaTecnica({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<FormData>({
    codigo: "",
    nome: "",
    unidade: "un",
    estoque: 0,
    lead_time: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = () => {
    api.post("/listas-tecnicas/", { ...form, tipo: "lista" }).then(() => {
      alert("Lista Técnica cadastrada com sucesso!");
      onSuccess();
      onClose();
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Cadastrar Lista Técnica</h2>
      <div className="grid grid-cols-2 gap-4">
        <input name="codigo" placeholder="Código" onChange={handleChange} value={form.codigo} />
        <input name="nome" placeholder="Nome" onChange={handleChange} value={form.nome} />
        <input name="unidade" placeholder="Unidade (ex: un, kg)" onChange={handleChange} value={form.unidade} />
        <input name="estoque" placeholder="Estoque" type="number" onChange={handleChange} value={form.estoque} />
        <input name="lead_time" placeholder="Lead Time (dias)" type="number" onChange={handleChange} value={form.lead_time} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancelar</button>
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">Adicionar</button>
      </div>
    </div>
  );
}