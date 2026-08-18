const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const { notificarNovoChamado } = require('../services/email');

const LOG_FILE = path.join(__dirname, '..', '..', 'whatsapp.log');
function log(...args) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  console.log('[WHATSAPP]', ...args);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

const MENU = `Olá! Como posso ajudar?

1️⃣ Consultar status de chamado
2️⃣ Abrir novo chamado
3️⃣ Falar com atendente

Digite o número da opção desejada.`;

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'logos', 'pelotense_it_colorido.png');

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
  if (!config)
    return {
      ativo: 0,
      api_url: '',
      api_key: '',
      instance: '',
      numeros_permitidos: [],
      prefixos: [],
    };
  let numeros = [];
  try {
    numeros = JSON.parse(config.numeros_permitidos || '[]');
  } catch (_) {
    numeros = [];
  }
  let prefixos = [];
  try {
    prefixos = JSON.parse(config.prefixos || '[]');
  } catch (_) {
    prefixos = [];
  }
  return {
    ativo: !!config.ativo,
    api_url: config.api_url || '',
    api_key: config.api_key || '',
    instance: config.instance || '',
    numeros_permitidos: numeros,
    prefixos: prefixos,
  };
}

function setSessao(numero, estado, dados = {}) {
  const exists = queryOne(
    'SELECT numero FROM whatsapp_sessoes WHERE numero = ?',
    [numero],
  );
  if (exists) {
    run(
      "UPDATE whatsapp_sessoes SET estado = ?, dados = ?, atualizado_em = datetime('now','localtime') WHERE numero = ?",
      [estado, JSON.stringify(dados), numero],
    );
  } else {
    run(
      'INSERT INTO whatsapp_sessoes (numero, estado, dados) VALUES (?, ?, ?)',
      [numero, estado, JSON.stringify(dados)],
    );
  }
}

function formatarChamado(c) {
  return `📋 *Chamado #${c.id}*\n\n*Título:* ${c.titulo}\n*Status:* ${STATUS_LABELS[c.status] || c.status}\n*Prioridade:* ${c.prioridade}\n*Categoria:* ${c.categoria}\n*Solicitante:* ${c.solicitante}\n*Criado em:* ${c.criado_em}\n\nDigite "menu" para voltar.`;
}

function processarMensagem(numero, texto) {
  const msg = texto.trim().toLowerCase();
  const sessao = getSessao(numero) || { estado: 'menu', dados: '{}' };
  let dados = {};
  try {
    dados = JSON.parse(sessao.dados || '{}');
  } catch (_) {}

  if (msg === 'menu' || msg === 'cancelar') {
    setSessao(numero, 'menu', {});
    return MENU;
  }

  if (sessao.estado === 'humano') {
    setSessao(numero, 'humano', {});
    return null;
  }

  if (sessao.estado === 'consultar') {
    const id = parseInt(msg, 10);
    if (isNaN(id)) {
      return '⚠️ Informe um número de chamado válido (ex: 123). Digite "menu" para voltar.';
    }
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    setSessao(numero, 'menu', {});
    if (!chamado)
      return `❌ Não encontrei o chamado #${id}. Digite "menu" para ver as opções.`;
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
    const id = (queryOne('SELECT MAX(id) as m FROM chamados')?.m || 0) + 1;
    run(
      `INSERT INTO chamados (id, titulo, descricao, status, prioridade, categoria, solicitante, criado_em, atualizado_em)
       VALUES (?, ?, ?, 'aberto', 'media', 'geral', ?, datetime('now','localtime'), datetime('now','localtime'))`,
      [id, titulo, desc, `WhatsApp ${numero}`],
    );
    setSessao(numero, 'menu', {});
    const chamado = queryOne('SELECT * FROM chamados WHERE id = ?', [id]);
    notificarNovoChamado(chamado).catch((e) =>
      log('Erro ao notificar novo chamado:', e.message),
    );
    return `✅ Chamado #${id} aberto com sucesso!\n\n📋 *${titulo}*\n📝 ${desc}\n\nA equipe de TI irá atendê-lo em breve. Digite "menu" para mais opções.`;
  }

  // estado menu
  if (msg === '1' || msg === 'consultar' || msg === 'status') {
    setSessao(numero, 'consultar', {});
    return 'Digite o número do chamado que deseja consultar (ex: 123).';
  }
  if (msg === '2' || msg === 'abrir' || msg === 'novo') {
    setSessao(numero, 'abrir_titulo', {});
    return 'Vamos abrir um chamado! Qual o assunto do problema? (Escreva um título breve)';
  }
  if (msg === '3' || msg === 'atendente' || msg === 'humano') {
    setSessao(numero, 'humano', {});
    return '👤 Você será atendido por um humano. O assistente ficará em silêncio durante o atendimento.\n\nDigite *menu* a qualquer momento para voltar ao assistente virtual.';
  }

  return MENU;
}

