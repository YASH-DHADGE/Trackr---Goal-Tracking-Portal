import { Response } from 'express';
import { query, getClient } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { writeAuditLog } from '../utils/auditLogger';
import { sendNotification } from '../utils/emailService';
import { validateGoalSheetWeightage } from '../utils/validation';

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

    const validation = validateGoalSheetWeightage(goals);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE goal_sheets SET status = 'submitted', submitted_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      await client.query(
        `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type) VALUES ($1, $2, 'submitted')`,
        [id, userId]
      );
      await client.query('COMMIT');

      // Notify Manager
      const managerQuery = await query(`
        SELECT m.email, m.full_name, e.full_name as employee_name
        FROM user_reporting ur
        JOIN users m ON ur.manager_id = m.id
        JOIN users e ON ur.employee_id = e.id
        WHERE ur.employee_id = $1 AND ur.is_active = TRUE
      `, [userId]);
      if (managerQuery.rows.length > 0) {
        const { email, full_name, employee_name } = managerQuery.rows[0];
        sendNotification(email, 'Goal Sheet Submitted for Review', `Hi ${full_name},\n\n${employee_name} has submitted their goal sheet and it is pending your review.\n\nPlease log in to the portal to review and approve.`);
      }

      res.json(updateResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting goal sheet' });
  }
};

export const getTeamGoalSheets = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  const managerId = req.user?.userId;

  try {
    const result = await query(
      `SELECT 
        u.id as employee_id, 
        u.full_name as employee_name, 
        u.email as employee_email,
        gs.id as id,
        COALESCE(gs.status, 'draft') as status,
        gs.submitted_at
       FROM user_reporting ur
       JOIN users u ON ur.employee_id = u.id
       LEFT JOIN goal_sheets gs ON gs.employee_id = u.id AND gs.cycle_id = $2
       WHERE ur.manager_id = $1 AND ur.is_active = TRUE`,
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
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE goal_sheets SET status = 'approved', approved_at = NOW(), approved_by = $1 WHERE id = $2 RETURNING *`,
        [managerId, id]
      );
      await client.query(`UPDATE goals SET is_locked = TRUE WHERE goal_sheet_id = $1`, [id]);
      await client.query(
        `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type, comments) VALUES ($1, $2, 'approved', $3)`,
        [id, managerId, comments || null]
      );
      await client.query('COMMIT');

      await writeAuditLog({
        entityType: 'goal_sheet',
        entityId: id as string,
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved',
        changedBy: managerId!,
        changeReason: comments || 'Goal sheet approved by manager'
      });

      // Notify Employee
      const empQuery = await query(`SELECT u.email, u.full_name FROM users u JOIN goal_sheets gs ON u.id = gs.employee_id WHERE gs.id = $1`, [id]);
      if (empQuery.rows.length > 0) {
        const { email, full_name } = empQuery.rows[0];
        sendNotification(email, 'Goal Sheet Approved', `Hi ${full_name},\n\nYour goal sheet has been approved by your manager.`);
      }

      res.json(updateResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error approving goal sheet' });
  }
};

export const reworkGoalSheet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const managerId = req.user?.userId;
  const { rework_note } = req.body;

  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE goal_sheets SET status = 'rework_requested', rework_note = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [rework_note, id]
      );
      await client.query(
        `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type, comments) VALUES ($1, $2, 'rework_requested', $3)`,
        [id, managerId, rework_note]
      );
      await client.query('COMMIT');

      await writeAuditLog({
        entityType: 'goal_sheet',
        entityId: id as string,
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'rework_requested',
        changedBy: managerId!,
        changeReason: rework_note || 'Rework requested by manager'
      });

      // Notify Employee
      const empQuery = await query(`SELECT u.email, u.full_name FROM users u JOIN goal_sheets gs ON u.id = gs.employee_id WHERE gs.id = $1`, [id]);
      if (empQuery.rows.length > 0) {
        const { email, full_name } = empQuery.rows[0];
        sendNotification(email, 'Goal Sheet Rework Requested', `Hi ${full_name},\n\nYour manager has requested rework on your goal sheet:\n\n"${rework_note}"\n\nPlease log in to make the necessary changes.`);
      }

      res.json(updateResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error returning goal sheet for rework' });
  }
};

export const unlockGoalSheet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const { comments } = req.body;

  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const oldSheetRes = await client.query(`SELECT status FROM goal_sheets WHERE id = $1`, [id]);
      const oldStatus = oldSheetRes.rows[0]?.status;

      const updateResult = await client.query(
        `UPDATE goal_sheets SET status = 'rework_requested', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      await client.query(`UPDATE goals SET is_locked = FALSE WHERE goal_sheet_id = $1`, [id]);
      await client.query(
        `INSERT INTO goal_approvals (goal_sheet_id, action_by, action_type, comments) VALUES ($1, $2, 'unlocked_by_admin', $3)`,
        [id, adminId, comments || 'Unlocked for exception handling']
      );

      await writeAuditLog({
        entityType: 'goal_sheet',
        entityId: id as string,
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: 'rework_requested',
        changedBy: adminId!,
        changeReason: comments || 'Unlocked for exception handling'
      });

      await client.query('COMMIT');
      res.json(updateResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error unlocking goal sheet' });
  }
};

