import { Router } from 'express';
import * as agendamentoController from '../controllers/agendamentoController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticar);

router.get('/', agendamentoController.listar);
router.get('/:id', agendamentoController.buscarPorId);
router.post('/', agendamentoController.criar);
router.patch('/:id/reagendar', agendamentoController.reagendar);
router.patch('/:id/cancelar', agendamentoController.cancelar);
router.patch('/:id/concluir', agendamentoController.concluir);

export default router;

