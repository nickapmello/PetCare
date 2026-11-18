import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const LOCK_KEY_AGENDA_UNICA = 987654321;

const includeAgendamento = {
  animal: {
    include: {
      cliente: {
        select: { id: true, nome: true, cpf: true, telefone: true, email: true },
      },
    },
  },
  usuario: {
    select: { id: true, nome: true, perfil: true },
  },
  servicos: {
    include: {
      servico: {
        select: { id: true, nome: true, duracaoMin: true },
      },
    },
  },
};

function formatarHoraLocal(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formata o agendamento e calcula o valor total a partir dos preços cobrados
 * no momento do atendimento (calcularValorTotal(): decimal no Diagrama de Classes).
 */
export function formatarAgendamento(ag) {
  const servicos = (ag.servicos || []).map((item) => ({
    servicoId: item.servicoId,
    nome: item.servico?.nome || '',
    duracaoMin: item.servico?.duracaoMin || 0,
    precoCobrado: Number(item.precoCobrado),
  }));

  const valorTotal = servicos.reduce((acc, s) => acc + s.precoCobrado, 0);
  const duracaoTotalMin = Math.round((ag.dataFim.getTime() - ag.dataHora.getTime()) / 60000);

  return {
    id: ag.id,
    dataHora: ag.dataHora,
    dataFim: ag.dataFim,
    duracaoTotalMin,
    status: ag.status,
    observacoes: ag.observacoes || '',
    animalId: ag.animalId,
    usuarioId: ag.usuarioId,
    animal: ag.animal,
    usuario: ag.usuario,
    servicos,
    valorTotal: Number(valorTotal.toFixed(2)),
  };
}

/**
 * Verifica se há sobreposição na agenda única para o intervalo [inicio, fim).
 * Um atendimento que termina exatamente quando outro começa não gera conflito.
 * Agendamentos cancelados são desconsiderados.
 */
async function verificarDisponibilidade(tx, { inicio, fim, ignorarId = null }) {
  const conflito = await tx.agendamento.findFirst({
    where: {
      status: { not: 'CANCELADO' },
      ...(ignorarId ? { NOT: { id: ignorarId } } : {}),
      dataHora: { lt: fim },
      dataFim: { gt: inicio },
    },
    include: {
      animal: { select: { nome: true } },
    },
  });

  if (conflito) {
    throw new AppError(
      `Horário indisponível. Já existe um atendimento nesse período (${conflito.animal.nome} — ${formatarHoraLocal(conflito.dataHora)} até ${formatarHoraLocal(conflito.dataFim)}). Escolha outro horário.`,
      409,
    );
  }
}

function parseDataHora(valor) {
  const data = new Date(valor);
  if (!valor || Number.isNaN(data.getTime())) {
    throw new AppError('Informe uma data e horário válidos.', 400);
  }
  return data;
}

export async function listar({ data, status, animalId } = {}) {
  const where = {};

  if (status && ['AGENDADO', 'CONCLUIDO', 'CANCELADO'].includes(status)) {
    where.status = status;
  }

  if (animalId) {
    const idNum = Number(animalId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      throw new AppError('Identificador de animal inválido.', 400);
    }
    where.animalId = idNum;
  }

  if (data) {
    const inicioDia = new Date(`${data}T00:00:00`);
    const fimDia = new Date(`${data}T23:59:59.999`);
    if (Number.isNaN(inicioDia.getTime())) {
      throw new AppError('Filtro de data inválido.', 400);
    }
    where.dataHora = {
      gte: inicioDia,
      lte: fimDia,
    };
  }

  const agendamentos = await prisma.agendamento.findMany({
    where,
    orderBy: { dataHora: 'asc' },
    include: includeAgendamento,
  });

  return agendamentos.map(formatarAgendamento);
}

export async function buscarPorId(id) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: includeAgendamento,
  });

  if (!agendamento) {
    throw new AppError('Agendamento não encontrado.', 404);
  }

  return formatarAgendamento(agendamento);
}

