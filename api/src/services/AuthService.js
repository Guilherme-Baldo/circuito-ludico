import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { HttpError } from '../http/HttpError.js';

const VALIDADE_TOKEN_MS = 12 * 60 * 60 * 1000; // 12 h: cobre uma oficina inteira

/**
 * Login dos monitores. Senhas guardadas com scrypt + sal; sessão em token
 * assinado com HMAC-SHA256 (mesma ideia de um JWT, sem biblioteca externa).
 */
export class AuthService {
  /**
   * @param {import('../repositories/repositories.js').MonitorRepository} monitores
   * @param {string} segredo chave do HMAC
   */
  constructor(monitores, segredo) {
    this.monitores = monitores;
    this.segredo = segredo;
  }

  static gerarHash(senha) {
    const sal = randomBytes(16).toString('hex');
    const hash = scryptSync(senha, sal, 32).toString('hex');
    return `${sal}:${hash}`;
  }

  static conferirSenha(senha, armazenado) {
    const [sal, hash] = armazenado.split(':');
    const calculado = scryptSync(senha, sal, 32);
    return timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
  }

  login(email, senha) {
    if (!email || !senha) throw HttpError.requisicaoInvalida('Informe e-mail e senha.');
    const monitor = this.monitores.buscarPorEmail(String(email).trim().toLowerCase());
    if (!monitor || !AuthService.conferirSenha(String(senha), monitor.senhaHash)) {
      throw HttpError.naoAutorizado('E-mail ou senha incorretos.');
    }
    return { token: this.emitirToken(monitor.id), monitor: { id: monitor.id, nome: monitor.nome, email: monitor.email } };
  }

  emitirToken(monitorId) {
    const corpo = Buffer.from(JSON.stringify({ sub: monitorId, exp: Date.now() + VALIDADE_TOKEN_MS })).toString('base64url');
    return `${corpo}.${this.assinar(corpo)}`;
  }

  /** Devolve o monitor dono do token ou lança 401. */
  validarToken(token) {
    if (!token) throw HttpError.naoAutorizado();
    const [corpo, assinatura] = token.split('.');
    if (!corpo || !assinatura) throw HttpError.naoAutorizado();
    const esperada = Buffer.from(this.assinar(corpo));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) throw HttpError.naoAutorizado();
    const { sub, exp } = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    if (Date.now() > exp) throw HttpError.naoAutorizado('Sessão expirada. Faça login novamente.');
    const monitor = this.monitores.buscarPorId(sub);
    if (!monitor) throw HttpError.naoAutorizado();
    return monitor;
  }

  assinar(corpo) {
    return createHmac('sha256', this.segredo).update(corpo).digest('base64url');
  }
}
