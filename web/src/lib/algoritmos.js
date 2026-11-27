/**
 * Algoritmos e cálculos de circuito usados pela plataforma e pelo kit simulado.
 * O firmware do Arduino implementa as mesmas contas em C++ (firmware/circuito_ludico).
 */

// ---------------------------------------------------------------------------
// Constantes do hardware (ver hardware/memoria-de-calculo.md)
// ---------------------------------------------------------------------------
export const VCC = 5.0;
export const ADC_MAX = 1023;          // conversor de 10 bits do ATmega328P
export const R_REF = 10_000;          // resistor de referência do ohmímetro (1%)
export const R_PULLUP = 10_000;       // pull-up da escada de botões
export const R_BOTOES = [0, 2200, 4700, 10_000]; // resistor de cada botão até o GND
export const TOLERANCIA_MONTAGEM = 0.05;          // ±5% no desafio Monte o circuito

// ---------------------------------------------------------------------------
// Divisor de tensão e ADC
// ---------------------------------------------------------------------------

/** Leitura ideal do ADC no nó de um divisor: Rcima ligado ao 5 V, Rbaixo ao GND. */
export function leituraDivisor(rCima, rBaixo) {
  return Math.round((ADC_MAX * rBaixo) / (rCima + rBaixo));
}

/** Ohmímetro: Rx (embaixo) a partir da leitura n, com Rref em cima. Rx = Rref · n / (1023 − n). */
export function resistenciaPorLeitura(n, rRef = R_REF) {
  if (n <= 0) return 0;
  if (n >= ADC_MAX) return Infinity;
  return (rRef * n) / (ADC_MAX - n);
}

/** Erro relativo causado por 1 contagem do ADC: 1023 / [n · (1023 − n)]. */
export function erroPorContagem(n) {
  return ADC_MAX / (n * (ADC_MAX - n));
}

// ---------------------------------------------------------------------------
// Escada de botões em um único pino analógico
// ---------------------------------------------------------------------------

/** Leituras esperadas para cada botão (e 1023 para "nenhum"). */
export const LEITURAS_BOTOES = R_BOTOES.map((r) => leituraDivisor(R_PULLUP, r)); // [0, 184, 327, 512]

/** Limiares = pontos médios entre leituras vizinhas (inclui o "solto" = 1023). */
export const LIMIARES_BOTOES = [...LEITURAS_BOTOES, ADC_MAX]
  .slice(1)
  .map((v, i) => Math.round((v + LEITURAS_BOTOES[i]) / 2)); // [92, 256, 420, 768]

/** Classifica uma leitura do A0: devolve 0–3 (botão) ou -1 (nenhum). */
export function classificarBotao(leitura) {
  for (let i = 0; i < LIMIARES_BOTOES.length; i++) {
    if (leitura < LIMIARES_BOTOES[i]) return i;
  }
  return -1;
}

/** Média móvel simples das últimas `janela` amostras. */
export function mediaMovel(amostras, janela = 8) {
  const ultimas = amostras.slice(-janela);
  return ultimas.reduce((s, v) => s + v, 0) / ultimas.length;
}

// ---------------------------------------------------------------------------
// Série E12 e busca binária
// ---------------------------------------------------------------------------

const BASE_E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

/** Todos os valores E12 de 10 Ω a 1 MΩ, em ordem crescente. */
export const SERIE_E12 = (() => {
  const valores = [];
  for (let decada = 1; decada <= 100_000; decada *= 10) {
    for (const b of BASE_E12) valores.push(b * decada);
  }
  valores.push(1_000_000);
  return valores;
})();

/**
 * Valor comercial E12 mais próximo de `r`, por busca binária.
 * A comparação é feita em escala logarítmica (razão), que é como a série foi construída.
 */
export function e12MaisProximo(r) {
  if (!(r > 0) || !Number.isFinite(r)) return null;
  const v = SERIE_E12;
  if (r <= v[0]) return v[0];
  if (r >= v[v.length - 1]) return v[v.length - 1];
  let lo = 0;
  let hi = v.length - 1;
  while (hi - lo > 1) {            // invariante: v[lo] <= r < v[hi]
    const meio = (lo + hi) >> 1;
    if (v[meio] <= r) lo = meio;
    else hi = meio;
  }
  return r / v[lo] <= v[hi] / r ? v[lo] : v[hi];
}