export async function criar({ animalId, servicoIds, dataHora, observacoes }, usuarioId) {
  const animalIdNum = Number(animalId);
  if (!Number.isInteger(animalIdNum) || animalIdNum <= 0) {
    throw new AppError('Selecione um animal para o agendamento.', 400);
  }

  if (!Array.isArray(servicoIds) || servicoIds.length === 0) {
    throw new AppError('Selecione ao menos um serviço para o agendamento.', 400);
  }

  const servicoIdsUnicos = [...new Set(servicoIds.map((id) => Number(id)))];
  if (servicoIdsUnicos.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError('Lista de serviços contém identificador inválido.', 400);
  }

  const inicio = parseDataHora(dataHora);
  const obsLimpa = observacoes ? String(observacoes).trim() : null;

  const criado = await prisma.$transaction(async (tx) => {
    // Serializa verificações e gravações na agenda única mesmo sob requisições simultâneas
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY_AGENDA_UNICA})`;

    const animal = await tx.animal.findUnique({ where: { id: animalIdNum } });
    if (!animal) {
      throw new AppError('Animal não encontrado.', 404);
    }

    const servicos = await tx.servico.findMany({
      where: { id: { in: servicoIdsUnicos } },
    });

    if (servicos.length !== servicoIdsUnicos.length) {
      throw new AppError('Um ou mais serviços selecionados não foram encontrados.', 404);
    }

    const duracaoTotalMin = servicos.reduce((acc, s) => acc + s.duracaoMin, 0);
    const dataFim = new Date(inicio.getTime() + duracaoTotalMin * 60000);

    await verificarDisponibilidade(tx, { inicio, fim: dataFim });

    return tx.agendamento.create({
      data: {
        dataHora: inicio,
        dataFim,
        status: 'AGENDADO',
        observacoes: obsLimpa,
        animalId: animalIdNum,
        usuarioId,
        servicos: {
          create: servicos.map((s) => ({
            servicoId: s.id,
            precoCobrado: s.preco,
          })),
        },
      },
      include: includeAgendamento,
    });
  });

  return formatarAgendamento(criado);
}

export async function reagendar(id, { dataHora, observacoes }) {
  const novoInicio = parseDataHora(dataHora);

  const atualizado = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY_AGENDA_UNICA})`;

    const existente = await tx.agendamento.findUnique({ where: { id } });
    if (!existente) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    if (existente.status === 'CANCELADO') {
      throw new AppError('Não é possível reagendar um atendimento cancelado.', 409);
    }
    if (existente.status === 'CONCLUIDO') {
      throw new AppError('Não é possível reagendar um atendimento já concluído.', 409);
    }

    // Preserva a duração originalmente reservada no agendamento
    const duracaoMs = existente.dataFim.getTime() - existente.dataHora.getTime();
    const novoFim = new Date(novoInicio.getTime() + duracaoMs);

    await verificarDisponibilidade(tx, {
      inicio: novoInicio,
      fim: novoFim,
      ignorarId: id,
    });

    return tx.agendamento.update({
      where: { id },
      data: {
        dataHora: novoInicio,
        dataFim: novoFim,
        ...(observacoes !== undefined
          ? { observacoes: observacoes ? String(observacoes).trim() : null }
          : {}),
      },
      include: includeAgendamento,
    });
  });

  return formatarAgendamento(atualizado);
}

export async function cancelar(id) {
  const existente = await prisma.agendamento.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Agendamento não encontrado.', 404);
  }

  if (existente.status === 'CANCELADO') {
    throw new AppError('Este agendamento já está cancelado.', 409);
  }
  if (existente.status === 'CONCLUIDO') {
    throw new AppError('Não é possível cancelar um agendamento já concluído.', 409);
  }

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: { status: 'CANCELADO' },
    include: includeAgendamento,
  });

  return formatarAgendamento(atualizado);
}

export async function concluir(id) {
  const existente = await prisma.agendamento.findUnique({ where: { id } });
  if (!existente) {
    throw new AppError('Agendamento não encontrado.', 404);
  }

  if (existente.status !== 'AGENDADO') {
    throw new AppError('Somente agendamentos com status Agendado podem ser concluídos.', 409);
  }

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: { status: 'CONCLUIDO' },
    include: includeAgendamento,
  });

  return formatarAgendamento(atualizado);
}

