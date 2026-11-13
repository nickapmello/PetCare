import * as authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    const resultado = await authService.autenticar(req.body);
    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    const usuario = await authService.buscarPerfil(req.usuario.id);
    return res.status(200).json({ usuario });
  } catch (err) {
    return next(err);
  }
}

