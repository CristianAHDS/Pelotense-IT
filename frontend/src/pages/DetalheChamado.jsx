import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Download, Trash2, Image, Timer } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { applyWatermark } from '../utils/watermark';
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

function tempoDecorrido(inicio, fim) {
  const start = new Date(inicio);
  const end = fim ? new Date(fim) : new Date();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ${diff % 60}s`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (diff < 86400) return `${h}h ${m}min`;
  const d = Math.floor(diff / 86400);
  return `${d}d ${h % 24}h`;
}

export default function DetalheChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add: addToast } = useToast();
  const [chamado, setChamado] = useState(null);
  const [comentario, setComentario] = useState('');
  const [comentImagem, setComentImagem] = useState(null);
  const [elapsed, setElapsed] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [resolucao, setResolucao] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const loadChamado = () => {
    fetch(`${API}/chamados/${id}`)
      .then((r) => r.json())
      .then((c) => {
        setChamado(c);
        if (!c.tecnico) {
          fetch(`${API}/chamados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tecnico: 'Cris' }),
          }).then((r) => r.json()).then(setChamado);
        }
      })
      .catch(() => navigate('/chamados'));
  };

  useEffect(loadChamado, [id]);

  useEffect(() => {
    if (!chamado) return;
    if (chamado.resolvido_em) {
      setElapsed(tempoDecorrido(chamado.criado_em, chamado.resolvido_em));
      return;
    }
    const tick = () => setElapsed(tempoDecorrido(chamado.criado_em));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [chamado]);

  const handleStatusChange = async (novoStatus) => {
    if (novoStatus === 'resolvido') {
      setResolucao('');
      setShowResolve(true);
      return;
    }
    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus, tecnico: 'Cris' }),
    });
    addToast(`Status alterado para ${STATUS_MAP[novoStatus]?.label || novoStatus}`, 'info');
    loadChamado();
  };

  const confirmarResolucao = async () => {
    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolvido', tecnico: 'Cris', resolucao }),
    });
    setShowResolve(false);
    setResolucao('');
    addToast('Chamado resolvido com sucesso!', 'success');
    loadChamado();
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!comentario.trim() && !comentImagem) return;

    let texto = comentario.trim();

    if (comentImagem) {
      const fd = new FormData();
      const wm = await applyWatermark(comentImagem, 'Cris');
      fd.append('arquivos', wm);
      try {
        const r = await fetch(`${API}/chamados/${id}/anexos`, { method: 'POST', body: fd });
        const anexos = await r.json();
        if (anexos.length > 0) {
          texto = texto ? `${texto}\n[imagem: ${API}/chamados/anexos/${anexos[0].nome_armazenado}]` : `[imagem: ${API}/chamados/anexos/${anexos[0].nome_armazenado}]`;
        }
      } catch (_) {}
    }

    if (!texto) return;

    await fetch(`${API}/chamados/${id}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autor: 'Cris', texto }),
    });
    setComentario('');
    setComentImagem(null);
    addToast('Comentário adicionado', 'success');
    loadChamado();
  };

  const removerAnexo = async (anexoId) => {
    if (!confirm('Remover este anexo?')) return;
    await fetch(`${API}/chamados/anexos/${anexoId}`, { method: 'DELETE' });
    addToast('Anexo removido', 'success');
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
            <span className={`badge ${STATUS_MAP[chamado.status]?.cls}`}>{STATUS_MAP[chamado.status]?.label}</span>
            <span className={`badge ${PRIORIDADE_MAP[chamado.prioridade]?.cls}`}>{PRIORIDADE_MAP[chamado.prioridade]?.label}</span>
            <span className="badge badge-gray">{chamado.categoria}</span>
          </div>
          {chamado.tags && chamado.tags.length > 0 && (
            <div className="detalhe-tags">
              {chamado.tags.map((t) => <span key={t.id} className="tag-chip">{t.nome}</span>)}
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

          {chamado.resolucao && (
            <div className="detalhe-section detalhe-resolucao">
              <h3>Descrição da Resolução</h3>
              <p>{chamado.resolucao}</p>
            </div>
          )}

          {chamado.anexos && chamado.anexos.length > 0 && (
            <div className="detalhe-section">
              <h3><Paperclip size={16} /> Anexos ({chamado.anexos.length})</h3>
              <div className="anexos-grid">
                {chamado.anexos.map((a) => (
                  <div key={a.id} className="anexo-card">
                    {a.tipo === 'imagem' && (
                      <div className="anexo-preview" onClick={() => setLightbox(`${API}/chamados/anexos/${a.nome_armazenado}`)} style={{ cursor: 'pointer' }}>
                        <img src={`${API}/chamados/anexos/${a.nome_armazenado}`} alt={a.nome_original} />
                      </div>
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
                      <div className="anexo-preview doc-preview"><Paperclip size={28} /></div>
                    )}
                    <div className="anexo-info">
                      <span className="anexo-nome" title={a.nome_original}>{a.nome_original}</span>
                      <span className="anexo-tamanho">{(a.tamanho / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="anexo-actions">
                      <a href={`${API}/chamados/anexos/${a.nome_armazenado}`} download={a.nome_original} className="btn-icon" title="Download"><Download size={15} /></a>
                      <button onClick={() => removerAnexo(a.id)} className="btn-icon btn-icon-danger" title="Remover"><Trash2 size={15} /></button>
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
              {chamado.comentarios?.map((c) => {
                const imgMatch = c.texto.match(/\[imagem:\s*(.+?)\]/);
                const displayText = c.texto.replace(/\[imagem:\s*.+?\]/, '').trim();
                const imgUrl = imgMatch ? imgMatch[1] : null;
                return (
                  <div key={c.id} className="comentario-item">
                    <div className="comentario-header">
                      <strong>{c.autor}</strong>
                      <span>{new Date(c.criado_em).toLocaleString()}</span>
                    </div>
                    {displayText && <p>{displayText}</p>}
                    {imgUrl && <img src={imgUrl} alt="anexo" className="comentario-img" onClick={() => setLightbox(imgUrl)} />}
                  </div>
                );
              })}
            </div>

            <form className="comentario-form" onSubmit={enviarComentario}>
              <input value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="Adicionar comentário..." />
              <label className="comentario-img-btn" title="Anexar imagem">
                <Image size={16} />
                <input type="file" accept="image/*" onChange={(e) => setComentImagem(e.target.files?.[0] || null)} hidden />
              </label>
              {comentImagem && (
                <span className="comentario-img-name">{comentImagem.name}</span>
              )}
              <button type="submit" disabled={!comentario.trim() && !comentImagem}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="detalhe-sidebar">
          <div className="detalhe-section">
            <h3>Informações</h3>
            <dl>
              <dt>Solicitante</dt><dd>{chamado.solicitante}</dd>
              <dt>Técnico</dt><dd>{chamado.tecnico || 'Cris'}</dd>
              <dt>Criado em</dt><dd>{new Date(chamado.criado_em).toLocaleString()}</dd>
              <dt>Atualizado em</dt><dd>{new Date(chamado.atualizado_em).toLocaleString()}</dd>
              {chamado.resolvido_em && (<><dt>Resolvido em</dt><dd>{new Date(chamado.resolvido_em).toLocaleString()}</dd></>)}
              <dt>Tempo</dt>
              <dd className="tempo-timer">
                <Timer size={14} />
                <span>{elapsed}</span>
              </dd>
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

      {showResolve && (
        <div className="modal-overlay" onClick={() => setShowResolve(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Descreva a resolução</h3>
            <p className="modal-sub">Como o problema foi resolvido?</p>
            <textarea autoFocus rows={4} value={resolucao} onChange={(e) => setResolucao(e.target.value)}
              placeholder="Ex: Substituído cabo de rede com defeito, configurado novo IP..." />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowResolve(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarResolucao}>Resolver Chamado</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Visualização" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
