import { useEffect, useState } from "react";
import { fetchListasTecnicas, BOMSublistasAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

type LT = { id: number; nome: string; codigo?: string };

export default function BOMSublistas() {
  const navigate = useNavigate();

  const [qPai, setQPai] = useState("");
  const [qFilha, setQFilha] = useState("");
  const [paiOpts, setPaiOpts] = useState<LT[]>([]);
  const [filhaOpts, setFilhaOpts] = useState<LT[]>([]);
  const [pai, setPai] = useState<number | "">("");
  const [filha, setFilha] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchListasTecnicas({ search: qPai, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setPaiOpts(data);
    });
  }, [qPai]);

  useEffect(() => {
    fetchListasTecnicas({ search: qFilha, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setFilhaOpts(data);
    });
  }, [qFilha]);

  async function onAdd() {
    if (!pai || !filha) return alert("Selecione Pai e Filha.");
    setSaving(true);
    try {
      await BOMSublistasAPI.create({ lista_pai: Number(pai), sublista: Number(filha) });
      alert("Sublista associada com sucesso!");
      navigate("/bom-planilha");
    } catch (err) {
      console.error(err);
      alert("Falha ao associar sublista.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">BOM — Sublistas</h1>

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
        <label className="block text-sm font-medium mb-1">Sublista (Filha)</label>
        <input
          className="border rounded w-full p-2 mb-2"
          placeholder="Buscar por nome/código"
          value={qFilha}
          onChange={(e) => setQFilha(e.target.value)}
        />
        <select
          className="border rounded w-full p-2"
          value={filha}
          onChange={(e) => setFilha(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- selecione --</option>
          {filhaOpts.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.nome}{lt.codigo ? ` · ${lt.codigo}` : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        onClick={onAdd}
        disabled={saving || !pai || !filha}
      >
        {saving ? "Salvando..." : "Adicionar Sublista"}
      </button>
    </div>
  );
}
