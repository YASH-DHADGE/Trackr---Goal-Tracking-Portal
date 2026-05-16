import { Router } from 'express';
import { getAuditLogs, getCompletionReport, getReportingHierarchy, updateReportingHierarchy, exportAchievementReport, getAnalyticsSummary, getPlannedVsActual } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/audit-logs', getAuditLogs);
router.get('/reports/completion', getCompletionReport);
router.get('/reports/achievement/export', exportAchievementReport);
router.get('/analytics/summary', getAnalyticsSummary);
router.get('/analytics/planned-vs-actual', getPlannedVsActual);
router.get('/reporting', getReportingHierarchy);
router.post('/reporting', updateReportingHierarchy);

export default router;
