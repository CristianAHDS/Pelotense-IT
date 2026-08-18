const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pelotense-it-secret-key-2024';

function gerarToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo || 'TI' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token não informado' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function optionalAuth(req, res, next) {
  req.user = null;
  const header = req.headers.authorization;
  if (header) {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {}
  }
  next();
}

function getUsuarioLogado(req) {
  if (req.user) {
    return {
      ...req.user,
      tipo: req.user.tipo || req.query.tipo || (req.body && req.body.tipo) || '',
    };
  }
  return {
    nome: req.query.usuario || (req.body && req.body.usuario) || '',
    tipo: req.query.tipo || (req.body && req.body.tipo) || '',
  };
}

function condicaoChamados(req) {
  const u = getUsuarioLogado(req);
  const nome = u.nome || '';
  const tipo = u.tipo || '';
  if (!nome) return { sql: '', params: [] };
  if (tipo === 'TI') {
    return { sql: '(tecnico = ? OR tecnico IS NULL)', params: [nome] };
  }
  return { sql: '(tecnico = ?)', params: [nome] };
}

module.exports = { gerarToken, authMiddleware, optionalAuth, getUsuarioLogado, condicaoChamados, JWT_SECRET };
