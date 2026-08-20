const express = require('express');
const { query, queryOne, run } = require('../database');
const { getUsuarioLogado } = require('../middleware/auth');

const router = express.Router();

function hoje() {
  return queryOne("SELECT date('now','localtime') as d")?.d;
}

function agora() {
  return queryOne("SELECT datetime('now','localtime') as d")?.d;
}

function toMs(s) {
  return new Date(String(s).replace(' ', 'T')).getTime();
}

function diffMin(a, b) {
  return Math.round((toMs(b) - toMs(a)) / 60000);
}

function buildRegistro(reg) {
  if (!reg) return null;
  const pausas = query(
    'SELECT * FROM ponto_pausas WHERE usuario = ? AND data = ? ORDER BY id ASC',
    [reg.usuario, reg.data]
  );
  let total = null;
  if (reg.inicio && reg.fim) {
    let t = diffMin(reg.inicio, reg.fim);
    if (reg.inicio_almoco && reg.fim_almoco) t -= diffMin(reg.inicio_almoco, reg.fim_almoco);
    for (const p of pausas) if (p.fim) t -= diffMin(p.inicio, p.fim);
    total = Math.max(0, t);
  }
  return { ...reg, pausas, total_minutos: total };
}

function pausaAberta(usuario, data) {
  return queryOne(
    'SELECT * FROM ponto_pausas WHERE usuario = ? AND data = ? AND fim IS NULL ORDER BY id DESC LIMIT 1',
    [usuario, data]
  );
}

function statusDe(reg, aberta) {
  if (!reg || !reg.inicio) return 'nao_iniciado';
  if (reg.fim) return 'finalizado';
  if (reg.inicio_almoco && !reg.fim_almoco) return 'almoco';
  if (aberta) return 'pausado';
  return 'trabalhando';
}

function getUsuario(req) {
  const primeiro = (v) => (Array.isArray(v) ? v[0] : v);
  const logado = getUsuarioLogado(req);
  if (logado.nome) return primeiro(logado.nome);
  return primeiro((req.body && req.body.usuario) || req.query.usuario || '');
}

