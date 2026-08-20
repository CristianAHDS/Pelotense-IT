const express = require('express');
const { exec } = require('child_process');
const net = require('net');
const http = require('http');
const https = require('https');
const os = require('os');
const dns = require('dns');
const { query, queryOne, run, getLastID } = require('../database');
const { getUsuarioLogado } = require('../middleware/auth');

const router = express.Router();

function exigirTI(req, res) {
  const u = getUsuarioLogado(req);
  if (!req.user || u.tipo !== 'TI') {
    res.status(403).json({ error: 'Acesso restrito ao setor de TI' });
    return false;
  }
  return true;
}

function verificarPing(alvo) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? `ping -n 1 -w 2000 "${String(alvo)}"`
      : `ping -c 1 -W 2 "${String(alvo)}"`;
    const inicio = Date.now();
    exec(cmd, { timeout: 5000, windowsHide: true }, (err, stdout) => {
      const latencia = Date.now() - inicio;
      if (err) {
        return resolve({ online: false, erro: 'Sem resposta ao ping', latencia });
      }
      const m =
        stdout.match(/time[=<]\s*([\d.]+)\s*ms/i) ||
        stdout.match(/tempo[=<]\s*([\d.]+)\s*ms/i);
      resolve({ online: true, latencia: m ? Math.round(parseFloat(m[1])) : latencia });
    });
  });
}

function verificarPorta(alvo, porta) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const socket = new net.Socket();
    const terminar = (ok, erro) => {
      socket.destroy();
      resolve({ online: ok, erro, latencia: Date.now() - inicio });
    };
    socket.setTimeout(4000);
    socket.once('connect', () => terminar(true));
    socket.once('timeout', () => terminar(false, 'Timeout de conexão'));
    socket.once('error', (e) => terminar(false, e.code || e.message));
    socket.connect(porta || 80, alvo);
  });
}

function verificarHttp(alvo) {
  return new Promise((resolve) => {
    let url = String(alvo);
    if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
    const inicio = Date.now();
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 4000 }, (res) => {
      res.resume();
      resolve({
        online: res.statusCode < 400,
        status: res.statusCode,
        latencia: Date.now() - inicio,
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ online: false, erro: 'Timeout', latencia: Date.now() - inicio });
    });
    req.on('error', (e) => {
      resolve({ online: false, erro: e.code || e.message, latencia: Date.now() - inicio });
    });
  });
}

function verificarHost(h) {
  if (h.tipo === 'porta') return verificarPorta(h.alvo, h.porta || 80);
  if (h.tipo === 'http') return verificarHttp(h.alvo);
  return verificarPing(h.alvo);
}

function ipLocal() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

function pingHost(host) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `ping -n 1 -w 300 ${host}` : `ping -c 1 -W 1 ${host}`;
    exec(cmd, { timeout: 1500, windowsHide: true }, (err) => resolve(!err));
  });
}

async function varrerPing(hosts, concorrencia = 40) {
  const ativos = new Set();
  let idx = 0;
  const worker = async () => {
    while (idx < hosts.length) {
      const h = hosts[idx++];
      if (await pingHost(h)) ativos.add(h);
    }
  };
  await Promise.all(Array.from({ length: concorrencia }, worker));
  return ativos;
}

function parseArp() {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    exec(isWin ? 'arp -a' : 'arp -an', { timeout: 5000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve([]);
      const lista = [];
      for (const linha of String(stdout).split('\n')) {
        const m = linha.match(/([\d.]+)\s+([0-9a-fA-F:-]{17})/i);
        if (m && m[1].split('.').length === 4) {
          lista.push({ ip: m[1], mac: m[2].toLowerCase() });
        }
      }
      resolve(lista);
    });
  });
}

function reverseDns(ip) {
  return new Promise((resolve) => {
    dns.reverse(ip, (err, nomes) => resolve(err || !nomes || !nomes.length ? null : nomes[0]));
  });
}

function netbiosName(ip) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null);
    exec(`nbtstat -a ${ip}`, { timeout: 3000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      const m = String(stdout).match(/^\s*([^\s]+)\s+<00>\s+UNIQUE/m);
      resolve(m ? m[1] : null);
    });
  });
}

function comTimeout(p, ms, fallback) {
  return Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);
}

function isRoteavel(ip, base) {
  if (ip === '255.255.255.255') return false;
  const [o1, o2, o3, o4] = ip.split('.').map(Number);
  if (o1 >= 224 && o1 <= 239) return false;
  if (base && ip === `${base}.255`) return false;
  if (o4 === 0 && o3 === 0 && o2 === 0) return false;
  return true;
}

