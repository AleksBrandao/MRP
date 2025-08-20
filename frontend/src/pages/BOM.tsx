import { useEffect, useMemo, useState } from "react";
import { BOMAPI, ComponenteAPI, ListaTecnicaAPI } from "../services/api";

// ===== Tipos =====
export interface ListaTecnica {
  id: number;
  codigo: string;
  nome: string;
}

export interface Componente {
  id: number;
  codigo: string;
  nome: string;
}

export interface BOMItem {
  id: number;

  // Pai da relação (Lista Técnica)
  lista_pai: number;              // id
  lista_pai_codigo?: string | null;
  lista_pai_nome?: string | null;

  // Componente
  componente: number;             // id
  componente_codigo?: string | null;
  componente_nome?: string | null;

  quantidade: number | string;
}

// ===== Helpers =====
const label = (codigo?: string | null, nome?: string | null) => {
  const c = (codigo ?? "").trim();
  const n = (nome ?? "").trim();
  if (!c && !n) return "—";
  if (c && n) return `[${c}] ${n}`;
  return c ? `[${c}]` : n;
};

const fmtQtd = (q: number | string | null | undefined) => {
  const num = typeof q === "number" ? q : parseFloat(String(q ?? "0"));
  return Number.isFinite(num)
    ? num.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    : "0,0000";
};

export default function BOMPage() {
  // selects
  const [listas, setListas] = useState<ListaTecnica[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [listaSelecionada, setListaSelecionada] = useState<number | "">("");
  const [componenteSelecionado, setComponenteSelecionado] = useState<number | "">("");

  // formulário
  const [quantidade, setQuantidade] = useState<string>("1");

  // tabela / itens
  const [bom, setBom] = useState<BOMItem[]>([]);

  // edição (opcional)
  const [editando, setEditando] = useState<BOMItem | null>(null);

  // ===== Carregamentos =====
  const carregarListas = async () => {
    const { data } = await ListaTecnicaAPI.list();
    setListas(data);
  };

  const carregarComponentes = async () => {
    const { data } = await ComponenteAPI.list();
    setComponentes(
      // se a API retorna produtos misturados, filtra só "produto"/componentes se necessário
      Array.isArray(data) ? data : []
    );
  };

  const carregarBOM = async () => {
    const { data } = await BOMAPI.list();
    setBom(data);
  };

  useEffect(() => {
    carregarListas();
    carregarComponentes();
    carregarBOM();
  }, []);

  // ===== Ações =====
  const handleAdd = async () => {
    if (!listaSelecionada || !componenteSelecionado) return;

    const payload = {
      lista_pai: Number(listaSelecionada),
      componente: Number(componenteSelecionado),
      quantidade: parseFloat(quantidade || "0"),
    };

    await BOMAPI.create(payload);
    setQuantidade("1");
    setComponenteSelecionado("");
    await carregarBOM();
  };

  const iniciarEdicao = (item: BOMItem) => {
    setEditando(item);
    setListaSelecionada(item.lista_pai);
    setComponenteSelecionado(item.componente);
    setQuantidade(String(item.quantidade ?? "1"));
  };

  const handleDelete = async (id: number) => {
    await BOMAPI.remove(id);
    await carregarBOM();
  };

  // ===== Render =====
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Cadastro de Estrutura de Produto (BOM)</h1>

      {/* Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <select
          className="border rounded px-3 py-2"
          value={listaSelecionada}
          onChange={(e) => setListaSelecionada(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Selecione a Lista Técnica (Pai)</option>
          {listas.map((l) => (
            <option key={l.id} value={l.id}>
              [{l.codigo}] {l.nome}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2"
          value={componenteSelecionado}
          onChange={(e) => setComponenteSelecionado(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Selecione o Componente</option>
          {componentes.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.codigo}] {c.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="any"
          className="border rounded px-3 py-2"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="Quantidade"
        />
      </div>

      <button
        onClick={handleAdd}
        className="bg-blue-600 text-white rounded px-4 py-2 mb-6 hover:bg-blue-700"
      >
        {editando ? "Salvar Edição" : "Adicionar Componente"}
      </button>

      {/* Tabela */}
      <h2 className="text-lg font-semibold mb-2">Estrutura Atual</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-4 py-2 text-left">Lista Técnica (Pai)</th>
              <th className="border px-4 py-2 text-left">Componente</th>
              <th className="border px-4 py-2 text-right">Quantidade</th>
              <th className="border px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>

          <tbody>
            {bom.length === 0 && (
              <tr>
                <td className="border px-4 py-6 text-center text-gray-500" colSpan={4}>
                  Nenhum item cadastrado na BOM.
                </td>
              </tr>
            )}

            {bom.map((item) => (
              <tr key={item.id}>
                <td className="border px-4 py-2">
                  {label(item.lista_pai_codigo, item.lista_pai_nome)}
                </td>
                <td className="border px-4 py-2">
                  {label(item.componente_codigo, item.componente_nome)}
                </td>
                <td className="border px-4 py-2 text-right">{fmtQtd(item.quantidade)}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
