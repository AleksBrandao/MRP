import { useEffect, useState } from "react";
import api from "../services/http";

interface ResultadoMRP {
  id: number;                // ✅ backend já envia
  codigo: string;
  nome: string;
  necessario: number;
  em_estoque: number;
  faltando: number;
  lead_time: number;
  data_compra: string;
  nivel: number;
  codigo_pai: string | null; // é o código da LISTA (não do componente pai)
  tipo: string;              // "componente" | "materia_prima" | "lista"...
}

export default function MrpResultado() {
  const [dados, setDados] = useState<ResultadoMRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("");

  useEffect(() => {
    api.get("/mrp/")
      .then((res) => {
        const itens = (res.data as ResultadoMRP[])
          .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome));
        setDados(itens);
      })
      .catch(() => alert("Erro ao carregar MRP"))
      .finally(() => setLoading(false));
  }, []);

  const corPorNivel = (nivel: number) => {
    switch (nivel) {
      case 0: return "text-black font-bold";
      case 1: return "text-blue-800";
      case 2: return "text-gray-700";
      case 3: return "text-gray-500";
      default: return "text-gray-400";
    }
  };

  const linhasFiltradas = filtroTipo
    ? dados.filter(d => d.tipo === filtroTipo)
    : dados;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Resultado do Cálculo MRP</h1>

      <a
        href={`${import.meta.env.VITE_API_URL}/mrp/excel/`}
        className="inline-block bg-green-600 text-white px-4 py-2 rounded mb-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        📥 Exportar Excel
      </a>

      <div className="mb-4">
        <label className="block mb-1">Filtrar por tipo:</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="border px-3 py-1"
        >
          <option value="">Todos</option>
          <option value="componente">Componente</option>      {/* ✅ corrigido */}
          <option value="materia_prima">Matéria-Prima</option>
          <option value="lista">Lista Técnica (BOM)</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : linhasFiltradas.length === 0 ? (
        <p className="text-green-600">Tudo certo! Nenhum componente em falta.</p>
      ) : (
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">Código</th>
              <th className="border px-4 py-2">Componente</th>
              <th className="border px-4 py-2">Necessário</th>
              <th className="border px-4 py-2">Em Estoque</th>
              <th className="border px-4 py-2 text-red-600">Faltando</th>
              <th className="border px-4 py-2">Lead Time (dias)</th>
              <th className="border px-4 py-2">Data Ideal de Compra</th>
              <th className="border px-4 py-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((item) => (
              <tr key={item.id}>  {/* ✅ chave estável por ID */}
                <td className="border px-4 py-2">{item.codigo || "—"}</td>
                <td className="border px-4 py-2">
                  <div
                    style={{ paddingLeft: `${item.nivel * 20}px` }}  // indentação pelo nível
                    className={`flex items-center gap-1 ${corPorNivel(item.nivel)}`}
                  >
                    {item.nome}
                  </div>
                </td>
                <td className="border px-4 py-2">{item.necessario}</td>
                <td className="border px-4 py-2">{item.em_estoque}</td>
                <td className="border px-4 py-2 text-red-600">{item.faltando}</td>
                <td className="border px-4 py-2">{item.lead_time}</td>
                <td className="border px-4 py-2">
                  {item.data_compra ? new Date(item.data_compra).toLocaleDateString() : "—"}
                </td>
                <td className="border px-4 py-2">
                  {item.tipo === "componente" ? "Componente" :
                   item.tipo === "materia_prima" ? "Matéria-Prima" :
                   item.tipo === "lista" ? "Lista Técnica (BOM)" : item.tipo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
