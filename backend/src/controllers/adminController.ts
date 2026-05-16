import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT a.*, u.full_name as changed_by_name 
      FROM audit_logs a 
      JOIN users u ON a.changed_by = u.id 
      ORDER BY a.changed_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
};

export const getCompletionReport = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const result = await query(`
      SELECT 
        u.id as employee_id,
        u.full_name,
        u.email,
        u.department_id,
        gs.status as sheet_status,
        gs.id as sheet_id
      FROM users u
      LEFT JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
      WHERE u.role = 'employee' OR u.role = 'manager'
      ORDER BY u.full_name ASC
    `, [cycleId]);

    // Also get checkin statuses
    const checkinsResult = await query(`
      SELECT employee_id, quarter, employee_status, manager_status 
      FROM quarterly_checkins 
      WHERE cycle_id = $1
    `, [cycleId]);

    const report = result.rows.map(row => {
      const checkins = checkinsResult.rows.filter(c => c.employee_id === row.employee_id);
      return { ...row, checkins };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching completion report' });
  }
};

export const getReportingHierarchy = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT ur.id, ur.employee_id, ur.manager_id, 
             e.full_name as employee_name, e.email as employee_email, e.role as employee_role,
             m.full_name as manager_name, m.email as manager_email
      FROM user_reporting ur
      JOIN users e ON ur.employee_id = e.id
      JOIN users m ON ur.manager_id = m.id
      WHERE ur.is_active = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching hierarchy' });
  }
};

export const updateReportingHierarchy = async (req: AuthRequest, res: Response) => {
  const { employee_id, manager_id } = req.body;
  if (!employee_id || !manager_id) return res.status(400).json({ error: 'Both employee_id and manager_id are required' });

  try {
    const eCheck = await query('SELECT id FROM users WHERE id = $1', [employee_id]);
    const mCheck = await query('SELECT id FROM users WHERE id = $1', [manager_id]);
    if (eCheck.rows.length === 0 || mCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query(`UPDATE user_reporting SET is_active = FALSE WHERE employee_id = $1 AND is_active = TRUE`, [employee_id]);

    const result = await query(`
      INSERT INTO user_reporting (employee_id, manager_id, is_active)
      VALUES ($1, $2, TRUE) RETURNING *
    `, [employee_id, manager_id]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating hierarchy' });
  }
};

export const exportAchievementReport = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const result = await query(`
      SELECT 
        u.full_name as employee_name,
        u.employee_code,
        u.email as employee_email,
        g.title as goal_title,
        g.thrust_area,
        g.uom_type,
        g.weightage,
        g.target_value_numeric as planned_target,
        gpe.quarter,
        gpe.actual_value_numeric as actual_achievement,
        gpe.computed_progress_score,
        gpe.status as goal_status
      FROM users u
      JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
      JOIN goals g ON gs.id = g.goal_sheet_id
      LEFT JOIN (
        SELECT gpe.*, qc.quarter 
        FROM goal_progress_entries gpe
        JOIN quarterly_checkins qc ON gpe.checkin_id = qc.id
      ) gpe ON g.id = gpe.goal_id
      ORDER BY u.full_name, g.title, gpe.quarter
    `, [cycleId]);

    const rows = result.rows;
    if (rows.length === 0) return res.status(404).json({ error: 'No data found' });

    const header = [
      'Employee Name', 'Employee Code', 'Email', 
      'Goal Title', 'Thrust Area', 'UoM', 'Weightage', 
      'Planned Target', 'Quarter', 'Actual Achievement', 
      'Progress Score', 'Status'
    ];
    
    const csvContent = [
      header.join(','),
      ...rows.map(row => [
        `"${row.employee_name}"`,
        `"${row.employee_code}"`,
        `"${row.employee_email}"`,
        `"${row.goal_title}"`,
        `"${row.thrust_area}"`,
        `"${row.uom_type}"`,
        row.weightage,
        row.planned_target || '',
        row.quarter || '',
        row.actual_achievement || '',
        row.computed_progress_score || '',
        row.goal_status || ''
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=achievement_report_${cycleId}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Server error exporting report' });
  }
};
