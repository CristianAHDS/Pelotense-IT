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

  const totalHoje = queryOne("SELECT COUNT(*) as c FROM chamados WHERE date(criado_em) = ?", [today])?.c || 0;
  const resolvidosHoje = queryOne("SELECT COUNT(*) as c FROM chamados WHERE status = 'resolvido' AND date(resolvido_em) = ?", [today])?.c || 0;
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

  const slaPorPrioridade = query(
    `SELECT prioridade, ROUND(AVG((julianday(resolvido_em) - julianday(criado_em)) * 24), 1) as horas, COUNT(*) as total
     FROM chamados WHERE status = 'resolvido' AND resolvido_em IS NOT NULL
     GROUP BY prioridade ORDER BY
       CASE prioridade WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 WHEN 'baixa' THEN 4 END`
  );

  const topSolicitantes = query(
    `SELECT solicitante, COUNT(*) as total FROM chamados
     GROUP BY solicitante ORDER BY total DESC LIMIT 5`
  );

  const slaMedio = queryOne(
    `SELECT ROUND(AVG((julianday(resolvido_em) - julianday(criado_em)) * 24), 1) as horas
     FROM chamados WHERE status = 'resolvido' AND resolvido_em IS NOT NULL`
  )?.horas || 0;

  const catRows = porCategoria.map(c =>
    `<tr><td style="padding:7px 12px;font-size:13px;color:#cbd5e1;border-bottom:1px solid #1e2d47;">${c.categoria}</td><td style="padding:7px 12px;text-align:right;font-size:13px;font-weight:700;color:#818cf8;border-bottom:1px solid #1e2d47;">${c.c}</td></tr>`
  ).join('');

  const tecnicosRows = porTecnico.map(t => {
    const taxa = t.total > 0 ? Math.round((t.resolvidos / t.total) * 100) : 0;
    return `<tr><td style="padding:8px 12px;font-size:13px;color:#cbd5e1;border-bottom:1px solid #1e2d47;">${t.tecnico}</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:700;color:#818cf8;border-bottom:1px solid #1e2d47;">${t.resolvidosHoje}</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600;color:#94a3b8;border-bottom:1px solid #1e2d47;">${t.total}</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:700;color:#34d399;border-bottom:1px solid #1e2d47;">${t.resolvidos}</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600;color:#818cf8;border-bottom:1px solid #1e2d47;">${taxa}%</td></tr>`;
  }).join('');

  const slaPrioridadeRows = slaPorPrioridade.map(s =>
    `<tr><td style="padding:8px 12px;font-size:13px;color:#cbd5e1;border-bottom:1px solid #1e2d47;text-transform:capitalize;">${s.prioridade}</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:700;color:#38bdf8;border-bottom:1px solid #1e2d47;">${s.horas}h</td><td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600;color:#94a3b8;border-bottom:1px solid #1e2d47;">${s.total}</td></tr>`
  ).join('');

  const topSolRows = topSolicitantes.map((s, i) =>
    `<tr><td style="padding:7px 12px;font-size:13px;color:#94a3b8;border-bottom:1px solid #1e2d47;font-weight:700;">${i + 1}º</td><td style="padding:7px 12px;font-size:13px;color:#cbd5e1;border-bottom:1px solid #1e2d47;">${s.solicitante}</td><td style="padding:7px 12px;text-align:right;font-size:13px;font-weight:700;color:#818cf8;border-bottom:1px solid #1e2d47;">${s.total}</td></tr>`
  ).join('');

  const criticosRows = criticos.length > 0
    ? criticos.map(c => `<tr><td style="padding:8px 12px;font-size:13px;color:#94a3b8;border-bottom:1px solid rgba(244,63,94,0.15);">#${c.id}</td><td style="padding:8px 12px;font-size:13px;color:#e8edf5;border-bottom:1px solid rgba(244,63,94,0.15);">${c.titulo}</td><td style="padding:8px 12px;font-size:13px;color:#94a3b8;border-bottom:1px solid rgba(244,63,94,0.15);">${c.tecnico || '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado crítico pendente!</td></tr>';

  const taxaResolucao = Math.round((totalResolvidos / (totalGeral || 1)) * 100);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;margin:0;padding:24px;color:#e8edf5;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,0.06) 0%,transparent 50%);-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
    <tr><td>

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px;margin-bottom:24px;box-shadow:0 8px 32px rgba(99,102,241,0.25);">
        <tr><td style="padding:32px 24px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
            <tr><td style="width:56px;height:56px;background:rgba(255,255,255,0.12);border-radius:14px;text-align:center;vertical-align:middle;box-shadow:0 0 20px rgba(99,102,241,0.15);">
              <img src="https://i.imgur.com/mfoPeJL.png" alt="Pelotense IT" width="56" height="56" style="display:block;border-radius:14px;">
            </td></tr>
          </table>
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Pelotense IT</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;font-weight:500;">Relatório Diário — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </td></tr>
      </table>

      <!-- Stats Cards -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td width="25%" style="padding:4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid rgba(99,102,241,0.1);border-radius:16px;">
              <tr><td style="padding:20px 14px;text-align:center;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;"><tr><td style="width:40px;height:40px;background:rgba(99,102,241,0.12);border-radius:10px;text-align:center;font-size:20px;">📥</td></tr></table>
                <div style="font-size:28px;font-weight:800;color:#818cf8;letter-spacing:-0.5px;line-height:1.2;">${totalHoje}</div>
                <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Novos</div>
              </td></tr>
            </table>
          </td>
          <td width="25%" style="padding:4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid rgba(16,185,129,0.1);border-radius:16px;">
              <tr><td style="padding:20px 14px;text-align:center;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;"><tr><td style="width:40px;height:40px;background:rgba(16,185,129,0.12);border-radius:10px;text-align:center;font-size:20px;">✅</td></tr></table>
                <div style="font-size:28px;font-weight:800;color:#34d399;letter-spacing:-0.5px;line-height:1.2;">${resolvidosHoje}</div>
                <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Resolvidos</div>
              </td></tr>
            </table>
          </td>
          <td width="25%" style="padding:4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid rgba(245,158,11,0.1);border-radius:16px;">
              <tr><td style="padding:20px 14px;text-align:center;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;"><tr><td style="width:40px;height:40px;background:rgba(245,158,11,0.12);border-radius:10px;text-align:center;font-size:20px;">⏳</td></tr></table>
                <div style="font-size:28px;font-weight:800;color:#fbbf24;letter-spacing:-0.5px;line-height:1.2;">${abertos + emAndamento + pendentes}</div>
                <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Pendentes</div>
              </td></tr>
            </table>
          </td>
          <td width="25%" style="padding:4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid rgba(56,189,248,0.1);border-radius:16px;">
              <tr><td style="padding:20px 14px;text-align:center;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;"><tr><td style="width:40px;height:40px;background:rgba(56,189,248,0.12);border-radius:10px;text-align:center;font-size:20px;">⚡</td></tr></table>
                <div style="font-size:28px;font-weight:800;color:#38bdf8;letter-spacing:-0.5px;line-height:1.2;">${slaMedio}h</div>
                <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">SLA Médio</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Progress bar -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid #1e2d47;border-radius:16px;margin-bottom:20px;">
        <tr><td style="padding:18px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
            <tr>
              <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Taxa de Resolução</td>
              <td style="text-align:right;font-size:14px;font-weight:800;color:#818cf8;">${taxaResolucao}%</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="height:8px;background:#1c2538;border-radius:100px;">
            <tr><td style="height:8px;width:${taxaResolucao}%;background:linear-gradient(90deg,#6366f1,#10b981);border-radius:100px;"></td><td></td></tr>
          </table>
        </td></tr>
      </table>

      <!-- Grid: Críticos + Categoria -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td width="50%" style="padding:5px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid rgba(244,63,94,0.08);border-radius:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                  <tr>
                    <td style="font-size:14px;font-weight:700;color:#f87171;">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f43f5e;vertical-align:middle;margin-right:8px;box-shadow:0 0 6px rgba(244,63,94,0.3);"></span>
                      Críticos Pendentes
                    </td>
                    <td style="text-align:right;font-size:12px;color:#64748b;font-weight:600;">${criticos.length}</td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;">
                  <tr style="border-bottom:1px solid rgba(244,63,94,0.12);">
                    <td style="padding:6px 8px;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;">#</td>
                    <td style="padding:6px 8px;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;">Título</td>
                    <td style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;">Téc.</td>
                  </tr>
                  ${criticosRows}
                </table>
              </td></tr>
            </table>
          </td>
          <td width="50%" style="padding:5px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid #1e2d47;border-radius:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr><td style="font-size:14px;font-weight:700;color:#e8edf5;">📂 Chamados Hoje por Categoria</td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr style="border-bottom:1px solid #1e2d47;">
                    <td style="padding:6px 0;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Categoria</td>
                    <td style="padding:6px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Qtd</td>
                  </tr>
                  ${catRows || '<tr><td colspan="2" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado hoje</td></tr>'}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Por Técnico -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid #1e2d47;border-radius:16px;margin-bottom:20px;">
        <tr><td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr><td style="font-size:14px;font-weight:700;color:#e8edf5;">👨‍💻 Desempenho por Técnico</td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <tr style="border-bottom:1px solid #1e2d47;">
              <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Técnico</td>
              <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Hoje</td>
              <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Total</td>
              <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Resolv.</td>
              <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Taxa</td>
            </tr>
            ${tecnicosRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Nenhum técnico</td></tr>'}
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td width="50%" style="padding:5px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid #1e2d47;border-radius:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr><td style="font-size:14px;font-weight:700;color:#e8edf5;">⚡ SLA por Prioridade</td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr style="border-bottom:1px solid #1e2d47;">
                    <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Prioridade</td>
                    <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">SLA</td>
                    <td style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Qtd</td>
                  </tr>
                  ${slaPrioridadeRows || '<tr><td colspan="3" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Sem dados</td></tr>'}
                </table>
              </td></tr>
            </table>
          </td>
          <td width="50%" style="padding:5px;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.5);border:1px solid #1e2d47;border-radius:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr><td style="font-size:14px;font-weight:700;color:#e8edf5;">🏆 Top 5 Solicitantes</td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr style="border-bottom:1px solid #1e2d47;">
                    <td style="padding:7px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">#</td>
                    <td style="padding:7px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Solicitante</td>
                    <td style="padding:7px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Chamados</td>
                  </tr>
                  ${topSolRows || '<tr><td colspan="3" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Sem dados</td></tr>'}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(22,29,47,0.45);border:1px solid rgba(99,102,241,0.08);border-radius:16px;margin-bottom:20px;">
        <tr><td style="padding:18px 20px;text-align:center;">
          <span style="font-size:12px;color:#94a3b8;">📋 <strong style="color:#e8edf5;">${totalGeral}</strong> total &nbsp;·&nbsp;</span>
          <span style="font-size:12px;color:#94a3b8;">✅ <strong style="color:#34d399;">${totalResolvidos}</strong> resolvidos &nbsp;·&nbsp;</span>
          <span style="font-size:12px;color:#94a3b8;">📥 <strong style="color:#818cf8;">${abertos}</strong> abertos &nbsp;·&nbsp;</span>
          <span style="font-size:12px;color:#94a3b8;">🔧 <strong style="color:#38bdf8;">${emAndamento}</strong> em andamento &nbsp;·&nbsp;</span>
          <span style="font-size:12px;color:#94a3b8;">⏳ <strong style="color:#fbbf24;">${pendentes}</strong> pendentes</span>
        </td></tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding:8px 0 4px;">
          <p style="margin:0;font-size:11px;color:#64748b;">Relatório automático do <strong style="color:#818cf8;">Pelotense IT Dashboard</strong></p>
          <p style="margin:4px 0 0;font-size:10px;color:#475569;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </td></tr>
      </table>

    </td></tr>
  </table>
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
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%);-webkit-font-smoothing:antialiased;"><tr><td style="padding:40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:rgba(22,29,47,0.5);border:1px solid rgba(16,185,129,0.1);border-radius:16px;">
        <tr><td style="padding:32px;text-align:center;">
          <div style="font-size:40px;margin-bottom:16px;">✅</div>
          <h2 style="color:#e8edf5;font-size:18px;font-weight:800;margin:0 0 8px;">E-mail de Teste</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">A configuração SMTP está funcionando corretamente.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08);border-radius:8px;">
            <tr><td style="padding:10px 16px;text-align:center;color:#818cf8;font-size:12px;font-weight:600;">Pelotense IT Dashboard</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr></table>`,
  });
  return true;
}

