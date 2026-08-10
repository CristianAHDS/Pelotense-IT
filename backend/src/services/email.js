const nodemailer = require('nodemailer');
const { query, queryOne } = require('../database');

let transporter = null;

function getTransporter(config) {
  if (!config || !config.smtp_user || !config.smtp_pass) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465,
    auth: { user: config.smtp_user, pass: config.smtp_pass },
  });
  return transporter;
}

function resetTransporter() {
  transporter = null;
}

async function gerarRelatorioDiario() {
  const config = queryOne('SELECT * FROM config_email WHERE id = 1');
  if (!config || !config.ativo) return { enviado: false, erro: 'Relatório desativado' };
  if (!config.destinatarios) return { enviado: false, erro: 'Nenhum destinatário configurado' };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const totalHoje = queryOne("SELECT COUNT(*) as c FROM chamados WHERE date(criado_em) = ?", [today])?.c || 0;
  const resolvidosHoje = queryOne(
    "SELECT COUNT(*) as c FROM chamados WHERE status = 'resolvido' AND date(resolvido_em) = ?", [today]
  )?.c || 0;
  const abertos = queryOne("SELECT COUNT(*) as c FROM chamados WHERE status = 'aberto'")?.c || 0;
  const emAndamento = queryOne("SELECT COUNT(*) as c FROM chamados WHERE status = 'em_andamento'")?.c || 0;
  const pendentes = queryOne("SELECT COUNT(*) as c FROM chamados WHERE status = 'pendente'")?.c || 0;
  const totalResolvidos = queryOne("SELECT COUNT(*) as c FROM chamados WHERE status = 'resolvido'")?.c || 0;
  const totalGeral = queryOne("SELECT COUNT(*) as c FROM chamados")?.c || 0;

  const criticos = query(
    "SELECT id, titulo, prioridade, tecnico FROM chamados WHERE prioridade = 'critica' AND status != 'resolvido' AND status != 'fechado' ORDER BY criado_em DESC"
  );

  const porCategoria = query(
    "SELECT categoria, COUNT(*) as c FROM chamados WHERE date(criado_em) = ? GROUP BY categoria ORDER BY c DESC", [today]
  );

  const porTecnico = query(
    `SELECT tecnico,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolvidos,
      SUM(CASE WHEN date(resolvido_em) = ? THEN 1 ELSE 0 END) as resolvidosHoje
     FROM chamados WHERE tecnico IS NOT NULL
     GROUP BY tecnico ORDER BY resolvidos DESC`,
    [today]
  );

  const catRows = porCategoria.map(c => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${c.categoria}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${c.c}</td></tr>`).join('');
  const tecnicosRows = porTecnico.map(t => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${t.tecnico}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${t.resolvidosHoje}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${t.total}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${t.resolvidos}</td></tr>`).join('');
  const criticosRows = criticos.length > 0
    ? criticos.map(c => `<tr><td style="padding:6px 12px;border-bottom:1px solid #fecaca;">#${c.id}</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;">${c.titulo}</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;">${c.tecnico || '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px;text-align:center;color:#666;">Nenhum chamado crítico pendente! 🎉</td></tr>';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f5f7;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Pelotense IT</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Relatório Diário — ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <div style="padding:24px;">
      <h2 style="font-size:16px;color:#333;margin:0 0 16px;">📊 Resumo do Dia</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px;text-align:center;background:#eef2ff;border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#6366f1;">${totalHoje}</div>
            <div style="font-size:11px;color:#666;">Novos chamados</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px;text-align:center;background:#ecfdf5;border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#10b981;">${resolvidosHoje}</div>
            <div style="font-size:11px;color:#666;">Resolvidos hoje</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px;text-align:center;background:#fffbeb;border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#f59e0b;">${abertos + emAndamento + pendentes}</div>
            <div style="font-size:11px;color:#666;">Pendentes</div>
          </td>
        </tr>
      </table>

      <h2 style="font-size:16px;color:#333;margin:0 0 12px;">🔴 Chamados Críticos Pendentes (${criticos.length})</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead><tr style="background:#fef2f2;"><th style="padding:8px 12px;text-align:left;">#</th><th style="padding:8px 12px;text-align:left;">Título</th><th style="padding:8px 12px;text-align:left;">Técnico</th></tr></thead>
        <tbody>${criticosRows}</tbody>
      </table>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;">
          <h2 style="font-size:16px;color:#333;margin:0 0 12px;">📂 Por Categoria (Hoje)</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            ${catRows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#666;">Nenhum chamado hoje</td></tr>'}
          </table>
        </div>
        <div style="flex:1;">
          <h2 style="font-size:16px;color:#333;margin:0 0 12px;">👨‍💻 Por Técnico</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f8fafc;"><th style="padding:6px 12px;text-align:left;">Técnico</th><th style="padding:6px 12px;text-align:right;">Hoje</th><th style="padding:6px 12px;text-align:right;">Total</th><th style="padding:6px 12px;text-align:right;">Resolv.</th></tr></thead>
            <tbody>${tecnicosRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#666;">Nenhum técnico</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#999;">
          📋 Total geral: <strong>${totalGeral}</strong> chamados · ✅ <strong>${totalResolvidos}</strong> resolvidos · 📥 <strong>${abertos}</strong> abertos · 🔧 <strong>${emAndamento}</strong> em andamento · ⏳ <strong>${pendentes}</strong> pendentes
        </p>
      </div>
    </div>
    <div style="background:#f4f5f7;padding:12px 24px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#999;">Relatório automático gerado pelo Pelotense IT Dashboard</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const transport = getTransporter(config);
    if (!transport) return { enviado: false, erro: 'Configuração SMTP inválida' };

    const dests = config.destinatarios.split(',').map(d => d.trim()).filter(Boolean);
    await transport.sendMail({
      from: config.remetente,
      to: dests.join(', '),
      subject: `📊 Relatório Diário Pelotense IT — ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    });

    return { enviado: true };
  } catch (err) {
    return { enviado: false, erro: err.message };
  }
}

async function enviarTeste(config) {
  const transport = getTransporter(config);
  if (!transport) throw new Error('Configuração SMTP inválida');
  const dests = config.destinatarios.split(',').map(d => d.trim()).filter(Boolean);
  if (dests.length === 0) throw new Error('Nenhum destinatário configurado');
  await transport.sendMail({
    from: config.remetente,
    to: dests.join(', '),
    subject: '✅ Teste de E-mail — Pelotense IT',
    html: `<div style="font-family:Arial;padding:24px;"><h2>✅ E-mail de teste</h2><p>Se você recebeu este e-mail, a configuração SMTP está funcionando corretamente.</p><p style="color:#666;font-size:12px;">Pelotense IT Dashboard</p></div>`,
  });
  return true;
}

module.exports = { gerarRelatorioDiario, enviarTeste, resetTransporter };
