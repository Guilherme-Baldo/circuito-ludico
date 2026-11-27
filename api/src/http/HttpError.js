/** Erro com código HTTP, convertido em resposta JSON pelo servidor. */
export class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }

  static requisicaoInvalida(msg) { return new HttpError(400, msg); }
  static naoAutorizado(msg = 'Faça login para continuar.') { return new HttpError(401, msg); }
  static naoEncontrado(msg = 'Recurso não encontrado.') { return new HttpError(404, msg); }
  static conflito(msg) { return new HttpError(409, msg); }
}
