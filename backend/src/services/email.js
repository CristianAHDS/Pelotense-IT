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
    requireTLS: config.smtp_port === 587,
    auth: { user: config.smtp_user, pass: config.smtp_pass },
    tls: { rejectUnauthorized: false },
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

  const catRows = porCategoria.map(c => `<tr style="border-bottom:1px solid #1e2d47;"><td style="padding:6px 0;font-size:13px;color:#e8edf5;">${c.categoria}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#818cf8;">${c.c}</td></tr>`).join('');
  const tecnicosRows = porTecnico.map(t => `<tr style="border-bottom:1px solid #1e2d47;"><td style="padding:6px 0;font-size:13px;color:#e8edf5;">${t.tecnico}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#818cf8;">${t.resolvidosHoje}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#94a3b8;">${t.total}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#34d399;">${t.resolvidos}</td></tr>`).join('');
  const criticosRows = criticos.length > 0
    ? criticos.map(c => `<tr style="border-bottom:1px solid rgba(244,63,94,0.15);"><td style="padding:8px 12px;font-size:13px;color:#94a3b8;">#${c.id}</td><td style="padding:8px 12px;font-size:13px;color:#e8edf5;">${c.titulo}</td><td style="padding:8px 12px;font-size:13px;color:#94a3b8;">${c.tecnico || '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado crítico pendente! 🎉</td></tr>';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;margin:0;padding:24px;color:#e8edf5;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,0.05) 0%,transparent 50%);">
  <div style="max-width:620px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px;padding:28px 24px;text-align:center;box-shadow:0 4px 20px rgba(99,102,241,0.2);margin-bottom:20px;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:24px;">📊</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Pelotense IT</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;font-weight:500;">Relatório Diário — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Stats Cards -->
    <div style="margin-bottom:20px;">
      <table style="width:100%;border-collapse:separate;border-spacing:8px;">
        <tr>
          <td style="width:33.33%;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:16px 12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#818cf8;letter-spacing:-0.5px;line-height:1;">${totalHoje}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Novos chamados</div>
          </td>
          <td style="width:33.33%;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:16px 12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#34d399;letter-spacing:-0.5px;line-height:1;">${resolvidosHoje}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Resolvidos hoje</div>
          </td>
          <td style="width:33.33%;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:16px 12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fbbf24;letter-spacing:-0.5px;line-height:1;">${abertos + emAndamento + pendentes}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Pendentes</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Progress bar -->
    ${totalGeral > 0 ? `
    <div style="background:rgba(22,29,47,0.7);border:1px solid #1e2d47;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Progresso de Resolução</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="flex:1;height:8px;background:#1c2538;border-radius:100px;overflow:hidden;">
          <div style="height:100%;width:${Math.round((totalResolvidos / totalGeral) * 100)}%;background:linear-gradient(90deg,#6366f1,#10b981);border-radius:100px;"></div>
        </div>
        <span style="font-size:14px;font-weight:700;color:#818cf8;white-space:nowrap;">${Math.round((totalResolvidos / totalGeral) * 100)}%</span>
      </div>
    </div>
    ` : ''}

    <!-- Críticos Pendentes -->
    <div style="background:rgba(22,29,47,0.7);border:1px solid #1e2d47;border-radius:12px;padding:20px;margin-bottom:20px;">
      <h2 style="font-size:14px;font-weight:700;color:#e8edf5;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f43f5e;"></span>
        Chamados Críticos Pendentes (${criticos.length})
      </h2>
      ${criticosRows}
    </div>

    <!-- Por Categoria + Por Técnico -->
    <table style="width:100%;border-collapse:separate;border-spacing:10px;margin-bottom:20px;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.7);border:1px solid #1e2d47;border-radius:12px;padding:20px;height:100%;">
            <h2 style="font-size:14px;font-weight:700;color:#e8edf5;margin:0 0 14px;">📂 Por Categoria (Hoje)</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="border-bottom:1px solid #1e2d47;"><th style="padding:6px 0;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Categoria</th><th style="padding:6px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Qtd</th></tr></thead>
              <tbody>${catRows || '<tr><td colspan="2" style="padding:16px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado hoje</td></tr>'}</tbody>
            </table>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.7);border:1px solid #1e2d47;border-radius:12px;padding:20px;height:100%;">
            <h2 style="font-size:14px;font-weight:700;color:#e8edf5;margin:0 0 14px;">👨‍💻 Por Técnico</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="border-bottom:1px solid #1e2d47;"><th style="padding:4px 0;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Técnico</th><th style="padding:4px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Hoje</th><th style="padding:4px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Total</th><th style="padding:4px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Resolv.</th></tr></thead>
              <tbody>${tecnicosRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#64748b;font-size:12px;">Nenhum técnico</td></tr>'}</tbody>
            </table>
          </div>
        </td>
      </tr>
    </table>

    <!-- Totals Footer -->
    <div style="background:rgba(22,29,47,0.7);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:20px;">
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:16px;row-gap:8px;">
        <span style="font-size:12px;color:#94a3b8;">📋 <strong style="color:#e8edf5;">${totalGeral}</strong> geral</span>
        <span style="font-size:12px;color:#94a3b8;">✅ <strong style="color:#34d399;">${totalResolvidos}</strong> resolvidos</span>
        <span style="font-size:12px;color:#94a3b8;">📥 <strong style="color:#818cf8;">${abertos}</strong> abertos</span>
        <span style="font-size:12px;color:#94a3b8;">🔧 <strong style="color:#38bdf8;">${emAndamento}</strong> em andamento</span>
        <span style="font-size:12px;color:#94a3b8;">⏳ <strong style="color:#fbbf24;">${pendentes}</strong> pendentes</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:8px 0;">
      <p style="margin:0;font-size:11px;color:#64748b;">
        Relatório automático gerado pelo <strong style="color:#818cf8;">Pelotense IT Dashboard</strong>
      </p>
      <p style="margin:4px 0 0;font-size:10px;color:#475569;">
        ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
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
    html: `<div style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;padding:40px;color:#e8edf5;">
      <div style="max-width:480px;margin:0 auto;background:rgba(22,29,47,0.7);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:16px;">✅</div>
        <h2 style="color:#e8edf5;font-size:18px;font-weight:800;margin:0 0 8px;">E-mail de Teste</h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">A configuração SMTP está funcionando corretamente.</p>
        <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:8px;padding:10px 16px;">
          <p style="margin:0;color:#818cf8;font-size:12px;font-weight:600;">Pelotense IT Dashboard</p>
        </div>
      </div>
    </div>`,
  });
  return true;
}

module.exports = { gerarRelatorioDiario, enviarTeste, resetTransporter };
