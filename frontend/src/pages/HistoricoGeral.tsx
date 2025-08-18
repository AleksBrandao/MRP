import { useEffect, useState } from "react";
import api from "../services/http";

interface Registro {
  produto_id: number;
  produto_nome: string;
  estoque: number;
  usuario: string;
  tipo: string;
  data: string;
}

export default function HistoricoGeral() {
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    api.get("/historico-todos/")
      .then(res => setRegistros(res.data))
      .catch(err => console.error("Erro ao carregar histórico:", err));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📜 Histórico de Alterações - Todos os Produtos</h1>
      <table className="min-w-full text-sm border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border text-left">Produto</th>
            <th className="p-2 border text-left">Estoque</th>
            <th className="p-2 border text-left">Usuário</th>
            <th className="p-2 border text-left">Tipo</th>
            <th className="p-2 border text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 border">{r.produto_nome} (#{r.produto_id})</td>
              <td className="p-2 border">{r.estoque}</td>
              <td className="p-2 border">{r.usuario}</td>
              <td className="p-2 border">
                {r.tipo === '+' ? 'Criado' : r.tipo === '~' ? 'Modificado' : 'Deletado'}
              </td>
              <td className="p-2 border">{new Date(r.data).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