async function enviarBoasVindas(usuario) {
  const config = queryOne('SELECT * FROM config_email WHERE id = 1');
  if (!config || !config.smtp_user) return false;

  const transport = getTransporter(config);
  if (!transport) return false;

  await transport.sendMail({
    from: config.remetente,
    to: usuario.email,
    subject: 'Bem-vindo ao Pelotense IT!',
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%);-webkit-font-smoothing:antialiased;"><tr><td style="padding:40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:rgba(22,29,47,0.5);border:1px solid rgba(99,102,241,0.15);border-radius:16px;">
        <tr><td style="padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">👋</div>
          <h2 style="color:#e8edf5;font-size:20px;font-weight:800;margin:0 0 8px;">Bem-vindo, ${usuario.nome}!</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">Sua conta no Pelotense IT foi criada com sucesso. Use suas credenciais para acessar o sistema de gestão de chamados.</p>
          <p style="color:#64748b;font-size:12px;margin:24px 0 0;line-height:1.5;">Em caso de dúvidas, entre em contato com o administrador do sistema.</p>
        </td></tr>
      </table>
    </td></tr></table>`,
  });
  return true;
}

async function enviarSenhaTecnico(tecnico, senha) {
  const config = queryOne('SELECT * FROM config_email WHERE id = 1');
  if (!config || !config.smtp_user) return false;

  const transport = getTransporter(config);
  if (!transport) return false;

  await transport.sendMail({
    from: config.remetente,
    to: tecnico.email,
    subject: 'Sua conta foi criada — Pelotense IT',
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%);-webkit-font-smoothing:antialiased;"><tr><td style="padding:40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:rgba(22,29,47,0.5);border:1px solid rgba(16,185,129,0.15);border-radius:16px;">
        <tr><td style="padding:32px;">
          <h2 style="color:#e8edf5;font-size:18px;font-weight:800;margin:0 0 8px;">Olá, ${tecnico.nome}!</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">Sua conta no Pelotense IT foi criada. Use as credenciais abaixo para fazer login. No primeiro acesso será solicitada a troca da senha.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08);border-radius:8px;">
            <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Email</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:600;">${tecnico.email}</td></tr>
            <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Senha</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:600;">${senha}</td></tr>
          </table>
          <p style="color:#64748b;font-size:12px;margin:24px 0 0;line-height:1.5;">Você será solicitado a criar uma nova senha no primeiro login.</p>
        </td></tr>
      </table>
    </td></tr></table>`,
  });
  return true;
}

