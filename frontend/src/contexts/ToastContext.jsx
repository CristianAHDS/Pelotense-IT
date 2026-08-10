import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Trophy } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  achievement: Trophy,
};

const COLORS = {
  success: { bg: '#065f46', color: '#d1fae5', border: '#10b981', icon: '#6ee7b7' },
  error: { bg: '#7f1d1d', color: '#fee2e2', border: '#ef4444', icon: '#fca5a5' },
  warning: { bg: '#78350f', color: '#fef3c7', border: '#f59e0b', icon: '#fcd34d' },
  info: { bg: '#1e3a5f', color: '#dbeafe', border: '#3b82f6', icon: '#93c5fd' },
  achievement: { bg: '#3b0764', color: '#f3e8ff', border: '#8b5cf6', icon: '#c4b5fd' },
};

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const colors = COLORS[toast.type] || COLORS.info;
  const Icon = ICONS[toast.type] || Info;
  const timerRef = useRef(null);

  useEffect(() => {
    const start = Date.now();
    const duration = toast.duration || 4000;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        onRemove(toast.id);
      }
    }, 30);
    return () => clearInterval(timerRef.current);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`toast toast-${toast.type}`}
      style={{ '--toast-bg': colors.bg, '--toast-color': colors.color, '--toast-border': colors.border }}
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={() => {
        clearInterval(timerRef.current);
        const remaining = Math.max(0, progress);
        const duration = toast.duration || 4000;
        const remainingMs = (remaining / 100) * duration;
        timerRef.current = setInterval(() => {
          setProgress((p) => {
            const newP = p - (30 / duration) * 100;
            if (newP <= 0) { clearInterval(timerRef.current); onRemove(toast.id); }
            return newP;
          });
        }, 30);
      }}
    >
      <div className="toast-icon" style={{ color: colors.icon }}>
        <Icon size={18} />
      </div>
      <span className="toast-msg">{toast.msg}</span>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <XCircle size={14} />
      </button>
      <div className="toast-progress">
        <div className="toast-progress-bar" style={{ width: `${progress}%`, background: colors.border }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type, duration }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
