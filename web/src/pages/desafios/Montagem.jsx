import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Aviso } from '../../components/componentes.jsx';
import {
  PECAS_KIT, enumerarMontagens, serie, paralelo, dentroDaTolerancia, formatarOhms, TOLERANCIA_MONTAGEM,
} from '../../lib/algoritmos.js';

const NIVEIS = {
  1: { nome: 'Série', vagas: 2, esquema: 'R1 + R2', instrucao: 'dois resistores em série' },
  2: { nome: 'Paralelo', vagas: 2, esquema: 'R1 ∥ R2', instrucao: 'dois resistores em paralelo' },
  3: { nome: 'Misto', vagas: 3, esquema: 'R1 + (R2 ∥ R3)', instrucao: 'um resistor em série com dois em paralelo' },
};
const VALORES_UNICOS = [...new Set(PECAS_KIT)];

function sortear(nivel) {
  const opcoes = enumerarMontagens(nivel);
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

export function Montagem({ kit, aoTerminar }) {
  const [nivel, setNivel] = useState(1);
  const [alvo, setAlvo] = useState(() => sortear(1));
  const [pecas, setPecas] = useState([null, null, null]);
  const [dica, setDica] = useState(false);
  const [encaixado, setEncaixado] = useState(false);
  const [medida, setMedida] = useState(null);
  const [erro, setErro] = useState(null);
  const inicio = useRef(Date.now());
  const cfg = NIVEIS[nivel];

  useEffect(() => () => kit.simulado && kit.retirar(), [kit]);

  function trocarNivel(n) {
    setNivel(n);
    setAlvo(sortear(n));
    setPecas([null, null, null]);
    setEncaixado(false);
    setMedida(null);
    setDica(false);
    if (kit.simulado) kit.retirar();
    inicio.current = Date.now();
  }

  // Quantas unidades de cada valor ainda sobram na gaveta
  const sobra = useMemo(() => {
    const conta = new Map();
    for (const v of PECAS_KIT) conta.set(v, (conta.get(v) ?? 0) + 1);
    pecas.slice(0, cfg.vagas).forEach((v) => v && conta.set(v, conta.get(v) - 1));
    return conta;
  }, [pecas, cfg.vagas]);

  const escolhidas = pecas.slice(0, cfg.vagas);
  const prontas = escolhidas.every(Boolean);

  function encaixar() {
    // cada peça real tem até 1% de diferença do valor nominal
    const reais = escolhidas.map((v) => v * (1 + (Math.random() * 2 - 1) * 0.01));
    const req = nivel === 1 ? serie(reais[0], reais[1])
      : nivel === 2 ? paralelo(reais[0], reais[1])
      : serie(reais[0], paralelo(reais[1], reais[2]));
    kit.encaixar(req);
    setEncaixado(true);
  }

  async function conferir() {
    setErro(null);
    try {
      const m = await kit.medir();
      if (m.aberto) throw new Error('Nada no soquete. Encaixe a montagem e tente de novo.');
      if (m.curto) throw new Error('Curto-circuito no soquete! Confira as ligações.');
      setMedida(m);
      const acertou = dentroDaTolerancia(m.rx, alvo.req);
      aoTerminar({
        pontos: acertou ? 10 * nivel : 0, acertou, nivel, valorMedido: m.rx, duracaoMs: Date.now() - inicio.current,
      });
    } catch (e) {
      setErro(e.message);
    }
  }

  const acertou = medida && dentroDaTolerancia(medida.rx, alvo.req);

  return (
    <div className="desafio montagem">
      <div className="abas" role="tablist">
        {Object.entries(NIVEIS).map(([n, c]) => (
          <button key={n} role="tab" aria-selected={Number(n) === nivel} className={Number(n) === nivel ? 'ativa' : ''}
            disabled={Boolean(medida)} onClick={() => trocarNivel(Number(n))}>Nível {n} · {c.nome}</button>
        ))}
      </div>

      <section className="alvo">
        <span className="rotulo">Monte</span>
        <strong>{formatarOhms(alvo.req)}</strong>
        <span className="sub">usando {cfg.instrucao} ({cfg.esquema})</span>
        <button className="link" onClick={() => setDica(!dica)}>{dica ? 'Esconder dica' : 'Ver dica'}</button>
        {dica && <span className="dica">Uma solução: {alvo.formula}</span>}
      </section>

      {kit.simulado ? (
        <section className="bancada">
          <p className="mensagem">Escolha as peças da gaveta para cada posição:</p>
          <div className="vagas">
            {Array.from({ length: cfg.vagas }, (_, i) => (
              <label key={i}>
                R{i + 1}
                <select value={pecas[i] ?? ''} disabled={encaixado}
                  onChange={(e) => setPecas((p) => p.map((v, j) => (j === i ? Number(e.target.value) || null : v)))}>
                  <option value="">escolha</option>
                  {VALORES_UNICOS.map((v) => (
                    <option key={v} value={v} disabled={pecas[i] !== v && (sobra.get(v) ?? 0) <= 0}>
                      {formatarOhms(v)} ({(sobra.get(v) ?? 0) + (pecas[i] === v ? 1 : 0)} na gaveta)
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {prontas && (
            <p className="calculo">
              Pelo cálculo: {cfg.esquema.replace('R1', formatarOhms(escolhidas[0])).replace('R2', formatarOhms(escolhidas[1])).replace('R3', formatarOhms(escolhidas[2] ?? 0))}
              {' = '}
              <strong>{formatarOhms(nivel === 1 ? serie(...escolhidas) : nivel === 2 ? paralelo(...escolhidas) : serie(escolhidas[0], paralelo(escolhidas[1], escolhidas[2])))}</strong>
            </p>
          )}
          {!encaixado && <button className="botao" disabled={!prontas} onClick={encaixar}>Encaixar no soquete</button>}
        </section>
      ) : (
        <p className="mensagem">Monte a associação na protoboard, ligue as pontas ao soquete do ohmímetro e toque em conferir.</p>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!medida && (
        <button className="botao primario grande" disabled={kit.simulado && !encaixado} onClick={conferir}>Conferir com o kit</button>
      )}
      {medida && (
        <Aviso tipo={acertou ? 'sucesso' : 'alerta'}>
          O kit mediu <strong>{formatarOhms(medida.rx)}</strong>. Alvo: {formatarOhms(alvo.req)} (aceita ±{TOLERANCIA_MONTAGEM * 100}%).
        </Aviso>
      )}

      <details className="explicacao">
        <summary>A conta por trás</summary>
        <p>Série: R<sub>eq</sub> = R1 + R2. Paralelo: R<sub>eq</sub> = R1 × R2 / (R1 + R2). Os alvos são gerados testando todas as combinações das peças do kit.</p>
      </details>
    </div>
  );
}
