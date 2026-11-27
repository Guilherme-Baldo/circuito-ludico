import { Kit } from './Kit.js';
import {
  ADC_MAX, R_REF, leituraDivisor, resistenciaPorLeitura, e12MaisProximo, tempoLedGenius,
} from '../lib/algoritmos.js';

const MAX_RODADAS = 32;
const AMOSTRAS_MEDICAO = 16;

/**
 * Kit virtual: roda no navegador a mesma lógica do firmware (máquina de estados
 * do Genius e ohmímetro por divisor de tensão), para demonstrar sem o hardware.
 *
 * Para parecer real, o resistor de referência "de fábrica" tem 0,5% de erro
 * e cada leitura do ADC tem ruído de ±1 contagem.
 */
export class KitSimulado extends Kit {
  constructor() {
    super();
    this.nome = 'Kit simulado';
    this.simulado = true;
    this.rRefReal = R_REF * 1.005;   // resistor de 1% de tolerância
    this.rRefCalibrado = R_REF;      // o que o firmware "acha" que tem
    this.soquete = null;             // resistência real encaixada no soquete (Ω) ou null
    this.estado = 'OCIOSO';
    this.sequencia = [];
    this.indice = 0;
    this.timers = [];
  }

  async conectar() {
    this.conectado = true;
    setTimeout(() => this.emitir({ evt: 'pronto', versao: '1.0-sim' }), 50);
  }

  async desconectar() {
    this.limparTimers();
    this.conectado = false;
    this.emitir({ evt: 'desconectado' });
  }

  async enviar(comando) {
    switch (comando.cmd) {
      case 'ping':
        this.depois(30, () => this.emitir({ evt: 'pronto', versao: '1.0-sim' }));
        break;
      case 'genius':
        this.iniciarGenius();
        break;
      case 'parar':
        this.pararGenius('parado');
        break;
      case 'medir':
        this.depois(120, () => this.emitir(this.medir_()));
        break;
      case 'calibrar':
        this.depois(120, () => this.calibrar(Number(comando.r)));
        break;
      default:
        this.emitir({ evt: 'erro', msg: `comando desconhecido: ${comando.cmd}` });
    }
  }

  // ------------------------------------------------------------------ soquete
  /** Encaixa uma resistência no soquete do ohmímetro (valor real, já com tolerância). */
  encaixar(ohms) {
    this.soquete = ohms;
  }

  retirar() {
    this.soquete = null;
  }

  // ---------------------------------------------------------------- ohmímetro
  lerAdc() {
    if (this.soquete === null) return ADC_MAX;           // circuito aberto: pull-up leva a 5 V
    const ideal = leituraDivisor(this.rRefReal, this.soquete);
    const ruido = Math.round(Math.random() * 2 - 1);       // ±1 contagem
    return Math.min(ADC_MAX, Math.max(0, ideal + ruido));
  }

  medir_() {
    let soma = 0;
    for (let i = 0; i < AMOSTRAS_MEDICAO; i++) soma += this.lerAdc();
    const n = soma / AMOSTRAS_MEDICAO;
    if (n > ADC_MAX - 5) return { evt: 'ohm', aberto: true, adc: Math.round(n) };
    if (n < 2) return { evt: 'ohm', curto: true, adc: Math.round(n) };
    const rx = resistenciaPorLeitura(n, this.rRefCalibrado);
    return { evt: 'ohm', rx: Math.round(rx), e12: e12MaisProximo(rx), adc: Math.round(n) };
  }

  calibrar(rConhecido) {
    let soma = 0;
    for (let i = 0; i < AMOSTRAS_MEDICAO; i++) soma += this.lerAdc();
    const n = soma / AMOSTRAS_MEDICAO;
    if (!(rConhecido > 0) || n <= 2 || n >= ADC_MAX - 5) {
      this.emitir({ evt: 'erro', msg: 'Encaixe o resistor de calibração no soquete.' });
      return;
    }
    // Rref = Rx · (1023 − n) / n
    this.rRefCalibrado = (rConhecido * (ADC_MAX - n)) / n;
    this.emitir({ evt: 'calibrado', rref: Math.round(this.rRefCalibrado) });
  }

  // ------------------------------------------------------------------- Genius
  iniciarGenius() {
    this.limparTimers();
    this.sequencia = [];
    this.novaRodada();
  }

  novaRodada() {
    if (this.sequencia.length >= MAX_RODADAS) {
      this.pararGenius('vitoria');
      return;
    }
    this.sequencia.push(Math.floor(Math.random() * 4));
    const n = this.sequencia.length;
    this.estado = 'MOSTRANDO';
    this.emitir({ evt: 'rodada', n });

    const tLed = tempoLedGenius(n);
    let t = 700;
    for (const cor of this.sequencia) {
      this.depois(t, () => this.emitir({ evt: 'led', id: cor, aceso: true }));
      this.depois(t + tLed, () => this.emitir({ evt: 'led', id: cor, aceso: false }));
      t += tLed + 150;
    }
    this.depois(t, () => {
      this.estado = 'AGUARDANDO';
      this.indice = 0;
      this.emitir({ evt: 'sua_vez' });
    });
  }

  /** Botão virtual pressionado (equivale à escada de botões no A0). */
  pressionar(id) {
    if (this.estado !== 'AGUARDANDO') return;
    this.emitir({ evt: 'botao', id });
    this.emitir({ evt: 'led', id, aceso: true });
    this.depois(180, () => this.emitir({ evt: 'led', id, aceso: false }));

    if (id !== this.sequencia[this.indice]) {
      this.pararGenius('erro');
      return;
    }
    this.indice += 1;
    if (this.indice === this.sequencia.length) {
      this.estado = 'ACERTO';
      this.emitir({ evt: 'acerto', n: this.sequencia.length });
      this.depois(600, () => this.novaRodada());
    }
  }

  pararGenius(motivo) {
    if (this.estado === 'OCIOSO' || this.estado === 'FIM') return;
    this.limparTimers();
    // pontos = rodadas completas
    const pontos = motivo === 'vitoria' ? this.sequencia.length : Math.max(0, this.sequencia.length - 1);
    this.estado = 'FIM';
    this.emitir({ evt: 'fim', pontos, motivo });
  }

  // ------------------------------------------------------------------ apoio
  depois(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  limparTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
