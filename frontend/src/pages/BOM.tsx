// src/pages/BOM.tsx
import { useState } from 'react';

interface Componente {
  id: number;
  nome: string;
  quantidade: number;
}

export function BOM() {
  const [componentes, setComponentes] = useState<Componente[]>([
    { id: 1, nome: 'Parafuso', quantidade: 4 },
    { id: 2, nome: 'Placa base', quantidade: 1 },
  ]);

  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const adicionarComponente = () => {
    if (!nome.trim() || quantidade < 1) return;

    const novo = {
      id: componentes.length + 1,
      nome,
      quantidade,
    };

    setComponentes([...componentes, novo]);
    setNome('');
    setQuantidade(1);
    setModalAberto(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lista de Materiais (BOM)</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Novo Componente
        </button>
      </div>

      <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 border-b">ID</th>
            <th className="px-4 py-2 border-b">Nome</th>
            <th className="px-4 py-2 border-b">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((comp) => (
            <tr key={comp.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{comp.id}</td>
              <td className="px-4 py-2 border-b">{comp.nome}</td>
              <td className="px-4 py-2 border-b">{comp.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Novo Componente</h2>

            <input
              type="text"
              placeholder="Nome do componente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
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
                onClick={adicionarComponente}
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
