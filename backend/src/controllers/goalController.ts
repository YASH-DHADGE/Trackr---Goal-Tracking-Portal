import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

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

  try {
    const goalResult = await query('SELECT is_locked FROM goals WHERE id = $1', [id]);
    if (goalResult.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    if (goalResult.rows[0].is_locked) return res.status(400).json({ error: 'Cannot update a locked goal' });

    const fields = ['thrust_area', 'title', 'description', 'uom_type', 'target_value_numeric', 'target_value_text', 'deadline_date', 'weightage'];
    const setClause = fields.filter(f => updates[f] !== undefined).map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.filter(f => updates[f] !== undefined).map(f => updates[f]);

    if (values.length === 0) return res.json(goalResult.rows[0]);

    const queryStr = `UPDATE goals SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`;
    const result = await query(queryStr, [...values, id]);
    res.json(result.rows[0]);
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
