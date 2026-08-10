import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { version } from '../../package.json';
import './Configuracoes.css';

const API = '/api';

export default function Configuracoes() {
  const { add: addToast } = useToast();
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    remetente: 'Pelotense IT <ti@pelotense.com.br>',
    destinatarios: '',
    relatorio_hora: '18:00',
    ativo: 0,
  });
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    fetch(`${API}/email/config`)
      .then(r => r.json())
      .then(data => setEmailConfig(data))
      .catch(() => {});
  }, []);

  const salvarEmail = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/email/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });
      if (!r.ok) throw new Error('Erro ao salvar');
      addToast('Configurações de e-mail salvas!', 'success');
    } catch {
      addToast('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const enviarTeste = async () => {
    setSendingTest(true);
    try {
      await salvarEmailSilencioso();
      const r = await fetch(`${API}/email/teste`, { method: 'POST' });
      const data = await r.json();
      if (r.ok) addToast('E-mail de teste enviado!', 'success');
      else addToast(data.error || 'Erro ao enviar teste', 'error');
    } catch {
      addToast('Erro ao enviar e-mail de teste', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const enviarRelatorio = async () => {
    setSendingReport(true);
    try {
      const r = await fetch(`${API}/email/relatorio`, { method: 'POST' });
      const data = await r.json();
      if (data.enviado) addToast('Relatório enviado com sucesso!', 'success');
      else addToast(data.erro || 'Erro ao enviar relatório', 'error');
    } catch {
      addToast('Erro ao enviar relatório', 'error');
    } finally {
      setSendingReport(false);
    }
  };

  const salvarEmailSilencioso = async () => {
    await fetch(`${API}/email/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailConfig),
    });
  };

  return (
    <div className="config-page">
      <div className="page-header">
        <h2>Configurações</h2>
        <span className="page-subtitle">Gerencie as configurações do sistema</span>
      </div>

      <div className="config-grid">
        <div className="config-card">
          <h3>Perfil do Técnico</h3>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" defaultValue="Cristian Raffi Cunha" />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" defaultValue="admin@ahoradosul.com.br" />
          </div>
          <div className="form-group">
            <label>Departamento</label>
            <input type="text" defaultValue="TI" />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>Salvar</button>
        </div>

        <div className="config-card">
          <h3>Notificações</h3>
          <label className="toggle-row">
            <span>Notificar novos chamados</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>Notificar atualizações de status</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>Notificar chamados críticos</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>Resumo diário por e-mail</span>
            <input type="checkbox" checked={!!emailConfig.ativo} onChange={(e) => setEmailConfig({ ...emailConfig, ativo: e.target.checked ? 1 : 0 })} />
          </label>
        </div>

        <div className="config-card config-card-full">
          <h3>Configuração de E-mail (SMTP)</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Servidor SMTP</label>
              <input type="text" placeholder="smtp.gmail.com"
                value={emailConfig.smtp_host}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })} />
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label>Porta</label>
              <input type="number" placeholder="587"
                value={emailConfig.smtp_port}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Usuário SMTP</label>
              <input type="text" placeholder="seuemail@gmail.com"
                value={emailConfig.smtp_user}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Senha (App Password)</label>
              <input type="password" placeholder="••••••••••••••••"
                value={emailConfig.smtp_pass}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Remetente</label>
            <input type="text" placeholder="Pelotense IT <ti@pelotense.com.br>"
              value={emailConfig.remetente}
              onChange={(e) => setEmailConfig({ ...emailConfig, remetente: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Destinatários (separados por vírgula)</label>
            <input type="text" placeholder="admin@exemplo.com, tecnico@exemplo.com"
              value={emailConfig.destinatarios}
              onChange={(e) => setEmailConfig({ ...emailConfig, destinatarios: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Horário do Relatório</label>
              <input type="time"
                value={emailConfig.relatorio_hora}
                onChange={(e) => setEmailConfig({ ...emailConfig, relatorio_hora: e.target.value })} />
            </div>
          </div>
          <div className="email-actions">
            <button className="btn btn-primary" onClick={salvarEmail} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            <button className="btn btn-outline" onClick={enviarTeste} disabled={sendingTest}>
              {sendingTest ? 'Enviando...' : 'Enviar E-mail de Teste'}
            </button>
            <button className="btn btn-outline" onClick={enviarRelatorio} disabled={sendingReport}>
              {sendingReport ? 'Enviando...' : 'Enviar Relatório Agora'}
            </button>
          </div>
        </div>

        <div className="config-card">
          <h3>Sobre</h3>
          <dl>
            <dt>Versão</dt>
            <dd>{version}</dd>
            <dt>Desenvolvedor</dt>
            <dd>Cristian Raffi Cunha</dd>
            <dt>Plataforma</dt>
            <dd>Pelotense IT - Gestão de Chamados</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
