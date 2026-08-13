import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical, Plus, AlertTriangle, Clock, Pause, CheckCircle, X, ChevronDown, ChevronUp, Archive,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { SkeletonKanban } from '../components/ui/Skeleton';
import './Kanban.css';

const API = '/api';

const COLUNAS = [
  { id: 'aberto', titulo: 'A Fazer', icon: AlertTriangle, cor: '#f59e0b', bgCor: '#f59e0b12' },
  { id: 'em_andamento', titulo: 'Em Andamento', icon: Clock, cor: '#38bdf8', bgCor: '#38bdf812' },
  { id: 'pendente', titulo: 'Pendente', icon: Pause, cor: '#a78bfa', bgCor: '#a78bfa12' },
  { id: 'finalizado', titulo: 'Finalizado', icon: CheckCircle, cor: '#10b981', bgCor: '#10b98112' },
];

const hoje = () => new Date().toLocaleDateString('sv');

export default function Kanban() {
  const navigate = useNavigate();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [creating, setCreating] = useState(null);
  const [novoCard, setNovoCard] = useState({ titulo: '', solicitante: '', prioridade: 'media' });
  const [logOpen, setLogOpen] = useState(false);
  const [logMes, setLogMes] = useState('all');
  const [logSemana, setLogSemana] = useState('all');
  const dragIdRef = useRef(null);

  const { add: addToast } = useToast();

  const fetchChamados = () => {
    fetch(`${API}/chamados?limit=500`)
      .then((r) => r.json())
      .then((data) => setChamados(data.chamados || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchChamados, []);

  const getChamadosPorColuna = (colunaId) => {
    if (colunaId === 'finalizado') {
      const today = hoje();
      return chamados.filter((c) => c.status === 'resolvido' && (c.resolvido_em || '').slice(0, 10) >= today);
    }
    return chamados.filter((c) =>
      c.status === colunaId && c.status !== 'resolvido' && c.status !== 'fechado'
    );
  };

  const getArquivados = () => {
    const today = hoje();
    return chamados.filter((c) =>
      c.status === 'resolvido' && (c.resolvido_em || c.criado_em).slice(0, 10) < today
    );
  };

  const handleDragStart = (e, chamado) => {
    if (chamado.status === 'resolvido') return;
    dragIdRef.current = chamado.id;
    setDraggedId(chamado.id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(chamado.id)); } catch (_) {}
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colunaId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colunaId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, colunaId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCol(null);

    let id = dragIdRef.current;
    if (!id) { try { id = parseInt(e.dataTransfer.getData('text/plain')); } catch (_) {} }
    if (!id) return;
    dragIdRef.current = null;

    const chamado = chamados.find((c) => c.id === id);
    if (!chamado || chamado.status === 'resolvido') return;
    if (colunaId === chamado.status) return;

    if (colunaId === 'finalizado') {
      const novoTitulo = chamado.titulo.includes('(pendencia)') ? chamado.titulo : `${chamado.titulo} (pendencia)`;
      await fetch(`${API}/chamados/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvido', titulo: novoTitulo }),
      });
      addToast(`Chamado #${id} finalizado`, 'success');
    } else {
      const tituloLimpo = chamado.titulo.replace(/\s*\(pendencia\)\s*$/, '');
      await fetch(`${API}/chamados/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: colunaId, titulo: tituloLimpo }),
      });
      addToast(`Chamado #${id} movido`, 'info');
    }

    setDraggedId(null);
    fetchChamados();
  };

  const handleCreateCard = async (colunaId) => {
    if (!novoCard.titulo.trim() || !novoCard.solicitante.trim()) return;
    await fetch(`${API}/chamados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: novoCard.titulo,
        descricao: `Criado via Kanban por ${novoCard.solicitante}`,
        prioridade: novoCard.prioridade,
        solicitante: novoCard.solicitante,
        categoria: 'geral',
      }),
    });
    addToast('Card criado com sucesso!', 'success');
    setNovoCard({ titulo: '', solicitante: '', prioridade: 'media' });
    setCreating(null);
    fetchChamados();
  };

  const arquivados = getArquivados();

  const getMeses = () => {
    const meses = new Set();
    arquivados.forEach((c) => {
      const data = c.resolvido_em || c.criado_em;
      if (data && data.slice(0, 7)) meses.add(data.slice(0, 7));
    });
    return Array.from(meses).sort((a, b) => b.localeCompare(a));
  };

  const getSemanas = () => {
    if (logMes === 'all') return [];
    const [ano, mes] = logMes.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    return Array.from({ length: Math.ceil(diasNoMes / 7) }, (_, i) => i + 1);
  };

  const formatMesLabel = (m) => {
    const [ano, mes] = m.split('-').map(Number);
    const label = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const semanaLabel = (sem, mesKey) => {
    const [ano, mes] = mesKey.split('-').map(Number);
    const inicio = (sem - 1) * 7 + 1;
    const fim = Math.min(sem * 7, new Date(ano, mes, 0).getDate());
    const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `Semana ${sem} (${inicio}–${fim} ${mesNome})`;
  };

  const getSemana = (dateStr) => Math.ceil(parseInt(dateStr.slice(8, 10), 10) / 7);

  const filteredArquivados = arquivados.filter((c) => {
    const data = c.resolvido_em || c.criado_em;
    if (!data) return true;
    if (logMes !== 'all' && data.slice(0, 7) !== logMes) return false;
    if (logMes !== 'all' && logSemana !== 'all' && getSemana(data) !== parseInt(logSemana, 10)) return false;
    return true;
  });

  const getNestedArquivados = () => {
    const meses = {};
    filteredArquivados.forEach((c) => {
      const dataRes = c.resolvido_em || c.criado_em;
      const mesKey = dataRes.slice(0, 7);
      const diaKey = dataRes.slice(0, 10);
      const sem = getSemana(dataRes);
      if (!meses[mesKey]) meses[mesKey] = {};
      if (!meses[mesKey][sem]) meses[mesKey][sem] = {};
      if (!meses[mesKey][sem][diaKey]) meses[mesKey][sem][diaKey] = [];
      meses[mesKey][sem][diaKey].push(c);
    });
    return Object.keys(meses).sort((a, b) => b.localeCompare(a)).map((mesKey) => ({
      mesKey,
      semanas: Object.keys(meses[mesKey])
        .map(Number)
        .sort((a, b) => b - a)
        .map((sem) => ({
          sem,
          dias: Object.keys(meses[mesKey][sem])
            .sort((a, b) => b.localeCompare(a))
            .map((diaKey) => ({ diaKey, items: meses[mesKey][sem][diaKey] })),
        })),
    }));
  };

  if (loading) {
    return (
      <div className="kanban-page">
        <div className="page-header">
          <div><h2>Quadro Kanban</h2><span className="page-subtitle">Carregando...</span></div>
        </div>
        <SkeletonKanban />
      </div>
    );
  }

  return (
    <div className="kanban-page">
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
          <h2>Quadro Kanban</h2>
          <span className="page-subtitle">Arraste cards ou crie novos diretamente nas colunas</span>
        </div>
        <div className="kanban-header-right">
          <div className="kanban-total-badge">{chamados.length} chamados</div>
        </div>
      </div>

      <div className="kanban-grid">
        {COLUNAS.map((coluna) => {
          const ColIcon = coluna.icon;
          const cards = getChamadosPorColuna(coluna.id);
          const isFinalizado = coluna.id === 'finalizado';

          return (
            <div
              key={coluna.id}
              className={`kanban-coluna ${isFinalizado ? 'coluna-finalizado' : ''} ${dragOverCol === coluna.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, coluna.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, coluna.id)}
            >
              <div className="coluna-header" style={{ borderTopColor: coluna.cor }}>
                <div className="coluna-header-left">
                  <div className="coluna-icon" style={{ background: coluna.bgCor, color: coluna.cor }}>
                    <ColIcon size={16} />
                  </div>
                  <h3>{coluna.titulo}</h3>
                </div>
                <span className="coluna-count" style={{ background: coluna.bgCor, color: coluna.cor }}>
                  {cards.length}
                </span>
              </div>

              <div className="coluna-body">
                {!isFinalizado && (
                  <>
                    {creating === coluna.id ? (
                      <div className="card-create-form">
                        <input autoFocus placeholder="Título do chamado..." value={novoCard.titulo}
                          onChange={(e) => setNovoCard({ ...novoCard, titulo: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCard(coluna.id); if (e.key === 'Escape') { setCreating(null); setNovoCard({ titulo: '', solicitante: '', prioridade: 'media' }); } }} />
                        <input placeholder="Solicitante..." value={novoCard.solicitante}
                          onChange={(e) => setNovoCard({ ...novoCard, solicitante: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateCard(coluna.id)} />
                        <select value={novoCard.prioridade}
                          onChange={(e) => setNovoCard({ ...novoCard, prioridade: e.target.value })}>
                          <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option>
                        </select>
                        <div className="create-form-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => handleCreateCard(coluna.id)}>Criar</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setCreating(null); setNovoCard({ titulo: '', solicitante: '', prioridade: 'media' }); }}><X size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <button className="coluna-add-btn" onClick={() => setCreating(coluna.id)}>
                        <Plus size={14} /> Novo card
                      </button>
                    )}
                  </>
                )}

                {isFinalizado && cards.length === 0 && (
                  <div className="drop-zone-hint">
                    <CheckCircle size={28} />
                    <p>Arraste cards aqui para finalizar</p>
                    <span>O título será marcado com (pendencia)</span>
                  </div>
                )}

                {cards.map((c) => (
                  <div
                    key={c.id}
                    className={`kanban-card ${draggedId === c.id ? 'dragging' : ''}`}
                    draggable={!isFinalizado}
                    onDragStart={(e) => handleDragStart(e, c)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { if (!dragIdRef.current) navigate(`/chamados/${c.id}`); }}
                  >
                    <div className="card-header-row">
                      <span className={`card-prioridade prioridade-${c.prioridade}`} />
                      <GripVertical size={14} className="card-grip" />
                    </div>
                    <p className="card-titulo">{c.titulo}</p>
                    <div className="card-footer">
                      <span className="card-id">#{c.id}</span>
                      <span className="card-solicitante">{c.solicitante}</span>
                    </div>
                  </div>
                ))}

                {!isFinalizado && cards.length === 0 && creating !== coluna.id && (
                  <div className="coluna-empty"><p>Nenhum chamado</p></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {arquivados.length > 0 && (
        <div className="kanban-log">
          <button className="kanban-log-toggle" onClick={() => setLogOpen(!logOpen)}>
            <Archive size={16} /> Log de Finalizados ({arquivados.length})
            {logOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {logOpen && (
            <div className="kanban-log-filters">
              <select className="log-select" value={logMes} onChange={(e) => { setLogMes(e.target.value); setLogSemana('all'); }}>
                <option value="all">Todos os meses</option>
                {getMeses().map((m) => (
                  <option key={m} value={m}>{formatMesLabel(m)}</option>
                ))}
              </select>
              <select className="log-select" value={logSemana} onChange={(e) => setLogSemana(e.target.value)} disabled={logMes === 'all'}>
                <option value="all">Todas as semanas</option>
                {getSemanas().map((s) => (
                  <option key={s} value={s}>{semanaLabel(s, logMes)}</option>
                ))}
              </select>
            </div>
          )}

          {logOpen && (
            <div className="kanban-log-sections">
              {getNestedArquivados().length === 0 && (
                <p className="text-muted">Nenhum chamado finalizado neste período.</p>
              )}
              {getNestedArquivados().map(({ mesKey, semanas }) => (
                <div key={mesKey} className="kanban-log-month">
                  <div className="kanban-log-month-header">
                    <span className="log-month-label">{formatMesLabel(mesKey)}</span>
                    <span className="log-day-count">
                      {semanas.reduce((acc, s) => acc + s.dias.reduce((a, d) => a + d.items.length, 0), 0)} chamados
                    </span>
                  </div>
                  {semanas.map(({ sem, dias }) => (
                    <div key={sem} className="kanban-log-week">
                      <div className="kanban-log-week-header">
                        <span className="log-week-label">{semanaLabel(sem, mesKey)}</span>
                        <span className="log-day-count">
                          {dias.reduce((a, d) => a + d.items.length, 0)} chamado{dias.reduce((a, d) => a + d.items.length, 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                      {dias.map(({ diaKey, items }) => {
                        const dt = new Date(diaKey + 'T00:00:00');
                        const label = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        return (
                          <div key={diaKey} className="kanban-log-day">
                            <div className="kanban-log-day-header">
                              <span className="log-day-label">{label}</span>
                              <span className="log-day-count">{items.length} chamado{items.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="kanban-log-grid">
                              {items.map((c) => (
                                <div
                                  key={c.id}
                                  className="kanban-card kanban-card-sm"
                                  onClick={() => navigate(`/chamados/${c.id}`)}
                                >
                                  <div className="card-header-row">
                                    <span className={`card-prioridade prioridade-${c.prioridade}`} />
                                    <span className="card-id">#{c.id}</span>
                                  </div>
                                  <p className="card-titulo">{c.titulo}</p>
                                  <div className="card-log-meta">{c.solicitante}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ paddingBottom: 20 }} />
    </div>
  );
}
