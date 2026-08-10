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

  const slaMedio = queryOne(
    `SELECT ROUND(AVG((julianday(resolvido_em) - julianday(criado_em)) * 24), 1) as horas
     FROM chamados WHERE status = 'resolvido' AND resolvido_em IS NOT NULL`
  )?.horas || 0;

  const catRows = porCategoria.map(c => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:7px 0;font-size:13px;color:#cbd5e1;">${c.categoria}</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:700;color:#818cf8;">${c.c}</td></tr>`).join('');

  const tecnicosRows = porTecnico.map(t => {
    const taxa = t.total > 0 ? Math.round((t.resolvidos / t.total) * 100) : 0;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:7px 0;font-size:13px;color:#cbd5e1;">${t.tecnico}</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:700;color:#818cf8;">${t.resolvidosHoje}</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:600;color:#94a3b8;">${t.total}</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:700;color:#34d399;">${t.resolvidos}</td><td style="padding:7px 0;text-align:right;font-size:13px;font-weight:600;color:#818cf8;">${taxa}%</td></tr>`;
  }).join('');

  const criticosRows = criticos.length > 0
    ? criticos.map(c => `<tr style="border-bottom:1px solid rgba(244,63,94,0.1);"><td style="padding:8px 12px;font-size:13px;color:#94a3b8;">#${c.id}</td><td style="padding:8px 12px;font-size:13px;color:#e8edf5;">${c.titulo}</td><td style="padding:8px 12px;font-size:13px;color:#94a3b8;">${c.tecnico || '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado crítico pendente! 🎉</td></tr>';

  const taxaResolucao = Math.round((totalResolvidos / (totalGeral || 1)) * 100);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;margin:0;padding:24px;color:#e8edf5;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.15) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,0.08) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(99,102,241,0.04) 0%,transparent 70%);-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.5),rgba(79,70,229,0.5));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px 24px;text-align:center;box-shadow:0 8px 32px rgba(99,102,241,0.25),0 0 60px rgba(99,102,241,0.08);margin-bottom:24px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-60px;right:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.04);pointer-events:none;"></div>
      <div style="position:absolute;bottom:-40px;left:-30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none;"></div>
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.08);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;overflow:hidden;box-shadow:0 0 20px rgba(99,102,241,0.15);">
        <img src="https://i.imgur.com/mfoPeJL.png" alt="Pelotense IT" style="width:100%;height:100%;object-fit:contain;">
      </div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;text-shadow:0 2px 8px rgba(0,0,0,0.2);">Pelotense IT</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;font-weight:500;">Relatório Diário — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Stats Cards -->
    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px;">
      <tr>
        <td style="width:25%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(99,102,241,0.1);border-radius:16px;padding:20px 14px;text-align:center;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-25px;right:-25px;width:70px;height:70px;border-radius:50%;background:rgba(99,102,241,0.06);filter:blur(30px);pointer-events:none;"></div>
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,0.12);display:block;margin:0 auto 10px;text-align:center;line-height:40px;font-size:20px;">📥</div>
            <div style="font-size:28px;font-weight:800;color:#818cf8;letter-spacing:-0.5px;line-height:1.2;text-shadow:0 0 15px rgba(99,102,241,0.2);">${totalHoje}</div>
            <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Novos</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(16,185,129,0.1);border-radius:16px;padding:20px 14px;text-align:center;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-25px;right:-25px;width:70px;height:70px;border-radius:50%;background:rgba(16,185,129,0.06);filter:blur(30px);pointer-events:none;"></div>
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(16,185,129,0.12);display:block;margin:0 auto 10px;text-align:center;line-height:40px;font-size:20px;">✅</div>
            <div style="font-size:28px;font-weight:800;color:#34d399;letter-spacing:-0.5px;line-height:1.2;text-shadow:0 0 15px rgba(16,185,129,0.2);">${resolvidosHoje}</div>
            <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Resolvidos</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(245,158,11,0.1);border-radius:16px;padding:20px 14px;text-align:center;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-25px;right:-25px;width:70px;height:70px;border-radius:50%;background:rgba(245,158,11,0.06);filter:blur(30px);pointer-events:none;"></div>
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(245,158,11,0.12);display:block;margin:0 auto 10px;text-align:center;line-height:40px;font-size:20px;">⏳</div>
            <div style="font-size:28px;font-weight:800;color:#fbbf24;letter-spacing:-0.5px;line-height:1.2;text-shadow:0 0 15px rgba(245,158,11,0.2);">${abertos + emAndamento + pendentes}</div>
            <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Pendentes</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(56,189,248,0.1);border-radius:16px;padding:20px 14px;text-align:center;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-25px;right:-25px;width:70px;height:70px;border-radius:50%;background:rgba(56,189,248,0.06);filter:blur(30px);pointer-events:none;"></div>
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(56,189,248,0.12);display:block;margin:0 auto 10px;text-align:center;line-height:40px;font-size:20px;">⚡</div>
            <div style="font-size:28px;font-weight:800;color:#38bdf8;letter-spacing:-0.5px;line-height:1.2;text-shadow:0 0 15px rgba(56,189,248,0.2);">${slaMedio}h</div>
            <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">SLA Médio</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Progress bar -->
    <div style="background:rgba(22,29,47,0.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(99,102,241,0.06);border-radius:16px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Taxa de Resolução</span>
        <span style="font-size:14px;font-weight:800;color:#818cf8;">${taxaResolucao}%</span>
      </div>
      <div style="height:8px;background:rgba(28,37,56,0.5);border-radius:100px;overflow:hidden;">
        <div style="height:100%;width:${taxaResolucao}%;background:linear-gradient(90deg,#6366f1,#818cf8,#10b981);border-radius:100px;box-shadow:0 0 10px rgba(99,102,241,0.15);"></div>
      </div>
    </div>

    <!-- Grid: Críticos + Categoria -->
    <table style="width:100%;border-collapse:separate;border-spacing:10px;margin-bottom:20px;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(244,63,94,0.06);border-radius:16px;padding:20px;min-height:180px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-35px;right:-15px;width:80px;height:80px;border-radius:50%;background:rgba(244,63,94,0.04);filter:blur(30px);pointer-events:none;"></div>
            <h2 style="font-size:14px;font-weight:700;color:#f87171;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f43f5e;box-shadow:0 0 8px rgba(244,63,94,0.4);"></span>
              Críticos Pendentes
              <span style="margin-left:auto;font-size:12px;color:#64748b;font-weight:600;">${criticos.length}</span>
            </h2>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead><tr style="border-bottom:1px solid rgba(244,63,94,0.12);"><th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.5px;">#</th><th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.5px;">Título</th><th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.5px;">Téc.</th></tr></thead>
              <tbody>${criticosRows}</tbody>
            </table>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="background:rgba(22,29,47,0.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(99,102,241,0.05);border-radius:16px;padding:20px;min-height:180px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-35px;right:-15px;width:80px;height:80px;border-radius:50%;background:rgba(99,102,241,0.03);filter:blur(30px);pointer-events:none;"></div>
            <h2 style="font-size:14px;font-weight:700;color:#e8edf5;margin:0 0 14px;">
              <span style="vertical-align:middle;margin-right:4px;font-size:16px;">📂</span>
              <span style="vertical-align:middle;">Chamados Hoje por Categoria</span>
            </h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><th style="padding:6px 0;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Categoria</th><th style="padding:6px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Qtd</th></tr></thead>
              <tbody>${catRows || '<tr><td colspan="2" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Nenhum chamado hoje</td></tr>'}</tbody>
            </table>
          </div>
        </td>
      </tr>
    </table>

    <!-- Por Técnico -->
    <div style="background:rgba(22,29,47,0.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(99,102,241,0.05);border-radius:16px;padding:20px;margin-bottom:20px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-45px;right:-25px;width:90px;height:90px;border-radius:50%;background:rgba(99,102,241,0.03);filter:blur(35px);pointer-events:none;"></div>
      <h2 style="font-size:14px;font-weight:700;color:#e8edf5;margin:0 0 14px;">
        <span style="vertical-align:middle;margin-right:4px;font-size:16px;">👨‍💻</span>
        <span style="vertical-align:middle;">Desempenho por Técnico</span>
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <th style="padding:8px 0;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Técnico</th>
            <th style="padding:8px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Hoje</th>
            <th style="padding:8px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
            <th style="padding:8px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Resolv.</th>
            <th style="padding:8px 0;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Taxa</th>
          </tr>
        </thead>
        <tbody>${tecnicosRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#64748b;font-size:12px;">Nenhum técnico</td></tr>'}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="background:rgba(22,29,47,0.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(99,102,241,0.05);border-radius:16px;padding:18px 20px;text-align:center;margin-bottom:20px;">
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:18px;row-gap:10px;">
        <span style="font-size:12px;color:#94a3b8;">📋 <strong style="color:#e8edf5;">${totalGeral}</strong> total</span>
        <span style="font-size:12px;color:#94a3b8;">✅ <strong style="color:#34d399;">${totalResolvidos}</strong> resolvidos</span>
        <span style="font-size:12px;color:#94a3b8;">📥 <strong style="color:#818cf8;">${abertos}</strong> abertos</span>
        <span style="font-size:12px;color:#94a3b8;">🔧 <strong style="color:#38bdf8;">${emAndamento}</strong> em andamento</span>
        <span style="font-size:12px;color:#94a3b8;">⏳ <strong style="color:#fbbf24;">${pendentes}</strong> pendentes</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:8px 0 4px;">
      <p style="margin:0;font-size:11px;color:#64748b;">Relatório automático do <strong style="color:#818cf8;">Pelotense IT Dashboard</strong></p>
      <p style="margin:4px 0 0;font-size:10px;color:#475569;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
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
    html: `<div style="font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#0a0e1a;padding:40px;color:#e8edf5;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,0.06) 0%,transparent 50%);-webkit-font-smoothing:antialiased;">
      <div style="max-width:480px;margin:0 auto;background:rgba(22,29,47,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(16,185,129,0.1);border-radius:16px;padding:32px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-35px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(16,185,129,0.06);filter:blur(30px);pointer-events:none;"></div>
        <div style="font-size:40px;margin-bottom:16px;text-shadow:0 0 20px rgba(16,185,129,0.2);">✅</div>
        <h2 style="color:#e8edf5;font-size:18px;font-weight:800;margin:0 0 8px;letter-spacing:-0.3px;">E-mail de Teste</h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">A configuração SMTP está funcionando corretamente.</p>
        <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08);border-radius:8px;padding:10px 16px;">
          <p style="margin:0;color:#818cf8;font-size:12px;font-weight:600;">Pelotense IT Dashboard</p>
        </div>
      </div>
    </div>`,
  });
  return true;
}

module.exports = { gerarRelatorioDiario, enviarTeste, resetTransporter };
