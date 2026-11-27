/** Gera CSV (separador ";" para abrir direto no Excel/LibreOffice em português). */
export function paraCsv(cabecalho, linhas) {
  const celula = (valor) => {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const corpo = [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';'));
  // BOM para o Excel reconhecer UTF-8 (acentos dos apelidos)
  return '﻿' + corpo.join('\r\n') + '\r\n';
}
