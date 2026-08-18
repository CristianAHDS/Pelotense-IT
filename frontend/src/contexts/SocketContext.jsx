import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { useToast } from './ToastContext';
import { SOCKET_URL } from '../config';
import { getTermos } from '../termos';

const SocketContext = createContext(null);

function dispararConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ['#6366f1', '#818cf8', '#10b981', '#f59e0b', '#f43f5e', '#38bdf8', '#8b5cf6'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const { add: addToast } = useToast();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('chamado:created', (chamado) => {
      addNotification(`Novo ${getTermos().chamado} #${chamado.id}: ${chamado.titulo}`, 'created');
    });

    socket.on('chamado:updated', (chamado) => {
      addNotification(`${getTermos().Chamado} #${chamado.id} atualizado`, 'updated');
    });

    socket.on('alerta:disparado', (data) => {
      const t = getTermos();
      const msg = data.mensagem
        ? `⏰ Alerta ${t.chamado} #${data.chamado_id}: ${data.mensagem}`
        : `⏰ Alerta agendado disparado para o ${t.chamado} #${data.chamado_id}: ${data.titulo}`;
      addNotification(msg, 'alert');
      addToast(msg, 'warning', 8000);
    });

    socket.on('badges:conquistados', (data) => {
      const nomes = data.badges.map(b => b.nome).join(', ');
      addNotification(`🏆 Novos badges: ${nomes}`, 'achievement');
      dispararConfetti();
    });

    return () => socket.disconnect();
  }, []);

  function addNotification(msg, type) {
    const id = Date.now();
    const n = { id, msg, type, time: new Date().toLocaleTimeString() };
    setNotifications((prev) => [n, ...prev].slice(0, 50));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 8000);
  }

  function clearNotifications() {
    setNotifications([]);
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, notifications, addNotification, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
