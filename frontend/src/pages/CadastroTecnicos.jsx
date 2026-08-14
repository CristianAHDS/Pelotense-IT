import { useState, useEffect } from 'react';
import { UserCog, Plus, Trash2, Check, X, KeyRound } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './CadastroTecnicos.css';

import { API_URL } from '../config';

const API = API_URL;

const AREA_LABELS = { TI: 'TI', radio: 'Téc. Rádio', audiovisual: 'Audiovisual' };

export default function CadastroTecnicos() {
  const { add: addToast } = useToast();
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', departamento: 'TI', ativo: true });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadTecnicos = () => {
    fetch(`${API}/tecnicos`)
      .then(r => r.json())
      .then(data => { setTecnicos(data); setLoading(false); })
      .catch(() => { addToast('Erro ao carregar técnicos', 'error'); setLoading(false); });
  };

  useEffect(() => { loadTecnicos(); }, []);

  const resetForm = () => {
    setForm({ nome: '', email: '', departamento: 'TI', ativo: true });
    setEditingId(null);
  };

  const handleEdit = (t) => {
    setForm({ nome: t.nome, email: t.email, departamento: t.departamento || t.tipo || 'TI', ativo: !!t.ativo });
    setEditingId(t.id);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      addToast('Nome e email são obrigatórios', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API}/tecnicos/${editingId}` : `${API}/tecnicos`;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error();
      if (data.senha_gerada) {
        addToast(`Técnico cadastrado! Senha padrão: 99y!DlS&7j (enviada por email). Será solicitada troca no primeiro login.`, 'success');
      } else {
        addToast(editingId ? 'Técnico atualizado!' : 'Técnico cadastrado!', 'success');
      }
      resetForm();
      loadTecnicos();
    } catch {
      addToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSenha = async () => {
    if (!editingId) return;
    try {
      const r = await fetch(`${API}/tecnicos/${editingId}/resetar-senha`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error();
      addToast(`Senha resetada para 99y!DlS&7j! O técnico deverá trocar a senha no próximo login.`, 'success');
    } catch {
      addToast('Erro ao resetar senha', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API}/tecnicos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      addToast('Técnico removido!', 'success');
      if (editingId === id) resetForm();
      loadTecnicos();
    } catch {
      addToast('Erro ao remover', 'error');
    }
  };

  return (
    <div className="cadastro-tecnicos-page">
      <div className="page-header">
        <div className="header-particles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="header-particle" style={{
              left: (5 + i * 20) + '%',
              animationDelay: (i * 0.6) + 's',
              animationDuration: (3 + i * 0.4) + 's',
            }} />
          ))}
        </div>
        <h2>Cadastro de Técnicos</h2>
        <span className="page-subtitle">Gerencie a equipe técnica do sistema</span>
      </div>

      <div className="ct-grid">
        <div className="ct-card">
          <h3>{editingId ? 'Editar Técnico' : 'Novo Técnico'}</h3>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Área de Atuação</label>
            <select
              value={form.departamento}
              onChange={(e) => setForm({ ...form, departamento: e.target.value })}
            >
              <option value="TI">TI</option>
              <option value="radio">Técnico de Rádio</option>
              <option value="audiovisual">Audiovisual</option>
            </select>
          </div>
          <label className="toggle-row">
            <span>Técnico ativo</span>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
          </label>
          <div className="ct-form-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <UserCog size={16} /> {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editingId && (
              <>
                <button className="btn btn-outline" onClick={handleResetSenha} title="Resetar senha para ahoradosul2024">
                  <KeyRound size={16} /> Resetar Senha
                </button>
                <button className="btn btn-outline" onClick={resetForm}>
                  <X size={16} /> Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ct-card">
          <h3>Técnicos Cadastrados <span className="ct-count">{tecnicos.length}</span></h3>
          {loading ? (
            <div className="ct-loading">Carregando...</div>
          ) : tecnicos.length === 0 ? (
            <div className="ct-empty">Nenhum técnico cadastrado.</div>
          ) : (
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Área</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map((t) => (
                    <tr key={t.id} className={!t.ativo ? 'ct-inactive' : ''}>
                      <td>
                        <div className="ct-avatar">{t.nome.charAt(0).toUpperCase()}</div>
                        <span>{t.nome}</span>
                      </td>
                      <td>{t.email}</td>
                      <td>{AREA_LABELS[t.tipo] || AREA_LABELS[t.departamento] || 'TI'}</td>
                      <td>
                        <span className={`ct-status-badge ${t.ativo ? 'ct-active-badge' : 'ct-inactive-badge'}`}>
                          {t.ativo ? <Check size={12} /> : <X size={12} />}
                          {t.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="ct-row-actions">
                          <button className="ct-action-btn" onClick={() => handleEdit(t)} title="Editar">
                            <UserCog size={14} />
                          </button>
                          <button className="ct-action-btn ct-delete" onClick={() => handleDelete(t.id)} title="Remover">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
