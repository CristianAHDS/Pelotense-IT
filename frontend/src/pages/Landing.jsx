import { Link } from 'react-router-dom';
import {
  LifeBuoy,
  ClipboardList,
  Columns3,
  Clock,
  BarChart3,
  MessageCircle,
  Trophy,
  Users,
  ArrowRight,
  ShieldCheck,
  FileText,
  Menu,
  X,
  TicketCheck,
  Layers,
  Timer,
  PieChart,
  Bot,
  Medal,
  Zap,
  Search,
  Bell,
  CheckCircle2,
  Circle,
  Headphones,
  Flame,
  LayoutDashboard,
  AlertTriangle,
  Activity,
  Plus,
  ThermometerSun,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import './Landing.css';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Gestão de Chamados',
    desc: 'Abra, acompanhe e resolva chamados com status, prioridade, categorias, anexos e histórico completo.',
    color: 'indigo',
  },
  {
    icon: Columns3,
    title: 'Quadro Kanban',
    desc: 'Organize tarefas e chamados em colunas visuais, arrastando entre etapas para um fluxo ágil.',
    color: 'sky',
  },
  {
    icon: Clock,
    title: 'Ponto Eletrônico',
    desc: 'Registre entrada, almoço, pausas e saída com cálculo automático das horas por dia e por mês.',
    color: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    desc: 'Compare períodos, acompanhe horas por técnico e decida com dados claros e exportáveis.',
    color: 'amber',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Integrado',
    desc: 'Chatbot e atendimento humano direto no WhatsApp, com números autorizados e monitoramento.',
    color: 'green',
  },
  {
    icon: Trophy,
    title: 'Gamificação',
    desc: 'Badges e conquistas que valorizam o desempenho, tornando o dia a dia mais motivador.',
    color: 'rose',
  },
];

const STATS = [
  {
    icon: TicketCheck,
    value: 'Chamados',
    desc: 'Centralizados e acompanhados até a resolução',
  },
  {
    icon: Layers,
    value: 'Módulos',
    desc: 'Chamados, kanban, ponto, relatórios e WhatsApp',
  },
  {
    icon: Timer,
    value: 'Tempo real',
    desc: 'Atualizações instantâneas em todas as telas',
  },
  {
    icon: Bot,
    value: 'Multi-canal',
    desc: 'Sistema, portal do cliente e WhatsApp',
  },
];

const KANBAN = [
  {
    title: 'Abertos',
    color: 'indigo',
    cards: [
      {
        title: 'Impressora sem toner',
        desc: 'Setor financeiro · Alta',
        prio: 'rose',
        avatar: 'CF',
        avatarColor: 'indigo',
        tag: 'Suporte',
        tagColor: 'indigo',
      },
      {
        title: 'Novo e-mail corporativo',
        desc: 'Comercial · Média',
        prio: 'amber',
        avatar: 'CM',
        avatarColor: 'sky',
        tag: 'Conta',
        tagColor: 'sky',
      },
    ],
  },
  {
    title: 'Em andamento',
    color: 'amber',
    cards: [
      {
        title: 'Configurar acesso VPN',
        desc: 'TI interna · Alta',
        prio: 'rose',
        avatar: 'DV',
        avatarColor: 'amber',
        tag: 'Rede',
        tagColor: 'emerald',
      },
      {
        title: 'Atualização do sistema',
        desc: 'Servidores · Baixa',
        prio: 'emerald',
        avatar: 'RA',
        avatarColor: 'green',
        tag: 'Backup',
        tagColor: 'amber',
      },
    ],
  },
  {
    title: 'Concluídos',
    color: 'emerald',
    cards: [
      {
        title: 'Troca de headset',
        desc: 'Atendimento · Média',
        prio: 'sky',
        avatar: 'LS',
        avatarColor: 'rose',
        tag: 'Hardware',
        tagColor: 'rose',
      },
      {
        title: 'Acesso ao drive da equipe',
        desc: 'Audiovisual · Baixa',
        prio: 'emerald',
        avatar: 'MV',
        avatarColor: 'emerald',
        tag: 'Permissão',
        tagColor: 'green',
      },
    ],
  },
];

const SIDE_NAV = [
  { icon: TicketCheck, label: 'Chamados' },
  { icon: Columns3, label: 'Kanban' },
  { icon: Clock, label: 'Ponto' },
  { icon: BarChart3, label: 'Relatórios' },
  { icon: MessageCircle, label: 'WhatsApp' },
];

