const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const { gerarRelatorioDiario, enviarTeste, resetTransporter } = require('../services/email');

router.get('/config', (req, res) => {
  try {
    const config = queryOne('SELECT * FROM config_email WHERE id = 1');
    if (!config) return res.json({ smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_user: '', smtp_pass: '', remetente: 'Pelotense IT <ti@pelotense.com.br>', destinatarios: '', relatorio_hora: '18:00', ativo: 0 });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, remetente, destinatarios, relatorio_hora, ativo } = req.body;
    const current = queryOne('SELECT * FROM config_email WHERE id = 1') || {};
    run(
      `UPDATE config_email SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, remetente = ?, destinatarios = ?, relatorio_hora = ?, ativo = ? WHERE id = 1`,
      [
        smtp_host ?? current.smtp_host ?? 'smtp.gmail.com',
        smtp_port ?? current.smtp_port ?? 587,
        smtp_user ?? current.smtp_user ?? '',
        smtp_pass ?? current.smtp_pass ?? '',
        remetente ?? current.remetente ?? 'Pelotense IT <ti@pelotense.com.br>',
        destinatarios ?? current.destinatarios ?? '',
        relatorio_hora ?? current.relatorio_hora ?? '18:00',
        ativo !== undefined ? (ativo ? 1 : 0) : (current.ativo ?? 0),
      ]
    );
    resetTransporter();
    res.json(queryOne('SELECT * FROM config_email WHERE id = 1'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/teste', async (req, res) => {
  try {
    const config = queryOne('SELECT * FROM config_email WHERE id = 1');
    if (!config || !config.smtp_user || !config.smtp_pass) {
      return res.status(400).json({ error: 'Configuração SMTP incompleta' });
    }
    await enviarTeste(config);
    res.json({ message: 'E-mail de teste enviado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/relatorio', async (req, res) => {
  try {
    const resultado = await gerarRelatorioDiario();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