function getSessao(numero) {
  return queryOne('SELECT * FROM whatsapp_sessoes WHERE numero = ?', [numero]);
}

function getSessaoPorLid(lid) {
  if (!lid) return null;
  return queryOne('SELECT * FROM whatsapp_sessoes WHERE lid = ?', [lid]);
}

function updateLid(numero, lid) {
  if (!numero || !lid) return;
  run('UPDATE whatsapp_sessoes SET lid = ? WHERE numero = ?', [lid, numero]);
}

function getJidPara(numero) {
  const n = normalizarNumero(numero);
  const sessao = getSessao(n);
  return sessao && sessao.lid ? sessao.lid : n;
}

function isComandoFinalizar(texto) {
  const t = String(texto || '')
    .trim()
    .toLowerCase();
  return [
    '#finalizar',
    '!finalizar',
    '/finalizar',
    'finalizar',
    '#encerrar',
    '!encerrar',
    '/encerrar',
    'encerrar',
    'finalizar atendimento',
    'encerrar atendimento',
  ].includes(t);
}

function registrarEnvio(numero, texto, mensagemId, status) {
  try {
    run(
      `INSERT OR REPLACE INTO whatsapp_entregas (mensagem_id, numero, texto, status, atualizado_em)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`,
      [
        mensagemId,
        normalizarNumero(numero),
        (texto || '').slice(0, 120),
        status || 'PENDING',
      ],
    );
    run(
      `DELETE FROM whatsapp_entregas WHERE mensagem_id NOT IN (
         SELECT mensagem_id FROM whatsapp_entregas ORDER BY atualizado_em DESC LIMIT 200
       )`,
    );
  } catch (err) {
    log('Erro ao registrar envio:', err.message);
  }
}

function atualizarEntrega(mensagemId, status) {
  try {
    run(
      "UPDATE whatsapp_entregas SET status = ?, atualizado_em = datetime('now','localtime') WHERE mensagem_id = ?",
      [status, mensagemId],
    );
  } catch (err) {
    log('Erro ao atualizar entrega:', err.message);
  }
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
  if (
    config.instance &&
    instances.some((i) => i.instanceName === config.instance)
  ) {
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
  if (!instanceName)
    throw new Error('Nenhuma instância encontrada na Evolution API');
  const base = String(config.api_url).replace(/\/+$/, '');
  const url = `${base}/message/sendText/${instanceName}`;
  const destino = getJidPara(numero);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.api_key },
    body: JSON.stringify({ number: destino, textMessage: { text: texto } }),
  });
  if (!res.ok) {
    throw new Error(`Evolution API respondeu ${res.status}`);
  }

  let mensagemId = null;
  let status = 'PENDING';
  try {
    const data = await res.json();
    mensagemId = data?.key?.id || null;
    status = data?.status || 'PENDING';
  } catch (_) {}

  if (mensagemId) {
    registrarEnvio(numero, texto, mensagemId, status);
  }
  return { mensagemId, status };
}

