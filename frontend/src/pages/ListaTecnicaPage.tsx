// frontend/src/pages/ListaTecnicaPage.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

type TipoLT = "SERIE" | "SISTEMA" | "CONJUNTO" | "SUB-CONJUNTO" | "ITEM";

interface ListaTecnica {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoLT;
  parent?: number | null;
  parent_codigo?: string;
  parent_nome?: string;
  observacoes?: string;
}

const TIPO_LABEL: Record<TipoLT, string> = {
  "SERIE": "SÉRIE",
  "SISTEMA": "SISTEMA",
  "CONJUNTO": "CONJUNTO",
  "SUB-CONJUNTO": "SUB-CONJUNTO",
  "ITEM": "ITEM",
};

// regra (frontend) para popular o select de PAI corretamente
const PAI_ESPERADO: Record<TipoLT, TipoLT | null> = {
  "SERIE": null,
  "SISTEMA": "SERIE",
  "CONJUNTO": "SISTEMA",
  "SUB-CONJUNTO": "CONJUNTO",
  "ITEM": "SUB-CONJUNTO",
};

export default function ListaTecnicaPage() {
  const [data, setData] = useState<ListaTecnica[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoLT>("");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<ListaTecnica, "id">>({
    codigo: "",
    nome: "",
    tipo: "CONJUNTO",
    parent: null,
    observacoes: "",
  });

  useEffect(() => {
    api.get("/listas-tecnicas/")
      .then((res) => setData(res.data))
      .catch((e) => console.error(e));
  }, []);

  const paisValidos = useMemo(() => {
    const esperado = PAI_ESPERADO[form.tipo as TipoLT];
    if (!esperado) return [];
    return data.filter(d => d.tipo === esperado);
  }, [data, form.tipo]);

  const filtrados = useMemo(() => {
    return data.filter(d => {
      const okTipo = !filtroTipo || d.tipo === filtroTipo;
      const okBusca = [d.codigo, d.nome, d.parent_codigo, d.parent_nome]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(busca.toLowerCase());
      return okTipo && okBusca;
    });
  }, [data, filtroTipo, busca]);

  function resetForm() {
    setForm({ codigo: "", nome: "", tipo: "CONJUNTO", parent: null, observacoes: "" });
    setEditId(null);
  }

  async function salvar() {
    try {
      if (editId) {
        await api.put(`/listas-tecnicas/${editId}/`, form);
      } else {
        await api.post(`/listas-tecnicas/`, form);
      }
      const res = await api.get("/listas-tecnicas/");
      setData(res.data);
      resetForm();
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : "Erro ao salvar");
      console.error(e);
    }
  }

  function iniciarEdicao(row: ListaTecnica) {
    setEditId(row.id);
    setForm({
      codigo: row.codigo,
      nome: row.nome,
      tipo: row.tipo,
      parent: row.parent ?? null,
      observacoes: row.observacoes ?? "",
    });
  }

  async function remover(id: number) {
    if (!confirm("Remover este registro?")) return;
    try {
      await api.delete(`/listas-tecnicas/${id}/`);
      setData(prev => prev.filter(d => d.id !== id));
      if (editId === id) resetForm();
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : "Erro ao remover");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listas Técnicas</h1>
      </header>

      {/* Filtros */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium">Buscar</label>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="código, nome..."
            className="border px-3 py-2 rounded w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tipo</label>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value as any)}
            className="border px-3 py-2 rounded"
          >
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABEL) as TipoLT[]).map(t =>
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            )}
          </select>
        </div>
      </div>

      {/* Formulário */}
      <div className="border rounded-xl p-4 space-y-3 shadow-sm">
        <h2 className="font-medium">{editId ? "Editar" : "Novo"} cadastro</h2>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium">Código</label>
            <input
              value={form.codigo}
              onChange={e => setForm({ ...form, codigo: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Nome</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value as TipoLT, parent: null })}
              className="border px-3 py-2 rounded w-full"
            >
              {(Object.keys(TIPO_LABEL) as TipoLT[]).map(t =>
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Pai {PAI_ESPERADO[form.tipo as TipoLT] ? `(tipo: ${PAI_ESPERADO[form.tipo as TipoLT]})` : "(não aplicável)"}
            </label>
            <select
              disabled={!PAI_ESPERADO[form.tipo as TipoLT]}
              value={form.parent ?? ""}
              onChange={e => setForm({ ...form, parent: e.target.value ? Number(e.target.value) : null })}
              className="border px-3 py-2 rounded w-full disabled:opacity-60"
            >
              <option value="">— sem pai —</option>
              {paisValidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-5">
            <label className="block text-sm font-medium">Observações</label>
            <textarea
              value={form.observacoes ?? ""}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              className="border px-3 py-2 rounded w-full min-h-[70px]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={salvar} className="px-4 py-2 rounded bg-black text-white">
            {editId ? "Salvar alterações" : "Adicionar"}
          </button>
          {editId && (
            <button onClick={resetForm} className="px-4 py-2 rounded border">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2">Código</th>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Pai</th>
              <th className="text-right px-3 py-2 w-40">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.codigo}</td>
                <td className="px-3 py-2">{row.nome}</td>
                <td className="px-3 py-2">{TIPO_LABEL[row.tipo]}</td>
                <td className="px-3 py-2">{row.parent_codigo ? `${row.parent_codigo} — ${row.parent_nome}` : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => iniciarEdicao(row)} className="mr-2 underline">Editar</button>
                  <button onClick={() => remover(row.id)} className="underline text-red-600">Excluir</button>
                </td>
              </tr>
            ))}
            {!filtrados.length && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>Nenhum registro</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
