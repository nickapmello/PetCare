import { Router } from 'express';
import * as clienteController from '../controllers/clienteController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticar);

router.get('/', clienteController.listar);
router.get('/:id', clienteController.buscarPorId);
router.post('/', clienteController.criar);
router.put('/:id', clienteController.atualizar);
router.delete('/:id', clienteController.excluir);

export default router;

