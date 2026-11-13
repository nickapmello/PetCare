import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação não informado.', 401));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new AppError('Token de autenticação inválido.', 401));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.usuario = {
      id: Number(payload.sub),
      nome: payload.nome,
      email: payload.email,
      perfil: payload.perfil,
    };
    return next();
  } catch {
    return next(new AppError('Sessão expirada ou token inválido. Faça login novamente.', 401));
  }
}

export function exigirPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError('Usuário não autenticado.', 401));
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return next(
        new AppError('Acesso negado. Você não possui permissão para realizar esta ação.', 403),
      );
    }
    return next();
  };
}

