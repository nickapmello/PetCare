import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';

async function iniciar() {
  try {
    await prisma.$connect();
    const server = app.listen(env.port, () => {
      console.log(`API PetCare em execução em http://localhost:${env.port}`);
    });

    const encerrar = async () => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', encerrar);
    process.on('SIGTERM', encerrar);
  } catch (err) {
    console.error('Falha ao iniciar a API PetCare:', err);
    process.exit(1);
  }
}

iniciar();

