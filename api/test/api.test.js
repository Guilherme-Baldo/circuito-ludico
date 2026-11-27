import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../src/app.js';
import { MONITOR_DEMO } from '../src/db/seed.js';
import { mergeSort } from '../src/lib/ordenacao.js';

let base;
let app;
let token;

async function api(metodo, caminho, corpo, comToken = true) {
  const resp = await fetch(base + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(comToken && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const tipo = resp.headers.get('content-type') ?? '';
  const dados = resp.status === 204 ? null : tipo.includes('json') ? await resp.json() : await resp.text();
  return { status: resp.status, dados, headers: resp.headers };
}

before(async () => {
  app = criarApp({ segredo: 'segredo-de-teste' });
  await new Promise((ok) => app.servidor.listen(0, ok));
  base = `http://127.0.0.1:${app.servidor.address().port}`;
});

after(() => {
  app.servidor.close();
  app.db.fechar();
});

test('mergeSort ordena de forma estável', () => {
  const entrada = [{ v: 3, id: 'a' }, { v: 1, id: 'b' }, { v: 3, id: 'c' }, { v: 2, id: 'd' }];
  const saida = mergeSort(entrada, (x, y) => x.v - y.v);
  assert.deepEqual(saida.map((x) => x.id), ['b', 'd', 'a', 'c']);
  assert.deepEqual(entrada.map((x) => x.id), ['a', 'b', 'c', 'd'], 'não altera o vetor original');
});

test('rotas exigem login', async () => {
  const r = await api('GET', '/api/oficinas', null, false);
  assert.equal(r.status, 401);
});

test('login recusa senha errada e aceita a de demonstração', async () => {
  const errado = await api('POST', '/api/auth/login', { email: MONITOR_DEMO.email, senha: 'xxx' }, false);
  assert.equal(errado.status, 401);
  const certo = await api('POST', '/api/auth/login', { email: MONITOR_DEMO.email, senha: MONITOR_DEMO.senha }, false);
  assert.equal(certo.status, 200);
  assert.ok(certo.dados.token);
  token = certo.dados.token;
});

test('fluxo completo: oficina, participantes, tentativas, ranking e relatório', async () => {
  const oficina = await api('POST', '/api/oficinas', { data: '2026-11-28', local: 'Lab. de Informática – UTFPR-CP', turma: 'Turma A' });
  assert.equal(oficina.status, 201);
  const id = oficina.dados.id;

  const invalida = await api('POST', '/api/oficinas', { data: '28/11/2026', local: 'X', turma: 'A' });
  assert.equal(invalida.status, 400);

  const ana = (await api('POST', `/api/oficinas/${id}/participantes`, { apelido: 'Ana Raio', faixaEtaria: '10-12' })).dados;
  const beto = (await api('POST', `/api/oficinas/${id}/participantes`, { apelido: 'Beto', faixaEtaria: '13-14' })).dados;
  const caio = (await api('POST', `/api/oficinas/${id}/participantes`, { apelido: 'Caio', faixaEtaria: '15-16' })).dados;

  const repetido = await api('POST', `/api/oficinas/${id}/participantes`, { apelido: 'beto', faixaEtaria: '13-14' });
  assert.equal(repetido.status, 409);
  const email = await api('POST', `/api/oficinas/${id}/participantes`, { apelido: 'ana@gmail.com', faixaEtaria: '10-12' });
  assert.equal(email.status, 400, 'bloqueia dados pessoais no apelido');

  const desafios = (await api('GET', '/api/desafios')).dados;
  const genius = desafios.find((d) => d.tipo === 'GENIUS');
  const resistor = desafios.find((d) => d.tipo === 'RESISTOR');

  const registrar = (p, d, pontos, acertou, extra = {}) =>
    api('POST', '/api/tentativas', { participanteId: p.id, desafioId: d.id, pontos, acertou, duracaoMs: 30000, ...extra });

  assert.equal((await registrar(ana, genius, 7, true)).status, 201);
  await registrar(beto, genius, 7, true);
  await registrar(beto, resistor, 10, true, { valorMedido: 4683 });
  await registrar(caio, resistor, 0, false, { valorMedido: 2190 });
  await registrar(ana, resistor, 10, true, { valorMedido: 1003 });

  const ranking = (await api('GET', `/api/oficinas/${id}/ranking`)).dados;
  assert.deepEqual(ranking.map((r) => r.apelido), ['Ana Raio', 'Beto', 'Caio']);
  assert.deepEqual(ranking.map((r) => r.posicao), [1, 1, 3], 'Ana e Beto empatam em pontos e acertos');
  assert.equal(ranking[0].melhorGenius, 7);

  const rel = (await api('GET', `/api/oficinas/${id}/relatorio`)).dados;
  assert.equal(rel.totalTentativas, 5);
  assert.equal(rel.participantesAtivos, 3);
  const linhaResistor = rel.porDesafio.find((d) => d.tipo === 'RESISTOR');
  assert.equal(linhaResistor.tentativas, 3);
  assert.ok(Math.abs(linhaResistor.taxaAcerto - 2 / 3) < 1e-9);

  const csv = await api('GET', `/api/oficinas/${id}/relatorio?formato=csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.equal(csv.dados.trim().split('\r\n').length, 6, 'cabeçalho + 5 tentativas');
});

test('tentativa com pontos inválidos é recusada', async () => {
  const oficina = (await api('POST', '/api/oficinas', { data: '2026-11-29', local: 'Lab', turma: 'B' })).dados;
  const p = (await api('POST', `/api/oficinas/${oficina.id}/participantes`, { apelido: 'Duda', faixaEtaria: '10-12' })).dados;
  const r = await api('POST', '/api/tentativas', { participanteId: p.id, desafioId: 1, pontos: -5, acertou: false, duracaoMs: 1000 });
  assert.equal(r.status, 400);
});
