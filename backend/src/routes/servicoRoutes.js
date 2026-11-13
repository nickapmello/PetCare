import { Router } from 'express';
import * as servicoController from '../controllers/servicoController.js';
import { autenticar, exigirPerfil } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticar);

// Leitura liberada para ATENDENTE e ADMINISTRADOR (seleção na agenda)
router.get('/', servicoController.listar);
router.get('/:id', servicoController.buscarPorId);

// Gerenciamento do catálogo restrito ao perfil ADMINISTRADOR (UC03)
router.post('/', exigirPerfil('ADMINISTRADOR'), servicoController.criar);
router.put('/:id', exigirPerfil('ADMINISTRADOR'), servicoController.atualizar);
router.delete('/:id', exigirPerfil('ADMINISTRADOR'), servicoController.excluir);

export default router;

