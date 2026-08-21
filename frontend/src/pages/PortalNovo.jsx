import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X, File, Image, Film, Music } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { applyWatermark } from '../utils/watermark';
import './Portal.css';
import usePageTitle from '../hooks/usePageTitle';

import { API_URL } from '../config';

const API = API_URL;

export default function PortalNovo() {
  const navigate = useNavigate();
  usePageTitle('Portal — Novo Chamado');
  const { add: addToast } = useToast();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    titulo: '', descricao: '', prioridade: 'media',
    categoria: 'geral', solicitante: '',
  });
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setArquivos((prev) => {
              if (prev.length >= 5) {
                setError('Máximo de 5 anexos por chamado.');
                return prev;
              }
              return [...prev, file];
            });
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + arquivos.length > 5) {
      setError('Máximo de 5 anexos por chamado.');
      return;
    }
    setArquivos((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/chamados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const chamado = await res.json();

      if (arquivos.length > 0) {
        const fd = new FormData();
        for (const f of arquivos) {
          const wm = await applyWatermark(f);
          fd.append('arquivos', wm);
        }
        await fetch(`${API}/chamados/${chamado.id}/anexos`, {
          method: 'POST',
          body: fd,
        });
      }

      addToast('Chamado criado com sucesso!', 'success');
      navigate('/portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page anim-fadeIn">
      <div className="portal-hero portal-hero-sm">
        <div className="portal-particles">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="portal-particle" style={{
              left: (10 + i * 35) + '%',
              animationDelay: (i * 0.7) + 's',
              animationDuration: (3 + i * 0.4) + 's',
            }} />
          ))}
        </div>
        <h1 className="portal-title">Novo Chamado</h1>
        <p className="portal-sub">Descreva seu problema e entraremos em contato em breve</p>
      </div>

      <form className="portal-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Seu e-mail ou nome *</label>
          <input
            name="solicitante"
            value={form.solicitante}
            onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
            placeholder="Como podemos identificá-lo?"
          />
        </div>

        <div className="form-group">
          <label>Título *</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Resuma o problema"
          />
        </div>

        <div className="form-group">
          <label>Descrição *</label>
          <textarea
            name="descricao"
            rows={5}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhe o problema. Quanto mais informações, mais rápido resolveremos!"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Categoria</label>
            <select name="categoria" value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option value="geral">Geral</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="rede">Rede</option>
              <option value="impressora">Impressora</option>
              <option value="email">E-mail</option>
              <option value="acesso">Acesso</option>
              <option value="evento">Evento</option>
              <option value="censura">Censura</option>
              <option value="gravacao">Gravação</option>
              <option value="edicao">Edição</option>
              <option value="postagem">Postagem</option>
              <option value="transmissao">Transmissão</option>
              <option value="operacao">Operação</option>
              <option value="sonorizacao">Sonorização</option>
            </select>
          </div>
          <div className="form-group">
            <label>Prioridade</label>
            <select name="prioridade" value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Anexos ({arquivos.length}/5)</label>
          <div
            className="portal-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []);
              if (files.length + arquivos.length > 5) {
                setError('Máximo de 5 anexos por chamado.');
                return;
              }
              setArquivos((prev) => [...prev, ...files]);
            }}
          >
            <Upload size={20} />
            <span>Clique ou arraste arquivos</span>
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

        <button type="submit" className="btn btn-primary portal-submit" disabled={loading}>
          <Save size={18} /> {loading ? 'Enviando...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}
