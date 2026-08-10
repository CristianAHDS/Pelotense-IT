import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, ExternalLink } from 'lucide-react';
import './Portal.css';

const API = '/api';

const STATUS_MAP = {
  aberto: { label: 'Aberto', cls: 'badge-blue' },
  em_andamento: { label: 'Em Andamento', cls: 'badge-cyan' },
  pendente: { label: 'Pendente', cls: 'badge-yellow' },
  resolvido: { label: 'Resolvido', cls: 'badge-green' },
  fechado: { label: 'Fechado', cls: 'badge-gray' },
};

export default function PortalHome() {
  const [email, setEmail] = useState('');
  const [chamados, setChamados] = useState([]);
  const [buscou, setBuscou] = useState(false);

  const buscar = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    const res = await fetch(`${API}/chamados?limit=50`);
    const data = await res.json();
    const filtrados = (data.chamados || []).filter((c) =>
      c.solicitante.toLowerCase().includes(email.trim().toLowerCase())
    );
    setChamados(filtrados);
    setBuscou(true);
  };

  return (
    <div className="portal-page anim-fadeIn">
      <div className="portal-hero">
        <h1>Acompanhe seus chamados</h1>
        <p>Digite seu e-mail ou nome para visualizar seus chamados de TI</p>
        <form className="portal-search" onSubmit={buscar}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@empresa.com"
            autoFocus
          />
          <button type="submit"><Search size={18} /> Buscar</button>
        </form>
      </div>

      {buscou && (
        <div className="portal-results">
          <h2>{chamados.length} chamados encontrados</h2>
          {chamados.length === 0 ? (
            <div className="portal-empty">
              <p>Nenhum chamado encontrado para "{email}"</p>
              <Link to="/portal/novo" className="btn btn-primary">
                Abrir novo chamado
              </Link>
            </div>
          ) : (
            <div className="portal-list">
              {chamados.map((c) => (
                <div key={c.id} className="portal-card">
                  <div className="portal-card-header">
                    <span className="portal-card-id">#{c.id}</span>
                    <span className={`badge ${STATUS_MAP[c.status]?.cls}`}>
                      {STATUS_MAP[c.status]?.label}
                    </span>
                  </div>
                  <h3>{c.titulo}</h3>
                  <p className="portal-card-desc">{c.descricao.slice(0, 150)}{c.descricao.length > 150 ? '...' : ''}</p>
                  <div className="portal-card-meta">
                    <span>Criado em {new Date(c.criado_em).toLocaleDateString('pt-BR')}</span>
                    <span className="portal-card-cat">{c.categoria}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
