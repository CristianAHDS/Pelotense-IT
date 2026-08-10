import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import PortalLayout from './components/Layout/PortalLayout';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Chamados from './pages/Chamados';
import NovoChamado from './pages/NovoChamado';
import DetalheChamado from './pages/DetalheChamado';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import PortalHome from './pages/PortalHome';
import PortalNovo from './pages/PortalNovo';

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/chamados" element={<Chamados />} />
        <Route path="/chamados/novo" element={<NovoChamado />} />
        <Route path="/chamados/:id" element={<DetalheChamado />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/novo" element={<PortalNovo />} />
      </Route>
    </Routes>
  );
}
