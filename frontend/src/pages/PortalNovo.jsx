import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X, Image } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './Portal.css';

const API = '/api';

export default function PortalNovo() {
  const navigate = useNavigate();
  const { add: addToast } = useToast();
  const [form, setForm] = useState({
    titulo: '', descricao: '', prioridade: 'media',
    categoria: 'geral', solicitante: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim() || !form.solicitante.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/chamados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      addToast('Chamado criado com sucesso!', 'success');
      navigate('/portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page anim-fadeIn">
      <h1 className="portal-title">Novo Chamado</h1>
      <p className="portal-sub">Descreva seu problema e entraremos em contato em breve</p>

      <form className="portal-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Seu e-mail ou nome *</label>
          <input
            name="solicitante"
            value={form.solicitante}
            onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
            placeholder="Como podemos identificá-lo?"
          />
        </div>

        <div className="form-group">
          <label>Título *</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Resuma o problema"
          />
        </div>

        <div className="form-group">
          <label>Descrição *</label>
          <textarea
            name="descricao"
            rows={5}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhe o problema. Quanto mais informações, mais rápido resolveremos!"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Categoria</label>
            <select name="categoria" value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option value="geral">Geral</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="rede">Rede</option>
              <option value="impressora">Impressora</option>
              <option value="email">E-mail</option>
              <option value="acesso">Acesso</option>
            </select>
          </div>
          <div className="form-group">
            <label>Prioridade</label>
            <select name="prioridade" value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary portal-submit" disabled={loading}>
          <Save size={18} /> {loading ? 'Enviando...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}
