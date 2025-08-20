import { useEffect, useState } from "react";
import api from "../services/http";

/** Tipos vindos do backend */
interface ListaTecnica {
  id: number;
  codigo: string;
  nome: string;
  tipo: "SERIE" | "SISTEMA" | "CONJUNTO" | "SUBCONJUNTO" | "ITEM";
  parent?: number | null;
  parent_codigo?: string | null;
  parent_nome?: string | null;
}

interface Produto {
  id: number;
  codigo?: string;
  nome: string;
  // demais campos existem, mas não são obrigatórios aqui
}

interface BOMItem {
  id: number;
  lista_pai: number;
  lista_pai_codigo: string;
  lista_pai_nome: string;
  componente: number;
  componente_codigo: string;
  componente_nome: string;
  quantidade: number;
}

/** Form enviado ao backend */
interface BOMForm {
  lista_pai: number;
  componente: number;
  quantidade: number;
}

export default function BOM() {
  const [bom, setBOM] = useState<BOMItem[]>([]);
  const [listas, setListas] = useState<ListaTecnica[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<BOMForm>({ lista_pai: 0, componente: 0, quantidade: 1 });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      await Promise.all([carregarBOM(), carregarListas(), carregarProdutos()]);
    } finally {
      setLoading(false);
    }
  };

  const carregarBOM = async () => {
    try {
      const res = await api.get("/bom/");
      setBOM(res.data as BOMItem[]);
    } catch (err) {
      console.error("Erro ao carregar BOM:", err);
    }
  };

  const carregarListas = async () => {
    try {
      const res = await api.get("/listas-tecnicas/");
      // Se quiser restringir apenas a ITEM como pai, descomente a linha abaixo:
      const apenasItens = (res.data as ListaTecnica[]).filter(l => l.tipo === "ITEM");
      setListas(apenasItens);
      // setListas(res.data as ListaTecnica[]);
    } catch (err) {
      console.error("Erro ao carregar listas técnicas:", err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await api.get("/produtos/");
      setProdutos(res.data as Produto[]);
    } catch (err) {
      console.error("Erro ao carregar produtos (componentes):", err);
    }
  };

  const resetForm = () => setForm({ lista_pai: 0, componente: 0, quantidade: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lista_pai || !form.componente || !form.quantidade) return;

    try {
      if (editId) {
        await api.put(`/bom/${editId}/`, form);
        setEditId(null);
      } else {
        await api.post("/bom/", form);
      }
      resetForm();
      await carregarBOM();
    } catch (err) {
      console.error(editId ? "Erro ao editar item da BOM:" : "Erro ao adicionar item à BOM:", err);
    }
  };

  const iniciarEdicao = (item: BOMItem) => {
    setEditId(item.id);
    setForm({
      lista_pai: item.lista_pai,
      componente: item.componente,
      quantidade: item.quantidade,
    });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja excluir este item da BOM?")) return;
    try {
      await api.delete(`/bom/${id}/`);
      await carregarBOM();
    } catch (err) {
      console.error("Erro ao excluir item da BOM:", err);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {editId ? "Editar Estrutura de Produto (BOM)" : "Cadastro de Estrutura de Produto (BOM)"}
        </h1>
        {loading && <span className="text-sm text-gray-500">Carregando…</span>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        {/* Lista Técnica (Pai) */}
        <select
          value={form.lista_pai}
          onChange={(e) => setForm({ ...form, lista_pai: Number(e.target.value) })}
          className="border px-3 py-2 w-full rounded"
          required
        >
          <option value={0}>Selecione a Lista Técnica (Pai)</option>
          {listas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.codigo} — {l.nome} ({l.tipo})
            </option>
          ))}
        </select>

        {/* Componente */}
        <select
          value={form.componente}
          onChange={(e) => setForm({ ...form, componente: Number(e.target.value) })}
          className="border px-3 py-2 w-full rounded"
          required
        >
          <option value={0}>Selecione o Componente</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo ? `[${p.codigo}] ` : ""}{p.nome}
            </option>
          ))}
        </select>

        {/* Quantidade */}
        <input
          type="number"
          placeholder="Quantidade"
          value={form.quantidade}
          onChange={(e) =>
            setForm({ ...form, quantidade: e.target.value === "" ? 0 : Number(e.target.value) })
          }
          className="border px-3 py-2 w-full rounded"
          min={0}
          step={1}
          required
        />

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {editId ? "Salvar Alterações" : "Adicionar Componente"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-2">Estrutura Atual</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Lista Técnica (Pai)</th>
              <th className="border px-4 py-2 text-left">Componente</th>
              <th className="border px-4 py-2 text-right">Quantidade</th>
              <th className="border px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {bom.map((item) => (
              <tr key={item.id}>
                <td className="border px-4 py-2">
                  {item.lista_pai_codigo ? `[${item.lista_pai_codigo}] ` : ""}
                  {item.lista_pai_nome}
                </td>
                <td className="border px-4 py-2">
                  {item.componente_codigo ? `[${item.componente_codigo}] ` : ""}
                  {item.componente_nome}
                </td>
                <td className="border px-4 py-2 text-right">{item.quantidade}</td>
                <td className="border px-4 py-2 text-center space-x-2">
                  <button
                    onClick={() => iniciarEdicao(item)}
                    className="text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {bom.length === 0 && (
              <tr>
                <td className="border px-4 py-6 text-center text-gray-500" colSpan={4}>
                  Nenhum item cadastrado na BOM.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
