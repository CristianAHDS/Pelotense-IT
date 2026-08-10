import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, PlusCircle, BarChart3, Settings,
  Wrench, Columns, Menu, X, Bell, Sun, Moon, ChevronLeft, ChevronRight, Plus,
  Play, Pause, Volume2,
} from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import './DashboardLayout.css';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban', icon: Columns, label: 'Kanban' },
  { to: '/chamados', icon: Ticket, label: 'Chamados' },
  { to: '/chamados/novo', icon: PlusCircle, label: 'Novo Chamado' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const breadcrumbMap = {
  '/': 'Dashboard',
  '/kanban': 'Kanban',
  '/chamados': 'Chamados',
  '/chamados/novo': 'Novo Chamado',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioVolume, setRadioVolume] = useState(0.5);
  const [radioAudio, setRadioAudio] = useState(null);
  const { notifications, clearNotifications } = useSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);
  const unread = notifications.length;

  const isDetailPage = location.pathname.startsWith('/chamados/') && location.pathname !== '/chamados' && location.pathname !== '/chamados/novo';
  const currentLabel = breadcrumbMap[location.pathname] || (isDetailPage ? `Chamado #${location.pathname.split('/').pop()}` : '');

  const toggleRadio = () => {
    if (radioPlaying) {
      if (radioAudio) { radioAudio.pause(); radioAudio.src = ''; setRadioAudio(null); }
      setRadioPlaying(false);
    } else {
      const audio = new Audio('https://painel.audiotx.com.br/audio/radio.pelotense.aac');
      audio.volume = radioVolume;
      audio.play().catch(() => {});
      audio.addEventListener('error', () => setRadioPlaying(false));
      setRadioAudio(audio);
      setRadioPlaying(true);
    }
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setRadioVolume(v);
    if (radioAudio) radioAudio.volume = v;
  };

  return (
    <div className={`dashboard-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar}><X size={20} /></button>
        <div className="sidebar-brand">
          <div className="brand-icon"><Wrench size={collapsed ? 20 : 26} /></div>
          {!collapsed && <div className="brand-text"><h1>Pelotense IT</h1><span>Gestão de Chamados</span></div>}
        </div>

        {!collapsed && <div className="sidebar-section-label">Menu Principal</div>}
        <nav className="sidebar-nav">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Recolher'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="sidebar-collapse-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {!collapsed && (
          <div className={`sidebar-radio ${radioPlaying ? 'playing' : ''}`}>
            <div className="sidebar-radio-top">
              <div className="radio-info">
                <span className="radio-dot" />
                <span>Rádio Pelotense</span>
              </div>
              <button className="radio-play-btn" onClick={toggleRadio} title={radioPlaying ? 'Parar' : 'Tocar'}>
                {radioPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
            {radioPlaying && (
              <div className="radio-volume-row">
                <Volume2 size={12} />
                <input type="range" min="0" max="1" step="0.1" value={radioVolume} onChange={handleVolume} />
              </div>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">CR</div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">Cristian Raffi Cunha</span>
                <span className="user-role">Administrador</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
        <div className="mobile-brand"><Wrench size={20} /><span>Pelotense IT</span></div>
        <div className="mobile-header-actions">
          <button className="notif-btn" onClick={toggleTheme}><Sun size={18} /></button>
          <button className="notif-btn" onClick={() => setNOpen(!nOpen)}>
            <Bell size={18} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav">
        {menuItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
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
        <Outlet />
      </main>

      <NavLink to="/chamados/novo" className="fab-btn"><Plus size={24} /></NavLink>

      {nOpen && <div className="notif-overlay" onClick={() => setNOpen(false)} />}
    </div>
  );
}
