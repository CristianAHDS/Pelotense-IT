import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Ticket, Clock, CheckCircle, AlertTriangle, Plus, Columns, List, ArrowRight, Activity, ThermometerSun,
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
  FilePlus2, RefreshCw, Pencil, CheckCircle2, BellOff, ClipboardList, Bell, Lightbulb, CalendarDays,
  Cpu, Monitor, Network, Printer, Mail, KeyRound, PartyPopper, Video, Mic, Scissors, Send, RadioTower, SlidersHorizontal, Headphones, Globe,
  History, PieChart, BarChart3, Sunrise, Moon, Flag, Flame, ShieldCheck,
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useSplash } from '../contexts/SplashContext';
import { SkeletonCard, SkeletonPanel } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import usePageTitle from '../hooks/usePageTitle';
import './Dashboard.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';
import { useTermos, getTermos } from '../termos';

const API = API_URL;

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

const FEED_META = {
  criacao: { icon: FilePlus2, color: '#6366f1' },
  status: { icon: RefreshCw, color: '#38bdf8' },
  edicao: { icon: Pencil, color: '#f59e0b' },
  resolucao: { icon: CheckCircle2, color: '#10b981' },
};
const FEED_FALLBACK = { icon: Bell, color: '#64748b' };

const CATEGORIA_META = {
  hardware: { icon: Cpu, color: '#f59e0b' },
  software: { icon: Monitor, color: '#6366f1' },
  rede: { icon: Network, color: '#38bdf8' },
  impressora: { icon: Printer, color: '#a78bfa' },
  email: { icon: Mail, color: '#f43f5e' },
  acesso: { icon: KeyRound, color: '#10b981' },
  geral: { icon: ClipboardList, color: '#64748b' },
  evento: { icon: PartyPopper, color: '#f97316' },
  censura: { icon: Video, color: '#ec4899' },
  gravacao: { icon: Mic, color: '#8b5cf6' },
  edicao: { icon: Scissors, color: '#06b6d4' },
  postagem: { icon: Send, color: '#84cc16' },
  transmissao: { icon: RadioTower, color: '#8b5cf6' },
  operacao: { icon: SlidersHorizontal, color: '#f97316' },
  sonorizacao: { icon: Headphones, color: '#06b6d4' },
};
const CATEGORIA_FALLBACK = { icon: Globe, color: '#6366f1' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEATHER_MAP = {
  0: { Icon: Sun, label: 'Céu limpo' },
  1: { Icon: CloudSun, label: 'Parcialmente nublado' },
  2: { Icon: Cloud, label: 'Nublado' },
  3: { Icon: Cloud, label: 'Encoberto' },
  45: { Icon: CloudFog, label: 'Nevoeiro' },
  48: { Icon: CloudFog, label: 'Nevoeiro' },
  51: { Icon: CloudDrizzle, label: 'Garoa leve' },
  53: { Icon: CloudDrizzle, label: 'Garoa' },
  55: { Icon: CloudRain, label: 'Garoa forte' },
  61: { Icon: CloudRain, label: 'Chuva leve' },
  63: { Icon: CloudRain, label: 'Chuva' },
  65: { Icon: CloudRain, label: 'Chuva forte' },
  71: { Icon: CloudSnow, label: 'Neve leve' },
  73: { Icon: CloudSnow, label: 'Neve' },
  75: { Icon: CloudSnow, label: 'Neve forte' },
  80: { Icon: CloudRain, label: 'Pancadas' },
  81: { Icon: CloudRain, label: 'Pancadas fortes' },
  82: { Icon: CloudLightning, label: 'Pancadas violentas' },
  95: { Icon: CloudLightning, label: 'Trovoada' },
  96: { Icon: CloudLightning, label: 'Trovoada com granizo' },
  99: { Icon: CloudLightning, label: 'Trovoada severa' },
};

function getWeatherInfo(code) {
  return WEATHER_MAP[code] || { Icon: CloudSun, label: 'Indisponível' };
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

function toMs(s) {
  return new Date(String(s).replace(' ', 'T')).getTime();
}

function calcularDecorrido(reg, agoraMs) {
  if (!reg || !reg.inicio) return 0;
  const inicio = toMs(reg.inicio);
  const fim = reg.fim ? toMs(reg.fim) : agoraMs;
  let total = fim - inicio;
  if (reg.inicio_almoco) {
    const almIni = toMs(reg.inicio_almoco);
    const almFim = reg.fim_almoco ? toMs(reg.fim_almoco) : agoraMs;
    total -= almFim - almIni;
  }
  for (const p of reg.pausas || []) {
    total -= (p.fim ? toMs(p.fim) : agoraMs) - toMs(p.inicio);
  }
  return Math.max(0, total);
}

function fmtDuracao(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m + 'min';
}

const PONTO_STATUS_META = {
  trabalhando: { label: 'Trabalhando', cor: '#10b981' },
  pausado: { label: 'Em pausa', cor: '#f59e0b' },
  almoco: { label: 'Almoço', cor: '#f59e0b' },
  finalizado: { label: 'Expediente encerrado', cor: '#64748b' },
  nao_iniciado: { label: 'Expediente não iniciado', cor: '#64748b' },
};


function CountUp({ end, duration = 800 }) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  const prevEnd = useRef(end);

  useEffect(() => {
    if (prevEnd.current === end && val > 0) return;
    prevEnd.current = end;
    const startTime = performance.now();
    const startVal = val;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + (end - startVal) * eased));
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

function DonutChart({ segments = [], size = 160, strokeWidth = 14, centerLabel = 'total' }) {
  const [hover, setHover] = useState(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((a, b) => a + b.count, 0) || 1;
  const active = hover !== null ? segments[hover] : null;
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
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{
                animationDelay: (i * 0.15) + 's',
                cursor: 'pointer',
                opacity: hover === null || hover === i ? 1 : 0.25,
              }} />
          );
        })}
      </svg>
      <div className='donut-center'>
        {active ? (
          <>
            <span className='donut-total' style={{ color: active.color }}>{Math.round((active.count / total) * 100)}%</span>
            <span className='donut-label'>{active.label}</span>
          </>
        ) : (
          <>
            <span className='donut-total'>{total}</span>
            <span className='donut-label'>{centerLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}

function PanelTitle({ icon: Icon, color, children }) {
  return (
    <div className='panel-title'>
      <span className='panel-title-icon' style={{ background: color + '14', color }}>
        <Icon size={15} />
      </span>
      <h3>{children}</h3>
    </div>
  );
}

function HeatmapCalendar({ data = [] }) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
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
  const monthSpans = [];
  for (let w = 0; w < weeks; w++) {
    const colDate = new Date(today);
    colDate.setDate(colDate.getDate() - ((weeks - 1 - w) * 7 + 6));
    const m = colDate.getMonth();
    const last = monthSpans[monthSpans.length - 1];
    if (last && last.m === m) last.span++;
    else monthSpans.push({ m, span: 1 });
  }
  return (
    <div className='heatmap-wrap'>
      <div className='heatmap-grid'>
        <div className='heatmap-labels'>
          {dayLabels.map((l, i) => <span key={i} className='heatmap-label'>{l}</span>)}
        </div>
        <div className='heatmap-main'>
          <div className='heatmap-months' style={{ gridTemplateColumns: 'repeat(' + weeks + ', 1fr)' }}>
            {monthSpans.map((ms, i) => (
              <span key={i} className='heatmap-month-label' style={{ gridColumn: 'span ' + ms.span }}>
                {new Date(today.getFullYear(), ms.m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
              </span>
            ))}
          </div>
          <div className='heatmap-cells' style={{ gridTemplateColumns: 'repeat(' + weeks + ', 1fr)' }}>
            {cells.map((cell) => (
              <div key={cell.key}
                className={'heatmap-cell level-' + cell.level + (cell.key === todayKey ? ' today' : '')}
                data-tip={cell.key.split('-').reverse().join('/') + ' · ' + cell.count + ' ' + getTermos().chamados} />
            ))}
          </div>
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
  usePageTitle('Dashboard');
  const termos = useTermos();
  const [stats, setStats] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [emergencia, setEmergencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [slide, setSlide] = useState(0);
  const [turnosData, setTurnosData] = useState([]);
  const [ponto, setPonto] = useState(null);
  const [agoraMs, setAgoraMs] = useState(Date.now());
  const [rede, setRede] = useState(null);
  const [redeCarregando, setRedeCarregando] = useState(false);
  const greeting = getGreeting();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { hide: hideSplash } = useSplash();
  const isAdmin = user?.tipo === 'TI';

  const todayStr = new Date().toLocaleDateString('sv');
  const hojeCriados = stats?.porDia?.find((d) => d.dia === todayStr)?.count || 0;
  const hojeResolvidos = stats ? (() => {
    return (recentes || []).filter((c) => c.status === 'resolvido' && (c.resolvido_em || '').slice(0, 10) === todayStr).length;
  })() : 0;

  const weatherInfo = weather ? getWeatherInfo(weather.code) : null;

  const slides = [
    {
      icon: weather ? weatherInfo.Icon : CloudSun,
      iconStyle: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' },
      title: greeting + ', ' + (user?.nome || 'Cristian'),
      text: weather
        ? (weatherInfo.label + ', ' + weather.temp + '°C — Confira o resumo dos ' + termos.chamados)
        : 'Carregando previsão... — Confira o resumo dos ' + termos.chamados,
      loading: !weather,
    },
    {
      icon: CalendarDays,
      iconStyle: { background: '#38bdf814', color: '#38bdf8' },
      title: 'Resumo do Dia',
      text: hojeCriados + ' criados hoje · ' + hojeResolvidos + ' resolvidos · ' + (stats?.porStatus?.find((s) => s.status === 'aberto')?.count || 0) + ' em aberto',
    },
    {
      icon: Bell,
      iconStyle: { background: '#f59e0b14', color: '#f59e0b' },
      title: 'Lembrete',
      text: stats?.porStatus?.find((s) => s.status === 'pendente')?.count
        ? stats.porStatus.find((s) => s.status === 'pendente').count + ' ' + termos.chamados + ' pendentes aguardando ação'
        : 'Nenhum ' + termos.chamado + ' pendente no momento',
    },
    {
      icon: Lightbulb,
      iconStyle: { background: '#10b98114', color: '#10b981' },
      title: 'Dica',
      text: 'Use o Kanban para arrastar cards entre colunas e gerenciar o fluxo de trabalho de forma visual.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [weather, stats, greeting]);

  const loadData = () => {
    const hoje = new Date().toISOString().slice(0, 10);

    const safeFetch = (url) => apiFetch(url).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => null);

    Promise.all([
      safeFetch(API + '/chamados/stats'),
      safeFetch(API + '/chamados?limit=5'),
      safeFetch(API + '/chamados/feed?limit=12'),
      safeFetch(API + '/chamados/emergencia'),
      safeFetch(API + '/chamados?limit=200&inicio=' + hoje + '&fim=' + hoje),
    ])
      .then(([statsData, recentData, feedData, emergData, hojeData]) => {
        if (statsData) setStats(statsData);
        if (recentData) setRecentes(recentData.chamados || []);
        if (feedData) setFeed(Array.isArray(feedData) ? feedData : []);
        if (emergData) setEmergencia(emergData);
        if (hojeData) {
          const chamadosHoje = hojeData.chamados || [];
          let manha = 0, tarde = 0, noite = 0;
          chamadosHoje.forEach((c) => {
            const h = new Date(c.criado_em).getHours();
            if (isNaN(h)) return;
            if (h >= 6 && h < 12) manha++;
            else if (h >= 12 && h < 18) tarde++;
            else noite++;
          });
          setTurnosData([
            { label: 'Manhã (6-12h)', count: manha, color: '#f59e0b' },
            { label: 'Tarde (12-18h)', count: tarde, color: '#38bdf8' },
            { label: 'Noite (18-6h)', count: noite, color: '#a78bfa' },
          ]);
        }
        setLoading(false);
        hideSplash();
      })
      .catch((err) => { console.error('Erro ao carregar dados:', err); setLoading(false); hideSplash(); });
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

  useEffect(() => {
    const usuario = user?.nome;
    if (!usuario) return;
    const load = () => {
      apiFetch(`${API}/ponto/status?usuario=${encodeURIComponent(usuario)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setPonto(d); })
        .catch(() => {});
    };
    load();
    const sync = setInterval(load, 60000);
    const tick = setInterval(() => setAgoraMs(Date.now()), 30000);
    return () => { clearInterval(sync); clearInterval(tick); };
  }, [user?.nome]);

  const carregarRede = useCallback(() => {
    if (!isAdmin) return;
    setRedeCarregando(true);
    apiFetch(`${API}/rede/verificar`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const hosts = data.hosts || [];
        const online = hosts.filter((h) => h.online);
        const lats = online.map((h) => h.latencia).filter((l) => typeof l === 'number' && l > 0);
        setRede({
          total: hosts.length,
          online: online.length,
          pingMedio: lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null,
          em: new Date(),
        });
      })
      .catch(() => setRede(null))
      .finally(() => setRedeCarregando(false));
  }, [isAdmin]);

  useEffect(() => { carregarRede(); }, [carregarRede]);

  const totalChamados = stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0;
  const openCount = stats?.porStatus?.find((s) => s.status === 'aberto')?.count || 0;
  const progressCount = stats?.porStatus?.find((s) => s.status === 'em_andamento')?.count || 0;
  const resolvedCount = stats?.porStatus?.find((s) => s.status === 'resolvido')?.count || 0;

  const sparkData = (stats?.porDia || []).slice(-7).map((d) => d.count);

  const cards = [
    { label: 'Total de ' + termos.Chamados, value: totalChamados, icon: Ticket, color: '#6366f1', filter: '', trend: stats?.trend, spark: sparkData },
    { label: 'Em Aberto', value: openCount, icon: AlertTriangle, color: '#f59e0b', filter: 'aberto', pulse: openCount > 0 },
    { label: 'Em Andamento', value: progressCount, icon: Clock, color: '#38bdf8', filter: 'em_andamento' },
    { label: 'Resolvidos', value: resolvedCount, icon: CheckCircle, color: '#10b981', filter: 'resolvido', trend: stats?.resolvedTrend },
  ];

  const quickActions = [
    { label: termos.novoChamado, icon: Plus, to: '/chamados/novo', color: '#6366f1', description: 'Registrar solicitação', badge: hojeCriados > 0 ? hojeCriados : null },
    { label: 'Quadro Kanban', icon: Columns, to: '/kanban', color: '#f59e0b', description: 'Gerenciar fluxo' },
    { label: 'Ver ' + termos.Chamados, icon: List, to: '/chamados', color: '#10b981', description: 'Lista completa' },
  ];

  const donutSegments = (stats?.porStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => {
      const colors = { aberto: '#f59e0b', em_andamento: '#38bdf8', pendente: '#a78bfa', resolvido: '#10b981', fechado: '#64748b' };
      return { ...s, label: STATUS_MAP[s.status]?.label || s.status, color: colors[s.status] || '#6366f1' };
    });

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
              {s.icon && (
                <span className={'welcome-icon' + (s.loading ? ' skeleton-shimmer' : '')} style={s.iconStyle}>
                  <s.icon size={26} />
                </span>
              )}
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
          {cards.map(({ label, value, icon: Icon, color, filter, trend, pulse, spark }) => (
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
              {spark && <Sparkline data={spark} color={color} width={84} height={26} />}
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
          <div className='home-panel home-panel-recentes'><div className='panel-header'><PanelTitle icon={History} color='#6366f1'>{termos.Chamados} Recentes</PanelTitle></div><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-recentes anim-fadeInUp'>
            <div className='panel-header'>
              <PanelTitle icon={History} color='#6366f1'>{termos.Chamados} Recentes</PanelTitle>
              <Link to='/chamados' className='panel-link'>Ver todos <ArrowRight size={14} /></Link>
            </div>
            <div className='recentes-list'>
              {recentes.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList size={26} />}
                  title={`Nenhum ${termos.chamado} registrado ainda.`}
                  description='Os novos registros aparecerão aqui.'
                />
              ) : (
                recentes.map((c) => {
                  const CatMeta = CATEGORIA_META[c.categoria] || CATEGORIA_FALLBACK;
                  return (
                    <Link key={c.id} to={'/chamados/' + c.id} className='recent-item'>
                      <span className='recent-chip' style={{ background: CatMeta.color + '14', color: CatMeta.color }}>
                        <CatMeta.icon size={15} />
                      </span>
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
                  );
                })
              )}
            </div>
          </div>
        )}


        {/* Category Donut Chart */}
        {loading ? (
          <div className='home-panel home-panel-donut'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel home-panel-donut anim-fadeInUp'>
            <div className='panel-header'><PanelTitle icon={PieChart} color='#a78bfa'>{termos.Chamados} por Categoria</PanelTitle></div>
            <div className='donut-content'>
              {stats?.porCategoria && (() => {
                const data = stats.porCategoria;
                const segments = data.map((c) => ({
                  label: c.categoria,
                  count: c.count,
                  color: (CATEGORIA_META[c.categoria] || CATEGORIA_FALLBACK).color,
                }));
                return (
                  <>
                    <DonutChart segments={segments} size={170} strokeWidth={18} centerLabel={termos.chamados} />
                    <div className='donut-legend'>
                      {data.slice(0, 6).map((c) => {
                        const CatMeta = CATEGORIA_META[c.categoria] || CATEGORIA_FALLBACK;
                        return (
                          <div key={c.categoria} className='donut-legend-item'>
                            <span className='donut-legend-dot' style={{ background: CatMeta.color }} />
                            <span><CatMeta.icon size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{c.categoria}</span>
                            <span className='donut-legend-count'>{c.count}</span>
                          </div>
                        );
                      })}
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
              <PanelTitle icon={BarChart3} color='#38bdf8'>{termos.Chamados} por Status</PanelTitle>
              <span className='panel-badge'>{totalChamados} total</span>
            </div>
            <div className='donut-content'>
              <DonutChart segments={donutSegments} size={160} strokeWidth={14} />
              <div className='donut-legend'>
              {donutSegments.map((s) => (
                <div key={s.status} className='donut-legend-item'>
                  <span className='donut-legend-dot' style={{ background: s.color }} />
                  <span>{s.label}</span>
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
              <PanelTitle icon={Activity} color='#10b981'>Atividade Recente</PanelTitle>
            </div>
            <div className='feed-list'>
              {feed.length === 0 ? (
                <EmptyState
                  icon={<BellOff size={26} />}
                  title='Nenhuma atividade registrada.'
                  description='As ações nos chamados aparecerão aqui.'
                />
              ) : (
                feed.slice(0, 8).map((item) => {
                  const Meta = FEED_META[item.acao] || FEED_FALLBACK;
                  return (
                    <Link key={item.id} to={'/chamados/' + item.chamado_id} className='feed-item'>
                      <span className='feed-icon' style={{ background: Meta.color + '14', color: Meta.color }}>
                        <Meta.icon size={14} />
                      </span>
                      <div className='feed-body'>
                        <div className='feed-desc'>
                          <strong>#{item.chamado_id}</strong> {item.descricao}
                        </div>
                        <div className='feed-time'>{timeAgo(item.criado_em)}</div>
                      </div>
                    </Link>
                  );
                })
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
              <PanelTitle icon={AlertTriangle} color='#f43f5e'>Precisa de Atenção</PanelTitle>
              <span className='panel-badge panel-badge-red'>
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
                    <Link key={c.id} to={'/chamados/' + c.id} className='emergencia-item critico'>
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
                    <span className='dot' style={{ background: '#f59e0b' }} />Pendentes
                  </div>
                  {parados.slice(0, 3).map((c) => (
                    <Link key={c.id} to={'/chamados/' + c.id} className='emergencia-item pendente'>
                      <span className='e-id'>#{c.id}</span>
                      <span className='e-title'>{c.titulo}</span>
                      <span className='e-time'>{timeAgo(c.atualizado_em)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {precisaAtencao.length === 0 && (
                <EmptyState
                  icon={<ShieldCheck size={26} />}
                  title='Nada pendente — tudo sob controle!'
                  description='Nenhum chamado crítico ou parado no momento.'
                />
              )}
            </div>
          </div>
        )}


        {/* Por Turno */}
        {loading ? (
          <div className='home-panel'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel anim-fadeInUp'>
            <div className='panel-header'><PanelTitle icon={Clock} color='#f59e0b'>{termos.Chamados} por Turno (Hoje)</PanelTitle></div>
            <div className='bar-list'>
              {turnosData.map((t, idx) => {
                const TurnoIcon = [Sunrise, Sun, Moon][idx] || Clock;
                const maxTurno = Math.max(...turnosData.map((d) => d.count), 1);
                const totalTurno = turnosData.reduce((a, b) => a + b.count, 0) || 1;
                const pct = Math.round((t.count / totalTurno) * 100);
                const showPct = pct >= 15 && t.count > 0;
                return (
                  <div key={t.label} className='bar-item'>
                    <div className='bar-label'>
                      <span className='bar-name'>
                        <span className='bar-icon' style={{ background: t.color + '14', color: t.color }}>
                          <TurnoIcon size={13} />
                        </span>
                        {t.label}
                      </span>
                      <span className='bar-count'>{t.count}</span>
                    </div>
                    <div className='bar-track'>
                      <div
                        className={'bar-fill' + (showPct ? ' has-pct' : '')}
                        style={{ width: ((t.count / maxTurno) * 100).toFixed(0) + '%', background: t.color }}
                        data-pct={pct + '%'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority Bar Chart */}
        {loading ? (
          <div className='home-panel'><SkeletonPanel /></div>
        ) : (
          <div className='home-panel anim-fadeInUp'>
            <div className='panel-header'><PanelTitle icon={Flag} color='#f43f5e'>{termos.Chamados} por Prioridade</PanelTitle></div>
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
                          <span className='bar-icon' style={{ background: barColor + '14', color: barColor }}>
                            <Flag size={13} />
                          </span>
                          {PRIORIDADE_MAP[p.prioridade]?.label || p.prioridade}
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
              <PanelTitle icon={Flame} color='#f97316'>Atividade (12 semanas)</PanelTitle>
            </div>
            <HeatmapCalendar data={stats?.porDia || []} />
          </div>
        )}
      </div>

      <section className='home-widgets'>
        <div className='home-widget-card anim-fadeInUp'>
          <div className='widget-icon' style={{ background: '#6366f118', color: '#6366f1' }}>
            <Clock size={22} />
          </div>
          <div className='widget-info'>
            <span className='widget-label'>Meu Ponto Hoje</span>
            <span className='widget-value'>{ponto?.registro ? fmtDuracao(calcularDecorrido(ponto.registro, agoraMs)) : '--'}</span>
            {(() => {
              const meta = PONTO_STATUS_META[ponto?.status] || PONTO_STATUS_META.nao_iniciado;
              const reg = ponto?.registro;
              return (
                <span className='widget-sub'>
                  <span className='widget-dot' style={{ background: meta.cor }} />
                  {meta.label}
                  {reg?.inicio ? ' · entrada ' + reg.inicio.slice(11, 16) : ''}
                  {ponto?.status === 'finalizado' && reg?.fim ? ' · saída ' + reg.fim.slice(11, 16) : ''}
                </span>
              );
            })()}
          </div>
          <Link to='/ponto' className='panel-link'>Ver ponto <ArrowRight size={14} /></Link>
        </div>

        {isAdmin && (
          <div className='home-widget-card anim-fadeInUp'>
            <div className='widget-icon' style={{ background: '#38bdf814', color: '#38bdf8' }}>
              <Activity size={22} />
            </div>
            <div className='widget-info'>
              <span className='widget-label'>Saúde da Rede</span>
              <span className='widget-value'>
                {rede ? rede.online + '/' + rede.total : '--'} <small>online</small>
              </span>
              <span className='widget-sub'>
                {redeCarregando
                  ? 'Verificando hosts...'
                  : rede
                    ? 'ping médio ' + (rede.pingMedio != null ? rede.pingMedio + ' ms' : '--') + ' · atualizado ' + rede.em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : 'Sem dados de monitoramento'}
              </span>
            </div>
            <div className='widget-actions'>
              <button className='widget-refresh' onClick={carregarRede} disabled={redeCarregando} title='Atualizar verificação'>
                <RefreshCw size={14} className={redeCarregando ? 'spin' : ''} />
              </button>
              <Link to='/rede' className='panel-link'>Monitorar <ArrowRight size={14} /></Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
