import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical, Plus, AlertTriangle, Clock, Pause, CheckCircle, X,
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

export default function Kanban() {
  const navigate = useNavigate();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [creating, setCreating] = useState(null);
  const [novoCard, setNovoCard] = useState({ titulo: '', solicitante: '', prioridade: 'media' });
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
      return chamados.filter((c) => c.status === 'resolvido');
    }
    return chamados.filter((c) =>
      c.status === colunaId && c.status !== 'resolvido' && c.status !== 'fechado'
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
    if (!id) {
      try { id = parseInt(e.dataTransfer.getData('text/plain')); } catch (_) {}
    }
    if (!id) return;

    dragIdRef.current = null;

    const chamado = chamados.find((c) => c.id === id);
    if (!chamado || chamado.status === 'resolvido') return;
    if (colunaId === chamado.status) return;

    if (colunaId === 'finalizado') {
      const novoTitulo = chamado.titulo.includes('(pendencia)')
        ? chamado.titulo
        : `${chamado.titulo} (pendencia)`;
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
        <div>
          <h2>Quadro Kanban</h2>
          <span className="page-subtitle">Arraste cards ou crie novos diretamente nas colunas</span>
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
                        <input
                          autoFocus
                          placeholder="Título do chamado..."
                          value={novoCard.titulo}
                          onChange={(e) => setNovoCard({ ...novoCard, titulo: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateCard(coluna.id);
                            if (e.key === 'Escape') { setCreating(null); setNovoCard({ titulo: '', solicitante: '', prioridade: 'media' }); }
                          }}
                        />
                        <input
                          placeholder="Solicitante..."
                          value={novoCard.solicitante}
                          onChange={(e) => setNovoCard({ ...novoCard, solicitante: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateCard(coluna.id)}
                        />
                        <select
                          value={novoCard.prioridade}
                          onChange={(e) => setNovoCard({ ...novoCard, prioridade: e.target.value })}
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                          <option value="critica">Crítica</option>
                        </select>
                        <div className="create-form-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => handleCreateCard(coluna.id)}>
                            Criar
                          </button>
                          <button className="btn btn-sm btn-ghost" onClick={() => {
                            setCreating(null);
                            setNovoCard({ titulo: '', solicitante: '', prioridade: 'media' });
                          }}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="coluna-add-btn"
                        onClick={() => setCreating(coluna.id)}
                      >
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
                    onClick={(e) => {
                      if (dragIdRef.current) return;
                      navigate(`/chamados/${c.id}`);
                    }}
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
                  <div className="coluna-empty">
                    <p>Nenhum chamado</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
