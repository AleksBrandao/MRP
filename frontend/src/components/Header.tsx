import { NavLink } from "react-router-dom";

const linkBase =
  "px-3 py-2 rounded-xl transition hover:bg-gray-100";
const linkActive = "bg-gray-100 font-semibold";

export default function Header() {
  const item = (to: string, label: string) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ""}`}
      end
    >
      {label}
    </NavLink>
  );

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="text-lg font-bold">MRP</div>
        <nav className="flex items-center gap-2 flex-wrap">
          {/* Cadastros */}
          {item("/componentes", "Componentes")}
          {item("/materias-primas", "Matérias‑primas")}
          {item("/listas-tecnicas", "Listas Técnicas")}
          {/* Compatibilidade com rota antiga */}
          {item("/bom", "BOM")}
          {/* Operação */}
          {item("/ordens", "Ordens de Produção")}
          {item("/mrp", "Executar MRP")}
          {item("/historico-geral", "Histórico")}
          {item("/mrp-detalhado", "📋 MRP Detalhado")}
        </nav>
      </div>
    </header>
  );
}
