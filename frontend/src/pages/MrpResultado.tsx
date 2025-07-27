
import { useEffect, useState } from "react";
import api from "../services/api";

interface ResultadoMRP {
  codigo: string;
  nome: string;
  necessario: number;
  em_estoque: number;
  faltando: number;
  lead_time: number;
  data_compra: string;
  nivel?: number; // novo campo para hierarquia
}

export default function MrpResultado() {
  const [resultado, setResultado] = useState<ResultadoMRP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/mrp/")
      .then((res) => setResultado(res.data))
      .catch((err) => console.error("Erro ao calcular MRP:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Resultado do Cálculo MRP</h1>
      <a
        href="http://localhost:8000/api/mrp/excel/"
        className="inline-block bg-green-600 text-white px-4 py-2 rounded mb-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        📥 Exportar Excel
      </a>

      {loading ? (
        <p>Carregando...</p>
      ) : resultado.length === 0 ? (
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
            </tr>
          </thead>
          <tbody>
            {resultado.map((item) => (
              <tr key={item.codigo}>
                <td className="border px-4 py-2">{item.codigo}</td>
                <td
                  className="border px-4 py-2"
                  style={{ paddingLeft: `${(item.nivel || 0) * 20}px` }}
                >
                  {item.nome}
                </td>
                <td className="border px-4 py-2">{item.necessario}</td>
                <td className="border px-4 py-2">{item.em_estoque}</td>
                <td className="border px-4 py-2 text-red-600">{item.faltando}</td>
                <td className="border px-4 py-2">{item.lead_time}</td>
                <td className="border px-4 py-2">
                  {new Date(item.data_compra).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
