// src/pages/ListasTecnicasPage.tsx
import { useEffect, useMemo, useState } from "react";
import { ListasTecnicasAPI, ComponentesAPI } from "../services/api";

interface ProdutoOption { id: number; codigo: string; nome: string; }
interface BOMForm { produto_pai: number | ""; componente: number | ""; quantidade: number; }

export function ListasTecnicasPage() {
  const [boms, setBoms] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BOMForm>({ produto_pai: "", componente: "", quantidade: 1 });

  const mapProduto = useMemo(() => {
    const m: Record<number, ProdutoOption> = {};
    produtos.forEach((p) => (m[p.id] = p));
    return m;
  }, [produtos]);

  const load = async () => {
    const [b, comps] = await Promise.all([ListasTecnicasAPI.list(), ComponentesAPI.list()]);
    setBoms(b.data);
    setProdutos(comps.data);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async () => {
    const payload = { ...form, quantidade: Number(form.quantidade) };
    if (!payload.produto_pai || !payload.componente) return alert("Selecione produto e componente");

    if (editId) await ListasTecnicasAPI.update(editId, payload);
    else await ListasTecnicasAPI.create(payload);

    setOpen(false);
    setEditId(null);
    setForm({ produto_pai: "", componente: "", quantidade: 1 });
    load();
  };

  const onDelete = async (id: number) => {
    if (confirm("Excluir esta relação da Lista Técnica?")) {
      await ListasTecnicasAPI.remove(id);
      load();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Listas Técnicas (BOM)</h1>
        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow" onClick={() => setOpen(true)}>
          Nova Relação
        </button>
      </div>

      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 border-b">Produto Pai</th>
              <th className="px-3 py-2 border-b">Componente</th>
              <th className="px-3 py-2 border-b">Quantidade</th>
              <th className="px-3 py-2 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {boms.map((row) => {
              const pai = mapProduto[row.produto_pai] || row.produto_pai_obj; // caso o serializer traga obj
              const comp = mapProduto[row.componente] || row.componente_obj;
              const paiLabel = pai ? `${pai.codigo} — ${pai.nome}` : row.produto_pai;
              const compLabel = comp ? `${comp.codigo} — ${comp.nome}` : row.componente;
              return (
                <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 border-b">{paiLabel}</td>
                  <td className="px-3 py-2 border-b">{compLabel}</td>
                  <td className="px-3 py-2 border-b">{row.quantidade}</td>
                  <td className="px-3 py-2 border-b">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded-lg border"
                        onClick={() => {
                          setEditId(row.id);
                          setForm({ produto_pai: row.produto_pai, componente: row.componente, quantidade: row.quantidade });
                          setOpen(true);
                        }}
                      >
                        Editar
                      </button>
                      <button className="px-3 py-1 rounded-lg border text-red-600" onClick={() => onDelete(row.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[720px] shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">{editId ? "Editar" : "Adicionar"} Relação</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-700">Produto Pai</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={form.produto_pai}
                  onChange={(e) => setForm({ ...form, produto_pai: Number(e.target.value) })}
                >
                  <option value="">Selecione…</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{`${p.codigo} — ${p.nome}`}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-sm text-gray-700">Componente</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={form.componente}
                  onChange={(e) => setForm({ ...form, componente: Number(e.target.value) })}
                >
                  <option value="">Selecione…</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{`${p.codigo} — ${p.nome}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-700">Quantidade</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  type="number"
                  value={form.quantidade}
                  min={0}
                  step={0.0001}
                  onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 rounded-xl border" onClick={() => { setOpen(false); setEditId(null); }}>
                Cancelar
              </button>
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white" onClick={onSubmit}>
                {editId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListasTecnicasPage;