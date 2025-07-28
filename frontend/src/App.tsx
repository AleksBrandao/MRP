import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Produtos from "./pages/Produtos";
import MrpResultado from "./pages/MrpResultado";
import Ordens from "./pages/Ordens";
import BOM from "./pages/BOM";
import HistoricoGeral from "./pages/HistoricoGeral";
import DetalhesMRP from "./pages/DetalhesMRP";


function App() {
  return (
    <Router>
      <div className="max-w-3xl mx-auto py-6 px-4">
        <nav className="flex gap-6 mb-6 border-b pb-3 text-sm font-medium text-gray-700">
          <Link to="/" className="hover:text-blue-600 transition">
            Produtos
          </Link>
          <Link to="/ordens" className="hover:text-blue-600 transition">
            Ordens de Produção
          </Link>
          <Link to="/bom" className="hover:text-blue-600 transition">
            BOM
          </Link>
          <Link to="/mrp" className="hover:text-blue-600 transition">
            Executar MRP
          </Link>
          <Link to="/historico-geral" className="hover:text-blue-600 transition">Histórico</Link>
          <Link to="/mrp-detalhado">📋 MRP Detalhado</Link>

        </nav>
        <Routes>
          <Route path="/" element={<Produtos />} />
          <Route path="/ordens" element={<Ordens />} />
          <Route path="/bom" element={<BOM />} />
          <Route path="/mrp" element={<MrpResultado />} />
          <Route path="/historico-geral" element={<HistoricoGeral />} />
          <Route path="/mrp-detalhado" element={<DetalhesMRP />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
