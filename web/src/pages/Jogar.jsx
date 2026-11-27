import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/componentes.jsx';
import { Genius } from './desafios/Genius.jsx';
import { QualResistor } from './desafios/QualResistor.jsx';
import { Montagem } from './desafios/Montagem.jsx';

const COMPONENTES = { GENIUS: Genius, RESISTOR: QualResistor, MONTAGEM: Montagem };
const ICONES = { GENIUS: '🔴🟡🟢🔵', RESISTOR: '🎨', MONTAGEM: '🔧' };

export function Jogar({ id, kit, ir }) {
  const [participantes, setParticipantes] = useState([]);
  const [desafios, setDesafios] = useState([]);
  const [jogador, setJogador] = useState(null);
  const [desafio, setDesafio] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [rodadaId, setRodadaId] = useState(0); // força remontar o desafio em "jogar de novo"
  const [erro, setErro] = useState(null);

  useEffect(() => {
    Promise.all([api.participantes(id), api.desafios()])
      .then(([p, d]) => { setParticipantes(p); setDesafios(d); })
      .catch((e) => setErro(e.message));
  }, [id]);

  async function terminar(res) {
    setResultado({ ...res, salvo: false });
    try {
      await api.registrarTentativa({ participanteId: jogador.id, desafioId: desafio.id, ...res });
      setResultado({ ...res, salvo: true });
    } catch (e) {
      setErro(`Resultado não foi salvo: ${e.message}`);
    }
  }

  function jogarDeNovo() {
    setResultado(null);
    setRodadaId((n) => n + 1);
  }

  function trocar() {
    setResultado(null);
    setDesafio(null);
  }

  const Desafio = desafio ? COMPONENTES[desafio.tipo] : null;
  const kitPronto = kit?.conectado;

  return (
    <main className="conteudo">
      <button className="voltar" onClick={() => ir(`/oficina/${id}`)}>← Oficina</button>

      {!kitPronto && (
        <Aviso tipo="alerta">
          Nenhum kit conectado. <button className="link" onClick={() => ir('/kit')}>Conectar o kit</button> para jogar.
        </Aviso>
      )}

      {!desafio && (
        <>
          <header className="titulo-pagina"><h1>Quem vai jogar?</h1></header>
          <div className="chips">
            {participantes.map((p) => (
              <button key={p.id} className={`chip${jogador?.id === p.id ? ' ativo' : ''}`} onClick={() => setJogador(p)}>
                <span className="avatar" aria-hidden="true">{p.apelido.slice(0, 1).toUpperCase()}</span>{p.apelido}
              </button>
            ))}
          </div>

          <header className="titulo-pagina"><h2>Escolha o desafio</h2></header>
          <div className="grade-3">
            {desafios.map((d) => (
              <button key={d.id} className="cartao desafio-cartao" disabled={!jogador || !kitPronto}
                onClick={() => { setDesafio(d); setResultado(null); }}>
                <span className="icone-grande" aria-hidden="true">{ICONES[d.tipo]}</span>
                <strong>{d.nome}</strong>
                <span className="sub">{d.descricao}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {desafio && Desafio && (
        <section className="cartao palco">
          <header className="palco-topo">
            <div>
              <span className="sub">{jogador.apelido} está jogando</span>
              <h1>{desafio.nome}</h1>
            </div>
            <button className="botao" onClick={trocar}>Trocar desafio</button>
          </header>

          <Desafio key={`${desafio.id}-${rodadaId}`} kit={kit} aoTerminar={terminar} />

          {resultado && (
            <div className={`resultado ${resultado.acertou ? 'ok' : 'quase'}`}>
              <span className="emoji" aria-hidden="true">{resultado.acertou ? '🎉' : '💪'}</span>
              <div>
                <strong>{resultado.acertou ? 'Mandou bem!' : 'Quase! Tente de novo.'}</strong>
                <span>{resultado.pontos} ponto{resultado.pontos === 1 ? '' : 's'} {resultado.salvo ? '· salvo no ranking' : '· salvando…'}</span>
              </div>
              <button className="botao primario" onClick={jogarDeNovo}>Jogar de novo</button>
              <button className="botao" onClick={() => { trocar(); setJogador(null); }}>Próxima criança</button>
            </div>
          )}
        </section>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </main>
  );
}
