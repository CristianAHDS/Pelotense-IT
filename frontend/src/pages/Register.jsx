import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './Login.css';

import { API_URL } from '../config';

const API = API_URL;

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Erro ao cadastrar');
        return;
      }
      setSuccess('Cadastro realizado! Verifique seu email para confirmar a conta.');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/pelotense_it_icone_app_sem_fundo.png" alt="Pelotense IT" className="auth-logo" />
          <h1>Pelotense IT</h1>
          <span>Gestão de Chamados</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Criar Conta</h2>

          {success && (
            <div className="auth-success">
              <CheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <User size={16} className="auth-field-icon" />
            <input
              type="text"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <Mail size={16} className="auth-field-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <Lock size={16} className="auth-field-icon" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              className="has-toggle"
              placeholder="Senha (mínimo 6 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
            />
            <button type="button" className="auth-field-toggle" onClick={() => setMostrarSenha(!mostrarSenha)} title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <p className="auth-link">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
