import { HttpError } from '../http/HttpError.js';

export const FAIXAS_ETARIAS = ['10-12', '13-14', '15-16'];

/** Regras de negócio de oficinas e participantes. */
export class OficinaService {
  constructor(oficinas, participantes) {
    this.oficinas = oficinas;
    this.participantes = participantes;
  }

  listar(monitorId) {
    return this.oficinas.listarPorMonitor(monitorId);
  }

  criar(monitorId, { data, local, turma }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data ?? '')) || Number.isNaN(Date.parse(data))) {
      throw HttpError.requisicaoInvalida('Data inválida (use AAAA-MM-DD).');
    }
    const localLimpo = String(local ?? '').trim();
    const turmaLimpa = String(turma ?? '').trim();
    if (localLimpo.length < 2) throw HttpError.requisicaoInvalida('Informe o local da oficina.');
    if (turmaLimpa.length < 1) throw HttpError.requisicaoInvalida('Informe a turma.');
    return this.oficinas.criar({ data, local: localLimpo, turma: turmaLimpa, monitorId });
  }

  /** Busca a oficina garantindo que pertence ao monitor logado. */
  buscar(oficinaId, monitorId) {
    const oficina = this.oficinas.buscarPorId(Number(oficinaId));
    if (!oficina || oficina.monitorId !== monitorId) throw HttpError.naoEncontrado('Oficina não encontrada.');
    return oficina;
  }

  listarParticipantes(oficinaId, monitorId) {
    this.buscar(oficinaId, monitorId);
    return this.participantes.listarPorOficina(Number(oficinaId));
  }

  adicionarParticipante(oficinaId, monitorId, { apelido, faixaEtaria }) {
    this.buscar(oficinaId, monitorId);
    const nome = String(apelido ?? '').trim();
    // Só apelido: 2 a 20 letras, números, espaço, _ ou -. Bloqueia e-mails e números longos (LGPD).
    if (!/^[\p{L}\p{N} _-]{2,20}$/u.test(nome)) {
      throw HttpError.requisicaoInvalida('Apelido deve ter de 2 a 20 letras ou números.');
    }
    if (/\d{5,}/.test(nome)) throw HttpError.requisicaoInvalida('Não use números de documentos ou telefone no apelido.');
    if (!FAIXAS_ETARIAS.includes(faixaEtaria)) {
      throw HttpError.requisicaoInvalida(`Faixa etária deve ser uma de: ${FAIXAS_ETARIAS.join(', ')}.`);
    }
    if (this.participantes.buscarPorApelido(Number(oficinaId), nome)) {
      throw HttpError.conflito('Já existe alguém com esse apelido nesta oficina.');
    }
    return this.participantes.criar({ apelido: nome, faixaEtaria, oficinaId: Number(oficinaId) });
  }

  removerParticipante(participanteId, monitorId) {
    const participante = this.participantes.buscarPorId(Number(participanteId));
    if (!participante) throw HttpError.naoEncontrado('Participante não encontrado.');
    this.buscar(participante.oficinaId, monitorId);
    this.participantes.remover(participante.id);
  }
}
