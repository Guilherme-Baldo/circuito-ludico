import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';

import { Database } from './db/Database.js';
import { semear } from './db/seed.js';
import { Router } from './http/Router.js';
import { HttpError } from './http/HttpError.js';
import {
  MonitorRepository, OficinaRepository, ParticipanteRepository, DesafioRepository, TentativaRepository,
} from './repositories/repositories.js';
import { AuthService } from './services/AuthService.js';
import { OficinaService } from './services/OficinaService.js';
import { TentativaService } from './services/TentativaService.js';
import { AuthController, OficinaController, DesafioController, TentativaController } from './controllers/controllers.js';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

/**
 * Monta a aplicação: banco -> repositórios -> serviços -> controladores -> servidor HTTP.
 * @param {{ arquivoDb?: string, segredo: string, pastaWeb?: string }} opcoes
 */
export function criarApp({ arquivoDb = ':memory:', segredo, pastaWeb } = {}) {
  const db = new Database(arquivoDb);

  const repos = {
    monitores: new MonitorRepository(db),
    oficinas: new OficinaRepository(db),
    participantes: new ParticipanteRepository(db),
    desafios: new DesafioRepository(db),
    tentativas: new TentativaRepository(db),
  };
  semear(db, repos);

  const authService = new AuthService(repos.monitores, segredo);
  const oficinaService = new OficinaService(repos.oficinas, repos.participantes);
  const tentativaService = new TentativaService({ ...repos, oficinaService });

  const router = new Router();
  new AuthController(authService).registrar(router);
  new OficinaController(oficinaService).registrar(router);
  new DesafioController(repos.desafios).registrar(router);
  new TentativaController(tentativaService).registrar(router);

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (url.pathname.startsWith('/api/')) {
        await tratarApi(req, res, url);
      } else if (pastaWeb && (req.method === 'GET' || req.method === 'HEAD')) {
        await servirEstatico(res, url.pathname);
      } else {
        throw HttpError.naoEncontrado();
      }
    } catch (erro) {
      const status = erro instanceof HttpError ? erro.status : 500;
      if (status === 500) console.error(erro);
      enviarJson(res, status, { erro: status === 500 ? 'Erro interno do servidor.' : erro.message });
    }
  });

  async function tratarApi(req, res, url) {
    const achado = router.encontrar(req.method, url.pathname);
    if (!achado) throw HttpError.naoEncontrado('Rota não encontrada.');
    const { rota, params } = achado;

    const contexto = { params, query: url.searchParams, headers: req.headers, body: await Router.lerCorpo(req) };
    if (rota.autenticada) {
      const cabecalho = req.headers.authorization ?? '';
      contexto.monitor = authService.validarToken(cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null);
    }

    const resultado = await rota.handler(contexto);
    if (resultado && typeof resultado === 'object' && 'status' in resultado && !Array.isArray(resultado)) {
      if (resultado.headers) {
        res.writeHead(resultado.status, resultado.headers);
        res.end(resultado.corpo);
      } else if (resultado.status === 204) {
        res.writeHead(204);
        res.end();
      } else {
        enviarJson(res, resultado.status, resultado.corpo);
      }
      return;
    }
    enviarJson(res, 200, resultado);
  }

  async function servirEstatico(res, caminho) {
    const raiz = normalize(pastaWeb);
    let arquivo = normalize(join(raiz, decodeURIComponent(caminho)));
    if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) throw HttpError.naoEncontrado();
    try {
      if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
    } catch {
      arquivo = join(raiz, 'index.html'); // SPA: rotas do frontend caem no index
    }
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
    res.end(conteudo);
  }

  return { servidor, db };
}

function enviarJson(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}
