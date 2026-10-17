/**
 * Utilitários de validação e formatação de dados cadastrais brasileiros
 */

export function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  const digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

  return true;
}

export function mascaraCNPJ(valor: string): string {
  const limpo = valor.replace(/\D/g, '').slice(0, 14);
  return limpo
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function mascaraCEP(valor: string): string {
  const limpo = valor.replace(/\D/g, '').slice(0, 8);
  return limpo.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function mascaraTelefone(valor: string): string {
  const limpo = valor.replace(/\D/g, '').slice(0, 11);
  if (limpo.length <= 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return limpo.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export function validarEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

export function compararHorarios(inicio: string, fim: string): boolean {
  if (!inicio || !fim) return true;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  return h2 * 60 + m2 > h1 * 60 + m1;
}