export const getManagerPlannedVsActual = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  const managerId = req.user?.userId;

  try {
    const result = await query(`
      SELECT 
        u.id as employee_id,
        u.full_name as employee_name,
        g.id as goal_id,
        g.title as goal_title,
        g.thrust_area,
        g.weightage,
        g.uom_type,
        g.target_value_numeric as planned_numeric,
        g.target_value_text as planned_text,
        g.deadline_date as planned_deadline,
        qc.quarter,
        gpe.actual_value_numeric as actual_numeric,
        gpe.actual_value_text as actual_text,
        gpe.completion_date as actual_date,
        gpe.computed_progress_score as progress_score
      FROM users u
      JOIN user_reporting ur ON u.id = ur.employee_id
      JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
      JOIN goals g ON gs.id = g.goal_sheet_id
      LEFT JOIN quarterly_checkins qc ON gs.id = qc.goal_sheet_id
      LEFT JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id AND g.id = gpe.goal_id
      WHERE gs.status IN ('approved', 'locked') AND ur.manager_id = $2 AND ur.is_active = TRUE
      ORDER BY u.full_name, g.id, qc.quarter
    `, [cycleId, managerId]);

    const data: Record<string, any> = {};
    
    result.rows.forEach(row => {
      if (!data[row.employee_id]) {
        data[row.employee_id] = {
          employeeName: row.employee_name,
          goals: {}
        };
      }
      
      const emp = data[row.employee_id];
      if (!emp.goals[row.goal_id]) {
        emp.goals[row.goal_id] = {
          id: row.goal_id,
          title: row.goal_title,
          thrustArea: row.thrust_area,
          weightage: row.weightage,
          uomType: row.uom_type,
          plannedTarget: row.planned_numeric || row.planned_deadline || row.planned_text,
          q1: null, q2: null, q3: null, q4: null
        };
      }
      
      if (row.quarter) {
        emp.goals[row.goal_id][row.quarter] = {
          actual: row.actual_numeric || row.actual_date || row.actual_text,
          score: row.progress_score
        };
      }
    });

    res.json(Object.values(data).map(emp => ({
      employeeName: emp.employeeName,
      goals: Object.values(emp.goals)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching team planned vs actual data' });
  }
};

export const exportTeamGoalSheets = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  const managerId = req.user?.userId;

  try {
    const result = await query(
      `SELECT 
        u.full_name as employee_name, 
        u.email as employee_email,
        COALESCE(gs.status, 'draft') as status,
        gs.submitted_at,
        g.title as goal_title,
        g.thrust_area,
        g.weightage,
        g.uom_type,
        COALESCE(g.target_value_numeric::text, g.target_value_text, g.deadline_date::text) as target
       FROM user_reporting ur
       JOIN users u ON ur.employee_id = u.id
       LEFT JOIN goal_sheets gs ON gs.employee_id = u.id AND gs.cycle_id = $2
       LEFT JOIN goals g ON gs.id = g.goal_sheet_id
       WHERE ur.manager_id = $1 AND ur.is_active = TRUE
       ORDER BY u.full_name, g.id`,
      [managerId, cycleId]
    );

    const rows = result.rows;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const header = ['Employee Name', 'Employee Email', 'Sheet Status', 'Submitted At', 'Goal Title', 'Thrust Area', 'Weightage (%)', 'UOM Type', 'Target'];
    const csvData = [
      header.join(','),
      ...rows.map(row => [
        `"${row.employee_name}"`,
        `"${row.employee_email}"`,
        `"${row.status.toUpperCase()}"`,
        `"${row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : 'N/A'}"`,
        `"${row.goal_title || 'N/A'}"`,
        `"${row.thrust_area || 'N/A'}"`,
        row.weightage || 0,
        `"${row.uom_type || 'N/A'}"`,
        `"${row.target || 'N/A'}"`
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=team_goals_export_${cycleId}.csv`);
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ error: 'Server error exporting team goal sheets' });
  }
};
