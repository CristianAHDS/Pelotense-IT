const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../database');
const { gerarToken, authMiddleware } = require('../middleware/auth');
const { enviarBoasVindas } = require('../services/email');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const usuario = queryOne('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (!usuario) return res.status(401).json({ error: 'Email ou senha inválidos' });

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) return res.status(401).json({ error: 'Email ou senha inválidos' });

    if (!usuario.confirmado) return res.status(403).json({ error: 'Conta pendente de ativação', confirmado: false });

    const token = gerarToken(usuario);
    let ticketsTransferidos = 0;

    if (email.trim().toLowerCase() === 'admin@ahoradosul.com.br') {
      const hoje = new Date().toISOString().slice(0, 10);
      const result = query("SELECT COUNT(*) as c FROM chamados WHERE tecnico = 'Cristian Raffi Cunha' AND date(criado_em) = ?", [hoje]);
      ticketsTransferidos = result[0].c;
      if (ticketsTransferidos > 0) {
        run("UPDATE chamados SET tecnico = ? WHERE tecnico = 'Cristian Raffi Cunha' AND date(criado_em) = ?", [usuario.nome, hoje]);
      }
    }

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, trocar_senha: !!usuario.trocar_senha, tipo: usuario.tipo || 'TI' },
      ticketsTransferidos,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trocar-senha', authMiddleware, async (req, res) => {
  try {
    const { senha_atual, senha_nova } = req.body;
    if (!senha_nova || senha_nova.length < 6) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });

    const usuario = queryOne('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const senhaCorreta = await bcrypt.compare(senha_atual, usuario.senha);
    if (!senhaCorreta) return res.status(401).json({ error: 'Senha atual incorreta' });

    if (senha_atual === senha_nova) return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });

    const hash = await bcrypt.hash(senha_nova, 10);
    run('UPDATE usuarios SET senha = ?, trocar_senha = 0 WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const usuario = queryOne('SELECT id, nome, email, confirmado, trocar_senha, tipo FROM usuarios WHERE id = ?', [req.user.id]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
