import { useEffect, useMemo, useState } from "react";
import { BOMAPI } from "../services/api";
import type { BOMCreatePayload, BOMItem } from "../services/api";

type Option = { value: number; label: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (saved: BOMItem) => void;
  initialData?: BOMItem | null;
}

export default function CadastrarBOMItem({ open, onClose, onSaved, initialData }: Props) {
  const empty: BOMItem = useMemo(
    () => ({
      lista_pai: 0,
      sublista: null,
      componente: 0,
      quantidade: 1,
      ponderacao_operacao: 100,
      comentarios: "",
    }),
    []
  );

  const [form, setForm] = useState<BOMItem>(empty);
  const [listas, setListas] = useState<Option[]>([]);
  const [componentes, setComponentes] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // helper: normaliza vírgula -> ponto e garante número
  const toNumber = (v: unknown) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    if (!open) return;

    // carrega combos
    BOMAPI.listas().then((r) => {
      const opts = (r.data || []).map((x: any) => ({
        value: x.id,
        label: x.codigo ? `[${x.codigo}] ${x.nome}` : x.nome,
      }));
      setListas(opts);
    });

    BOMAPI.componentes().then((r) => {
      const opts = (r.data || []).map((x: any) => ({
        value: x.id,
        label: x.codigo ? `[${x.codigo}] ${x.nome}` : x.nome,
      }));
      setComponentes(opts);
    });

    // preload em modo edição
    if (initialData) {
      setForm({
        lista_pai: initialData.lista_pai,
        sublista: initialData.sublista ?? null,
        componente: initialData.componente ?? 0, // evita null no estado
        quantidade: toNumber(initialData.quantidade),
        ponderacao_operacao: toNumber(initialData.ponderacao_operacao),
        comentarios: initialData.comentarios ?? "",
        id: initialData.id,
      });
    } else {
      setForm(empty);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData, empty]);

  const handleChange = (k: keyof BOMItem, v: any) => {
    setForm((s) => ({ ...s, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // 🔍 VALIDAÇÕES FRONTEND (XOR)
    const componenteValido = toNumber(form.componente) > 0;
    const sublistaValida = form.sublista !== null && toNumber(form.sublista) > 0;

    if (!componenteValido && !sublistaValida) {
      setError("Informe um componente OU uma sublista.");
      setSaving(false);
      return;
    }

    if (componenteValido && sublistaValida) {
      setError("Informe apenas um: componente OU sublista.");
      setSaving(false);
      return;
    }

    try {
      const payload: BOMCreatePayload = {
        lista_pai: toNumber(form.lista_pai),
        sublista: sublistaValida ? toNumber(form.sublista) : null,
        componente: componenteValido ? toNumber(form.componente) : null, // null, nunca 0
        quantidade: toNumber(form.quantidade),
        ponderacao_operacao: toNumber(form.ponderacao_operacao),
        comentarios: (form.comentarios || "").trim(),
      };

      // console.log("📦 Dados prontos p/ envio:", payload);

      let resp;
      if (form.id) {
        resp = await BOMAPI.update(form.id, payload);
      } else {
        resp = await BOMAPI.create(payload);
      }

      onSaved?.(resp.data);
      onClose();
    } catch (err: any) {
      console.error("❌ Erro ao salvar BOM:", err?.response?.data || err);
      setError("Erro ao salvar. Verifique os campos obrigatórios.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {form.id ? "Editar item da BOM" : "Adicionar item à BOM"}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lista Técnica (Pai) */}
            <div>
              <label className="block text-sm font-medium mb-1">Lista Técnica (Pai)</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.lista_pai || 0}
                onChange={(e) => handleChange("lista_pai", toNumber(e.target.value))}
                required
              >
                <option value={0}>Selecione...</option>
                {listas.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sublista (opcional) */}
            <div>
              <label className="block text-sm font-medium mb-1">Sublista (opcional)</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.sublista || 0}
                onChange={(e) =>
                  handleChange(
                    "sublista",
                    toNumber(e.target.value) === 0 ? null : toNumber(e.target.value)
                  )
                }
                disabled={toNumber(form.componente) > 0} // desabilita se há componente
              >
                <option value={0}>—</option>
                {listas.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Componente */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Componente</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.componente || 0}
                onChange={(e) => handleChange("componente", toNumber(e.target.value))}
                disabled={form.sublista !== null && toNumber(form.sublista) > 0} // desabilita se há sublista
              >
                <option value={0}>Selecione...</option>
                {componentes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="^\\d+(?:[.,]\\d{0,4})?$"
                className="w-full border rounded-lg px-3 py-2"
                value={String(form.quantidade).replace(".", ",")}
                onChange={(e) => handleChange("quantidade", toNumber(e.target.value))}
                required
              />
            </div>

            {/* Ponderação (%) */}
            <div>
              <label className="block text-sm font-medium mb-1">Ponderação (%)</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="^\\d+(?:[.,]\\d{0,4})?$"
                className="w-full border rounded-lg px-3 py-2"
                value={String(form.ponderacao_operacao).replace(".", ",")}
                onChange={(e) =>
                  handleChange("ponderacao_operacao", toNumber(e.target.value))
                }
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use 100 para 100% (padrão).</p>
            </div>

            {/* Comentários */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Comentários</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                value={form.comentarios || ""}
                onChange={(e) => handleChange("comentarios", e.target.value)}
                placeholder="Observações sobre o item (opcional)"
              />
            </div>
          </div>

          {error && <div className="px-6 text-sm text-red-600">{error}</div>}

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
