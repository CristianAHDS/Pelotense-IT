const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initDatabase } = require('./database');
const chamadosRouter = require('./routes/chamados');
const { router: gamificacaoRouter } = require('./routes/gamificacao');

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