router.get('/status', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    const aberta = pausaAberta(usuario, data);
    res.json({
      status: statusDe(reg, aberta),
      registro: buildRegistro(reg),
      pausaAberta: aberta,
      agora: agora(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/iniciar', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const hora = agora();
    let reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    if (reg && reg.inicio) return res.status(400).json({ error: 'Expediente já iniciado' });

    if (reg) {
      run('UPDATE ponto SET inicio = ?, inicio_almoco = NULL, fim_almoco = NULL, fim = NULL WHERE id = ?', [hora, reg.id]);
    } else {
      run('INSERT INTO ponto (usuario, data, inicio) VALUES (?, ?, ?)', [usuario, data, hora]);
    }
    reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    res.json({ status: statusDe(reg, null), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pausar', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    if (!reg || !reg.inicio) return res.status(400).json({ error: 'Expediente não iniciado' });
    if (reg.fim) return res.status(400).json({ error: 'Expediente já finalizado' });
    if (reg.inicio_almoco && !reg.fim_almoco) return res.status(400).json({ error: 'Em horário de almoço' });
    const aberta = pausaAberta(usuario, data);
    if (aberta) return res.status(400).json({ error: 'Já existe uma pausa em andamento' });

    const hora = agora();
    run('INSERT INTO ponto_pausas (usuario, data, inicio) VALUES (?, ?, ?)', [usuario, data, hora]);
    res.json({ status: statusDe(reg, pausaAberta(usuario, data)), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/retomar', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    const aberta = pausaAberta(usuario, data);
    if (!aberta) return res.status(400).json({ error: 'Nenhuma pausa em andamento' });

    run('UPDATE ponto_pausas SET fim = ? WHERE id = ?', [agora(), aberta.id]);
    res.json({ status: statusDe(reg, null), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/iniciar-almoco', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    if (!reg || !reg.inicio) return res.status(400).json({ error: 'Expediente não iniciado' });
    if (reg.fim) return res.status(400).json({ error: 'Expediente já finalizado' });
    if (reg.inicio_almoco && !reg.fim_almoco) return res.status(400).json({ error: 'Almoço já iniciado' });
    const aberta = pausaAberta(usuario, data);
    if (aberta) run('UPDATE ponto_pausas SET fim = ? WHERE id = ?', [agora(), aberta.id]);

    run('UPDATE ponto SET inicio_almoco = ?, fim_almoco = NULL WHERE id = ?', [agora(), reg.id]);
    res.json({ status: statusDe(reg, null), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/finalizar-almoco', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    if (!reg || !reg.inicio_almoco) return res.status(400).json({ error: 'Almoço não iniciado' });
    if (reg.fim_almoco) return res.status(400).json({ error: 'Almoço já finalizado' });

    run('UPDATE ponto SET fim_almoco = ? WHERE id = ?', [agora(), reg.id]);
    res.json({ status: statusDe(reg, pausaAberta(usuario, data)), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/finalizar', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const data = hoje();
    let reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    if (!reg || !reg.inicio) return res.status(400).json({ error: 'Expediente não iniciado' });
    if (reg.fim) return res.status(400).json({ error: 'Expediente já finalizado' });

    const aberta = pausaAberta(usuario, data);
    if (aberta) run('UPDATE ponto_pausas SET fim = ? WHERE id = ?', [agora(), aberta.id]);

    run('UPDATE ponto SET fim = ? WHERE id = ?', [agora(), reg.id]);
    reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
    res.json({ status: statusDe(reg, null), registro: buildRegistro(reg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mes', (req, res) => {
  try {
    const usuario = getUsuario(req);
    const primeiro = (v) => (Array.isArray(v) ? v[0] : v);
    const mes = primeiro(req.query.data) || '';
    if (!usuario || !mes) return res.status(400).json({ error: 'Usuário e mês são obrigatórios' });

    const regs = query(
      'SELECT * FROM ponto WHERE usuario = ? AND substr(data, 1, 7) = ? ORDER BY data ASC',
      [usuario, mes]
    ).map(buildRegistro);

    res.json({ registros: regs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const usuario = getUsuario(req);
    if (!usuario) return res.status(400).json({ error: 'Usuário não informado' });
    const reg = queryOne('SELECT * FROM ponto WHERE id = ?', [req.params.id]);
    if (!reg) return res.status(404).json({ error: 'Registro não encontrado' });
    if (reg.usuario !== usuario) {
      return res.status(403).json({ error: 'Você só pode editar seus próprios registros' });
    }

    const { inicio, inicio_almoco, fim_almoco, fim, pausas } = req.body || {};
    const limpar = (v) =>
      v === undefined || v === null || v === '' ? null : String(v);
    const normalizar = (v) => {
      if (v === null) return null;
      if (/^\d{2}:\d{2}$/.test(v)) return `${reg.data} ${v}:00`;
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return `${v}:00`;
      return v;
    };

    const campos = { inicio, inicio_almoco, fim_almoco, fim };
    const sets = [];
    const vals = [];
    for (const c of ['inicio', 'inicio_almoco', 'fim_almoco', 'fim']) {
      if (campos[c] !== undefined) {
        sets.push(`${c} = ?`);
        vals.push(normalizar(limpar(campos[c])));
      }
    }
    if (sets.length > 0) {
      run(`UPDATE ponto SET ${sets.join(', ')} WHERE id = ?`, [...vals, reg.id]);
    }

    if (Array.isArray(pausas) && pausas.length > 0) {
      const ids = pausas.map((p) => p && p.id).filter(Boolean);
      const existentes = query(
        `SELECT * FROM ponto_pausas WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const permitidas = existentes.filter(
        (p) => p.usuario === usuario && p.data === reg.data
      );
      for (const p of pausas) {
        const alvo = permitidas.find((x) => String(x.id) === String(p.id));
        if (!alvo) continue;
        run('UPDATE ponto_pausas SET inicio = ?, fim = ? WHERE id = ?', [
          normalizar(limpar(p.inicio)),
          normalizar(limpar(p.fim)),
          alvo.id,
        ]);
      }
    }

    const atualizado = queryOne('SELECT * FROM ponto WHERE id = ?', [reg.id]);
    res.json({ registro: buildRegistro(atualizado) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/relatorio', (req, res) => {
  try {
    const { inicio, fim, usuario } = req.query;
    const params = [];
    let where = '1=1';
    if (inicio) { where += ' AND data >= ?'; params.push(inicio); }
    if (fim) { where += ' AND data <= ?'; params.push(fim); }
    if (usuario) { where += ' AND usuario = ?'; params.push(usuario); }

    const regs = query(`SELECT * FROM ponto WHERE ${where} ORDER BY usuario ASC, data ASC`, params);

    const map = {};
    for (const reg of regs) {
      const full = buildRegistro(reg);
      if (!map[reg.usuario]) {
        map[reg.usuario] = { usuario: reg.usuario, dias: 0, total_minutos: 0, dias_incompletos: 0 };
      }
      map[reg.usuario].dias += 1;
      if (full.total_minutos != null) {
        map[reg.usuario].total_minutos += full.total_minutos;
      } else {
        map[reg.usuario].dias_incompletos += 1;
      }
    }

    const logado = getUsuarioLogado(req);
    const tipoUsuario = (logado && logado.tipo) || 'TI';
    const ativos = query("SELECT nome FROM tecnicos WHERE ativo = 1 AND tipo = ? ORDER BY nome ASC", [tipoUsuario]);
    for (const t of ativos) {
      if (!map[t.nome]) {
        map[t.nome] = { usuario: t.nome, dias: 0, total_minutos: 0, dias_incompletos: 0 };
      }
    }

    const tecnicos = Object.values(map)
      .map((t) => ({
        ...t,
        total_horas: Math.round((t.total_minutos / 60) * 10) / 10,
      }))
      .sort((a, b) => b.total_minutos - a.total_minutos);

    res.json({ tecnicos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
