import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMyGoalSheet = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  const userId = req.user?.userId;

  try {
    const result = await query(
      `SELECT * FROM goal_sheets WHERE employee_id = $1 AND cycle_id = $2`,
      [userId, cycleId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching goal sheet' });
  }
};

export const createGoalSheet = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.body;
  const userId = req.user?.userId;

  try {
    const result = await query(
      `INSERT INTO goal_sheets (employee_id, cycle_id) VALUES ($1, $2) RETURNING *`,
      [userId, cycleId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating goal sheet' });
  }
};

export const submitGoalSheet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const sheetResult = await query(`SELECT * FROM goal_sheets WHERE id = $1 AND employee_id = $2`, [id, userId]);
    if (sheetResult.rows.length === 0) return res.status(404).json({ error: 'Goal sheet not found' });

    const goalsResult = await query(`SELECT weightage FROM goals WHERE goal_sheet_id = $1`, [id]);
    const goals = goalsResult.rows;

    if (goals.length > 8) {
      return res.status(400).json({ error: 'Maximum 8 goals allowed.' });
    }

    const totalWeightage = goals.reduce((sum: number, g: any) => sum + parseFloat(g.weightage), 0);
    if (totalWeightage !== 100) {
      return res.status(400).json({ error: `Total weightage must be exactly 100%. Currently it is ${totalWeightage}%.` });
    }

    const hasInvalidWeight = goals.some((g: any) => parseFloat(g.weightage) < 10);
    if (hasInvalidWeight) {
      return res.status(400).json({ error: 'Each goal must have a minimum of 10% weightage.' });
    }

    await query('BEGIN');
    const updateResult = await query(
      `UPDATE goal_sheets SET status = 'submitted', submitted_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    await query(
      `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type) VALUES ($1, $2, 'submitted')`,
      [id, userId]
    );
    await query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Server error submitting goal sheet' });
  }
};

export const getTeamGoalSheets = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  const managerId = req.user?.userId;

  try {
    const result = await query(
      `SELECT gs.*, u.full_name as employee_name, u.email as employee_email 
       FROM goal_sheets gs
       JOIN user_reporting ur ON gs.employee_id = ur.employee_id
       JOIN users u ON gs.employee_id = u.id
       WHERE ur.manager_id = $1 AND gs.cycle_id = $2 AND ur.is_active = TRUE`,
      [managerId, cycleId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching team goal sheets' });
  }
};

export const approveGoalSheet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const managerId = req.user?.userId;
  const { comments } = req.body;

  try {
    await query('BEGIN');
    const updateResult = await query(
      `UPDATE goal_sheets SET status = 'approved', approved_at = NOW(), approved_by = $1 WHERE id = $2 RETURNING *`,
      [managerId, id]
    );
    await query(`UPDATE goals SET is_locked = TRUE WHERE goal_sheet_id = $1`, [id]);
    await query(
      `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type, comments) VALUES ($1, $2, 'approved', $3)`,
      [id, managerId, comments || null]
    );
    await query('COMMIT');
    
    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Server error approving goal sheet' });
  }
};

export const reworkGoalSheet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const managerId = req.user?.userId;
  const { rework_note } = req.body;

  try {
    await query('BEGIN');
    const updateResult = await query(
      `UPDATE goal_sheets SET status = 'rework_requested', rework_note = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [rework_note, id]
    );
    await query(
      `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type, comments) VALUES ($1, $2, 'rework_requested', $3)`,
      [id, managerId, rework_note]
    );
    await query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Server error returning goal sheet for rework' });
  }
};
