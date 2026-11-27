/**
 * Controladores: traduzem HTTP <-> serviços. Cada um registra as suas rotas.
 * Toda rota é autenticada, exceto o login.
 */

export class AuthController {
  constructor(authService) {
    this.auth = authService;
  }

  registrar(router) {
    router.post('/api/auth/login', ({ body }) => this.auth.login(body.email, body.senha), { autenticada: false });
    router.get('/api/auth/eu', ({ monitor }) => ({ id: monitor.id, nome: monitor.nome, email: monitor.email }));
  }
}

export class OficinaController {
  constructor(oficinaService) {
    this.oficinas = oficinaService;
  }

  registrar(router) {
    router.get('/api/oficinas', ({ monitor }) => this.oficinas.listar(monitor.id));
    router.post('/api/oficinas', ({ monitor, body }) => ({ status: 201, corpo: this.oficinas.criar(monitor.id, body) }));
    router.get('/api/oficinas/:id', ({ monitor, params }) => this.oficinas.buscar(params.id, monitor.id));
    router.get('/api/oficinas/:id/participantes', ({ monitor, params }) =>
      this.oficinas.listarParticipantes(params.id, monitor.id));
    router.post('/api/oficinas/:id/participantes', ({ monitor, params, body }) =>
      ({ status: 201, corpo: this.oficinas.adicionarParticipante(params.id, monitor.id, body) }));
    router.delete('/api/participantes/:id', ({ monitor, params }) => {
      this.oficinas.removerParticipante(params.id, monitor.id);
      return { status: 204 };
    });
  }
}

export class DesafioController {
  constructor(desafioRepository) {
    this.desafios = desafioRepository;
  }

  registrar(router) {
    router.get('/api/desafios', () => this.desafios.listar());
  }
}

export class TentativaController {
  constructor(tentativaService) {
    this.tentativas = tentativaService;
  }

  registrar(router) {
    router.post('/api/tentativas', ({ monitor, body }) =>
      ({ status: 201, corpo: this.tentativas.registrar(monitor.id, body) }));
    router.get('/api/oficinas/:id/ranking', ({ monitor, params }) => this.tentativas.ranking(params.id, monitor.id));
    router.get('/api/oficinas/:id/relatorio', ({ monitor, params, query }) => {
      if (query.get('formato') === 'csv') {
        return {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="relatorio-oficina-${params.id}.csv"`,
          },
          corpo: this.tentativas.relatorioCsv(params.id, monitor.id),
        };
      }
      return this.tentativas.relatorio(params.id, monitor.id);
    });
  }
}
