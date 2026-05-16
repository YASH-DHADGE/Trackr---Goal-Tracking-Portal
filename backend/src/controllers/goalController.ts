import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

import { writeAuditLog } from '../utils/auditLogger';

export const getGoals = async (req: AuthRequest, res: Response) => {
  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId query param required' });

  try {
    const result = await query('SELECT * FROM goals WHERE goal_sheet_id = $1 ORDER BY sort_order ASC, created_at ASC', [sheetId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching goals' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  const { goal_sheet_id, thrust_area, title, description, uom_type, target_value_numeric, target_value_text, deadline_date, weightage } = req.body;
  const userId = req.user?.userId;

  try {
    const result = await query(
      `INSERT INTO goals (goal_sheet_id, primary_owner_id, thrust_area, title, description, uom_type, target_value_numeric, target_value_text, deadline_date, weightage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [goal_sheet_id, userId, thrust_area, title, description, uom_type, target_value_numeric, target_value_text, deadline_date || null, weightage]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating goal' });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  try {
    const goalResult = await query('SELECT * FROM goals WHERE id = $1', [id]);
    if (goalResult.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    
    const goal = goalResult.rows[0];
    if (goal.is_locked && userRole !== 'admin') {
      return res.status(400).json({ error: 'Cannot update a locked goal' });
    }

    if (goal.is_shared && goal.primary_owner_id !== userId && userRole !== 'admin') {
      const restrictedFields = ['thrust_area', 'title', 'description', 'uom_type', 'target_value_numeric', 'target_value_text', 'deadline_date'];
      for (const field of restrictedFields) {
        if (updates[field] !== undefined) {
          return res.status(403).json({ error: 'Cannot update core fields of a shared goal unless you are the primary owner' });
        }
      }
    }

    const fields = ['thrust_area', 'title', 'description', 'uom_type', 'target_value_numeric', 'target_value_text', 'deadline_date', 'weightage'];
    const actualUpdates = fields.filter(f => updates[f] !== undefined);
    
    if (actualUpdates.length === 0) return res.json(goal);

    const setClause = actualUpdates.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = actualUpdates.map(f => updates[f]);

    const queryStr = `UPDATE goals SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`;
    const result = await query(queryStr, [...values, id]);
    const updatedGoal = result.rows[0];

    // Audit logging for locked goals
    if (goal.is_locked && userRole === 'admin') {
      for (const field of actualUpdates) {
        if (updates[field] !== goal[field]) {
          await writeAuditLog({
            entityType: 'goal',
            entityId: id as string,
            fieldName: field,
            oldValue: goal[field],
            newValue: updates[field],
            changedBy: userId!,
            changeReason: req.body.changeReason || 'Admin override'
          });
        }
      }
    }

    res.json(updatedGoal);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating goal' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const goalResult = await query('SELECT is_locked FROM goals WHERE id = $1', [id]);
    if (goalResult.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    if (goalResult.rows[0].is_locked) return res.status(400).json({ error: 'Cannot delete a locked goal' });

    await query('DELETE FROM goals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error deleting goal' });
  }
};
