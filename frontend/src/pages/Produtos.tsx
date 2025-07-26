// src/pages/Produtos.tsx
import { useState } from 'react';

interface Produto {
  id: number;
  nome: string;
  estoque: number;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([
    { id: 1, nome: 'Produto A', estoque: 10 },
    { id: 2, nome: 'Produto B', estoque: 5 },
  ]);

  const [novoProduto, setNovoProduto] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  const adicionarProduto = () => {
    if (!novoProduto.trim()) return;

    const novo = {
      id: produtos.length + 1,
      nome: novoProduto,
      estoque: 0,
    };

    setProdutos([...produtos, novo]);
    setNovoProduto('');
    setModalAberto(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Novo Produto
        </button>
      </div>

      <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 border-b">ID</th>
            <th className="px-4 py-2 border-b">Nome</th>
            <th className="px-4 py-2 border-b">Estoque</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{p.id}</td>
              <td className="px-4 py-2 border-b">{p.nome}</td>
              <td className="px-4 py-2 border-b">{p.estoque}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Novo Produto</h2>
            <input
              type="text"
              placeholder="Nome do produto"
              value={novoProduto}
              onChange={(e) => setNovoProduto(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarProduto}
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
