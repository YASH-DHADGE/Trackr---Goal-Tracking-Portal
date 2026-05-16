import { Router } from 'express';
import { createSharedGoalGroup, assignSharedGoal, getSharedGoals } from '../controllers/sharedGoalController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);

router.get('/:cycleId', roleGuard(['admin', 'manager']), getSharedGoals);
router.post('/', roleGuard(['admin', 'manager']), createSharedGoalGroup);
router.post('/assign', roleGuard(['admin', 'manager']), assignSharedGoal);

export default router;
