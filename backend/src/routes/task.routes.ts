import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', TaskController.create);
router.get('/', TaskController.findAll);
router.get('/stats', TaskController.getStats);
router.get('/calendar', TaskController.getByDateRange);
router.get('/:id', TaskController.findById);
router.put('/:id', TaskController.update);
router.patch('/:id/complete', TaskController.complete);
router.delete('/:id', TaskController.delete);

export default router;
