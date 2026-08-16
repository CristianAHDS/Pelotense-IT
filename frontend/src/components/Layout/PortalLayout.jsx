import { Outlet, Link, NavLink } from 'react-router-dom';
import { Ticket, Plus, Sun, Moon, Contrast } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import OfflineBanner from '../ui/OfflineBanner';
import './PortalLayout.css';

export default function PortalLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="portal-layout">
      <OfflineBanner />
      <header className="portal-header">
        <Link to="/portal" className="portal-logo">
          <div className="portal-logo-icon">
            <img src="/pelotense_it_icone_app_sem_fundo_monochromatico.png" alt="Pelotense IT" className="portal-logo-img" />
          </div>
          <div>
            <h1>Pelotense IT</h1>
            <span>Portal do Cliente</span>
          </div>
        </Link>
        <nav className="portal-nav">
          <NavLink to="/portal" end className={({ isActive }) => isActive ? 'active' : ''}>
            <Ticket size={16} /> Meus Chamados
          </NavLink>
          <NavLink to="/portal/novo" className={({ isActive }) => isActive ? 'active' : ''}>
            <Plus size={16} /> Novo Chamado
          </NavLink>
          <button className="portal-theme-btn ripple" onClick={toggle} title={theme === 'dark' ? 'Modo claro' : theme === 'light' ? 'Alto contraste' : 'Modo escuro'}>
            {theme === 'dark' ? <Sun size={16} /> : theme === 'light' ? <Contrast size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>
      <main className="portal-main">
        <Outlet />
      </main>
      <footer className="portal-footer">
        <span>Pelotense IT &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
