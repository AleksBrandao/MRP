import { useEffect, useState } from "react";
import { ListaTecnicaAPI } from "../services/api";
import CadastrarListaTecnica from "../components/CadastrarListaTecnica";

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  estoque: number;
  lead_time: number;
  tipo: string;
}

const getTipoLabel = (tipo: string) => {
  switch (tipo) {
    case "componente":
      return "Componente";
    case "lista":
      return "Lista Técnica";
    default:
      return tipo;
  }
};

export default function ListasTecnicas() {
  const [listas, setListas] = useState<Produto[]>([]);
  const [showCadastro, setShowCadastro] = useState(false);

  const fetchListas = () => {
    ListaTecnicaAPI.list().then((res) => setListas(res.data));
  };

  useEffect(() => {
    fetchListas();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Listas Técnicas</h1>
      <button
        onClick={() => setShowCadastro(true)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Nova Lista Técnica
      </button>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Código</th>
            <th className="border px-2 py-1">Nome</th>
            <th className="border px-2 py-1">Estoque</th>
            <th className="border px-2 py-1">Lead Time</th>
            <th className="border px-2 py-1">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {listas.map((p) => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.codigo}</td>
              <td className="border px-2 py-1">{p.nome}</td>
              <td className="border px-2 py-1">{p.estoque}</td>
              <td className="border px-2 py-1">{p.lead_time}</td>
              <td className="border px-2 py-1">{getTipoLabel(p.tipo)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCadastro && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-[600px]">
            <CadastrarListaTecnica
              onClose={() => setShowCadastro(false)}
              onSuccess={fetchListas}
            />
          </div>
        </div>
      )}
    </div>
  );
}