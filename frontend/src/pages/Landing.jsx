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

const STEPS = [
  {
    n: '01',
    title: 'Acesse o sistema',
    desc: 'Login seguro para técnicos e equipe, com papéis definidos.',
  },
  {
    n: '02',
    title: 'Organize a rotina',
    desc: 'Abra chamados, monte o kanban e registre o ponto.',
  },
  {
    n: '03',
    title: 'Acompanhe tudo',
    desc: 'Relatórios, badges e atendimento em um único lugar.',
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

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) return undefined;
    const t = setInterval(
      () => setActiveStep((s) => (s + 1) % STEPS.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

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
              href="#como-funciona"
              onClick={(e) => scrollToSection(e, 'como-funciona')}
            >
              Como funciona
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
          id="como-funciona"
          className="landing-section landing-section-alt landing-reveal"
        >
          <div className="landing-section-head">
            <span className="landing-section-tag">Como funciona</span>
            <h2>Simples de começar</h2>
            <p>Três passos para tirar o máximo do sistema.</p>
          </div>

          <div className="landing-steps-carousel">
            <div className="landing-steps-particles">
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
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`landing-step-slide ${i === activeStep ? 'active' : ''}`}
              >
                <span className="landing-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="landing-steps-dots" role="tablist" aria-label="Passos">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                type="button"
                className={`landing-step-dot ${i === activeStep ? 'active' : ''}`}
                onClick={() => setActiveStep(i)}
                aria-label={`Passo ${s.n}: ${s.title}`}
                aria-selected={i === activeStep}
              />
            ))}
          </div>
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