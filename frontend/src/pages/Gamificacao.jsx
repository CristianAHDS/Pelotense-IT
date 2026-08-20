import { useState, useEffect } from 'react';
import {
  Trophy, Award, Star, Zap, Target, TrendingUp, Clock, Shield,
  Check, Lock, Flame, Crown, Medal, CheckCircle2, Layers, BarChart3,
  Monitor, AppWindow, Globe, Printer, Mail, KeyRound, ClipboardList,
  CalendarDays, Clapperboard, Mic, Scissors, Send, RadioTower, SlidersHorizontal, Volume2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Gamificacao.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';
import { useTermos } from '../termos';

const API = API_URL;

const CAT_ICONS = {
  hardware: Monitor, software: AppWindow, rede: Globe, impressora: Printer,
  email: Mail, acesso: KeyRound, geral: ClipboardList, evento: CalendarDays,
  censura: Clapperboard, gravacao: Mic, edicao: Scissors, postagem: Send,
  transmissao: RadioTower, operacao: SlidersHorizontal, sonorizacao: Volume2,
};

const CAT_LABELS = {
  hardware: 'Hardware', software: 'Software', rede: 'Rede', impressora: 'Impressora',
  email: 'E-mail', acesso: 'Acesso', geral: 'Geral', evento: 'Evento', censura: 'Censura',
  gravacao: 'Gravação', edicao: 'Edição', postagem: 'Postagem',
  transmissao: 'Transmissão', operacao: 'Operação', sonorizacao: 'Sonorização',
};

const CAT_COLORS = {
  hardware: '#6366f1', software: '#38bdf8', rede: '#10b981', impressora: '#f59e0b',
  email: '#6366f1', acesso: '#f43f5e', geral: '#94a3b8', evento: '#38bdf8',
  censura: '#f43f5e', gravacao: '#f59e0b', edicao: '#10b981', postagem: '#38bdf8',
  transmissao: '#8b5cf6', operacao: '#f97316', sonorizacao: '#06b6d4',
};

const CATEGORIAS_POR_TIPO = {
  TI: ['hardware', 'software', 'rede', 'impressora', 'email', 'acesso', 'geral', 'evento', 'censura'],
  audiovisual: ['gravacao', 'edicao', 'postagem'],
  radio: ['transmissao', 'operacao', 'sonorizacao', 'gravacao'],
};

const BADGE_CATEGORIES = [
  { key: 'categoria', label: 'Categoria', icon: Target, color: '#6366f1' },
  { key: 'volume', label: 'Volume', icon: BarChart3, color: '#10b981' },
  { key: 'velocidade', label: 'Velocidade', icon: Zap, color: '#f59e0b' },
  { key: 'prioridade', label: 'Prioridade', icon: Shield, color: '#f43f5e' },
  { key: 'especial', label: 'Especial', icon: Star, color: '#8b5cf6' },
];

const PERIOD_OPTIONS = [
  { key: 'total', label: 'Geral' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
];

export default function Gamificacao() {
  const { user } = useAuth();
  const termos = useTermos();
  const USUARIO = user?.nome || 'Cristian Raffi Cunha';
  const [dados, setDados] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState(null);
  const [periodo, setPeriodo] = useState('total');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`${API}/gamificacao/usuario/${encodeURIComponent(USUARIO)}`).then(r => r.json()),
      apiFetch(`${API}/gamificacao/ranking`).then(r => r.json()),
    ])
      .then(([userData, rankData]) => {
        setDados(userData);
        setRanking(rankData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [USUARIO]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (!dados) return <div className="loading">Erro ao carregar dados.</div>;

  const allBadges = dados.allBadges || [];
  const filteredBadges = filtroCat
    ? allBadges.filter(b => b.categoria === filtroCat)
    : allBadges;

  const conquistados = allBadges.filter(b => b.conquistado).length;
  const total = allBadges.length;

  const resolvidosDisplay = periodo === 'semana' ? (dados.resolvidosSemana ?? 0)
    : periodo === 'mes' ? (dados.resolvidosMes ?? 0)
    : dados.totalResolvidos;
  const resolvidosLabel = periodo === 'semana' ? 'Últimos 7 dias'
    : periodo === 'mes' ? 'Este mês'
    : 'Resolvidos no total';

  const meRankIndex = ranking.findIndex(t => t.tecnico === USUARIO);

  const catsVisiveis = CATEGORIAS_POR_TIPO[user?.tipo] || CATEGORIAS_POR_TIPO.TI;

  const stats = [
    { icon: CheckCircle2, value: resolvidosDisplay, label: resolvidosLabel, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { icon: TrendingUp, value: dados.resolvedHoje, label: 'Resolvidos hoje', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { icon: Clock, value: `${dados.slaMedio}h`, label: 'SLA médio', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { icon: Flame, value: `${dados.streak}d`, label: 'Sequência de dias', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ];

  function ProgressRing({ value = 0, size = 84, stroke = 8, children }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
    return (
      <div className="ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="ring-svg">
          <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="ring-center">{children}</div>
      </div>
    );
  }

  return (
    <div className="gamificacao-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-particles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="header-particle" style={{
              left: (5 + i * 20) + '%',
              animationDelay: (i * 0.6) + 's',
              animationDuration: (3 + i * 0.4) + 's',
            }} />
          ))}
        </div>
        <div className="page-header-ring">
          <ProgressRing value={dados.progressoNivel}>
            <span className="ring-level">{dados.nivel}</span>
          </ProgressRing>
          <span className="ring-caption">{dados.progressoNivel}%</span>
        </div>
        <div>
          <h2>Gamificação</h2>
          <span className="page-subtitle">Acompanhe seu nível, badges e ranking</span>
        </div>
        <div className="hero-badges-row gamificacao-header-right">
          <span className="hero-badge"><Award size={14} /> {conquistados}/{total} badges</span>
          <span className="hero-badge"><CheckCircle2 size={14} /> {dados.totalResolvidos} resolvidos</span>
          {meRankIndex >= 0 && (
            <span className="hero-badge hero-badge-rank"><Trophy size={14} /> #{meRankIndex + 1} no ranking</span>
          )}
        </div>
      </div>

      <div className="gamificacao-grid">
        <div className="gamificacao-main">
          {/* Stats */}
          <div className="stats-cards">
            {stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                  <s.icon size={20} />
                </div>
                <div className="stat-body">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Level progress */}
          <div className="section-card">
            <div className="section-header">
              <h2><Zap size={18} /> Progresso de nível</h2>
              <span className="progress-pct">{dados.progressoNivel}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${dados.progressoNivel}%` }} />
            </div>
            {dados.pontosProximoNivel > 0 ? (
              <p className="progress-hint">Faltam <strong>{dados.pontosProximoNivel}</strong> {termos.chamados} resolvidos para alcançar <strong>{dados.proximoNivel}</strong>.</p>
            ) : (
              <p className="progress-hint">Você atingiu o nível máximo. <strong>Excelente trabalho!</strong></p>
            )}
          </div>

          {/* Badges por categoria */}
          <div className="section-card">
            <div className="section-header">
              <h2><Layers size={18} /> Desempenho por categoria</h2>
            </div>
            <div className="cat-progress-list">
              {Object.entries(CAT_LABELS).filter(([cat]) => catsVisiveis.includes(cat)).map(([cat, label]) => {
                const totalCat = (dados.porCategoria && dados.porCategoria[cat]) || 0;
                const badgesCat = allBadges.filter(b => b.categoria === 'categoria' && b.criterio && JSON.parse(b.criterio).categoria === cat);
                const earned = badgesCat.filter(b => b.conquistado).length;
                const maxBar = badgesCat.length > 0 ? Math.max(...badgesCat.map(b => JSON.parse(b.criterio).min)) : 5;
                const pct = Math.min(100, Math.round((totalCat / (maxBar * 1.3)) * 100));
                const color = CAT_COLORS[cat] || '#6366f1';
                const CatIcon = CAT_ICONS[cat] || ClipboardList;
                return (
                  <div key={cat} className="cat-progress-item">
                    <div className="cat-progress-icon" style={{ color }}>
                      <CatIcon size={18} />
                    </div>
                    <div className="cat-progress-info">
                      <div className="cat-progress-top">
                        <span className="cat-progress-name">{label}</span>
                        <span className="cat-progress-count">
                          {totalCat} resolvidos · {earned}/{badgesCat.length} badges
                        </span>
                      </div>
                      <div className="cat-progress-bar-wrap">
                        <div className="cat-progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Todos os badges */}
          <div className="section-card">
            <div className="section-header">
              <h2><Award size={18} /> Galeria de badges</h2>
              <div className="filter-pills">
                <button className={`filter-pill ${filtroCat === null ? 'active' : ''}`} onClick={() => setFiltroCat(null)}>Todos</button>
                {BADGE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      className={`filter-pill ${filtroCat === cat.key ? 'active' : ''}`}
                      onClick={() => setFiltroCat(filtroCat === cat.key ? null : cat.key)}
                      style={filtroCat === cat.key ? { borderColor: cat.color, color: cat.color } : {}}
                    >
                      <Icon size={13} /> {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="badges-grid">
              {filteredBadges.map(badge => (
                <div key={badge.id} className={`badge-card ${badge.conquistado ? 'earned' : 'locked'}`}>
                  <div className="badge-card-top">
                    <div className="badge-card-icon">{badge.icone}</div>
                    {badge.conquistado
                      ? <span className="badge-card-check"><Check size={12} /></span>
                      : <span className="badge-card-lock"><Lock size={12} /></span>}
                  </div>
                  <div className="badge-card-info">
                    <span className="badge-card-name">{badge.nome}</span>
                    <span className="badge-card-desc">{termos.aplicar(badge.descricao)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gamificacao-sidebar">
          {dados.proximoBadge && (
            <div className="section-card next-badge-card">
              <div className="section-header">
                <h2><Target size={18} /> Próximo badge</h2>
              </div>
              <div className="next-badge-body">
                <div className="next-badge-icon">{dados.proximoBadge.icone}</div>
                <div className="next-badge-info">
                  <span className="next-badge-name">{dados.proximoBadge.nome}</span>
                  <span className="next-badge-desc">{termos.aplicar(dados.proximoBadge.descricao)}</span>
                  <span className="next-badge-faltam">Faltam {dados.proximoBadge.faltam} {termos.chamado}{dados.proximoBadge.faltam > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}

          <div className="section-card">
            <div className="section-header">
              <h2><Trophy size={18} /> Ranking</h2>
              {meRankIndex >= 0 && <span className="progress-pct">#{meRankIndex + 1}</span>}
            </div>
            <div className="ranking-list">
              {ranking.length === 0 && <p className="text-muted">Nenhum técnico encontrado.</p>}
              {ranking.map((t, i) => {
                const posCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                return (
                  <div key={t.tecnico} className={`ranking-item ${t.tecnico === USUARIO ? 'is-me' : ''}`}>
                    <div className={`ranking-pos ${posCls}`}>
                      {i === 0 ? <Crown size={16} /> : i === 1 ? <Medal size={16} /> : i === 2 ? <Medal size={16} /> : `#${i + 1}`}
                    </div>
                    <div className="ranking-avatar">{t.tecnico.charAt(0).toUpperCase()}</div>
                    <div className="ranking-info">
                      <span className="ranking-name">{t.tecnico}{t.tecnico === USUARIO && <em className="ranking-me-tag">Você</em>}</span>
                      <span className="ranking-meta">{t.totalResolvidos} resolvidos · SLA {t.slaMedio}h</span>
                    </div>
                    <div className="ranking-level">
                      <span className="ranking-medal"><Award size={16} /></span>
                      <span className="ranking-nivel">{t.nivel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Award size={18} /> Conquistas recentes</h2>
            </div>
            <div className="feed-list">
              {(dados.badges || []).length === 0 && <p className="text-muted">Nenhum badge conquistado ainda.</p>}
              {(dados.badges || []).slice(0, 6).map((b) => (
                <div key={b.id} className="feed-item">
                  <span className="feed-icon">{b.icone}</span>
                  <div className="feed-info">
                    <span className="feed-name">{b.nome}</span>
                    <span className="feed-date">{b.conquistado_em ? new Date(b.conquistado_em).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <CheckCircle2 size={14} className="feed-check" />
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Shield size={18} /> Resolvidos por prioridade</h2>
            </div>
            <div className="prio-stats">
              {[{ key: 'critica', label: 'Crítica', color: '#f43f5e' },
                { key: 'alta', label: 'Alta', color: '#f59e0b' },
                { key: 'media', label: 'Média', color: '#6366f1' },
                { key: 'baixa', label: 'Baixa', color: '#10b981' }].map(p => {
                const count = (dados.porPrioridade && dados.porPrioridade[p.key]) || 0;
                const max = Math.max(...Object.values(dados.porPrioridade || {}), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={p.key} className="prio-item">
                    <div className="prio-header">
                      <span className="prio-dot" style={{ background: p.color }} />
                      <span className="prio-label">{p.label}</span>
                      <span className="prio-count">{count}</span>
                    </div>
                    <div className="prio-bar-wrap">
                      <div className="prio-bar-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
