import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, PlusCircle, BarChart3, Settings,
  Wrench, Columns, Menu, X, Bell, Sun, Moon, ChevronLeft, ChevronRight, Plus,
  Trophy, Contrast, UserCog, LogOut, Mail, MessageCircle,
} from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import NetworkSpeed from '../ui/NetworkSpeed';
import PageTransition from '../ui/PageTransition';
import OfflineBanner from '../ui/OfflineBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './DashboardLayout.css';

const mainMenuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban', icon: Columns, label: 'Kanban' },
  { to: '/chamados', icon: Ticket, label: 'Chamados', badge: true },
  { to: '/chamados/novo', icon: PlusCircle, label: 'Novo Chamado', cta: true },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/gamificacao', icon: Trophy, label: 'Gamificação' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const adminMenuItems = [
  { to: '/cadastro-tecnicos', icon: UserCog, label: 'Cadastro de Técnicos' },
  { to: '/enviar-email', icon: Mail, label: 'Envio de E-mails' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
];

const breadcrumbMap = {
  '/': 'Dashboard',
  '/kanban': 'Kanban',
  '/chamados': 'Chamados',
  '/chamados/novo': 'Novo Chamado',
  '/relatorios': 'Relatórios',
  '/gamificacao': 'Gamificação',
  '/configuracoes': 'Configurações',
  '/cadastro-tecnicos': 'Cadastro de Técnicos',
  '/enviar-email': 'Envio de E-mails',
  '/whatsapp': 'WhatsApp',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const { notifications, clearNotifications } = useSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [abertosCount, setAbertosCount] = useState(0);

  useEffect(() => {
    fetch('/api/chamados/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const abertos = ['aberto', 'em_andamento', 'pendente'];
        const count = (data.porStatus || []).reduce((acc, s) => acc + (abertos.includes(s.status) ? (s.count || 0) : 0), 0);
        setAbertosCount(count);
      })
      .catch(() => {});
  }, []);

  const closeSidebar = () => setSidebarOpen(false);
  const unread = notifications.length;

  const isDetailPage = location.pathname.startsWith('/chamados/') && location.pathname !== '/chamados' && location.pathname !== '/chamados/novo';
  const currentLabel = breadcrumbMap[location.pathname] || (isDetailPage ? `Chamado #${location.pathname.split('/').pop()}` : '');

  return (
    <div className={`dashboard-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <OfflineBanner />
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar}><X size={20} /></button>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <img src="/pelotense_it_icone_app_sem_fundo_monochromatico.png" alt="Pelotense IT" className="brand-logo" />
          </div>
          <div className="brand-text"><h1>Pelotense IT</h1><span>Gestão de Chamados</span></div>
        </div>

        <div className="sidebar-section-label">Menu Principal</div>
        <nav className="sidebar-nav">
          {mainMenuItems.map(({ to, icon: Icon, label, badge, cta }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}${cta ? ' cta' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span className="link-label">{label}</span>
              {badge && abertosCount > 0 && <span className="nav-badge">{abertosCount}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="sidebar-section-label">Administração</div>
        <nav className="sidebar-nav">
          {adminMenuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span className="link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Recolher'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="sidebar-collapse-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : theme === 'light' ? 'Alto contraste' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={16} /> : theme === 'light' ? <Contrast size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user ? user.nome.charAt(0).toUpperCase() : 'CR'}</div>
            <div className="user-info">
              <span className="user-name">{user?.nome || 'Cristian Raffi Cunha'}</span>
              <span className="user-role">{user?.tipo === 'radio' ? 'Téc. Rádio' : user?.tipo === 'audiovisual' ? 'Audiovisual' : user?.tipo === 'convidado' ? 'Convidado' : 'TI'}</span>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={() => { logout(); navigate('/login'); }} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
        <div className="mobile-brand"><img src="/pelotense_it_icone_app_sem_fundo_monochromatico.png" alt="Pelotense IT" className="mobile-brand-logo" /><span>Pelotense IT</span></div>
        <div className="mobile-header-actions">
          <NetworkSpeed />
          <button className="notif-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : theme === 'light' ? 'Alto contraste' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={18} /> : theme === 'light' ? <Contrast size={18} /> : <Moon size={18} />}
          </button>
          <button className="notif-btn" onClick={() => setNOpen(!nOpen)}>
            <Bell size={18} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav">
        {mainMenuItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={20} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="dashboard-main">
        <div className="top-bar">
          <div className="top-bar-left">
            {currentLabel && currentLabel !== 'Dashboard' && (
              <div className="breadcrumbs">
                <NavLink to="/">Dashboard</NavLink>
                <span>/</span>
                <span>{currentLabel}</span>
              </div>
            )}
          </div>
          <div className="top-bar-right">
            <NetworkSpeed />
            <button className="notif-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="notif-wrapper">
              <button className="notif-btn" onClick={() => setNOpen(!nOpen)}>
                <Bell size={16} />
                {unread > 0 && <span className="notif-badge">{unread}</span>}
              </button>
              {nOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>Notificações ({unread})</span>
                    {unread > 0 && <button onClick={clearNotifications}>Limpar</button>}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">🔔 Tudo em dia!</div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div key={n.id} className={`notif-item ${n.type}`}>
                          <p>{n.msg}</p><span>{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <NavLink to="/chamados/novo" className="fab-btn"><Plus size={24} /></NavLink>

      {nOpen && <div className="notif-overlay" onClick={() => setNOpen(false)} />}
    </div>
  );
}
