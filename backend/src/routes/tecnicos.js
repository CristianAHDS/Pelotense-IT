const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, run, getLastID } = require('../database');
const { enviarSenhaTecnico } = require('../services/email');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const tecnicos = query('SELECT * FROM tecnicos ORDER BY nome ASC');
    res.json(tecnicos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const tecnico = queryOne('SELECT * FROM tecnicos WHERE id = ?', [req.params.id]);
    if (!tecnico) return res.status(404).json({ error: 'Técnico não encontrado' });
    res.json(tecnico);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, email, departamento, ativo } = req.body;
    const tipo = departamento || 'TI';
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

    run('INSERT INTO tecnicos (nome, email, departamento, tipo, ativo) VALUES (?, ?, ?, ?, ?)',
      [nome, email, tipo, tipo, ativo !== undefined ? (ativo ? 1 : 0) : 1]);

    const id = getLastID('tecnicos');
    const tecnico = queryOne('SELECT * FROM tecnicos WHERE id = ?', [id]);

    const usuarioExiste = queryOne('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (!usuarioExiste) {
      const senha = '99y!DlS&7j';
      const hash = await bcrypt.hash(senha, 10);
      run('INSERT INTO usuarios (nome, email, senha, confirmado, trocar_senha, tipo) VALUES (?, ?, ?, 1, 1, ?)',
        [nome.trim(), email.trim().toLowerCase(), hash, tipo]);
      try { await enviarSenhaTecnico(tecnico, senha); } catch (_) {}
      res.status(201).json({ ...tecnico, senha_gerada: senha, usuario_criado: true });
    } else {
      res.status(201).json(tecnico);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { nome, email, departamento, ativo } = req.body;
    const tipo = departamento || null;
    const existing = queryOne('SELECT * FROM tecnicos WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Técnico não encontrado' });

    run(
      'UPDATE tecnicos SET nome = COALESCE(?, nome), email = COALESCE(?, email), departamento = COALESCE(?, departamento), tipo = COALESCE(?, tipo), ativo = COALESCE(?, ativo) WHERE id = ?',
      [nome ?? null, email ?? null, tipo, tipo, ativo !== undefined ? (ativo ? 1 : 0) : null, req.params.id]
    );

    const tecnico = queryOne('SELECT * FROM tecnicos WHERE id = ?', [req.params.id]);
    res.json(tecnico);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resetar-senha', async (req, res) => {
  try {
    const tecnico = queryOne('SELECT * FROM tecnicos WHERE id = ?', [req.params.id]);
    if (!tecnico) return res.status(404).json({ error: 'Técnico não encontrado' });

    const senha = '99y!DlS&7j';
    const hash = await bcrypt.hash(senha, 10);
    run('UPDATE usuarios SET senha = ?, trocar_senha = 1 WHERE email = ?', [hash, tecnico.email.trim().toLowerCase()]);

    try { await enviarSenhaTecnico(tecnico, senha); } catch (_) {}
    res.json({ message: 'Senha resetada com sucesso!', senha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM tecnicos WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Técnico não encontrado' });

    run('DELETE FROM tecnicos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Técnico removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
