// frontend/src/components/ModalEditarSublista.tsx
import { useEffect, useState } from "react";
import api from "../services/http";
import { BOMSublistasAPI } from "../services/api";

type ListaTecnica = {
  id: number;
  nome: string;
  codigo?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  linha: {
    linha_id: number;     // id do BOMSublista
    sublista_id?: number | null; // sublista (filha) atual
    lista_pai_id?: number | null;
  };
};

export default function ModalEditarSublista({ open, onClose, onSaved, linha }: Props) {
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<ListaTecnica[]>([]);
  const [busca, setBusca] = useState("");
  const [sublistaSel, setSublistaSel] = useState<number | "">("");

  useEffect(() => {
    setSublistaSel(linha.sublista_id ?? "");
  }, [linha]);

  useEffect(() => {
    if (!open) return;
    fetchListas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busca]);

  async function fetchListas() {
    try {
      const { data } = await api.get("/listas-tecnicas/", {
        params: { search: busca || undefined, limit: 50 },
      });
      const results = Array.isArray(data) ? data : data?.results ?? [];
      setOptions(results);
    } catch (e) {
      // silencia para digitação contínua
    }
  }

  if (!open) return null;

  async function handleSave() {
    if (!sublistaSel || typeof sublistaSel !== "number") {
      alert("Selecione uma sublista válida.");
      return;
    }
    setSaving(true);
    try {
      await BOMSublistasAPI.update(linha.linha_id, { sublista: sublistaSel });
      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <header className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Editar Sublista (grupo)</h2>
        </header>

        <div className="px-5 py-4 space-y-4">
          <label className="text-sm block">
            <span className="block mb-1 text-gray-600">Buscar listas</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Digite parte do nome/código..."
            />
          </label>

          <label className="text-sm block">
            <span className="block mb-1 text-gray-600">Sublista (filha)</span>
            <select
              value={sublistaSel}
              onChange={(e) => setSublistaSel(e.target.value ? Number(e.target.value) : "")}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Selecione...</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.codigo ? `${o.codigo} · ` : ""}{o.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <footer className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl border hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
