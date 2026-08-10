const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

function verificarBadges(usuario) {
  const badges = query('SELECT * FROM badges ORDER BY categoria, id');
  const conquistados = new Set(
    query('SELECT badge_id FROM usuario_badges WHERE usuario = ?', [usuario]).map(r => r.badge_id)
  );
  const newBadges = [];

  const totalResolvidos = (queryOne(
    "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido'", [usuario]
  )?.c || 0);

  const porCategoria = {};
  query(
    "SELECT categoria, COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' GROUP BY categoria",
    [usuario]
  ).forEach(r => { porCategoria[r.categoria] = r.c; });

  const porPrioridade = {};
  query(
    "SELECT prioridade, COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' GROUP BY prioridade",
    [usuario]
  ).forEach(r => { porPrioridade[r.prioridade] = r.c; });

  const categoriasResolvidas = Object.keys(porCategoria).filter(c => porCategoria[c] > 0);

  const today = new Date().toISOString().slice(0, 10);
  const resolvedHoje = queryOne(
    "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' AND date(resolvido_em) = ?",
    [usuario, today]
  )?.c || 0;

  const resolvedNoturno = queryOne(
    `SELECT COUNT(*) as c FROM chamados
     WHERE tecnico = ? AND status = 'resolvido'
     AND (CAST(strftime('%H', resolvido_em) AS INTEGER) >= 22 OR CAST(strftime('%H', resolvido_em) AS INTEGER) < 6)`,
    [usuario]
  )?.c || 0;

  const diasAtivos = query(
    `SELECT DISTINCT date(resolvido_em) as dia FROM chamados
     WHERE tecnico = ? AND status = 'resolvido' AND resolvido_em IS NOT NULL
     ORDER BY dia DESC LIMIT 60`,
    [usuario]
  ).map(r => r.dia);

  let streak = 0;
  if (diasAtivos.length > 0) {
    const todayDate = new Date(today + 'T00:00:00');
    let checkDate = new Date(todayDate);
    for (let i = 0; i < diasAtivos.length; i++) {
      const checkStr = checkDate.toISOString().slice(0, 10);
      if (diasAtivos.includes(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0 && diasAtivos[0] === today) {
        continue;
      } else if (i === 0) {
        const yesterday = new Date(todayDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().slice(0, 10);
        if (diasAtivos.includes(yestStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 2);
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  const CATEGORIAS_TODAS = ['hardware', 'software', 'rede', 'impressora', 'email', 'acesso', 'geral', 'evento', 'censura'];

  for (const badge of badges) {
    if (conquistados.has(badge.id)) continue;
    const criterio = JSON.parse(badge.criterio);
    let awarded = false;

    switch (criterio.tipo) {
      case 'primeiro':
        awarded = totalResolvidos >= 1;
        break;
      case 'total':
        awarded = totalResolvidos >= criterio.min;
        break;
      case 'categoria':
        awarded = (porCategoria[criterio.categoria] || 0) >= criterio.min;
        break;
      case 'tempo_max_horas':
        awarded = queryOne(
          `SELECT COUNT(*) as c FROM chamados
           WHERE tecnico = ? AND status = 'resolvido' AND resolvido_em IS NOT NULL
           AND (julianday(resolvido_em) - julianday(criado_em)) * 24 <= ?`,
          [usuario, criterio.horas]
        )?.c >= 1;
        break;
      case 'prioridade':
        awarded = (porPrioridade[criterio.prioridade] || 0) >= criterio.min;
        break;
      case 'todas_categorias':
        awarded = CATEGORIAS_TODAS.every(c => (porCategoria[c] || 0) > 0);
        break;
      case 'dia':
        awarded = resolvedHoje >= criterio.min;
        break;
      case 'sequencia_dias':
        awarded = streak >= criterio.min;
        break;
      case 'noturno':
        awarded = resolvedNoturno >= criterio.min;
        break;
    }

    if (awarded) {
      try {
        run('INSERT OR IGNORE INTO usuario_badges (usuario, badge_id) VALUES (?, ?)', [usuario, badge.id]);
        newBadges.push(badge);
      } catch (_) {}
    }
  }

  return { totalResolvidos, newBadges, porCategoria, porPrioridade, resolvedHoje, streak, resolvedNoturno, categoriasResolvidas };
}

router.get('/badges', (req, res) => {
  try {
    const badges = query('SELECT * FROM badges ORDER BY categoria, id');
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usuario/:usuario', (req, res) => {
  try {
    const { usuario } = req.params;
    const badges = query(
      `SELECT b.*, ub.conquistado_em FROM badges b
       INNER JOIN usuario_badges ub ON b.id = ub.badge_id
       WHERE ub.usuario = ?
       ORDER BY ub.conquistado_em DESC`,
      [usuario]
    );

    const totalResolvidos = queryOne(
      "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido'", [usuario]
    )?.c || 0;

    const totalAtendidos = queryOne(
      "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ?", [usuario]
    )?.c || 0;

    const porCategoria = {};
    query(
      "SELECT categoria, COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' GROUP BY categoria",
      [usuario]
    ).forEach(r => { porCategoria[r.categoria] = r.c; });

    const porPrioridade = {};
    query(
      "SELECT prioridade, COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' GROUP BY prioridade",
      [usuario]
    ).forEach(r => { porPrioridade[r.prioridade] = r.c; });

    const slaMedio = queryOne(
      `SELECT ROUND(AVG((julianday(resolvido_em) - julianday(criado_em)) * 24), 1) as horas
       FROM chamados WHERE tecnico = ? AND status = 'resolvido' AND resolvido_em IS NOT NULL`,
      [usuario]
    )?.horas || 0;

    const today = new Date().toISOString().slice(0, 10);
    const resolvedHoje = queryOne(
      "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' AND date(resolvido_em) = ?",
      [usuario, today]
    )?.c || 0;

    const resolvedNoturno = queryOne(
      `SELECT COUNT(*) as c FROM chamados
       WHERE tecnico = ? AND status = 'resolvido'
       AND (CAST(strftime('%H', resolvido_em) AS INTEGER) >= 22 OR CAST(strftime('%H', resolvido_em) AS INTEGER) < 6)`,
      [usuario]
    )?.c || 0;

    const diasAtivos = query(
      `SELECT DISTINCT date(resolvido_em) as dia FROM chamados
       WHERE tecnico = ? AND status = 'resolvido' AND resolvido_em IS NOT NULL
       ORDER BY dia DESC LIMIT 60`,
      [usuario]
    ).map(r => r.dia);

    let streak = 0;
    if (diasAtivos.length > 0) {
      const todayDate = new Date(today + 'T00:00:00');
      let checkDate = new Date(todayDate);
      for (let i = 0; i < diasAtivos.length; i++) {
        const checkStr = checkDate.toISOString().slice(0, 10);
        if (diasAtivos.includes(checkStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0 && diasAtivos[0] === today) {
          continue;
        } else if (i === 0) {
          const yesterday = new Date(todayDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yestStr = yesterday.toISOString().slice(0, 10);
          if (diasAtivos.includes(yestStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 2);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    const allBadges = query('SELECT * FROM badges ORDER BY categoria, id');
    const conquistadosMap = {};
    badges.forEach(b => { conquistadosMap[b.id] = b; });

    let nivel = 'Iniciante';
    let medal = '🥉';
    if (totalResolvidos >= 200) { nivel = 'Lenda'; medal = '👑'; }
    else if (totalResolvidos >= 100) { nivel = 'Diamante'; medal = '💎'; }
    else if (totalResolvidos >= 50) { nivel = 'Ouro'; medal = '🏆'; }
    else if (totalResolvidos >= 25) { nivel = 'Prata'; medal = '🥇'; }
    else if (totalResolvidos >= 10) { nivel = 'Bronze'; medal = '🥈'; }

    const pontosProximoNivel = totalResolvidos < 10 ? 10 - totalResolvidos
      : totalResolvidos < 25 ? 25 - totalResolvidos
      : totalResolvidos < 50 ? 50 - totalResolvidos
      : totalResolvidos < 100 ? 100 - totalResolvidos
      : totalResolvidos < 200 ? 200 - totalResolvidos
      : 0;

    const proximoNivel = totalResolvidos < 10 ? 'Bronze'
      : totalResolvidos < 25 ? 'Prata'
      : totalResolvidos < 50 ? 'Ouro'
      : totalResolvidos < 100 ? 'Diamante'
      : totalResolvidos < 200 ? 'Lenda'
      : 'Máximo';

    const progressoNivel = totalResolvidos < 10 ? Math.round((totalResolvidos / 10) * 100)
      : totalResolvidos < 25 ? Math.round(((totalResolvidos - 10) / 15) * 100)
      : totalResolvidos < 50 ? Math.round(((totalResolvidos - 25) / 25) * 100)
      : totalResolvidos < 100 ? Math.round(((totalResolvidos - 50) / 50) * 100)
      : totalResolvidos < 200 ? Math.round(((totalResolvidos - 100) / 100) * 100)
      : 100;

    res.json({
      usuario,
      totalResolvidos,
      totalAtendidos,
      slaMedio,
      resolvedHoje,
      resolvedNoturno,
      streak,
      nivel,
      medal,
      pontosProximoNivel,
      proximoNivel,
      progressoNivel,
      badges: badges.map(b => ({ ...b, conquistado: true })),
      allBadges: allBadges.map(b => ({
        ...b,
        conquistado: !!conquistadosMap[b.id],
        conquistado_em: conquistadosMap[b.id]?.conquistado_em || null
      })),
      porCategoria,
      porPrioridade,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ranking', (req, res) => {
  try {
    const tecnicos = query(
      `SELECT tecnico,
        COUNT(*) as totalAtendidos,
        SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as totalResolvidos,
        ROUND(AVG(CASE WHEN status = 'resolvido' AND resolvido_em IS NOT NULL
          THEN (julianday(resolvido_em) - julianday(criado_em)) * 24 ELSE NULL END), 1) as slaMedio
       FROM chamados WHERE tecnico IS NOT NULL
       GROUP BY tecnico
       ORDER BY totalResolvidos DESC`
    );

    const allBadgeCounts = {};
    query(
      `SELECT usuario, COUNT(*) as c FROM usuario_badges GROUP BY usuario`
    ).forEach(r => { allBadgeCounts[r.usuario] = r.c; });

    const ranking = tecnicos.map(t => {
      let nivel = 'Iniciante';
      let medal = '🥉';
      if (t.totalResolvidos >= 200) { nivel = 'Lenda'; medal = '👑'; }
      else if (t.totalResolvidos >= 100) { nivel = 'Diamante'; medal = '💎'; }
      else if (t.totalResolvidos >= 50) { nivel = 'Ouro'; medal = '🏆'; }
      else if (t.totalResolvidos >= 25) { nivel = 'Prata'; medal = '🥇'; }
      else if (t.totalResolvidos >= 10) { nivel = 'Bronze'; medal = '🥈'; }

      return {
        tecnico: t.tecnico,
        totalResolvidos: t.totalResolvidos,
        totalAtendidos: t.totalAtendidos,
        slaMedio: t.slaMedio || 0,
        badges: allBadgeCounts[t.tecnico] || 0,
        nivel,
        medal,
      };
    });

    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verificar/:usuario', (req, res) => {
  try {
    const { usuario } = req.params;
    const resultado = verificarBadges(usuario);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, verificarBadges };