function formatarDataHora(str) {
  if (!str) return '';
  const [d, t] = str.split(' ');
  const [y, m, dia] = (d || '').split('-');
  const [h, min] = (t || '').split(':');
  return `${dia}/${m}/${y} às ${h}:${min}`;
}

async function enviarAlerta(alerta) {
  const config = queryOne('SELECT * FROM config_email WHERE id = 1');
  if (!config || !config.smtp_user) return { enviado: false, erro: 'Configuração SMTP incompleta' };

  const transport = getTransporter(config);
  if (!transport) return { enviado: false, erro: 'Configuração SMTP inválida' };

  const dests = (config.destinatarios || '').split(',').map(d => d.trim()).filter(Boolean);
  if (dests.length === 0) return { enviado: false, erro: 'Nenhum destinatário configurado' };

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;background-image:radial-gradient(ellipse at 20% 0%,rgba(245,158,11,0.12) 0%,transparent 50%);-webkit-font-smoothing:antialiased;"><tr><td style="padding:40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:rgba(22,29,47,0.5);border:1px solid rgba(245,158,11,0.15);border-radius:16px;">
    <tr><td style="padding:32px;">
      <div style="font-size:44px;margin-bottom:16px;text-align:center;">⏰</div>
      <h2 style="color:#e8edf5;font-size:20px;font-weight:800;margin:0 0 8px;text-align:center;">Alerta de Chamado</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;text-align:center;line-height:1.6;">Um alerta agendado foi disparado para o chamado abaixo.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08);border-radius:8px;margin-bottom:16px;">
        <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Chamado</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:700;">#${alerta.chamado_id} — ${alerta.titulo}</td></tr>
        <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Solicitante</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:600;">${alerta.solicitante}</td></tr>
        <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Prioridade</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:600;text-transform:capitalize;">${alerta.prioridade}</td></tr>
        <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Agendado para</td><td style="padding:10px 16px;color:#e8edf5;font-size:13px;font-weight:600;">${formatarDataHora(alerta.data_hora)}</td></tr>
      </table>
      ${alerta.mensagem ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.1);border-radius:8px;"><tr><td style="padding:14px 16px;color:#fbbf24;font-size:13px;">📝 ${alerta.mensagem}</td></tr></table>` : ''}
      <p style="color:#64748b;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.5;">Acesse o Pelotense IT para visualizar o chamado completo.</p>
    </td></tr>
  </table>
</td></tr></table>`;

  await transport.sendMail({
    from: config.remetente,
    to: dests.join(', '),
    subject: `⏰ Alerta — Chamado #${alerta.chamado_id}: ${alerta.titulo}`,
    html,
  });

  return { enviado: true };
}

module.exports = { gerarRelatorioDiario, enviarTeste, resetTransporter, enviarBoasVindas, enviarSenhaTecnico, enviarAlerta };
