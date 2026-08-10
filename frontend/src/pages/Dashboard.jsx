import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Ticket, Clock, CheckCircle, AlertTriangle,
  Plus, Columns, List, ArrowRight
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { SkeletonCard, SkeletonPanel } from '../components/ui/Skeleton';
import './Dashboard.css';

const API = '/api';

const STATUS_MAP = {
  aberto: { label: 'Aberto', cls: 'badge-blue' },
  em_andamento: { label: 'Em Andamento', cls: 'badge-cyan' },
  pendente: { label: 'Pendente', cls: 'badge-yellow' },
  resolvido: { label: 'Resolvido', cls: 'badge-green' },
  fechado: { label: 'Fechado', cls: 'badge-gray' },
};

const PRIORIDADE_MAP = {
  baixa: { label: 'Baixa', cls: 'badge-green' },
  media: { label: 'Média', cls: 'badge-blue' },
  alta: { label: 'Alta', cls: 'badge-yellow' },
  critica: { label: 'Crítica', cls: 'badge-red' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEATHER_MAP = {
  0:  { emoji: '☀️', label: 'Céu limpo' },
  1:  { emoji: '🌤️', label: 'Parcialmente nublado' },
  2:  { emoji: '⛅', label: 'Nublado' },
  3:  { emoji: '☁️', label: 'Encoberto' },
  45: { emoji: '🌫️', label: 'Nevoeiro' },
  48: { emoji: '🌫️', label: 'Nevoeiro' },
  51: { emoji: '🌦️', label: 'Garoa leve' },
  53: { emoji: '🌦️', label: 'Garoa' },
  55: { emoji: '🌧️', label: 'Garoa forte' },
  61: { emoji: '🌧️', label: 'Chuva leve' },
  63: { emoji: '🌧️', label: 'Chuva' },
  65: { emoji: '🌧️', label: 'Chuva forte' },
  71: { emoji: '❄️', label: 'Neve leve' },
  73: { emoji: '❄️', label: 'Neve' },
  75: { emoji: '❄️', label: 'Neve forte' },
  80: { emoji: '🌦️', label: 'Pancadas' },
  81: { emoji: '🌧️', label: 'Pancadas fortes' },
  82: { emoji: '⛈️', label: 'Pancadas violentas' },
  95: { emoji: '⛈️', label: 'Trovoada' },
  96: { emoji: '⛈️', label: 'Trovoada com granizo' },
  99: { emoji: '⛈️', label: 'Trovoada severa' },
};

function getWeatherEmoji(code) {
  return WEATHER_MAP[code] || { emoji: '🌤️', label: 'Indisponível' };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const greeting = getGreeting();
  const { socket } = useSocket();

  const loadData = () => {
    Promise.all([
      fetch(`${API}/chamados/stats`).then((r) => r.json()),
      fetch(`${API}/chamados?limit=5`).then((r) => r.json()),
    ])
      .then(([statsData, recentData]) => {
        setStats(statsData);
        setRecentes(recentData.chamados || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();

    if (socket) {
      socket.on('chamado:created', loadData);
      socket.on('chamado:updated', loadData);
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
            .then((r) => r.json())
            .then((data) => {
              if (data.current_weather) {
                setWeather({
                  temp: Math.round(data.current_weather.temperature),
                  code: data.current_weather.weathercode,
                });
              }
            })
            .catch(() => {});
        },
        () => {},
        { timeout: 5000 }
      );
    }

    return () => {
      if (socket) {
        socket.off('chamado:created', loadData);
        socket.off('chamado:updated', loadData);
      }
    };
  }, [socket]);

  const cards = [
    { label: 'Total de Chamados', value: stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0, icon: Ticket, color: '#6366f1', filter: '' },
    { label: 'Em Aberto', value: stats?.porStatus?.find((s) => s.status === 'aberto')?.count || 0, icon: AlertTriangle, color: '#f59e0b', filter: 'aberto' },
    { label: 'Em Andamento', value: stats?.porStatus?.find((s) => s.status === 'em_andamento')?.count || 0, icon: Clock, color: '#38bdf8', filter: 'em_andamento' },
    { label: 'Resolvidos', value: stats?.porStatus?.find((s) => s.status === 'resolvido')?.count || 0, icon: CheckCircle, color: '#10b981', filter: 'resolvido' },
  ];

  const quickActions = [
    { label: 'Novo Chamado', icon: Plus, to: '/chamados/novo', color: '#6366f1', description: 'Registrar solicitação' },
    { label: 'Quadro Kanban', icon: Columns, to: '/kanban', color: '#f59e0b', description: 'Gerenciar fluxo' },
    { label: 'Ver Chamados', icon: List, to: '/chamados', color: '#10b981', description: 'Lista completa' },
  ];

  const weatherInfo = weather ? getWeatherEmoji(weather.code) : null;

  return (
    <div className="home-page">
      <section className="home-welcome">
        <div className="welcome-content">
          <div className="welcome-emoji">
            {weatherInfo ? weatherInfo.emoji : (new Date().getHours() < 18 ? '🌤️' : '🌙')}
          </div>
          <div>
            <h1>{greeting}, Cristian</h1>
            <p>
              {weather ? (
                <>Confira o resumo dos chamados &mdash; {weatherInfo.label}, {weather.temp}°C</>
              ) : (
                'Confira o resumo dos chamados de hoje'
              )}
            </p>
          </div>
        </div>
        <div className="welcome-date">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </section>

      <section className="quick-actions anim-fadeIn">
        {quickActions.map(({ label, icon: Icon, to, color, description }) => (
          <Link key={to} to={to} className="action-card" style={{ '--accent': color }}>
            <div className="action-icon" style={{ background: `${color}14`, color }}>
              <Icon size={24} />
            </div>
            <div className="action-info">
              <span className="action-label">{label}</span>
              <span className="action-desc">{description}</span>
            </div>
            <ArrowRight size={16} className="action-arrow" />
          </Link>
        ))}
      </section>

      {loading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <section className="stats-grid stagger">
          {cards.map(({ label, value, icon: Icon, color, filter }) => (
            <div
              key={label}
              className="stat-card anim-fadeInUp"
              onClick={() => navigate(`/chamados${filter ? `?status=${filter}` : ''}`)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/chamados${filter ? `?status=${filter}` : ''}`)}
            >
              <div className="stat-card-bg" />
              <div className="stat-card-glow" style={{ background: color }} />
              <div className="stat-icon-wrap" style={{ background: `${color}18`, color }}>
                <Icon size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
              </div>
              <div className="stat-trend positive">+12%</div>
            </div>
          ))}
        </section>
      )}

      <div className="home-grid">
        {loading ? (
          <div className="home-panel home-panel-recentes"><div className="panel-header"><h3>Chamados Recentes</h3></div><SkeletonPanel /></div>
        ) : (
          <div className="home-panel home-panel-recentes anim-fadeInUp">
            <div className="panel-header">
              <h3>Chamados Recentes</h3>
              <Link to="/chamados" className="panel-link">Ver todos <ArrowRight size={14} /></Link>
            </div>
            <div className="recentes-list">
              {recentes.length === 0 ? (
                <div className="recentes-empty">📋 Nenhum chamado registrado ainda.</div>
              ) : (
                recentes.map((c) => (
                  <Link key={c.id} to={`/chamados/${c.id}`} className="recent-item">
                    <div className="recent-main">
                      <span className="recent-id">#{c.id}</span>
                      <span className="recent-titulo">{c.titulo}</span>
                    </div>
                    <div className="recent-meta">
                      <span className={`badge ${STATUS_MAP[c.status]?.cls}`}>{STATUS_MAP[c.status]?.label}</span>
                      <span className={`badge ${PRIORIDADE_MAP[c.prioridade]?.cls}`}>{PRIORIDADE_MAP[c.prioridade]?.label}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {loading ? (
          <><div className="home-panel"><SkeletonPanel /></div><div className="home-panel"><SkeletonPanel /></div></>
        ) : (
          <>
            <div className="home-panel anim-fadeInUp">
              <div className="panel-header">
                <h3>Chamados por Status</h3>
                <span className="panel-badge">{stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0} total</span>
              </div>
              {stats?.porStatus && (
                <div className="bar-list">
                  {stats.porStatus.map((s) => {
                    const total = stats.porStatus.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = ((s.count / total) * 100).toFixed(0);
                    const colors = { aberto: '#f59e0b', em_andamento: '#38bdf8', pendente: '#a78bfa', resolvido: '#10b981', fechado: '#64748b' };
                    return (
                      <div key={s.status} className="bar-item">
                        <div className="bar-label">
                          <span className="bar-name"><span className="bar-dot" style={{ background: colors[s.status] || '#6366f1' }} />{s.status.replace('_', ' ')}</span>
                          <span className="bar-count">{s.count}</span>
                        </div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: colors[s.status] || '#6366f1', animation: 'barGrow 0.8s ease' }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="home-panel anim-fadeInUp">
              <div className="panel-header"><h3>Chamados por Prioridade</h3></div>
              {stats?.porPrioridade && (
                <div className="bar-list">
                  {stats.porPrioridade.map((p) => {
                    const total = stats.porPrioridade.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = ((p.count / total) * 100).toFixed(0);
                    const colors = { baixa: '#10b981', media: '#6366f1', alta: '#f59e0b', critica: '#f43f5e' };
                    return (
                      <div key={p.prioridade} className="bar-item">
                        <div className="bar-label">
                          <span className="bar-name"><span className="bar-dot" style={{ background: colors[p.prioridade] }} />{p.prioridade}</span>
                          <span className="bar-count">{p.count}</span>
                        </div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: colors[p.prioridade], animation: 'barGrow 0.8s ease' }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
