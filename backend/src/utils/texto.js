/**
 * Normaliza texto para comparações e buscas sem diferenciar maiúsculas,
 * acentos ou múltiplos espaços internos/externos.
 */
export function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizarTelefone(valor) {
  return String(valor || '').replace(/\D/g, '');
}
