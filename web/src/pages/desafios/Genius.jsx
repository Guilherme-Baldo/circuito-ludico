import React, { useEffect, useRef, useState } from 'react';
import { PlacaGenius } from '../../components/componentes.jsx';

export const META_GENIUS = 5; // completar 5 rodadas conta como acerto no relatório

export function Genius({ kit, aoTerminar }) {
  const [fase, setFase] = useState('inicio');
  const [rodada, setRodada] = useState(0);
  const [acesos, setAcesos] = useState(new Set());
  const inicio = useRef(0);

  useEffect(() => {
    const cancelar = kit.aoReceber((e) => {
      switch (e.evt) {
        case 'rodada':
          setRodada(e.n);
          setFase('mostrando');
          break;
        case 'led':
          setAcesos((atual) => {
            const novo = new Set(atual);
            if (e.aceso) novo.add(e.id);
            else novo.delete(e.id);
            return novo;
          });
          break;
        case 'sua_vez':
          setFase('sua_vez');
          break;
        case 'acerto':
          setFase('acerto');
          break;
        case 'fim':
          setFase('fim');
          setAcesos(new Set());
          if (e.motivo !== 'parado') {
            aoTerminar({ pontos: e.pontos, acertou: e.pontos >= META_GENIUS, duracaoMs: Date.now() - inicio.current });
          }
          break;
        default:
      }
    });
    return () => {
      cancelar();
      kit.enviar({ cmd: 'parar' }).catch(() => {});
    };
  }, [kit]);

  function comecar() {
    inicio.current = Date.now();
    setRodada(0);
    kit.enviar({ cmd: 'genius' });
  }

  const mensagens = {
    inicio: 'Preste atenção nas luzes e repita a sequência nos botões.',
    mostrando: 'Observe a sequência…',
    sua_vez: kit.simulado ? 'Sua vez! Toque nas cores na mesma ordem.' : 'Sua vez! Aperte os botões do kit na mesma ordem.',
    acerto: 'Muito bem! Vem aí uma cor a mais…',
    fim: 'Fim de jogo!',
  };

  return (
    <div className="desafio genius">
      <div className="placar">
        <div><span className="rotulo">Rodada</span><strong>{rodada || '–'}</strong></div>
        <div><span className="rotulo">Meta</span><strong>{META_GENIUS}</strong></div>
      </div>
      <p className={`mensagem fase-${fase}`}>{mensagens[fase]}</p>
      <PlacaGenius acesos={acesos} clicavel={kit.simulado && fase === 'sua_vez'} aoPressionar={(id) => kit.pressionar(id)} />
      {fase === 'inicio' && <button className="botao primario grande" onClick={comecar}>Começar</button>}
      <details className="explicacao">
        <summary>Como funciona por dentro</summary>
        <p>
          O kit sorteia uma cor de 0 a 3 a cada rodada e guarda a sequência em um vetor. Uma máquina de estados
          (MOSTRANDO → AGUARDANDO → ACERTO/ERRO) compara cada botão com a posição certa do vetor. Os 4 botões
          ficam em um único pino analógico, cada um com um resistor diferente formando um divisor de tensão.
        </p>
      </details>
    </div>
  );
}
