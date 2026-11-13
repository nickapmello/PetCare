import { AppError } from './AppError.js';

export function parseId(valor, nomeCampo = 'ID') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${nomeCampo} inválido.`, 400);
  }
  return id;
}

