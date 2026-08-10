import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X, File, Image, Film, Music, Tag } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './NovoChamado.css';

const API = '/api';

export default function NovoChamado() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    titulo: '', descricao: '', prioridade: 'media',
    categoria: 'geral', solicitante: '',
  });
  const [arquivos, setArquivos] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { add: addToast } = useToast();

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
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/chamados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const chamado = await res.json();

      if (arquivos.length > 0) {
        const fd = new FormData();
        arquivos.forEach((f) => fd.append('arquivos', f));
        await fetch(`${API}/chamados/${chamado.id}/anexos`, {
          method: 'POST',
          body: fd,
        });
      }

      addToast('Chamado criado com sucesso!', 'success');
      navigate('/chamados');
    } catch (err) {
      setError(err.message);
      addToast('Erro ao criar chamado', 'error');
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
        <div>
          <h2>Novo Chamado</h2>
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
              <option value="geral">Geral</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="rede">Rede</option>
              <option value="impressora">Impressora</option>
              <option value="email">E-mail</option>
              <option value="acesso">Acesso</option>
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
          <label>Anexos ({arquivos.length}/5)</label>
          <div
            className="file-dropzone"
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
            <Save size={18} /> {loading ? 'Criando...' : 'Criar Chamado'}
          </button>
        </div>
      </form>
    </div>
  );
}
