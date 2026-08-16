import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  RemoveFormatting,
  Undo2,
  Redo2,
  Paperclip,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './EnviarEmail.css';

import { API_URL } from '../config';

const API = API_URL;

const EMAIL_PRESETS = [
  {
    id: 'boas-vindas',
    icone: '👋',
    titulo: 'Boas-vindas',
    desc: 'Mensagem de boas-vindas para novos usuários',
    assunto: 'Bem-vindo(a) à Pelotense IT!',
    corpo:
      '<p>Olá,</p><p>É um prazer recebê-lo(a) na <strong>Pelotense IT</strong>! A partir de agora você pode acompanhar e abrir chamados pela nossa plataforma.</p><p>Se precisar de ajuda, entre em contato com a equipe de TI.</p><p>Atenciosamente,<br>Equipe Pelotense IT</p>',
  },
  {
    id: 'manutencao',
    icone: '🔧',
    titulo: 'Manutenção programada',
    desc: 'Aviso de manutenção no sistema',
    assunto: 'Aviso: manutenção programada',
    corpo:
      '<p>Prezados,</p><p>Informamos que haverá uma <strong>manutenção programada</strong> em nossos sistemas.</p><ul><li><strong>Data:</strong> __/__/____</li><li><strong>Horário:</strong> __:__ às __:__</li><li><strong>Impacto:</strong> indisponibilidade temporária dos serviços</li></ul><p>Pedimos desculpas pelo transtorno e agradecemos a compreensão.</p><p>Equipe Pelotense IT</p>',
  },
  {
    id: 'atualizacao',
    icone: '⬆️',
    titulo: 'Atualização de sistema',
    desc: 'Comunicado sobre novas funcionalidades',
    assunto: 'Novidades: atualização do sistema',
    corpo:
      '<p>Olá,</p><p>Temos novidades! Lançamos uma <strong>nova atualização</strong> com melhorias e correções:</p><ul><li>Melhorias de desempenho</li><li>Correções de bugs</li><li>Novas funcionalidades</li></ul><p>As mudanças já estão disponíveis para uso.</p><p>Equipe Pelotense IT</p>',
  },
  {
    id: 'comunicado',
    icone: '📢',
    titulo: 'Comunicado geral',
    desc: 'Aviso geral para toda a equipe',
    assunto: 'Comunicado',
    corpo:
      '<p>Prezados,</p><p>Segue um comunicado importante para toda a equipe.</p><p></p><p>Atenciosamente,<br>Equipe Pelotense IT</p>',
  },
  {
    id: 'seguranca',
    icone: '🔒',
    titulo: 'Alerta de segurança',
    desc: 'Orientações sobre segurança digital',
    assunto: 'Alerta de segurança',
    corpo:
      '<p>Atenção!</p><p>Identificamos a necessidade de reforçar a segurança digital. Pedimos que sigam as orientações abaixo:</p><ul><li>Não compartilhe suas senhas</li><li>Ative a verificação em duas etapas</li><li>Desconfie de e-mails suspeitos</li></ul><p>Em caso de dúvidas, procure a equipe de TI.</p>',
  },
  {
    id: 'reuniao',
    icone: '📅',
    titulo: 'Convite de reunião',
    desc: 'Convite para reunião/evento',
    assunto: 'Convite: reunião',
    corpo:
      '<p>Olá,</p><p>Você está convidado(a) para uma <strong>reunião</strong>.</p><ul><li><strong>Data:</strong> __/__/____</li><li><strong>Horário:</strong> __:__</li><li><strong>Local:</strong> ____________</li></ul><p>Contamos com a sua presença.</p>',
  },
];

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

