/**
 * Remove caracteres não numéricos do CPF.
 */
export function normalizarCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

/**
 * Valida os dígitos verificadores de um CPF brasileiro.
 * Corresponde ao método validarCpf(): boolean do Diagrama de Classes.
 */
export function validarCpf(cpf) {
  const digits = normalizarCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += Number(digits[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(digits[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += Number(digits[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(digits[10]);
}

export function formatarCpf(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

