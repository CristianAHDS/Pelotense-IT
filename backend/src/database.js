const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'chamados.db');

let db;

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS chamados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberto',
      prioridade TEXT NOT NULL DEFAULT 'media',
      categoria TEXT NOT NULL DEFAULT 'geral',
      solicitante TEXT NOT NULL,
      tecnico TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime')),
      resolvido_em TEXT,
      tempo_em_andamento INTEGER DEFAULT 0,
      inicio_em_andamento TEXT
    )
  `);

  try { db.run('ALTER TABLE chamados ADD COLUMN resolucao TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE chamados ADD COLUMN tempo_em_andamento INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE chamados ADD COLUMN inicio_em_andamento TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE tecnicos ADD COLUMN tipo TEXT DEFAULT "TI"'); } catch (_) {}
  try { db.run('ALTER TABLE usuarios ADD COLUMN tipo TEXT DEFAULT "TI"'); } catch (_) {}
  try { db.run('ALTER TABLE usuarios ADD COLUMN trocar_senha INTEGER DEFAULT 0'); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL,
      autor TEXT NOT NULL,
      texto TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS anexos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL,
      nome_original TEXT NOT NULL,
      nome_armazenado TEXT NOT NULL,
      tipo TEXT NOT NULL,
      tamanho INTEGER NOT NULL,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      cor TEXT NOT NULL DEFAULT '#6366f1'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chamado_tags (
      chamado_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (chamado_id, tag_id),
      FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL,
      acao TEXT NOT NULL,
      descricao TEXT NOT NULL,
      usuario TEXT NOT NULL DEFAULT 'Sistema',
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL,
      texto TEXT NOT NULL,
      concluido INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      icone TEXT NOT NULL,
      categoria TEXT NOT NULL,
      criterio TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuario_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      conquistado_em TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(usuario, badge_id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    )
  `);

  const existing = query("SELECT COUNT(*) as c FROM badges");
  if (existing[0]?.c === 0) {
    const inserts = [
      ["primeiro", "Primeiro Sangue", "Resolver o primeiro chamado", "🎯", "especial", '{"tipo":"primeiro"}'],
      ["total_5", "Iniciante", "5 chamados resolvidos", "🌱", "volume", '{"tipo":"total","min":5}'],
      ["total_10", "Bronze", "10 chamados resolvidos", "🥉", "volume", '{"tipo":"total","min":10}'],
      ["total_25", "Prata", "25 chamados resolvidos", "🥈", "volume", '{"tipo":"total","min":25}'],
      ["total_50", "Ouro", "50 chamados resolvidos", "🥇", "volume", '{"tipo":"total","min":50}'],
      ["total_100", "Esmeralda", "100 chamados resolvidos", "💚", "volume", '{"tipo":"total","min":100}'],
      ["total_150", "Rubi", "150 chamados resolvidos", "🔴", "volume", '{"tipo":"total","min":150}'],
      ["total_250", "Diamante", "250 chamados resolvidos", "💎", "volume", '{"tipo":"total","min":250}'],
      ["total_400", "Lenda", "400 chamados resolvidos", "👑", "volume", '{"tipo":"total","min":400}'],
      ["hardware_5", "Hardware Novice", "5 chamados de hardware resolvidos", "💻", "categoria", '{"tipo":"categoria","categoria":"hardware","min":5}'],
      ["hardware_10", "Hardware Expert", "10 chamados de hardware resolvidos", "🔧", "categoria", '{"tipo":"categoria","categoria":"hardware","min":10}'],
      ["software_5", "Software Novice", "5 chamados de software resolvidos", "💿", "categoria", '{"tipo":"categoria","categoria":"software","min":5}'],
      ["software_10", "Software Expert", "10 chamados de software resolvidos", "🖥️", "categoria", '{"tipo":"categoria","categoria":"software","min":10}'],
      ["rede_5", "Rede Novice", "5 chamados de rede resolvidos", "🌐", "categoria", '{"tipo":"categoria","categoria":"rede","min":5}'],
      ["rede_10", "Rede Expert", "10 chamados de rede resolvidos", "🔌", "categoria", '{"tipo":"categoria","categoria":"rede","min":10}'],
      ["impressora_3", "Printer Novice", "3 chamados de impressora resolvidos", "🖨️", "categoria", '{"tipo":"categoria","categoria":"impressora","min":3}'],
      ["impressora_7", "Printer Pro", "7 chamados de impressora resolvidos", "📠", "categoria", '{"tipo":"categoria","categoria":"impressora","min":7}'],
      ["email_3", "Email Novice", "3 chamados de email resolvidos", "📧", "categoria", '{"tipo":"categoria","categoria":"email","min":3}'],
      ["email_7", "Email Pro", "7 chamados de email resolvidos", "✉️", "categoria", '{"tipo":"categoria","categoria":"email","min":7}'],
      ["acesso_3", "Access Novice", "3 chamados de acesso resolvidos", "🔑", "categoria", '{"tipo":"categoria","categoria":"acesso","min":3}'],
      ["acesso_7", "Access Pro", "7 chamados de acesso resolvidos", "🛡️", "categoria", '{"tipo":"categoria","categoria":"acesso","min":7}'],
      ["evento_3", "Event Supporter", "3 chamados de evento resolvidos", "🎪", "categoria", '{"tipo":"categoria","categoria":"evento","min":3}'],
      ["censura_3", "Censura Handler", "3 chamados de censura resolvidos", "🎥", "categoria", '{"tipo":"categoria","categoria":"censura","min":3}'],
      ["speed_30min", "Flash", "Chamado resolvido em menos de 30 minutos", "⚡", "velocidade", '{"tipo":"tempo_max_horas", "horas":0.5}'],
      ["speed_2h", "Rápido", "Chamado resolvido em menos de 2 horas", "🚀", "velocidade", '{"tipo":"tempo_max_horas", "horas":2}'],
      ["speed_24h", "Eficiente", "Chamado resolvido em menos de 24 horas", "⏱️", "velocidade", '{"tipo":"tempo_max_horas", "horas":24}'],
      ["critica_1", "Herói", "1 chamado crítico resolvido", "🦸", "prioridade", '{"tipo":"prioridade","prioridade":"critica","min":1}'],
      ["critica_5", "Bombeiro", "5 chamados críticos resolvidos", "🔥", "prioridade", '{"tipo":"prioridade","prioridade":"critica","min":5}'],
      ["alta_5", "Alta Prioridade", "5 chamados de prioridade alta resolvidos", "🚨", "prioridade", '{"tipo":"prioridade","prioridade":"alta","min":5}'],
      ["alta_10", "Alta Prioridade Pro", "10 de prioridade alta resolvidos", "⚠️", "prioridade", '{"tipo":"prioridade","prioridade":"alta","min":10}'],
      ["todas_categorias", "Generalista", "Resolveu chamados de todas as categorias", "🌈", "especial", '{"tipo":"todas_categorias"}'],
      ["dia_5", "Produtivo", "Resolveu 5+ chamados no mesmo dia", "📅", "especial", '{"tipo":"dia","min":5}'],
      ["dia_10", "Super Produtivo", "Resolveu 10+ chamados no mesmo dia", "🔥", "especial", '{"tipo":"dia","min":10}'],
      ["sequencia_3d", "3-Day Streak", "3 dias consecutivos resolvendo chamados", "📆", "especial", '{"tipo":"sequencia_dias","min":3}'],
      ["sequencia_5d", "5-Day Streak", "5 dias consecutivos resolvendo chamados", "🗓️", "especial", '{"tipo":"sequencia_dias","min":5}'],
      ["noturno_3", "Coruja", "3 chamados resolvidos entre 22h e 6h", "🌙", "especial", '{"tipo":"noturno","min":3}'],
    ];
    inserts.forEach(([id, nome, descricao, icone, categoria, criterio]) => {
      run('INSERT INTO badges (id, nome, descricao, icone, categoria, criterio) VALUES (?, ?, ?, ?, ?, ?)',
        [id, nome, descricao, icone, categoria, criterio]);
    });
  }

  run("UPDATE badges SET icone = '🌱' WHERE id = 'total_5'");
  run("UPDATE badges SET icone = '🥉' WHERE id = 'total_10'");
  run("UPDATE badges SET icone = '🥈' WHERE id = 'total_25'");
  run("UPDATE badges SET icone = '🥇' WHERE id = 'total_50'");

  run("UPDATE badges SET nome = 'Esmeralda', icone = '💚', descricao = '100 chamados resolvidos', criterio = '{\"tipo\":\"total\",\"min\":100}' WHERE id = 'total_100'");
  run("UPDATE badges SET nome = 'Diamante', icone = '💎', descricao = '250 chamados resolvidos', criterio = '{\"tipo\":\"total\",\"min\":250}' WHERE id = 'total_200'");
  run("INSERT OR IGNORE INTO badges (id, nome, descricao, icone, categoria, criterio) VALUES ('total_150', 'Rubi', '150 chamados resolvidos', '🔴', 'volume', '{\"tipo\":\"total\",\"min\":150}')");
  run("INSERT OR IGNORE INTO badges (id, nome, descricao, icone, categoria, criterio) VALUES ('total_400', 'Lenda', '400 chamados resolvidos', '👑', 'volume', '{\"tipo\":\"total\",\"min\":400}')");

  db.run(`
    CREATE TABLE IF NOT EXISTS config_email (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      smtp_host TEXT DEFAULT 'smtp.gmail.com',
      smtp_port INTEGER DEFAULT 587,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      remetente TEXT DEFAULT 'Pelotense IT <ti@pelotense.com.br>',
      destinatarios TEXT DEFAULT '',
      relatorio_hora TEXT DEFAULT '18:00',
      ativo INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tecnicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      departamento TEXT DEFAULT 'TI',
      tipo TEXT DEFAULT 'TI',
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      confirmado INTEGER DEFAULT 0,
      token_confirmacao TEXT,
      trocar_senha INTEGER DEFAULT 0,
      tipo TEXT DEFAULT 'TI',
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  const existingConfig = query("SELECT COUNT(*) as c FROM config_email");
  if (existingConfig[0]?.c === 0) {
    run(`INSERT INTO config_email (id) VALUES (1)`);
  }

  save();
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function getLastID(table = 'chamados') {
  const rows = query(`SELECT MAX(id) as id FROM ${table}`);
  return rows[0]?.id;
}

module.exports = { initDatabase, query, queryOne, run, getLastID };
