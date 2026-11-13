import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

function validarDadosAnimal({ nome, especie, raca, dataNascimento, clienteId }) {
  const erros = [];
  const nomeLimpo = String(nome || '').trim();
  const especieLimpa = String(especie || '').trim();
  const racaLimpa = String(raca || '').trim();
  const clienteIdNum = Number(clienteId);
  const dataNasc = dataNascimento ? new Date(dataNascimento) : null;

  if (nomeLimpo.length < 1) {
    erros.push('Informe o nome do animal.');
  }
  if (especieLimpa.length < 2) {
    erros.push('Informe a espécie do animal.');
  }
  if (racaLimpa.length < 2) {
    erros.push('Informe a raça do animal.');
  }
  if (!dataNasc || Number.isNaN(dataNasc.getTime())) {
    erros.push('Informe uma data de nascimento válida.');
  } else if (dataNasc > new Date()) {
    erros.push('A data de nascimento não pode ser futura.');
  }
  if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
    erros.push('Selecione o cliente tutor do animal.');
  }

  if (erros.length > 0) {
    throw new AppError(erros[0], 400, erros);
  }

  return {
    nome: nomeLimpo,
    especie: especieLimpa,
    raca: racaLimpa,
    dataNascimento: dataNasc,
    clienteId: clienteIdNum,
  };
}

export async function listar({ busca, clienteId } = {}) {
  const termo = String(busca || '').trim();
  const clienteIdNum = clienteId ? Number(clienteId) : null;

  const where = {
    ...(clienteIdNum ? { clienteId: clienteIdNum } : {}),
    ...(termo
      ? {
          OR: [
            { nome: { contains: termo, mode: 'insensitive' } },
            { especie: { contains: termo, mode: 'insensitive' } },
            { raca: { contains: termo, mode: 'insensitive' } },
            { cliente: { nome: { contains: termo, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  return prisma.animal.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true },
      },
      _count: {
        select: { agendamentos: true },
      },
    },
  });
}

export async function buscarPorId(id) {
  const animal = await prisma.animal.findUnique({
    where: { id },
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true, email: true },
      },
      _count: {
        select: { agendamentos: true },
      },
    },
  });

  if (!animal) {
    throw new AppError('Animal não encontrado.', 404);
  }

  return animal;
}

export async function criar(dados) {
  const payload = validarDadosAnimal(dados);

  const cliente = await prisma.cliente.findUnique({
    where: { id: payload.clienteId },
  });

  if (!cliente) {
    throw new AppError('Cliente tutor não encontrado.', 404);
  }

  return prisma.animal.create({
    data: payload,
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true },
      },
      _count: {
        select: { agendamentos: true },
      },
    },
  });
}

export async function atualizar(id, dados) {
  const existente = await prisma.animal.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Animal não encontrado.', 404);
  }

  const payload = validarDadosAnimal(dados);

  const cliente = await prisma.cliente.findUnique({
    where: { id: payload.clienteId },
  });

  if (!cliente) {
    throw new AppError('Cliente tutor não encontrado.', 404);
  }

  return prisma.animal.update({
    where: { id },
    data: payload,
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true },
      },
      _count: {
        select: { agendamentos: true },
      },
    },
  });
}

export async function excluir(id) {
  const existente = await prisma.animal.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Animal não encontrado.', 404);
  }

  const totalAgendamentos = await prisma.agendamento.count({
    where: { animalId: id },
  });

  if (totalAgendamentos > 0) {
    throw new AppError(
      'Não é possível excluir este animal pois existem agendamentos registrados em seu histórico.',
      409,
    );
  }

  await prisma.animal.delete({ where: { id } });
}

export async function consultarHistorico(id) {
  const animal = await prisma.animal.findUnique({
    where: { id },
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true, email: true },
      },
    },
  });

  if (!animal) {
    throw new AppError('Animal não encontrado.', 404);
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: { animalId: id },
    orderBy: { dataHora: 'desc' },
    include: {
      usuario: {
        select: { id: true, nome: true },
      },
      servicos: {
        include: {
          servico: {
            select: { id: true, nome: true, duracaoMin: true },
          },
        },
      },
    },
  });

  const atendimentos = agendamentos.map((ag) => {
    const servicosFormatados = ag.servicos.map((item) => ({
      servicoId: item.servicoId,
      nome: item.servico.nome,
      duracaoMin: item.servico.duracaoMin,
      precoCobrado: Number(item.precoCobrado),
    }));
    const valorTotal = servicosFormatados.reduce((acc, s) => acc + s.precoCobrado, 0);
    const duracaoTotalMin = Math.round((ag.dataFim.getTime() - ag.dataHora.getTime()) / 60000);

    return {
      id: ag.id,
      dataHora: ag.dataHora,
      dataFim: ag.dataFim,
      duracaoTotalMin,
      status: ag.status,
      observacoes: ag.observacoes,
      usuario: ag.usuario,
      servicos: servicosFormatados,
      valorTotal: Number(valorTotal.toFixed(2)),
    };
  });

  return {
    animal,
    atendimentos,
  };
}

