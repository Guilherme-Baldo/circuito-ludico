import React, { useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/componentes.jsx';

export function Login({ aoEntrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      aoEntrar(await api.login(email, senha));
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="tela-login">
      <section className="cartao login">
        <div className="marca grande">
          <span className="logo" aria-hidden="true">⚡</span>
          <div>
            <h1>Circuito Lúdico</h1>
            <p>Lógica e circuitos para as oficinas do ELLP</p>
          </div>
        </div>
        <form onSubmit={entrar} className="formulario">
          <label>
            E-mail do monitor
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
          </label>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button className="botao primario largo" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <p className="dica">Demonstração: monitor@ellp.utfpr · ellp2026</p>
      </section>
      <p className="rodape">UTFPR Câmpus Cornélio Procópio · Projeto de extensão ELLP</p>
    </main>
  );
}
