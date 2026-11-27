import React, { useState } from 'react';
import { KitSerial } from '../kit/KitSerial.js';
import { KitSimulado } from '../kit/KitSimulado.js';
import { Aviso } from '../components/componentes.jsx';
import { R_REF, formatarOhms } from '../lib/algoritmos.js';

export function ConectarKit({ kit, definirKit, voltar }) {
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [calibracao, setCalibracao] = useState(null);

  async function usar(novoKit) {
    setErro(null);
    setOcupado(true);
    try {
      if (kit) await kit.desconectar();
      await novoKit.conectar();
      definirKit(novoKit);
    } catch (e) {
      setErro(e.name === 'NotFoundError' ? 'Nenhuma porta escolhida.' : e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function calibrar() {
    setErro(null);
    setCalibracao(null);
    try {
      if (kit.simulado) kit.encaixar(R_REF * (1 + (Math.random() * 2 - 1) * 0.001)); // resistor de precisão 0,1%
      const resp = await kit.pedir({ cmd: 'calibrar', r: R_REF }, ['calibrado', 'erro']);
      if (resp.evt === 'erro') throw new Error(resp.msg);
      setCalibracao(resp.rref);
      if (kit.simulado) kit.retirar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const serialOk = KitSerial.suportado();

  return (
    <main className="conteudo">
      <button className="voltar" onClick={voltar}>← Voltar</button>
      <header className="titulo-pagina">
        <h1>Conectar o kit</h1>
        <p>Ligue o kit na USB do computador ou use o kit simulado para demonstrar sem o hardware.</p>
      </header>

      <div className="grade-2">
        <section className={`cartao escolha-kit${kit && !kit.simulado ? ' selecionado' : ''}`}>
          <h2>🔌 Kit pela USB</h2>
          <p>Arduino Uno com o firmware do Circuito Lúdico. Funciona no Chrome ou no Edge para computador.</p>
          <button className="botao primario" disabled={!serialOk || ocupado} onClick={() => usar(new KitSerial())}>
            {kit && !kit.simulado ? 'Reconectar' : 'Conectar kit USB'}
          </button>
          {!serialOk && <Aviso tipo="alerta">Este navegador não tem Web Serial. Abra no Chrome ou no Edge.</Aviso>}
        </section>

        <section className={`cartao escolha-kit${kit?.simulado ? ' selecionado' : ''}`}>
          <h2>🖥️ Kit simulado</h2>
          <p>Mesma lógica do firmware rodando no navegador: LEDs e botões na tela e um soquete virtual de resistores.</p>
          <button className="botao" disabled={ocupado} onClick={() => usar(new KitSimulado())}>
            {kit?.simulado ? 'Reiniciar simulador' : 'Usar kit simulado'}
          </button>
        </section>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {kit?.conectado && (
        <section className="cartao">
          <h2>Calibração do ohmímetro</h2>
          <p>
            Encaixe o resistor de calibração de {formatarOhms(R_REF)} no soquete e toque em calibrar.
            O kit recalcula o resistor de referência: R<sub>ref</sub> = R<sub>conhecido</sub> × (1023 − n) / n.
          </p>
          <button className="botao" onClick={calibrar}>Calibrar</button>
          {calibracao && <Aviso tipo="sucesso">Calibrado: R<sub>ref</sub> = {formatarOhms(calibracao)}</Aviso>}
        </section>
      )}
    </main>
  );
}
