import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, Clock, CheckCircle, AlertTriangle, Plus, Columns, List, ArrowRight, Activity, ThermometerSun } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
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

const EVENT_ICONS = { criacao: '📝', status: '🔄', edicao: '✏️', resolucao: '✅' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEATHER_MAP = {
  0: { emoji: '☀️', label: 'Céu limpo' },
  1: { emoji: '🌤️', label: 'Parcialmente nublado' },
  2: { emoji: '⛅', label: 'Nublado' },
  3: { emoji: '☁️', label: 'Encoberto' },
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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr.replace(' ', 'T'));
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return 'há ' + Math.floor(diff / 60) + 'min';
  if (diff < 86400) return 'há ' + Math.floor(diff / 3600) + 'h';
  if (diff < 172800) return 'há 1d';
  return 'há ' + Math.floor(diff / 86400) + 'd';
}


function CountUp({ end, duration = 800 }) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(end * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [end, duration]);
  return React.createElement(React.Fragment, null, val);
}

function Sparkline({ data, color = '#6366f1', width = 120, height = 24 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = (i * stepX).toFixed(1);
    const y = (height - ((v - min) / range) * (height * 0.8) - height * 0.1).toFixed(1);
    return x + ',' + y;
  }).join(' ');
  const areaPoints = '0,' + height + ' ' + points + ' ' + width + ',' + height;
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} className='sparkline'>
      <polygon points={areaPoints} fill={color + '14'} />
      <polyline points={points} fill='none' stroke={color} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

function DonutChart({ segments = [], size = 120, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((a, b) => a + b.count, 0) || 1;
  return (
    <div className='donut-wrap'>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        {segments.map((seg, i) => {
          const pct = seg.count / total;
          const dash = circumference * pct;
          const dashOffset = circumference * 0.25;
          const segOffset = -circumference * (segments.slice(0, i).reduce((a, b) => a + b.count, 0) / total) + dashOffset;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill='none'
              stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={dash + ' ' + (circumference - dash)}
              strokeDashoffset={segOffset} strokeLinecap='round'
              className='donut-segment'
              style={{ animationDelay: (i * 0.15) + 's' }} />
          );
        })}
      </svg>
      <div className='donut-center'>
        <span className='donut-total'>{total}</span>
        <span className='donut-label'>total</span>
      </div>
    </div>
  );
}

