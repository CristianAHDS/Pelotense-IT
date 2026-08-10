import './Configuracoes.css';

export default function Configuracoes() {
  return (
    <div className="config-page">
      <div className="page-header">
        <h2>Configurações</h2>
        <span className="page-subtitle">
          Gerencie as configurações do sistema
        </span>
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
          <button className="btn btn-primary" style={{ marginTop: 16 }}>
            Salvar
          </button>
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
            <input type="checkbox" />
          </label>
        </div>

        <div className="config-card">
          <h3>Sobre</h3>
          <dl>
            <dt>Versão</dt>
            <dd>1.0.0</dd>
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
