import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { query } from '../config/db';

export const windowGuard = (requiredWindowType: 'goal_setting' | 'q1' | 'q2' | 'q3' | 'q4') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Admins can always bypass window restrictions
    if (req.user?.role === 'admin') return next();

    try {
      const cycleId = req.params.cycleId || req.body.cycleId;

      if (!cycleId) {
        return res.status(400).json({ error: 'cycleId is required to check window status' });
      }

      // Check if the window is currently active for the given cycle
      const windowResult = await query(
        `SELECT is_active FROM cycle_windows WHERE cycle_id = $1 AND window_type = $2`,
        [cycleId, requiredWindowType]
      );

      // If no window is configured yet, allow the action (open by default)
      if (windowResult.rows.length === 0) {
        return next();
      }

      if (!windowResult.rows[0].is_active) {
        return res.status(403).json({ error: `The ${requiredWindowType} window is currently closed.` });
      }

      next();
    } catch (error) {
      console.error('Error in windowGuard:', error);
      res.status(500).json({ error: 'Internal server error while checking window status' });
    }
  };
};
