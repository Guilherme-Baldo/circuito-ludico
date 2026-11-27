import { Kit } from './Kit.js';

/** Kit físico ligado pela USB, usando a Web Serial API (Chrome/Edge). */
export class KitSerial extends Kit {
  constructor() {
    super();
    this.nome = 'Kit USB';
    this.porta = null;
    this.leitor = null;
    this.escritor = null;
  }

  static suportado() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async conectar() {
    if (!KitSerial.suportado()) {
      throw new Error('Este navegador não tem Web Serial. Use o Chrome ou o Edge no computador.');
    }
    this.porta = await navigator.serial.requestPort();
    await this.porta.open({ baudRate: 115200 });

    const codificador = new TextEncoderStream();
    codificador.readable.pipeTo(this.porta.writable);
    this.escritor = codificador.writable.getWriter();

    const decodificador = new TextDecoderStream();
    this.fechamentoLeitura = this.porta.readable.pipeTo(decodificador.writable).catch(() => {});
    this.leitor = decodificador.readable.getReader();
    this.lerLinhas();

    this.conectado = true;
    // O Arduino reinicia ao abrir a porta; espera o firmware subir e confirma a versão.
    await new Promise((ok) => setTimeout(ok, 2000));
    const resposta = await this.pedir({ cmd: 'ping' }, ['pronto'], 4000);
    this.versao = resposta.versao;
  }

  async lerLinhas() {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await this.leitor.read();
        if (done) break;
        buffer += value;
        let fim;
        while ((fim = buffer.indexOf('\n')) >= 0) {
          const linha = buffer.slice(0, fim).trim();
          buffer = buffer.slice(fim + 1);
          if (!linha.startsWith('{')) continue; // ignora mensagens de depuração
          try {
            this.emitir(JSON.parse(linha));
          } catch {
            /* linha corrompida: descarta */
          }
        }
      }
    } catch {
      /* porta fechada */
    } finally {
      this.conectado = false;
      this.emitir({ evt: 'desconectado' });
    }
  }

  async enviar(comando) {
    if (!this.escritor) throw new Error('Kit não conectado.');
    await this.escritor.write(JSON.stringify(comando) + '\n');
  }

  async desconectar() {
    try {
      await this.leitor?.cancel();
      await this.fechamentoLeitura;
      await this.escritor?.close();
      await this.porta?.close();
    } finally {
      this.conectado = false;
    }
  }
}
