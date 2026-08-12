const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query, queryOne, run, getLastID } = require('../database');
const { verificarBadges } = require('./gamificacao');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|mp4|webm|mov|avi|mkv|mp3|wav|ogg|m4a|pdf|doc|docx|xls|xlsx|txt|zip|rar)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  },
});

router.get('/', (req, res) => {
  try {
    const { status, prioridade, categoria, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (prioridade) { conditions.push('prioridade = ?'); params.push(prioridade); }
    if (categoria) { conditions.push('categoria = ?'); params.push(categoria); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const totalRow = queryOne(`SELECT COUNT(*) as count FROM chamados ${where}`, params);
    const chamados = query(
      `SELECT * FROM chamados ${where} ORDER BY criado_em DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ chamados, total: totalRow?.count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const conditions = [];
    const params = [];

    if (inicio) {
      conditions.push("criado_em >= ? || ' 00:00:00'");
      params.push(inicio);
    }
    if (fim) {
      conditions.push("criado_em <= ? || ' 23:59:59'");
      params.push(fim);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const porStatus = query(`SELECT status, COUNT(*) as count FROM chamados ${where} GROUP BY status`, params);
    const porPrioridade = query(`SELECT prioridade, COUNT(*) as count FROM chamados ${where} GROUP BY prioridade`, params);
    const porCategoria = query(`SELECT categoria, COUNT(*) as count FROM chamados ${where} GROUP BY categoria`, params);
    const totalPeriodo = queryOne(`SELECT COUNT(*) as count FROM chamados ${where}`, params);

    const tecWhere = conditions.length ? `WHERE ${conditions.join(' AND ')} AND tecnico IS NOT NULL` : 'WHERE tecnico IS NOT NULL';
    const tecnicos = query(
      `SELECT tecnico, COUNT(*) as total,
        SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolvidos
       FROM chamados ${tecWhere} GROUP BY tecnico ORDER BY total DESC`,
      params
    );

    let slaMedio = null;
    try {
      const slaWhere = conditions.length ? `WHERE ${conditions.join(' AND ')} AND resolvido_em IS NOT NULL` : 'WHERE resolvido_em IS NOT NULL';
      slaMedio = queryOne(
        `SELECT ROUND(AVG((julianday(resolvido_em) - julianday(criado_em)) * 24), 1) as horas FROM chamados ${slaWhere}`,
        params
      );
    } catch (_) {}

    const porDia = query(
      `SELECT date(criado_em) as dia, COUNT(*) as count FROM chamados ${where}
       GROUP BY dia ORDER BY dia ASC LIMIT 90`,
      params
    );

    const hoje = new Date().toISOString().slice(0, 10);
    const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const quatorzeDiasAtras = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

    let trend = 0;
    try {
      const anterior = queryOne(
        `SELECT COUNT(*) as count FROM chamados WHERE criado_em >= ? AND criado_em < ?`,
        [quatorzeDiasAtras, seteDiasAtras]
      );
      const atual = queryOne(
        `SELECT COUNT(*) as count FROM chamados WHERE criado_em >= ? AND criado_em <= ?`,
        [seteDiasAtras, hoje]
      );
      if (anterior?.count > 0) {
        trend = Math.round(((atual?.count || 0) - anterior.count) / anterior.count * 100);
      }
    } catch (_) {}

    let resolvedTrend = 0;
    try {
      const antRes = queryOne(
        `SELECT COUNT(*) as count FROM chamados WHERE resolvido_em >= ? AND resolvido_em < ?`,
        [quatorzeDiasAtras, seteDiasAtras]
      );
      const atRes = queryOne(
        `SELECT COUNT(*) as count FROM chamados WHERE resolvido_em >= ? AND resolvido_em <= ?`,
        [seteDiasAtras, hoje]
      );
      if (antRes?.count > 0) {
        resolvedTrend = Math.round(((atRes?.count || 0) - antRes.count) / antRes.count * 100);
      }
    } catch (_) {}

    res.json({
      porStatus, porPrioridade, porCategoria,
      totalPeriodo: totalPeriodo?.count || 0,
      tecnicos: tecnicos || [],
      slaMedio: slaMedio?.horas || 0,
      porDia: porDia || [],
      trend,
      resolvedTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/feed', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const feed = query(
      `SELECT h.*, c.titulo as chamado_titulo, c.status as chamado_status, c.prioridade as chamado_prioridade
       FROM historico h
       JOIN chamados c ON h.chamado_id = c.id
       ORDER BY h.criado_em DESC LIMIT ?`,
      [limit]
    );
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/emergencia', (req, res) => {
  try {
    const criticos = query(
      `SELECT * FROM chamados WHERE status = 'aberto' AND prioridade = 'critica'
       ORDER BY criado_em ASC LIMIT 10`
    );
    const parados = query(
      `SELECT * FROM chamados WHERE status = 'pendente'
       AND julianday('now') - julianday(atualizado_em) > 1
       ORDER BY atualizado_em ASC LIMIT 10`
    );
    const antigos = query(
      `SELECT * FROM chamados WHERE status IN ('aberto', 'em_andamento')
       AND julianday('now') - julianday(criado_em) > 2
       ORDER BY criado_em ASC LIMIT 10`
    );
    res.json({ criticos, parados, antigos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [parseInt(req.params.id)]);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

    const comentarios = query(
      'SELECT * FROM comentarios WHERE chamado_id = ? ORDER BY criado_em ASC',
      [parseInt(req.params.id)]
    );

    const anexos = query(
      'SELECT * FROM anexos WHERE chamado_id = ? ORDER BY criado_em ASC',
      [parseInt(req.params.id)]
    );

    const tags = query(
      `SELECT t.* FROM tags t INNER JOIN chamado_tags ct ON t.id = ct.tag_id WHERE ct.chamado_id = ?`,
      [parseInt(req.params.id)]
    );

    let historico = [];
    try {
      historico = query('SELECT * FROM historico WHERE chamado_id = ? ORDER BY criado_em DESC', [parseInt(req.params.id)]);
    } catch (_) {}

    let checklist = [];
    try {
      checklist = query('SELECT * FROM checklist WHERE chamado_id = ? ORDER BY criado_em ASC', [parseInt(req.params.id)]);
    } catch (_) {}

    res.json({ ...chamado, comentarios, anexos, tags, historico, checklist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { titulo, descricao, prioridade, categoria, solicitante, tags } = req.body;
    if (!titulo || !descricao || !solicitante) {
      return res.status(400).json({ error: 'Título, descrição e solicitante são obrigatórios' });
    }

    run(
      'INSERT INTO chamados (titulo, descricao, prioridade, categoria, solicitante) VALUES (?, ?, ?, ?, ?)',
      [titulo, descricao, prioridade || 'media', categoria || 'geral', solicitante]
    );

    const novoId = getLastID('chamados');

    if (Array.isArray(tags) && tags.length > 0) {
      tags.forEach((tagNome) => {
        const nome = tagNome.trim().toLowerCase();
        if (!nome) return;
        try {
          let tag = queryOne('SELECT id FROM tags WHERE nome = ?', [nome]);
          if (!tag) {
            run('INSERT INTO tags (nome) VALUES (?)', [nome]);
            tag = { id: getLastID('tags') };
        }
        run('INSERT OR IGNORE INTO chamado_tags (chamado_id, tag_id) VALUES (?, ?)', [novoId, tag.id]);
        } catch (_) {}
      });
    }

    try { run('INSERT INTO historico (chamado_id, acao, descricao, usuario) VALUES (?, ?, ?, ?)', [novoId, 'criacao', `Chamado #${novoId} criado por ${solicitante}`, solicitante]); } catch (_) {}

    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [novoId]);
    try { req.io?.emit('chamado:created', chamado); } catch (_) {}
    res.status(201).json(chamado);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

    const { titulo, descricao, status, prioridade, categoria, tecnico, resolucao } = req.body;
    const novoStatus = status || chamado.status;
    const usuario = tecnico || 'Sistema';

    let tempoExtra = '';
    if (novoStatus === 'em_andamento' && chamado.status !== 'em_andamento') {
      tempoExtra = ', inicio_em_andamento = datetime(\'now\',\'localtime\')';
    } else if (novoStatus !== 'em_andamento' && chamado.status === 'em_andamento' && chamado.inicio_em_andamento) {
      tempoExtra = `, tempo_em_andamento = COALESCE(tempo_em_andamento, 0) + CAST((julianday('now','localtime') - julianday(inicio_em_andamento)) * 86400 AS INTEGER), inicio_em_andamento = NULL`;
    }

    const params = [
      titulo ?? null, descricao ?? null, novoStatus,
      prioridade ?? null, categoria ?? null, tecnico ?? null, id
    ];

    if (novoStatus === 'resolvido' && chamado.status !== 'resolvido') {
      run(
        `UPDATE chamados SET titulo = COALESCE(?, titulo), descricao = COALESCE(?, descricao),
         status = ?, prioridade = COALESCE(?, prioridade), categoria = COALESCE(?, categoria),
         tecnico = COALESCE(?, tecnico), atualizado_em = datetime('now','localtime'),
         resolvido_em = datetime('now','localtime'), resolucao = COALESCE(?, resolucao) ${tempoExtra} WHERE id = ?`,
        [...params.slice(0, 6), resolucao ?? null, id]
      );
      if (resolucao) {
        try {
          run('INSERT INTO historico (chamado_id, acao, descricao, usuario) VALUES (?, ?, ?, ?)', [
            id, 'resolucao', `Descrição de resolução adicionada`, usuario
          ]);
        } catch (_) {}
      }
    } else {
      run(
        `UPDATE chamados SET titulo = COALESCE(?, titulo), descricao = COALESCE(?, descricao),
         status = ?, prioridade = COALESCE(?, prioridade), categoria = COALESCE(?, categoria),
         tecnico = COALESCE(?, tecnico), atualizado_em = datetime('now','localtime') ${tempoExtra} WHERE id = ?`,
        params
      );
    }

    if (novoStatus !== chamado.status) {
      try {
        const labels = { aberto: 'Aberto', em_andamento: 'Em Andamento', pendente: 'Pendente', resolvido: 'Resolvido', fechado: 'Fechado' };
        run('INSERT INTO historico (chamado_id, acao, descricao, usuario) VALUES (?, ?, ?, ?)', [
          id, 'status', `Status alterado para "${labels[novoStatus] || novoStatus}"`, usuario
        ]);
      } catch (_) {}
    }

    if (novoStatus === 'resolvido' && usuario && usuario !== 'Sistema') {
      try {
        const resultado = verificarBadges(usuario);
        if (resultado.newBadges.length > 0) {
          req.io?.emit('badges:conquistados', {
            usuario,
            badges: resultado.newBadges.map(b => ({ ...b, conquistado: true })),
          });
        }
      } catch (_) {}
    }
    if (titulo && titulo !== chamado.titulo) {
      try {
        run('INSERT INTO historico (chamado_id, acao, descricao, usuario) VALUES (?, ?, ?, ?)', [
          id, 'edicao', `Título alterado`, usuario
        ]);
      } catch (_) {}
    }

    const atualizado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    try { req.io?.emit('chamado:updated', atualizado); } catch (_) {}
    res.json(atualizado);
  } catch (err) {
    console.error('PUT error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
    run('DELETE FROM chamados WHERE id = ?', [id]);
    res.json({ message: 'Chamado removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comentarios', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { autor, texto } = req.body;
    if (!autor || !texto) return res.status(400).json({ error: 'Autor e texto são obrigatórios' });

    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

    run('INSERT INTO comentarios (chamado_id, autor, texto) VALUES (?, ?, ?)', [id, autor, texto]);
    const comentario = queryOne('SELECT * FROM comentarios WHERE id = ?', [getLastID('comentarios')]);
    res.status(201).json(comentario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/anexos', upload.array('arquivos', 5), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const anexos = req.files.map((file) => {
      const tipo = file.mimetype.startsWith('image/') ? 'imagem'
        : file.mimetype.startsWith('video/') ? 'video'
        : file.mimetype.startsWith('audio/') ? 'audio'
        : 'documento';

      run(
        'INSERT INTO anexos (chamado_id, nome_original, nome_armazenado, tipo, tamanho) VALUES (?, ?, ?, ?, ?)',
        [id, file.originalname, file.filename, tipo, file.size]
      );

      return queryOne('SELECT * FROM anexos WHERE id = ?', [getLastID('anexos')]);
    });

    res.status(201).json(anexos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/anexos/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  res.sendFile(filePath);
});

router.delete('/anexos/:id', (req, res) => {
  try {
    const anexo = queryOne('SELECT * FROM anexos WHERE id = ?', [parseInt(req.params.id)]);
    if (!anexo) return res.status(404).json({ error: 'Anexo não encontrado' });

    const filePath = path.join(UPLOADS_DIR, anexo.nome_armazenado);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    run('DELETE FROM anexos WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Anexo removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tags/list', (req, res) => {
  try {
    const tags = query('SELECT * FROM tags ORDER BY nome');
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/checklist', (req, res) => {
  try {
    const items = query('SELECT * FROM checklist WHERE chamado_id = ? ORDER BY criado_em ASC', [parseInt(req.params.id)]);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/checklist', (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: 'Texto é obrigatório' });
    run('INSERT INTO checklist (chamado_id, texto) VALUES (?, ?)', [parseInt(req.params.id), texto]);
    const item = queryOne('SELECT * FROM checklist WHERE id = ?', [getLastID('checklist')]);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/checklist/:itemId', (req, res) => {
  try {
    const { concluido } = req.body;
    run('UPDATE checklist SET concluido = ? WHERE id = ? AND chamado_id = ?',
      [concluido ? 1 : 0, parseInt(req.params.itemId), parseInt(req.params.id)]);
    const item = queryOne('SELECT * FROM checklist WHERE id = ?', [parseInt(req.params.itemId)]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/checklist/:itemId', (req, res) => {
  try {
    run('DELETE FROM checklist WHERE id = ? AND chamado_id = ?',
      [parseInt(req.params.itemId), parseInt(req.params.id)]);
    res.json({ message: 'Item removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
