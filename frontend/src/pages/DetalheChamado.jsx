import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Download, Trash2, Image, Timer, X as XIcon, Camera, Edit2, CheckSquare, PlusCircle, Check, Upload, FileImage } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { applyWatermark } from '../utils/watermark';
import './DetalheChamado.css';

const API = '/api';

const STATUS_MAP = {
  aberto: { label: 'Aberto', cls: 'badge-blue', emoji: '📥' },
  em_andamento: { label: 'Em Andamento', cls: 'badge-cyan', emoji: '🔧' },
  pendente: { label: 'Pendente', cls: 'badge-yellow', emoji: '⏳' },
  resolvido: { label: 'Resolvido', cls: 'badge-green', emoji: '✅' },
  fechado: { label: 'Fechado', cls: 'badge-gray', emoji: '🔒' },
};

const CAT_AVATARS = {
  hardware: '💻', software: '🖥️', rede: '🌐', impressora: '🖨️',
  email: '📧', acesso: '🔑', geral: '📋', evento: '🎪', censura: '🎥',
  gravacao: '🎙️', edicao: '✂️', postagem: '📡',
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
  return formatTempo(diff);
}

function formatTempo(diff) {
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ${diff % 60}s`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}min`;
}

function tempoAndamento(chamado) {
  const acumulado = chamado.tempo_em_andamento || 0;
  if (chamado.status === 'em_andamento' && chamado.inicio_em_andamento) {
    const agora = Math.floor((new Date() - new Date(chamado.inicio_em_andamento)) / 1000);
    return acumulado + agora;
  }
  return acumulado;
}