export default function EnviarEmail() {
  const { add: addToast } = useToast();
  const [form, setForm] = useState({ para: '', assunto: '' });
  const [arquivos, setArquivos] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/email/config`)
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({ ...f, para: data.destinatarios || f.para }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const exec = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleLink = () => {
    const url = window.prompt('URL do link:', 'https://');
    if (url) exec('createLink', url);
  };

  const getHtml = () => (editorRef.current ? editorRef.current.innerHTML : '');

  const applyPreset = (p) => {
    setForm((f) => ({ ...f, assunto: p.assunto }));
    if (editorRef.current) editorRef.current.innerHTML = p.corpo;
    addToast(`Preset "${p.titulo}" aplicado!`, 'success');
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setArquivos((prev) => {
      const next = [...prev];
      files.forEach((f) => {
        if (!next.some((a) => a.name === f.name && a.size === f.size))
          next.push(f);
      });
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx) =>
    setArquivos((prev) => prev.filter((_, i) => i !== idx));

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!form.assunto.trim()) {
      addToast('Informe o assunto do e-mail', 'error');
      return;
    }
    const html = getHtml();
    if (!stripHtml(html)) {
      addToast('Informe a mensagem do e-mail', 'error');
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('para', form.para);
      fd.append('assunto', form.assunto);
      fd.append('mensagem', html);
      arquivos.forEach((f) => fd.append('arquivos', f));

      const r = await fetch(`${API}/email/enviar`, {
        method: 'POST',
        body: fd,
      });
      const data = await r.json();
      if (r.ok) {
        addToast('E-mail enviado com sucesso!', 'success');
        setForm((f) => ({ ...f, assunto: '' }));
        setArquivos([]);
        if (editorRef.current) editorRef.current.innerHTML = '';
      } else {
        addToast(data.error || 'Erro ao enviar e-mail', 'error');
      }
    } catch {
      addToast('Erro ao enviar e-mail', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="enviar-email-page">
      <div className="page-header">
        <div className="header-particles">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="header-particle"
              style={{
                left: 5 + i * 20 + '%',
                animationDelay: i * 0.6 + 's',
                animationDuration: 3 + i * 0.4 + 's',
              }}
            />
          ))}
        </div>
        <h2>Envio de E-mails</h2>
        <span className="page-subtitle">
          Componha e envie e-mails personalizados
        </span>
      </div>

      <div className="ee-grid">
        <div className="ee-card ee-composer">
          <h3>
            <Send size={16} /> Novo E-mail
          </h3>

          <div className="form-group">
            <label>Para (separados por vírgula)</label>
            <input
              type="text"
              placeholder="admin@exemplo.com, tecnico@exemplo.com"
              value={form.para}
              disabled={loading}
              onChange={(e) => setForm({ ...form, para: e.target.value })}
            />
            {!form.para && !loading && (
              <span className="ee-hint">
                Se vazio, será usado o destinatário padrão das configurações.
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Assunto</label>
            <input
              type="text"
              placeholder="Assunto do e-mail"
              value={form.assunto}
              onChange={(e) => setForm({ ...form, assunto: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Mensagem</label>
            <div className="ee-editor">
              <div className="ee-toolbar">
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Negrito"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('bold')}
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Itálico"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('italic')}
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Sublinhado"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('underline')}
                >
                  <Underline size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Tachado"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('strikeThrough')}
                >
                  <Strikethrough size={15} />
                </button>
                <span className="ee-tb-sep" />
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Título"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('formatBlock', 'h2')}
                >
                  <Heading2 size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Subtítulo"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('formatBlock', 'h3')}
                >
                  <Heading3 size={15} />
                </button>
                <span className="ee-tb-sep" />
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Lista"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('insertUnorderedList')}
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Lista numerada"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('insertOrderedList')}
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Citação"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('formatBlock', 'blockquote')}
                >
                  <Quote size={15} />
                </button>
                <span className="ee-tb-sep" />
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Inserir link"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleLink}
                >
                  <Link2 size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Limpar formatação"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('removeFormat')}
                >
                  <RemoveFormatting size={15} />
                </button>
                <span className="ee-tb-sep" />
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Desfazer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('undo')}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  className="ee-tb-btn"
                  title="Refazer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('redo')}
                >
                  <Redo2 size={15} />
                </button>
              </div>
              <div
                ref={editorRef}
                className="ee-editor-body"
                contentEditable
                data-placeholder="Escreva sua mensagem..."
                suppressContentEditableWarning
              />
            </div>
          </div>

          <div className="form-group">
            <label>Anexos ({arquivos.length})</label>
            <button
              type="button"
              className="ee-attach-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={15} /> Adicionar arquivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFiles}
            />
            {arquivos.length > 0 && (
              <div className="ee-attachments">
                {arquivos.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="ee-attachment-item">
                    <FileText size={15} />
                    <span className="ee-attachment-name">{f.name}</span>
                    <span className="ee-attachment-size">
                      {formatSize(f.size)}
                    </span>
                    <button
                      type="button"
                      className="ee-attachment-remove"
                      onClick={() => removeFile(i)}
                      title="Remover"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ee-actions">
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending}
            >
              <Send size={16} /> {sending ? 'Enviando...' : 'Enviar E-mail'}
            </button>
            <span
              className="ee-hint"
              style={{ alignSelf: 'center', marginTop: 0 }}
            >
              Formatos de anexo aceitos: imagens, PDF, Office, ZIP e áudio/vídeo
              (até 25 MB cada, máx. 5).
            </span>
          </div>
        </div>

        <div className="ee-sidebar">
          <div className="ee-card ee-side-card">
            <h3>Dicas</h3>
            <ul className="ee-tips">
              <li>
                O e-mail é enviado pela configuração SMTP definida em{' '}
                <strong>Configurações</strong>.
              </li>
              <li>
                Deixe <strong>Para</strong> vazio para usar o destinatário
                padrão.
              </li>
              <li>Separe vários destinatários por vírgula.</li>
              <li>
                Use a barra de formatação para negrito, listas, títulos e links.
              </li>
              <li>
                Os presets são modelos prontos que você pode editar livremente.
              </li>
            </ul>
          </div>
          <div className="ee-card ee-side-card">
            <h3>
              <Sparkles size={16} /> Presets prontos
            </h3>
            <p className="ee-side-sub">
              Clique para preencher assunto e mensagem.
            </p>
            <div className="ee-presets">
              {EMAIL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ee-preset-item"
                  onClick={() => applyPreset(p)}
                >
                  <span className="ee-preset-icon">{p.icone}</span>
                  <span className="ee-preset-info">
                    <span className="ee-preset-title">{p.titulo}</span>
                    <span className="ee-preset-desc">{p.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
