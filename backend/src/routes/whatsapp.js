const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { query, queryOne, run, getLastID } = require('../database');

const LOG_FILE = path.join(__dirname, '..', '..', 'whatsapp.log');
function log(...args) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  console.log('[WHATSAPP]', ...args);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

const MENU = `🤖 *Pelotense IT — Assistente Virtual*

Olá! Como posso ajudar?

1️⃣ Consultar status de chamado
2️⃣ Abrir novo chamado
3️⃣ Falar com atendente

Digite o número da opção desejada.`;

const STATUS_LABELS = {
  aberto: '🟢 Aberto',
  em_andamento: '🔵 Em andamento',
  pendente: '🟡 Pendente',
  resolvido: '✅ Resolvido',
  fechado: '⚫ Fechado',
};

function normalizarNumero(jid) {
  const s = String(jid || '');
  return s.split('@')[0].replace(/\D/g, '');
}

function getConfig() {
  const config = queryOne('SELECT * FROM config_whatsapp WHERE id = 1');
  if (!config) return { ativo: 0, api_url: '', api_key: '', instance: '', numeros_permitidos: [] };
  let numeros = [];
  try { numeros = JSON.parse(config.numeros_permitidos || '[]'); } catch (_) { numeros = []; }
  return {
    ativo: !!config.ativo,
    api_url: config.api_url || '',
    api_key: config.api_key || '',
    instance: config.instance || '',
    numeros_permitidos: numeros,
  };
}

function setSessao(numero, estado, dados = {}) {
  const exists = queryOne('SELECT numero FROM whatsapp_sessoes WHERE numero = ?', [numero]);
  if (exists) {
    run(
      "UPDATE whatsapp_sessoes SET estado = ?, dados = ?, atualizado_em = datetime('now','localtime') WHERE numero = ?",
      [estado, JSON.stringify(dados), numero]
    );
  } else {
    run('INSERT INTO whatsapp_sessoes (numero, estado, dados) VALUES (?, ?, ?)', [numero, estado, JSON.stringify(dados)]);
  }
}

function formatarChamado(c) {
  return `📋 *Chamado #${c.id}*\n\n*Título:* ${c.titulo}\n*Status:* ${STATUS_LABELS[c.status] || c.status}\n*Prioridade:* ${c.prioridade}\n*Categoria:* ${c.categoria}\n*Solicitante:* ${c.solicitante}\n*Criado em:* ${c.criado_em}\n\nDigite "menu" para voltar.`;
}

function processarMensagem(numero, texto) {
  const msg = texto.trim().toLowerCase();
  const sessao = getSessao(numero) || { estado: 'menu', dados: '{}' };
  let dados = {};
  try { dados = JSON.parse(sessao.dados || '{}'); } catch (_) {}

  if (msg === 'menu' || msg === 'cancelar') {
    setSessao(numero, 'menu', {});
    return MENU;
  }

  if (sessao.estado === 'consultar') {
    const id = parseInt(msg, 10);
    if (isNaN(id)) {
      return '⚠️ Informe um número de chamado válido (ex: 123). Digite "menu" para voltar.';
    }
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    setSessao(numero, 'menu', {});
    if (!chamado) return `❌ Não encontrei o chamado #${id}. Digite "menu" para ver as opções.`;
    return formatarChamado(chamado);
  }

  if (sessao.estado === 'abrir_titulo') {
    const titulo = texto.trim();
    if (!titulo) return 'Por favor, informe um título válido para o chamado.';
    setSessao(numero, 'abrir_desc', { titulo });
    return '📝 Agora descreva o problema do chamado:';
  }

  if (sessao.estado === 'abrir_desc') {
    const titulo = dados.titulo || 'Chamado via WhatsApp';
    const desc = texto.trim();
    run(
      `INSERT INTO chamados (titulo, descricao, status, prioridade, categoria, solicitante, criado_em, atualizado_em)
       VALUES (?, ?, 'aberto', 'media', 'geral', ?, datetime('now','localtime'), datetime('now','localtime'))`,
      [titulo, desc, `WhatsApp ${numero}`]
    );
    const id = getLastID('chamados');
    setSessao(numero, 'menu', {});
    return `✅ Chamado #${id} aberto com sucesso!\n\n📋 *${titulo}*\n📝 ${desc}\n\nA equipe de TI irá atendê-lo em breve. Digite "menu" para mais opções.`;
  }

  // estado menu
  if (msg === '1' || msg === 'consultar' || msg === 'status') {
    setSessao(numero, 'consultar', {});
    return 'Digite o número do chamado que deseja consultar (ex: 123).';
  }
  if (msg === '2' || msg === 'abrir' || msg === 'novo') {
    setSessao(numero, 'abrir_titulo', {});
    return 'Vamos abrir um chamado! Qual o título/assunto do problema?';
  }
  if (msg === '3' || msg === 'atendente' || msg === 'humano') {
    setSessao(numero, 'menu', {});
    return '👤 Um atendente humano irá falar com você em breve. Enquanto isso, use o menu digitando "menu".';
  }

  return MENU;
}

function getSessao(numero) {
  return queryOne('SELECT * FROM whatsapp_sessoes WHERE numero = ?', [numero]);
}

