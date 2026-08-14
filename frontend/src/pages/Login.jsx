import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

import { API_URL } from '../config';

const API = API_URL;

export default function Login() {
  const { login, user, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showTrocarSenha, setShowTrocarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [trocarError, setTrocarError] = useState('');
  const [trocando, setTrocando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }
      login(data.token, data.usuario);
      if (data.usuario.trocar_senha) {
        setSenhaAtual(senha);
        setShowTrocarSenha(true);
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    if (senhaNova.length < 6) {
      setTrocarError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (senhaAtual === senhaNova) {
      setTrocarError('A nova senha deve ser diferente da atual');
      return;
    }
    setTrocarError('');
    setTrocando(true);
    try {
      const r = await fetch(`${API}/auth/trocar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
      });
      const data = await r.json();
      if (!r.ok) {
        setTrocarError(data.error || 'Erro ao trocar senha');
        return;
      }
      const updatedUser = { ...user, trocar_senha: false };
      login(token, updatedUser);
      navigate('/', { replace: true });
    } catch {
      setTrocarError('Erro de conexão');
    } finally {
      setTrocando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="https://i.imgur.com/mfoPeJL.png" alt="Pelotense IT" className="auth-logo" />
          <h1>Pelotense IT</h1>
          <span>Gestão de Chamados</span>
        </div>

        {showTrocarSenha ? (
          <form className="auth-form" onSubmit={handleTrocarSenha}>
            <h2>Trocar Senha</h2>
            <p className="auth-subtext">Este é seu primeiro login. Crie uma nova senha para continuar.</p>

            {trocarError && (
              <div className="auth-error">
                <AlertCircle size={14} />
                <span>{trocarError}</span>
              </div>
            )}

            <div className="auth-field">
              <Lock size={16} className="auth-field-icon" />
              <input
                type="password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
                minLength={6}
                autoFocus
              />
            </div>

            <button type="submit" className="auth-btn" disabled={trocando}>
              <KeyRound size={16} />
              {trocando ? 'Salvando...' : 'Definir nova senha'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Entrar</h2>

            {error && (
              <div className="auth-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <Mail size={16} className="auth-field-icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <Lock size={16} className="auth-field-icon" />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              <LogIn size={16} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
