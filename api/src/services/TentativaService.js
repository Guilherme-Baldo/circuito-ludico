import { HttpError } from '../http/HttpError.js';
import { mergeSort } from '../lib/ordenacao.js';
import { paraCsv } from '../lib/csv.js';

/** Registro de tentativas, ranking e relatório da oficina. */
export class TentativaService {
  constructor({ tentativas, participantes, desafios, oficinaService }) {
    this.tentativas = tentativas;
    this.participantes = participantes;
    this.desafios = desafios;
    this.oficinaService = oficinaService;
  }

  registrar(monitorId, dados) {
    const participante = this.participantes.buscarPorId(Number(dados.participanteId));
    if (!participante) throw HttpError.naoEncontrado('Participante não encontrado.');
    this.oficinaService.buscar(participante.oficinaId, monitorId); // garante que a oficina é do monitor

    const desafio = this.desafios.buscarPorId(Number(dados.desafioId));
    if (!desafio) throw HttpError.naoEncontrado('Desafio não encontrado.');

    const inteiro = (v, min, max, nome) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        throw HttpError.requisicaoInvalida(`${nome} deve ser um inteiro entre ${min} e ${max}.`);
      }
      return n;
    };

    const valorMedido = dados.valorMedido === undefined || dados.valorMedido === null ? null : Number(dados.valorMedido);
    if (valorMedido !== null && (!Number.isFinite(valorMedido) || valorMedido < 0)) {
      throw HttpError.requisicaoInvalida('Valor medido inválido.');
    }

    return this.tentativas.criar({
      participanteId: participante.id,
      desafioId: desafio.id,
      nivel: inteiro(dados.nivel ?? 1, 1, 3, 'Nível'),
      pontos: inteiro(dados.pontos, 0, 1000, 'Pontos'),
      acertou: Boolean(dados.acertou),
      duracaoMs: inteiro(Math.round(Number(dados.duracaoMs)), 0, 3_600_000, 'Duração'),
      valorMedido,
    });
  }

  /**
   * Ranking da oficina.
   * Critérios, nesta ordem: mais pontos, mais acertos, menos tentativas, apelido (A–Z).
   * Posições no estilo "competição" (1, 1, 3): empatados em pontos e acertos dividem a posição.
   */
  ranking(oficinaId, monitorId) {
    this.oficinaService.buscar(oficinaId, monitorId);
    const participantes = this.participantes.listarPorOficina(Number(oficinaId));
    const tentativas = this.tentativas.listarPorOficina(Number(oficinaId));

    // Agrega em um mapa id -> placar: O(n + t)
    const placar = new Map(participantes.map((p) => [p.id, {
      participanteId: p.id, apelido: p.apelido, faixaEtaria: p.faixaEtaria,
      pontos: 0, acertos: 0, tentativas: 0, melhorGenius: 0,
    }]));
    for (const t of tentativas) {
      const linha = placar.get(t.participanteId);
      if (!linha) continue;
      linha.pontos += t.pontos;
      linha.tentativas += 1;
      if (t.acertou) linha.acertos += 1;
      if (t.desafioTipo === 'GENIUS') linha.melhorGenius = Math.max(linha.melhorGenius, t.pontos);
    }

    const ordenado = mergeSort([...placar.values()], (a, b) =>
      b.pontos - a.pontos ||
      b.acertos - a.acertos ||
      a.tentativas - b.tentativas ||
      a.apelido.localeCompare(b.apelido, 'pt-BR'));

    return ordenado.map((linha, i, todos) => {
      const anterior = todos[i - 1];
      const empatado = anterior && anterior.pontos === linha.pontos && anterior.acertos === linha.acertos;
      linha.posicao = empatado ? todos[i - 1].posicao : i + 1;
      return linha;
    });
  }

  relatorio(oficinaId, monitorId) {
    const oficina = this.oficinaService.buscar(oficinaId, monitorId);
    const tentativas = this.tentativas.listarPorOficina(oficina.id);
    const ativos = new Set(tentativas.map((t) => t.participanteId));

    const porDesafio = this.desafios.listar().map((d) => {
      const lista = tentativas.filter((t) => t.desafioId === d.id);
      const acertos = lista.filter((t) => t.acertou).length;
      const media = (campo) => (lista.length ? lista.reduce((s, t) => s + t[campo], 0) / lista.length : 0);
      return {
        desafioId: d.id,
        tipo: d.tipo,
        nome: d.nome,
        tentativas: lista.length,
        acertos,
        taxaAcerto: lista.length ? acertos / lista.length : 0,
        mediaPontos: media('pontos'),
        tempoMedioS: media('duracaoMs') / 1000,
      };
    });

    return {
      oficina,
      participantes: oficina.totalParticipantes,
      participantesAtivos: ativos.size,
      totalTentativas: tentativas.length,
      porDesafio,
      tentativas,
    };
  }

  relatorioCsv(oficinaId, monitorId) {
    const { tentativas } = this.relatorio(oficinaId, monitorId);
    return paraCsv(
      ['data_hora', 'apelido', 'desafio', 'nivel', 'pontos', 'acertou', 'duracao_s', 'valor_medido_ohm'],
      tentativas.map((t) => [
        t.criadoEm, t.apelido, t.desafioNome, t.nivel, t.pontos, t.acertou ? 'sim' : 'nao',
        (t.duracaoMs / 1000).toFixed(1).replace('.', ','),
        t.valorMedido === null ? '' : Math.round(t.valorMedido),
      ]),
    );
  }
}
