import { Router } from 'express';
import { 
  getAuditLogs, getCompletionReport, getReportingHierarchy, 
  updateReportingHierarchy, exportAchievementReport, 
  getAnalyticsSummary, getPlannedVsActual,
  getGoalDistribution, getTeamQoQTrends, getManagerEffectiveness
} from '../controllers/adminController';
import { getEscalations, getEscalationById, resolveEscalation, ignoreEscalation } from '../controllers/escalationController';
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
router.get('/analytics/goal-distribution', getGoalDistribution);
router.get('/analytics/team-qoq-trends', getTeamQoQTrends);
router.get('/analytics/manager-effectiveness', getManagerEffectiveness);

router.get('/reporting', getReportingHierarchy);
router.post('/reporting', updateReportingHierarchy);

router.get('/escalations', getEscalations);
router.get('/escalations/:id', getEscalationById);
router.put('/escalations/:id/resolve', resolveEscalation);
router.put('/escalations/:id/ignore', ignoreEscalation);

export default router;
