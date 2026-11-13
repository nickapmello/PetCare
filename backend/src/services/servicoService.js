import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

function validarDadosServico({ nome, descricao, preco, duracaoMin }) {
  const erros = [];
  const nomeLimpo = String(nome || '').trim();
  const descricaoLimpa = String(descricao || '').trim();
  const precoNum = Number(preco);
  const duracaoNum = Number(duracaoMin);

  if (nomeLimpo.length < 2) {
    erros.push('Informe o nome do serviço (mínimo 2 caracteres).');
  }
  if (descricaoLimpa.length < 3) {
    erros.push('Informe uma descrição para o serviço.');
  }
  if (Number.isNaN(precoNum) || precoNum <= 0) {
    erros.push('O preço do serviço deve ser um valor positivo.');
  }
  if (!Number.isInteger(duracaoNum) || duracaoNum <= 0) {
    erros.push('A duração estimada deve ser um número inteiro positivo de minutos.');
  }

  if (erros.length > 0) {
    throw new AppError(erros[0], 400, erros);
  }

  return {
    nome: nomeLimpo,
    descricao: descricaoLimpa,
    preco: Number(precoNum.toFixed(2)),
    duracaoMin: duracaoNum,
  };
}

function formatarServico(s) {
  return {
    ...s,
    preco: Number(s.preco),
  };
}

export async function listar({ busca } = {}) {
  const termo = String(busca || '').trim();
  const where = termo
    ? {
        OR: [
          { nome: { contains: termo, mode: 'insensitive' } },
          { descricao: { contains: termo, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const servicos = await prisma.servico.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: { agendamentoServicos: true },
      },
    },
  });

  return servicos.map(formatarServico);
}

export async function buscarPorId(id) {
  const servico = await prisma.servico.findUnique({
    where: { id },
    include: {
      _count: {
        select: { agendamentoServicos: true },
      },
    },
  });

  if (!servico) {
    throw new AppError('Serviço não encontrado.', 404);
  }

  return formatarServico(servico);
}

export async function criar(dados) {
  const payload = validarDadosServico(dados);

  const servico = await prisma.servico.create({
    data: payload,
    include: {
      _count: {
        select: { agendamentoServicos: true },
      },
    },
  });

  return formatarServico(servico);
}

export async function atualizar(id, dados) {
  const existente = await prisma.servico.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Serviço não encontrado.', 404);
  }

  const payload = validarDadosServico(dados);

  const servico = await prisma.servico.update({
    where: { id },
    data: payload,
    include: {
      _count: {
        select: { agendamentoServicos: true },
      },
    },
  });

  return formatarServico(servico);
}

export async function excluir(id) {
  const existente = await prisma.servico.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Serviço não encontrado.', 404);
  }

  const usos = await prisma.agendamentoServico.count({
    where: { servicoId: id },
  });

  if (usos > 0) {
    throw new AppError(
      'Não é possível excluir este serviço pois ele já foi utilizado em agendamentos.',
      409,
    );
  }

  await prisma.servico.delete({ where: { id } });
}

