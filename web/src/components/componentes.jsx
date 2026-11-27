import React from 'react';
import { CORES, COR_TOLERANCIA, formatarOhms } from '../lib/algoritmos.js';

/** Desenho de um resistor com as faixas de cor. `faixas` = [d1, d2, mult] (índices de cor ou null). */
export function Resistor({ faixas = [null, null, null], largura = 280, titulo }) {
  const corDe = (i) => (i === null || i === undefined ? 'transparent' : CORES[i].hex);
  const xs = [92, 118, 144];
  return (
    <svg viewBox="0 0 280 80" width={largura} role="img" aria-label={titulo ?? 'Resistor'} className="resistor">
      <line x1="0" y1="40" x2="62" y2="40" stroke="#9aa3ad" strokeWidth="4" strokeLinecap="round" />
      <line x1="218" y1="40" x2="280" y2="40" stroke="#9aa3ad" strokeWidth="4" strokeLinecap="round" />
      <rect x="62" y="16" width="156" height="48" rx="22" fill="#e9d4a7" stroke="#c9b07a" strokeWidth="2" />
      {xs.map((x, i) => (
        <rect key={i} x={x} y="16" width="14" height="48" fill={corDe(faixas[i])}
          stroke={faixas[i] === null ? '#c9b07a' : 'none'} strokeDasharray={faixas[i] === null ? '3 3' : undefined} />
      ))}
      <rect x="184" y="16" width="12" height="48" fill={COR_TOLERANCIA.hex} />
    </svg>
  );
}

/** Seletor de cor para uma faixa do resistor. */
export function SeletorCor({ rotulo, valor, aoMudar, maxIndice = 9 }) {
  return (
    <div className="seletor-cor">
      <span className="rotulo">{rotulo}</span>
      <div className="paleta">
        {CORES.slice(0, maxIndice + 1).map((c, i) => (
          <button key={c.nome} type="button" title={c.nome}
            className={`amostra${valor === i ? ' ativa' : ''}`} style={{ background: c.hex }}
            aria-label={`${rotulo}: ${c.nome}`} aria-pressed={valor === i} onClick={() => aoMudar(i)} />
        ))}
      </div>
      <span className="nome-cor">{valor === null ? 'escolha' : CORES[valor].nome}</span>
    </div>
  );
}

export const CORES_GENIUS = [
  { nome: 'Vermelho', classe: 'g-vermelho' },
  { nome: 'Amarelo', classe: 'g-amarelo' },
  { nome: 'Verde', classe: 'g-verde' },
  { nome: 'Azul', classe: 'g-azul' },
];

/** Os 4 LEDs/botões do Genius. Clicáveis só no kit simulado, na vez da criança. */
export function PlacaGenius({ acesos, clicavel, aoPressionar }) {
  return (
    <div className="placa-genius">
      {CORES_GENIUS.map((c, i) => (
        <button key={c.nome} type="button" className={`led ${c.classe}${acesos.has(i) ? ' aceso' : ''}`}
          disabled={!clicavel} onClick={() => aoPressionar(i)} aria-label={c.nome}>
          <span>{c.nome}</span>
        </button>
      ))}
    </div>
  );
}

export function Aviso({ tipo = 'info', children }) {
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</div>;
}

export function Valor({ ohms }) {
  return <strong className="valor">{formatarOhms(ohms)}</strong>;
}

export function formatarData(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
