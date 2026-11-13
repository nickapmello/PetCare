import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import animalRoutes from './routes/animalRoutes.js';
import servicoRoutes from './routes/servicoRoutes.js';
import agendamentoRoutes from './routes/agendamentoRoutes.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'petcare-api' });
});

app.use('/auth', authRoutes);
app.use('/clientes', clienteRoutes);
app.use('/animais', animalRoutes);
app.use('/servicos', servicoRoutes);
app.use('/agendamentos', agendamentoRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use(errorMiddleware);

export default app;

