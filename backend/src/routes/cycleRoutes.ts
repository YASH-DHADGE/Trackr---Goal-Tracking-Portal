import { Router } from 'express';
import { getAllCycles, createCycle, updateCycleStatus, getCycleWindows, createOrUpdateWindow } from '../controllers/cycleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);

// Any authenticated user can read cycles
router.get('/', getAllCycles);
router.get('/:id/windows', getCycleWindows);

// Only admin can manage cycles
router.post('/', roleGuard(['admin']), createCycle);
router.patch('/:id', roleGuard(['admin']), updateCycleStatus);
router.post('/:id/windows', roleGuard(['admin']), createOrUpdateWindow);

export default router;

