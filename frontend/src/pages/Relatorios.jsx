import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import './Relatorios.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';
import { useTermos } from '../termos';
import usePageTitle from '../hooks/usePageTitle';

const API = API_URL;

const fmtHoras = (min) => {
  if (min == null || min <= 0) return '0h';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? h + 'h' : h + 'h' + String(m).padStart(2, '0');
};

const statusLabels = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  pendente: 'Pendente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const dayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fullDayNames = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

function LineChart({
  data = [],
  width = 600,
  height = 200,
  color = '#6366f1',
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count));
  const padX = 40;
  const padY = 20;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const stepX = w / (data.length - 1);
  const points = data
    .map((d, i) => {
      const x = padX + i * stepX;
      const y = padY + h - (max > 0 ? (d.count / max) * h : 0);
      return x.toFixed(1) + ',' + y.toFixed(1);
    })
    .join(' ');
  const areaPoints =
    padX +
    ', ' +
    (padY + h) +
    ' ' +
    points +
    ' ' +
    (padX + w).toFixed(1) +
    ',' +
    (padY + h);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={'0 0 ' + width + ' ' + height}
      preserveAspectRatio="xMidYMid meet"
      className="line-chart"
    >
      <polygon points={areaPoints} fill={color + '12'} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data
        .filter(
          (d, i) =>
            i % Math.max(1, Math.floor(data.length / 6)) === 0 ||
            i === data.length - 1,
        )
        .map((d, i) => {
          const idx = data.indexOf(d);
          return (
            <text
              key={i}
              x={padX + idx * stepX}
              y={padY + h + 16}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {d.label}
            </text>
          );
        })}
    </svg>
  );
}

