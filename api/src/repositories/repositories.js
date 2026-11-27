/**
 * Camada de acesso a dados. Cada repositório conhece apenas o SQL da sua
 * tabela e devolve objetos em camelCase para as camadas de cima.
 */

class Repositorio {
  /** @param {import('../db/Database.js').Database} db */
  constructor(db) {
    this.db = db.conexao;
  }
}

export class MonitorRepository extends Repositorio {
  buscarPorEmail(email) {
    const linha = this.db.prepare('SELECT * FROM monitor WHERE email = ?').get(email);
    return linha ? MonitorRepository.mapear(linha) : null;
  }

  buscarPorId(id) {
    const linha = this.db.prepare('SELECT * FROM monitor WHERE id = ?').get(id);
    return linha ? MonitorRepository.mapear(linha) : null;
  }

  criar({ nome, email, senhaHash }) {
    const r = this.db
      .prepare('INSERT INTO monitor (nome, email, senha_hash) VALUES (?, ?, ?)')
      .run(nome, email, senhaHash);
    return this.buscarPorId(Number(r.lastInsertRowid));
  }

  static mapear(l) {
    return { id: l.id, nome: l.nome, email: l.email, senhaHash: l.senha_hash };
  }
}

export class OficinaRepository extends Repositorio {
  listarPorMonitor(monitorId) {
    return this.db
      .prepare(`
        SELECT o.*, COUNT(p.id) AS total_participantes
          FROM oficina o
          LEFT JOIN participante p ON p.oficina_id = o.id
         WHERE o.monitor_id = ?
         GROUP BY o.id
         ORDER BY o.data DESC, o.id DESC`)
      .all(monitorId)
      .map(OficinaRepository.mapear);
  }

  buscarPorId(id) {
    const linha = this.db
      .prepare(`
        SELECT o.*, (SELECT COUNT(*) FROM participante p WHERE p.oficina_id = o.id) AS total_participantes
          FROM oficina o WHERE o.id = ?`)
      .get(id);
    return linha ? OficinaRepository.mapear(linha) : null;
  }

  criar({ data, local, turma, monitorId }) {
    const r = this.db
      .prepare('INSERT INTO oficina (data, local, turma, monitor_id) VALUES (?, ?, ?, ?)')
      .run(data, local, turma, monitorId);
    return this.buscarPorId(Number(r.lastInsertRowid));
  }

  static mapear(l) {
    return {
      id: l.id,
      data: l.data,
      local: l.local,
      turma: l.turma,
      monitorId: l.monitor_id,
      totalParticipantes: l.total_participantes ?? 0,
      criadoEm: l.criado_em,
    };
  }
}

export class ParticipanteRepository extends Repositorio {
  listarPorOficina(oficinaId) {
    return this.db
      .prepare('SELECT * FROM participante WHERE oficina_id = ? ORDER BY apelido COLLATE NOCASE')
      .all(oficinaId)
      .map(ParticipanteRepository.mapear);
  }

  buscarPorId(id) {
    const linha = this.db.prepare('SELECT * FROM participante WHERE id = ?').get(id);
    return linha ? ParticipanteRepository.mapear(linha) : null;
  }

  buscarPorApelido(oficinaId, apelido) {
    const linha = this.db
      .prepare('SELECT * FROM participante WHERE oficina_id = ? AND apelido = ? COLLATE NOCASE')
      .get(oficinaId, apelido);
    return linha ? ParticipanteRepository.mapear(linha) : null;
  }

  criar({ apelido, faixaEtaria, oficinaId }) {
    const r = this.db
      .prepare('INSERT INTO participante (apelido, faixa_etaria, oficina_id) VALUES (?, ?, ?)')
      .run(apelido, faixaEtaria, oficinaId);
    return this.buscarPorId(Number(r.lastInsertRowid));
  }

  remover(id) {
    return this.db.prepare('DELETE FROM participante WHERE id = ?').run(id).changes > 0;
  }

  static mapear(l) {
    return { id: l.id, apelido: l.apelido, faixaEtaria: l.faixa_etaria, oficinaId: l.oficina_id };
  }
}

export class DesafioRepository extends Repositorio {
  listar() {
    return this.db.prepare('SELECT * FROM desafio ORDER BY id').all().map(DesafioRepository.mapear);
  }

  buscarPorId(id) {
    const linha = this.db.prepare('SELECT * FROM desafio WHERE id = ?').get(id);
    return linha ? DesafioRepository.mapear(linha) : null;
  }

  garantir({ tipo, nome, descricao }) {
    this.db
      .prepare('INSERT INTO desafio (tipo, nome, descricao) VALUES (?, ?, ?) ON CONFLICT(tipo) DO NOTHING')
      .run(tipo, nome, descricao);
  }

  static mapear(l) {
    return { id: l.id, tipo: l.tipo, nome: l.nome, descricao: l.descricao };
  }
}

export class TentativaRepository extends Repositorio {
  criar({ participanteId, desafioId, nivel, pontos, acertou, duracaoMs, valorMedido }) {
    const r = this.db
      .prepare(`
        INSERT INTO tentativa (participante_id, desafio_id, nivel, pontos, acertou, duracao_ms, valor_medido)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(participanteId, desafioId, nivel, pontos, acertou ? 1 : 0, duracaoMs, valorMedido ?? null);
    return this.buscarPorId(Number(r.lastInsertRowid));
  }

  buscarPorId(id) {
    const linha = this.db
      .prepare(`
        SELECT t.*, p.apelido, d.tipo AS desafio_tipo, d.nome AS desafio_nome
          FROM tentativa t
          JOIN participante p ON p.id = t.participante_id
          JOIN desafio d ON d.id = t.desafio_id
         WHERE t.id = ?`)
      .get(id);
    return linha ? TentativaRepository.mapear(linha) : null;
  }

  /** Todas as tentativas de uma oficina, da mais antiga para a mais recente. */
  listarPorOficina(oficinaId) {
    return this.db
      .prepare(`
        SELECT t.*, p.apelido, d.tipo AS desafio_tipo, d.nome AS desafio_nome
          FROM tentativa t
          JOIN participante p ON p.id = t.participante_id
          JOIN desafio d ON d.id = t.desafio_id
         WHERE p.oficina_id = ?
         ORDER BY t.id`)
      .all(oficinaId)
      .map(TentativaRepository.mapear);
  }

  static mapear(l) {
    return {
      id: l.id,
      participanteId: l.participante_id,
      apelido: l.apelido,
      desafioId: l.desafio_id,
      desafioTipo: l.desafio_tipo,
      desafioNome: l.desafio_nome,
      nivel: l.nivel,
      pontos: l.pontos,
      acertou: l.acertou === 1,
      duracaoMs: l.duracao_ms,
      valorMedido: l.valor_medido,
      criadoEm: l.criado_em,
    };
  }
}
