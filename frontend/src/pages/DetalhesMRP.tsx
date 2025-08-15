import { useEffect, useState } from "react";
import api from "../services/api";

interface Detalhe {
  ordem_producao: string;
  produto_final: string;
  qtd_produto: number;
  qtd_componente_por_unidade: number;
  qtd_necessaria: number;
}

interface ComponenteDetalhado {
  codigo_componente: string;
  nome_componente: string;
  detalhes: Detalhe[];
  total_necessario: number;
  em_estoque: number;
  faltando: number;
}

export default function DetalhesMRP() {
  const [dados, setDados] = useState<ComponenteDetalhado[]>([]);
  const [filtroComponente, setFiltroComponente] = useState("");
  const [filtroOP, setFiltroOP] = useState("");

  useEffect(() => {
    api.get("/mrp/detalhado/")
      .then(res => setDados(res.data))
      .catch(err => console.error("Erro ao carregar detalhes do MRP:", err));
  }, []);

  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Detalhamento do Cálculo MRP</h1>

      <button
        onClick={() => window.open(`${API_BASE}/mrp/excel/`, "_blank", "noopener")}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
      >
        📥 Exportar para Excel
      </button>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Filtrar por componente..."
          value={filtroComponente}
          onChange={(e) => setFiltroComponente(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por OP..."
          value={filtroOP}
          onChange={(e) => setFiltroOP(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>

      {dados
        .filter((comp) =>
          comp.nome_componente.toLowerCase().includes(filtroComponente.toLowerCase()) ||
          comp.codigo_componente.toLowerCase().includes(filtroComponente.toLowerCase())
        )
        .map((comp, i) => {
          const detalhesFiltrados = comp.detalhes.filter((d) =>
            d.ordem_producao.toLowerCase().includes(filtroOP.toLowerCase())
          );

          if (detalhesFiltrados.length === 0) return null;

          return (
            <div key={i} className="mb-6 border rounded shadow p-4">
              <h2 className="text-lg font-semibold mb-2">
                {comp.codigo_componente} - {comp.nome_componente}
              </h2>
              <p><strong>Total Necessário:</strong> {comp.total_necessario}</p>
              <p><strong>Em Estoque:</strong> {comp.em_estoque}</p>
              <p><strong>Faltando:</strong> <span className="text-red-600">{comp.faltando}</span></p>

              <table className="w-full mt-4 border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">OP</th>
                    <th className="border px-2 py-1">Produto Final</th>
                    <th className="border px-2 py-1">Qtd OP</th>
                    <th className="border px-2 py-1">Qtd por Unidade</th>
                    <th className="border px-2 py-1">Qtd Necessária</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhesFiltrados.map((d, j) => (
                    <tr key={j}>
                      <td className="border px-2 py-1">{d.ordem_producao}</td>
                      <td className="border px-2 py-1">{d.produto_final}</td>
                      <td className="border px-2 py-1">{d.qtd_produto}</td>
                      <td className="border px-2 py-1">{d.qtd_componente_por_unidade}</td>
                      <td className="border px-2 py-1">{d.qtd_necessaria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
    </div>
  );
}