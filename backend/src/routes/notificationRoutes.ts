import { Router } from 'express';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all notification endpoints
router.use(authMiddleware);

// GET /api/notifications - Get all user notifications
router.get('/', getUserNotifications);

// PATCH /api/notifications/read-all - Mark all user notifications as read
router.patch('/read-all', markAllNotificationsAsRead);

// PATCH /api/notifications/:id/read - Mark a single notification as read
router.patch('/:id/read', markNotificationAsRead);

export default router;
