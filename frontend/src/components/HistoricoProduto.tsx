import { useEffect, useState } from "react";
import api from "../services/api";

interface Historico {
  estoque: number;
  data: string;
  usuario: string;
  tipo: string;
}

export default function HistoricoProduto({ produtoId }: { produtoId: number }) {
  const [historico, setHistorico] = useState<Historico[]>([]);

  useEffect(() => {
    api.get(`/historico-produto/${produtoId}/`)
      .then((res) => setHistorico(res.data))
      .catch((err) => console.error("Erro ao carregar histórico:", err));
  }, [produtoId]);

  return (
    <div className="mt-4 border p-4 rounded">
      <h2 className="text-lg font-bold mb-2">Histórico de Estoque</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">Data</th>
            <th className="text-left p-2">Estoque</th>
            <th className="text-left p-2">Usuário</th>
            <th className="text-left p-2">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="p-2">{new Date(item.data).toLocaleString()}</td>
              <td className="p-2">{item.estoque}</td>
              <td className="p-2">{item.usuario}</td>
              <td className="p-2">{item.tipo === '+' ? 'Criado' : item.tipo === '~' ? 'Modificado' : 'Deletado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
