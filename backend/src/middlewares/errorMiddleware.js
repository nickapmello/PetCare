import { AppError } from '../utils/AppError.js';

export function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      erro: err.message,
      ...(err.details ? { detalhes: err.details } : {}),
    });
  }

  // Erros conhecidos do Prisma
  if (err?.code === 'P2002') {
    return res.status(409).json({
      erro: 'Já existe um registro com os dados únicos informados.',
    });
  }

  if (err?.code === 'P2003') {
    return res.status(409).json({
      erro: 'Operação bloqueada devido a vínculo com outros registros.',
    });
  }

  if (err?.code === 'P2025') {
    return res.status(404).json({
      erro: 'Registro não encontrado.',
    });
  }

  // Violação de constraint EXCLUDE USING gist no PostgreSQL (sobreposição de horário)
  if (err?.code === '23P01' || (err?.message && err.message.includes('agendamentos_sem_sobreposicao'))) {
    return res.status(409).json({
      erro: 'Horário indisponível. Já existe um atendimento nesse período. Escolha outro horário.',
    });
  }

  console.error('[PetCare API Error]', err);
  return res.status(500).json({
    erro: 'Erro interno do servidor. Tente novamente em instantes.',
  });
}