function SimpleDonut({ data = [], size = 140, strokeWidth = 16 }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const total = data.reduce((a, b) => a + b.count, 0) || 1;
  const colors = {
    hardware: '#f59e0b',
    software: '#6366f1',
    rede: '#38bdf8',
    impressora: '#a78bfa',
    email: '#f43f5e',
    acesso: '#10b981',
    geral: '#64748b',
    evento: '#f97316',
    censura: '#ec4899',
    gravacao: '#8b5cf6',
    edicao: '#06b6d4',
    postagem: '#84cc16',
    transmissao: '#8b5cf6',
    operacao: '#f97316',
    sonorizacao: '#06b6d4',
  };
  let acc = 0;
  return (
    <div className="simple-donut-wrap">
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        {data.map((seg, i) => {
          const pct = seg.count / total;
          const dash = circ * pct;
          const offset =
            -circ *
              (data.slice(0, i).reduce((a, b) => a + b.count, 0) / total) +
            circ * 0.25;
          acc += pct;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors[seg.name] || '#6366f1'}
              strokeWidth={strokeWidth}
              strokeDasharray={dash + ' ' + (circ - dash)}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="simple-donut-center">
        <span className="donut-num">{total}</span>
        <span className="donut-sub">total</span>
      </div>
    </div>
  );
}

export default function Relatorios() {
const termos = useTermos();
usePageTitle('Relatórios');
const [stats, setStats] = useState(null);
  const [chamados, setChamados] = useState([]);
  const [prevStats, setPrevStats] = useState(null);
  const [horasTecnicos, setHorasTecnicos] = useState([]);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const yearStart = new Date().getFullYear() + '-01-01';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = (ini, fimParam) => {
    const params = new URLSearchParams();
    const i = ini !== undefined ? ini : inicio;
    const f = fimParam !== undefined ? fimParam : fim;
    if (i) params.set('inicio', i);
    if (f) params.set('fim', f);
    apiFetch(API + '/chamados/stats?' + params)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    apiFetch(
      API +
        '/chamados?limit=999' +
        (params.toString() ? '&' + params.toString() : ''),
    )
      .then((r) => r.json())
      .then((d) => setChamados(d.chamados || []))
      .catch(() => {});

    const hp = new URLSearchParams();
    if (i) hp.set('inicio', i);
    if (f) hp.set('fim', f);
    apiFetch(API + '/ponto/relatorio?' + hp)
      .then((r) => r.json())
      .then((d) => setHorasTecnicos(d.tecnicos || []))
      .catch(() => {});
  };

  const loadComparison = (prevInicio, prevFim) => {
    const p = new URLSearchParams();
    if (prevInicio) p.set('inicio', prevInicio);
    if (prevFim) p.set('fim', prevFim);
    apiFetch(API + '/chamados/stats?' + p)
      .then((r) => r.json())
      .then(setPrevStats)
      .catch(() => {});
  };

  const applyPreset = (preset) => {
    const hoje = new Date().toISOString().slice(0, 10);
    let ni = '',
      nf = '';
    switch (preset) {
      case 'hoje':
        ni = hoje;
        nf = hoje;
        break;
      case 'semana':
        ni = weekAgo;
        nf = hoje;
        break;
      case 'mes':
        ni = monthAgo;
        nf = hoje;
        break;
      case 'ano':
        ni = yearStart;
        nf = hoje;
        break;
      default:
        ni = '';
        nf = '';
    }
    setInicio(ni);
    setFim(nf);
    loadStats(ni, nf);
    if (ni && nf) {
      const d1 = new Date(ni);
      const d2 = new Date(nf);
      const diff = d2 - d1;
      const prevInicio = new Date(d1.getTime() - diff)
        .toISOString()
        .slice(0, 10);
      const prevFim = new Date(d2.getTime() - diff - 86400000)
        .toISOString()
        .slice(0, 10);
      loadComparison(prevInicio, prevFim);
    }
  };

  const totalChamados = stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0;
  const resolvedCount =
    stats?.porStatus?.find((s) => s.status === 'resolvido')?.count || 0;
  const taxaResolucao =
    totalChamados > 0 ? ((resolvedCount / totalChamados) * 100).toFixed(1) : 0;
  const prevTotal = prevStats?.totalPeriodo || 0;
  const trendPct =
    prevTotal > 0
      ? Math.round(((totalChamados - prevTotal) / prevTotal) * 100)
      : 0;

  const lineData = (stats?.porDia || [])
    .slice(-30)
    .map((d) => ({ label: d.dia.slice(5), count: d.count }));

  const catData = (stats?.porCategoria || []).map((c) => ({
    name: c.categoria,
    count: c.count,
  }));

  const diaSemanaData = (() => {
    const map = [0, 0, 0, 0, 0, 0, 0];
    const total = Math.max(...map, 1);
    chamados.forEach((c) => {
      const d = new Date(c.criado_em);
      if (!isNaN(d.getTime())) map[d.getDay()]++;
    });
    return dayNames.map((n, i) => ({
      label: n,
      count: map[i],
      full: fullDayNames[i],
    }));
  })();
  const maxDiaSemana = Math.max(...diaSemanaData.map((d) => d.count), 1);

  const turnosData = (() => {
    let manha = 0,
      tarde = 0,
      noite = 0;
    chamados.forEach((c) => {
      const h = new Date(c.criado_em).getHours();
      if (isNaN(h)) return;
      if (h >= 6 && h < 12) manha++;
      else if (h >= 12 && h < 18) tarde++;
      else noite++;
    });
    return [
      { label: 'Manhã (6-12h)', count: manha, color: '#f59e0b' },
      { label: 'Tarde (12-18h)', count: tarde, color: '#38bdf8' },
      { label: 'Noite (18-6h)', count: noite, color: '#a78bfa' },
    ];
  })();
  const maxTurno = Math.max(...turnosData.map((d) => d.count), 1);

  const topSolicitantes = (() => {
    const map = {};
    chamados.forEach((c) => {
      const s = c.solicitante || 'Desconhecido';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  })();

  const slaPorPrioridade = (() => {
    const map = { baixa: [], media: [], alta: [], critica: [] };
    chamados.forEach((c) => {
      if (c.resolvido_em && c.criado_em) {
        const h = (new Date(c.resolvido_em) - new Date(c.criado_em)) / 3600000;
        if (h >= 0 && map[c.prioridade]) map[c.prioridade].push(h);
      }
    });
    const colors = {
      baixa: '#10b981',
      media: '#6366f1',
      alta: '#f59e0b',
      critica: '#f43f5e',
    };
    return Object.entries(map).map(([k, v]) => ({
      name: k,
      color: colors[k],
      avg:
        v.length > 0
          ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)
          : '-',
      count: v.length,
    }));
  })();

  const tecnicosComSLA = (stats?.tecnicos || []).map((t) => ({
    ...t,
    sla: t.sla != null ? t.sla : '-',
  }));

  const maxHoras = Math.max(...horasTecnicos.map((x) => x.total_minutos), 1);

  const exportCSV = async () => {
    if (!stats) return;
    const now = new Date().toLocaleDateString('pt-BR');
    let csv = '\uFEFF';
    csv += 'RELATORIO DE ' + termos.Chamados.toUpperCase() + ' - PELOTENSE IT\n';
    csv += 'Gerado em: ' + now + '\n';
    if (inicio || fim)
      csv += 'Periodo: ' + (inicio || '...') + ' ate ' + (fim || '...') + '\n';
    csv +=
      '\nID,Titulo,Descricao,Status,Prioridade,Categoria,Solicitante,Tecnico,Criado em,Atualizado em,Resolvido em\n';
    chamados.forEach((c) => {
      const desc = (c.descricao || '').replace(/"/g, '""').replace(/\n/g, ' ');
      csv +=
        c.id +
        ',"' +
        c.titulo +
        '","' +
        desc +
        '",' +
        (statusLabels[c.status] || c.status) +
        ',' +
        c.prioridade +
        ',' +
        c.categoria +
        ',' +
        c.solicitante +
        ',' +
        (c.tecnico || '') +
        ',' +
        c.criado_em +
        ',' +
        c.atualizado_em +
        ',' +
        (c.resolvido_em || '') +
        '\n';
    });
    csv +=
      '\n========================================\nRESUMO GERAL\n========================================\n';
    csv += 'Total de ' + termos.chamados + ',' + totalChamados + '\n';
    csv += 'Taxa de resolucao,' + taxaResolucao + '%\n';
    csv += 'Tempo medio de resolucao,' + (stats.slaMedio || 0) + 'h\n';
    csv +=
      'Tendencia vs periodo anterior,' +
      (trendPct > 0 ? '+' : '') +
      trendPct +
      '%\n';
    csv += '\n';
    csv += 'Por Status:\n';
    stats.porStatus?.forEach(
      (s) =>
        (csv +=
          '  ' +
          (statusLabels[s.status] || s.status) +
          ',' +
          s.count +
          ',' +
          ((s.count / (totalChamados || 1)) * 100).toFixed(1) +
          '%\n'),
    );
    csv += '\nPor Prioridade:\n';
    stats.porPrioridade?.forEach(
      (p) =>
        (csv +=
          '  ' +
          p.prioridade +
          ',' +
          p.count +
          ',' +
          ((p.count / (totalChamados || 1)) * 100).toFixed(1) +
          '%\n'),
    );
    csv += '\nPor Categoria:\n';
    stats.porCategoria?.forEach(
      (c) => (csv += '  ' + c.categoria + ',' + c.count + '\n'),
    );
    csv += '\nSLA por Prioridade:\n';
    slaPorPrioridade.forEach(
      (p) =>
        (csv += '  ' + p.name + ',' + p.avg + 'h,' + p.count + ' resolvidos\n'),
    );
    csv += '\nTop 5 Solicitantes:\n';
    topSolicitantes.forEach(
      (s, i) =>
        (csv +=
          '  ' + (i + 1) + 'o - ' + s.name + ',' + s.count + ' ' + termos.chamados + '\n'),
    );
    csv += '\nDistribuicao por dia da semana:\n';
    diaSemanaData.forEach((d) => (csv += '  ' + d.full + ',' + d.count + '\n'));
    csv += '\nDistribuicao por turno:\n';
    turnosData.forEach((t) => (csv += '  ' + t.label + ',' + t.count + '\n'));
    csv += '\n--- Fim do relatorio ---\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'relatorio-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  };

  const exportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    let y = 20;
    const now = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(18);
    doc.text('RELATORIO DE ' + termos.Chamados.toUpperCase(), 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.text('Pelotense IT - Gerado em ' + now, 20, y);
    y += 6;
    if (inicio || fim) {
      doc.text(
        'Periodo: ' + (inicio || 'inicio') + ' ate ' + (fim || 'hoje'),
        20,
        y,
      );
      y += 6;
    }
    y += 6;
    doc.setFontSize(13);
    doc.text('Lista de ' + termos.Chamados, 20, y);
    y += 8;
    const drawHeader = () => {
      doc.setFontSize(8);
      doc.text('#', 20, y);
      doc.text('Titulo', 28, y);
      doc.text('Status', 100, y);
      doc.text('Prior.', 130, y);
      doc.text('Solicitante', 148, y);
      y += 4;
      doc.line(20, y, 190, y);
      y += 5;
    };
    drawHeader();
    chamados.slice(0, 200).forEach((c) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        drawHeader();
      }
      doc.setFontSize(7.5);
      doc.text(String(c.id), 20, y);
      doc.text((c.titulo || '').slice(0, 35), 28, y);
      doc.text((statusLabels[c.status] || c.status).slice(0, 10), 100, y);
      doc.text(c.prioridade, 130, y);
      doc.text((c.solicitante || '').slice(0, 18), 148, y);
      y += 4.5;
    });
    y += 8;
    doc.setFontSize(11);
    doc.text(
      'Total: ' +
        totalChamados +
        ' | Taxa resolucao: ' +
        taxaResolucao +
        '% | SLA: ' +
        (stats.slaMedio || 0) +
        'h | Tendencia: ' +
        (trendPct > 0 ? '+' : '') +
        trendPct +
        '%',
      20,
      y,
    );
    y += 7;

    doc.setFontSize(10);
    doc.text(
      'Status: ' +
        ['aberto', 'em_andamento', 'pendente', 'resolvido', 'fechado']
          .map((st) => {
            const s = stats?.porStatus?.find((x) => x.status === st);
            return (statusLabels[st] || st) + ' ' + (s?.count || 0);
          })
          .join(' | '),
      20,
      y,
    );
    y += 7;

    if (slaPorPrioridade.length > 0) {
      doc.text(
        'SLA por prioridade: ' +
          slaPorPrioridade.map((p) => p.name + ' ' + p.avg + 'h').join(' | '),
        20,
        y,
      );
      y += 6;
    }
    if (topSolicitantes.length > 0) {
      doc.text(
        'Top solicitantes: ' +
          topSolicitantes
            .slice(0, 3)
            .map((s) => s.name + ' (' + s.count + ')')
            .join(', '),
        20,
        y,
      );
      y += 6;
    }

    y += 6;
    doc.text('--- Fim do relatorio ---', 20, y);
    doc.save('relatorio-' + new Date().toISOString().slice(0, 10) + '.pdf');
  };

  return (
    <div className="relatorios-page">
      <div className="page-header">
        <div className="header-particles">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="header-particle"
              style={{
                left: 5 + i * 20 + '%',
                animationDelay: i * 0.6 + 's',
                animationDuration: 3 + i * 0.4 + 's',
              }}
            />
          ))}
        </div>
        <div>
          <h2>Relatórios</h2>
          <span className="page-subtitle">
            Estatísticas e análises detalhadas
          </span>
        </div>
        <div className="report-actions">
          <button
            className="btn btn-primary"
            onClick={exportCSV}
            disabled={!stats}
          >
            <Download size={16} /> CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={exportPDF}
            disabled={!stats}
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label>De</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Até</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            loadStats();
            if (inicio && fim) {
              const d1 = new Date(inicio);
              const d2 = new Date(fim);
              const diff = d2 - d1;
              const prevInicio = new Date(d1.getTime() - diff)
                .toISOString()
                .slice(0, 10);
              const prevFim = new Date(d2.getTime() - diff - 86400000)
                .toISOString()
                .slice(0, 10);
              loadComparison(prevInicio, prevFim);
            }
          }}
        >
          Filtrar
        </button>
        <div className="filter-presets">
          <button
            className={'preset-btn' + (!inicio && !fim ? ' active' : '')}
            onClick={() => applyPreset('todos')}
          >
            Todos
          </button>
          <button
            className={
              'preset-btn' +
              (inicio === today && fim === today ? ' active' : '')
            }
            onClick={() => applyPreset('hoje')}
          >
            Hoje
          </button>
          <button
            className={
              'preset-btn' +
              (inicio === weekAgo && fim === today ? ' active' : '')
            }
            onClick={() => applyPreset('semana')}
          >
            7 dias
          </button>
          <button
            className={
              'preset-btn' +
              (inicio === monthAgo && fim === today ? ' active' : '')
            }
            onClick={() => applyPreset('mes')}
          >
            30 dias
          </button>
          <button
            className={
              'preset-btn' +
              (inicio === yearStart && fim === today ? ' active' : '')
            }
            onClick={() => applyPreset('ano')}
          >
            Ano
          </button>
        </div>
      </div>

      <div className="report-metrics">
        <div className="metric-card" style={{ '--mc': '#6366f1' }}>
          <div className="metric-icon">
            <TrendingUp size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{totalChamados}</span>
            <span className="metric-label">Total no período</span>
            {trendPct !== 0 && (
              <span
                className={'metric-trend ' + (trendPct > 0 ? 'up' : 'down')}
              >
                {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
              </span>
            )}
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#10b981' }}>
          <div className="metric-icon">
            <TrendingUp size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{taxaResolucao}%</span>
            <span className="metric-label">Taxa de resolução</span>
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#f59e0b' }}>
          <div className="metric-icon">
            <Clock size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{stats?.slaMedio || 0}h</span>
            <span className="metric-label">Tempo médio (SLA)</span>
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#38bdf8' }}>
          <div className="metric-icon">
            <Users size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{stats?.tecnicos?.length || 0}</span>
            <span className="metric-label">Técnicos ativos</span>
          </div>
        </div>
      </div>

      <div className="report-summary">
        {['aberto', 'em_andamento', 'pendente', 'resolvido', 'fechado'].map(
          (st) => {
            const s = stats?.porStatus?.find((x) => x.status === st);
            const l = statusLabels[st];
            const colors = {
              aberto: '#f59e0b',
              em_andamento: '#38bdf8',
              pendente: '#a78bfa',
              resolvido: '#10b981',
              fechado: '#64748b',
            };
            return (
              <div key={st} className="summary-chip">
                <span
                  className="summary-dot"
                  style={{ background: colors[st] }}
                />
                <span className="summary-label">{l}</span>
                <span className="summary-val">{s?.count || 0}</span>
              </div>
            );
          },
        )}
      </div>

      <div className="report-grid">
        <div className="report-card report-card-wide">
          <h3>Evolução Diária</h3>
          <LineChart data={lineData} height={220} color="#6366f1" />
        </div>

        <div className="report-card">
          <h3>Categorias</h3>
          <SimpleDonut data={catData} size={150} strokeWidth={14} />
          <div className="donut-mini-legend">
            {catData.slice(0, 6).map((c) => (
              <div key={c.name} className="mini-legend-item">
                <span
                  className="mini-legend-dot"
                  style={{
                    background:
                      {
                        hardware: '#f59e0b',
                        software: '#6366f1',
                        rede: '#38bdf8',
                        impressora: '#a78bfa',
                        email: '#f43f5e',
                        acesso: '#10b981',
                        geral: '#64748b',
                        evento: '#f97316',
                        censura: '#ec4899',
                        gravacao: '#8b5cf6',
                        edicao: '#06b6d4',
                        postagem: '#84cc16',
                        transmissao: '#8b5cf6',
                        operacao: '#f97316',
                        sonorizacao: '#06b6d4',
                      }[c.name] || '#6366f1',
                  }}
                />
                {c.name} <b>{c.count}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h3>Dia da Semana</h3>
          <div className="h-bar-list">
            {diaSemanaData.map((d) => (
              <div key={d.label} className="h-bar-item">
                <span className="h-bar-label">{d.label}</span>
                <div className="h-bar-track">
                  <div
                    className="h-bar-fill"
                    style={{
                      width: ((d.count / maxDiaSemana) * 100).toFixed(0) + '%',
                      background:
                        d.count ===
                        Math.max(...diaSemanaData.map((x) => x.count))
                          ? '#6366f1'
                          : 'rgba(99,102,241,0.4)',
                    }}
                  />
                </div>
                <span className="h-bar-val">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h3>Por Turno</h3>
          <div className="h-bar-list">
            {turnosData.map((t) => (
              <div key={t.label} className="h-bar-item">
                <span className="h-bar-label" style={{ width: 90 }}>
                  {t.label}
                </span>
                <div className="h-bar-track">
                  <div
                    className="h-bar-fill turno-bar"
                    style={{ width: ((t.count / maxTurno) * 100).toFixed(0) + '%', background: t.color }}
                  />
                </div>
                <span className="h-bar-val">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h3>{termos.Chamados} por Status</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Status</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {stats?.porStatus?.map((s) => {
                const pct = ((s.count / (totalChamados || 1)) * 100).toFixed(1);
                const colors = {
                  aberto: '#f59e0b',
                  em_andamento: '#38bdf8',
                  pendente: '#a78bfa',
                  resolvido: '#10b981',
                  fechado: '#64748b',
                };
                return (
                  <tr key={s.status}>
                    <td>
                      <span
                        className="dot"
                        style={{ background: colors[s.status] }}
                      />{' '}
                      {statusLabels[s.status] || s.status}
                    </td>
                    <td className="text-right">{s.count}</td>
                    <td className="text-right">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="report-card">
          <h3>Por Prioridade</h3>
          <div className="h-bar-list">
            {stats?.porPrioridade?.map((p) => {
              const barW = ((p.count / (totalChamados || 1)) * 100).toFixed(0);
              const colors = {
                baixa: '#10b981',
                media: '#6366f1',
                alta: '#f59e0b',
                critica: '#f43f5e',
              };
              return (
                <div key={p.prioridade} className="h-bar-item">
                  <span className="h-bar-label">{p.prioridade}</span>
                  <div className="h-bar-track">
                    <div
                      className="h-bar-fill"
                      style={{
                        width: barW + '%',
                        background: colors[p.prioridade] || '#6366f1',
                      }}
                    />
                  </div>
                  <span className="h-bar-val">{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="report-card">
          <h3>SLA por Prioridade</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Prioridade</th>
                <th className="text-right">SLA médio</th>
                <th className="text-right">Resolvidos</th>
              </tr>
            </thead>
            <tbody>
              {slaPorPrioridade.map((p) => (
                <tr key={p.name}>
                  <td>
                    <span className="dot" style={{ background: p.color }} />{' '}
                    {p.name}
                  </td>
                  <td className="text-right">
                    {p.avg === '-' ? '-' : p.avg + 'h'}
                  </td>
                  <td className="text-right">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stats?.tecnicos?.length > 0 && (
          <div className="report-card report-card-wide">
            <h3>Desempenho por Técnico</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Resolvidos</th>
                  <th className="text-right">%</th>
                  <th className="text-right">SLA médio</th>
                </tr>
              </thead>
              <tbody>
                {tecnicosComSLA.map((t) => (
                  <tr key={t.tecnico}>
                    <td>{t.tecnico || 'N/A'}</td>
                    <td className="text-right">{t.total}</td>
                    <td className="text-right">{t.resolvidos}</td>
                    <td className="text-right">
                      {t.total > 0
                        ? ((t.resolvidos / t.total) * 100).toFixed(0)
                        : 0}
                      %
                    </td>
                    <td className="text-right">
                      {t.sla === '-' ? '-' : t.sla + 'h'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {horasTecnicos.length > 0 && (
          <div className="report-card report-card-wide">
            <h3>Horas por Técnico (Ponto)</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th className="text-right">Dias</th>
                  <th className="text-right">Média/dia</th>
                  <th className="text-right">Total</th>
                  <th style={{ width: '30%' }}></th>
                </tr>
              </thead>
              <tbody>
                {horasTecnicos.map((t) => {
                  const pct = ((t.total_minutos / maxHoras) * 100).toFixed(0);
                  const media = Math.round(t.total_minutos / (t.dias || 1));
                  return (
                    <tr key={t.usuario}>
                      <td>{t.usuario}</td>
                      <td className="text-right">{t.dias}</td>
                      <td className="text-right">{fmtHoras(media)}</td>
                      <td className="text-right"><b>{fmtHoras(t.total_minutos)}</b></td>
                      <td>
                        <div className="h-bar-track" style={{ height: 10 }}>
                          <div
                            className="h-bar-fill"
                            style={{ width: pct + '%', background: '#6366f1' }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {topSolicitantes.length > 0 && (
          <div className="report-card">
            <h3>Top 5 Solicitantes</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Solicitante</th>
                  <th className="text-right">{termos.Chamados}</th>
                </tr>
              </thead>
              <tbody>
                {topSolicitantes.map((s, i) => (
                  <tr key={s.name}>
                    <td className="text-muted">{i + 1}º</td>
                    <td>{s.name}</td>
                    <td className="text-right">
                      <b>{s.count}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
