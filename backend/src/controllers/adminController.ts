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

export const getAnalyticsSummary = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const statsResult = await query(`
      SELECT 
        COUNT(u.id) as total_employees,
        COUNT(gs.id) as total_sheets,
        SUM(CASE WHEN gs.status IN ('submitted', 'approved', 'locked', 'rework_requested') THEN 1 ELSE 0 END) as submitted_sheets,
        SUM(CASE WHEN gs.status IN ('approved', 'locked') THEN 1 ELSE 0 END) as approved_sheets,
        SUM(CASE WHEN gs.status = 'draft' THEN 1 ELSE 0 END) as draft_sheets,
        SUM(CASE WHEN gs.status = 'rework_requested' THEN 1 ELSE 0 END) as rework_sheets
      FROM users u
      LEFT JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
      WHERE u.role IN ('employee', 'manager') AND u.is_active = TRUE
    `, [cycleId]);

    const quarterScores = await query(`
      SELECT qc.quarter, AVG(gpe.computed_progress_score) as avg_score
      FROM quarterly_checkins qc
      JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id
      WHERE qc.cycle_id = $1 AND gpe.computed_progress_score IS NOT NULL
      GROUP BY qc.quarter
    `, [cycleId]);

    const stats = statsResult.rows[0];
    res.json({
      totalEmployees: parseInt(stats.total_employees || '0'),
      totalSheets: parseInt(stats.total_sheets || '0'),
      submittedSheets: parseInt(stats.submitted_sheets || '0'),
      approvedSheets: parseInt(stats.approved_sheets || '0'),
      draftSheets: parseInt(stats.draft_sheets || '0'),
      reworkSheets: parseInt(stats.rework_sheets || '0'),
      quarterlyAverages: quarterScores.rows.reduce((acc, row) => {
        acc[row.quarter] = parseFloat(row.avg_score).toFixed(1);
        return acc;
      }, {} as Record<string, string>)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching analytics summary' });
  }
};

export const getPlannedVsActual = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    // Only fetch for approved/locked sheets
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
      JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
      JOIN goals g ON gs.id = g.goal_sheet_id
      LEFT JOIN quarterly_checkins qc ON gs.id = qc.goal_sheet_id
      LEFT JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id AND g.id = gpe.goal_id
      WHERE gs.status IN ('approved', 'locked')
      ORDER BY u.full_name, g.id, qc.quarter
    `, [cycleId]);

    // Group by employee, then by goal
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
    res.status(500).json({ error: 'Server error fetching planned vs actual data' });
  }
};

export const getGoalDistribution = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const result = await query(`
      SELECT thrust_area, uom_type,
             COUNT(g.id) as goal_count,
             AVG(gpe.computed_progress_score) as avg_score
      FROM goals g
      JOIN goal_sheets gs ON g.goal_sheet_id = gs.id
      LEFT JOIN goal_progress_entries gpe ON g.id = gpe.goal_id
      WHERE gs.cycle_id = $1
      GROUP BY thrust_area, uom_type
      ORDER BY thrust_area
    `, [cycleId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching goal distribution' });
  }
};

export const getTeamQoQTrends = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const result = await query(`
      SELECT d.name as department, qc.quarter,
             AVG(gpe.computed_progress_score) as avg_score,
             COUNT(DISTINCT u.id) as employee_count
      FROM quarterly_checkins qc
      JOIN users u ON qc.employee_id = u.id
      JOIN departments d ON u.department_id = d.id
      JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id
      WHERE qc.cycle_id = $1 AND gpe.computed_progress_score IS NOT NULL
      GROUP BY d.name, qc.quarter
      ORDER BY d.name, qc.quarter
    `, [cycleId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching QoQ trends' });
  }
};

export const getManagerEffectiveness = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

  try {
    const result = await query(`
      SELECT m.id, m.full_name as manager_name,
             COUNT(DISTINCT ur.employee_id) as team_size,
             COUNT(DISTINCT qc.id) FILTER (WHERE qc.manager_status = 'completed') as reviewed_checkins,
             COUNT(DISTINCT qc.id) as total_checkins,
             AVG(gpe.computed_progress_score) as avg_team_score
      FROM users m
      JOIN user_reporting ur ON m.id = ur.manager_id AND ur.is_active = TRUE
      LEFT JOIN quarterly_checkins qc ON ur.employee_id = qc.employee_id AND qc.cycle_id = $1
      LEFT JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id
      WHERE m.role = 'manager'
      GROUP BY m.id, m.full_name
      ORDER BY avg_team_score DESC NULLS LAST
    `, [cycleId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching manager effectiveness' });
  }
};
