// src/components/CadastrarComponente.tsx
import { useMemo, useState } from "react";
import { ComponenteAPI } from "../services/api";

export type Componente = {
  id?: number;
  codigo: string;
  nome: string;
  fabricante?: string;
  codigo_fabricante?: string;
  unidade?: string;
  estoque: number;
  lead_time: number;
  tipo: "componente";
};

type Props = {
  onClose: () => void;
  onSaved: (saved: Componente) => void;     // ⬅️ devolve o objeto salvo
  initialData?: Componente;
};

export default function CadastrarComponente({ onClose, onSaved, initialData }: Props) {
  const empty: Componente = useMemo(
    () => ({
      codigo: "",
      nome: "",
      fabricante: "",
      codigo_fabricante: "",
      unidade: "Uds",
      estoque: 0,
      lead_time: 0,
      tipo: "componente",
    }),
    []
  );

  const [form, setForm] = useState<Componente>(initialData ?? empty);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const set = (name: keyof Componente, value: any) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSaving(true);
    try {
      const resp = initialData?.id
        ? await ComponenteAPI.update(initialData.id, { ...form, tipo: "componente" })
        : await ComponenteAPI.create({ ...form, tipo: "componente" });

      onSaved(resp.data);      // ⬅️ atualiza lista no pai
    } catch (err: any) {
      const detail =
        err?.response?.data ? JSON.stringify(err.response.data) : err?.message || "Erro ao salvar.";
      setErro(detail);
      console.error("❌ Erro ao salvar:", detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Cabeçalho do cartão */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {initialData ? "Editar componente" : "Novo componente"}
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          Fechar
        </button>
      </div>

      {/* Form em 2 colunas, labels acima, inputs com borda arredondada */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Código</label>
          <input
            value={form.codigo}
            onChange={(e) => set("codigo", e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: CH47610301M02"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Nome</label>
          <input
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: Rolamento 6202 2RS C3 WT"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Fabricante</label>
          <input
            value={form.fabricante || ""}
            onChange={(e) => set("fabricante", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: SKF/NSK/FAG"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Código do Fabricante</label>
          <input
            value={form.codigo_fabricante || ""}
            onChange={(e) => set("codigo_fabricante", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: 6202 2RS C3 WT"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Unidade</label>
          <input
            value={form.unidade || ""}
            onChange={(e) => set("unidade", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: Uds"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Estoque</label>
          <input
            type="number"
            value={form.estoque ?? 0}
            onChange={(e) => set("estoque", Number(e.target.value))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Lead time (dias)</label>
          <input
            type="number"
            value={form.lead_time ?? 0}
            onChange={(e) => set("lead_time", Number(e.target.value))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>

        {erro && (
          <div className="col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="col-span-2 mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
