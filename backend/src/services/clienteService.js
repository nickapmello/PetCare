import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { normalizarCpf, validarCpf, validarEmail } from '../utils/cpf.js';

function validarDadosCliente({ nome, cpf, telefone, email }) {
  const erros = [];
  const nomeLimpo = String(nome || '').trim();
  const cpfLimpo = normalizarCpf(cpf);
  const telefoneLimpo = String(telefone || '').trim();
  const emailLimpo = String(email || '').trim().toLowerCase();

  if (nomeLimpo.length < 2) {
    erros.push('O nome do cliente deve ter pelo menos 2 caracteres.');
  }
  if (!validarCpf(cpfLimpo)) {
    erros.push('Informe um CPF válido com 11 dígitos.');
  }
  if (telefoneLimpo.replace(/\D/g, '').length < 8) {
    erros.push('Informe um telefone válido.');
  }
  if (!validarEmail(emailLimpo)) {
    erros.push('Informe um endereço de e-mail válido.');
  }

  if (erros.length > 0) {
    throw new AppError(erros[0], 400, erros);
  }

  return {
    nome: nomeLimpo,
    cpf: cpfLimpo,
    telefone: telefoneLimpo,
    email: emailLimpo,
  };
}

export async function listar({ busca } = {}) {
  const termo = String(busca || '').trim();
  const termoNumerico = normalizarCpf(termo);

  const where = termo
    ? {
        OR: [
          { nome: { contains: termo, mode: 'insensitive' } },
          { email: { contains: termo, mode: 'insensitive' } },
          ...(termoNumerico ? [{ cpf: { contains: termoNumerico } }] : []),
        ],
      }
    : undefined;

  return prisma.cliente.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });
}

export async function buscarPorId(id) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      animais: {
        orderBy: { nome: 'asc' },
      },
      _count: {
        select: { animais: true },
      },
    },
  });

  if (!cliente) {
    throw new AppError('Cliente não encontrado.', 404);
  }

  return cliente;
}

export async function criar(dados) {
  const payload = validarDadosCliente(dados);

  const existente = await prisma.cliente.findUnique({
    where: { cpf: payload.cpf },
  });

  if (existente) {
    throw new AppError('Já existe um cliente cadastrado com este CPF.', 409);
  }

  return prisma.cliente.create({
    data: payload,
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });
}

export async function atualizar(id, dados) {
  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Cliente não encontrado.', 404);
  }

  const payload = validarDadosCliente(dados);

  const outroComMesmoCpf = await prisma.cliente.findFirst({
    where: {
      cpf: payload.cpf,
      NOT: { id },
    },
  });

  if (outroComMesmoCpf) {
    throw new AppError('Já existe outro cliente cadastrado com este CPF.', 409);
  }

  return prisma.cliente.update({
    where: { id },
    data: payload,
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });
}

export async function excluir(id) {
  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Cliente não encontrado.', 404);
  }

  const totalAnimais = await prisma.animal.count({
    where: { clienteId: id },
  });

  if (totalAnimais > 0) {
    throw new AppError(
      'Não é possível excluir este cliente pois existem animais vinculados a ele.',
      409,
    );
  }

  await prisma.cliente.delete({ where: { id } });
}

