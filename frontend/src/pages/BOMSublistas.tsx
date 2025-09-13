import { useEffect, useMemo, useState } from "react";
import { fetchListasTecnicas, BOMSublistasAPI, type BOMSublista } from "../services/api";

type LT = { id: number; nome: string; codigo?: string };

export default function BOMSublistas() {
  // filtros/inputs
  const [qPai, setQPai] = useState("");
  const [qFilha, setQFilha] = useState("");

  // opções dos selects
  const [paiOpts, setPaiOpts] = useState<LT[]>([]);
  const [filhaOpts, setFilhaOpts] = useState<LT[]>([]);

  // seleção atual
  const [pai, setPai] = useState<number | "">("");
  const [filha, setFilha] = useState<number | "">("");

  // estado das sublistas já vinculadas ao pai
  const [sublistas, setSublistas] = useState<BOMSublista[]>([]);
  const [loadingSublistas, setLoadingSublistas] = useState(false);

  // saving flags
  const [savingAdd, setSavingAdd] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

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

  // quando um PAI é selecionado, carrega as filhas vinculadas
  useEffect(() => {
    if (!pai) {
      setSublistas([]);
      return;
    }
    setLoadingSublistas(true);
    BOMSublistasAPI.list({ lista_pai: Number(pai), page_size: 500 })
      .then((resp) => {
        const data = Array.isArray(resp?.data?.results) ? resp.data.results : (resp?.data ?? []);
        setSublistas(data as BOMSublista[]);
      })
      .finally(() => setLoadingSublistas(false));
  }, [pai]);

  const paiLabel = useMemo(() => {
    const it = paiOpts.find((x) => x.id === pai);
    return it ? `${it.nome}${it.codigo ? " · " + it.codigo : ""}` : "";
  }, [pai, paiOpts]);

  async function onAdd() {
    if (!pai || !filha) {
      alert("Selecione Pai e Filha.");
      return;
    }
    if (Number(pai) === Number(filha)) {
      alert("A sublista não pode ser igual à lista-pai.");
      return;
    }

    setSavingAdd(true);
    try {
      // evita duplicado
      const exists = sublistas.some((r) => Number(r.sublista) === Number(filha));
      if (exists) {
        alert("Esta sublista já está associada a esta lista-pai.");
        return;
      }

      await BOMSublistasAPI.create({ lista_pai: Number(pai), sublista: Number(filha) });

      // recarrega lista
      const list = await BOMSublistasAPI.list({ lista_pai: Number(pai), page_size: 500 });
      const data = Array.isArray(list?.data?.results) ? list.data.results : (list?.data ?? []);
      setSublistas(data as BOMSublista[]);
      setFilha("");
      setQFilha("");
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail?.non_field_errors?.length) {
        alert(detail.non_field_errors.join("\n"));
      } else if (typeof detail === "object") {
        const msgs = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
          .join("\n");
        alert(msgs || "Falha ao associar sublista.");
      } else {
        alert("Falha ao associar sublista.");
      }
    } finally {
      setSavingAdd(false);
    }
  }

  async function onRemove(id: number) {
    if (!confirm("Remover vínculo desta sublista?")) return;
    setRemovingId(id);
    try {
      await BOMSublistasAPI.remove(id);
      setSublistas((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">BOM — Sublistas</h1>

      {/* Seleção do Pai */}
      <div className="mb-2">
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

      {/* Lista de Filhas já vinculadas */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">
            Sublistas (Filhas){pai ? ` de: ${paiLabel}` : ""}
          </h2>
          {loadingSublistas && <span className="text-sm opacity-70">carregando…</span>}
        </div>

        <div className="border rounded">
          <div className="grid grid-cols-12 text-sm font-medium bg-gray-50 border-b px-3 py-2">
            <div className="col-span-1">#</div>
            <div className="col-span-10">Nome da Sublista</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>

          {(!pai || sublistas.length === 0) && (
            <div className="px-3 py-3 text-sm opacity-70">
              {pai ? "Nenhuma sublista vinculada a esta lista." : "Selecione uma lista-pai acima."}
            </div>
          )}

          {sublistas.map((s, idx) => (
            <div
              key={s.id}
              className="grid grid-cols-12 items-center border-t px-3 py-2 text-sm"
            >
              <div className="col-span-1">{idx + 1}</div>
              <div className="col-span-10">{s.sublista_nome ?? s.sublista}</div>
              <div className="col-span-1 text-right">
                <button
                  className="px-2 py-1 rounded border hover:bg-gray-50"
                  onClick={() => onRemove(s.id)}
                  disabled={removingId === s.id}
                  title="Remover vínculo"
                >
                  {removingId === s.id ? "…" : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar nova Sublista (quando já há um pai escolhido) */}
      <div className="mt-8">
        <h3 className="text-base font-medium mb-2">Adicionar Sublista</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="border rounded p-2"
            placeholder="Buscar sublista por nome/código"
            value={qFilha}
            onChange={(e) => setQFilha(e.target.value)}
            disabled={!pai}
          />
          <select
            className="border rounded p-2"
            value={filha}
            onChange={(e) => setFilha(e.target.value ? Number(e.target.value) : "")}
            disabled={!pai}
          >
            <option value="">{pai ? "-- selecione --" : "Escolha um pai primeiro"}</option>
            {filhaOpts.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.nome}
                {lt.codigo ? ` · ${lt.codigo}` : ""}
              </option>
            ))}
          </select>
          <button
            className="p-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={onAdd}
            disabled={savingAdd || !pai || !filha}
          >
            {savingAdd ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