export default function DetalheChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add: addToast } = useToast();
  const { user } = useAuth();
  const tecnicoNome = user?.nome || 'Cristian Raffi Cunha';
  const [chamado, setChamado] = useState(null);
  const [comentario, setComentario] = useState('');
  const [comentImagem, setComentImagem] = useState(null);
  const [elapsed, setElapsed] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [resolucao, setResolucao] = useState('');
  const [resolucaoImg, setResolucaoImg] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ titulo: '', descricao: '', categoria: '', prioridade: '' });
  const [novoCheck, setNovoCheck] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [gamiData, setGamiData] = useState(null);
  const [resolveDragOver, setResolveDragOver] = useState(false);
  const resolveFileRef = useRef(null);

  const loadChamado = () => {
    fetch(`${API}/chamados/${id}`)
      .then((r) => r.json())
      .then((c) => {
        setChamado(c);
        setChecklist(c.checklist || []);
        setEditForm({ titulo: c.titulo, descricao: c.descricao, categoria: c.categoria, prioridade: c.prioridade });
        if (!c.tecnico) {
          fetch(`${API}/chamados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tecnico: tecnicoNome }),
          }).then((r) => r.json()).then(setChamado);
        }
      })
      .catch(() => navigate('/chamados'));
  };

  useEffect(loadChamado, [id]);

  useEffect(() => {
    fetch(`${API}/gamificacao/usuario/${encodeURIComponent(tecnicoNome)}`)
      .then((r) => r.json())
      .then(setGamiData)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!chamado) return;
    const tick = () => {
      const seg = tempoAndamento(chamado);
      setElapsed(formatTempo(seg));
    };
    tick();
    if (chamado.status === 'em_andamento') {
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    }
  }, [chamado]);

  useEffect(() => {
    if (!showResolve) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) setResolucaoImg(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showResolve]);

  useEffect(() => {
    if (showResolve) return;
    const handleComentPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) setComentImagem(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handleComentPaste);
    return () => window.removeEventListener('paste', handleComentPaste);
  }, [showResolve]);

  const handleStatusChange = async (novoStatus) => {
    if (novoStatus === 'resolvido') {
      setResolucao('');
      setResolucaoImg(null);
      setShowResolve(true);
      return;
    }
    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus, tecnico: tecnicoNome }),
    });
    addToast(`Status alterado para ${STATUS_MAP[novoStatus]?.label || novoStatus}`, 'info');
    loadChamado();
  };

  const confirmarResolucao = async () => {
    let textoResolucao = resolucao.trim();

    if (resolucaoImg) {
      try {
        const wm = await applyWatermark(resolucaoImg, tecnicoNome);
        const fd = new FormData();
        fd.append('arquivos', wm);
        const r = await fetch(`${API}/chamados/${id}/anexos`, { method: 'POST', body: fd });
        const anexos = await r.json();
        if (anexos.length > 0) {
          const imgRef = `[imagem: ${API}/chamados/anexos/${anexos[0].nome_armazenado}]`;
          textoResolucao = textoResolucao ? `${textoResolucao}\n${imgRef}` : imgRef;
        }
      } catch (_) {}
    }

    if (!textoResolucao && !resolucaoImg) return;

    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolvido', tecnico: tecnicoNome, resolucao: textoResolucao || ' ' }),
    });
    setShowResolve(false);
    setResolucao('');
    setResolucaoImg(null);
    addToast('Chamado resolvido com sucesso!', 'success');
    loadChamado();
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!comentario.trim() && !comentImagem) return;

    let texto = comentario.trim();

    if (comentImagem) {
      const fd = new FormData();
      const wm = await applyWatermark(comentImagem, tecnicoNome);
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
      body: JSON.stringify({ autor: tecnicoNome, texto }),
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

  const toggleCheck = async (item) => {
    await fetch(`${API}/chamados/${id}/checklist/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concluido: !item.concluido }),
    });
    setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, concluido: item.concluido ? 0 : 1 } : i));
  };

  const addCheckItem = async () => {
    if (!novoCheck.trim()) return;
    const r = await fetch(`${API}/chamados/${id}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: novoCheck }),
    });
    const item = await r.json();
    setChecklist((prev) => [...prev, item]);
    setNovoCheck('');
  };

  const removeCheckItem = async (itemId) => {
    await fetch(`${API}/chamados/${id}/checklist/${itemId}`, { method: 'DELETE' });
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
  };

  const saveEdit = async () => {
    await fetch(`${API}/chamados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    addToast('Chamado atualizado', 'success');
    setEditing(false);
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
          {editing ? (
            <div className="edit-form">
              <input className="edit-titulo" value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} />
              <textarea className="edit-desc" rows={3} value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} />
              <div className="edit-row">
                <select value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                  <option value="geral">Geral</option><option value="hardware">Hardware</option><option value="software">Software</option>
                  <option value="rede">Rede</option><option value="impressora">Impressora</option><option value="email">E-mail</option>
                  <option value="acesso">Acesso</option><option value="evento">Evento</option><option value="censura">Censura</option>
                  <option value="gravacao">Gravação</option><option value="edicao">Edição</option><option value="postagem">Postagem</option>
                </select>
                <select value={editForm.prioridade} onChange={(e) => setEditForm({ ...editForm, prioridade: e.target.value })}>
                  <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option>
                </select>
                <button className="btn btn-primary" onClick={saveEdit}><Check size={14} /> Salvar</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <h2>
                <span className="cat-avatar">{CAT_AVATARS[chamado.categoria] || '📋'}</span>
                #{chamado.id} - {chamado.titulo}
                <button className="btn-icon edit-btn" title="Editar" onClick={() => setEditing(true)}><Edit2 size={14} /></button>
              </h2>
              <div className="detalhe-badges">
                <span className={`badge ${STATUS_MAP[chamado.status]?.cls}`}>{STATUS_MAP[chamado.status]?.label}</span>
                <span className={`badge ${PRIORIDADE_MAP[chamado.prioridade]?.cls}`}>{PRIORIDADE_MAP[chamado.prioridade]?.label}</span>
                <span className="badge badge-gray">{chamado.categoria}</span>
              </div>
            </>
          )}
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
              {(() => {
                const imgMatch = chamado.resolucao.match(/\[imagem:\s*(.+?)\]/);
                const displayText = chamado.resolucao.replace(/\[imagem:\s*.+?\]/, '').trim();
                const imgUrl = imgMatch ? imgMatch[1] : null;
                return (
                  <>
                    {displayText && <p>{displayText}</p>}
                    {imgUrl && <img src={imgUrl} alt="Resolução" className="comentario-img" onClick={() => setLightbox(imgUrl)} />}
                  </>
                );
              })()}
            </div>
          )}

          {chamado.anexos && chamado.anexos.length > 0 && (
            <div className="detalhe-section">
              <h3><Paperclip size={16} /> Anexos ({chamado.anexos.length})</h3>
              <div className="anexos-list">
                {chamado.anexos.map((a) => {
                  const url = `${API}/chamados/anexos/${a.nome_armazenado}`;
                  const ext = (a.nome_original || '').split('.').pop()?.toUpperCase();
                  return (
                    <div
                      key={a.id}
                      className="anexo-item"
                      onClick={() => {
                        if (a.tipo === 'imagem') setLightbox(url);
                        else window.open(url, '_blank');
                      }}
                    >
                      <div className="anexo-item-icon">
                        <Paperclip size={14} />
                      </div>
                      <div className="anexo-item-info">
                        <span className="anexo-item-name">{a.nome_original}</span>
                        <span className="anexo-item-meta">{ext} · {(a.tamanho / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <a href={url} download={a.nome_original} className="btn-icon" title="Download" onClick={(e) => e.stopPropagation()}><Download size={14} /></a>
                      <button onClick={(e) => { e.stopPropagation(); removerAnexo(a.id); }} className="btn-icon btn-icon-danger" title="Remover"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="detalhe-section">
            <h3>Linha do Tempo</h3>
            {(() => {
              const statusFromHistory = (chamado.historico || [])
                .filter((h) => h.acao === 'status')
                .map((h) => {
                  const match = h.descricao.match(/"([^"]+)"/);
                  const label = match ? match[1] : '';
                  const key = Object.entries(STATUS_MAP).find(([, v]) => v.label === label)?.[0];
                  return { key: key || chamado.status, label, time: h.criado_em };
                })
                .reverse();
              const steps = [{ key: 'aberto', label: 'Aberto', time: chamado.criado_em }];
              statusFromHistory.forEach((s) => { if (!steps.find((st) => st.key === s.key)) steps.push(s); });
              return (
                <div className="timeline-h">
                  {steps.map((s, i) => (
                    <React.Fragment key={s.key + i}>
                      <div className={`timeline-step ${i === steps.length - 1 ? 'active' : 'past'}`} title={new Date(s.time).toLocaleString()}>
                        <div className="timeline-step-dot" />
                        <span className="timeline-step-label">{s.label}</span>
                        <span className="timeline-step-time">{new Date(s.time).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {i < steps.length - 1 && <div className="timeline-line done" />}
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="detalhe-section">
            <h3><CheckSquare size={16} /> Checklist ({checklist.filter((i) => i.concluido).length}/{checklist.length})</h3>
            <div className="checklist-list">
              {checklist.map((item) => (
                <div key={item.id} className={`checklist-item ${item.concluido ? 'done' : ''}`}>
                  <button className={`check-toggle ${item.concluido ? 'checked' : ''}`} onClick={() => toggleCheck(item)}>
                    {item.concluido && <Check size={12} />}
                  </button>
                  <span className="check-text">{item.texto}</span>
                  <button className="btn-icon btn-icon-danger" onClick={() => removeCheckItem(item.id)}><Trash2 size={12} /></button>
                </div>
              ))}
              {checklist.length === 0 && <p className="text-muted">Nenhum item na checklist.</p>}
            </div>
            <div className="checklist-add">
              <input value={novoCheck} onChange={(e) => setNovoCheck(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
                placeholder="Adicionar item..." />
              <button className="btn btn-sm btn-primary" onClick={addCheckItem}><PlusCircle size={14} /></button>
            </div>
          </div>

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
                const imgName = imgUrl ? imgUrl.split('/').pop() : 'imagem';
                return (
                  <div key={c.id} className="comentario-item">
                    <div className="comentario-header">
                      <strong>{c.autor}</strong>
                      <span>{new Date(c.criado_em).toLocaleString()}</span>
                    </div>
                    {displayText && <p>{displayText}</p>}
                    {imgUrl && (
                      <div className="comentario-anexo" onClick={() => setLightbox(imgUrl)}>
                        <Paperclip size={14} />
                        <span>{imgName}</span>
                        <a href={imgUrl} download className="btn-icon" onClick={(e) => e.stopPropagation()}><Download size={14} /></a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form className="comentario-form" onSubmit={enviarComentario}>
              <input value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="Adicionar comentário..." />
              <label className="comentario-img-btn" title="Anexar imagem (ou Ctrl+V)">
                <Image size={16} />
                <input type="file" accept="image/*" onChange={(e) => setComentImagem(e.target.files?.[0] || null)} hidden />
              </label>
              <button type="submit" disabled={!comentario.trim() && !comentImagem}>
                <Send size={16} />
              </button>
            </form>
            {comentImagem && (
              <div className="comentario-img-preview">
                <FileImage size={14} />
                <span>{comentImagem.name}</span>
                <button onClick={() => setComentImagem(null)}><XIcon size={12} /></button>
              </div>
            )}
          </div>
        </div>

        <div className="detalhe-sidebar">
          <div className="detalhe-section">
            <h3>Informações</h3>
            <dl>
              <dt>Solicitante</dt><dd>{chamado.solicitante}</dd>
              <dt>Técnico</dt><dd>{chamado.tecnico || tecnicoNome}</dd>
              <dt>Criado em</dt><dd>{new Date(chamado.criado_em).toLocaleString()}</dd>
              <dt>Atualizado em</dt><dd>{new Date(chamado.atualizado_em).toLocaleString()}</dd>
              {chamado.resolvido_em && (<><dt>Resolvido em</dt><dd>{new Date(chamado.resolvido_em).toLocaleString()}</dd></>)}
              <dt>Tempo em Andamento</dt>
              <dd className="tempo-timer">
                <Timer size={14} />
                <span>{elapsed}</span>
              </dd>
            </dl>
          </div>

          <div className="detalhe-section">
            <div className="gamification-bar">
              {(() => {
                const d = gamiData;
                if (!d) return <div className="loading">Carregando...</div>;
                const tempoRes = chamado.resolvido_em
                  ? (new Date(chamado.resolvido_em) - new Date(chamado.criado_em)) / 3600000
                  : null;
                const earnedBadges = (d.allBadges || []).filter(b => b.conquistado);
                const recentBadges = earnedBadges.slice(-3);
                return (
                  <div className="g-wrap">
                    <div className="g-top">
                      <div className="g-medal">{d.medal}</div>
                      <div className="g-text">
                        <span className="g-title">{d.usuario}</span>
                        <span className="g-sub">
                          {d.totalResolvidos} resolvidos · Nível {d.nivel}
                        </span>
                      </div>
                    </div>
                    <div className="g-mid">
                      <div className="g-progress-label">
                        <span>Progresso para {d.proximoNivel}</span>
                        <span>{d.progressoNivel}%</span>
                      </div>
                      <div className="g-progress-bar">
                        <div className="g-progress-fill" style={{ width: `${d.progressoNivel}%` }} />
                      </div>
                    </div>
                    <div className="g-bottom">
                      <div className="g-stats-row">
                        <span className="g-stat"><span className="g-stat-val">{d.totalResolvidos}</span> resolvidos</span>
                        <span className="g-stat"><span className="g-stat-val">{earnedBadges.length}</span> badges</span>
                        <span className="g-stat"><span className="g-stat-val">{d.streak}d</span> streak</span>
                        {tempoRes !== null && (
                          <span className="g-stat"><span className="g-stat-val">{tempoRes.toFixed(1)}h</span> SLA</span>
                        )}
                      </div>
                      {recentBadges.length > 0 && (
                        <div className="g-badges">
                          {recentBadges.map((b, i) => (
                            <span key={i} className="g-badge earned" title={b.descricao}>{b.icone}</span>
                          ))}
                        </div>
                      )}
                      {chamado.status !== 'resolvido' && (
                        <div className="g-hint">Resolva este chamado para ganhar badges!</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
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
            <div
              className={`resolve-dropzone ${resolveDragOver ? 'drag-over' : ''} ${resolucaoImg ? 'has-file' : ''}`}
              onClick={() => resolveFileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setResolveDragOver(true); }}
              onDragLeave={() => setResolveDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setResolveDragOver(false);
                const files = Array.from(e.dataTransfer.files || []);
                const img = files.find((f) => f.type.startsWith('image/'));
                if (img) setResolucaoImg(img);
              }}
            >
              {resolucaoImg ? (
                <div className="resolve-file-info">
                  <FileImage size={18} />
                  <span>{resolucaoImg.name}</span>
                  <button className="resolve-file-remove" onClick={(e) => { e.stopPropagation(); setResolucaoImg(null); }}>
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <div className="resolve-drop-hint">
                  <Upload size={20} />
                  <span>Arraste uma imagem aqui ou clique para selecionar</span>
                  <small>Ou cole com Ctrl+V</small>
                </div>
              )}
              <input
                ref={resolveFileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setResolucaoImg(e.target.files?.[0] || null)}
                hidden
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowResolve(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarResolucao}>Resolver Chamado</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}><XIcon size={16} /> Fechar</button>
          <img src={lightbox} alt="Visualização" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
