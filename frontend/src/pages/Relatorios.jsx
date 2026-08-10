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

  const exportCSV = () => {
    if (!stats) return;
    let csv = '\uFEFFRelatório - Pelotense IT\n';
    if (inicio || fim) csv += `Período: ${inicio || '...'} a ${fim || '...'}\n`;
    csv += `\nTotal de chamados,${totalChamados}\n`;
    csv += `Taxa de resolucao,${taxaResolucao}%\n`;
    csv += `Tempo medio de resolucao,${stats.slaMedio || 0}h\n\n`;

    csv += 'Status,Quantidade,Porcentagem\n';
    stats.porStatus?.forEach((s) => {
      csv += `${statusLabels[s.status] || s.status},${s.count},${((s.count / (totalChamados || 1)) * 100).toFixed(1)}%\n`;
    });
    csv += '\nPrioridade,Quantidade,Porcentagem\n';
    stats.porPrioridade?.forEach((p) => {
      csv += `${p.prioridade},${p.count},${((p.count / (totalChamados || 1)) * 100).toFixed(1)}%\n`;
    });
    csv += '\nCategoria,Quantidade\n';
    stats.porCategoria?.forEach((c) => csv += `${c.categoria},${c.count}\n`);
    if (stats.tecnicos?.length > 0) {
      csv += '\nTecnico,Total,Resolvidos\n';
      stats.tecnicos.forEach((t) => csv += `${t.tecnico || '-'},${t.total},${t.resolvidos}\n`);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text('Relatório - Pelotense IT', 20, y);
    y += 10;

    if (inicio || fim) {
      doc.setFontSize(11);
      doc.text(`Periodo: ${inicio || 'inicio'} ate ${fim || 'hoje'}`, 20, y);
      y += 6;
    }

    doc.setFontSize(11);
    doc.text(`Total: ${totalChamados} | Resolvidos: ${resolvidos} (${taxaResolucao}%) | SLA medio: ${stats.slaMedio || 0}h`, 20, y);
    y += 12;

    doc.setFontSize(13);
    doc.text('Por Status', 20, y);
    y += 8;
    stats.porStatus?.forEach((s) => {
      doc.setFontSize(10);
      doc.text(`${statusLabels[s.status] || s.status}: ${s.count} (${((s.count / (totalChamados || 1)) * 100).toFixed(1)}%)`, 24, y);
      y += 6;
    });

    y += 4;
    doc.setFontSize(13);
    doc.text('Por Prioridade', 20, y);
    y += 8;
    stats.porPrioridade?.forEach((p) => {
      doc.setFontSize(10);
      doc.text(`${p.prioridade}: ${p.count}`, 24, y);
      y += 6;
    });

    if (stats.tecnicos?.length > 0) {
      y += 4;
      doc.setFontSize(13);
      doc.text('Tecnicos', 20, y);
      y += 8;
      stats.tecnicos.forEach((t) => {
        doc.setFontSize(10);
        doc.text(`${t.tecnico || 'N/A'}: ${t.total} total / ${t.resolvidos} resolvidos`, 24, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const maxDia = stats?.porDia?.reduce((m, d) => Math.max(m, d.count), 0) || 1;

  return (
    <div className="relatorios-page">
      <div className="page-header">
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
