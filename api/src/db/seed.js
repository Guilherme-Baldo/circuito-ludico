import { AuthService } from '../services/AuthService.js';

export const MONITOR_DEMO = { nome: 'Monitor ELLP', email: 'monitor@ellp.utfpr', senha: 'ellp2026' };

export const DESAFIOS = [
  { tipo: 'GENIUS', nome: 'Genius de cores', descricao: 'Repita a sequência de luzes, que cresce a cada rodada.' },
  { tipo: 'RESISTOR', nome: 'Qual é o resistor?', descricao: 'Leia o código de cores e confira com o ohmímetro do kit.' },
  { tipo: 'MONTAGEM', nome: 'Monte o circuito', descricao: 'Associe resistores em série ou paralelo para chegar ao valor pedido.' },
];

/** Cria os desafios e um monitor de demonstração (idempotente). */
export function semear(db, { monitores, desafios }) {
  db.transacao(() => {
    for (const d of DESAFIOS) desafios.garantir(d);
    if (!monitores.buscarPorEmail(MONITOR_DEMO.email)) {
      monitores.criar({
        nome: MONITOR_DEMO.nome,
        email: MONITOR_DEMO.email,
        senhaHash: AuthService.gerarHash(MONITOR_DEMO.senha),
      });
    }
  });
}