async function enviarMensagemComImagem(config, numero, caption) {
  if (!config.api_url || !config.api_key) {
    throw new Error('Configuração da Evolution API incompleta');
  }
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error('Logo não encontrado: ' + LOGO_PATH);
  }
  const media = fs.readFileSync(LOGO_PATH).toString('base64');
  const instanceName = await resolveInstanceName(config);
  if (!instanceName)
    throw new Error('Nenhuma instância encontrada na Evolution API');
  const base = String(config.api_url).replace(/\/+$/, '');
  const url = `${base}/message/sendMedia/${instanceName}`;
  const destino = getJidPara(numero);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.api_key },
    body: JSON.stringify({
      number: destino,
      mediaMessage: {
        mediatype: 'image',
        media,
        caption,
        mimetype: 'image/png',
      },
    }),
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
    const { ativo, api_url, api_key, instance, numeros_permitidos, prefixos } =
      req.body || {};
    const current = getConfig();
    const numeros = Array.isArray(numeros_permitidos)
      ? numeros_permitidos
          .map((n) => String(n).replace(/\D/g, ''))
          .filter(Boolean)
      : current.numeros_permitidos;
    const prefixosList = Array.isArray(prefixos)
      ? prefixos.map((p) => String(p).replace(/\D/g, '')).filter(Boolean)
      : current.prefixos;

    run(
      `UPDATE config_whatsapp SET ativo = ?, api_url = ?, api_key = ?, instance = ?, numeros_permitidos = ?, prefixos = ? WHERE id = 1`,
      [
        ativo !== undefined ? (ativo ? 1 : 0) : current.ativo ? 1 : 0,
        api_url ?? current.api_url,
        api_key ?? current.api_key,
        instance ?? current.instance,
        JSON.stringify(numeros),
        JSON.stringify(prefixosList),
      ],
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
    if (!numero)
      return res.status(400).json({ error: 'Informe o número de destino' });
    const config = getConfig();
    if (!config.ativo) return res.status(400).json({ error: 'Bot desativado' });
    await enviarMensagem(
      config,
      normalizarNumero(numero),
      mensagem || '✅ Teste do bot Pelotense IT!',
    );
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
      return res.json({
        conectado: false,
        numero: null,
        nome: null,
        instancia: null,
        estado: null,
      });
    }
    const instances = await fetchInstances(config);
    const inst =
      instances.find((i) => i.instanceName === config.instance) ||
      instances.find((i) => i.status === 'open') ||
      instances[0] ||
      {};
    const owner = inst.owner || inst.ownerJid || inst.integration?.number || '';
    const numero = String(owner).split('@')[0].replace(/\D/g, '');
    const nome =
      inst.profileName && inst.profileName !== 'not loaded'
        ? inst.profileName
        : null;
    res.json({
      conectado: inst.status === 'open',
      numero: numero || null,
      nome,
      instancia: inst.instanceName || null,
      estado: inst.status || null,
    });
  } catch (err) {
    res.json({
      conectado: false,
      numero: null,
      nome: null,
      instancia: null,
      estado: null,
      erro: err.message,
    });
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
    const lid = key.remoteJid || '';

    // Atualização de status de entrega (messages.update)
    const update = data.update || {};
    if (update.status && key.id) {
      atualizarEntrega(key.id, update.status);
      log(`Status de entrega: ${key.id} -> ${update.status}`);
      return;
    }

    if (key.fromMe) {
      const message = data.message || {};
      const textoAtendente =
        message.conversation ||
        (message.extendedTextMessage && message.extendedTextMessage.text) ||
        '';
      if (textoAtendente && isComandoFinalizar(textoAtendente)) {
        const sessao = getSessaoPorLid(lid);
        if (sessao && sessao.estado === 'humano') {
          setSessao(sessao.numero, 'menu', {});
          log(
            'Atendimento humano finalizado pelo atendente para',
            sessao.numero,
          );
          enviarMensagem(
            getConfig(),
            normalizarNumero(sessao.numero),
            '✅ Atendimento encerrado. Digite "menu" para voltar ao assistente virtual.',
          ).catch((e) =>
            log('Erro ao notificar fim do atendimento:', e.message),
          );
        } else {
          log(
            'Comando de finalização recebido, mas nenhum atendimento humano ativo para este destinatário',
          );
        }
      } else {
        log('Mensagem própria (fromMe=true) — ignorada');
      }
      return;
    }

    const jid = key.senderPn || key.remoteJid;
    const message = data.message || {};
    const texto =
      message.conversation ||
      (message.extendedTextMessage && message.extendedTextMessage.text) ||
      '';
    if (!jid || !texto) {
      log('Sem jid ou texto — ignorada. jid=', jid, 'texto=', texto);
      return;
    }

    const numero = normalizarNumero(jid);
    const config = getConfig();
    log(
      'Mensagem de',
      numero,
      ':',
      texto,
      '| ativo=',
      config.ativo,
      '| permitidos=',
      config.numeros_permitidos,
    );

    if (!config.ativo) {
      log('Bot desativado — ignorada');
      return;
    }
    const autorizado =
      config.numeros_permitidos.includes(numero) ||
      (config.prefixos || []).some((p) => numero.startsWith(p));
    if (!autorizado) {
      log('Número', numero, 'NÃO autorizado — ignorada');
      return;
    }

    const resposta = processarMensagem(numero, texto);
    updateLid(numero, lid);
    if (!resposta) {
      run(
        'INSERT INTO whatsapp_mensagens (numero, origem, conteudo) VALUES (?, ?, ?)',
        [numero, 'cliente', texto],
      );
      log('Atendimento humano em andamento — mensagem do cliente salva para', numero);
      return;
    }
    log('Enviando resposta para', numero, ':', resposta.slice(0, 80));
    if (resposta === MENU) {
      enviarMensagemComImagem(config, numero, resposta)
        .then(() => log('Menu com logo enviado com sucesso para', numero))
        .catch((err) => log('Erro ao enviar menu:', err.message));
    } else {
      enviarMensagem(config, numero, resposta)
        .then(() => log('Resposta enviada com sucesso para', numero))
        .catch((err) => log('Erro ao responder:', err.message));
    }
  } catch (err) {
    log('Erro no webhook:', err.message);
  }
});

