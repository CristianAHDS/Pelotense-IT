import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Phone,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './Whatsapp.css';
import usePageTitle from '../hooks/usePageTitle';

import { API_URL } from '../config';

const API = API_URL;

const fmtHoraChat = (dt) => {
  if (!dt) return '';
  const [d, t] = String(dt).split(' ');
  const hoje = new Date().toLocaleDateString('sv');
  const dia = (d || '').slice(5).split('-').reverse().join('/');
  const hora = (t || '').slice(0, 5);
  return d === hoje ? hora : `${dia} ${hora}`;
};

export default function WhatsappChat() {
  const { numero } = useParams();
  usePageTitle('WhatsApp');
  const navigate = useNavigate();
  const { add: addToast } = useToast();
  const [mensagens, setMensagens] = useState([]);
  const [ativo, setAtivo] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const bottomRef = useRef(null);

  const loadMensagens = async () => {
    try {
      const r = await fetch(`${API}/whatsapp/chat/${numero}`);
      const data = await r.json();
      setMensagens(data || []);
    } catch {}
    try {
      const r = await fetch(`${API}/whatsapp/sessoes`);
      const list = await r.json();
      setAtivo((list || []).some((s) => s.numero === numero));
    } catch {}
  };

  useEffect(() => {
    loadMensagens();
    const t = setInterval(loadMensagens, 5000);
    return () => clearInterval(t);
  }, [numero]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleEnviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo) return;
    setEnviando(true);
    try {
      const r = await fetch(`${API}/whatsapp/chat/${numero}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo }),
      });
      const data = await r.json();
      if (!r.ok) {
        addToast(data.error || 'Erro ao enviar mensagem', 'error');
        return;
      }
      setTexto('');
      loadMensagens();
    } catch {
      addToast('Erro ao enviar mensagem', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    try {
      const r = await fetch(`${API}/whatsapp/finalizar-atendimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero }),
      });
      const data = await r.json();
      if (r.ok) {
        addToast('Atendimento finalizado!', 'success');
        navigate('/whatsapp');
      } else {
        addToast(data.error || 'Erro ao finalizar atendimento', 'error');
      }
    } catch {
      addToast('Erro ao finalizar atendimento', 'error');
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="whatsapp-page wa-chat-page">
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
        <div className="wa-chat-head">
          <Link to="/whatsapp" className="btn btn-outline" title="Voltar">
            <ArrowLeft size={16} />
          </Link>
          <div className="wa-chat-head-info">
            <h2>Atendimento humano</h2>
            <span className="wa-chat-head-numero">
              <Phone size={13} /> {numero}
            </span>
          </div>
          {!ativo && <span className="wa-chat-inativo">Encerrado</span>}
        </div>
      </div>

      <div className="wa-card wa-card-full wa-chat-card">
        <div className="wa-chat-status">
          <span className={`wa-conn-dot ${ativo ? 'on' : 'off'}`} />
          {ativo
            ? 'Atendimento humano em andamento — o bot está em silêncio'
            : 'Atendimento encerrado — bot voltou ao menu'}
        </div>

        <div className="wa-chat-mensagens">
          {mensagens.length === 0 ? (
            <div className="wa-empty">
              Nenhuma mensagem neste atendimento ainda.
            </div>
          ) : (
            mensagens.map((m) => (
              <div
                key={m.id}
                className={`wa-msg ${m.origem === 'atendente' ? 'mine' : 'theirs'}`}
              >
                <div className="wa-msg-bubble">
                  <span>{m.conteudo}</span>
                  <span className="wa-msg-hora">{fmtHoraChat(m.criado_em)}</span>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="wa-chat-input">
          <input
            type="text"
            placeholder={ativo ? 'Escreva sua resposta...' : 'Atendimento encerrado'}
            value={texto}
            disabled={!ativo || enviando}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleEnviar();
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleEnviar}
            disabled={!ativo || enviando || !texto.trim()}
          >
            <Send size={16} /> {enviando ? 'Enviando...' : 'Enviar'}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleFinalizar}
            disabled={!ativo || finalizando}
            title="Finalizar atendimento"
          >
            <UserCheck size={16} />
            {finalizando ? 'Finalizando...' : 'Finalizar'}
          </button>
        </div>

        <div className="wa-chat-hint">
          <MessageCircle size={13} /> As respostas enviadas aqui vão direto para
          o WhatsApp do cliente. Ao finalizar, o bot volta ao menu.
        </div>
      </div>
    </div>
  );
}