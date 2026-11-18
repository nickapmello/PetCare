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

    // Edição sem enviar CPF (fluxo normal da tela): atualiza telefone mantendo CPF original
    const edicaoSemCpf = await request(app)
      .put(`/clientes/${cli.body.id}`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Cliente Teste Integração',
        telefone: '(43) 99876-5432',
        email: 'cliente.teste@exemplo.com',
      });
    assert.equal(edicaoSemCpf.status, 200);
    assert.equal(edicaoSemCpf.body.telefone, '(43) 99876-5432');
    assert.equal(edicaoSemCpf.body.cpf, '39053344705');

    // Edição enviando exatamente o mesmo CPF com pontuação (compatibilidade): aceita edição
    const edicaoMesmoCpf = await request(app)
      .put(`/clientes/${cli.body.id}`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Cliente Teste Atualizado',
        cpf: '390.533.447-05',
        telefone: '(43) 99876-5432',
        email: 'cliente.teste@exemplo.com',
      });
    assert.equal(edicaoMesmoCpf.status, 200);
    assert.equal(edicaoMesmoCpf.body.nome, 'Cliente Teste Atualizado');
    assert.equal(edicaoMesmoCpf.body.cpf, '39053344705');

    // Edição direta na API tentando alterar o CPF: rejeitada antes de gravar qualquer dado
    const edicaoCpfDiferente = await request(app)
      .put(`/clientes/${cli.body.id}`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Nome Que Nao Deve Gravar',
        cpf: '52998224725',
        telefone: '(43) 90000-0000',
        email: 'nao.gravar@exemplo.com',
      });
    assert.equal(edicaoCpfDiferente.status, 400);
    assert.equal(edicaoCpfDiferente.body.erro, 'O CPF não pode ser alterado após o cadastro.');

    const consultaAposTentativa = await request(app)
      .get(`/clientes/${cli.body.id}`)
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(consultaAposTentativa.status, 200);
    assert.equal(consultaAposTentativa.body.nome, 'Cliente Teste Atualizado');
    assert.equal(consultaAposTentativa.body.telefone, '(43) 99876-5432');
    assert.equal(consultaAposTentativa.body.cpf, '39053344705');

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

    // Verificação de duplicidade de clientes:
    // a) CPF já cadastrado bloqueia e retorna clienteExistente
    const checkCpfDup = await request(app)
      .post('/clientes/verificar-duplicidade')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Outro Nome',
        cpf: '390.533.447-05',
        telefone: '(43) 91111-2222',
        email: 'outro@exemplo.com',
      });
    assert.equal(checkCpfDup.status, 200);
    assert.equal(checkCpfDup.body.bloqueadoPorCpf, true);
    assert.equal(checkCpfDup.body.clienteExistente.id, cli.body.id);

    // b) Mesmo nome sozinho (com acentos/espaços/maiúsculas) e outro CPF/telefone/e-mail NÃO acusa duplicidade
    const checkMesmoNomeSozinho = await request(app)
      .post('/clientes/verificar-duplicidade')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: '  clíenté   teste  atualizado ',
        cpf: '935.411.347-80',
        telefone: '(43) 97777-8888',
        email: 'homonimo@exemplo.com',
      });
    assert.equal(checkMesmoNomeSozinho.status, 200);
    assert.equal(checkMesmoNomeSozinho.body.bloqueadoPorCpf, false);
    assert.equal(checkMesmoNomeSozinho.body.possiveisDuplicados.length, 0);

    const cliHomonimo = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Cliente Teste Atualizado',
        cpf: '935.411.347-80',
        telefone: '(43) 97777-8888',
        email: 'homonimo@exemplo.com',
      });
    assert.equal(cliHomonimo.status, 201);
    idsCriados.clientes.push(cliHomonimo.body.id);

    // c) Mesmo nome + mesmo telefone (ou e-mail) com outro CPF acusa possível duplicidade
    const checkDadosParecidos = await request(app)
      .post('/clientes/verificar-duplicidade')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'CLÍENTE  TESTE ATUALIZADO',
        cpf: '123.456.789-09',
        telefone: '43998765432',
        email: 'diferente@exemplo.com',
      });
    assert.equal(checkDadosParecidos.status, 200);
    assert.equal(checkDadosParecidos.body.bloqueadoPorCpf, false);
    assert.equal(checkDadosParecidos.body.possiveisDuplicados.length, 1);
    assert.equal(checkDadosParecidos.body.possiveisDuplicados[0].id, cli.body.id);

    // Busca por nome ignorando acentos/maiúsculas
    const buscaAcento = await request(app)
      .get('/clientes?busca=atualizadó')
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(buscaAcento.status, 200);
    assert.ok(buscaAcento.body.some((c) => c.id === cli.body.id));

    // Verificação de duplicidade de animais:
    // a) Mesmo nome (com acento/espaço/maiúscula) e mesma espécie para o MESMO tutor gera aviso com raça e nascimento
    const checkPetMesmoTutor = await request(app)
      .post('/animais/verificar-duplicidade')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: '  Bób   teste ',
        especie: 'cao',
        clienteId: cli.body.id,
      });
    assert.equal(checkPetMesmoTutor.status, 200);
    assert.equal(checkPetMesmoTutor.body.possiveisDuplicados.length, 1);
    assert.equal(checkPetMesmoTutor.body.possiveisDuplicados[0].raca, 'Beagle');
    assert.ok(checkPetMesmoTutor.body.possiveisDuplicados[0].dataNascimento);

    // b) Mesmo nome e espécie para TUTOR DIFERENTE não acusa duplicidade e permite cadastrar
    const checkPetOutroTutor = await request(app)
      .post('/animais/verificar-duplicidade')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Bob Teste',
        especie: 'Cão',
        clienteId: cliHomonimo.body.id,
      });
    assert.equal(checkPetOutroTutor.status, 200);
    assert.equal(checkPetOutroTutor.body.possiveisDuplicados.length, 0);

    const petOutroTutor = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Bob Teste',
        especie: 'Cão',
        raca: 'Poodle',
        dataNascimento: '2022-07-01',
        clienteId: cliHomonimo.body.id,
      });
    assert.equal(petOutroTutor.status, 201);
    idsCriados.animais.push(petOutroTutor.body.id);

    // c) Tutor com acento encontrado sem acento e vinculado corretamente ao animal
    const tutorAcentuado = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'João André Conceição',
        cpf: '012.345.678-90',
        telefone: '(43) 99555-1234',
        email: 'joao.andre@exemplo.com',
      });
    assert.equal(tutorAcentuado.status, 201);
    idsCriados.clientes.push(tutorAcentuado.body.id);

    const buscaTutorSemAcento = await request(app)
      .get('/clientes?busca=joao andre')
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(buscaTutorSemAcento.status, 200);
    assert.ok(buscaTutorSemAcento.body.some((c) => c.id === tutorAcentuado.body.id));

    const petTutorAcentuado = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Pipoca',
        especie: 'Cão',
        raca: 'Lhasa Apso',
        dataNascimento: '2023-02-14',
        clienteId: tutorAcentuado.body.id,
      });
    assert.equal(petTutorAcentuado.status, 201);
    assert.equal(petTutorAcentuado.body.clienteId, tutorAcentuado.body.id);
    assert.equal(petTutorAcentuado.body.cliente.nome, 'João André Conceição');
    idsCriados.animais.push(petTutorAcentuado.body.id);

    // d) Dois animais com o mesmo nome ("Bob Teste"): lista completa retorna ambos com seus tutores e agendamento salva o ID escolhido
    const listaAnimais = await request(app)
      .get('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(listaAnimais.status, 200);
    const bobs = listaAnimais.body.filter((a) => a.nome === 'Bob Teste');
    assert.equal(bobs.length, 2);

    const listaServicos = await request(app)
      .get('/servicos')
      .set('Authorization', `Bearer ${tokenAtendente}`);
    assert.equal(listaServicos.status, 200);
    assert.ok(listaServicos.body.length > 0);

    const agSegundoBob = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: petOutroTutor.body.id,
        servicoIds: [listaServicos.body[0].id],
        dataHora: '2030-06-15T10:00:00.000Z',
      });
    assert.equal(agSegundoBob.status, 201);
    assert.equal(agSegundoBob.body.animalId, petOutroTutor.body.id);
    assert.equal(agSegundoBob.body.animal.cliente.id, cliHomonimo.body.id);
    idsCriados.agendamentos.push(agSegundoBob.body.id);
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

    const outroAnimal = await request(app)
      .post('/animais')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        nome: 'Rex Agenda',
        especie: 'Cão',
        raca: 'Labrador',
        dataNascimento: '2021-05-12',
        clienteId: cli.body.id,
      });
    assert.equal(outroAnimal.status, 201);
    idsCriados.animais.push(outroAnimal.body.id);

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

    // 2) Bloqueia outro às 14h00 e às 14h30 mesmo para outro animal (agenda única)
    const conflito1400OutroAnimal = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: outroAnimal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:00:00.000Z',
      });
    assert.equal(conflito1400OutroAnimal.status, 409);
    assert.match(conflito1400OutroAnimal.body.erro, /Horário indisponível\. Já existe um atendimento nesse período/);

    const conflito1430 = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: outroAnimal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:30:00.000Z',
      });
    assert.equal(conflito1430.status, 409);

    // 3) Permite outro exatamente às 15h00
    const ag15h = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: outroAnimal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T15:00:00.000Z',
      });
    assert.equal(ag15h.status, 201);
    idsCriados.agendamentos.push(ag15h.body.id);

    // 4) Reagendamento bloqueia conflito com outro atendimento e permite sobrepor apenas o próprio registro
    const reagendarConflito = await request(app)
      .patch(`/agendamentos/${ag15h.body.id}/reagendar`)
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({ dataHora: '2030-06-10T14:30:00.000Z' });
    assert.equal(reagendarConflito.status, 409);
    assert.match(reagendarConflito.body.erro, /Horário indisponível\. Já existe um atendimento nesse período/);

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

    // Agora às 14h00 (e 14h30 se livre) volta a ser permitido!
    const ag14hReutilizado = await request(app)
      .post('/agendamentos')
      .set('Authorization', `Bearer ${tokenAtendente}`)
      .send({
        animalId: outroAnimal.body.id,
        servicoIds: [srv.body.id],
        dataHora: '2030-06-10T14:00:00.000Z',
      });
    assert.equal(ag14hReutilizado.status, 201);
    idsCriados.agendamentos.push(ag14hReutilizado.body.id);

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
    assert.equal(historico.body.atendimentos.length, 1);
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
          animalId: outroAnimal.body.id,
          servicoIds: [srv.body.id],
          dataHora: '2030-06-11T10:00:00.000Z',
        }),
    ]);

    const statusList = [reqA.status, reqB.status].sort((a, b) => a - b);
    assert.deepEqual(statusList, [201, 409]);

    const vencedor = reqA.status === 201 ? reqA : reqB;
    idsCriados.agendamentos.push(vencedor.body.id);

    // 9) Concorrência simultânea entre novo agendamento e reagendamento para o mesmo horário
    const [novoConc, reagConc] = await Promise.all([
      request(app)
        .post('/agendamentos')
        .set('Authorization', `Bearer ${tokenAtendente}`)
        .send({
          animalId: animal.body.id,
          servicoIds: [srv.body.id],
          dataHora: '2030-06-12T10:00:00.000Z',
        }),
      request(app)
        .patch(`/agendamentos/${vencedor.body.id}/reagendar`)
        .set('Authorization', `Bearer ${tokenAtendente}`)
        .send({
          dataHora: '2030-06-12T10:30:00.000Z',
        }),
    ]);

    const statusConcMisto = [novoConc.status, reagConc.status].sort((a, b) => a - b);
    assert.ok(
      (statusConcMisto[0] === 200 && statusConcMisto[1] === 409) ||
        (statusConcMisto[0] === 201 && statusConcMisto[1] === 409),
      `Esperado exatamente um sucesso e um 409, obtido: ${statusConcMisto.join(', ')}`,
    );
    if (novoConc.status === 201) {
      idsCriados.agendamentos.push(novoConc.body.id);
    }
  });
});

