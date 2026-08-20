import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, Plus, Trash2, RefreshCw, Server, Globe, Radio,
  Power, CheckCircle2, XCircle, Wifi, MonitorDot, Gauge,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api';
import './Rede.css';

import { API_URL } from '../config';

const API = API_URL;

const TIPOS = {
  ping: { label: 'Ping', icon: Radio },
  porta: { label: 'Porta', icon: Server },
  http: { label: 'HTTP', icon: Globe },
};

const fmtLatencia = (ms) => (ms == null ? '—' : `${ms} ms`);

const BYTES_TESTE = 25 * 1024 * 1024;

export default function Rede() {
  const { add: addToast } = useToast();
  const [hosts, setHosts] = useState([]);
  const [resultados, setResultados] = useState({});
  const [checking, setChecking] = useState(false);
  const [verificadoEm, setVerificadoEm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', tipo: 'ping', alvo: '', porta: '80' });
  const [salvando, setSalvando] = useState(false);
  const [dispositivos, setDispositivos] = useState([]);
  const [infoRede, setInfoRede] = useState({});
  const [escaneando, setEscaneando] = useState(false);
  const [paginaDispositivos, setPaginaDispositivos] = useState(1);
  const [teste, setTeste] = useState({ rodando: false, progresso: 0, downloadMbps: null, pingMs: null, erro: null });

  const verificandoRef = useRef(false);
  const verificar = useCallback(async (silencioso = false) => {
    if (verificandoRef.current) return;
    verificandoRef.current = true;
    if (!silencioso) setChecking(true);
    try {
      const r = await apiFetch(`${API}/rede/verificar`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) {
        if (!silencioso) addToast(data.error || 'Erro ao verificar a rede', 'error');
        return;
      }
      const map = {};
      for (const h of data.hosts || []) map[h.id] = h;
      setResultados(map);
      setVerificadoEm(data.verificados_em);
    } catch {
      if (!silencioso) addToast('Erro de conexão ao verificar', 'error');
    } finally {
      setChecking(false);
      verificandoRef.current = false;
    }
  }, [addToast]);

  const carregarHosts = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/rede`);
      const data = await r.json();
      if (r.ok) setHosts(Array.isArray(data) ? data : []);
    } catch {
      addToast('Erro ao carregar hosts monitorados', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const adicionar = async () => {
    if (!form.nome.trim() || !form.alvo.trim()) {
      addToast('Informe nome e alvo do host', 'error');
      return;
    }
    setSalvando(true);
    try {
      const r = await apiFetch(`${API}/rede`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          tipo: form.tipo,
          alvo: form.alvo,
          porta: form.tipo === 'porta' ? form.porta : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        addToast(data.error || 'Erro ao adicionar host', 'error');
        return;
      }
      addToast('Host adicionado ao monitoramento!', 'success');
      setForm({ nome: '', tipo: 'ping', alvo: '', porta: '80' });
      await carregarHosts();
      await verificar();
    } catch {
      addToast('Erro ao adicionar host', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (h) => {
    try {
      const r = await apiFetch(`${API}/rede/${h.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !h.ativo }),
      });
      if (!r.ok) {
        addToast('Erro ao atualizar host', 'error');
        return;
      }
      await carregarHosts();
      await verificar(true);
    } catch {
      addToast('Erro ao atualizar host', 'error');
    }
  };

  const remover = async (h) => {
    if (!window.confirm(`Remover "${h.nome}" do monitoramento?`)) return;
    try {
      const r = await apiFetch(`${API}/rede/${h.id}`, { method: 'DELETE' });
      if (!r.ok) {
        addToast('Erro ao remover host', 'error');
        return;
      }
      addToast('Host removido!', 'success');
      const nova = { ...resultados };
      delete nova[h.id];
      setResultados(nova);
      await carregarHosts();
    } catch {
      addToast('Erro ao remover host', 'error');
    }
  };

  const escanearRede = useCallback(async (rapido = false) => {
    setEscaneando(!rapido);
    try {
      const r = await apiFetch(`${API}/rede/dispositivos${rapido ? '?rapido=1' : ''}`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) {
        addToast(data.error || 'Erro ao escanear a rede', 'error');
        return;
      }
      setDispositivos(Array.isArray(data.dispositivos) ? data.dispositivos : []);
      setPaginaDispositivos(1);
      setInfoRede({ ip_local: data.ip_local, base: data.base });
    } catch {
      if (!rapido) addToast('Erro ao escanear a rede', 'error');
    } finally {
      setEscaneando(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregarHosts();
    verificar(true);
    escanearRede();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') verificar(true);
    }, 60000);
    return () => clearInterval(t);
  }, [carregarHosts, verificar, escanearRede]);

  const medirPing = async () => {
    const tempos = [];
    for (let i = 0; i < 5; i++) {
      try {
        const r = await apiFetch(`${API}/rede/speedtest/ping`, { method: 'POST', cache: 'no-store' });
        const data = await r.json();
        if (data.latencia != null) tempos.push(data.latencia);
      } catch {}
    }
    return tempos.length ? Math.min(...tempos) : null;
  };

  const executarSpeedTest = async () => {
    if (teste.rodando) return;
    setTeste({ rodando: true, progresso: 0, downloadMbps: null, pingMs: null, erro: null });
    try {
      const pingMs = await medirPing();
      const t0 = performance.now();
      const resp = await apiFetch(`${API}/rede/speedtest/download?bytes=${BYTES_TESTE}`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!resp.ok || !resp.body) throw new Error();
      const reader = resp.body.getReader();
      let recebido = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        recebido += value.length;
        setTeste((s) => ({ ...s, progresso: Math.round((recebido / BYTES_TESTE) * 100) }));
      }
      const segundos = (performance.now() - t0) / 1000;
      const mbps = segundos > 0 ? (recebido * 8) / 1_000_000 / segundos : 0;
      setTeste({ rodando: false, progresso: 100, downloadMbps: mbps, pingMs, erro: null });
    } catch {
      setTeste({ rodando: false, progresso: 0, downloadMbps: null, pingMs: null, erro: 'Falha ao executar o teste de velocidade' });
    }
  };

  const ativos = hosts.filter((h) => h.ativo);
  const online = ativos.filter((h) => resultados[h.id]?.online).length;
  const offline = ativos.length - online;

  return (
    <div className="rede-page">
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
        <h2>Monitoramento de Rede</h2>
        <span className="page-subtitle">Status de hosts, portas e serviços em tempo real</span>
      </div>

      <div className="rede-stats">
        <div className="rede-stat rede-stat-total">
          <Wifi size={20} />
          <span className="rede-stat-value">{ativos.length}</span>
          <span className="rede-stat-label">hosts ativos</span>
        </div>
        <div className="rede-stat rede-stat-online">
          <CheckCircle2 size={20} />
          <span className="rede-stat-value">{online}</span>
          <span className="rede-stat-label">online</span>
        </div>
        <div className="rede-stat rede-stat-offline">
          <XCircle size={20} />
          <span className="rede-stat-value">{offline}</span>
          <span className="rede-stat-label">offline</span>
        </div>
        <button
          className="rede-check-btn"
          onClick={() => verificar()}
          disabled={checking}
        >
          <RefreshCw size={16} className={checking ? 'spin' : ''} />
          {checking ? 'Verificando...' : 'Verificar agora'}
        </button>
      </div>

      {verificadoEm && (
        <p className="rede-updated">
          Última verificação: {new Date(verificadoEm).toLocaleTimeString('pt-BR')} · atualização automática a cada 30s
        </p>
      )}

      <div className="rede-grid">
        <div className="rede-card">
          <h3>
            <Plus size={16} /> Adicionar host
          </h3>
          <div className="rede-form">
            <div className="form-group">
              <label>Nome (ex: Roteador principal)</label>
              <input
                type="text"
                placeholder="Nome do dispositivo/serviço"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tipo de verificação</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="ping">Ping (dispositivo/IP)</option>
                <option value="porta">Porta (TCP)</option>
                <option value="http">HTTP/HTTPS (serviço)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Alvo</label>
              <input
                type="text"
                placeholder={
                  form.tipo === 'http'
                    ? 'https://exemplo.com.br ou IP'
                    : form.tipo === 'porta'
                      ? 'IP ou hostname (ex: 192.168.0.10)'
                      : 'IP ou hostname (ex: 192.168.0.1)'
                }
                value={form.alvo}
                onChange={(e) => setForm({ ...form, alvo: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') adicionar();
                }}
              />
            </div>
            {form.tipo === 'porta' && (
              <div className="form-group">
                <label>Porta</label>
                <input
                  type="number"
                  placeholder="80"
                  value={form.porta}
                  onChange={(e) => setForm({ ...form, porta: e.target.value })}
                />
              </div>
            )}
            <button
              className="btn btn-primary rede-add-btn"
              onClick={adicionar}
              disabled={salvando}
            >
              <Plus size={16} /> {salvando ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>

        <div className="rede-card rede-hosts-card">
          <h3>
            <Activity size={16} /> Hosts monitorados
          </h3>

          {loading ? (
            <div className="rede-hosts">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rede-skeleton-host">
                  <div className="rede-skeleton rede-skeleton-icon" />
                  <div className="rede-skeleton-lines">
                    <div className="rede-skeleton rede-skeleton-line" style={{ width: '55%' }} />
                    <div className="rede-skeleton rede-skeleton-line" style={{ width: '35%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : hosts.length === 0 ? (
            <div className="rede-empty">
              Nenhum host monitorado. Adicione dispositivos, portas ou serviços ao lado.
            </div>
          ) : (
            <div className="rede-hosts">
              {hosts.map((h) => {
                const TipoIcon = (TIPOS[h.tipo] || TIPOS.ping).icon;
                const res = resultados[h.id];
                const statusCls = !h.ativo
                  ? 'disabled'
                  : res
                    ? res.online ? 'online' : 'offline'
                    : 'checking';
                return (
                  <div key={h.id} className={`rede-host ${statusCls}`}>
                    <span className={`rede-host-dot ${statusCls}`} />
                    <span className={`rede-host-icon ${statusCls}`}>
                      <TipoIcon size={18} />
                    </span>
                    <div className="rede-host-info">
                      <span className="rede-host-nome">{h.nome}</span>
                      <span className="rede-host-alvo">
                        {h.tipo === 'http' ? h.alvo : h.tipo === 'porta' ? `${h.alvo}:${h.porta || 80}` : h.alvo}
                      </span>
                    </div>
                    <span className="rede-host-tag">
                      {(TIPOS[h.tipo] || TIPOS.ping).label}
                    </span>
                    <span className="rede-host-latencia">
                      {!h.ativo
                        ? 'Inativo'
                        : res
                          ? res.online
                            ? fmtLatencia(res.latencia)
                            : res.erro || 'Offline'
                          : 'Verificando...'}
                    </span>
                    <button
                      className="rede-host-toggle"
                      onClick={() => alternarAtivo(h)}
                      title={h.ativo ? 'Desativar monitoramento' : 'Ativar monitoramento'}
                    >
                      <Power size={15} className={h.ativo ? 'on' : ''} />
                    </button>
                    <button
                      className="rede-host-remove"
                      onClick={() => remover(h)}
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rede-card rede-card-full rede-devices-card">
          <div className="rede-section-head">
            <h3>
              <MonitorDot size={16} /> Dispositivos na rede
            </h3>
            <button
              className="rede-check-btn"
              onClick={() => escanearRede()}
              disabled={escaneando}
            >
              <RefreshCw size={15} className={escaneando ? 'spin' : ''} />
              {escaneando ? 'Escaneando...' : 'Escanear rede'}
            </button>
          </div>
          <p className="rede-updated">
            Rede local: <strong>{infoRede.ip_local || '—'}</strong> · sub-rede{' '}
            {infoRede.base ? `${infoRede.base}.0/24` : '—'} ·{' '}
            {dispositivos.length} dispositivo(s) encontrado(s)
          </p>
          {dispositivos.length === 0 ? (
            escaneando ? (
              <div className="rede-skeleton-table">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="rede-skeleton-row">
                    <div className="rede-skeleton rede-skeleton-line" />
                    <div className="rede-skeleton rede-skeleton-line" style={{ width: '70%' }} />
                    <div className="rede-skeleton rede-skeleton-line" style={{ width: '80%' }} />
                    <div className="rede-skeleton rede-skeleton-line" style={{ width: '40%' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rede-empty">
                Nenhum dispositivo encontrado. Clique em "Escanear rede" para varrer a rede local.
              </div>
            )
          ) : (
            <>
              <div className="rede-table-wrap">
                <table className="rede-table">
                  <thead>
                    <tr>
                      <th>IP</th>
                      <th>Hostname</th>
                      <th>Endereço MAC</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispositivos
                      .slice((paginaDispositivos - 1) * 5, paginaDispositivos * 5)
                      .map((d) => (
                        <tr key={d.ip} className={d.proprio ? 'is-self' : ''}>
<td className="rede-td-ip">
  <span className="rede-ip-text">{d.ip}</span>
  {d.proprio && <span className="rede-self-tag">este PC</span>}
</td>
                          <td>{d.hostname || '—'}</td>
                          <td className="rede-td-mac">{d.mac || '—'}</td>
                          <td>
                            <span className={`rede-tag ${d.ativo ? 'online' : 'offline'}`}>
                              {d.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {Math.ceil(dispositivos.length / 5) > 1 && (
                <div className="rede-paginacao">
                  <button
                    disabled={paginaDispositivos <= 1}
                    onClick={() => setPaginaDispositivos(paginaDispositivos - 1)}
                  >
                    ‹ Anterior
                  </button>
                  <span>
                    Página {Math.min(paginaDispositivos, Math.ceil(dispositivos.length / 5))} de{' '}
                    {Math.ceil(dispositivos.length / 5)}
                  </span>
                  <button
                    disabled={paginaDispositivos >= Math.ceil(dispositivos.length / 5)}
                    onClick={() => setPaginaDispositivos(paginaDispositivos + 1)}
                  >
                    Próxima ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rede-card rede-card-full rede-speed-card">
          <h3>
            <Gauge size={16} /> Teste de velocidade
          </h3>
          <p className="rede-updated">
            Mede a velocidade da internet baixando dados do servidor do Google
            (8.8.8.8 / dl.google.com, 25 MB).
          </p>
          <div className="rede-speed-actions">
            <button
              className="rede-check-btn"
              onClick={executarSpeedTest}
              disabled={teste.rodando}
            >
              <Gauge size={16} className={teste.rodando ? 'spin' : ''} />
              {teste.rodando ? 'Testando...' : 'Iniciar teste'}
            </button>
          </div>

          {teste.rodando && (
            <div className="rede-speed-progress">
              <div className="rede-speed-bar">
                <div
                  className="rede-speed-bar-fill"
                  style={{ width: `${teste.progresso}%` }}
                />
              </div>
              <span className="rede-speed-bar-label">{teste.progresso}%</span>
            </div>
          )}

          {teste.erro && <p className="rede-speed-erro">{teste.erro}</p>}

          {!teste.rodando && teste.downloadMbps != null && (
            <div className="rede-speed-result">
              <div className="rede-speed-stat">
                <span className="rede-speed-value">
                  {teste.downloadMbps.toFixed(1)}
                </span>
                <span className="rede-speed-label">Mbps download</span>
              </div>
              <div className="rede-speed-stat">
                <span className="rede-speed-value">{teste.pingMs ?? '—'}</span>
                <span className="rede-speed-label">Ping (ms)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}