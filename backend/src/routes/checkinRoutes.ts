import { Router } from 'express';
import { getMyCheckin, saveMyCheckin, submitMyCheckin, getTeamCheckins } from '../controllers/checkinController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);

// Employee routes
router.get('/me/:cycleId/:quarter', roleGuard(['employee', 'manager', 'admin']), getMyCheckin);
router.put('/me/:cycleId/:quarter', roleGuard(['employee', 'manager', 'admin']), saveMyCheckin);
router.patch('/:id/submit', roleGuard(['employee', 'manager', 'admin']), submitMyCheckin);

// Manager routes
router.get('/team/:cycleId/:quarter', roleGuard(['manager', 'admin']), getTeamCheckins);

export default router;
