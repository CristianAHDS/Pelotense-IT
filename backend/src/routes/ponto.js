const express = require('express');
const { query, queryOne, run } = require('../database');

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
  return (req.body && req.body.usuario) || req.query.usuario || '';
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
    const reg = queryOne('SELECT * FROM ponto WHERE usuario = ? AND data = ?', [usuario, data]);
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
    const usuario = req.query.usuario || '';
    const mes = req.query.data || '';
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

module.exports = router;