// ---------------------------------------------------------------------------
// Código de cores (4 faixas: 2 dígitos, multiplicador, tolerância)
// ---------------------------------------------------------------------------

export const CORES = [
  { nome: 'preto', hex: '#1d1d1f' },
  { nome: 'marrom', hex: '#7a4a24' },
  { nome: 'vermelho', hex: '#d32f2f' },
  { nome: 'laranja', hex: '#f57c00' },
  { nome: 'amarelo', hex: '#fbc02d' },
  { nome: 'verde', hex: '#388e3c' },
  { nome: 'azul', hex: '#1976d2' },
  { nome: 'violeta', hex: '#7b1fa2' },
  { nome: 'cinza', hex: '#8a8a8a' },
  { nome: 'branco', hex: '#f5f5f5' },
];
export const COR_TOLERANCIA = { nome: 'dourado', hex: '#c9a227' };

/** [d1, d2, mult] (índices de cor) -> ohms. */
export function valorPorCores([d1, d2, mult]) {
  return (d1 * 10 + d2) * 10 ** mult;
}

/** ohms (2 algarismos significativos) -> [d1, d2, mult]. */
export function coresPorValor(ohms) {
  let mult = 0;
  let base = ohms;
  while (base >= 100) {
    base /= 10;
    mult += 1;
  }
  base = Math.round(base);
  return [Math.floor(base / 10), base % 10, mult];
}

// ---------------------------------------------------------------------------
// Associação de resistores
// ---------------------------------------------------------------------------

export const serie = (...rs) => rs.reduce((s, r) => s + r, 0);
export const paralelo = (...rs) => 1 / rs.reduce((s, r) => s + 1 / r, 0);

/** Peças de resistor que vêm em cada kit (valores repetidos = 2 unidades). */
export const PECAS_KIT = [1000, 1000, 2200, 2200, 4700, 4700, 10_000, 10_000, 22_000, 47_000];

/**
 * Enumera todas as montagens possíveis com as peças do kit, por nível:
 *  1 = duas em série, 2 = duas em paralelo, 3 = misto R1 + (R2 ∥ R3).
 * Usa índices distintos para nunca usar a mesma peça duas vezes.
 * Mantém só alvos dentro da faixa do ohmímetro (1 kΩ a 100 kΩ) e remove duplicatas.
 */
export function enumerarMontagens(nivel, pecas = PECAS_KIT) {
  const resultado = new Map();
  const n = pecas.length;
  const adicionar = (req, usadas, formula) => {
    if (req < 1000 || req > 100_000) return;
    const chave = Math.round(req);
    if (!resultado.has(chave)) resultado.set(chave, { req, pecas: usadas, formula });
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [pecas[i], pecas[j]];
      if (nivel === 1) adicionar(serie(a, b), [a, b], `${formatarOhms(a)} + ${formatarOhms(b)}`);
      if (nivel === 2) adicionar(paralelo(a, b), [a, b], `${formatarOhms(a)} ∥ ${formatarOhms(b)}`);
      if (nivel === 3) {
        for (let k = 0; k < n; k++) {
          if (k === i || k === j) continue;
          const c = pecas[k];
          adicionar(serie(c, paralelo(a, b)), [c, a, b], `${formatarOhms(c)} + (${formatarOhms(a)} ∥ ${formatarOhms(b)})`);
        }
      }
    }
  }
  return [...resultado.values()].sort((x, y) => x.req - y.req);
}

/** Confere se a medida está dentro da tolerância do alvo. */
export function dentroDaTolerancia(medido, alvo, tol = TOLERANCIA_MONTAGEM) {
  return Math.abs(medido - alvo) / alvo <= tol;
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export function formatarOhms(r) {
  if (r === null || r === undefined || Number.isNaN(r)) return '—';
  if (!Number.isFinite(r)) return '∞';
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (r >= 1_000_000) return `${fmt(r / 1_000_000)} MΩ`;
  if (r >= 1000) return `${fmt(r / 1000)} kΩ`;
  return `${fmt(r)} Ω`;
}

/** Tempo de cada LED no Genius: começa em 600 ms e cai 30 ms por rodada, mínimo 200 ms. */
export function tempoLedGenius(rodada) {
  return Math.max(200, 600 - 30 * (rodada - 1));
}
