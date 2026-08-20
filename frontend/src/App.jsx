import { lazy, Suspense } from 'react';
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
import Landing from './pages/Landing';
import Login from './pages/Login';

const Rede = lazy(() => import('./pages/Rede'));

function PageFallback() {
  return (
    <div style={{ padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
      Carregando página...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.tipo !== 'TI') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
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
        <Route element={<AdminRoute><Configuracoes /></AdminRoute>} path="/configuracoes" />
        <Route element={<AdminRoute><CadastroTecnicos /></AdminRoute>} path="/cadastro-tecnicos" />
        <Route element={<AdminRoute><EnviarEmail /></AdminRoute>} path="/enviar-email" />
        <Route element={<AdminRoute><Whatsapp /></AdminRoute>} path="/whatsapp" />
        <Route element={<AdminRoute><WhatsappChat /></AdminRoute>} path="/whatsapp/chat/:numero" />
        <Route element={<AdminRoute><Suspense fallback={<PageFallback />}><Rede /></Suspense></AdminRoute>} path="/rede" />
      </Route>

      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/novo" element={<PortalNovo />} />
      </Route>
    </Routes>
  );
}
