import { Router } from 'express';
import { getMyGoalSheet, createGoalSheet, submitGoalSheet, getTeamGoalSheets, approveGoalSheet, reworkGoalSheet, unlockGoalSheet, getManagerPlannedVsActual } from '../controllers/goalSheetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { windowGuard } from '../middleware/windowGuard';

const router = Router();

router.use(authMiddleware);

// Employee routes
/**
 * @swagger
 * /api/goal-sheets/me/{cycleId}:
 *   get:
 *     summary: Get my goal sheet for a cycle
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Goal sheet data }
 */
router.get('/me/:cycleId', roleGuard(['employee', 'manager', 'admin']), getMyGoalSheet);

/**
 * @swagger
 * /api/goal-sheets:
 *   post:
 *     summary: Create a new goal sheet
 *     tags: [Goal Sheets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cycle_id]
 *             properties:
 *               cycle_id: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', roleGuard(['employee', 'manager', 'admin']), windowGuard('goal_setting'), createGoalSheet);

/**
 * @swagger
 * /api/goal-sheets/{id}/submit:
 *   post:
 *     summary: Submit goal sheet for review
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Submitted }
 *       400: { description: Validation failed }
 */
router.post('/:id/submit', roleGuard(['employee', 'manager', 'admin']), windowGuard('goal_setting'), submitGoalSheet);

// Manager routes
/**
 * @swagger
 * /api/goal-sheets/team/{cycleId}:
 *   get:
 *     summary: Get team goal sheets (Manager only)
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of team goal sheets }
 */
router.get('/team/:cycleId', roleGuard(['manager', 'admin']), getTeamGoalSheets);

/**
 * @swagger
 * /api/goal-sheets/team/{cycleId}/planned-vs-actual:
 *   get:
 *     summary: Get team planned vs actual analytics (Manager only)
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Planned vs Actual data }
 */
router.get('/team/:cycleId/planned-vs-actual', roleGuard(['manager', 'admin']), getManagerPlannedVsActual);

/**
 * @swagger
 * /api/goal-sheets/{id}/approve:
 *   patch:
 *     summary: Approve a goal sheet
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Approved }
 */
router.patch('/:id/approve', roleGuard(['manager', 'admin']), approveGoalSheet);

/**
 * @swagger
 * /api/goal-sheets/{id}/rework:
 *   patch:
 *     summary: Request rework for a goal sheet
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Rework requested }
 */
router.patch('/:id/rework', roleGuard(['manager', 'admin']), reworkGoalSheet);

/**
 * @swagger
 * /api/goal-sheets/{id}/unlock:
 *   post:
 *     summary: Unlock a goal sheet for edits (Admin only)
 *     tags: [Goal Sheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Unlocked }
 */
router.post('/:id/unlock', roleGuard(['admin']), unlockGoalSheet);

export default router;
