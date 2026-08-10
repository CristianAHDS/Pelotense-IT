import { Outlet, Link, NavLink } from 'react-router-dom';
import { Wrench, Ticket, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './PortalLayout.css';

export default function PortalLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <Link to="/portal" className="portal-logo">
          <div className="portal-logo-icon"><Wrench size={22} /></div>
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
          <button className="portal-theme-btn" onClick={toggle}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
