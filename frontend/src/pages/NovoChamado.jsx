import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X, File, Image, Film, Music, Tag, Bell, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { applyWatermark } from '../utils/watermark';
import './NovoChamado.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';
import { useTermos } from '../termos';

const API = API_URL;

export default function NovoChamado() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const termos = useTermos();
  const tecnicoNome = user?.nome || 'Cristian Raffi Cunha';
  const tipo = user?.tipo || 'TI';
  const fileInputRef = useRef(null);
  const alertaDateRef = useRef(null);
  const [form, setForm] = useState({
    titulo: '', descricao: '', prioridade: 'media',
    categoria: 'geral', solicitante: '',
  });
  const [arquivos, setArquivos] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [agendarAlerta, setAgendarAlerta] = useState(false);
  const [alerta, setAlerta] = useState({ data_hora: '', mensagem: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { add: addToast } = useToast();
  const { isOnline, enqueue } = useOffline();

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            if (arquivos.length >= 5) {
              setError('Máximo de 5 anexos por ' + termos.chamado + '.');
              return;
            }
            setArquivos((prev) => [...prev, file]);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [arquivos]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + arquivos.length > 5) {
      setError(`Máximo de 5 anexos por ${termos.chamado}.`);
      return;
    }
    setArquivos((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const nome = tagInput.trim().toLowerCase();
    if (nome && !tags.includes(nome) && tags.length < 10) {
      setTags([...tags, nome]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Film;
    if (file.type.startsWith('audio/')) return Music;
    return File;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim() || !form.solicitante.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (agendarAlerta && !alerta.data_hora) {
      setError('Informe a data e hora do alerta agendado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = { ...form, tags };
      if (agendarAlerta && alerta.data_hora) {
        body.alerta = { data_hora: alerta.data_hora.replace('T', ' '), mensagem: alerta.mensagem };
      }

      if (!isOnline) {
        enqueue({ url: `${API}/chamados`, method: 'POST', body: { ...body, tecnico: user?.nome || null } });
        if (arquivos.length > 0) {
          addToast(`${termos.Chamado} salvo offline. Anexos serão enviados somente com conexão.`, 'warning', 6000);
        } else {
          addToast(`${termos.Chamado} salvo offline e será sincronizado automaticamente.`, 'warning', 6000);
        }
        navigate('/chamados');
        return;
      }

      const res = await apiFetch(`${API}/chamados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, tecnico: user?.nome || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const chamado = await res.json();

      if (arquivos.length > 0) {
        const fd = new FormData();
        for (const f of arquivos) {
          const wm = await applyWatermark(f, tecnicoNome);
          fd.append('arquivos', wm);
        }
        await apiFetch(`${API}/chamados/${chamado.id}/anexos`, {
          method: 'POST',
          body: fd,
        });
      }

      addToast(`${termos.Chamado} criado com sucesso!`, 'success');
      navigate('/chamados');
    } catch (err) {
      setError(err.message);
      addToast('Erro ao criar ' + termos.chamado, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="novo-chamado-page">
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
          <h2>{termos.novoChamado}</h2>
          <span className="page-subtitle">Registre uma nova solicitação</span>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="titulo">Título *</label>
          <input id="titulo" name="titulo" value={form.titulo} onChange={handleChange}
            placeholder="Descreva o problema em poucas palavras" />
        </div>

        <div className="form-group">
          <label htmlFor="descricao">Descrição *</label>
          <textarea id="descricao" name="descricao" rows={5} value={form.descricao}
            onChange={handleChange} placeholder="Detalhe o problema, passos para reproduzir, etc." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="solicitante">Solicitante *</label>
            <input id="solicitante" name="solicitante" value={form.solicitante}
              onChange={handleChange} placeholder="Seu nome" />
          </div>
          <div className="form-group">
            <label htmlFor="categoria">Categoria</label>
            <select id="categoria" name="categoria" value={form.categoria} onChange={handleChange}>
              {tipo === 'TI' && (
                <>
                  <option value="geral">Geral</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="rede">Rede</option>
                  <option value="impressora">Impressora</option>
                  <option value="email">E-mail</option>
                  <option value="acesso">Acesso</option>
                  <option value="evento">Evento</option>
                  <option value="censura">Censura</option>
                </>
              )}
              <option value="gravacao">Gravação</option>
              <option value="edicao">Edição</option>
              <option value="postagem">Postagem</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade" value={form.prioridade} onChange={handleChange}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tags-input-row">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Adicionar tag e pressionar Enter"
            />
            <button type="button" className="btn btn-sm btn-primary" onClick={addTag}>
              <Tag size={14} />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((t) => (
                <span key={t} className="tag-chip">
                  {t}
                  <button type="button" onClick={() => removeTag(t)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="alerta-toggle-label">
            <input
              type="checkbox"
              className="alerta-checkbox"
              checked={agendarAlerta}
              onChange={(e) => setAgendarAlerta(e.target.checked)}
            />
            <Bell size={15} /> Agendar alerta para este {termos.chamado}
          </label>
          {agendarAlerta && (
            <div className="alerta-fields">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="alerta-data">Data e hora do alerta *</label>
                  <div className="datetime-picker-wrap">
                    <input
                      id="alerta-data"
                      ref={alertaDateRef}
                      type="datetime-local"
                      value={alerta.data_hora}
                      onChange={(e) => setAlerta({ ...alerta, data_hora: e.target.value })}
                      onClick={() => { try { alertaDateRef.current?.showPicker?.(); } catch (_) {} }}
                    />
                    <button
                      type="button"
                      className="datetime-picker-btn"
                      onClick={() => { try { alertaDateRef.current?.showPicker?.(); } catch (_) {} }}
                      title="Abrir calendário"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="alerta-mensagem">Mensagem do alerta</label>
                <input
                  id="alerta-mensagem"
                  type="text"
                  value={alerta.mensagem}
                  onChange={(e) => setAlerta({ ...alerta, mensagem: e.target.value })}
                  placeholder="Ex: Verificar status do chamado"
                />
              </div>
              <p className="alerta-hint">O alerta será disparado por e-mail e na tela do sistema na data e hora definidas.</p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Anexos ({arquivos.length}/5)</label>
          <div
            className="file-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []);
              if (files.length + arquivos.length > 5) {
setError(`Máximo de 5 anexos por ${termos.chamado}.`);
                return;
              }
              setArquivos((prev) => [...prev, ...files]);
            }}
          >
            <Upload size={22} />
            <span>Clique ou arraste arquivos aqui</span>
            <small>Imagens, vídeos, áudio (máx. 50MB cada)</small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {arquivos.length > 0 && (
            <div className="file-list">
              {arquivos.map((file, i) => {
                const FileIcon = getFileIcon(file);
                return (
                  <div key={i} className="file-item">
                    <FileIcon size={16} />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" className="file-remove" onClick={() => removeFile(i)}>
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/chamados')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} /> {loading ? 'Criando...' : 'Criar ' + termos.Chamado}
          </button>
        </div>
      </form>
    </div>
  );
}
