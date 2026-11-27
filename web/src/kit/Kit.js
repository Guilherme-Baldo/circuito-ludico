/**
 * Interface comum do kit. O kit real (USB) e o kit simulado falam o mesmo
 * protocolo: comandos e eventos em JSON, uma mensagem por linha.
 *
 * Comandos (plataforma -> kit):
 *   {"cmd":"ping"}                 -> {"evt":"pronto","versao":"1.0"}
 *   {"cmd":"genius"}               -> inicia o Genius
 *   {"cmd":"parar"}                -> interrompe o desafio atual
 *   {"cmd":"medir"}                -> {"evt":"ohm","rx":4683,"e12":4700,"adc":327}
 *   {"cmd":"calibrar","r":10000}   -> {"evt":"calibrado","rref":9968}
 *
 * Eventos do Genius (kit -> plataforma):
 *   rodada {n} · led {id, aceso} · sua_vez · botao {id} · acerto {n} · fim {pontos, motivo}
 */
export class Kit {
  constructor() {
    this.ouvintes = new Set();
    this.conectado = false;
    this.simulado = false;
    this.nome = 'Kit';
  }

  /** Registra um ouvinte de eventos. Devolve a função para cancelar. */
  aoReceber(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  emitir(evento) {
    for (const fn of this.ouvintes) fn(evento);
  }

  /** Envia um comando e espera o primeiro evento cujo tipo esteja em `tipos`. */
  pedir(comando, tipos, tempoLimiteMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cancelar();
        reject(new Error('O kit não respondeu. Confira o cabo USB.'));
      }, tempoLimiteMs);
      const cancelar = this.aoReceber((e) => {
        if (tipos.includes(e.evt)) {
          clearTimeout(timer);
          cancelar();
          resolve(e);
        }
      });
      this.enviar(comando).catch((erro) => {
        clearTimeout(timer);
        cancelar();
        reject(erro);
      });
    });
  }

  medir() {
    return this.pedir({ cmd: 'medir' }, ['ohm']);
  }

  // implementados pelas subclasses
  async conectar() {}
  async desconectar() {}
  async enviar(_comando) {}
}
