import { Response } from 'express';
import { query, getClient } from '../config/db';
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
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    const checkin = result.rows[0];
    const entriesResult = await query(
      `SELECT * FROM goal_progress_entries WHERE checkin_id = $1`,
      [checkin.id]
    );
    
    checkin.entries = entriesResult.rows;
    res.json(checkin);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching check-in' });
  }
};

export const saveMyCheckin = async (req: AuthRequest, res: Response) => {
  const { cycleId, quarter } = req.params;
  const userId = req.user?.userId;
  const { entries } = req.body;

  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      let checkinResult = await client.query(
        `SELECT id FROM quarterly_checkins WHERE employee_id = $1 AND cycle_id = $2 AND quarter = $3`,
        [userId, cycleId, quarter]
      );
  
      let checkinId;
      if (checkinResult.rows.length === 0) {
        const insertResult = await client.query(
          `INSERT INTO quarterly_checkins (employee_id, cycle_id, quarter, employee_status) VALUES ($1, $2, $3, 'in_progress') RETURNING id`,
          [userId, cycleId, quarter]
        );
        checkinId = insertResult.rows[0].id;
      } else {
        checkinId = checkinResult.rows[0].id;
      }
  
      for (const entry of entries) {
        const goalRes = await client.query(`SELECT uom_type, target_value_numeric, target_value_text, deadline_date FROM goals WHERE id = $1`, [entry.goal_id]);
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
  
        await client.query(
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

        // Fan-out sync for shared goals
        if (goal.shared_goal_group_id && goal.primary_owner_id === userId) {
          const assignees = await client.query(
            `SELECT g.id as linked_goal_id, g.goal_sheet_id, gs.employee_id
             FROM goals g
             JOIN goal_sheets gs ON g.goal_sheet_id = gs.id
             WHERE g.shared_goal_group_id = $1 AND g.id != $2`,
            [goal.shared_goal_group_id, entry.goal_id]
          );

          for (const assignee of assignees.rows) {
            let assigneeCheckinRes = await client.query(
              `SELECT id FROM quarterly_checkins WHERE employee_id = $1 AND cycle_id = $2 AND quarter = $3`,
              [assignee.employee_id, cycleId, quarter]
            );
            
            let assigneeCheckinId;
            if (assigneeCheckinRes.rows.length === 0) {
              const newCheckin = await client.query(
                `INSERT INTO quarterly_checkins (employee_id, cycle_id, quarter, employee_status) VALUES ($1, $2, $3, 'not_started') RETURNING id`,
                [assignee.employee_id, cycleId, quarter]
              );
              assigneeCheckinId = newCheckin.rows[0].id;
            } else {
              assigneeCheckinId = assigneeCheckinRes.rows[0].id;
            }

            await client.query(
              `INSERT INTO goal_progress_entries 
               (checkin_id, goal_id, planned_target_snapshot, actual_value_numeric, actual_value_text, completion_date, status, computed_progress_score, remarks, is_synced_from_primary_owner)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
               ON CONFLICT (checkin_id, goal_id) 
               DO UPDATE SET 
                  actual_value_numeric = EXCLUDED.actual_value_numeric,
                  actual_value_text = EXCLUDED.actual_value_text,
                  completion_date = EXCLUDED.completion_date,
                  status = EXCLUDED.status,
                  computed_progress_score = EXCLUDED.computed_progress_score,
                  is_synced_from_primary_owner = TRUE,
                  updated_at = NOW()`,
              [assigneeCheckinId, assignee.linked_goal_id, snapshot, entry.actual_value_numeric, entry.actual_value_text, entry.completion_date || null, entry.status, score, entry.remarks]
            );
          }
        }
      }
  
      await client.query('COMMIT');
      res.json({ success: true, checkinId });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
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

export const getCheckinById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT qc.*, u.full_name as employee_name 
       FROM quarterly_checkins qc
       JOIN users u ON qc.employee_id = u.id
       WHERE qc.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Check-in not found' });
    }
    
    const checkin = result.rows[0];
    const entriesResult = await query(
      `SELECT * FROM goal_progress_entries WHERE checkin_id = $1`,
      [id]
    );
    
    checkin.entries = entriesResult.rows;
    res.json(checkin);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching check-in' });
  }
};

export const managerReviewCheckin = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { comment_text } = req.body;
  const managerId = req.user?.userId;

  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const checkinRes = await client.query(`SELECT * FROM quarterly_checkins WHERE id = $1`, [id]);
      if (checkinRes.rows.length === 0) {
        return res.status(404).json({ error: 'Checkin not found' });
      }

      await client.query(
        `UPDATE quarterly_checkins SET manager_status = 'completed', manager_reviewed_at = NOW() WHERE id = $1`,
        [id]
      );

      if (comment_text) {
        await client.query(
          `INSERT INTO checkin_comments (checkin_id, manager_id, comment_text) VALUES ($1, $2, $3)`,
          [id, managerId, comment_text]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error reviewing check-in' });
  }
};
