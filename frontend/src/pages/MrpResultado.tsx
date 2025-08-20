import { useEffect, useState } from "react";
import api from "../services/http";

interface ResultadoMRP {
  codigo: string;
  nome: string;
  necessario: number;
  em_estoque: number;mrp_detalhado
  faltando: number;
  lead_time: number;
  data_compra: string;
  nivel: number;
  codigo_pai: string | null;
  tipo: string; // novo campo
}

interface ResultadoMRPComFilhos extends ResultadoMRP {
  filhos?: ResultadoMRPComFilhos[];
  expandido?: boolean;
}

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case "componente": return "Componente";
    case "materia_prima": return "Matéria-Prima";
    case "lista": return "Lista Técnica (BOM)";
    default: return tipo;
  }
}

export default function MrpResultado() {
  const [dados, setDados] = useState<ResultadoMRPComFilhos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("");

  useEffect(() => {
    api.get("/mrp/")
      .then((res) => {
        const itens = (res.data as ResultadoMRP[]).sort((a, b) =>
          a.nivel - b.nivel || a.nome.localeCompare(b.nome)
        );
        const mapa: { [codigo: string]: ResultadoMRPComFilhos } = {};
        const raiz: ResultadoMRPComFilhos[] = [];

        itens.forEach((item) => {
          mapa[item.codigo] = { ...item, filhos: [], expandido: true };
        });

        itens.forEach((item) => {
          if (item.codigo_pai && mapa[item.codigo_pai]) {
            mapa[item.codigo_pai].filhos!.push(mapa[item.codigo]);
          } else {
            raiz.push(mapa[item.codigo]);
          }
        });

        setDados(raiz);
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

  const renderLinha = (item: ResultadoMRPComFilhos, nivel: number = 0): JSX.Element[] => {
    if (filtroTipo && item.tipo !== filtroTipo) return [];

    const toggle = () => {
      item.expandido = !item.expandido;
      setDados([...dados]);
    };

    const linhaAtual = (
      <tr key={item.codigo}>
        <td className="border px-4 py-2">{item.codigo}</td>
        <td className="border px-4 py-2">
          <div
            style={{ paddingLeft: `${nivel * 20}px` }}
            className={`flex items-center gap-1 ${corPorNivel(nivel)}`}
          >
            {item.filhos && item.filhos.length > 0 && (
              <button onClick={toggle} className="font-bold">
                {item.expandido ? "▾" : "▸"}
              </button>
            )}
            {item.nome}
          </div>
        </td>
        <td className="border px-4 py-2">{item.necessario}</td>
        <td className="border px-4 py-2">{item.em_estoque}</td>
        <td className="border px-4 py-2 text-red-600">{item.faltando}</td>
        <td className="border px-4 py-2">{item.lead_time}</td>
        <td className="border px-4 py-2">
          {item.data_compra ? new Date(item.data_compra).toLocaleDateString() : ""}
        </td>
        <td className="border px-4 py-2">{getTipoLabel(item.tipo)}</td>
      </tr>
    );

    const filhos = item.expandido && item.filhos
      ? item.filhos.flatMap((filho) => renderLinha(filho, nivel + 1))
      : [];

    return [linhaAtual, ...filhos];
  };

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

      <div className="mb-4">
        <label className="block mb-1">Filtrar por tipo:</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="border px-3 py-1"
        >
          <option value="">Todos</option>
          <option value="produto">Componente</option>
          <option value="materia_prima">Matéria-Prima</option>
          <option value="lista">Lista Técnica (BOM)</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : dados.length === 0 ? (
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
            {dados.flatMap((item) => renderLinha(item))}
          </tbody>
        </table>
      )}
    </div>
  );
}
