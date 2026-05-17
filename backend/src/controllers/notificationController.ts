import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Fetch all notifications for the currently logged-in user
 */
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized user context.' });
  }

  try {
    const result = await query(`
      SELECT id, notification_type, title, body, deep_link, is_read, sent_at, created_at
      FROM notifications
      WHERE recipient_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    return res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized user context.' });
  }

  try {
    const checkResult = await query(
      'SELECT recipient_id FROM notifications WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (checkResult.rows[0].recipient_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this notification.' });
    }

    await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1
    `, [id]);

    return res.json({ message: 'Notification marked as read successfully.' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to update notification status.' });
  }
};

/**
 * Mark all unread notifications for the user as read
 */
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized user context.' });
  }

  try {
    await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE recipient_id = $1 AND is_read = FALSE
    `, [userId]);

    return res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
};
