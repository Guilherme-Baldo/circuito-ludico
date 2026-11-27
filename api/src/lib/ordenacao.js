/**
 * Merge sort estável, usado para ordenar o ranking.
 *
 * Complexidade O(n log n) em qualquer caso. A estabilidade garante que
 * participantes empatados em todos os critérios mantenham a ordem de entrada.
 *
 * @template T
 * @param {T[]} vetor
 * @param {(a: T, b: T) => number} comparar  negativo se a vem antes de b
 * @returns {T[]} novo vetor ordenado (o original não é alterado)
 */
export function mergeSort(vetor, comparar) {
  if (vetor.length <= 1) return vetor.slice();
  const meio = Math.floor(vetor.length / 2);
  const esquerda = mergeSort(vetor.slice(0, meio), comparar);
  const direita = mergeSort(vetor.slice(meio), comparar);
  return intercalar(esquerda, direita, comparar);
}

function intercalar(a, b, comparar) {
  const saida = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    // "<=" mantém a estabilidade: em empate, o elemento da esquerda vem primeiro
    if (comparar(a[i], b[j]) <= 0) saida.push(a[i++]);
    else saida.push(b[j++]);
  }
  while (i < a.length) saida.push(a[i++]);
  while (j < b.length) saida.push(b[j++]);
  return saida;
}
