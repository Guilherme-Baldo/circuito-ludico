import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso, formatarData } from '../components/componentes.jsx';

export function Painel({ ir }) {
  const [oficinas, setOficinas] = useState(null);
  const [erro, setErro] = useState(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ data: hoje, local: 'Laboratório de Informática – UTFPR-CP', turma: '' });

  const carregar = () => api.oficinas().then(setOficinas).catch((e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  async function criar(e) {
    e.preventDefault();
    setErro(null);
    try {
      const nova = await api.criarOficina(form);
      ir(`/oficina/${nova.id}`);
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <main className="conteudo">
      <header className="titulo-pagina">
        <h1>Oficinas</h1>
        <p>Escolha uma oficina para cadastrar as crianças e começar os desafios.</p>
      </header>

      <div className="grade-2">
        <section>
          {oficinas === null && !erro && <p>Carregando…</p>}
          {oficinas?.length === 0 && <Aviso>Nenhuma oficina ainda. Crie a primeira ao lado.</Aviso>}
          <ul className="lista-cartoes">
            {oficinas?.map((o) => (
              <li key={o.id}>
                <button className="cartao oficina" onClick={() => ir(`/oficina/${o.id}`)}>
                  <span className="data">{formatarData(o.data)}</span>
                  <strong>{o.turma}</strong>
                  <span className="sub">{o.local}</span>
                  <span className="contador">{o.totalParticipantes} participante{o.totalParticipantes === 1 ? '' : 's'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao">
          <h2>Nova oficina</h2>
          <form onSubmit={criar} className="formulario">
            <label>
              Data
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </label>
            <label>
              Local
              <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} required />
            </label>
            <label>
              Turma
              <input value={form.turma} placeholder="Ex.: Turma da manhã" onChange={(e) => setForm({ ...form, turma: e.target.value })} required />
            </label>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <button className="botao primario">Criar oficina</button>
          </form>
        </section>
      </div>
    </main>
  );
}
