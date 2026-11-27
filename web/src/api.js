/** Cliente da API REST do Circuito Lúdico. */

const CHAVE_SESSAO = 'circuito-ludico:sessao';

export function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) ?? null;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao) {
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* navegação privada: segue só em memória */
  }
}

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

async function requisicao(metodo, caminho, corpo) {
  const sessao = lerSessao();
  const resp = await fetch(caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(sessao?.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 204) return null;
  const tipo = resp.headers.get('content-type') ?? '';
  const dados = tipo.includes('json') ? await resp.json() : await resp.blob();
  if (!resp.ok) {
    if (resp.status === 401) window.dispatchEvent(new Event('sessao-expirada'));
    throw new ErroApi(resp.status, dados?.erro ?? 'Erro na comunicação com o servidor.');
  }
  return dados;
}

export const api = {
  login: (email, senha) => requisicao('POST', '/api/auth/login', { email, senha }),
  oficinas: () => requisicao('GET', '/api/oficinas'),
  criarOficina: (dados) => requisicao('POST', '/api/oficinas', dados),
  oficina: (id) => requisicao('GET', `/api/oficinas/${id}`),
  participantes: (id) => requisicao('GET', `/api/oficinas/${id}/participantes`),
  adicionarParticipante: (id, dados) => requisicao('POST', `/api/oficinas/${id}/participantes`, dados),
  removerParticipante: (pid) => requisicao('DELETE', `/api/participantes/${pid}`),
  desafios: () => requisicao('GET', '/api/desafios'),
  registrarTentativa: (dados) => requisicao('POST', '/api/tentativas', dados),
  ranking: (id) => requisicao('GET', `/api/oficinas/${id}/ranking`),
  relatorio: (id) => requisicao('GET', `/api/oficinas/${id}/relatorio`),
  relatorioCsv: (id) => requisicao('GET', `/api/oficinas/${id}/relatorio?formato=csv`),
};
