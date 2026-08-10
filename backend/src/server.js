const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const { Server } = require('socket.io');
const { initDatabase, queryOne } = require('./database');
const chamadosRouter = require('./routes/chamados');
const { router: gamificacaoRouter } = require('./routes/gamificacao');
const emailRouter = require('./routes/email');
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDatabase().then(() => {
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
