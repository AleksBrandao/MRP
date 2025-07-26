// src/pages/MrpResultado.tsx
import { useState } from 'react';

interface ResultadoMRP {
  id: number;
  produto: string;
  quantidade: number;
  data: string;
}

export function MrpResultado() {
  const [resultados, setResultados] = useState<ResultadoMRP[]>([
    { id: 1, produto: 'Parafuso', quantidade: 100, data: '2024-01-01' },
    { id: 2, produto: 'Placa Base', quantidade: 50, data: '2024-01-03' },
  ]);

  const exportarCSV = () => {
    const csvHeader = 'ID,Produto,Quantidade,Data\n';
    const csvRows = resultados
      .map((r) => `${r.id},${r.produto},${r.quantidade},${r.data}`)
      .join('\n');
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'mrp_resultado.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Resultado do MRP</h1>
        <button
          onClick={exportarCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Exportar CSV
        </button>
      </div>

      <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 border-b">ID</th>
            <th className="px-4 py-2 border-b">Produto</th>
            <th className="px-4 py-2 border-b">Quantidade</th>
            <th className="px-4 py-2 border-b">Data</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((res) => (
            <tr key={res.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{res.id}</td>
              <td className="px-4 py-2 border-b">{res.produto}</td>
              <td className="px-4 py-2 border-b">{res.quantidade}</td>
              <td className="px-4 py-2 border-b">{res.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
