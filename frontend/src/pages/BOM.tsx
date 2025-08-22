import { useEffect, useMemo, useState } from "react";
import { BOMAPI} from "../services/api";
import type { BOMItem } from "../services/api";
import CadastrarBOMItem from "../components/CadastrarBOMItem";

type Option = { value: number; label: string };

export default function BOMPage() {
  const [items, setItems] = useState<BOMItem[]>([]);
  const [listas, setListas] = useState<Option[]>([]);
  const [componentes, setComponentes] = useState<Option[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<BOMItem | null>(null);

  // filtros rápidos da barra superior (opcional)
  const [selLista, setSelLista] = useState<number>(0);
  const [selComponente, setSelComponente] = useState<number>(0);

  const carregar = async () => {
    const resp = await BOMAPI.list();
    setItems(resp.data || []);
  };

  useEffect(() => {
    carregar();
    BOMAPI.listas().then((r) => {
      setListas(
        (r.data || []).map((x: any) => ({
          value: x.id,
          label: x.codigo ? `[${x.codigo}] ${x.nome}` : x.nome,
        }))
      );
    });
    BOMAPI.componentes().then((r) => {
      setComponentes(
        (r.data || []).map((x: any) => ({
          value: x.id,
          label: x.codigo ? `[${x.codigo}] ${x.nome}` : x.nome,
        }))
      );
    });
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (selLista && it.lista_pai !== selLista) return false;
      if (selComponente && it.componente !== selComponente) return false;
      return true;
    });
  }, [items, selLista, selComponente]);

  const onAddClick = () => {
    setEditing(null);
    setOpenModal(true);
  };
  const onEditClick = (row: BOMItem) => {
    setEditing(row);
    setOpenModal(true);
  };
  const onSaved = () => {
    carregar();
  };
  const onDelete = async (row: BOMItem) => {
    if (!row.id) return;
    if (!confirm("Confirma excluir este item da BOM?")) return;
    await BOMAPI.remove(row.id);
    carregar();
  };

  const nomeLista = (id?: number) => listas.find((l) => l.value === id)?.label || "";
  const nomeComp = (id?: number) => componentes.find((c) => c.value === id)?.label || "";

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Cadastro de Estrutura de Produto (BOM)</h1>

      {/* Barra superior (igual estilo de Produtos) */}
      <div className="bg-white rounded-2xl border p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Selecione a Lista Técnica</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selLista || 0}
              onChange={(e) => setSelLista(Number(e.target.value))}
            >
              <option value={0}>Todas</option>
              {listas.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Selecione o Componente</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selComponente || 0}
              onChange={(e) => setSelComponente(Number(e.target.value))}
            >
              <option value={0}>Todos</option>
              {componentes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={onAddClick}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Adicionar Componente
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
  <div className="px-4 md:px-8 py-6">
     <h1 className="text-2xl font-semibold mb-4">Cadastro de Estrutura de Produto (BOM)</h1>
      <table className="w-full table-auto text-sm border border-gray-300">
          <colgroup>
            <col className="w-48" />
            <col className="w-40" />
            <col className="w-80" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-80" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-gray-100 text-gray-700 border-b">
            <tr>
              <th className="text-left px-4 py-2">Lista Técnica (Pai)</th>
              <th className="text-left px-4 py-2">Sublista</th>
              <th className="text-left px-4 py-2">Componente</th>
              <th className="text-right px-4 py-2">Quantidade</th>
              <th className="text-right px-4 py-2">Ponderação</th>
              <th className="text-right px-4 py-2">Quant. Ponderada</th>
              <th className="text-left px-4 py-2">Comentários</th>
              <th className="text-left px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const listaLabel =
                row.lista_pai_nome
                  ? (row.lista_pai_codigo ? `[${row.lista_pai_codigo}] ` : "") + row.lista_pai_nome
                  : nomeLista(row.lista_pai);

              const sublistaLabel =
                row.sublista_nome
                  ? (row.sublista_codigo ? `[${row.sublista_codigo}] ` : "") + row.sublista_nome
                  : (row.sublista ? nomeLista(row.sublista) : "—");

              const compLabel =
                row.componente_nome
                  ? (row.componente_codigo ? `[${row.componente_codigo}] ` : "") + row.componente_nome
                  : nomeComp(row.componente);

              return (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2">{listaLabel}</td>
                  <td className="px-4 py-2">{sublistaLabel}</td>
                  <td className="px-4 py-2">{compLabel}</td>
                  <td className="px-4 py-2 text-right">{Number(row.quantidade).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(row.ponderacao_operacao).toLocaleString()}%
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number(row.quant_ponderada ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="px-4 py-2">{row.comentarios || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => onEditClick(row)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => onDelete(row)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <CadastrarBOMItem
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSaved={onSaved}
        initialData={editing}
      />
    </div>
  );
}
