import { BrowserRouter as Router, Routes, Route, Navigate, Link  } from "react-router-dom";

// ⬇️ novas páginas
import ComponentesPage from "./pages/ComponentesPage";
import MateriasPrimasPage from "./pages/MateriasPrimasPage";
import ListasTecnicasPage from "./pages/ListasTecnicasPage";
import Header from "./components/Header";


// ⬇️ páginas existentes que permanecem
import MrpResultado from "./pages/MrpResultado";
import Ordens from "./pages/Ordens";
import HistoricoGeral from "./pages/HistoricoGeral";
import DetalhesMRP from "./pages/DetalhesMRP";
import BOMPage from "./pages/BOMPage";
import ListaTecnicaPage from "./pages/ListaTecnicaPage";

// ⚠️ REMOVA estes imports antigos se ainda existirem:
// import Produtos from "./pages/Produtos";
// import BOM from "./pages/BOM";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            {/* Redireciona a home para Componentes */}
            <Route path="/" element={<Navigate to="/componentes" replace />} />

            {/* Cadastros separados */}
            <Route path="/componentes" element={<ComponentesPage />} />
            <Route path="/materias-primas" element={<MateriasPrimasPage />} />
            <Route path="/listas-tecnicas" element={<ListaTecnicaPage />} />

            {/* Compatibilidade com rota antiga */}
            {/* <Route path="/bom" element={<ListasTecnicasPage />} /> */}

            {/* Demais rotas existentes */}
            <Route path="/ordens" element={<Ordens />} />
            <Route path="/mrp" element={<MrpResultado />} />
            <Route path="/historico-geral" element={<HistoricoGeral />} />
            <Route path="/mrp-detalhado" element={<DetalhesMRP />} />
            <Route path="/bom" element={<BOMPage />} />
            <Route path="/lista-tecnica" element={<ListasTecnicasPage />} />


          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
