import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso, formatarData } from '../components/componentes.jsx';

const FAIXAS = [
  { valor: '10-12', rotulo: '10 a 12 anos' },
  { valor: '13-14', rotulo: '13 a 14 anos' },
  { valor: '15-16', rotulo: '15 a 16 anos' },
];

export function Oficina({ id, ir }) {
  const [oficina, setOficina] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [apelido, setApelido] = useState('');
  const [faixa, setFaixa] = useState('10-12');
  const [erro, setErro] = useState(null);

  const carregar = async () => {
    try {
      const [o, p] = await Promise.all([api.oficina(id), api.participantes(id)]);
      setOficina(o);
      setParticipantes(p);
    } catch (e) {
      setErro(e.message);
    }
  };
  useEffect(() => { carregar(); }, [id]);

  async function adicionar(e) {
    e.preventDefault();
    setErro(null);
    try {
      await api.adicionarParticipante(id, { apelido, faixaEtaria: faixa });
      setApelido('');
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function remover(p) {
    if (!window.confirm(`Remover ${p.apelido} e todas as tentativas dele(a)?`)) return;
    await api.removerParticipante(p.id);
    carregar();
  }

  if (!oficina) return <main className="conteudo">{erro ? <Aviso tipo="erro">{erro}</Aviso> : <p>Carregando…</p>}</main>;

  return (
    <main className="conteudo">
      <button className="voltar" onClick={() => ir('/')}>← Oficinas</button>
      <header className="titulo-pagina com-acoes">
        <div>
          <h1>{oficina.turma}</h1>
          <p>{formatarData(oficina.data)} · {oficina.local}</p>
        </div>
        <div className="acoes">
          <button className="botao primario" disabled={!participantes.length} onClick={() => ir(`/oficina/${id}/jogar`)}>▶ Começar desafios</button>
          <button className="botao" onClick={() => ir(`/oficina/${id}/ranking`)}>🏆 Ranking</button>
          <button className="botao" onClick={() => ir(`/oficina/${id}/relatorio`)}>📊 Relatório</button>
        </div>
      </header>

      <div className="grade-2">
        <section className="cartao">
          <h2>Participantes ({participantes.length})</h2>
          {participantes.length === 0 && <p className="sub">Cadastre as crianças pelo apelido para começar.</p>}
          <ul className="lista-participantes">
            {participantes.map((p) => (
              <li key={p.id}>
                <span className="avatar" aria-hidden="true">{p.apelido.slice(0, 1).toUpperCase()}</span>
                <span className="nome">{p.apelido}</span>
                <span className="sub">{FAIXAS.find((f) => f.valor === p.faixaEtaria)?.rotulo}</span>
                <button className="icone" title="Remover" aria-label={`Remover ${p.apelido}`} onClick={() => remover(p)}>✕</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao">
          <h2>Adicionar participante</h2>
          <form onSubmit={adicionar} className="formulario">
            <label>
              Apelido
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={20} placeholder="Ex.: Raio Azul" required />
            </label>
            <label>
              Faixa etária
              <select value={faixa} onChange={(e) => setFaixa(e.target.value)}>
                {FAIXAS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </select>
            </label>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <button className="botao primario">Adicionar</button>
          </form>
          <Aviso>Use só apelidos. Não guardamos nome completo, idade exata nem contato das crianças (LGPD).</Aviso>
        </section>
      </div>
    </main>
  );
}
