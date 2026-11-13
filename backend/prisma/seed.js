import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  const senhaAdminHash = await bcrypt.hash('Admin@123', 10);
  const senhaAtendenteHash = await bcrypt.hash('Atendente@123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@petcare.com' },
    update: {
      nome: 'Administrador PetCare',
      senhaHash: senhaAdminHash,
      perfil: 'ADMINISTRADOR',
    },
    create: {
      nome: 'Administrador PetCare',
      email: 'admin@petcare.com',
      senhaHash: senhaAdminHash,
      perfil: 'ADMINISTRADOR',
    },
  });

  const atendente = await prisma.usuario.upsert({
    where: { email: 'atendente@petcare.com' },
    update: {
      nome: 'Atendente PetCare',
      senhaHash: senhaAtendenteHash,
      perfil: 'ATENDENTE',
    },
    create: {
      nome: 'Atendente PetCare',
      email: 'atendente@petcare.com',
      senhaHash: senhaAtendenteHash,
      perfil: 'ATENDENTE',
    },
  });

  const servicosBase = [
    {
      nome: 'Banho Porte Pequeno',
      descricao: 'Banho completo com shampoo neutro, secagem e escovação para cães e gatos de pequeno porte.',
      preco: 60.0,
      duracaoMin: 60,
    },
    {
      nome: 'Tosa Higiênica',
      descricao: 'Aparo de pelos nas patas, região íntima e face para higiene e conforto do animal.',
      preco: 45.0,
      duracaoMin: 30,
    },
    {
      nome: 'Banho e Tosa Completa',
      descricao: 'Banho hidratante, tosa na máquina ou tesoura e finalização completa.',
      preco: 110.0,
      duracaoMin: 90,
    },
    {
      nome: 'Corte de Unhas e Ouvidos',
      descricao: 'Aparação cuidadosa das unhas e higienização auricular.',
      preco: 30.0,
      duracaoMin: 20,
    },
  ];

  for (const servico of servicosBase) {
    const existente = await prisma.servico.findFirst({
      where: { nome: servico.nome },
    });
    if (!existente) {
      await prisma.servico.create({ data: servico });
    }
  }

  const cliente1 = await prisma.cliente.upsert({
    where: { cpf: '11144477735' },
    update: {},
    create: {
      nome: 'Mariana Silva',
      cpf: '11144477735',
      telefone: '(43) 99911-2233',
      email: 'mariana.silva@exemplo.com',
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { cpf: '52998224725' },
    update: {},
    create: {
      nome: 'Carlos Eduardo Souza',
      cpf: '52998224725',
      telefone: '(43) 99888-4455',
      email: 'carlos.souza@exemplo.com',
    },
  });

  const animal1Existente = await prisma.animal.findFirst({
    where: { nome: 'Thor', clienteId: cliente1.id },
  });
  if (!animal1Existente) {
    await prisma.animal.create({
      data: {
        nome: 'Thor',
        especie: 'Cão',
        raca: 'Golden Retriever',
        dataNascimento: new Date('2022-05-10'),
        clienteId: cliente1.id,
      },
    });
  }

  const animal2Existente = await prisma.animal.findFirst({
    where: { nome: 'Luna', clienteId: cliente2.id },
  });
  if (!animal2Existente) {
    await prisma.animal.create({
      data: {
        nome: 'Luna',
        especie: 'Gato',
        raca: 'Siamês',
        dataNascimento: new Date('2023-08-22'),
        clienteId: cliente2.id,
      },
    });
  }

  console.log('Seed concluído:', {
    usuarios: [admin.email, atendente.email],
    clientes: [cliente1.nome, cliente2.nome],
  });
}

main()
  .catch((err) => {
    console.error('Erro ao executar seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

