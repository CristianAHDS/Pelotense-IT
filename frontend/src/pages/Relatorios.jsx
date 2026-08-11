import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import './Relatorios.css';

const API = '/api';

const statusLabels = {
  aberto: 'Aberto', em_andamento: 'Em Andamento', pendente: 'Pendente',
  resolvido: 'Resolvido', fechado: 'Fechado',
};

export default function Relatorios() {
  const [stats, setStats] = useState(null);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const params = new URLSearchParams();
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    fetch(`${API}/chamados/stats?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  };

  const totalChamados = stats?.porStatus?.reduce((a, b) => a + b.count, 0) || 0;
  const resolvidos = stats?.porStatus?.find((s) => s.status === 'resolvido')?.count || 0;
  const taxaResolucao = totalChamados > 0 ? ((resolvidos / totalChamados) * 100).toFixed(1) : 0;

  const exportCSV = async () => {
    if (!stats) return;
    const params = new URLSearchParams({ limit: '999' });
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    let chamados = [];
    try { const r = await fetch(`${API}/chamados?${params}`); const d = await r.json(); chamados = d.chamados || []; } catch (_) {}

    const now = new Date().toLocaleDateString('pt-BR');
    let csv = '\uFEFF';
    csv += `RELATÓRIO DE CHAMADOS - PELOTENSE IT\n`;
    csv += `Gerado em: ${now}\n`;
    if (inicio || fim) csv += `Período: ${inicio || '...'} até ${fim || '...'}\n`;
    csv += `\n`;

    csv += 'ID,Título,Descrição,Status,Prioridade,Categoria,Solicitante,Técnico,Criado em,Atualizado em,Resolvido em\n';
    chamados.forEach((c) => {
      const desc = (c.descricao || '').replace(/"/g, '""').replace(/\n/g, ' ');
      csv += `${c.id},"${c.titulo}","${desc}",${statusLabels[c.status] || c.status},${c.prioridade},${c.categoria},${c.solicitante},${c.tecnico || ''},${c.criado_em},${c.atualizado_em},${c.resolvido_em || ''}\n`;
    });

    csv += `\n`;
    csv += `========================================\n`;
    csv += `RESUMO GERAL (OVERVIEW)\n`;
    csv += `========================================\n`;
    csv += `Total de chamados,${totalChamados}\n`;
    csv += `Taxa de resolucao,${taxaResolucao}%\n`;
    csv += `Tempo medio de resolucao,${stats.slaMedio || 0}h\n`;
    csv += `\nPor Status:\n`;
    stats.porStatus?.forEach((s) => {
      csv += `  ${statusLabels[s.status] || s.status},${s.count},${((s.count / (totalChamados || 1)) * 100).toFixed(1)}%\n`;
    });
    csv += `\nPor Prioridade:\n`;
    stats.porPrioridade?.forEach((p) => {
      csv += `  ${p.prioridade},${p.count},${((p.count / (totalChamados || 1)) * 100).toFixed(1)}%\n`;
    });
    csv += `\nPor Categoria:\n`;
    stats.porCategoria?.forEach((c) => csv += `  ${c.categoria},${c.count}\n`);
    if (stats.tecnicos?.length > 0) {
      csv += `\nTecnicos:\n`;
      stats.tecnicos.forEach((t) => csv += `  ${t.tecnico || '-'},${t.total} total,${t.resolvidos} resolvidos\n`);
    }
    csv += `\n--- Fim do relatório ---\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportPDF = async () => {
    if (!stats) return;
    const params = new URLSearchParams({ limit: '999' });
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    let chamados = [];
    try { const r = await fetch(`${API}/chamados?${params}`); const d = await r.json(); chamados = d.chamados || []; } catch (_) {}

    const doc = new jsPDF();
    let y = 20;
    const now = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text('RELATORIO DE CHAMADOS', 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Pelotense IT - Gerado em ${now}`, 20, y);
    y += 6;
    if (inicio || fim) { doc.text(`Periodo: ${inicio || 'inicio'} ate ${fim || 'hoje'}`, 20, y); y += 6; }
    y += 6;

    doc.setFontSize(13);
    doc.text('Lista de Chamados', 20, y);
    y += 8;

    const drawHeader = () => {
      doc.setFontSize(8);
      doc.text('#', 20, y); doc.text('Titulo', 28, y); doc.text('Status', 100, y); doc.text('Prior.', 130, y); doc.text('Solicitante', 148, y);
      y += 4;
      doc.line(20, y, 190, y);
      y += 5;
    };

    drawHeader();
    chamados.slice(0, 200).forEach((c) => {
      if (y > 270) { doc.addPage(); y = 20; drawHeader(); }
      doc.setFontSize(7.5);
      doc.text(String(c.id), 20, y);
      doc.text((c.titulo || '').slice(0, 35), 28, y);
      doc.text((statusLabels[c.status] || c.status).slice(0, 10), 100, y);
      doc.text(c.prioridade, 130, y);
      doc.text((c.solicitante || '').slice(0, 18), 148, y);
      y += 4.5;
    });

    y += 8;
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.text('RESUMO GERAL (OVERVIEW)', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Total de chamados: ${totalChamados}`, 20, y); y += 6;
    doc.text(`Taxa de resolucao: ${taxaResolucao}%`, 20, y); y += 6;
    doc.text(`Tempo medio de resolucao (SLA): ${stats.slaMedio || 0}h`, 20, y); y += 8;

    doc.setFontSize(13);
    doc.text('Por Status', 20, y); y += 7;
    doc.setFontSize(10);
    stats.porStatus?.forEach((s) => {
      doc.text(`${statusLabels[s.status] || s.status}: ${s.count} (${((s.count / (totalChamados || 1)) * 100).toFixed(1)}%)`, 24, y); y += 5;
    });

    y += 3;
    doc.setFontSize(13);
    doc.text('Por Prioridade', 20, y); y += 7;
    doc.setFontSize(10);
    stats.porPrioridade?.forEach((p) => {
      doc.text(`${p.prioridade}: ${p.count}`, 24, y); y += 5;
    });

    y += 3;
    doc.setFontSize(13);
    doc.text('Por Categoria', 20, y); y += 7;
    doc.setFontSize(10);
    stats.porCategoria?.forEach((c) => {
      doc.text(`${c.categoria}: ${c.count}`, 24, y); y += 5;
    });

    if (stats.tecnicos?.length > 0) {
      y += 3;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text('Desempenho por Tecnico', 20, y); y += 7;
      doc.setFontSize(10);
      stats.tecnicos.forEach((t) => {
        doc.text(`${t.tecnico || 'N/A'}: ${t.total} total / ${t.resolvidos} resolvidos (${t.total > 0 ? ((t.resolvidos / t.total) * 100).toFixed(0) : 0}%)`, 24, y); y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    y += 6;
    doc.setFontSize(9);
    doc.text('--- Fim do relatorio ---', 20, y);

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const maxDia = stats?.porDia?.reduce((m, d) => Math.max(m, d.count), 0) || 1;

  return (
    <div className="relatorios-page">
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
        <div>
          <h2>Relatórios</h2>
          <span className="page-subtitle">Estatísticas e análises detalhadas</span>
        </div>
        <div className="report-actions">
          <button className="btn btn-primary" onClick={exportCSV} disabled={!stats}>
            <Download size={16} /> CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF} disabled={!stats}>
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label>De</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Até</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={loadStats}>Filtrar</button>
      </div>

      <div className="report-metrics">
        <div className="metric-card" style={{ '--mc': '#6366f1' }}>
          <div className="metric-icon"><TrendingUp size={20} /></div>
          <div className="metric-data">
            <span className="metric-value">{totalChamados}</span>
            <span className="metric-label">Total no período</span>
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#10b981' }}>
          <div className="metric-icon"><TrendingUp size={20} /></div>
          <div className="metric-data">
            <span className="metric-value">{taxaResolucao}%</span>
            <span className="metric-label">Taxa de resolução</span>
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#f59e0b' }}>
          <div className="metric-icon"><Clock size={20} /></div>
          <div className="metric-data">
            <span className="metric-value">{stats?.slaMedio || 0}h</span>
            <span className="metric-label">Tempo médio (SLA)</span>
          </div>
        </div>
        <div className="metric-card" style={{ '--mc': '#38bdf8' }}>
          <div className="metric-icon"><Users size={20} /></div>
          <div className="metric-data">
            <span className="metric-value">{stats?.tecnicos?.length || 0}</span>
            <span className="metric-label">Técnicos ativos</span>
          </div>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <h3>Chamados por Status</h3>
          <table className="report-table">
            <thead><tr><th>Status</th><th className="text-right">Qtd</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {stats?.porStatus?.map((s) => {
                const pct = ((s.count / (totalChamados || 1)) * 100).toFixed(1);
                return (
                  <tr key={s.status}>
                    <td><span className="dot" style={{ background: { aberto: '#f59e0b', em_andamento: '#38bdf8', pendente: '#a78bfa', resolvido: '#10b981', fechado: '#64748b' }[s.status] }} /> {statusLabels[s.status] || s.status}</td>
                    <td className="text-right">{s.count}</td>
                    <td className="text-right">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="report-card">
          <h3>Chamados por Prioridade</h3>
          <div className="h-bar-list">
            {stats?.porPrioridade?.map((p) => {
              const barW = ((p.count / (totalChamados || 1)) * 100).toFixed(0);
              const colors = { baixa: '#10b981', media: '#6366f1', alta: '#f59e0b', critica: '#f43f5e' };
              return (
                <div key={p.prioridade} className="h-bar-item">
                  <span className="h-bar-label">{p.prioridade}</span>
                  <div className="h-bar-track">
                    <div className="h-bar-fill" style={{ width: `${barW}%`, background: colors[p.prioridade] || '#6366f1' }} />
                  </div>
                  <span className="h-bar-val">{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {stats?.tecnicos?.length > 0 && (
          <div className="report-card">
            <h3>Desempenho por Técnico</h3>
            <table className="report-table">
              <thead><tr><th>Técnico</th><th className="text-right">Total</th><th className="text-right">Resolvidos</th><th className="text-right">%</th></tr></thead>
              <tbody>
                {stats.tecnicos.map((t) => (
                  <tr key={t.tecnico}>
                    <td>{t.tecnico || 'N/A'}</td>
                    <td className="text-right">{t.total}</td>
                    <td className="text-right">{t.resolvidos}</td>
                    <td className="text-right">{t.total > 0 ? ((t.resolvidos / t.total) * 100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="report-card">
          <h3>Evolução Diária</h3>
          <div className="chart-bar-list">
            {stats?.porDia?.slice(-30).map((d) => {
              const h = ((d.count / maxDia) * 100).toFixed(0);
              return (
                <div key={d.dia} className="chart-bar-item" title={`${d.dia}: ${d.count} chamados`}>
                  <div className="chart-bar" style={{ height: `${Math.max(h, 2)}%` }} />
                  <span className="chart-label">{d.dia.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="report-card">
          <h3>Chamados por Categoria</h3>
          <table className="report-table">
            <thead><tr><th>Categoria</th><th className="text-right">Qtd</th></tr></thead>
            <tbody>
              {stats?.porCategoria?.map((c) => (
                <tr key={c.categoria}>
                  <td className="capitalize">{c.categoria}</td>
                  <td className="text-right">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
