import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export async function autenticar({ email, senha }) {
  const emailNormalizado = String(email || '').trim().toLowerCase();
  const senhaTexto = String(senha || '');

  if (!emailNormalizado || !senhaTexto) {
    throw new AppError('Informe e-mail e senha para entrar.', 400);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
  });

  if (!usuario) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const senhaConfere = await bcrypt.compare(senhaTexto, usuario.senhaHash);
  if (!senhaConfere) {
    throw new AppError('E-mail ou senha inválidos.', 401);
  }

  const token = jwt.sign(
    {
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
    env.jwtSecret,
    {
      subject: String(usuario.id),
      expiresIn: env.jwtExpiresIn,
    },
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  };
}

export async function buscarPerfil(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
    },
  });

  if (!usuario) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  return usuario;
}

