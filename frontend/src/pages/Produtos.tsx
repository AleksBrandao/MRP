import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

type TipoItem = "componente" | "materia_prima" | "lista";

interface ItemUnificado {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoItem;
  estoque: number | null;
  lead_time: number | null;
}

const TIPO_LABEL: Record<TipoItem, string> = {
  componente: "Componente",
  materia_prima: "Matéria-Prima",
  lista: "Lista Técnica",
};

const endpointPorTipo: Record<TipoItem, string> = {
  componente: "/componentes/",
  materia_prima: "/materias-primas/",
  lista: "/listas-tecnicas/",
};

const rotaEdicaoPorTipo: Record<TipoItem, string> = {
  componente: "/componentes",
  materia_prima: "/materias-primas",
  lista: "/listas-tecnicas",
};

export default function Produtos() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<ItemUnificado[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoItem>("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<{ campo: "codigo" | "nome"; asc: boolean }>({
    campo: "codigo",
    asc: true,
  });

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [compRes, mpRes, ltRes] = await Promise.all([
        api.get(endpointPorTipo.componente),
        api.get(endpointPorTipo.materia_prima),
        api.get(endpointPorTipo.lista),
      ]);

      const comps: ItemUnificado[] = (compRes.data || []).map((c: any) => ({
        id: c.id,
        codigo: c.codigo,
        nome: c.nome,
        tipo: "componente",
        estoque: c.estoque ?? 0,
        lead_time: c.lead_time ?? 0,
      }));

      const mps: ItemUnificado[] = (mpRes.data || []).map((m: any) => ({
        id: m.id,
        codigo: m.codigo,
        nome: m.nome,
        tipo: "materia_prima",
        estoque: m.estoque ?? 0,
        lead_time: m.lead_time ?? 0,
      }));

      const lts: ItemUnificado[] = (ltRes.data || []).map((lt: any) => ({
        id: lt.id,
        codigo: lt.codigo,
        nome: lt.nome,
        tipo: "lista",
        estoque: null,
        lead_time: null,
      }));

      setItens([...comps, ...mps, ...lts]);
    } catch (e: any) {
      console.error(e);
      setErro(e?.response?.data ? JSON.stringify(e.response.data) : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const itensFiltrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();
    let base = itens.filter((i) => {
      const okTipo = !filtroTipo || i.tipo === filtroTipo;
      const okBusca =
        !texto ||
        i.codigo.toLowerCase().includes(texto) ||
        i.nome.toLowerCase().includes(texto) ||
        TIPO_LABEL[i.tipo].toLowerCase().includes(texto);
      return okTipo && okBusca;
    });

    base = base.sort((a, b) => {
      const campo = ordenacao.campo;
      const va = (a[campo] ?? "").toString().toLowerCase();
      const vb = (b[campo] ?? "").toString().toLowerCase();
      if (va < vb) return ordenacao.asc ? -1 : 1;
      if (va > vb) return ordenacao.asc ? 1 : -1;
      // desempate por tipo
      return TIPO_LABEL[a.tipo].localeCompare(TIPO_LABEL[b.tipo]);
    });

    return base;
  }, [itens, busca, filtroTipo, ordenacao]);

  function trocarOrdenacao(campo: "codigo" | "nome") {
    setOrdenacao((prev) => {
      if (prev.campo === campo) return { campo, asc: !prev.asc };
      return { campo, asc: true };
    });
  }

  function editarItem(item: ItemUnificado) {
    // Navega para a página específica com query param para foco/edição.
    // A página de destino pode (opcionalmente) ler ?id= para carregar o registro.
    navigate(`${rotaEdicaoPorTipo[item.tipo]}?id=${item.id}`);
  }

  async function excluirItem(item: ItemUnificado) {
    if (!confirm(`Excluir ${item.codigo} — ${item.nome}?`)) return;
    try {
      await api.delete(`${endpointPorTipo[item.tipo]}${item.id}/`);
      setItens((prev) => prev.filter((p) => !(p.id === item.id && p.tipo === item.tipo)));
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : "Erro ao excluir");
    }
  }

  function adicionar(tipo: TipoItem) {
    // Roteamento para a página de criação do tipo.
    // Se você tiver rotas /novo específicas (ex.: /componentes/novo), pode trocar aqui.
    navigate(rotaEdicaoPorTipo[tipo]);
  }

  const total = itens.length;
  const totalPorTipo: Record<TipoItem, number> = {
    componente: itens.filter((i) => i.tipo === "componente").length,
    materia_prima: itens.filter((i) => i.tipo === "materia_prima").length,
    lista: itens.filter((i) => i.tipo === "lista").length,
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo Unificado</h1>
          <p className="text-sm text-gray-600">
            {loading ? "Carregando…" : `${total} registro(s)`} • {totalPorTipo.componente} componentes • {totalPorTipo.materia_prima} matérias-primas • {totalPorTipo.lista} listas técnicas
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => adicionar("componente")} className="px-3 py-2 rounded bg-black text-white">+ Componente</button>
          <button onClick={() => adicionar("materia_prima")} className="px-3 py-2 rounded bg-black text-white">+ Matéria-Prima</button>
          <button onClick={() => adicionar("lista")} className="px-3 py-2 rounded bg-black text-white">+ Lista Técnica</button>
          <button onClick={carregar} className="px-3 py-2 rounded border">Atualizar</button>
        </div>
      </header>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium">Buscar</label>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="código, nome, tipo…"
            className="border px-3 py-2 rounded w-72"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="border px-3 py-2 rounded"
          >
            <option value="">Todos</option>
            <option value="componente">{TIPO_LABEL.componente}</option>
            <option value="materia_prima">{TIPO_LABEL.materia_prima}</option>
            <option value="lista">{TIPO_LABEL.lista}</option>
          </select>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => trocarOrdenacao("codigo")}>
                Código {ordenacao.campo === "codigo" ? (ordenacao.asc ? "▲" : "▼") : ""}
              </th>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => trocarOrdenacao("nome")}>
                Nome {ordenacao.campo === "nome" ? (ordenacao.asc ? "▲" : "▼") : ""}
              </th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-right px-3 py-2">Estoque</th>
              <th className="text-right px-3 py-2">Lead Time</th>
              <th className="text-right px-3 py-2 w-48">Ações</th>
            </tr>
          </thead>
          <tbody>
            {erro && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-red-600">{erro}</td>
              </tr>
            )}
            {!erro && loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-gray-500">Carregando…</td>
              </tr>
            )}
            {!erro && !loading && itensFiltrados.map((row) => (
              <tr key={`${row.tipo}-${row.id}`} className="border-t">
                <td className="px-3 py-2">{row.codigo}</td>
                <td className="px-3 py-2">{row.nome}</td>
                <td className="px-3 py-2">{TIPO_LABEL[row.tipo]}</td>
                <td className="px-3 py-2 text-right">{row.estoque ?? "—"}</td>
                <td className="px-3 py-2 text-right">{row.lead_time ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => editarItem(row)} className="mr-3 underline">Editar</button>
                  <button onClick={() => excluirItem(row)} className="underline text-red-600">Excluir</button>
                </td>
              </tr>
            ))}
            {!erro && !loading && itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhum registro</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
