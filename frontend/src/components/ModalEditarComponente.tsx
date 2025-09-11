// frontend/src/components/ModalEditarComponente.tsx
import { useEffect, useMemo, useState } from "react";
import { BOMComponentesAPI } from "../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  // dados da linha vinda da planilha
  linha: {
    linha_id: number;
    quantidade?: number | null;
    ponderacao?: number | null;
    tipo_revisao?: string | null;
    comentarios?: string | null;
    componente_nome?: string | null;
    componente_codigo?: string | null;
  };
};

export default function ModalEditarComponente({ open, onClose, onSaved, linha }: Props) {
  const [saving, setSaving] = useState(false);

  const [quantidade, setQuantidade] = useState<number>(linha.quantidade ?? 1);
  const [ponderacao, setPonderacao] = useState<number>(linha.ponderacao ?? 0);
  const [tipoRevisao, setTipoRevisao] = useState<string>(linha.tipo_revisao ?? "");
  const [comentarios, setComentarios] = useState<string>(linha.comentarios ?? "");

  useEffect(() => {
    setQuantidade(linha.quantidade ?? 1);
    setPonderacao(linha.ponderacao ?? 0);
    setTipoRevisao(linha.tipo_revisao ?? "");
    setComentarios(linha.comentarios ?? "");
  }, [linha]);

  const titulo = useMemo(() => {
    const cod = linha.componente_codigo ? `(${linha.componente_codigo}) ` : "";
    const nom = linha.componente_nome ?? "";
    return `Editar componente ${cod}${nom}`.trim();
  }, [linha]);

  if (!open) return null;

  async function handleSave() {
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      alert("Quantidade inválida"); return;
    }
    if (!Number.isFinite(ponderacao) || ponderacao < 0) {
      alert("Ponderação inválida"); return;
    }
    setSaving(true);
    try {
      await BOMComponentesAPI.update(linha.linha_id, {
        quantidade,
        ponderacao,
        tipo_revisao: tipoRevisao || undefined,
        comentarios: comentarios || undefined,
      });
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
          <h2 className="text-lg font-semibold">{titulo}</h2>
        </header>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-gray-600">Quantidade</span>
              <input
                type="number"
                step="0.0001"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-gray-600">Ponderação (%)</span>
              <input
                type="number"
                step="0.01"
                value={ponderacao}
                onChange={(e) => setPonderacao(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </label>
          </div>

          <label className="text-sm block">
            <span className="block mb-1 text-gray-600">Tipo de Revisão</span>
            <input
              value={tipoRevisao}
              onChange={(e) => setTipoRevisao(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex.: RF, RT..."
            />
          </label>

          <label className="text-sm block">
            <span className="block mb-1 text-gray-600">Comentários</span>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
              placeholder="Observações..."
            />
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
