const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');

const NIVELES = [
  { min: 0, nome: 'Iniciante', medal: '🌱' },
  { min: 10, nome: 'Bronze', medal: '🥉' },
  { min: 25, nome: 'Prata', medal: '🥈' },
  { min: 50, nome: 'Ouro', medal: '🥇' },
  { min: 100, nome: 'Esmeralda', medal: '💚' },
  { min: 150, nome: 'Rubi', medal: '🔴' },
  { min: 250, nome: 'Diamante', medal: '💎' },
  { min: 400, nome: 'Lenda', medal: '👑' },
];

function getNivelInfo(totalResolvidos) {
  let atual = NIVELES[0];
  for (const n of NIVELES) {
    if (totalResolvidos >= n.min) atual = n;
  }
  const idx = NIVELES.indexOf(atual);
  const proximo = NIVELES[idx + 1] || null;
  const progressoNivel = proximo
    ? Math.min(100, Math.round(((totalResolvidos - atual.min) / (proximo.min - atual.min)) * 100))
    : 100;
  return {
    nivel: atual.nome,
    medal: atual.medal,
    proximoNivel: proximo ? proximo.nome : 'Máximo',
    pontosProximoNivel: proximo ? proximo.min - totalResolvidos : 0,
    progressoNivel,
  };
}

function criterioMin(badge) {
  try { return JSON.parse(badge.criterio).min || 0; } catch (_) { return 0; }
}

function orderBadges(badges) {
  return [...badges].sort((a, b) => {
    if (a.categoria === b.categoria) {
      if (a.categoria === 'volume') return criterioMin(a) - criterioMin(b);
      return String(a.id).localeCompare(String(b.id));
    }
    return String(a.categoria).localeCompare(String(b.categoria));
  });
}

function calcularStreak(diasAtivos, today) {
  if (!diasAtivos.length) return 0;
  const isWeekend = (d) => { const day = d.getDay(); return day === 0 || day === 6; };

  let streak = 0;
  const cursor = new Date(today + 'T00:00:00');
  // Sábado e domingo não contam nem quebram a sequência.
  // Concede um "dia de tolerância" apenas se hoje for dia útil e ainda não houver atividade.
  let grace = !isWeekend(cursor);

  for (let guard = 0; guard < 400; guard++) {
    while (isWeekend(cursor)) cursor.setDate(cursor.getDate() - 1);
    const checkStr = cursor.toISOString().slice(0, 10);
    if (diasAtivos.includes(checkStr)) {
      streak++;
      grace = false;
      cursor.setDate(cursor.getDate() - 1);
    } else if (grace) {
      grace = false;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

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
     ORDER BY dia DESC LIMIT 400`,
    [usuario]
  ).map(r => r.dia);

  const streak = calcularStreak(diasAtivos, today);

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
    const badges = orderBadges(query('SELECT * FROM badges'));
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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const mesAtual = new Date().toISOString().slice(0, 7);

    const resolvidosSemana = queryOne(
      "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' AND date(resolvido_em) >= ?",
      [usuario, sevenDaysAgo]
    )?.c || 0;

    const resolvidosMes = queryOne(
      "SELECT COUNT(*) as c FROM chamados WHERE tecnico = ? AND status = 'resolvido' AND substr(resolvido_em, 1, 7) = ?",
      [usuario, mesAtual]
    )?.c || 0;

    const diasAtivos = query(
      `SELECT DISTINCT date(resolvido_em) as dia FROM chamados
       WHERE tecnico = ? AND status = 'resolvido' AND resolvido_em IS NOT NULL
       ORDER BY dia DESC LIMIT 400`,
      [usuario]
    ).map(r => r.dia);

    const streak = calcularStreak(diasAtivos, today);

    const allBadges = orderBadges(query('SELECT * FROM badges'));
    const conquistadosMap = {};
    badges.forEach(b => { conquistadosMap[b.id] = b; });

    const nivelInfo = getNivelInfo(totalResolvidos);
    const nivel = nivelInfo.nivel;
    const medal = nivelInfo.medal;
    const proximoNivel = nivelInfo.proximoNivel;
    const pontosProximoNivel = nivelInfo.pontosProximoNivel;
    const progressoNivel = nivelInfo.progressoNivel;

    const conquistadosIds = new Set(Object.keys(conquistadosMap));
    let proximoBadge = null;
    for (const b of allBadges) {
      if (conquistadosIds.has(b.id)) continue;
      let faltam = null;
      try {
        const c = JSON.parse(b.criterio);
        switch (c.tipo) {
          case 'primeiro': faltam = totalResolvidos >= 1 ? 0 : 1; break;
          case 'total': faltam = (c.min || 0) - totalResolvidos; break;
          case 'categoria': faltam = (c.min || 0) - (porCategoria[c.categoria] || 0); break;
          case 'prioridade': faltam = (c.min || 0) - (porPrioridade[c.prioridade] || 0); break;
          default: break;
        }
      } catch (_) {}
      if (faltam !== null && faltam > 0 && (!proximoBadge || faltam < proximoBadge.faltam)) {
        proximoBadge = { ...b, faltam };
      }
    }

    res.json({
      usuario,
      totalResolvidos,
      totalAtendidos,
      slaMedio,
      resolvedHoje,
      resolvedNoturno,
      resolvidosSemana,
      resolvidosMes,
      streak,
      nivel,
      medal,
      pontosProximoNivel,
      proximoNivel,
      progressoNivel,
      proximoBadge,
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
      const info = getNivelInfo(t.totalResolvidos);

      return {
        tecnico: t.tecnico,
        totalResolvidos: t.totalResolvidos,
        totalAtendidos: t.totalAtendidos,
        slaMedio: t.slaMedio || 0,
        badges: allBadgeCounts[t.tecnico] || 0,
        nivel: info.nivel,
        medal: info.medal,
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
