import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import PortalLayout from './components/Layout/PortalLayout';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Chamados from './pages/Chamados';
import NovoChamado from './pages/NovoChamado';
import DetalheChamado from './pages/DetalheChamado';
import Relatorios from './pages/Relatorios';
import Gamificacao from './pages/Gamificacao';
import Ponto from './pages/Ponto';
import Configuracoes from './pages/Configuracoes';
import CadastroTecnicos from './pages/CadastroTecnicos';
import EnviarEmail from './pages/EnviarEmail';
import Whatsapp from './pages/Whatsapp';
import WhatsappChat from './pages/WhatsappChat';
import PortalHome from './pages/PortalHome';
import PortalNovo from './pages/PortalNovo';
import Login from './pages/Login';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/chamados" element={<Chamados />} />
        <Route path="/chamados/novo" element={<NovoChamado />} />
        <Route path="/chamados/:id" element={<DetalheChamado />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/gamificacao" element={<Gamificacao />} />
        <Route path="/ponto" element={<Ponto />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/cadastro-tecnicos" element={<CadastroTecnicos />} />
        <Route path="/enviar-email" element={<EnviarEmail />} />
        <Route path="/whatsapp" element={<Whatsapp />} />
        <Route path="/whatsapp/chat/:numero" element={<WhatsappChat />} />
      </Route>

      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/novo" element={<PortalNovo />} />
      </Route>
    </Routes>
  );
}
