/**
 * Validador oficial de CNPJ brasileiro com algoritmo de Módulo 11
 */
export function validarCNPJ(cnpj) {
  if (!cnpj) return false;

  // Remove caracteres não numéricos
  const limpo = String(cnpj).replace(/\D/g, '');

  // Deve ter exatamente 14 dígitos
  if (limpo.length !== 14) return false;

  // Rejeita sequências com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  // Validação do primeiro dígito verificador
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
  if (resultado !== parseInt(digitos.charAt(0), 10)) {
    return false;
  }

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1), 10)) {
    return false;
  }

  return true;
}

export function formatarCNPJ(cnpj) {
  if (!cnpj) return '';
  const limpo = String(cnpj).replace(/\D/g, '').slice(0, 14);
  return limpo
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
