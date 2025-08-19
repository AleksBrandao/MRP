import { useState } from "react";
import { ComponenteAPI } from "../services/api";

interface FormData {
  codigo: string;
  nome: string;
  fabricante: string;
  codigo_fabricante: string;
  unidade: string;
  estoque: number;
  lead_time: number;
  tipo: string;
  id?: number; // opcional, usado na edição
}

export default function CadastrarComponente({
  onClose,
  onSuccess,
  initialData,
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: FormData;
}) {
  const [form, setForm] = useState<FormData>(() => {
    return initialData ?? {
      codigo: "",
      nome: "",
      fabricante: "",
      codigo_fabricante: "",
      unidade: "un",
      estoque: 0,
      lead_time: 0,
      tipo: "produto",
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = () => {
    const acao = initialData?.id
      ? ComponenteAPI.update(initialData.id, form)
      : ComponenteAPI.create(form);

    acao
      .then(() => {
        alert(initialData?.id ? "Componente atualizado com sucesso!" : "Componente cadastrado com sucesso!");
        onSuccess();
        onClose();
      })
      .catch((err) => {
        console.error("❌ Erro ao salvar:", err.response?.data || err.message);
        alert("Erro ao salvar componente.");
      });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">
        {initialData ? "Editar Componente" : "Cadastrar Componente"}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <input name="codigo" placeholder="Código" onChange={handleChange} value={form.codigo} />
        <input name="nome" placeholder="Nome" onChange={handleChange} value={form.nome} />
        <input name="fabricante" placeholder="Fabricante" onChange={handleChange} value={form.fabricante} />
        <input
          name="codigo_fabricante"
          placeholder="Código do Fabricante"
          onChange={handleChange}
          value={form.codigo_fabricante}
        />
        <input name="unidade" placeholder="Unidade (ex: un, kg)" onChange={handleChange} value={form.unidade} />
        <input name="estoque" placeholder="Estoque" type="number" onChange={handleChange} value={form.estoque} />
        <input name="lead_time" placeholder="Lead Time (dias)" type="number" onChange={handleChange} value={form.lead_time} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
          Cancelar
        </button>
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
          {initialData ? "Salvar Alterações" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