router.get('/', (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const hosts = query('SELECT * FROM rede_hosts ORDER BY nome ASC');
    res.json(hosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const { nome, tipo, alvo, porta } = req.body;
    if (!nome || !alvo) return res.status(400).json({ error: 'Nome e alvo são obrigatórios' });
    const tipos = ['ping', 'porta', 'http'];
    const t = tipos.includes(tipo) ? tipo : 'ping';
    run('INSERT INTO rede_hosts (nome, tipo, alvo, porta) VALUES (?, ?, ?, ?)',
      [String(nome).trim(), t, String(alvo).trim(), porta && porta !== '' ? parseInt(porta) : null]);
    res.status(201).json(queryOne('SELECT * FROM rede_hosts WHERE id = ?', [getLastID('rede_hosts')]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT * FROM rede_hosts WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Host não encontrado' });
    const { nome, tipo, alvo, porta, ativo } = req.body;
    run(
      `UPDATE rede_hosts SET nome = COALESCE(?, nome), tipo = COALESCE(?, tipo),
       alvo = COALESCE(?, alvo), porta = ?, ativo = COALESCE(?, ativo) WHERE id = ?`,
      [
        nome ?? null,
        tipo ?? null,
        alvo ?? null,
        porta !== undefined && porta !== null && porta !== '' ? parseInt(porta) : existing.porta,
        ativo !== undefined ? (ativo ? 1 : 0) : null,
        id,
      ]
    );
    res.json(queryOne('SELECT * FROM rede_hosts WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT * FROM rede_hosts WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Host não encontrado' });
    run('DELETE FROM rede_hosts WHERE id = ?', [id]);
    res.json({ message: 'Host removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verificar', async (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const hosts = query('SELECT * FROM rede_hosts WHERE ativo = 1 ORDER BY nome ASC');
    const resultados = [];
    for (const h of hosts) {
      const r = await verificarHost(h);
      resultados.push({ id: h.id, nome: h.nome, tipo: h.tipo, alvo: h.alvo, porta: h.porta, ...r });
    }
    res.json({ hosts: resultados, verificados_em: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositivos', async (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const ip = ipLocal();
    if (!ip) return res.status(500).json({ error: 'Não foi possível identificar o IP local' });
    const partes = ip.split('.').map(Number);
    const base = `${partes[0]}.${partes[1]}.${partes[2]}`;
    const hosts = [];
    for (let h = 1; h <= 254; h++) hosts.push(`${base}.${h}`);

    const rapido = req.query.rapido === '1';
    const ativos = rapido ? new Set() : await varrerPing(hosts);
    const arp = await parseArp();

    const dispositivos = [];
    const vistos = new Set();
    const nomeLocal = os.hostname();
    for (const a of arp) {
      if (!isRoteavel(a.ip, base) || vistos.has(a.ip)) continue;
      vistos.add(a.ip);
      dispositivos.push({
        ip: a.ip,
        mac: a.mac,
        hostname: a.ip === ip ? nomeLocal : null,
        ativo: ativos.has(a.ip),
        proprio: a.ip === ip,
      });
    }
    for (const ipAtivo of ativos) {
      if (!isRoteavel(ipAtivo, base) || vistos.has(ipAtivo)) continue;
      vistos.add(ipAtivo);
      dispositivos.push({
        ip: ipAtivo,
        mac: null,
        hostname: ipAtivo === ip ? nomeLocal : null,
        ativo: true,
        proprio: ipAtivo === ip,
      });
    }

    await Promise.all(
      dispositivos.map((d) =>
        comTimeout(reverseDns(d.ip), 1500, null)
          .then((h) => h || comTimeout(netbiosName(d.ip), 1500, null))
          .then((h) => { if (h) d.hostname = h; })
      )
    );

    dispositivos.sort((a, b) => {
      const pa = a.ip.split('.').map(Number);
      const pb = b.ip.split('.').map(Number);
      for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
      return 0;
    });

    res.json({
      ip_local: ip,
      base,
      dispositivos,
      varrido_em: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/speedtest/ping', async (req, res) => {
  if (!exigirTI(req, res)) return;
  const r = await verificarPing('8.8.8.8');
  res.json({ pong: true, alvo: '8.8.8.8', latencia: r.online ? r.latencia : null });
});

router.post('/speedtest/download', (req, res) => {
  if (!exigirTI(req, res)) return;
  try {
    const bytes = Math.max(1024, Math.min(parseInt(req.query.bytes) || 25 * 1024 * 1024, 100 * 1024 * 1024));
    const url = 'https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi';
    const mod = url.startsWith('https') ? https : http;
    const proxyReq = mod.get(url, { headers: { Range: `bytes=0-${bytes - 1}` }, timeout: 10000 }, (proxyRes) => {
      res.set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      });
      let enviado = 0;
      proxyRes.on('data', (chunk) => {
        if (res.writableEnded) return;
        if (enviado >= bytes) { res.end(); proxyRes.destroy(); return; }
        const bloco = Math.min(chunk.length, bytes - enviado);
        enviado += bloco;
        if (!res.write(chunk.subarray(0, bloco))) proxyRes.pause();
      });
      res.on('drain', () => proxyRes.resume());
      proxyRes.on('end', () => { if (!res.writableEnded) res.end(); });
      proxyRes.on('error', () => { if (!res.writableEnded) res.end(); });
    });
    proxyReq.on('timeout', () => { proxyReq.destroy(); if (!res.headersSent) res.status(504).json({ error: 'Timeout ao conectar no servidor de teste' }); });
    proxyReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'Falha ao baixar do servidor de teste' }); });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
