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

  // carregar opções de PAI
  useEffect(() => {
    fetchListasTecnicas({ search: qPai, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setPaiOpts(data);
    });
  }, [qPai]);

  // carregar opções de FILHA
  useEffect(() => {
    fetchListasTecnicas({ search: qFilha, page: 1, page_size: 20 }).then((r) => {
      const data = r.data?.results ?? r.data ?? [];
      setFilhaOpts(data);
    });
  }, [qFilha]);

  async function onAdd() {
    if (!pai || !filha) {
      alert("Selecione Pai e Filha.");
      return;
    }
    if (Number(pai) === Number(filha)) {
      alert("A sublista não pode ser igual à lista-pai.");
      return;
    }

    setSaving(true);
    try {
      const listaPaiId = Number(pai);
      const sublistaId = Number(filha);

      // (Opcional, recomendado) evitar POST se já existir
      // OBS: BOMSublistasAPI.list precisa aceitar params e repassar como axios { params }
      const listResp = await BOMSublistasAPI.list({ lista_pai: listaPaiId, page_size: 500 });
      const registros = Array.isArray(listResp?.data?.results)
        ? listResp.data.results
        : listResp?.data ?? [];

      const jaExiste = (registros || []).some((r: any) => Number(r?.sublista) === sublistaId);
      if (jaExiste) {
        alert("Esta sublista já está associada a esta lista-pai.");
        return;
      }

      // criar vínculo
      await BOMSublistasAPI.create({ lista_pai: listaPaiId, sublista: sublistaId });
      alert("Sublista associada com sucesso!");
      navigate("/bom-planilha");
    } catch (err: any) {
      const detail = err?.response?.data;
      console.error("Validação DRF:", detail || err);
      if (detail?.non_field_errors?.length) {
        alert(detail.non_field_errors.join("\n"));
      } else if (typeof detail === "object") {
        // mostra mensagens por campo, se houver
        const msgs = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
          .join("\n");
        alert(msgs || "Falha ao associar sublista.");
      } else {
        alert("Falha ao associar sublista.");
      }
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
              {lt.nome}
              {lt.codigo ? ` · ${lt.codigo}` : ""}
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
              {lt.nome}
              {lt.codigo ? ` · ${lt.codigo}` : ""}
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
