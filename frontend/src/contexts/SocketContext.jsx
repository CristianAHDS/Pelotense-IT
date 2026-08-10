import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('chamado:created', (chamado) => {
      addNotification(`Novo chamado #${chamado.id}: ${chamado.titulo}`, 'created');
    });

    socket.on('chamado:updated', (chamado) => {
      addNotification(`Chamado #${chamado.id} atualizado`, 'updated');
    });

    return () => socket.disconnect();
  }, []);

  function addNotification(msg, type) {
    const id = Date.now();
    const n = { id, msg, type, time: new Date().toLocaleTimeString() };
    setNotifications((prev) => [n, ...prev].slice(0, 50));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
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