const DASH_STATS = [
  { label: 'Total de chamados', value: '128', icon: TicketCheck, color: 'indigo' },
  { label: 'Em aberto', value: '12', icon: AlertTriangle, color: 'amber' },
  { label: 'Em andamento', value: '7', icon: Timer, color: 'sky' },
  { label: 'Resolvidos', value: '38', icon: CheckCircle2, color: 'emerald' },
];

const DASH_RECENTES = [
  { id: '#248', title: 'Impressora sem toner', badge: 'aberto' },
  { id: '#247', title: 'Novo e-mail corporativo', badge: 'andamento' },
  { id: '#246', title: 'Acesso ao drive da equipe', badge: 'resolvido' },
  { id: '#245', title: 'Configurar acesso VPN', badge: 'critico' },
];

const DASH_FEED = [
  { icon: '✅', text: '#244 resolvido', time: 'agora' },
  { icon: '📝', text: '#248 criado', time: 'há 2min' },
  { icon: '🔄', text: '#245 em andamento', time: 'há 8min' },
  { icon: '✏️', text: '#247 editado', time: 'há 15min' },
];

const TESTIMONIALS = [
  {
    nome: 'Diego Viana',
    cargo: 'Suporte · TI',
    avatar: 'DV',
    avatarColor: 'amber',
    texto:
      'Antes os chamados se perdiam no WhatsApp. Agora tudo tem status, prioridade e histórico — não preciso mais caçar informação.',
  },
  {
    nome: 'Mariana Vaz',
    cargo: 'Audiovisual',
    avatar: 'MV',
    avatarColor: 'emerald',
    texto:
      'O quadro kanban deixou o fluxo das tarefas visível: sei exatamente o que está em aberto, em andamento e pronto.',
  },
  {
    nome: 'Renata Almeida',
    cargo: 'Comercial',
    avatar: 'RA',
    avatarColor: 'green',
    texto:
      'O ponto eletrônico calcula as horas sozinho e os relatórios mostram o desempenho da equipe em segundos.',
  },
  {
    nome: 'Camila Moreira',
    cargo: 'Comercial',
    avatar: 'CM',
    avatarColor: 'sky',
    texto:
      'Abro um chamado pelo WhatsApp e acompanho a resolução na hora. Simples e rápido, sem precisar abrir o sistema.',
  },
  {
    nome: 'Lucas Souza',
    cargo: 'Atendimento',
    avatar: 'LS',
    avatarColor: 'rose',
    texto:
      'A gamificação trouxe um clima leve: a galera compete por badges e o desempenho da equipe subiu.',
  },
];