function HeatmapCalendar({ data = [] }) {
  const today = new Date();
  const weeks = 12;
  const dayLabels = ['', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const cells = [];
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const key = date.toISOString().slice(0, 10);
      const found = data.find((x) => x.dia === key);
      const count = found?.count || 0;
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 3) level = 2;
      if (count >= 6) level = 3;
      if (count >= 10) level = 4;
      cells.push({ key, count, level });
    }
  }
  return (
    <div className='heatmap-wrap'>
      <div className='heatmap-grid'>
        <div className='heatmap-labels'>
          {dayLabels.map((l, i) => <span key={i} className='heatmap-label'>{l}</span>)}
        </div>
        <div className='heatmap-cells' style={{ gridTemplateColumns: 'repeat(' + weeks + ', 1fr)' }}>
          {cells.map((cell, i) => (
            <div key={cell.key} className={'heatmap-cell level-' + cell.level}
              title={cell.key + ': ' + cell.count + ' chamados'} />
          ))}
        </div>
      </div>
      <div className='heatmap-legend'>
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((l) => <div key={l} className={'heatmap-dot level-' + l} />)}
        <span>Mais</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [emergencia, setEmergencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [slide, setSlide] = useState(0);
  const greeting = getGreeting();
  const { socket } = useSocket();
  const { user } = useAuth();

  const todayStr = new Date().toLocaleDateString('sv');
  const hojeCriados = stats?.porDia?.find((d) => d.dia === todayStr)?.count || 0;
  const hojeResolvidos = stats ? (() => {
    return (recentes || []).filter((c) => c.status === 'resolvido' && (c.resolvido_em || '').slice(0, 10) === todayStr).length;
  })() : 0;

  const weatherInfo = weather ? getWeatherEmoji(weather.code) : null;

  const slides = [
    {
      emoji: weather ? weatherInfo.emoji : '🌤️',
      title: greeting + ', ' + (user?.nome || 'Cristian'),
      text: weather
        ? (weatherInfo.label + ', ' + weather.temp + '°C — Confira o resumo dos chamados')
        : 'Carregando previsão... — Confira o resumo dos chamados',
      loading: !weather,
    },
    {
      title: 'Resumo do Dia',
      text: hojeCriados + ' criados hoje · ' + hojeResolvidos + ' resolvidos · ' + (stats?.porStatus?.find((s) => s.status === 'aberto')?.count || 0) + ' em aberto',
    },
    {
      title: 'Lembrete',
      text: stats?.porStatus?.find((s) => s.status === 'pendente')?.count
        ? stats.porStatus.find((s) => s.status === 'pendente').count + ' chamados pendentes aguardando ação'
        : 'Nenhum chamado pendente no momento',
    },
    {
      title: 'Dica',
      text: 'Use o Kanban para arrastar cards entre colunas e gerenciar o fluxo de trabalho de forma visual.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [weather, stats, greeting]);

  const loadData = () => {
    Promise.all([
      fetch(API + '/chamados/stats').then((r) => r.json()),
      fetch(API + '/chamados?limit=5').then((r) => r.json()),
      fetch(API + '/chamados/feed?limit=12').then((r) => r.json()),
      fetch(API + '/chamados/emergencia').then((r) => r.json()),
    ])
      .then(([statsData, recentData, feedData, emergData]) => {
        setStats(statsData);
        setRecentes(recentData.chamados || []);
        setFeed(Array.isArray(feedData) ? feedData : []);
        setEmergencia(emergData);
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
    const fetchWeather = (lat, lon) => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true')
        .then((r) => r.json())
        .then((data) => {
          if (data.current_weather) {
            setWeather({ temp: Math.round(data.current_weather.temperature), code: data.current_weather.weathercode });
          }
        })
        .catch(() => {});
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          fetchWeather(-31.77, -52.34);
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather(-31.77, -52.34);
    }
    return () => {
      if (socket) {
        socket.off('chamado:created', loadData);
        socket.off('chamado:updated', loadData);
      }
    };
  }, [socket]);

  const totalChamados = stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0;
  const openCount = stats?.porStatus?.find((s) => s.status === 'aberto')?.count || 0;
  const progressCount = stats?.porStatus?.find((s) => s.status === 'em_andamento')?.count || 0;
  const resolvedCount = stats?.porStatus?.find((s) => s.status === 'resolvido')?.count || 0;

  const cards = [
    { label: 'Total de Chamados', value: totalChamados, icon: Ticket, color: '#6366f1', filter: '', trend: stats?.trend },
    { label: 'Em Aberto', value: openCount, icon: AlertTriangle, color: '#f59e0b', filter: 'aberto', pulse: openCount > 0 },
    { label: 'Em Andamento', value: progressCount, icon: Clock, color: '#38bdf8', filter: 'em_andamento' },
    { label: 'Resolvidos', value: resolvedCount, icon: CheckCircle, color: '#10b981', filter: 'resolvido', trend: stats?.resolvedTrend },
  ];

  const quickActions = [
    { label: 'Novo Chamado', icon: Plus, to: '/chamados/novo', color: '#6366f1', description: 'Registrar solicitação', badge: hojeCriados > 0 ? hojeCriados : null },
    { label: 'Quadro Kanban', icon: Columns, to: '/kanban', color: '#f59e0b', description: 'Gerenciar fluxo' },
    { label: 'Ver Chamados', icon: List, to: '/chamados', color: '#10b981', description: 'Lista completa' },
  ];

  const donutSegments = (stats?.porStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => {
      const colors = { aberto: '#f59e0b', em_andamento: '#38bdf8', pendente: '#a78bfa', resolvido: '#10b981', fechado: '#64748b' };
      return { ...s, color: colors[s.status] || '#6366f1' };
    });

  const tmr = stats?.slaMedio ? stats.slaMedio + 'h' : '--';
  const sparkData = (stats?.porDia || []).slice(-14).map((d) => d.count);

  const handleTilt = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rx = ((y - centerY) / centerY) * -6;
    const ry = ((x - centerX) / centerX) * 6;
    card.style.transform = 'perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
  }, []);

  const handleTiltLeave = useCallback((e) => {
    e.currentTarget.style.transform = '';
  }, []);

  const criticos = emergencia?.criticos || [];
  const parados = emergencia?.parados || [];
  const precisaAtencao = [...criticos, ...parados].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i).slice(0, 5);


  return (
    <div className='home-page'>
      <section className='home-welcome welcome-carousel'>
        <div className='welcome-particles'>
          {[...Array(6)].map((_, i) => (
            <div key={i} className='welcome-particle' style={{
              left: (10 + i * 15) + '%',
              animationDelay: (i * 0.7) + 's',
              animationDuration: (3 + i * 0.5) + 's',
            }} />
          ))}
        </div>
        {slides.map((s, i) => (
          <div key={i} className={'carousel-slide' + (i === slide ? ' active' : '')}>
            <div className='welcome-content'>
              {s.emoji && <span className={'welcome-emoji' + (s.loading ? ' skeleton-shimmer' : '')}>{s.emoji}</span>}
              <div>
                <h1>{s.title}</h1>
                <p className={s.loading ? 'skeleton-text' : ''}>{s.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div className='carousel-dots'>
          {slides.map((_, i) => (
            <button key={i} className={'carousel-dot' + (i === slide ? ' active' : '')} onClick={() => setSlide(i)} />
          ))}
        </div>
        <div className='welcome-right'>
          <div className={'weather-pill' + (!weather ? ' weather-skeleton' : '')}>
            <ThermometerSun size={14} />
            <span>{weather ? weather.temp + '°C' : '--°'}</span>
          </div>
          <div className='welcome-date'>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <Sparkline data={sparkData} color='#818cf8' width={100} height={28} />
        </div>
      </section>

      <section className='quick-actions anim-fadeIn'>
        {quickActions.map(({ label, icon: Icon, to, color, description, badge }) => (
          <Link key={to} to={to} className='action-card glass-hover' style={{ '--accent': color }}>
            <div className='action-particles'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='action-particle' style={{
                  left: (15 + i * 22) + '%',
                  animationDelay: (i * 0.5) + 's',
                }} />
              ))}
            </div>
            <div className='action-icon' style={{ background: color + '14', color }}>
              <Icon size={24} />
            </div>
            <div className='action-info'>
              <span className='action-label'>{label}</span>
              <span className='action-desc'>{description}</span>
            </div>
            {badge && <span className='action-badge'>{badge}</span>}
            <ArrowRight size={16} className='action-arrow' />
          </Link>
        ))}
      </section>

      {loading ? (
        <div className='stats-grid'>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <section className='stats-grid stagger'>
          {cards.map(({ label, value, icon: Icon, color, filter, trend, pulse }) => (
            <div
              key={label}
              className='stat-card anim-fadeInUp'
              onClick={() => navigate('/chamados' + (filter ? '?status=' + filter : ''))}
              role='button' tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/chamados' + (filter ? '?status=' + filter : ''))}
              onMouseMove={handleTilt}
              onMouseLeave={handleTiltLeave}
            >
              <div className='stat-card-bg' />
              <div className='stat-card-glow' style={{ background: color }} />
              <div className={'stat-icon-wrap' + (pulse ? ' pulse' : '')} style={{ background: color + '18', color }}>
                <Icon size={22} />
              </div>
              <div className='stat-info'>
                <span className='stat-value'><CountUp end={value} /></span>
                <span className='stat-label'>{label}</span>
              </div>
              {trend !== undefined && (
                <div className={'stat-trend ' + (trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral')}>
                  {trend > 0 ? '↑' : trend < 0 ? '↓' : '–'} {Math.abs(trend)}%
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <div className='home-grid'>
        {loading ? (
          <div className='home-panel home-panel-recentes'><div className='panel-header'><h3>Chamados Recentes</h3></div><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-recentes anim-fadeInUp'>
            <div className='panel-header'>
              <h3>Chamados Recentes</h3>
              <Link to='/chamados' className='panel-link'>Ver todos <ArrowRight size={14} /></Link>
            </div>
            <div className='recentes-list'>
              {recentes.length === 0 ? (
                <div className='recentes-empty'>📋 Nenhum chamado registrado ainda.</div>
              ) : (
                recentes.map((c) => (
                  <Link key={c.id} to={'/chamados/' + c.id} className='recent-item'>
                    <div className='recent-left'>
                      <div className='recent-main'>
                        <div className='recent-top'>
                          <span className='recent-id'>#{c.id}</span>
                          <span className='recent-titulo'>{c.titulo}</span>
                        </div>
                        <span className='recent-time'>{timeAgo(c.criado_em)}</span>
                      </div>
                    </div>
                    <div className='recent-meta'>
                      <span className={'badge ' + STATUS_MAP[c.status]?.cls}>{STATUS_MAP[c.status]?.label}</span>
                      <span className={'badge ' + PRIORIDADE_MAP[c.prioridade]?.cls}>{PRIORIDADE_MAP[c.prioridade]?.label}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}


        {/* Category Donut Chart */}
        {loading ? (
          <div className='home-panel home-panel-donut'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-donut anim-fadeInUp'>
            <div className='panel-header'><h3>Chamados por Categoria</h3></div>
            <div className='donut-content'>
              {stats?.porCategoria && (() => {
                const catColors = {
                  hardware: '#f59e0b', software: '#6366f1', rede: '#38bdf8', impressora: '#a78bfa',
                  email: '#f43f5e', acesso: '#10b981', geral: '#64748b', evento: '#f97316',
                  censura: '#ec4899', gravacao: '#8b5cf6', edicao: '#06b6d4', postagem: '#84cc16',
                };
                const catIcons = {
                  hardware: '💻', software: '🖥️', rede: '🌐', impressora: '🖨️',
                  email: '📧', acesso: '🔑', geral: '📋', evento: '🎪',
                  censura: '🎥', gravacao: '🎙️', edicao: '✂️', postagem: '📡',
                };
                const data = stats.porCategoria;
                const total = data.reduce((a, b) => a + b.count, 0) || 1;
                const size = 170;
                const strokeWidth = 18;
                const radius = (size - strokeWidth) / 2;
                const circ = 2 * Math.PI * radius;
                return (
                  <>
                    <div className='donut-wrap'>
                      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
                        {data.map((seg, i) => {
                          const pct = seg.count / total;
                          const dash = circ * pct;
                          const offset = -circ * (data.slice(0, i).reduce((a, b) => a + b.count, 0) / total) + circ * 0.25;
                          return (
                            <circle
                              key={i}
                              cx={size / 2} cy={size / 2} r={radius}
                              fill="none"
                              stroke={catColors[seg.categoria] || '#6366f1'}
                              strokeWidth={strokeWidth}
                              strokeDasharray={dash + ' ' + (circ - dash)}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </svg>
                      <div className='donut-center'>
                        <span className='donut-total'>{total}</span>
                        <span className='donut-label'>chamados</span>
                      </div>
                    </div>
                    <div className='donut-legend'>
                      {data.slice(0, 6).map((c) => (
                        <div key={c.categoria} className='donut-legend-item'>
                          <span className='donut-legend-dot' style={{ background: catColors[c.categoria] || '#6366f1' }} />
                          <span>{catIcons[c.categoria] || '📋'} {c.categoria}</span>
                          <span className='donut-legend-count'>{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Donut Chart - Status */}
        {loading ? (
          <div className='home-panel home-panel-donut'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-donut anim-fadeInUp'>
            <div className='panel-header'>
              <h3>Chamados por Status</h3>
              <span className='panel-badge'>{totalChamados} total</span>
            </div>
            <div className='donut-content'>
              <DonutChart segments={donutSegments} size={160} strokeWidth={14} />
              <div className='donut-legend'>
              {donutSegments.map((s) => (
                <div key={s.status} className='donut-legend-item'>
                  <span className='donut-legend-dot' style={{ background: s.color }} />
                  <span>{STATUS_MAP[s.status]?.label || s.status}</span>
                  <span className='donut-legend-count'>{s.count}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {loading ? (
          <div className='home-panel home-panel-feed'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-feed anim-fadeInUp'>
            <div className='panel-header'>
              <h3><Activity size={14} style={{ marginRight: 6 }} />Atividade Recente</h3>
            </div>
            <div className='feed-list'>
              {feed.length === 0 ? (
                <div className='recentes-empty'>🔔 Nenhuma atividade registrada.</div>
              ) : (
                feed.slice(0, 8).map((item) => (
                  <Link key={item.id} to={'/chamados/' + item.chamado_id} className='feed-item'>
                    <span className='feed-icon'>{EVENT_ICONS[item.acao] || '📌'}</span>
                    <div className='feed-body'>
                      <div className='feed-desc'>
                        <strong>#{item.chamado_id}</strong> {item.descricao}
                      </div>
                      <div className='feed-time'>{timeAgo(item.criado_em)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {/* Emergencia - Precisa de Atencao */}
        {loading ? (
          <div className='home-panel home-panel-emergencia'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-emergencia anim-fadeInUp'>
            <div className='panel-header'>
              <h3 style={{ display: 'flex', alignItems: 'center' }}>
                <AlertTriangle size={14} style={{ marginRight: 6, color: '#f43f5e' }} />
                Precisa de Atenção
              </h3>
              <span className='panel-badge' style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                {precisaAtencao.length}
              </span>
            </div>
            <div className='emergencia-section'>
              {criticos.length > 0 && (
                <div>
                  <div className='emergencia-group-title'>
                    <span className='dot' style={{ background: '#f43f5e' }} />Críticos em aberto
                  </div>
                  {criticos.slice(0, 3).map((c) => (
                    <Link key={c.id} to={'/chamados/' + c.id} className='emergencia-item'>
                      <span className='e-id'>#{c.id}</span>
                      <span className='e-title'>{c.titulo}</span>
                      <span className='e-time'>{timeAgo(c.criado_em)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {parados.length > 0 && (
                <div>
                  <div className='emergencia-group-title'>
                    <span className='dot' style={{ background: '#f59e0b' }} />Pendentes há +1 dia
                  </div>
                  {parados.slice(0, 3).map((c) => (
                    <Link key={c.id} to={'/chamados/' + c.id} className='emergencia-item'>
                      <span className='e-id'>#{c.id}</span>
                      <span className='e-title'>{c.titulo}</span>
                      <span className='e-time'>{timeAgo(c.atualizado_em)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {precisaAtencao.length === 0 && (
                <div className='recentes-empty'>✅ Nada pendente — tudo sob controle!</div>
              )}
            </div>
          </div>
        )}


        {/* TMR Card */}
        {!loading && (
          <Link to='/relatorios' className='tmr-card anim-fadeInUp'>
            <div className='tmr-icon'><Clock size={24} /></div>
            <div className='tmr-info'>
              <span className='tmr-value'>{tmr}</span>
              <span className='tmr-label'>Tempo Médio de Resolução</span>
            </div>
          </Link>
        )}

        {/* Priority Bar Chart */}
        {loading ? (
          <div className='home-panel'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel anim-fadeInUp'>
            <div className='panel-header'><h3>Chamados por Prioridade</h3></div>
            {stats?.porPrioridade && (
              <div className='bar-list'>
                {stats.porPrioridade.map((p) => {
                  const total = stats.porPrioridade.reduce((a, b) => a + b.count, 0) || 1;
                  const pct = ((p.count / total) * 100).toFixed(0);
                  const colors = { baixa: '#10b981', media: '#6366f1', alta: '#f59e0b', critica: '#f43f5e' };
                  const barColor = colors[p.prioridade] || '#6366f1';
                  const showPct = parseInt(pct) >= 15;
                  return (
                    <div key={p.prioridade} className='bar-item'>
                      <div className='bar-label'>
                        <span className='bar-name'>
                          <span className='bar-dot' style={{ background: barColor }} />
                          {p.prioridade}
                        </span>
                        <span className='bar-count'>{p.count} ({pct}%)</span>
                      </div>
                      <div className='bar-track'>
                        <div
                          className={'bar-fill' + (showPct ? ' has-pct' : '')}
                          style={{ width: pct + '%', background: 'linear-gradient(90deg, ' + barColor + ', ' + barColor + 'cc)' }}
                          data-pct={pct + '%'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Heatmap Calendar */}
        {!loading && (
          <div className='home-panel home-panel-heatmap anim-fadeInUp'>
            <div className='panel-header'>
              <h3 style={{ display: 'flex', alignItems: 'center' }}>
                Atividade (12 semanas)
              </h3>
            </div>
            <HeatmapCalendar data={stats?.porDia || []} />
          </div>
        )}
      </div>
    </div>
  );
}
