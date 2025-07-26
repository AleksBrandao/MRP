// src/pages/Ordens.tsx
import { useState } from 'react';

interface OrdemProducao {
  id: number;
  produto: string;
  quantidade: number;
}

export function Ordens() {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([
    { id: 1, produto: 'Produto A', quantidade: 10 },
    { id: 2, produto: 'Produto B', quantidade: 5 },
  ]);

  const [modalAberto, setModalAberto] = useState(false);
  const [produto, setProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const adicionarOrdem = () => {
    if (!produto.trim() || quantidade < 1) return;

    const nova = {
      id: ordens.length + 1,
      produto,
      quantidade,
    };

    setOrdens([...ordens, nova]);
    setProduto('');
    setQuantidade(1);
    setModalAberto(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ordens de Produção</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Nova Ordem
        </button>
      </div>

      <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 border-b">ID</th>
            <th className="px-4 py-2 border-b">Produto</th>
            <th className="px-4 py-2 border-b">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {ordens.map((ordem) => (
            <tr key={ordem.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{ordem.id}</td>
              <td className="px-4 py-2 border-b">{ordem.produto}</td>
              <td className="px-4 py-2 border-b">{ordem.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nova Ordem</h2>

            <input
              type="text"
              placeholder="Produto"
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="w-full border border-gray-300 px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              min={1}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarOrdem}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
