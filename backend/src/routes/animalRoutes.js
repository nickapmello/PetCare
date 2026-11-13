import { Router } from 'express';
import * as animalController from '../controllers/animalController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticar);

router.get('/', animalController.listar);
router.get('/:id/historico', animalController.consultarHistorico);
router.get('/:id', animalController.buscarPorId);
router.post('/', animalController.criar);
router.put('/:id', animalController.atualizar);
router.delete('/:id', animalController.excluir);

export default router;

