import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('API PetCare — Fluxos E2E e Regras de Negócio', () => {
  let tokenAtendente;
  let tokenAdmin;

  const idsCriados = {
    agendamentos: [],
    animais: [],
    clientes: [],
    servicos: [],
  };

  before(async () => {
    const resAtendente = await request(app)
      .post('/auth/login')
      .send({ email: 'atendente@petcare.com', senha: 'Atendente@123' });
    assert.equal(resAtendente.status, 200);
    tokenAtendente = resAtendente.body.token;

    const resAdmin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@petcare.com', senha: 'Admin@123' });
    assert.equal(resAdmin.status, 200);
    tokenAdmin = resAdmin.body.token;
  });

  after(async () => {
    if (idsCriados.agendamentos.length > 0) {
      await prisma.agendamento.deleteMany({
        where: { id: { in: idsCriados.agendamentos } },
      });
    }
    if (idsCriados.animais.length > 0) {
      await prisma.animal.deleteMany({
        where: { id: { in: idsCriados.animais } },
      });
    }
    if (idsCriados.clientes.length > 0) {
      await prisma.cliente.deleteMany({
        where: { id: { in: idsCriados.clientes } },
      });
    }
    if (idsCriados.servicos.length > 0) {
      await prisma.servico.deleteMany({
        where: { id: { in: idsCriados.servicos } },
      });
    }
    await prisma.$disconnect();
  });

  it('UC05: bloqueia acesso sem token e rejeita credenciais inválidas', async () => {
    const semToken = await request(app).get('/clientes');
    assert.equal(semToken.status, 401);

    const loginInvalido = await request(app)
      .post('/auth/login')
      .send({ email: 'atendente@petcare.com', senha: 'errada' });
    assert.equal(loginInvalido.status, 401);
  });

  it('UC03: restringe gerenciamento de serviços ao perfil Administrador', async () => {
    // Atendente pode listar
    const listagemAtendente = await request(app)
      .get('/servicos')
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(listagemAtendente.status, 200);

    // Atendente NÃO pode criar
    const criacaoAtendente = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Serviço Proibido',
        descricao: 'Atendente não pode criar',
        preco: 50,
        duracaoMin: 30,
      });
    assert.equal(criacaoAtendente.status, 403);

    // Admin pode criar, editar e excluir serviço sem uso
    const servicoTemp = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Hidratação Teste',
        descricao: 'Serviço temporário para validação',
        preco: 80,
        duracaoMin: 60,
      });
    assert.equal(servicoTemp.status, 201);
    idsCriados.servicos.push(servicoTemp.body.id);

    const edicaoAdmin = await request(app)
      .put(`/servicos/${servicoTemp.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Hidratação Teste Editada',
        descricao: 'Serviço atualizado',
        preco: 85,
        duracaoMin: 60,
      });
    assert.equal(edicaoAdmin.status, 200);
    assert.equal(edicaoAdmin.body.preco, 85);
  });

  it('UC01 e UC02: gerencia clientes, impede CPF duplicado e vínculo na exclusão', async () => {
    const cli = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Cliente Teste Integração',
        cpf: '390.533.447-05',
        telefone: '(43) 99123-4567',
        email: 'cliente.teste@exemplo.com',
      });
    assert.equal(cli.status, 201);
    idsCriados.clientes.push(cli.body.id);

    // CPF duplicado
    const dup = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Outro Nome',
        cpf: '39053344705',
        telefone: '(43) 99123-0000',
        email: 'outro@exemplo.com',
      });
    assert.equal(dup.status, 409);

    // Animal exige cliente existente
    const animalSemTutor = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Bob',
        especie: 'Cão',
        raca: 'Beagle',
        dataNascimento: '2021-03-15',
        clienteId: 999999,
      });
    assert.equal(animalSemTutor.status, 404);

    // Cadastra animal vinculado ao cliente
    const animal = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Bob Teste',
        especie: 'Cão',
        raca: 'Beagle',
        dataNascimento: '2021-03-15',
        clienteId: cli.body.id,
      });
    assert.equal(animal.status, 201);
    idsCriados.animais.push(animal.body.id);

    // Impede excluir cliente com animal vinculado
    const excluirCliBloqueado = await request(app)
      .delete(`/clientes/${cli.body.id}`)
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(excluirCliBloqueado.status, 409);

    // Histórico inicialmente vazio
    const histVazio = await request(app)
      .get(`/animais/${animal.body.id}/historico`)
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(histVazio.status, 200);
    assert.deepEqual(histVazio.body.atendimentos, []);
  });

  it('UC04 e RF06: cenário de aceitação da agenda (14h-15h, conflito 14h30, livre 15h, cancelamento, reagendamento e concorrência)', async () => {
    // Prepara cliente, animal e serviço de 60 minutos
    const cli = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Tutor Agenda Teste',
        cpf: '714.287.938-60',
        telefone: '(43) 99222-3344',
        email: 'agenda.teste@exemplo.com',
      });
    assert.equal(cli.status, 201);
    idsCriados.clientes.push(cli.body.id);

    const animal = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Mel Agenda',
        especie: 'Cão',
        raca: 'Poodle',
        dataNascimento: '2022-01-10',
        clienteId: cli.body.id,
      });
    assert.equal(animal.status, 201);
    idsCriados.animais.push(animal.body.id);

    const srv = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Banho 60min Teste',
        descricao: 'Serviço padrão 60 minutos',
        preco: 70,
        duracaoMin: 60,
      });
    assert.equal(srv.status, 201);
    idsCriados.servicos.push(srv.body.id);

    // 1) Atendimento das 14h às 15h
    const ag14h = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: animal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:00:00.000Z',
        observacoes: 'Atendimento das 14h',
      });
    assert.equal(ag14h.status, 201);
    assert.equal(ag14h.body.duracaoTotalMin, 60);
    assert.equal(ag14h.body.dataFim, '2030-06-10T15:00:00.000Z');
    assert.equal(ag14h.body.valorTotal, 70);
    idsCriados.agendamentos.push(ag14h.body.id);

    // 2) Bloqueia outro às 14h30
    const conflito1430 = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: animal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:30:00.000Z',
      });
    assert.equal(conflito1430.status, 409);

    // 3) Permite outro exatamente às 15h00
    const ag15h = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: animal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T15:00:00.000Z',
      });
    assert.equal(ag15h.status, 201);
    idsCriados.agendamentos.push(ag15h.body.id);

    // 4) Reagendamento preserva duração e desconsidera o próprio registro (15h->16h30 e depois 16h30->16h45)
    const reagendar1 = await request(app)
      .patch(`/agendamentos/${ag15h.body.id}/reagendar`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({ dataHora: '2030-06-10T16:30:00.000Z' });
    assert.equal(reagendar1.status, 200);
    assert.equal(reagendar1.body.dataFim, '2030-06-10T17:30:00.000Z');

    const reagendarSobreposicaoPropria = await request(app)
      .patch(`/agendamentos/${ag15h.body.id}/reagendar`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({ dataHora: '2030-06-10T16:45:00.000Z' });
    assert.equal(reagendarSobreposicaoPropria.status, 200);
    assert.equal(reagendarSobreposicaoPropria.body.dataFim, '2030-06-10T17:45:00.000Z');

    // 5) Cancelamento do atendimento das 14h libera o intervalo e preserva histórico
    const cancelar14h = await request(app)
      .patch(`/agendamentos/${ag14h.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(cancelar14h.status, 200);
    assert.equal(cancelar14h.body.status, 'CANCELADO');

    // Agora às 14h30 deve ser permitido!
    const ag1430Liberado = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: animal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:30:00.000Z',
      });
    assert.equal(ag1430Liberado.status, 201);
    idsCriados.agendamentos.push(ag1430Liberado.body.id);

    // 6) Alterar preço do serviço no catálogo NÃO altera o precoCobrado histórico
    await request(app)
      .put(`/servicos/${srv.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Banho 60min Teste',
        descricao: 'Serviço padrão 60 minutos',
        preco: 120,
        duracaoMin: 60,
      });

    const historico = await request(app)
      .get(`/animais/${animal.body.id}/historico`)
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(historico.status, 200);
    assert.equal(historico.body.atendimentos.length, 3);
    assert.equal(historico.body.atendimentos[0].valorTotal, 70);

    // 7) Serviço usado em agendamento NÃO pode ser excluído
    const excluirSrvEmUso = await request(app)
      .delete(`/servicos/${srv.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    assert.equal(excluirSrvEmUso.status, 409);

    // 8) Requisições simultâneas para o mesmo horário: apenas 1 sucesso e 1 conflito 409
    const [reqA, reqB] = await Promise.all([
      request(app)
        .post('/agendamentos')
        .set('Authorization', `Bearer ${tokenAtendente}`)
        .send({
          animalId: animal.body.id,
          servicoIds: [srv.body.id],
          dataHora: '2030-06-11T10:00:00.000Z',
        }),
      request(app)
        .post('/agendamentos')
        .set('Authorization', `Bearer ${tokenAtendente}`)
        .send({
          animalId: animal.body.id,
          servicoIds: [srv.body.id],
          dataHora: '2030-06-11T10:00:00.000Z',
        }),
    ]);

    const statusList = [reqA.status, reqB.status].sort((a, b) => a - b);
    assert.deepEqual(statusList, [201, 409]);

    const vencedor = reqA.status === 201 ? reqA : reqB;
    idsCriados.agendamentos.push(vencedor.body.id);
  });
});

