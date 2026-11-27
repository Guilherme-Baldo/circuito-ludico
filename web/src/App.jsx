import React, { useEffect, useState } from 'react';
import { lerSessao, salvarSessao } from './api.js';
import { Login } from './pages/Login.jsx';
import { Painel } from './pages/Painel.jsx';
import { Oficina } from './pages/Oficina.jsx';
import { ConectarKit } from './pages/ConectarKit.jsx';
import { Jogar } from './pages/Jogar.jsx';
import { Ranking } from './pages/Ranking.jsx';
import { Relatorio } from './pages/Relatorio.jsx';

/** Rotas por hash (#/oficina/3/jogar): funciona servindo só arquivos estáticos. */
function useRota() {
  const ler = () => window.location.hash.replace(/^#/, '') || '/';
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const aoMudar = () => setRota(ler());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  const ir = (caminho) => { window.location.hash = caminho; };
  return [rota, ir];
}

export function App() {
  const [sessao, setSessao] = useState(lerSessao);
  const [rota, ir] = useRota();
  const [kit, setKit] = useState(null);
  const [, forcar] = useState(0);
  const [voltarPara, setVoltarPara] = useState('/');

  useEffect(() => {
    const expirou = () => sair();
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, []);

  // Re-renderiza quando o kit conecta/desconecta
  useEffect(() => kit?.aoReceber((e) => {
    if (e.evt === 'desconectado' || e.evt === 'pronto') forcar((n) => n + 1);
  }), [kit]);

  function entrar(dados) {
    salvarSessao(dados);
    setSessao(dados);
    ir('/');
  }

  function sair() {
    salvarSessao(null);
    setSessao(null);
  }

  if (!sessao) return <Login aoEntrar={entrar} />;

  const partes = rota.split('/').filter(Boolean); // ex.: ['oficina', '3', 'jogar']
  const irKit = () => { setVoltarPara(rota); ir('/kit'); };

  let pagina;
  if (partes[0] === 'kit') {
    pagina = <ConectarKit kit={kit} definirKit={setKit} voltar={() => ir(voltarPara)} />;
  } else if (partes[0] === 'oficina' && partes[1]) {
    const id = Number(partes[1]);
    const irComKit = (c) => (c === '/kit' ? irKit() : ir(c));
    if (partes[2] === 'jogar') pagina = <Jogar id={id} kit={kit} ir={irComKit} />;
    else if (partes[2] === 'ranking') pagina = <Ranking id={id} ir={ir} />;
    else if (partes[2] === 'relatorio') pagina = <Relatorio id={id} ir={ir} />;
    else pagina = <Oficina id={id} ir={ir} />;
  } else {
    pagina = <Painel ir={ir} />;
  }

  return (
    <div className="app">
      <header className="topo">
        <button className="marca" onClick={() => ir('/')}>
          <span className="logo" aria-hidden="true">⚡</span>
          <span>Circuito Lúdico</span>
        </button>
        <div className="topo-direita">
          <button className={`status-kit ${kit?.conectado ? 'on' : 'off'}`} onClick={irKit}>
            <span className="ponto" aria-hidden="true" />
            {kit?.conectado ? kit.nome : 'Kit desconectado'}
          </button>
          <span className="monitor">{sessao.monitor.nome}</span>
          <button className="botao discreto" onClick={sair}>Sair</button>
        </div>
      </header>
      {pagina}
    </div>
  );
}
