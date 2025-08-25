// src/components/Navbar.tsx
import { NavLink } from "react-router-dom";

const link = "hover:underline";
const active = "font-semibold";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="container h-14 flex items-center gap-6">
        <span className="font-bold">MRP</span>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink to="/produtos" className={({isActive}) => `${link} ${isActive ? active : ""}`}>Produtos</NavLink>
          <NavLink to="/listas-tecnicas" className={({isActive}) => `${link} ${isActive ? active : ""}`}>Listas Técnicas</NavLink>
          <NavLink to="/ordens" className={({isActive}) => `${link} ${isActive ? active : ""}`}>Ordens de Produção</NavLink>
          <NavLink to="/bom" className={({isActive}) => `${link} ${isActive ? active : ""}`}>BOM</NavLink>
          <NavLink to="/bom-planilha" className={({isActive}) => `${link} ${isActive ? active : ""}`}>BOM (Planilha)</NavLink>
          <NavLink to="/mrp" className={({isActive}) => `${link} ${isActive ? active : ""}`}>Executar MRP</NavLink>
          <NavLink to="/historico" className={({isActive}) => `${link} ${isActive ? active : ""}`}>Histórico</NavLink>
          <NavLink to="/mrp-detalhado" className={({isActive}) => `${link} ${isActive ? active : ""}`}>MRP Detalhado</NavLink>
        </nav>
      </div>
    </header>
  );
}
