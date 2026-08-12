const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { initDatabase, queryOne } = require('./database');
const chamadosRouter = require('./routes/chamados');
const { router: gamificacaoRouter } = require('./routes/gamificacao');
const emailRouter = require('./routes/email');
const tecnicosRouter = require('./routes/tecnicos');
const authRouter = require('./routes/auth');
const { gerarRelatorioDiario } = require('./services/email');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/chamados', chamadosRouter);
app.use('/api/gamificacao', gamificacaoRouter);
app.use('/api/email', emailRouter);
app.use('/api/tecnicos', tecnicosRouter);
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

initDatabase().then(() => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  function fazerBackup() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const dbPath = path.join(__dirname, '..', 'chamados.db');
    const backupPath = path.join(BACKUPS_DIR, `chamados-${stamp}.db`);

    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`[BACKUP] Criado: chamados-${stamp}.db`);
      }
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.db')).sort();
      while (files.length > 48) {
        const old = files.shift();
        fs.unlinkSync(path.join(BACKUPS_DIR, old));
        console.log(`[BACKUP] Removido antigo: ${old}`);
      }
    } catch (err) {
      console.error('[BACKUP] Erro:', err.message);
    }
  }

  cron.schedule('0 * * * *', fazerBackup);
  console.log('[CRON] Backup automático agendado a cada 1 hora');

  app.get('/api/backup', (req, res) => {
    fazerBackup();
    res.json({ message: 'Backup executado manualmente' });
  });

  app.get('/api/backup/list', (req, res) => {
    try {
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.db')).sort().reverse();
      const backups = files.map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return { nome: f, tamanho: stats.size, criado: stats.mtime };
      });
      res.json(backups);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  const config = queryOne('SELECT ativo, relatorio_hora FROM config_email WHERE id = 1');
  if (config && config.ativo && config.relatorio_hora) {
    const [h, m] = config.relatorio_hora.split(':');
    cron.schedule(`${m} ${h} * * *`, async () => {
      console.log(`[CRON] Executando relatório diário programado para ${config.relatorio_hora}`);
      try {
        const result = await gerarRelatorioDiario();
        console.log('[CRON] Resultado:', result);
      } catch (err) {
        console.error('[CRON] Erro:', err.message);
      }
    });
    console.log(`[CRON] Relatório diário agendado para ${config.relatorio_hora}`);
  }

  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
