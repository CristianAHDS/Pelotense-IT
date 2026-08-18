import { useState, useEffect, useMemo } from 'react';
import {
  Clock, Play, Pause, RotateCcw, Coffee, Utensils, LogOut,
  CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Timer,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './Ponto.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';

const API = API_URL;

const pad = (n) => String(n).padStart(2, '0');

const hhmm = (dt) => (dt ? dt.slice(11, 16) : null);

const fmtTotal = (min) => {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
};

const STATUS_INFO = {
  nao_iniciado: { label: 'Não iniciado', className: 'muted' },
  trabalhando: { label: 'Trabalhando', className: 'success' },
  pausado: { label: 'Em pausa', className: 'warning' },
  almoco: { label: 'Em almoço', className: 'info' },
  finalizado: { label: 'Jornada encerrada', className: 'success' },
};

function fmtData(data) {
  const [y, m, d] = data.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return { dia: `${pad(d)}/${pad(m)}`, weekday };
}

function regStatus(reg, hojeStr) {
  if (reg.fim) return { label: 'Concluído', className: 'success' };
  if (reg.data === hojeStr) {
    if (reg.inicio_almoco && !reg.fim_almoco) return { label: 'Em almoço', className: 'info' };
    if ((reg.pausas || []).some((p) => !p.fim)) return { label: 'Em pausa', className: 'warning' };
    return { label: 'Em andamento', className: 'working' };
  }
  return { label: 'Incompleto', className: 'muted' };
}

function pausaTotalMinutos(reg) {
  return (reg.pausas || []).reduce((acc, p) => {
    if (!p.fim) return acc;
    const ms = new Date(p.fim.replace(' ', 'T')) - new Date(p.inicio.replace(' ', 'T'));
    return acc + Math.round(ms / 60000);
  }, 0);
}

export default function Ponto() {
  const { user } = useAuth();
  const { add: addToast } = useToast();
  const usuario = user?.nome || 'Cristian Raffi Cunha';

  const [status, setStatus] = useState('nao_iniciado');
  const [registro, setRegistro] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const [statusRes, mesRes] = await Promise.all([
        apiFetch(`${API}/ponto/status?usuario=${encodeURIComponent(usuario)}`),
        apiFetch(`${API}/ponto/mes?usuario=${encodeURIComponent(usuario)}&data=${mes}`),
      ]);
      const statusData = await statusRes.json();
      const mesData = await mesRes.json();
      setStatus(statusData.status);
      setRegistro(statusData.registro);
      setRegistros(mesData.registros || []);
    } catch {
      addToast('Erro ao carregar dados do ponto', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, mes]);

  const acao = async (endpoint, mensagem) => {
    setSaving(endpoint);
    try {
      const r = await apiFetch(`${API}/ponto/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario }),
      });
      const data = await r.json();
      if (!r.ok) {
        addToast(data.error || 'Erro na operação', 'error');
        return;
      }
      addToast(mensagem, 'success');
      await load();
    } catch {
      addToast('Erro de conexão', 'error');
    } finally {
      setSaving(null);
    }
  };

  const info = STATUS_INFO[status] || STATUS_INFO.nao_iniciado;

  const nomeMes = new Date(parseInt(mes.slice(0, 4)), parseInt(mes.slice(5, 7)) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const mudarMes = (delta) => {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const resumoMes = useMemo(() => {
    const dias = (registros || []).filter((r) => r.inicio);
    const minutos = dias.reduce((acc, r) => acc + (r.total_minutos || 0), 0);
    return { diasTrabalhados: dias.length, totalMinutos: minutos };
  }, [registros]);

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const regHoje = registro;

  return (
    <div className="ponto-page">
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
        <h2>Ponto</h2>
        <span className="page-subtitle">Registre sua jornada de trabalho</span>
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <>
          <div className="ponto-status-card">
            <div className="ponto-clock-col">
              <div className="ponto-clock">
                {pad(now.getHours())}:{pad(now.getMinutes())}
                <span className="ponto-clock-sec">{pad(now.getSeconds())}</span>
              </div>
              <div className="ponto-date">
                {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <span className={`ponto-status-badge ${info.className}`}>
                <Clock size={14} /> {info.label}
              </span>
            </div>

            <div className="ponto-timeline">
              <div className="ponto-timeline-item">
                <span className="ponto-timeline-label">Entrada</span>
                <span className="ponto-timeline-value">{hhmm(regHoje?.inicio) || '—'}</span>
              </div>
              {(regHoje?.pausas || []).length > 0 && (
                <div className="ponto-timeline-item">
                  <span className="ponto-timeline-label">Pausas ({regHoje.pausas.length})</span>
                  <span className="ponto-timeline-value">
                    {regHoje.pausas.map((p) => (
                      <span key={p.id} className="ponto-pausa-chip">
                        {hhmm(p.inicio)}–{hhmm(p.fim) || 'agora'}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              <div className="ponto-timeline-item">
                <span className="ponto-timeline-label">Almoço</span>
                <span className="ponto-timeline-value">
                  {regHoje?.inicio_almoco
                    ? `${hhmm(regHoje.inicio_almoco)} – ${hhmm(regHoje.fim_almoco) || '—'}`
                    : '—'}
                </span>
              </div>
              <div className="ponto-timeline-item">
                <span className="ponto-timeline-label">Saída</span>
                <span className="ponto-timeline-value">{hhmm(regHoje?.fim) || '—'}</span>
              </div>
              <div className="ponto-timeline-item ponto-timeline-total">
                <span className="ponto-timeline-label">
                  <Timer size={13} /> Total trabalhado
                </span>
                <span className="ponto-timeline-value">{fmtTotal(regHoje?.total_minutos)}</span>
              </div>
            </div>

            <div className="ponto-actions">
              {status === 'nao_iniciado' && (
                <button
                  className="ponto-btn ponto-btn-success"
                  onClick={() => acao('iniciar', 'Expediente iniciado!')}
                  disabled={!!saving}
                >
                  <Play size={18} /> {saving === 'iniciar' ? 'Iniciando...' : 'Iniciar Expediente'}
                </button>
              )}

              {status === 'trabalhando' && (
                <>
                  <button
                    className="ponto-btn ponto-btn-warning"
                    onClick={() => acao('pausar', 'Pausa iniciada!')}
                    disabled={!!saving}
                  >
                    <Pause size={18} /> {saving === 'pausar' ? 'Pausando...' : 'Pausar'}
                  </button>
                  <button
                    className="ponto-btn ponto-btn-info"
                    onClick={() => acao('iniciar-almoco', 'Almoço iniciado!')}
                    disabled={!!saving}
                  >
                    <Coffee size={18} /> {saving === 'iniciar-almoco' ? 'Iniciando...' : 'Iniciar Almoço'}
                  </button>
                  <button
                    className="ponto-btn ponto-btn-danger"
                    onClick={() => acao('finalizar', 'Expediente finalizado!')}
                    disabled={!!saving}
                  >
                    <LogOut size={18} /> {saving === 'finalizar' ? 'Finalizando...' : 'Finalizar Expediente'}
                  </button>
                </>
              )}

              {status === 'pausado' && (
                <>
                  <button
                    className="ponto-btn ponto-btn-success"
                    onClick={() => acao('retomar', 'Pausa finalizada!')}
                    disabled={!!saving}
                  >
                    <RotateCcw size={18} /> {saving === 'retomar' ? 'Retomando...' : 'Retomar'}
                  </button>
                  <button
                    className="ponto-btn ponto-btn-danger"
                    onClick={() => acao('finalizar', 'Expediente finalizado!')}
                    disabled={!!saving}
                  >
                    <LogOut size={18} /> Finalizar Expediente
                  </button>
                </>
              )}

              {status === 'almoco' && (
                <button
                  className="ponto-btn ponto-btn-info"
                  onClick={() => acao('finalizar-almoco', 'Almoço finalizado!')}
                  disabled={!!saving}
                >
                  <Utensils size={18} /> {saving === 'finalizar-almoco' ? 'Finalizando...' : 'Finalizar Almoço'}
                </button>
              )}

              {status === 'finalizado' && (
                <div className="ponto-finished">
                  <CheckCircle2 size={18} />
                  <span>
                    Jornada encerrada às <strong>{hhmm(regHoje?.fim)}</strong> — total{' '}
                    <strong>{fmtTotal(regHoje?.total_minutos)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="ponto-table-card">
            <div className="ponto-table-header">
              <h3>
                <CalendarDays size={18} /> Registros de ponto
              </h3>
              <div className="ponto-month-nav">
                <button className="ponto-nav-btn" onClick={() => mudarMes(-1)} title="Mês anterior">
                  <ChevronLeft size={18} />
                </button>
                <span className="ponto-month-label">{nomeMes}</span>
                <button className="ponto-nav-btn" onClick={() => mudarMes(1)} title="Próximo mês">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="ponto-month-stats">
              <div className="ponto-stat">
                <span className="ponto-stat-value">{resumoMes.diasTrabalhados}</span>
                <span className="ponto-stat-label">dias trabalhados</span>
              </div>
              <div className="ponto-stat">
                <span className="ponto-stat-value">{fmtTotal(resumoMes.totalMinutos)}</span>
                <span className="ponto-stat-label">total no mês</span>
              </div>
            </div>

            <div className="ponto-table-wrap">
              <table className="ponto-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entrada</th>
                    <th>Saída Almoço</th>
                    <th>Retorno Almoço</th>
                    <th>Saída</th>
                    <th>Pausas</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="ponto-table-empty">
                        Nenhum registro neste mês.
                      </td>
                    </tr>
                  ) : (
                    registros.map((reg) => {
                      const { dia, weekday } = fmtData(reg.data);
                      const st = regStatus(reg, hojeStr);
                      const pausaTotal = pausaTotalMinutos(reg);
                      return (
                        <tr key={reg.id} className={reg.data === hojeStr ? 'is-today' : ''}>
                          <td className="ponto-td-data">
                            <strong>{dia}</strong>
                            <span>{weekday}</span>
                          </td>
                          <td>{hhmm(reg.inicio) || '—'}</td>
                          <td>{hhmm(reg.inicio_almoco) || '—'}</td>
                          <td>{hhmm(reg.fim_almoco) || '—'}</td>
                          <td>{hhmm(reg.fim) || '—'}</td>
                          <td>{pausaTotal > 0 ? fmtTotal(pausaTotal) : '—'}</td>
                          <td className="ponto-td-total">{fmtTotal(reg.total_minutos)}</td>
                          <td>
                            <span className={`ponto-tag ${st.className}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
