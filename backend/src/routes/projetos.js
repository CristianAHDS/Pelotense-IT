const express = require('express');
const router = express.Router();
const { query, queryOne, run, getLastID } = require('../database');
const { getUsuarioLogado } = require('../middleware/auth');

function filtraTarefas(req, tarefas) {
  const nome = getUsuarioLogado(req).nome || '';
  if (!nome) return tarefas;
  return tarefas.filter((t) => t.responsavel === nome);
}

router.get('/', (req, res) => {
  try {
    const projetos = query('SELECT * FROM projetos ORDER BY criado_em ASC');
    const result = [];
    for (const p of projetos) {
      const tarefas = filtraTarefas(req, query('SELECT * FROM projeto_tarefas WHERE projeto_id = ? ORDER BY inicio ASC', [p.id]));
      if (tarefas.length > 0) result.push({ ...p, tarefas });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const projeto = queryOne('SELECT * FROM projetos WHERE id = ?', [parseInt(req.params.id)]);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    projeto.tarefas = filtraTarefas(req, query('SELECT * FROM projeto_tarefas WHERE projeto_id = ? ORDER BY inicio ASC', [projeto.id]));
    res.json(projeto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { nome, descricao, cor } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    run('INSERT INTO projetos (nome, descricao, cor) VALUES (?, ?, ?)', [nome, descricao || '', cor || '#6366f1']);
    const projeto = queryOne('SELECT * FROM projetos WHERE id = ?', [getLastID('projetos')]);
    projeto.tarefas = [];
    res.status(201).json(projeto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const projeto = queryOne('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    const { nome, descricao, cor } = req.body;
    run('UPDATE projetos SET nome = COALESCE(?, nome), descricao = COALESCE(?, descricao), cor = COALESCE(?, cor) WHERE id = ?',
      [nome ?? null, descricao ?? null, cor ?? null, id]);
    res.json(queryOne('SELECT * FROM projetos WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const projeto = queryOne('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    run('DELETE FROM projetos WHERE id = ?', [id]);
    res.json({ message: 'Projeto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/tarefas', (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const projeto = queryOne('SELECT * FROM projetos WHERE id = ?', [projetoId]);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    const { nome, inicio, fim, progresso, responsavel, cor } = req.body;
    if (!nome || !inicio || !fim) return res.status(400).json({ error: 'Nome, início e fim são obrigatórios' });
    run('INSERT INTO projeto_tarefas (projeto_id, nome, inicio, fim, progresso, responsavel, cor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [projetoId, nome, inicio, fim, progresso || 0, responsavel || '', cor || '#38bdf8']);
    const tarefa = queryOne('SELECT * FROM projeto_tarefas WHERE id = ?', [getLastID('projeto_tarefas')]);
    res.status(201).json(tarefa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tarefas/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tarefa = queryOne('SELECT * FROM projeto_tarefas WHERE id = ?', [id]);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });
    const { nome, inicio, fim, progresso, responsavel, cor } = req.body;
    run(`UPDATE projeto_tarefas SET nome = COALESCE(?, nome), inicio = COALESCE(?, inicio), fim = COALESCE(?, fim),
         progresso = COALESCE(?, progresso), responsavel = COALESCE(?, responsavel), cor = COALESCE(?, cor) WHERE id = ?`,
      [nome ?? null, inicio ?? null, fim ?? null, progresso ?? null, responsavel ?? null, cor ?? null, id]);
    res.json(queryOne('SELECT * FROM projeto_tarefas WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tarefas/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tarefa = queryOne('SELECT * FROM projeto_tarefas WHERE id = ?', [id]);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });
    run('DELETE FROM projeto_tarefas WHERE id = ?', [id]);
    res.json({ message: 'Tarefa removida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
