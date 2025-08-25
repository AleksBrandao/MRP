// src/pages/ListasTecnicas.tsx
import { useEffect, useMemo, useState } from "react";
import { ListaTecnicaAPI } from "../services/api";

type LT = {
  id: number;
  codigo: string;
  nome: string;
  tipo: "SERIE" | "SISTEMA" | "CONJUNTO" | "SUBCONJUNTO" | "ITEM";
  observacoes?: string;
  parent?: number | null;
  parent_codigo?: string | null;
  parent_nome?: string | null;
};

const TIPOS = [
  { value: "SERIE", label: "Série" },
  { value: "SISTEMA", label: "Sistema" },
  { value: "CONJUNTO", label: "Conjunto" },
  { value: "SUBCONJUNTO", label: "Subconjunto" },
  { value: "ITEM", label: "Item" },
] as const;

const ORDEM = ["SERIE", "SISTEMA", "CONJUNTO", "SUBCONJUNTO", "ITEM"] as const;

export default function ListasTecnicas() {
  const [itens, setItens] = useState<LT[]>([]);
  const [form, setForm] = useState<Omit<LT, "id">>({
    codigo: "",
    nome: "",
    tipo: "SERIE",
    observacoes: "",
    parent: null,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const r = await ListaTecnicaAPI.list();
    setItens(r.data);
  };

  useEffect(() => { carregar(); }, []);

  // Filtra pais compatíveis: pai deve ser exatamente o nível anterior
  const paisValidos = useMemo(() => {
    const idx = ORDEM.indexOf(form.tipo);
    const tipoPaiEsperado = idx > 0 ? ORDEM[idx - 1] : null;
    return tipoPaiEsperado
      ? itens.filter((i) => i.tipo === tipoPaiEsperado)
      : [];
  }, [form.tipo, itens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { ...form };
      // parent null quando não aplicável (ex.: SERIE não tem pai)
      if (!form.parent) payload.parent = null;

      if (editId) {
        await ListaTecnicaAPI.update(editId, payload);
      } else {
        await ListaTecnicaAPI.create(payload);
      }
      setForm({ codigo: "", nome: "", tipo: "SERIE", observacoes: "", parent: null });
      setEditId(null);
      await carregar();
    } catch (err: any) {
      const data = err?.response?.data;
      console.error("Erro ao salvar:", data);
      alert(
        (data && typeof data === "object"
          ? Object.entries(data)
              .map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join("; ") : v}`)
              .join("\n")
          : "Erro ao salvar.") as string
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (i: LT) => {
    setEditId(i.id);
    setForm({
      codigo: i.codigo,
      nome: i.nome,
      tipo: i.tipo,
      observacoes: i.observacoes || "",
      parent: (i as any).parent ?? null,
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-semibold mb-4">Listas Técnicas</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 mb-4">
        <input className="border rounded px-3 py-2" placeholder="Código"
          value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Nome"
          value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}/>

        <select className="border rounded px-3 py-2"
          value={form.tipo}
          onChange={(e) => {
            const novoTipo = e.target.value as LT["tipo"];
            // ao mudar tipo, zera o parent se ficar inválido
            setForm((f) => ({ ...f, tipo: novoTipo, parent: null }));
          }}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input className="border rounded px-3 py-2" placeholder="Observações"
          value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}/>

        {/* Parent: só aparece quando tipo NÃO é SERIE */}
        {form.tipo !== "SERIE" && (
          <select className="border rounded px-3 py-2 col-span-2"
            value={form.parent ?? ""}
            onChange={(e) =>
              setForm({ ...form, parent: e.target.value ? Number(e.target.value) : null })
            }>
            <option value="">(Selecione o {TIPOS[ORDEM.indexOf(form.tipo) - 1].label})</option>
            {paisValidos.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.codigo}] {p.nome} — {p.tipo}
              </option>
            ))}
          </select>
        )}

        <button disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2">
          {editId ? "Salvar" : "Adicionar"}
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            {/* <th className="py-2 px-2">Código</th> */}
            <th className="py-2 px-2">Nome</th>
            <th className="py-2 px-2">Tipo</th>
            <th className="py-2 px-2">Observações</th>
            <th className="py-2 px-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id} className="border-b">
              {/* <td className="py-2 px-2">{i.codigo}</td> */}
              <td className="py-2 px-2">{i.nome}</td>
              <td className="py-2 px-2">{i.tipo}</td>
              <td className="py-2 px-2">{i.observacoes}</td>
              <td className="py-2 px-2">
                <button className="text-blue-600 mr-3" onClick={() => startEdit(i)}>Editar</button>
                <button className="text-red-600" onClick={async () => {
                  if (confirm("Excluir esse registro?")) {
                    await ListaTecnicaAPI.remove(i.id);
                    await carregar();
                  }
                }}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
