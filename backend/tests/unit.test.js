import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatarCpf, normalizarCpf, validarCpf, validarEmail } from '../src/utils/cpf.js';
import { formatarAgendamento } from '../src/services/agendamentoService.js';

describe('Utilitários de CPF e E-mail', () => {
  it('valida CPFs válidos com e sem pontuação', () => {
    assert.equal(validarCpf('111.444.777-35'), true);
    assert.equal(validarCpf('52998224725'), true);
    assert.equal(normalizarCpf('111.444.777-35'), '11144477735');
    assert.equal(formatarCpf('11144477735'), '111.444.777-35');
  });

  it('rejeita CPFs inválidos e sequências repetidas', () => {
    assert.equal(validarCpf('11111111111'), false);
    assert.equal(validarCpf('12345678900'), false);
    assert.equal(validarCpf('12345'), false);
    assert.equal(validarCpf(''), false);
  });

  it('valida endereços de e-mail corretamente', () => {
    assert.equal(validarEmail('atendente@petcare.com'), true);
    assert.equal(validarEmail('invalido@'), false);
    assert.equal(validarEmail('sem-arroba.com'), false);
  });
});

describe('Domínio de Agendamento', () => {
  it('calcula valorTotal e duracaoTotalMin preservando precoCobrado histórico', () => {
    const inicio = new Date('2026-11-20T14:00:00.000Z');
    const fim = new Date('2026-11-20T15:30:00.000Z');

    const formatado = formatarAgendamento({
      id: 1,
      dataHora: inicio,
      dataFim: fim,
      status: 'AGENDADO',
      observacoes: null,
      animalId: 10,
      usuarioId: 2,
      animal: { id: 10, nome: 'Thor' },
      usuario: { id: 2, nome: 'Atendente' },
      servicos: [
        {
          servicoId: 1,
          precoCobrado: '60.00',
          servico: { id: 1, nome: 'Banho', duracaoMin: 60 },
        },
        {
          servicoId: 2,
          precoCobrado: '45.50',
          servico: { id: 2, nome: 'Tosa', duracaoMin: 30 },
        },
      ],
    });

    assert.equal(formatado.duracaoTotalMin, 90);
    assert.equal(formatado.valorTotal, 105.5);
    assert.equal(formatado.servicos[1].precoCobrado, 45.5);
  });
});

