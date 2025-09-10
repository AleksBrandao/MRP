// src/pages/BOMPlanilha.tsx
import { useEffect, useState } from "react";
import { BOMFlatAPI } from "../services/api";

type LinhaFlat = {
  // novos campos do endpoint
  serie_nome?: string; sistema_nome?: string; conjunto_nome?: string;
  subconjunto_nome?: string; item_nome?: string;

  // legado (se ainda vier)
  serie?: string; sistema?: string; conjunto?: string;
  subconjunto?: string; item_nivel?: string;

  // componente separado (novo) + legado
  componente_codigo?: string | null;
  componente_nome?: string | null;
  componente?: string; // legado

  quantidade: number;
  ponderacao: number;
  quant_ponderada: number;
  comentarios: string;
  tipo_revisao?: string; // 👈 adicionado (pode ser undefined se backend não migrou)
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

  // helpers para compatibilidade quando só houver 'componente' (string única)
  const getCompCodigo = (l: LinhaFlat) => {
    if (l.componente_codigo) return l.componente_codigo;
    if (l.componente && /^\s*\[([^\]]+)\]/.test(l.componente)) {
      // extrai o que estiver entre colchetes no início, ex: "[ABC123] Nome do item"
      const m = l.componente.match(/^\s*\[([^\]]+)\]/);
      return m ? m[1] : "";
    }
    return "";
  };
  const getCompNome = (l: LinhaFlat) => {
    if (l.componente_nome) return l.componente_nome;
    if (l.componente) {
      // remove prefixo "[...]" se existir
      return l.componente.replace(/^\s*\[[^\]]+\]\s*/, "");
    }
    return "";
  };

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
      "Item",                 // sempre presente
      "Código",  // ✅ novo
      "Componente",    // ✅ novo
      "Quantidade",
      "Ponderação",
      "Quant. Ponderada",
      "Comentários",
      "Tipo Revisão"   // 👈 novo
    ];

    const rows = linhas.map((l) => [
      l.serie_nome ?? l.serie ?? "",
      l.sistema_nome ?? l.sistema ?? "",
      l.conjunto_nome ?? l.conjunto ?? "",
      l.subconjunto_nome ?? l.subconjunto ?? "",
      l.item_nome ?? l.item_nivel ?? "",
      getCompCodigo(l),
      getCompNome(l),
      String(l.quantidade ?? 0),
      `${l.ponderacao ?? 0}%`,
      fmt4(l.quant_ponderada),
      (l.comentarios || "").replaceAll("\n", " "),
      l.tipo_revisao ?? "", 
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            const needsQuotes = /[;"\n]/.test(s);
            return needsQuotes ? `"${s.replaceAll('"', '""')}"` : s;
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
    <div className="py-6 max-w-screen-2xl mx-auto px-4 w-full">
      <section className="full-bleed">   {/* 👈 novo wrapper */}
      <div className="flex items-start sm:items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">BOM (Formato Planilha)</h1>
          <p className="text-sm text-gray-500">
            Visualização achatada no padrão: Série, Sistema, Conjunto, Subconjunto, <b>Item</b>,
            <b> Componente (Código, Nome)</b>, Quantidade, Ponderação, Quant. Ponderada, Comentários.
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

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full table-auto table-tight">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="text-left">
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Série</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Sistema</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Conjunto</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Subconjunto</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Item</th>
              {/* 🔀 dividimos "Componente" em 2 */}
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Código</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Componente</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Quantidade</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Ponderação</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Quant. Ponderada</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Comentários</th>
              <th className="px-4 py-2 text-left whitespace-nowrap break-normal">Tipo Revisão</th>  {/* 👈 novo */}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={12}>
                  Carregando…
                </td>
              </tr>
            ) : linhas.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={12}>
                  Nenhum registro.
                </td>
              </tr>
            ) : (
              linhas.map((l, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.serie_nome ?? l.serie ?? ""}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.sistema_nome ?? l.sistema ?? ""}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.conjunto_nome ?? l.conjunto ?? ""}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.subconjunto_nome ?? l.subconjunto ?? ""}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.item_nome ?? l.item_nivel ?? ""}</td>

                  {/* ✅ agora em duas colunas */}
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{getCompCodigo(l) || "—"}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{getCompNome(l)}</td>

                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.quantidade ?? 0}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{`${l.ponderacao ?? 0}%`}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{fmt4(l.quant_ponderada)}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.comentarios}</td>
                  <td className="px-4 py-2 text-left whitespace-nowrap break-normal">{l.tipo_revisao || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </section>
    </div>
  );
}
