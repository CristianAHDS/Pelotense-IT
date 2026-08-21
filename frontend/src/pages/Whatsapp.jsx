import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Trash2,
  Save,
  Send,
  Phone,
  Link2,
  Power,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Maximize2,
  X,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './Whatsapp.css';
import usePageTitle from '../hooks/usePageTitle';

import { API_URL } from '../config';

const API = API_URL;

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length < 3) return d;
  if (d.length < 5) return `+${d.slice(0, 2)} (${d.slice(2)})`;
  if (d.length < 11) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, d.length - 4)}-${d.slice(d.length - 4)}`;
}

const STATUS_ENTREGA = {
  PENDING: { label: 'Enviando', cls: 'pending' },
  SERVER_ACK: { label: 'Enviado', cls: 'server' },
  DELIVERY_ACK: { label: 'Entregue', cls: 'delivered' },
  READ: { label: 'Lido', cls: 'read' },
};

const fmtHora = (dt) => {
  if (!dt) return '';
  const [d, t] = String(dt).split(' ');
  const hoje = new Date().toLocaleDateString('sv');
  const dia = (d || '').slice(5).split('-').reverse().join('/');
  const hora = (t || '').slice(0, 5);
  return d === hoje ? hora : `${dia} ${hora}`;
};

export default function Whatsapp() {
  const { add: addToast } = useToast();
  usePageTitle('WhatsApp');
  const [config, setConfig] = useState({
    ativo: false,
    api_url: 'http://localhost:8081',
    api_key: 'vz5fUF8aVxo2IAY0jkCLJ1Ks7SWHZMi6',
    instance: 'pelotense',
    numeros_permitidos: [],
    prefixos: [],
  });
  const [configCarregada, setConfigCarregada] = useState(false);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  const [novoNumero, setNovoNumero] = useState('');
  const [novoPrefixo, setNovoPrefixo] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNumero, setTestNumero] = useState('');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [atendimentos, setAtendimentos] = useState([]);
  const [finalizando, setFinalizando] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [showEntregasModal, setShowEntregasModal] = useState(false);

  const loadStatus = async () => {
    setChecking(true);
    try {
      const r = await fetch(`${API}/whatsapp/status`);
      setStatus(await r.json());
    } catch {
      setStatus({ conectado: false, erro: 'Não foi possível verificar a conexão' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetch(`${API}/whatsapp/config`)
      .then((r) => r.json())
      .then((data) =>
        setConfig({
          ativo: !!data.ativo,
          api_url: data.api_url || 'http://localhost:8081',
          api_key: data.api_key || 'vz5fUF8aVxo2IAY0jkCLJ1Ks7SWHZMi6',
          instance: data.instance || 'pelotense',
          numeros_permitidos: data.numeros_permitidos || [],
          prefixos: data.prefixos || [],
        }),
      )
      .catch(() => {})
      .finally(() => setConfigCarregada(true));
  }, []);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadAtendimentos = async () => {
    try {
      const r = await fetch(`${API}/whatsapp/sessoes`);
      setAtendimentos(await r.json());
    } catch {}
  };

  useEffect(() => {
    loadAtendimentos();
    const t = setInterval(loadAtendimentos, 15000);
    return () => clearInterval(t);
  }, []);

  const loadEntregas = async () => {
    try {
      const r = await fetch(`${API}/whatsapp/entregas?limit=50`);
      setEntregas(await r.json());
    } catch {}
  };

  useEffect(() => {
    loadEntregas();
    const t = setInterval(loadEntregas, 5000);
    return () => clearInterval(t);
  }, []);

  const finalizarAtendimento = async (numero) => {
    setFinalizando(numero);
    try {
      const r = await fetch(`${API}/whatsapp/finalizar-atendimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero }),
      });
      const data = await r.json();
      if (r.ok) {
        addToast('Atendimento finalizado!', 'success');
        loadAtendimentos();
      } else {
        addToast(data.error || 'Erro ao finalizar atendimento', 'error');
      }
    } catch {
      addToast('Erro ao finalizar atendimento', 'error');
    } finally {
      setFinalizando(null);
    }
  };

  const webhookUrl = /^https?:\/\//.test(API)
    ? `${API.replace(/\/api\/?$/, '')}/api/whatsapp/webhook`
    : `${window.location.origin}/api/whatsapp/webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/whatsapp/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ativo: config.ativo,
          api_url: config.api_url,
          api_key: config.api_key,
          instance: config.instance,
        }),
      });
      if (!r.ok) throw new Error();
      addToast('Configurações do WhatsApp salvas!', 'success');
    } catch {
      addToast('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const persistirListas = async (numeros, prefixos) => {
    try {
      const r = await fetch(`${API}/whatsapp/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeros_permitidos: numeros, prefixos }),
      });
      if (!r.ok) throw new Error();
      addToast('Lista de números salva!', 'success');
    } catch {
      addToast('Erro ao salvar a lista de números', 'error');
    }
  };

  const garantirConfigCarregada = () => {
    if (!configCarregada) {
      addToast('Aguarde o carregamento das configurações', 'error');
      return false;
    }
    return true;
  };

  const addNumero = () => {
    if (!garantirConfigCarregada()) return;
    const atual = configRef.current;
    const n = novoNumero.replace(/\D/g, '');
    if (!n) {
      addToast('Informe um número válido', 'error');
      return;
    }
    if (atual.numeros_permitidos.includes(n)) {
      addToast('Número já está na lista', 'error');
      return;
    }
    const novaLista = [...atual.numeros_permitidos, n];
    setConfig({ ...atual, numeros_permitidos: novaLista });
    setNovoNumero('');
    persistirListas(novaLista, atual.prefixos);
  };

  const removeNumero = (n) => {
    if (!garantirConfigCarregada()) return;
    const atual = configRef.current;
    const novaLista = atual.numeros_permitidos.filter((x) => x !== n);
    setConfig({ ...atual, numeros_permitidos: novaLista });
    persistirListas(novaLista, atual.prefixos);
  };

  const addPrefixo = () => {
    if (!garantirConfigCarregada()) return;
    const atual = configRef.current;
    const p = novoPrefixo.replace(/\D/g, '');
    if (!p) {
      addToast('Informe um prefixo válido', 'error');
      return;
    }
    if ((atual.prefixos || []).includes(p)) {
      addToast('Prefixo já está na lista', 'error');
      return;
    }
    const novaLista = [...(atual.prefixos || []), p];
    setConfig({ ...atual, prefixos: novaLista });
    setNovoPrefixo('');
    persistirListas(atual.numeros_permitidos, novaLista);
  };

  const removePrefixo = (p) => {
    if (!garantirConfigCarregada()) return;
    const atual = configRef.current;
    const novaLista = (atual.prefixos || []).filter((x) => x !== p);
    setConfig({ ...atual, prefixos: novaLista });
    persistirListas(atual.numeros_permitidos, novaLista);
  };

  const handleTeste = async () => {
    if (!testNumero) {
      addToast('Informe o número para o teste', 'error');
      return;
    }
    setTesting(true);
    try {
      const r = await fetch(`${API}/whatsapp/teste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: testNumero,
          mensagem: '✅ Teste do bot Pelotense IT!',
        }),
      });
      const data = await r.json();
      if (r.ok) addToast('Mensagem de teste enviada!', 'success');
      else addToast(data.error || 'Erro ao enviar teste', 'error');
    } catch {
      addToast('Erro ao enviar teste', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="whatsapp-page">
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
        <h2>WhatsApp</h2>
        <span className="page-subtitle">
          Chatbot de atendimento de chamados
        </span>
      </div>

      <div className="wa-grid">
        <div className="wa-card wa-card-full wa-status-card">
          <h3>
            <MessageCircle size={16} /> Status da conexão
          </h3>
          <div className="wa-conn">
            <span className={`wa-conn-dot ${status?.conectado ? 'on' : 'off'}`} />
            <div className="wa-conn-info">
              {status?.conectado ? (
                <>
                  <span className="wa-conn-title">Conectado</span>
                  <span className="wa-conn-meta">
                    Número do bot: <strong>{status.numero || '—'}</strong>
                    {status.instancia ? ` · Instância: ${status.instancia}` : ''}
                    {status.nome ? ` · ${status.nome}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className="wa-conn-title">Desconectado</span>
                  <span className="wa-conn-meta">
                    {status?.erro || status?.estado || 'Instância não conectada. Escaneie o QR Code no Manager.'}
                  </span>
                </>
              )}
            </div>
            <button
              className="btn btn-outline"
              onClick={loadStatus}
              disabled={checking}
            >
              <RefreshCw size={15} /> {checking ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </div>

        <div className="wa-card">
          <h3>
            <MessageCircle size={16} /> Conexão com a Evolution API
          </h3>

          <label className="toggle-row">
            <span>Ativar bot do WhatsApp</span>
            <input
              type="checkbox"
              checked={config.ativo}
              onChange={(e) =>
                setConfig({ ...config, ativo: e.target.checked })
              }
            />
          </label>

          <div className="form-group" style={{ marginTop: 10 }}>
            <label>URL da Evolution API</label>
            <input
              type="text"
              placeholder="http://localhost:8081"
              value={config.api_url}
              onChange={(e) =>
                setConfig({ ...config, api_url: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>API Key (apikey)</label>
            <input
              type="password"
              placeholder="Chave da Evolution API"
              value={config.api_key}
              onChange={(e) =>
                setConfig({ ...config, api_key: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Instância (nome da conexão)</label>
            <input
              type="text"
              placeholder="ex: pelotense"
              value={config.instance}
              onChange={(e) =>
                setConfig({ ...config, instance: e.target.value })
              }
            />
          </div>
        </div>

        <div className="wa-card">
          <h3>
            <ShieldCheck size={16} /> Números autorizados
          </h3>
          <p className="wa-hint">
            O bot só responde aos números abaixo ou aos prefixos. Qualquer
            número fora destas listas será ignorado.
          </p>
          <p className="wa-hint" style={{ marginTop: 6 }}>
            As listas são salvas automaticamente ao adicionar ou remover.
          </p>
          <div className="wa-number-add">
            <input
              type="text"
              placeholder="+55 (53) 98469-4379"
              value={novoNumero}
              onChange={(e) => setNovoNumero(maskPhone(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addNumero();
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={addNumero}
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>

          <div className="wa-numbers">
            {config.numeros_permitidos.length === 0 && (
              <div className="wa-empty">
                Nenhum número autorizado. Adicione ao menos um número.
              </div>
            )}
            {config.numeros_permitidos.map((n) => (
              <div key={n} className="wa-number-item">
                <Phone size={14} />
                <span className="wa-number">{n}</span>
                <button
                  type="button"
                  className="wa-number-remove"
                  onClick={() => removeNumero(n)}
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <h4 className="wa-subtitle">Faixas de números (prefixos)</h4>
            <p className="wa-hint" style={{ marginTop: 6 }}>
              Um prefixo autoriza todos os números que começam com ele (ex:{' '}
              <strong>55533029</strong> libera 55533029-0000 até 55533029-9999).
            </p>
            <div className="wa-number-add">
              <input
                type="text"
                placeholder="Prefixo (ex: 55533029)"
                value={novoPrefixo}
                onChange={(e) => setNovoPrefixo(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPrefixo();
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={addPrefixo}
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
            <div className="wa-numbers">
              {(config.prefixos || []).length === 0 ? (
                <div className="wa-empty">Nenhum prefixo autorizado.</div>
              ) : (
                (config.prefixos || []).map((p) => (
                  <div key={p} className="wa-number-item">
                    <Phone size={14} />
                    <span className="wa-number">{p}*</span>
                    <button
                      type="button"
                      className="wa-number-remove"
                      onClick={() => removePrefixo(p)}
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="wa-card wa-card-full">
          <h3>
            <UserCheck size={16} /> Atendimentos humanos em andamento
          </h3>
          <p className="wa-hint">
            Quando alguém escolhe a opção "Falar com atendente", o bot entra em
            silêncio e o número aparece aqui. Finalize aqui ou enviando{' '}
            <strong>#finalizar</strong> pelo WhatsApp do atendente.
          </p>
          <div className="wa-atendimentos">
            {atendimentos.length === 0 ? (
              <div className="wa-empty">
                Nenhum atendimento humano em andamento.
              </div>
            ) : (
              atendimentos.map((s) => (
                <div key={s.numero} className="wa-atendimento-item">
                  <Phone size={14} />
                  <span className="wa-number">{s.numero}</span>
                  <Link
                    className="btn btn-outline wa-chat-btn"
                    to={`/whatsapp/chat/${s.numero}`}
                  >
                    <MessageCircle size={14} /> Abrir chat
                  </Link>
                  <button
                    className="btn btn-outline"
                    onClick={() => finalizarAtendimento(s.numero)}
                    disabled={finalizando === s.numero}
                  >
                    <UserCheck size={14} />{' '}
                    {finalizando === s.numero ? 'Finalizando...' : 'Finalizar'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="wa-card wa-card-full">
          <h3>
            <Send size={16} /> Entrega de mensagens
            <button
              className="wa-expand-btn"
              onClick={() => setShowEntregasModal(true)}
              title="Ver lista completa"
              style={{ marginLeft: 'auto' }}
            >
              <Maximize2 size={15} />
            </button>
          </h3>
          <p className="wa-hint">
            Últimas 4 mensagens. Status em tempo real (Enviando → Enviado →
            Entregue → Lido).
          </p>
          <div className="wa-entregas">
            {entregas.length === 0 ? (
              <div className="wa-empty">
                Nenhuma mensagem enviada recentemente.
              </div>
            ) : (
              entregas.slice(0, 4).map((e) => {
                const st =
                  STATUS_ENTREGA[e.status] || { label: e.status, cls: 'server' };
                return (
                  <div key={e.mensagem_id} className="wa-entrega-item">
                    <span className="wa-entrega-texto">
                      {e.texto || '(mensagem)'}
                    </span>
                    <span className="wa-entrega-numero">{e.numero}</span>
                    <span className="wa-entrega-hora">{fmtHora(e.atualizado_em)}</span>
                    <span className={`wa-entrega-status ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="wa-card wa-card-full">
          <h3>
            <Link2 size={16} /> Webhook e teste
          </h3>
          <div className="form-group">
            <label>URL do Webhook (configure na Evolution API)</label>
            <div className="wa-webhook">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </div>
            <span className="wa-hint">
              Evento: <strong>MESSAGES_UPSERT</strong>. A Evolution API enviará
              as mensagens recebidas para este endereço.
            </span>
          </div>
          <div className="wa-test-row">
            <div className="form-group wa-test-numero">
              <label>Número para teste</label>
              <input
                type="text"
                placeholder="+55 (53) 98469-4379"
                value={testNumero}
                onChange={(e) => setTestNumero(maskPhone(e.target.value))}
              />
            </div>
            <button
              className="btn btn-outline"
              onClick={handleTeste}
              disabled={testing}
            >
              <Send size={16} /> {testing ? 'Enviando...' : 'Enviar teste'}
            </button>
          </div>
        </div>
      </div>

      <div className="wa-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
        <span className="wa-status">
          <Power size={14} /> Bot {config.ativo ? 'ativo' : 'inativo'}
        </span>
      </div>

      {showEntregasModal && (
        <div
          className="wa-modal-overlay"
          onClick={() => setShowEntregasModal(false)}
        >
          <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-head">
              <h3>
                <Send size={16} /> Entrega de mensagens
              </h3>
              <button
                className="wa-modal-close"
                onClick={() => setShowEntregasModal(false)}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="wa-modal-body">
              {entregas.length === 0 ? (
                <div className="wa-empty">
                  Nenhuma mensagem enviada recentemente.
                </div>
              ) : (
                entregas.map((e) => {
                  const st =
                    STATUS_ENTREGA[e.status] ||
                    { label: e.status, cls: 'server' };
                  return (
                    <div key={e.mensagem_id} className="wa-entrega-item">
                      <span className="wa-entrega-texto">
                        {e.texto || '(mensagem)'}
                      </span>
                      <span className="wa-entrega-numero">{e.numero}</span>
                      <span className="wa-entrega-hora">{fmtHora(e.atualizado_em)}</span>
                      <span className={`wa-entrega-status ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
