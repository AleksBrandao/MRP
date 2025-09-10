import { useEffect, useState } from "react";
import { fetchListasTecnicas, fetchProdutosComponentes, BOMComponentesAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

type LT = { id: number; nome: string; codigo?: string };
type Comp = { id: number; nome: string; codigo?: string; unidade?: string };

export default function BOMComponentes() {
  const navigate = useNavigate();

  const [qPai, setQPai] = useState("");
  const [qComp, setQComp] = useState("");
  const [paiOpts, setPaiOpts] = useState<LT[]>([]);
  const [compOpts, setCompOpts] = useState<Comp[]>([]);
  const [pai, setPai] = useState<number | "">("");
  const [comp, setComp] = useState<number | "">("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [ponderacao, setPonderacao] = useState<number>(0);
  const [comentarios, setComentarios] = useState<string>("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchListasTecnicas({ search: qPai, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setPaiOpts(data);
    });
  }, [qPai]);

  useEffect(() => {
    fetchProdutosComponentes({ search: qComp, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setCompOpts(data);
    });
  }, [qComp]);

  async function onAdd() {
    if (!pai || !comp) return alert("Selecione Lista Técnica (Pai) e Componente.");
    if (quantidade <= 0) return alert("Quantidade deve ser > 0.");
    setSaving(true);
    try {
      await BOMComponentesAPI.create({
        lista_pai: Number(pai),
        componente: Number(comp),
        quantidade,
        ponderacao,
        comentarios: comentarios || undefined,
      });
      alert("Componente associado com sucesso!");
      navigate("/bom-planilha");
    } catch (err) {
      console.error(err);
      alert("Falha ao associar componente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">BOM — Componentes</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Lista Técnica (Pai)</label>
        <input
          className="border rounded w-full p-2 mb-2"
          placeholder="Buscar por nome/código"
          value={qPai}
          onChange={(e) => setQPai(e.target.value)}
        />
        <select
          className="border rounded w-full p-2"
          value={pai}
          onChange={(e) => setPai(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- selecione --</option>
          {paiOpts.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.nome}{lt.codigo ? ` · ${lt.codigo}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Componente</label>
        <input
          className="border rounded w-full p-2 mb-2"
          placeholder="Buscar por nome/código"
          value={qComp}
          onChange={(e) => setQComp(e.target.value)}
        />
        <select
          className="border rounded w-full p-2"
          value={comp}
          onChange={(e) => setComp(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- selecione --</option>
          {compOpts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}{c.codigo ? ` · ${c.codigo}` : ""}{c.unidade ? ` (${c.unidade})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Qtd.</label>
          <input
            type="number"
            className="border rounded w-full p-2"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            min={0}
            step={0.001}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pond. (%)</label>
          <input
            type="number"
            className="border rounded w-full p-2"
            value={ponderacao}
            onChange={(e) => setPonderacao(Number(e.target.value))}
            min={0}
            step={0.01}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Comentários</label>
          <input
            className="border rounded w-full p-2"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="opcional"
          />
        </div>
      </div>

      <button
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        onClick={onAdd}
        disabled={saving || !pai || !comp || quantidade <= 0}
      >
        {saving ? "Salvando..." : "Adicionar Componente"}
      </button>
    </div>
  );
}
