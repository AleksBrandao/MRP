// src/pages/MateriasPrimasPage.tsx
import { useEffect, useState } from "react";
import { MateriasPrimasAPI } from "../services/api";

interface MateriaPrimaForm {
  codigo: string;
  nome: string;
  unidade: string;
  estoque: number;
  lead_time: number;
  fabricante?: string;
  codigo_fabricante?: string;
}

export default function MateriasPrimasPage() {
  const [itens, setItens] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<MateriaPrimaForm>({
    codigo: "",
    nome: "",
    unidade: "un",
    estoque: 0,
    lead_time: 0,
    fabricante: "-",
    codigo_fabricante: "-",
  });

  const load = () => MateriasPrimasAPI.list().then((r) => setItens(r.data));
  useEffect(() => { load(); }, []);

  const onSubmit = async () => {
    if (editId) await MateriasPrimasAPI.update(editId, form);
    else await MateriasPrimasAPI.create(form);
    setOpen(false);
    setEditId(null);
    setForm({ codigo: "", nome: "", unidade: "un", estoque: 0, lead_time: 0, fabricante: "-", codigo_fabricante: "-" });
    load();
  };

  const onDelete = async (id: number) => {
    if (confirm("Excluir este registro?")) {
      await MateriasPrimasAPI.remove(id);
      load();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Matérias‑primas</h1>
        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow" onClick={() => setOpen(true)}>
          Nova Matéria‑prima
        </button>
      </div>

      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 border-b">Código</th>
              <th className="px-3 py-2 border-b">Nome</th>
              <th className="px-3 py-2 border-b">Unid.</th>
              <th className="px-3 py-2 border-b">Estoque</th>
              <th className="px-3 py-2 border-b">Lead Time</th>
              <th className="px-3 py-2 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it) => (
              <tr key={it.id} className="odd:bg-white even:bg-gray-50">
                <td className="px-3 py-2 border-b">{it.codigo}</td>
                <td className="px-3 py-2 border-b">{it.nome}</td>
                <td className="px-3 py-2 border-b">{it.unidade}</td>
                <td className="px-3 py-2 border-b">{it.estoque}</td>
                <td className="px-3 py-2 border-b">{it.lead_time} d</td>
                <td className="px-3 py-2 border-b">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-lg border"
                      onClick={() => {
                        setEditId(it.id);
                        setForm({
                          codigo: it.codigo,
                          nome: it.nome,
                          unidade: it.unidade ?? "un",
                          estoque: Number(it.estoque) ?? 0,
                          lead_time: Number(it.lead_time) ?? 0,
                          fabricante: it.fabricante ?? "-",
                          codigo_fabricante: it.codigo_fabricante ?? "-",
                        });
                        setOpen(true);
                      }}
                    >
                      Editar
                    </button>
                    <button className="px-3 py-1 rounded-lg border text-red-600" onClick={() => onDelete(it.id)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[680px] shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">{editId ? "Editar" : "Cadastrar"} Matéria‑prima</h2>

            <div className="grid grid-cols-2 gap-4">
              <input className="border rounded-xl px-3 py-2" placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" type="number" placeholder="Estoque" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })} />
              <input className="border rounded-xl px-3 py-2" type="number" placeholder="Lead Time (dias)" value={form.lead_time} onChange={(e) => setForm({ ...form, lead_time: Number(e.target.value) })} />
              <input className="border rounded-xl px-3 py-2" placeholder="Fabricante" value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
              <input className="border rounded-xl px-3 py-2 col-span-2" placeholder="Código do Fabricante" value={form.codigo_fabricante} onChange={(e) => setForm({ ...form, codigo_fabricante: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 rounded-xl border" onClick={() => { setOpen(false); setEditId(null); }}>Cancelar</button>
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white" onClick={onSubmit}>{editId ? "Salvar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

