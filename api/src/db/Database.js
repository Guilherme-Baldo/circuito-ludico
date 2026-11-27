import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Encapsula a conexão SQLite (módulo nativo node:sqlite) e cria o esquema.
 *
 * Tabelas:
 *   monitor      – voluntários do ELLP que conduzem as oficinas
 *   oficina      – cada encontro de sábado
 *   participante – crianças, identificadas apenas por apelido (LGPD)
 *   desafio      – GENIUS, RESISTOR, MONTAGEM
 *   tentativa    – resultado de cada jogada de um participante em um desafio
 */
export class Database {
  /** @param {string} arquivo caminho do .db ou ':memory:' */
  constructor(arquivo = ':memory:') {
    if (arquivo !== ':memory:') mkdirSync(dirname(arquivo), { recursive: true });
    this.conexao = new DatabaseSync(arquivo);
    this.conexao.exec('PRAGMA foreign_keys = ON;');
    this.criarEsquema();
  }

  criarEsquema() {
    this.conexao.exec(`
      CREATE TABLE IF NOT EXISTS monitor (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        nome        TEXT    NOT NULL,
        email       TEXT    NOT NULL UNIQUE,
        senha_hash  TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oficina (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        data        TEXT    NOT NULL,
        local       TEXT    NOT NULL,
        turma       TEXT    NOT NULL,
        monitor_id  INTEGER NOT NULL REFERENCES monitor(id),
        criado_em   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS participante (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        apelido       TEXT    NOT NULL,
        faixa_etaria  TEXT    NOT NULL,
        oficina_id    INTEGER NOT NULL REFERENCES oficina(id) ON DELETE CASCADE,
        UNIQUE (oficina_id, apelido)
      );

      CREATE TABLE IF NOT EXISTS desafio (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo       TEXT    NOT NULL UNIQUE,
        nome       TEXT    NOT NULL,
        descricao  TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tentativa (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        participante_id  INTEGER NOT NULL REFERENCES participante(id) ON DELETE CASCADE,
        desafio_id       INTEGER NOT NULL REFERENCES desafio(id),
        nivel            INTEGER NOT NULL DEFAULT 1,
        pontos           INTEGER NOT NULL,
        acertou          INTEGER NOT NULL,
        duracao_ms       INTEGER NOT NULL,
        valor_medido     REAL,
        criado_em        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_tentativa_participante ON tentativa(participante_id);
    `);
  }

  /** Executa várias operações de forma atômica. */
  transacao(fn) {
    this.conexao.exec('BEGIN');
    try {
      const resultado = fn();
      this.conexao.exec('COMMIT');
      return resultado;
    } catch (erro) {
      this.conexao.exec('ROLLBACK');
      throw erro;
    }
  }

  fechar() {
    this.conexao.close();
  }
}
