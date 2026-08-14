import { useState, useEffect } from 'react';
import { Trophy, Award, Star, Zap, BarChart3, Target, TrendingUp, Clock, Shield, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Gamificacao.css';

import { API_URL } from '../config';

const API = API_URL;

const CAT_ICONS = {
  hardware: '💻', software: '🖥️', rede: '🌐', impressora: '🖨️',
  email: '📧', acesso: '🔑', geral: '📋', evento: '🎪', censura: '🎥',
  gravacao: '🎙️', edicao: '✂️', postagem: '📡',
};

const CAT_LABELS = {
  hardware: 'Hardware', software: 'Software', rede: 'Rede', impressora: 'Impressora',
  email: 'E-mail', acesso: 'Acesso', geral: 'Geral', evento: 'Evento', censura: 'Censura',
  gravacao: 'Gravação', edicao: 'Edição', postagem: 'Postagem',
};

const BADGE_CATEGORIES = [
  { key: 'categoria', label: 'Categoria', icon: <Target size={16} />, color: '#6366f1' },
  { key: 'volume', label: 'Volume', icon: <BarChart3 size={16} />, color: '#10b981' },
  { key: 'velocidade', label: 'Velocidade', icon: <Zap size={16} />, color: '#f59e0b' },
  { key: 'prioridade', label: 'Prioridade', icon: <Shield size={16} />, color: '#f43f5e' },
  { key: 'especial', label: 'Especial', icon: <Star size={16} />, color: '#8b5cf6' },
];

export default function Gamificacao() {
  const { user } = useAuth();
  const USUARIO = user?.nome || 'Cristian Raffi Cunha';
  const [dados, setDados] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState(null);
  const [periodo, setPeriodo] = useState('total');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/gamificacao/usuario/${encodeURIComponent(USUARIO)}`).then(r => r.json()),
      fetch(`${API}/gamificacao/ranking`).then(r => r.json()),
    ])
      .then(([userData, rankData]) => {
        setDados(userData);
        setRanking(rankData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    : 'Resolvidos';

  return (
    <div className="gamificacao-page">
      <div className="gamificacao-hero">
        <div className="hero-bg" />
        <div className="hero-particles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="hero-particle" style={{
              left: (5 + i * 20) + '%',
              animationDelay: (i * 0.6) + 's',
              animationDuration: (3 + i * 0.4) + 's',
            }} />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-medal">{dados.medal}</div>
          <div className="hero-info">
            <h1>{dados.usuario}</h1>
            <div className="hero-badges-row">
              <span className="hero-badge"><Trophy size={14} /> Nível {dados.nivel}</span>
              <span className="hero-badge"><Award size={14} /> {conquistados}/{total} Badges</span>
              <span className="hero-badge"><TrendingUp size={14} /> {dados.totalResolvidos} Resolvidos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="gamificacao-grid">
        <div className="gamificacao-main">
          <div className="period-filter">
            <button className={`filter-pill ${periodo === 'total' ? 'active' : ''}`} onClick={() => setPeriodo('total')}>Total</button>
            <button className={`filter-pill ${periodo === 'semana' ? 'active' : ''}`} onClick={() => setPeriodo('semana')}>Semana</button>
            <button className={`filter-pill ${periodo === 'mes' ? 'active' : ''}`} onClick={() => setPeriodo('mes')}>Mês</button>
          </div>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                <Target size={20} />
              </div>
              <div className="stat-value">{resolvidosDisplay}</div>
              <div className="stat-label">{resolvidosLabel}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <CheckCircleIcon />
              </div>
              <div className="stat-value">{dados.resolvedHoje}</div>
              <div className="stat-label">Hoje</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                <Clock size={20} />
              </div>
              <div className="stat-value">{dados.slaMedio}h</div>
              <div className="stat-label">SLA Médio</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <Zap size={20} />
              </div>
              <div className="stat-value">{dados.streak}d</div>
              <div className="stat-label">Sequência</div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Award size={18} /> Progresso para {dados.proximoNivel}</h2>
              <span className="progress-pct">{dados.progressoNivel}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${dados.progressoNivel}%` }} />
            </div>
            {dados.pontosProximoNivel > 0 && (
              <p className="progress-hint">Faltam <strong>{dados.pontosProximoNivel}</strong> chamados para o próximo nível</p>
            )}
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Star size={18} /> Badges por Categoria</h2>
            </div>
            <div className="cat-progress-list">
              {Object.entries(CAT_LABELS).map(([cat, label]) => {
                const totalCat = (dados.porCategoria && dados.porCategoria[cat]) || 0;
                const badgesCat = allBadges.filter(b => b.categoria === 'categoria' && b.criterio && JSON.parse(b.criterio).categoria === cat);
                const earned = badgesCat.filter(b => b.conquistado).length;
                const maxBar = badgesCat.length > 0 ? Math.max(...badgesCat.map(b => JSON.parse(b.criterio).min)) : 5;
                const pct = Math.min(100, Math.round((totalCat / (maxBar * 1.3)) * 100));
                return (
                  <div key={cat} className="cat-progress-item">
                    <div className="cat-progress-icon">{CAT_ICONS[cat] || '📋'}</div>
                    <div className="cat-progress-info">
                      <div className="cat-progress-top">
                        <span className="cat-progress-name">{label}</span>
                        <span className="cat-progress-count">{totalCat} resolvidos</span>
                      </div>
                      <div className="cat-progress-bar-wrap">
                        <div className="cat-progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="cat-progress-badges">
                        {badgesCat.map((b, i) => (
                          <span key={i} className={`cat-badge-mini ${b.conquistado ? 'earned' : ''}`} title={b.descricao}>
                            {b.icone}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Award size={18} /> Todos os Badges</h2>
              <div className="filter-pills">
                <button className={`filter-pill ${filtroCat === null ? 'active' : ''}`} onClick={() => setFiltroCat(null)}>Todos</button>
                {BADGE_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    className={`filter-pill ${filtroCat === cat.key ? 'active' : ''}`}
                    onClick={() => setFiltroCat(filtroCat === cat.key ? null : cat.key)}
                    style={filtroCat === cat.key ? { borderColor: cat.color, color: cat.color } : {}}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="badges-grid">
              {filteredBadges.map(badge => (
                <div key={badge.id} className={`badge-card ${badge.conquistado ? 'earned' : 'locked'}`}>
                  <div className="badge-card-icon">{badge.icone}</div>
                  <div className="badge-card-info">
                    <span className="badge-card-name">{badge.nome}</span>
                    <span className="badge-card-desc">{badge.descricao}</span>
                  </div>
                  {badge.conquistado ? (
                    <div className="badge-card-check">✓</div>
                  ) : (
                    <div className="badge-card-lock">🔒</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gamificacao-sidebar">
          {dados.proximoBadge && (
            <div className="section-card next-badge-card">
              <div className="section-header">
                <h2><Target size={18} /> Próximo Badge</h2>
              </div>
              <div className="next-badge-body">
                <div className="next-badge-icon">{dados.proximoBadge.icone}</div>
                <div className="next-badge-info">
                  <span className="next-badge-name">{dados.proximoBadge.nome}</span>
                  <span className="next-badge-desc">{dados.proximoBadge.descricao}</span>
                  <span className="next-badge-faltam">Faltam {dados.proximoBadge.faltam} chamado{dados.proximoBadge.faltam > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}
          <div className="section-card">
            <div className="section-header">
              <h2><Trophy size={18} /> Ranking</h2>
            </div>
            <div className="ranking-list">
              {ranking.length === 0 && <p className="text-muted">Nenhum técnico encontrado.</p>}
              {ranking.map((t, i) => (
                <div key={t.tecnico} className={`ranking-item ${t.tecnico === USUARIO ? 'is-me' : ''}`}>
                  <div className="ranking-pos">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="ranking-info">
                    <span className="ranking-name">{t.tecnico}</span>
                    <span className="ranking-meta">{t.badges} badges · {t.totalResolvidos} resolvidos · SLA {t.slaMedio}h</span>
                  </div>
                  <div className="ranking-level">
                    <span className="ranking-medal">{t.medal}</span>
                    <span className="ranking-nivel">{t.nivel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Award size={18} /> Conquistas Recentes</h2>
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
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><User size={18} /> Progresso por Prioridade</h2>
            </div>
            <div className="prio-stats">
              {[{ key: 'baixa', label: 'Baixa', color: '#10b981' },
                { key: 'media', label: 'Média', color: '#6366f1' },
                { key: 'alta', label: 'Alta', color: '#f59e0b' },
                { key: 'critica', label: 'Crítica', color: '#f43f5e' }].map(p => {
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

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