// Lista de sessões em atendimento humano
router.get('/sessoes', (req, res) => {
  try {
    const sessoes = query(
      "SELECT * FROM whatsapp_sessoes WHERE estado = 'humano' ORDER BY atualizado_em DESC",
    );
    res.json(sessoes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mensagens de um atendimento humano
router.get('/chat/:numero', (req, res) => {
  try {
    const numero = normalizarNumero(req.params.numero);
    const msgs = query(
      'SELECT * FROM whatsapp_mensagens WHERE numero = ? ORDER BY id ASC',
      [numero],
    );
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar resposta pelo sistema para um atendimento humano
router.post('/chat/:numero/enviar', async (req, res) => {
  try {
    const numero = normalizarNumero(req.params.numero);
    const texto = String(req.body.texto || '').trim();
    if (!texto) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }
    const config = getConfig();
    await enviarMensagem(config, numero, texto);
    run(
      'INSERT INTO whatsapp_mensagens (numero, origem, conteudo) VALUES (?, ?, ?)',
      [numero, 'atendente', texto],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status de entrega das últimas mensagens enviadas
router.get('/entregas', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const entregas = query(
      'SELECT * FROM whatsapp_entregas ORDER BY atualizado_em DESC, mensagem_id DESC LIMIT ?',
      [limit],
    );
    res.json(entregas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Finalizar atendimento humano (retorna o bot ao menu)
router.post('/finalizar-atendimento', async (req, res) => {
  try {
    const { numero, notificar } = req.body || {};
    if (!numero) return res.status(400).json({ error: 'Informe o número' });

    const sessao = getSessao(numero);
    if (!sessao || sessao.estado !== 'humano') {
      return res
        .status(400)
        .json({ error: 'Nenhum atendimento humano ativo para este número' });
    }

    setSessao(numero, 'menu', {});
    log('Atendimento humano finalizado para', numero);

    if (notificar !== false) {
      try {
        await enviarMensagem(
          getConfig(),
          normalizarNumero(numero),
          '✅ Atendimento encerrado. Digite "menu" para voltar ao assistente virtual.',
        );
      } catch (e) {
        log('Erro ao notificar fim do atendimento:', e.message);
      }
    }

    res.json({ message: 'Atendimento finalizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Encerra atendimentos humanos por inatividade (verificado a cada 1 minuto)
const INATIVIDADE_MIN = 10;

function finalizarAtendimentosInativos() {
  try {
    const limite = queryOne("SELECT datetime('now','localtime', ?) as d", [
      `-${INATIVIDADE_MIN} minutes`,
    ])?.d;
    if (!limite) return;

    const sessoes = query(
      "SELECT * FROM whatsapp_sessoes WHERE estado = 'humano' AND atualizado_em <= ?",
      [limite],
    );

    for (const s of sessoes) {
      setSessao(s.numero, 'menu', {});
      log(
        `Atendimento humano encerrado por inatividade (${INATIVIDADE_MIN}min) para`,
        s.numero,
      );

      try {
        const config = getConfig();
        if (config.ativo) {
          enviarMensagem(
            config,
            normalizarNumero(s.numero),
            '⏰ Atendimento encerrado por inatividade. Digite "menu" para voltar ao assistente virtual.',
          ).catch((e) => log('Erro ao notificar inatividade:', e.message));
        }
      } catch (e) {
        log('Erro ao notificar inatividade:', e.message);
      }
    }
  } catch (err) {
    log('Erro ao verificar inatividade:', err.message);
  }
}

setInterval(finalizarAtendimentosInativos, 60 * 1000);

module.exports = router;