function LandingMockup() {
  return (
    <div className="landing-mockup-wrap">
      <div className="landing-mockup">
        <div className="landing-mockup-bar">
          <span className="landing-mockup-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="landing-mockup-url">
            <ShieldCheck size={12} /> app.pelotense.com
          </span>
          <span className="landing-mockup-bell">
            <Bell size={14} />
          </span>
        </div>

        <div className="landing-mockup-body">
          <aside className="landing-mockup-side">
            <span className="landing-mockup-logo">
              <Zap size={15} />
            </span>
            {SIDE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className={`landing-mockup-nav${item.label === 'Chamados' ? ' active' : ''}`}
                >
                  <Icon size={15} />
                </span>
              );
            })}
            <span className="landing-mockup-nav landing-mockup-nav-user">
              <Users size={15} />
            </span>
          </aside>

          <div className="landing-mockup-main">
            <div className="landing-mockup-head">
              <div>
                <strong>Chamados</strong>
                <span>Painel de tarefas em tempo real</span>
              </div>
              <span className="landing-mockup-search">
                <Search size={12} /> Buscar chamado
              </span>
            </div>

            <div className="landing-mockup-board">
              {KANBAN.map((col) => (
                <div key={col.title} className="landing-mockup-col">
                  <div className="landing-mockup-col-head">
                    <span className={`landing-dot landing-dot-${col.color}`} />
                    <strong>{col.title}</strong>
                    <em>{col.cards.length}</em>
                  </div>
                  {col.cards.map((card) => (
                    <div key={card.title} className="landing-mockup-card">
                      <div className="landing-mockup-card-top">
                        <strong>{card.title}</strong>
                        <span className={`landing-prio landing-prio-${card.prio}`} />
                      </div>
                      <p>{card.desc}</p>
                      <div className="landing-mockup-card-foot">
                        <span className={`landing-avatar landing-avatar-${card.avatarColor}`}>
                          {card.avatar}
                        </span>
                        <span className={`landing-tag landing-tag-${card.tagColor}`}>
                          {card.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="landing-mockup-foot">
              <div className="landing-mockup-mini">
                <Circle size={13} className="c-open" />
                <div>
                  <strong>12 abertos</strong>
                  <span>Para hoje</span>
                </div>
              </div>
              <div className="landing-mockup-mini">
                <Clock size={13} className="c-time" />
                <div>
                  <strong>07:52:14</strong>
                  <span>Ponto de hoje</span>
                </div>
              </div>
              <div className="landing-mockup-mini">
                <CheckCircle2 size={13} className="c-done" />
                <div>
                  <strong>38 resolvidos</strong>
                  <span>Neste mês</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-float landing-float-wa">
        <span className="landing-float-icon wa">
          <MessageCircle size={16} />
        </span>
        <div>
          <strong>WhatsApp online</strong>
          <span>
            <i className="online" /> atendimento humano
          </span>
        </div>
      </div>

      <div className="landing-float landing-float-ponto">
        <span className="landing-float-icon ponto">
          <Headphones size={16} />
        </span>
        <div>
          <strong>Suporte ativo</strong>
          <span>resposta em minutos</span>
        </div>
      </div>

      <div className="landing-float landing-float-badge">
        <span className="landing-float-icon badge">
          <Flame size={16} />
        </span>
        <div>
          <strong>+50 XP</strong>
          <span>conquista desbloqueada</span>
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="landing-mockup-wrap landing-dash-wrap">
      <div className="landing-mockup">
        <div className="landing-mockup-bar">
          <span className="landing-mockup-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="landing-mockup-url">
            <ShieldCheck size={12} /> app.pelotense.com/dashboard
          </span>
          <span className="landing-mockup-bell">
            <Bell size={14} />
          </span>
        </div>

        <div className="landing-mockup-body">
          <aside className="landing-mockup-side">
            <span className="landing-mockup-logo">
              <Zap size={15} />
            </span>
            <span className="landing-mockup-nav active" title="Início">
              <LayoutDashboard size={15} />
            </span>
            {SIDE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label} className="landing-mockup-nav" title={item.label}>
                  <Icon size={15} />
                </span>
              );
            })}
            <span className="landing-mockup-nav landing-mockup-nav-user">
              <Users size={15} />
            </span>
          </aside>

          <div className="landing-mockup-main landing-dash-main">
            <div className="landing-dash-welcome">
              <div>
                <strong>Boa tarde, Cristian</strong>
                <span>terça-feira, 18 de agosto · resumo do dia</span>
              </div>
              <div className="landing-dash-welcome-right">
                <span className="landing-dash-pill">
                  <ThermometerSun size={12} /> 18°C
                </span>
                <svg
                  className="landing-dash-spark"
                  width="72"
                  height="20"
                  viewBox="0 0 72 20"
                  aria-hidden="true"
                >
                  <polyline
                    points="0,14 10,11 20,13 30,7 40,9 50,5 60,6 72,2"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="landing-dash-actions">
              <span className="landing-dash-action">
                <Plus size={13} /> Novo chamado
              </span>
              <span className="landing-dash-action">
                <Columns3 size={13} /> Quadro Kanban
              </span>
              <span className="landing-dash-action">
                <ClipboardList size={13} /> Ver chamados
              </span>
            </div>

            <div className="landing-dash-stats">
              {DASH_STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="landing-dash-stat">
                    <span className={`landing-dash-stat-icon dash-${s.color}`}>
                      <Icon size={15} />
                    </span>
                    <div>
                      <strong>{s.value}</strong>
                      <span>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="landing-dash-panels">
              <div className="landing-dash-panel">
                <strong className="landing-dash-panel-title">
                  Chamados por status
                </strong>
                <div
                  className="landing-dash-donut"
                  style={{
                    background:
                      'conic-gradient(#f59e0b 0 25%, #38bdf8 25% 48%, #a78bfa 48% 58%, #10b981 58% 88%, #64748b 88% 100%)',
                  }}
                >
                  <div className="landing-dash-donut-center">
                    <strong>128</strong>
                    <span>total</span>
                  </div>
                </div>
                <div className="landing-dash-legend">
                  <span className="landing-dash-legend-item">
                    <i className="landing-dash-dot ldd-amber" /> Aberto <b>12</b>
                  </span>
                  <span className="landing-dash-legend-item">
                    <i className="landing-dash-dot ldd-sky" /> Em andamento <b>7</b>
                  </span>
                  <span className="landing-dash-legend-item">
                    <i className="landing-dash-dot ldd-violet" /> Pendente <b>4</b>
                  </span>
                  <span className="landing-dash-legend-item">
                    <i className="landing-dash-dot ldd-emerald" /> Resolvido <b>38</b>
                  </span>
                  <span className="landing-dash-legend-item">
                    <i className="landing-dash-dot ldd-slate" /> Fechado <b>67</b>
                  </span>
                </div>
              </div>

              <div className="landing-dash-panel">
                <strong className="landing-dash-panel-title">
                  Chamados recentes
                </strong>
                <div className="landing-dash-recentes">
                  {DASH_RECENTES.map((c) => (
                    <div key={c.id} className="landing-dash-recente">
                      <em>{c.id}</em>
                      <b>{c.title}</b>
                      <span className={`landing-dash-badge ldb-${c.badge}`}>
                        {c.badge === 'aberto'
                          ? 'Aberto'
                          : c.badge === 'andamento'
                          ? 'Em andamento'
                          : c.badge === 'critico'
                          ? 'Crítico'
                          : 'Resolvido'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="landing-dash-panel">
                <strong className="landing-dash-panel-title">
                  Atividade recente
                </strong>
                <div className="landing-dash-feed">
                  {DASH_FEED.map((f, i) => (
                    <div key={i} className="landing-dash-feed-item">
                      <span className="landing-dash-feed-icon">{f.icon}</span>
                      <b>{f.text}</b>
                      <em>{f.time}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-float landing-float-dash1">
        <span className="landing-float-icon f-green">
          <CheckCircle2 size={16} />
        </span>
        <div>
          <strong>Chamado resolvido</strong>
          <span>#244 · agora</span>
        </div>
      </div>

      <div className="landing-float landing-float-dash2">
        <span className="landing-float-icon f-red">
          <AlertTriangle size={16} />
        </span>
        <div>
          <strong>2 críticos</strong>
          <span>precisam de atenção</span>
        </div>
      </div>

      <div className="landing-float landing-float-dash3">
        <span className="landing-float-icon f-sky">
          <Activity size={16} />
        </span>
        <div>
          <strong>38 resolvidos</strong>
          <span>neste mês</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  useEffect(() => {
    const els = document.querySelectorAll('.landing-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <img
              src="/pelotense_it_icone_app_sem_fundo.png"
              alt="Pelotense IT"
              className="landing-brand-logo"
            />
            <span className="landing-brand-name">
              Pelotense <strong>IT</strong>
            </span>
          </div>

          <nav className={`landing-menu ${menuOpen ? 'open' : ''}`}>
            <a
              href="#recursos"
              onClick={(e) => scrollToSection(e, 'recursos')}
            >
              Recursos
            </a>
            <a
              href="#dashboard"
              onClick={(e) => scrollToSection(e, 'dashboard')}
            >
              Dashboard
            </a>
            <a
              href="#depoimentos"
              onClick={(e) => scrollToSection(e, 'depoimentos')}
            >
              Depoimentos
            </a>
            <a href="#sobre" onClick={(e) => scrollToSection(e, 'sobre')}>
              Sobre
            </a>
            <Link to="/login" className="landing-menu-cta">
              Acessar sistema
            </Link>
          </nav>

          <button
            className="landing-burger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-glow" />
          <div className="landing-hero-inner">
            <div className="landing-hero-text">
              <span className="landing-badge">
                <Zap size={14} /> Plataforma interna de TI
              </span>
              <h1>
                Gestão de chamados,
                <br />
                <span className="landing-gradient">
                  equipe e produtividade
                </span>{' '}
                em um só lugar.
              </h1>
              <p className="landing-hero-sub">
                O Pelotense IT centraliza chamados de TI, tarefas, ponto
                eletrônico, relatórios e atendimento via WhatsApp — tudo em
                tempo real, com uma experiência moderna e gamificada.
              </p>
              <div className="landing-hero-actions">
                <Link to="/login" className="landing-btn landing-btn-primary">
                  Acessar o sistema <ArrowRight size={16} />
                </Link>
                <a
                  href="#recursos"
                  onClick={(e) => scrollToSection(e, 'recursos')}
                  className="landing-btn landing-btn-ghost"
                >
                  Conhecer recursos
                </a>
              </div>
            </div>

            <LandingMockup />

            <div className="landing-hero-stats">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.value} className="landing-hero-stat">
                    <span className="landing-hero-stat-icon">
                      <Icon size={16} />
                    </span>
                    <strong>{s.value}</strong>
                    <span>{s.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="landing-section landing-reveal"
        >
          <div className="landing-section-head">
            <span className="landing-section-tag">Recursos</span>
            <h2>Tudo que a sua equipe precisa</h2>
            <p>
              Ferramentas pensadas para o dia a dia de TI, do primeiro chamado
              ao relatório de horas.
            </p>
          </div>

          <div className="landing-features">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`landing-feature landing-feature-${f.color}`}
                >
                  <div className="landing-feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="dashboard"
          className="landing-section landing-section-alt landing-reveal"
        >
          <div className="landing-section-head">
            <span className="landing-section-tag">Dashboard</span>
            <h2>O painel principal do sistema</h2>
            <p>
              Visão geral em tempo real: chamados, estatísticas, prioridades e
              atividade recente — tudo em um só lugar.
            </p>
          </div>

          <DashboardMockup />
        </section>

        <section
          id="sobre"
          className="landing-section landing-reveal"
        >
          <div className="landing-about">
            <div className="landing-about-text">
              <span className="landing-section-tag">Sobre</span>
              <h2>Feito para a Pelotense</h2>
              <p>
                O Pelotense IT nasceu para organizar o atendimento de TI da
                empresa: controle de chamados, prioridades, equipe, horas
                trabalhadas e comunicação — unificados em uma plataforma única,
                acessível no desktop, no celular e até pelo WhatsApp.
              </p>
              <div className="landing-about-list">
                <div>
                  <ShieldCheck size={16} /> Acesso seguro por login
                </div>
                <div>
                  <Users size={16} /> Papéis para TI e audiovisual
                </div>
                <div>
                  <FileText size={16} /> Histórico e anexos por chamado
                </div>
              </div>
            </div>

            <div className="landing-about-card">
              <div className="landing-about-card-head">
                <LifeBuoy size={20} />
                <span>Suporte em um clique</span>
              </div>
              <p>
                Seja no sistema, no portal do cliente ou no WhatsApp, cada
                chamado é acompanhado até a resolução — com notificações e
                relatórios para nunca perder o controle.
              </p>
              <div className="landing-about-card-metrics">
                <div className="landing-about-metric">
                  <Medal size={18} />
                  <div>
                    <strong>Gamificado</strong>
                    <span>Badges por desempenho</span>
                  </div>
                </div>
                <div className="landing-about-metric">
                  <PieChart size={18} />
                  <div>
                    <strong>Visão completa</strong>
                    <span>Horas e produção</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="depoimentos"
          className="landing-section landing-section-alt landing-reveal"
        >
          <div className="landing-section-head">
            <span className="landing-section-tag">Prova social</span>
            <h2>Quem usa, recomenda</h2>
            <p>
              Veja como a equipe do dia a dia ganhou tempo e organização com o
              Pelotense IT.
            </p>
          </div>

          <div className="landing-testimonials">
            {TESTIMONIALS.map((t) => (
              <figure key={t.nome} className="landing-testimonial">
                <div className="landing-testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" />
                  ))}
                </div>
                <blockquote>“{t.texto}”</blockquote>
                <figcaption>
                  <span className={`landing-avatar landing-avatar-${t.avatarColor}`}>
                    {t.avatar}
                  </span>
                  <div>
                    <strong>{t.nome}</strong>
                    <span>{t.cargo}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="landing-cta landing-reveal">
          <div className="landing-cta-card">
            <div className="landing-cta-particles">
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="landing-particle"
                  style={{
                    left: 4 + i * 13 + '%',
                    animationDelay: i * 0.55 + 's',
                    animationDuration: 4 + (i % 4) + 's',
                  }}
                />
              ))}
            </div>
            <h2>Pronto para organizar o seu TI?</h2>
            <p>Entre no sistema e comece a usar agora.</p>
            <Link
              to="/login"
              className="landing-btn landing-btn-primary landing-btn-lg"
            >
              Acessar o sistema <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <img
              src="/pelotense_it_icone_app_sem_fundo.png"
              alt="Pelotense IT"
              className="landing-brand-logo"
            />
            <span className="landing-brand-name">
              Pelotense <strong>IT</strong>
            </span>
          </div>
          <span className="landing-footer-copy">
            © 2026 Pelotense IT · Criado por Cristian Raffi Cunha
          </span>
        </div>
      </footer>
    </div>
  );
}