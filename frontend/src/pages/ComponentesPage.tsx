// src/pages/ComponentesPage.tsx
import { useEffect, useState } from "react";
import { ComponentesAPI } from "../services/api";

interface Form {
  codigo: string; nome: string; unidade: string;
  estoque: number; lead_time: number;
  fabricante?: string; codigo_fabricante?: string;
}

export default function ComponentesPage() {
  const [itens, setItens] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<Form>({
    codigo: "", nome: "", unidade: "un", estoque: 0, lead_time: 0,
    fabricante: "-", codigo_fabricante: "-"
  });

  const load = () => ComponentesAPI.list().then(r => setItens(r.data));
  useEffect(() => { load(); }, []);

  const onSubmit = async () => {
    if (editId) await ComponentesAPI.update(editId, form);
    else await ComponentesAPI.create(form); // backend fixa tipo="componente"
    setOpen(false); setEditId(null);
    setForm({ codigo:"", nome:"", unidade:"un", estoque:0, lead_time:0, fabricante:"-", codigo_fabricante:"-" });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Componentes</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>Novo Componente</button>
      </div>

      <table className="min-w-full border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border">Código</th>
            <th className="px-3 py-2 border">Nome</th>
            <th className="px-3 py-2 border">Unid.</th>
            <th className="px-3 py-2 border">Estoque</th>
            <th className="px-3 py-2 border">Lead Time</th>
            <th className="px-3 py-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(it => (
            <tr key={it.id}>
              <td className="px-3 py-2 border">{it.codigo}</td>
              <td className="px-3 py-2 border">{it.nome}</td>
              <td className="px-3 py-2 border">{it.unidade}</td>
              <td className="px-3 py-2 border">{it.estoque}</td>
              <td className="px-3 py-2 border">{it.lead_time} d</td>
              <td className="px-3 py-2 border">
                <button className="btn btn-sm" onClick={()=>{ setEditId(it.id); setForm(it); setOpen(true); }}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[640px]">
            <h2 className="text-xl font-semibold mb-4">{editId ? "Editar" : "Cadastrar"} Componente</h2>

            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Código" value={form.codigo}
                onChange={e=>setForm({...form, codigo:e.target.value})} className="input"/>
              <input placeholder="Nome" value={form.nome}
                onChange={e=>setForm({...form, nome:e.target.value})} className="input"/>
              <input placeholder="Unidade" value={form.unidade}
                onChange={e=>setForm({...form, unidade:e.target.value})} className="input"/>
              <input type="number" placeholder="Estoque" value={form.estoque}
                onChange={e=>setForm({...form, estoque:Number(e.target.value)})} className="input"/>
              <input type="number" placeholder="Lead Time (dias)" value={form.lead_time}
                onChange={e=>setForm({...form, lead_time:Number(e.target.value)})} className="input"/>
              <input placeholder="Fabricante" value={form.fabricante}
                onChange={e=>setForm({...form, fabricante:e.target.value})} className="input"/>
              <input placeholder="Código do Fabricante" value={form.codigo_fabricante}
                onChange={e=>setForm({...form, codigo_fabricante:e.target.value})} className="input col-span-2"/>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn" onClick={()=>{ setOpen(false); setEditId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={onSubmit}>{editId ? "Salvar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
