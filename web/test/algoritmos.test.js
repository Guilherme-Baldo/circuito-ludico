import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEITURAS_BOTOES, LIMIARES_BOTOES, classificarBotao, leituraDivisor, resistenciaPorLeitura,
  e12MaisProximo, SERIE_E12, valorPorCores, coresPorValor, paralelo, serie, enumerarMontagens,
  dentroDaTolerancia, erroPorContagem, formatarOhms,
} from '../src/lib/algoritmos.js';

test('escada de botões: leituras e limiares batem com a memória de cálculo', () => {
  assert.deepEqual(LEITURAS_BOTOES, [0, 184, 327, 512]);
  assert.deepEqual(LIMIARES_BOTOES, [92, 256, 420, 768]);
  assert.equal(classificarBotao(3), 0);
  assert.equal(classificarBotao(190), 1);
  assert.equal(classificarBotao(330), 2);
  assert.equal(classificarBotao(500), 3);
  assert.equal(classificarBotao(1020), -1);
});

test('ohmímetro: ida e volta pelo divisor recupera o resistor', () => {
  for (const r of [1000, 4700, 10_000, 47_000, 100_000]) {
    const n = leituraDivisor(10_000, r);
    const rx = resistenciaPorLeitura(n);
    assert.ok(Math.abs(rx - r) / r < 0.015, `${r} Ω medido como ${rx.toFixed(0)} Ω`);
  }
  assert.ok(Math.abs(erroPorContagem(512) - 0.0039) < 0.0001);
});

test('busca binária E12 encontra o valor comercial mais próximo', () => {
  assert.equal(SERIE_E12.length, 12 * 6 + 1);
  assert.equal(e12MaisProximo(4683), 4700);
  assert.equal(e12MaisProximo(2190), 2200);
  assert.equal(e12MaisProximo(9800), 10_000);
  assert.equal(e12MaisProximo(5000), 4700); // 5000/4700 = 1,064 < 5600/5000 = 1,12
  assert.equal(e12MaisProximo(1), 10);
  assert.equal(e12MaisProximo(Infinity), null);
});

test('código de cores nos dois sentidos', () => {
  assert.equal(valorPorCores([4, 7, 2]), 4700);  // amarelo, violeta, vermelho
  assert.deepEqual(coresPorValor(4700), [4, 7, 2]);
  assert.deepEqual(coresPorValor(10_000), [1, 0, 3]);
  assert.deepEqual(coresPorValor(220), [2, 2, 1]);
  for (const v of SERIE_E12.slice(0, -1)) assert.equal(valorPorCores(coresPorValor(v)), v);
});

test('associação de resistores e geração de alvos', () => {
  assert.equal(serie(1000, 4700), 5700);
  assert.equal(paralelo(10_000, 10_000), 5000);
  const n1 = enumerarMontagens(1);
  const n2 = enumerarMontagens(2);
  const n3 = enumerarMontagens(3);
  assert.ok(n1.some((m) => m.req === 20_000));
  assert.ok(n2.some((m) => m.req === 5000));
  assert.ok(n3.length > n2.length);
  for (const m of [...n1, ...n2, ...n3]) assert.ok(m.req >= 1000 && m.req <= 100_000);
  assert.ok(dentroDaTolerancia(5200, 5000));
  assert.ok(!dentroDaTolerancia(5300, 5000));
});

test('formatação em português', () => {
  assert.equal(formatarOhms(4700), '4,7 kΩ');
  assert.equal(formatarOhms(220), '220 Ω');
  assert.equal(formatarOhms(1_000_000), '1 MΩ');
});
