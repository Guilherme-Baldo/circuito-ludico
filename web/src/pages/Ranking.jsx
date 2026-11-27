import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/componentes.jsx';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function Ranking({ id, ir }) {
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.ranking(id).then(setLinhas).catch((e) => setErro(e.message));
    const t = setInterval(() => api.ranking(id).then(setLinhas).catch(() => {}), 5000); // atualiza durante a oficina
    return () => clearInterval(t);
  }, [id]);

  return (
    <main className="conteudo">
      <button className="voltar" onClick={() => ir(`/oficina/${id}`)}>← Oficina</button>
      <header className="titulo-pagina">
        <h1>🏆 Ranking da oficina</h1>
        <p>Ordem: mais pontos, depois mais acertos, depois menos tentativas. Atualiza sozinho a cada 5 segundos.</p>
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {linhas && (
        <div className="cartao tabela-rolavel">
          <table className="tabela ranking">
            <thead>
              <tr><th>#</th><th>Apelido</th><th>Pontos</th><th>Acertos</th><th>Tentativas</th><th>Melhor Genius</th></tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.participanteId} className={l.posicao <= 3 && l.pontos > 0 ? `podio p${l.posicao}` : ''}>
                  <td className="posicao">{l.pontos > 0 && MEDALHAS[l.posicao] ? MEDALHAS[l.posicao] : l.posicao}</td>
                  <td><strong>{l.apelido}</strong></td>
                  <td className="numero destaque">{l.pontos}</td>
                  <td className="numero">{l.acertos}</td>
                  <td className="numero">{l.tentativas}</td>
                  <td className="numero">{l.melhorGenius ? `${l.melhorGenius} rodadas` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
