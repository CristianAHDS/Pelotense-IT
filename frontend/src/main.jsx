import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

const h = new Date().getHours();
if (h >= 11 && h < 14) document.documentElement.classList.add('noon');
if (h >= 17 || h < 6) document.documentElement.classList.add('evening');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <OfflineProvider>
            <SocketProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </SocketProvider>
          </OfflineProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
