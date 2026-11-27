import { HttpError } from './HttpError.js';

const LIMITE_CORPO = 64 * 1024; // 64 KB é muito mais do que qualquer requisição da API precisa

/**
 * Roteador mínimo: associa método + caminho (com parâmetros ":id") a um handler.
 * O handler recebe { params, query, body, headers, monitor? } e devolve
 * um objeto (vira JSON) ou { status, headers, corpo } para respostas especiais.
 */
export class Router {
  constructor() {
    this.rotas = [];
  }

  adicionar(metodo, caminho, handler, { autenticada = true } = {}) {
    const nomes = [];
    const padrao = caminho.replace(/:([a-zA-Z]+)/g, (_, nome) => {
      nomes.push(nome);
      return '([^/]+)';
    });
    this.rotas.push({ metodo, regex: new RegExp(`^${padrao}$`), nomes, handler, autenticada });
  }

  get(c, h, o) { this.adicionar('GET', c, h, o); }
  post(c, h, o) { this.adicionar('POST', c, h, o); }
  delete(c, h, o) { this.adicionar('DELETE', c, h, o); }

  encontrar(metodo, caminho) {
    let caminhoExiste = false;
    for (const rota of this.rotas) {
      const m = rota.regex.exec(caminho);
      if (!m) continue;
      caminhoExiste = true;
      if (rota.metodo !== metodo) continue;
      const params = Object.fromEntries(rota.nomes.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      return { rota, params };
    }
    if (caminhoExiste) throw new HttpError(405, 'Método não permitido.');
    return null;
  }

  static async lerCorpo(req) {
    if (req.method === 'GET' || req.method === 'DELETE') return {};
    const partes = [];
    let tamanho = 0;
    for await (const parte of req) {
      tamanho += parte.length;
      if (tamanho > LIMITE_CORPO) throw new HttpError(413, 'Requisição muito grande.');
      partes.push(parte);
    }
    if (!tamanho) return {};
    try {
      return JSON.parse(Buffer.concat(partes).toString('utf8'));
    } catch {
      throw HttpError.requisicaoInvalida('JSON inválido.');
    }
  }
}
