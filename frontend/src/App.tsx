// src/App.tsx
import { Routes, Route } from "react-router-dom";
import Produtos from "./pages/Produtos";
import MrpResultado from "./pages/MrpResultado";
import Ordens from "./pages/Ordens";
import BOM from "./pages/BOM";
import HistoricoGeral from "./pages/HistoricoGeral";
import DetalhesMRP from "./pages/DetalhesMRP";
import ListasTecnicas from "./pages/ListasTecnicas";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Produtos />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/listas-tecnicas" element={<ListasTecnicas />} />
        <Route path="/ordens" element={<Ordens />} />
        <Route path="/bom" element={<BOM />} />
        <Route path="/mrp" element={<MrpResultado />} />
        <Route path="/historico" element={<HistoricoGeral />} />
        <Route path="/mrp-detalhado" element={<DetalhesMRP />} />
        <Route path="*" element={<div>❌ Página não encontrada</div>} />
      </Routes>
    </Layout>
  );
}
