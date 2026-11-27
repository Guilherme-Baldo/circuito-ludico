import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarApp } from './app.js';
import { MONITOR_DEMO } from './db/seed.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const pastaDados = process.env.CL_DADOS ?? join(aqui, '..', 'data');
const porta = Number(process.env.PORT ?? 3000);

// Segredo do HMAC: gerado uma vez e guardado, para os logins sobreviverem a reinícios.
mkdirSync(pastaDados, { recursive: true });
const arquivoSegredo = join(pastaDados, '.segredo');
if (!existsSync(arquivoSegredo)) writeFileSync(arquivoSegredo, randomBytes(32).toString('hex'), { mode: 0o600 });
const segredo = process.env.CL_SEGREDO ?? readFileSync(arquivoSegredo, 'utf8').trim();

const { servidor } = criarApp({
  arquivoDb: join(pastaDados, 'circuito-ludico.db'),
  segredo,
  pastaWeb: join(aqui, '..', '..', 'web', 'dist'),
});

servidor.listen(porta, () => {
  console.log(`Circuito Lúdico rodando em http://localhost:${porta}`);
  console.log(`Login de demonstração: ${MONITOR_DEMO.email} / ${MONITOR_DEMO.senha}`);
});
