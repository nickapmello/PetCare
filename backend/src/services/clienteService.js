import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { normalizarCpf, validarCpf, validarEmail } from '../utils/cpf.js';
import { normalizarTelefone, normalizarTexto } from '../utils/texto.js';

function validarCamposEditaveisCliente({ nome, telefone, email }) {
  const erros = [];
  const nomeLimpo = String(nome || '').trim();
  const telefoneLimpo = String(telefone || '').trim();
  const emailLimpo = String(email || '').trim().toLowerCase();

  if (nomeLimpo.length < 2) {
    erros.push('O nome do cliente deve ter pelo menos 2 caracteres.');
  }
  if (telefoneLimpo.replace(/\D/g, '').length < 8) {
    erros.push('Informe um telefone válido.');
  }
  if (!validarEmail(emailLimpo)) {
    erros.push('Informe um endereço de e-mail válido.');
  }

  return {
    erros,
    dados: {
      nome: nomeLimpo,
      telefone: telefoneLimpo,
      email: emailLimpo,
    },
  };
}

function validarDadosCliente({ nome, cpf, telefone, email }) {
  const { erros, dados } = validarCamposEditaveisCliente({ nome, telefone, email });
  const cpfLimpo = normalizarCpf(cpf);

  if (!validarCpf(cpfLimpo)) {
    erros.splice(1, 0, 'Informe um CPF válido com 11 dígitos.');
  }

  if (erros.length > 0) {
    throw new AppError(erros[0], 400, erros);
  }

  return {
    ...dados,
    cpf: cpfLimpo,
  };
}

export async function listar({ busca } = {}) {
  const termo = String(busca || '').trim();

  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });

  if (!termo) {
    return clientes;
  }

  const termoTexto = normalizarTexto(termo);
  const termoNumerico = normalizarCpf(termo);

  return clientes.filter((c) => {
    const bateTexto =
      normalizarTexto(c.nome).includes(termoTexto) ||
      normalizarTexto(c.email).includes(termoTexto);
    const bateNumero =
      termoNumerico.length > 0 &&
      (normalizarCpf(c.cpf).includes(termoNumerico) ||
        normalizarTelefone(c.telefone).includes(termoNumerico));
    return bateTexto || bateNumero;
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

export async function verificarDuplicidade({ nome, cpf, telefone, email } = {}) {
  const cpfLimpo = normalizarCpf(cpf);
  if (cpfLimpo) {
    const existenteCpf = await prisma.cliente.findUnique({
      where: { cpf: cpfLimpo },
      include: {
        _count: {
          select: { animais: true },
        },
      },
    });

    if (existenteCpf) {
      return {
        bloqueadoPorCpf: true,
        clienteExistente: existenteCpf,
        possiveisDuplicados: [],
      };
    }
  }

  const nomeNorm = normalizarTexto(nome);
  const telefoneNorm = normalizarTelefone(telefone);
  const emailNorm = String(email || '').trim().toLowerCase();

  if (!nomeNorm || (!telefoneNorm && !emailNorm)) {
    return {
      bloqueadoPorCpf: false,
      clienteExistente: null,
      possiveisDuplicados: [],
    };
  }

  const todos = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });

  // Nome igual sozinho não alerta; apenas mesmo nome + mesmo telefone ou e-mail
  const possiveisDuplicados = todos.filter((c) => {
    if (normalizarTexto(c.nome) !== nomeNorm) return false;
    const mesmoTelefone =
      telefoneNorm.length >= 8 && normalizarTelefone(c.telefone) === telefoneNorm;
    const mesmoEmail = emailNorm && c.email.trim().toLowerCase() === emailNorm;
    return mesmoTelefone || mesmoEmail;
  });

  return {
    bloqueadoPorCpf: false,
    clienteExistente: null,
    possiveisDuplicados,
  };
}

export async function criar(dados) {
  const payload = validarDadosCliente(dados);

  const existente = await prisma.cliente.findUnique({
    where: { cpf: payload.cpf },
    include: {
      _count: {
        select: { animais: true },
      },
    },
  });

  if (existente) {
    throw new AppError('Já existe um cliente cadastrado com este CPF.', 409, {
      clienteExistente: existente,
    });
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

  if (dados.cpf !== undefined && dados.cpf !== null) {
    if (normalizarCpf(dados.cpf) !== normalizarCpf(existente.cpf)) {
      throw new AppError('O CPF não pode ser alterado após o cadastro.', 400);
    }
  }

  const { erros, dados: camposEditaveis } = validarCamposEditaveisCliente(dados);
  if (erros.length > 0) {
    throw new AppError(erros[0], 400, erros);
  }

  return prisma.cliente.update({
    where: { id },
    data: camposEditaveis,
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

