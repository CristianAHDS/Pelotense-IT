import { useState, useEffect } from 'react';
import { Clock, Pause, Coffee, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import './PontoTimer.css';

const API = API_URL;
const pad = (n) => String(n).padStart(2, '0');

function toMs(s) {
  return new Date(String(s).replace(' ', 'T')).getTime();
}

function fmtClock(ms) {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function computeElapsed(reg, now) {
  if (!reg || !reg.inicio) return 0;
  const start = toMs(reg.inicio);
  const end = reg.fim ? toMs(reg.fim) : now;
  let total = end - start;
  if (reg.inicio_almoco) {
    const almIni = toMs(reg.inicio_almoco);
    const almFim = reg.fim_almoco ? toMs(reg.fim_almoco) : now;
    total -= almFim - almIni;
  }
  for (const p of reg.pausas || []) {
    total -= (p.fim ? toMs(p.fim) : now) - toMs(p.inicio);
  }
  return Math.max(0, total);
}

const STATUS_ICON = {
  trabalhando: Clock,
  pausado: Pause,
  almoco: Coffee,
  finalizado: CheckCircle2,
  nao_iniciado: Clock,
};

export default function PontoTimer() {
  const { user } = useAuth();
  const usuario = user?.nome || 'Cristian Raffi Cunha';
  const [registro, setRegistro] = useState(null);
  const [status, setStatus] = useState('nao_iniciado');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = () => {
      fetch(`${API}/ponto/status?usuario=${encodeURIComponent(usuario)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setStatus(data.status);
          setRegistro(data.registro);
        })
        .catch(() => {});
    };
    load();
    const sync = setInterval(load, 30000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(sync);
      clearInterval(tick);
    };
  }, [usuario]);

  const Icon = STATUS_ICON[status] || Clock;
  const elapsed = computeElapsed(registro, now);

  return (
    <div className={`ponto-timer ${status}`} title="Tempo de ponto">
      <Icon size={14} className="ponto-timer-icon" />
      <span className="ponto-timer-value">{fmtClock(elapsed)}</span>
    </div>
  );
}
