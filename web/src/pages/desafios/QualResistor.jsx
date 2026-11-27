import React, { useEffect, useRef, useState } from 'react';
import { Resistor, SeletorCor, Aviso, Valor } from '../../components/componentes.jsx';
import { SERIE_E12, coresPorValor, valorPorCores, formatarOhms } from '../../lib/algoritmos.js';

const VALORES_SORTEIO = SERIE_E12.filter((v) => v >= 1000 && v <= 82_000);
const PONTOS_ACERTO = 10;

export function QualResistor({ kit, aoTerminar }) {
  const [nominal, setNominal] = useState(null);       // só no simulado: o resistor "sorteado da gaveta"
  const [faixas, setFaixas] = useState([null, null, null]);
  const [medida, setMedida] = useState(null);
  const [erro, setErro] = useState(null);
  const [medindo, setMedindo] = useState(false);
  const inicio = useRef(Date.now());

  useEffect(() => {
    if (kit.simulado) {
      const valor = VALORES_SORTEIO[Math.floor(Math.random() * VALORES_SORTEIO.length)];
      setNominal(valor);
      kit.encaixar(valor * (1 + (Math.random() * 2 - 1) * 0.01)); // tolerância real de 1%
    }
    return () => kit.simulado && kit.retirar();
  }, [kit]);

  const completo = faixas.every((f) => f !== null);
  const resposta = completo ? valorPorCores(faixas) : null;

  async function conferir() {
    setErro(null);
    setMedindo(true);
    try {
      const m = await kit.medir();
      if (m.aberto) throw new Error('Nenhum resistor no soquete. Encaixe o resistor e tente de novo.');
      if (m.curto) throw new Error('O soquete está em curto. Confira se os terminais estão encostando.');
      setMedida(m);
      const acertou = resposta === m.e12;
      aoTerminar({ pontos: acertou ? PONTOS_ACERTO : 0, acertou, duracaoMs: Date.now() - inicio.current, valorMedido: m.rx });
    } catch (e) {
      setErro(e.message);
    } finally {
      setMedindo(false);
    }
  }

  const mudarFaixa = (i) => (cor) => setFaixas((f) => f.map((v, j) => (j === i ? cor : v)));

  return (
    <div className="desafio resistor-desafio">
      {kit.simulado ? (
        <section className="bancada">
          <p className="mensagem">Este é o resistor que está no soquete do kit. Qual é o valor dele?</p>
          {nominal && <Resistor faixas={coresPorValor(nominal)} largura={340} titulo="Resistor no soquete" />}
        </section>
      ) : (
        <p className="mensagem">Pegue um resistor da gaveta, leia as cores e encaixe-o no soquete do kit.</p>
      )}

      <section className="resposta">
        <h3>Sua resposta</h3>
        <SeletorCor rotulo="1ª faixa" valor={faixas[0]} aoMudar={mudarFaixa(0)} />
        <SeletorCor rotulo="2ª faixa" valor={faixas[1]} aoMudar={mudarFaixa(1)} />
        <SeletorCor rotulo="Multiplicador" valor={faixas[2]} aoMudar={mudarFaixa(2)} maxIndice={5} />
        <div className="previa">
          <Resistor faixas={faixas} largura={220} titulo="Sua resposta" />
          <span>= {completo ? <Valor ohms={resposta} /> : '…'}</span>
        </div>
      </section>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!medida && (
        <button className="botao primario grande" disabled={!completo || medindo} onClick={conferir}>
          {medindo ? 'Medindo…' : 'Conferir com o kit'}
        </button>
      )}
      {medida && (
        <Aviso tipo={resposta === medida.e12 ? 'sucesso' : 'alerta'}>
          O kit mediu <strong>{formatarOhms(medida.rx)}</strong>; o valor comercial mais próximo é{' '}
          <strong>{formatarOhms(medida.e12)}</strong>. Você respondeu {formatarOhms(resposta)}.
        </Aviso>
      )}

      <details className="explicacao">
        <summary>Como o kit mede</summary>
        <p>
          O resistor fica em série com um resistor de referência de 10 kΩ, formando um divisor de tensão.
          O Arduino lê a tensão no meio (n de 0 a 1023), calcula R<sub>x</sub> = 10 kΩ × n / (1023 − n) com a
          média de 16 leituras e procura o valor comercial E12 mais próximo por busca binária.
        </p>
      </details>
    </div>
  );
}
