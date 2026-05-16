import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { computeScore } from '../utils/scoreComputer';

export const getMyCheckin = async (req: AuthRequest, res: Response) => {
  const { cycleId, quarter } = req.params;
  const userId = req.user?.userId;

  try {
    const result = await query(
      `SELECT * FROM quarterly_checkins WHERE employee_id = $1 AND cycle_id = $2 AND quarter = $3`,
      [userId, cycleId, quarter]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching check-in' });
  }
};

export const saveMyCheckin = async (req: AuthRequest, res: Response) => {
  const { cycleId, quarter } = req.params;
  const userId = req.user?.userId;
  const { entries } = req.body;

  try {
    await query('BEGIN');
    
    let checkinResult = await query(
      `SELECT id FROM quarterly_checkins WHERE employee_id = $1 AND cycle_id = $2 AND quarter = $3`,
      [userId, cycleId, quarter]
    );

    let checkinId;
    if (checkinResult.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO quarterly_checkins (employee_id, cycle_id, quarter, employee_status) VALUES ($1, $2, $3, 'in_progress') RETURNING id`,
        [userId, cycleId, quarter]
      );
      checkinId = insertResult.rows[0].id;
    } else {
      checkinId = checkinResult.rows[0].id;
    }

    for (const entry of entries) {
      const goalRes = await query(`SELECT uom_type, target_value_numeric, target_value_text, deadline_date FROM goals WHERE id = $1`, [entry.goal_id]);
      if (goalRes.rows.length === 0) continue;

      const goal = goalRes.rows[0];
      const snapshot = JSON.stringify({
        target_value_numeric: goal.target_value_numeric,
        target_value_text: goal.target_value_text,
        deadline_date: goal.deadline_date
      });

      const score = computeScore(
        goal.uom_type,
        goal.target_value_numeric,
        entry.actual_value_numeric,
        goal.deadline_date,
        entry.completion_date ? new Date(entry.completion_date) : null
      );

      await query(
        `INSERT INTO goal_progress_entries 
         (checkin_id, goal_id, planned_target_snapshot, actual_value_numeric, actual_value_text, completion_date, status, computed_progress_score, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (checkin_id, goal_id) 
         DO UPDATE SET 
            actual_value_numeric = EXCLUDED.actual_value_numeric,
            actual_value_text = EXCLUDED.actual_value_text,
            completion_date = EXCLUDED.completion_date,
            status = EXCLUDED.status,
            computed_progress_score = EXCLUDED.computed_progress_score,
            remarks = EXCLUDED.remarks,
            updated_at = NOW()`,
        [checkinId, entry.goal_id, snapshot, entry.actual_value_numeric, entry.actual_value_text, entry.completion_date || null, entry.status, score, entry.remarks]
      );
    }

    await query('COMMIT');
    res.json({ success: true, checkinId });
  } catch (error: any) {
    await query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Server error saving check-in' });
  }
};

export const submitMyCheckin = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE quarterly_checkins SET employee_status = 'submitted', employee_submitted_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error submitting check-in' });
  }
};

export const getTeamCheckins = async (req: AuthRequest, res: Response) => {
  const { cycleId, quarter } = req.params;
  const managerId = req.user?.userId;

  try {
    const result = await query(
      `SELECT qc.*, u.full_name as employee_name
       FROM quarterly_checkins qc
       JOIN user_reporting ur ON qc.employee_id = ur.employee_id
       JOIN users u ON qc.employee_id = u.id
       WHERE ur.manager_id = $1 AND qc.cycle_id = $2 AND qc.quarter = $3 AND ur.is_active = TRUE`,
      [managerId, cycleId, quarter]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching team check-ins' });
  }
};
