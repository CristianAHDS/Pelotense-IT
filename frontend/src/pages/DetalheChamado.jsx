import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Download, Trash2, Play } from 'lucide-react';
import './DetalheChamado.css';

const API = '/api';

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

export default function DetalheChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chamado, setChamado] = useState(null);
  const [comentario, setComentario] = useState('');

  const loadChamado = () => {
    fetch(`${API}/chamados/${id}`)
      .then((r) => r.json())
      .then(setChamado)
      .catch(() => navigate('/chamados'));
  };

  useEffect(loadChamado, [id]);

  const handleStatusChange = async (novoStatus) => {
    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });
    loadChamado();
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    await fetch(`${API}/chamados/${id}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autor: 'Técnico', texto: comentario }),
    });
    setComentario('');
    loadChamado();
  };

  const removerAnexo = async (anexoId) => {
    if (!confirm('Remover este anexo?')) return;
    await fetch(`${API}/chamados/anexos/${anexoId}`, { method: 'DELETE' });
    loadChamado();
  };

  const isMediaPreview = (tipo) => ['imagem', 'video', 'audio'].includes(tipo);

  if (!chamado) return <div className="loading">Carregando...</div>;

  return (
    <div className="detalhe-page">
      <Link to="/chamados" className="back-link">
        <ArrowLeft size={18} /> Voltar para Chamados
      </Link>

      <div className="detalhe-header">
        <div>
          <h2>#{chamado.id} - {chamado.titulo}</h2>
          <div className="detalhe-badges">
            <span className={`badge ${STATUS_MAP[chamado.status]?.cls}`}>
              {STATUS_MAP[chamado.status]?.label}
            </span>
            <span className={`badge ${PRIORIDADE_MAP[chamado.prioridade]?.cls}`}>
              {PRIORIDADE_MAP[chamado.prioridade]?.label}
            </span>
          <span className="badge badge-gray">{chamado.categoria}</span>
        </div>
        {chamado.tags && chamado.tags.length > 0 && (
          <div className="detalhe-tags">
            {chamado.tags.map((t) => (
              <span key={t.id} className="tag-chip">{t.nome}</span>
            ))}
          </div>
        )}
      </div>
      </div>

      <div className="detalhe-grid">
        <div className="detalhe-main">
          <div className="detalhe-section">
            <h3>Descrição</h3>
            <p>{chamado.descricao}</p>
          </div>

          {chamado.anexos && chamado.anexos.length > 0 && (
            <div className="detalhe-section">
              <h3><Paperclip size={16} /> Anexos ({chamado.anexos.length})</h3>
              <div className="anexos-grid">
                {chamado.anexos.map((a) => (
                  <div key={a.id} className="anexo-card">
                    {a.tipo === 'imagem' && (
                      <a href={`${API}/chamados/anexos/${a.nome_armazenado}`} target="_blank" rel="noreferrer" className="anexo-preview">
                        <img src={`${API}/chamados/anexos/${a.nome_armazenado}`} alt={a.nome_original} />
                      </a>
                    )}
                    {a.tipo === 'video' && (
                      <div className="anexo-preview video-preview">
                        <video controls src={`${API}/chamados/anexos/${a.nome_armazenado}`} />
                      </div>
                    )}
                    {a.tipo === 'audio' && (
                      <div className="anexo-preview audio-preview">
                        <audio controls src={`${API}/chamados/anexos/${a.nome_armazenado}`} />
                      </div>
                    )}
                    {!isMediaPreview(a.tipo) && (
                      <div className="anexo-preview doc-preview">
                        <Paperclip size={28} />
                      </div>
                    )}
                    <div className="anexo-info">
                      <span className="anexo-nome" title={a.nome_original}>{a.nome_original}</span>
                      <span className="anexo-tamanho">{(a.tamanho / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="anexo-actions">
                      <a href={`${API}/chamados/anexos/${a.nome_armazenado}`} download={a.nome_original}
                        className="btn-icon" title="Download">
                        <Download size={15} />
                      </a>
                      <button onClick={() => removerAnexo(a.id)} className="btn-icon btn-icon-danger" title="Remover">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chamado.historico && chamado.historico.length > 0 && (
            <div className="detalhe-section">
              <h3>Histórico</h3>
              <div className="historico-list">
                {chamado.historico.map((h) => (
                  <div key={h.id} className="historico-item">
                    <div className="historico-dot" />
                    <div className="historico-content">
                      <span className="historico-desc">{h.descricao}</span>
                      <span className="historico-meta">{h.usuario} &bull; {new Date(h.criado_em).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detalhe-section">
            <h3>Comentários ({chamado.comentarios?.length || 0})</h3>
            <div className="comentarios-list">
              {chamado.comentarios?.length === 0 && (
                <p className="text-muted">Nenhum comentário ainda.</p>
              )}
              {chamado.comentarios?.map((c) => (
                <div key={c.id} className="comentario-item">
                  <div className="comentario-header">
                    <strong>{c.autor}</strong>
                    <span>{new Date(c.criado_em).toLocaleString()}</span>
                  </div>
                  <p>{c.texto}</p>
                </div>
              ))}
            </div>

            <form className="comentario-form" onSubmit={enviarComentario}>
              <input value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="Adicionar comentário..." />
              <button type="submit" disabled={!comentario.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="detalhe-sidebar">
          <div className="detalhe-section">
            <h3>Informações</h3>
            <dl>
              <dt>Solicitante</dt>
              <dd>{chamado.solicitante}</dd>
              <dt>Técnico</dt>
              <dd>{chamado.tecnico || '-'}</dd>
              <dt>Criado em</dt>
              <dd>{new Date(chamado.criado_em).toLocaleString()}</dd>
              <dt>Atualizado em</dt>
              <dd>{new Date(chamado.atualizado_em).toLocaleString()}</dd>
              {chamado.resolvido_em && (<><dt>Resolvido em</dt><dd>{new Date(chamado.resolvido_em).toLocaleString()}</dd></>)}
            </dl>
          </div>

          <div className="detalhe-section">
            <h3>Alterar Status</h3>
            <div className="status-actions">
              {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                <button key={key} disabled={chamado.status === key}
                  className={`btn btn-status ${chamado.status === key ? 'active' : ''}`}
                  onClick={() => handleStatusChange(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
