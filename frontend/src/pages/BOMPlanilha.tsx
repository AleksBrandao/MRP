// src/pages/BOMPlanilha.tsx
import { useEffect, useState } from "react";
import { BOMFlatAPI } from "../services/api";

type LinhaFlat = {
  serie: string;
  sistema: string;
  conjunto: string;
  subconjunto: string;
  item_nivel: string; // só vem preenchido se nivel === 4 (Item)
  nivel: number;      // 0=Série, 1=Sistema, 2=Conjunto, 3=Subconjunto, 4=Item
  componente: string;
  quantidade: number;
  ponderacao: number;       // %
  quant_ponderada: number;
  comentarios: string;
};

export default function BOMPlanilha() {
  const [linhas, setLinhas] = useState<LinhaFlat[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [listaId, setListaId] = useState<string>("");
  const [detalhado, setDetalhado] = useState<boolean>(false); // controla inclusão de grupos

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await BOMFlatAPI.list({
        search: search || undefined,
        lista_id: listaId || undefined,
        incluir_grupos: detalhado ? "1" : undefined, // inclui grupos no modo detalhado
      });
      setLinhas(data);
    } catch (e: any) {
      console.error("Erro ao carregar BOM flat:", e);
      setErrorMsg("Não foi possível carregar os dados. Verifique a API /api/bom-flat/.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt4 = (v: number) =>
    (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const handleExportXLSX = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (listaId) params.set("lista_id", listaId);
      if (detalhado) params.set("detalhado", "1"); // export XLSX inclui grupos quando detalhado

      const resp = await fetch(`/api/bom-flat-xlsx/?${params.toString()}`, {
        method: "GET",
      });
      if (!resp.ok) throw new Error("Falha ao gerar XLSX");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bom_planilha.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Não foi possível exportar o XLSX.");
    }
  };

  const handleExportCSV = () => {
    const header = [
      "Série",
      "Sistema",
      "Conjunto",
      "Subconjunto",
      "Item",         // sempre presente
      "Componente",
      "Quantidade",
      "Ponderação",
      "Quant. Ponderada",
      "Comentários",
    ];

    const rows = linhas.map((l) => [
      l.serie,
      l.sistema,
      l.conjunto,
      l.subconjunto,
      l.item_nivel || "", // vazio quando não for nível Item (ok)
      l.componente,
      String(l.quantidade ?? 0),
      `${l.ponderacao ?? 0}%`,
      fmt4(l.quant_ponderada),
      (l.comentarios || "").replaceAll("\n", " "),
    ]);

    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const needsQuotes = /[;"\n]/.test(v);
            return needsQuotes ? `"${v.replaceAll('"', '""')}"` : v;
          })
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bom_planilha.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-4">
      <div className="flex items-start sm:items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">BOM (Formato Planilha)</h1>
          <p className="text-sm text-gray-500">
            Visualização achatada no padrão: Série, Sistema, Conjunto, Subconjunto, <b>Item</b>,
            Componente, Quantidade, Ponderação, Quant. Ponderada, Comentários.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            className="border rounded-lg px-3 py-2 w-72"
            placeholder="Buscar (código, nome, comentário)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2 w-52"
            placeholder="Lista ID (opcional)"
            value={listaId}
            onChange={(e) => setListaId(e.target.value)}
          />

          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            Aplicar
          </button>

          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white">
            <input
              type="checkbox"
              checked={detalhado}
              onChange={(e) => setDetalhado(e.target.checked)}
            />
            Modo detalhado (incluir grupos)
          </label>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Exportar CSV
          </button>

          <button
            onClick={handleExportXLSX}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Exportar XLSX
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {errorMsg}
        </div>
      )}

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="text-left">
              <th className="px-4 py-3">Série</th>
              <th className="px-4 py-3">Sistema</th>
              <th className="px-4 py-3">Conjunto</th>
              <th className="px-4 py-3">Subconjunto</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Componente</th>
              <th className="px-4 py-3">Quantidade</th>
              <th className="px-4 py-3">Ponderação</th>
              <th className="px-4 py-3">Quant. Ponderada</th>
              <th className="px-4 py-3">Comentários</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={10}>
                  Carregando…
                </td>
              </tr>
            ) : linhas.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={10}>
                  Nenhum registro.
                </td>
              </tr>
            ) : (
              linhas.map((l, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-pre-line">{l.serie}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.sistema}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.conjunto}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.subconjunto}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.item_nivel || ""}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.componente}</td>
                  <td className="px-4 py-3">{l.quantidade ?? 0}</td>
                  <td className="px-4 py-3">{`${l.ponderacao ?? 0}%`}</td>
                  <td className="px-4 py-3">{fmt4(l.quant_ponderada)}</td>
                  <td className="px-4 py-3 whitespace-pre-line">{l.comentarios}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
