// Empacota o frontend em web/dist com o esbuild.
// Uso: npm run build   (ou npm run dev para recompilar a cada alteração)
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

const observar = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
copyFileSync('src/styles.css', 'dist/styles.css');

const opcoes = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'iife',
  target: ['chrome110', 'edge110', 'firefox115', 'safari16'],
  jsx: 'transform',
  loader: { '.js': 'jsx' },
  minify: !observar,
  sourcemap: observar,
  define: { 'process.env.NODE_ENV': JSON.stringify(observar ? 'development' : 'production') },
  logLevel: 'info',
};

if (observar) {
  const ctx = await esbuild.context(opcoes);
  await ctx.watch();
  console.log('Observando alterações em src/ …');
} else {
  await esbuild.build(opcoes);
}
