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
      resolvido_em TEXT
    )
  `);

  try { db.run('ALTER TABLE chamados ADD COLUMN resolucao TEXT'); } catch (_) {}

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
