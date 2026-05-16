import { Router } from 'express';
import { getMyGoalSheet, createGoalSheet, submitGoalSheet, getTeamGoalSheets, approveGoalSheet, reworkGoalSheet, unlockGoalSheet } from '../controllers/goalSheetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { windowGuard } from '../middleware/windowGuard';

const router = Router();

router.use(authMiddleware);

// Employee routes
router.get('/me/:cycleId', roleGuard(['employee', 'manager', 'admin']), getMyGoalSheet);
router.post('/', roleGuard(['employee', 'manager', 'admin']), windowGuard('goal_setting'), createGoalSheet);
router.post('/:id/submit', roleGuard(['employee', 'manager', 'admin']), windowGuard('goal_setting'), submitGoalSheet);

// Manager routes
router.get('/team/:cycleId', roleGuard(['manager', 'admin']), getTeamGoalSheets);
router.patch('/:id/approve', roleGuard(['manager', 'admin']), approveGoalSheet);
router.patch('/:id/rework', roleGuard(['manager', 'admin']), reworkGoalSheet);
router.post('/:id/unlock', roleGuard(['admin']), unlockGoalSheet);

export default router;
