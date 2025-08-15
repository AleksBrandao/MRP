import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export type Produto = {
  id?: number;
  codigo: string;
  nome: string;
  fabricante?: string;
  codigo_fabricante?: string;
  unidade?: string; // ex: un, kg, m
  estoque: number;
  lead_time: number; // em dias
  tipo: "produto" | "materia_prima" | "lista";
};

interface ProdutoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (saved: Produto) => void;
  initialData?: Produto | null; // se vier preenchido, é edição
}

export default function ProdutoFormModal({ open, onClose, onSaved, initialData }: ProdutoFormModalProps) {
  const empty: Produto = useMemo(
    () => ({
      codigo: "",
      nome: "",
      fabricante: "",
      codigo_fabricante: "",
      unidade: "",
      estoque: 0,
      lead_time: 0,
      tipo: "produto",
    }),
    []
  );

  const [form, setForm] = useState<Produto>(empty);
  const isEditing = Boolean(initialData?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...empty, ...initialData } : empty);
      setError(null);
    }
  }, [open, initialData, empty]);

  function handleChange<T extends keyof Produto>(field: T, value: Produto[T]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form } as Produto;
      let resp;
      if (isEditing && initialData?.id) {
        resp = await api.put(`/produtos/${initialData.id}/`, payload);
      } else {
        resp = await api.post("/produtos/", payload);
      }
      const saved = resp.data as Produto;
      onSaved?.(saved);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : err?.message || "Erro ao salvar.";
      setError(msg);
      console.error("Salvar produto:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Editar Componente" : "Cadastrar Componente"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Código</span>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.codigo}
                onChange={(e) => handleChange("codigo", e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Nome</span>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Fabricante</span>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.fabricante || ""}
                onChange={(e) => handleChange("fabricante", e.target.value)}
                placeholder="-"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Código do Fabricante</span>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.codigo_fabricante || ""}
                onChange={(e) => handleChange("codigo_fabricante", e.target.value)}
                placeholder="-"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Unidade (ex: un, kg, m)</span>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.unidade || ""}
                onChange={(e) => handleChange("unidade", e.target.value)}
                placeholder="un"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Estoque</span>
              <input
                type="number"
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.estoque}
                onChange={(e) => handleChange("estoque", Number(e.target.value))}
                min={0}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Lead Time (dias)</span>
              <input
                type="number"
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.lead_time}
                onChange={(e) => handleChange("lead_time", Number(e.target.value))}
                min={0}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Tipo</span>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={form.tipo}
                onChange={(e) => handleChange("tipo", e.target.value as Produto["tipo"]) }
              >
                <option value="produto">Componente</option>
                <option value="materia_prima">Matéria-Prima</option>
                <option value="lista">Lista Técnica (BOM)</option>
              </select>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? (isEditing ? "Salvando..." : "Adicionando...") : isEditing ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}