import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './Login.css';

const API = '/api';

export default function ConfirmarEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API}/auth/confirmar/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('error'); setMessage(data.error); }
        else { setStatus('success'); setMessage(data.message); }
      })
      .catch(() => { setStatus('error'); setMessage('Erro de conexão.'); });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="https://i.imgur.com/mfoPeJL.png" alt="Pelotense IT" className="auth-logo" />
          <h1>Pelotense IT</h1>
          <span>Gestão de Chamados</span>
        </div>

        <div className="auth-form" style={{ textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <Loader size={40} className="auth-spinner" />
              <p style={{ color: 'var(--color-text-muted)', marginTop: 16 }}>Confirmando seu email...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={48} style={{ color: '#10b981' }} />
              <p style={{ color: '#10b981', fontSize: 15, fontWeight: 600, marginTop: 16 }}>{message}</p>
              <Link to="/login" className="auth-btn" style={{ display: 'inline-flex', marginTop: 24, textDecoration: 'none' }}>
                Ir para o Login
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle size={48} style={{ color: '#ef4444' }} />
              <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 600, marginTop: 16 }}>{message}</p>
              <Link to="/login" className="auth-btn" style={{ display: 'inline-flex', marginTop: 24, textDecoration: 'none' }}>
                Voltar ao Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
