import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso, formatarData } from '../components/componentes.jsx';

const pct = (x) => `${Math.round(x * 100)}%`;
const num = (x, casas = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: casas });

export function Relatorio({ id, ir }) {
  const [rel, setRel] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => { api.relatorio(id).then(setRel).catch((e) => setErro(e.message)); }, [id]);

  async function baixarCsv() {
    try {
      const blob = await api.relatorioCsv(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-oficina-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="conteudo">
      <button className="voltar" onClick={() => ir(`/oficina/${id}`)}>← Oficina</button>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {rel && (
        <>
          <header className="titulo-pagina com-acoes">
            <div>
              <h1>📊 Relatório da oficina</h1>
              <p>{rel.oficina.turma} · {formatarData(rel.oficina.data)} · {rel.oficina.local}</p>
            </div>
            <button className="botao primario" onClick={baixarCsv}>⬇ Baixar CSV</button>
          </header>

          <div className="indicadores">
            <div className="cartao indicador"><span className="rotulo">Participantes</span><strong>{rel.participantes}</strong></div>
            <div className="cartao indicador"><span className="rotulo">Jogaram</span><strong>{rel.participantesAtivos}</strong></div>
            <div className="cartao indicador"><span className="rotulo">Tentativas</span><strong>{rel.totalTentativas}</strong></div>
          </div>

          <div className="cartao tabela-rolavel">
            <h2>Desempenho por desafio</h2>
            <table className="tabela">
              <thead>
                <tr><th>Desafio</th><th>Tentativas</th><th>Acertos</th><th>Taxa de acerto</th><th>Média de pontos</th><th>Tempo médio</th></tr>
              </thead>
              <tbody>
                {rel.porDesafio.map((d) => (
                  <tr key={d.desafioId}>
                    <td><strong>{d.nome}</strong></td>
                    <td className="numero">{d.tentativas}</td>
                    <td className="numero">{d.acertos}</td>
                    <td>
                      <div className="barra" role="img" aria-label={pct(d.taxaAcerto)}>
                        <span style={{ width: pct(d.taxaAcerto) }} />
                      </div>
                      <span className="numero">{d.tentativas ? pct(d.taxaAcerto) : '–'}</span>
                    </td>
                    <td className="numero">{d.tentativas ? num(d.mediaPontos) : '–'}</td>
                    <td className="numero">{d.tentativas ? `${num(d.tempoMedioS, 0)} s` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