async function fetchInstances(config) {
  const base = String(config.api_url || '').replace(/\/+$/, '');
  const r = await fetch(`${base}/instance/fetchInstances`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', apikey: config.api_key },
  });
  if (!r.ok) throw new Error(`Evolution API respondeu ${r.status}`);
  const data = await r.json();
  const list = Array.isArray(data) ? data : [data];
  return list.map((i) => i?.instance).filter(Boolean);
}

async function resolveInstanceName(config) {
  const instances = await fetchInstances(config);
  if (instances.length === 0) return config.instance || null;
  if (config.instance && instances.some((i) => i.instanceName === config.instance)) {
    return config.instance;
  }
  const open = instances.find((i) => i.status === 'open');
  if (open) return open.instanceName;
  return instances[0].instanceName;
}

async function enviarMensagem(config, numero, texto) {
  if (!config.api_url || !config.api_key) {
    throw new Error('Configuração da Evolution API incompleta');
  }
  const instanceName = await resolveInstanceName(config);
  if (!instanceName) throw new Error('Nenhuma instância encontrada na Evolution API');
  const base = String(config.api_url).replace(/\/+$/, '');
  const url = `${base}/message/sendText/${instanceName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.api_key },
    body: JSON.stringify({ number: numero, textMessage: { text: texto } }),
  });
  if (!res.ok) {
    throw new Error(`Evolution API respondeu ${res.status}`);
  }
}

// Configuração
router.get('/config', (req, res) => {
  try {
    res.json(getConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', (req, res) => {
  try {
    const { ativo, api_url, api_key, instance, numeros_permitidos } = req.body || {};
    const current = getConfig();
    const numeros = Array.isArray(numeros_permitidos)
      ? numeros_permitidos.map((n) => String(n).replace(/\D/g, '')).filter(Boolean)
      : current.numeros_permitidos;

    run(
      `UPDATE config_whatsapp SET ativo = ?, api_url = ?, api_key = ?, instance = ?, numeros_permitidos = ? WHERE id = 1`,
      [
        ativo !== undefined ? (ativo ? 1 : 0) : (current.ativo ? 1 : 0),
        api_url ?? current.api_url,
        api_key ?? current.api_key,
        instance ?? current.instance,
        JSON.stringify(numeros),
      ]
    );
    res.json(getConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Envio de teste
router.post('/teste', async (req, res) => {
  try {
    const { numero, mensagem } = req.body || {};
    if (!numero) return res.status(400).json({ error: 'Informe o número de destino' });
    const config = getConfig();
    if (!config.ativo) return res.status(400).json({ error: 'Bot desativado' });
    await enviarMensagem(config, normalizarNumero(numero), mensagem || '✅ Teste do bot Pelotense IT!');
    res.json({ message: 'Mensagem de teste enviada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status da conexão
router.get('/status', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.api_url || !config.api_key) {
      return res.json({ conectado: false, numero: null, nome: null, instancia: null, estado: null });
    }
    const instances = await fetchInstances(config);
    const inst =
      instances.find((i) => i.instanceName === config.instance) ||
      instances.find((i) => i.status === 'open') ||
      instances[0] ||
      {};
    const owner = inst.owner || inst.ownerJid || inst.integration?.number || '';
    const numero = String(owner).split('@')[0].replace(/\D/g, '');
    const nome = inst.profileName && inst.profileName !== 'not loaded' ? inst.profileName : null;
    res.json({
      conectado: inst.status === 'open',
      numero: numero || null,
      nome,
      instancia: inst.instanceName || null,
      estado: inst.status || null,
    });
  } catch (err) {
    res.json({ conectado: false, numero: null, nome: null, instancia: null, estado: null, erro: err.message });
  }
});

// Webhook da Evolution API
router.post('/webhook', (req, res) => {
  res.status(200).json({ ok: true });
  try {
    const body = req.body || {};
    log('Webhook recebido:', JSON.stringify(body).slice(0, 600));

    const data = body.data || body;
    const key = data.key || {};
    if (key.fromMe) {
      log('Mensagem própria (fromMe=true) — ignorada');
      return;
    }

    const jid = key.senderPn || key.remoteJid;
    const message = data.message || {};
    const texto = message.conversation || (message.extendedTextMessage && message.extendedTextMessage.text) || '';
    if (!jid || !texto) {
      log('Sem jid ou texto — ignorada. jid=', jid, 'texto=', texto);
      return;
    }

    const numero = normalizarNumero(jid);
    const config = getConfig();
    log('Mensagem de', numero, ':', texto, '| ativo=', config.ativo, '| permitidos=', config.numeros_permitidos);

    if (!config.ativo) {
      log('Bot desativado — ignorada');
      return;
    }
    if (!config.numeros_permitidos.includes(numero)) {
      log('Número', numero, 'NÃO autorizado — ignorada');
      return;
    }

    const resposta = processarMensagem(numero, texto);
    log('Enviando resposta para', numero, ':', resposta.slice(0, 80));
    enviarMensagem(config, numero, resposta)
      .then(() => log('Resposta enviada com sucesso para', numero))
      .catch((err) => log('Erro ao responder:', err.message));
  } catch (err) {
    log('Erro no webhook:', err.message);
  }
});

module.exports = router;
