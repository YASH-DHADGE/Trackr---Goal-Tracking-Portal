import { query, getClient } from '../config/db';
import { sendNotification } from '../utils/emailService';

async function processEscalation(
  triggerType: string,
  targetUserId: string,
  cycleId: string,
  quarter: string | null,
  employeeName: string,
  employeeEmail: string,
  managerName: string | null,
  managerEmail: string | null,
  windowCloseDate: Date
) {
  const msOverdue = Date.now() - windowCloseDate.getTime();
  const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));
  
  if (daysOverdue < 1) return; // Only trigger if at least 1 day overdue

  let queryStr = `
    SELECT * FROM escalations 
    WHERE trigger_type = $1 AND target_user_id = $2 AND cycle_id = $3 AND status = 'open'
  `;
  const params: any[] = [triggerType, targetUserId, cycleId];
  
  if (quarter) {
    queryStr += ` AND quarter = $4`;
    params.push(quarter);
  } else {
    queryStr += ` AND quarter IS NULL`;
  }

  const escRes = await query(queryStr, params);
  const esc = escRes.rows[0];

  const subjectSuffix = quarter ? `for ${quarter.toUpperCase()}` : 'for Goal Setting';

  if (!esc) {
    // Level 1: Employee
    await query(`
      INSERT INTO escalations (trigger_type, target_user_id, cycle_id, quarter, escalation_level, status, days_overdue)
      VALUES ($1, $2, $3, $4, 1, 'open', $5)
    `, [triggerType, targetUserId, cycleId, quarter, daysOverdue]);
    
    console.log(`[L1 Escalation] ${employeeEmail} (Days Overdue: ${daysOverdue})`);
    sendNotification(employeeEmail, `URGENT: Deadline Missed ${subjectSuffix}`, `Hi ${employeeName},\n\nYou missed a deadline ${subjectSuffix} by ${daysOverdue} days. Please complete this action immediately.`);
  } else {
    const currentLevel = esc.escalation_level;
    let newLevel = currentLevel;
    
    if (currentLevel === 1 && daysOverdue >= 3) {
      newLevel = 2; // Level 2: Manager
      console.log(`[L2 Escalation] Notifying Manager ${managerEmail} for ${employeeEmail} (Days Overdue: ${daysOverdue})`);
      if (managerEmail) {
         sendNotification(managerEmail, `ESCALATION: Team Member Deadline Missed ${subjectSuffix}`, `Hi ${managerName},\n\nYour team member ${employeeName} missed a deadline ${subjectSuffix} by ${daysOverdue} days.`);
      }
    } else if (currentLevel === 2 && daysOverdue >= 7) {
      newLevel = 3; // Level 3: Admin / HR
      console.log(`[L3 Escalation] Notifying HR for ${employeeEmail} (Days Overdue: ${daysOverdue})`);
      const adminRes = await query(`SELECT email FROM users WHERE role = 'admin' AND is_active = TRUE`);
      for (const admin of adminRes.rows) {
         sendNotification(admin.email, `HR ESCALATION: Severe Delay ${subjectSuffix}`, `Hi Admin,\n\nEmployee ${employeeName} missed a deadline ${subjectSuffix} by ${daysOverdue} days. Immediate action required.`);
      }
    }
    
    // Always update days overdue, and potentially level
    await query(`
      UPDATE escalations 
      SET days_overdue = $1, escalation_level = $2, notified_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [daysOverdue, newLevel, esc.id]);
  }
}

export async function checkDeadlines() {
  console.log('Running deadline check...');
  try {
    const activeCycles = await query(`SELECT * FROM review_cycles WHERE status = 'active'`);
    
    for (const cycle of activeCycles.rows) {
      const windows = await query(`SELECT * FROM cycle_windows WHERE cycle_id = $1`, [cycle.id]);
      
      // 1. Check missed goal setting
      const goalSettingWin = windows.rows.find(w => w.window_type === 'goal_setting');
      if (goalSettingWin && !goalSettingWin.is_active && goalSettingWin.closes_at && new Date(goalSettingWin.closes_at) < new Date()) {
        const missingSheets = await query(`
          SELECT u.id, u.email, u.full_name, m.email as manager_email, m.full_name as manager_name
          FROM users u
          LEFT JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
          LEFT JOIN users m ON ur.manager_id = m.id
          LEFT JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
          WHERE u.role IN ('employee', 'manager') AND u.is_active = TRUE AND (gs.id IS NULL OR gs.status = 'draft')
        `, [cycle.id]);

        for (const row of missingSheets.rows) {
          await processEscalation(
            'goal_not_submitted', row.id, cycle.id, null,
            row.full_name, row.email, row.manager_name, row.manager_email,
            new Date(goalSettingWin.closes_at)
          );
        }
      }

      // 2. Check delayed manager approvals
      // A sheet is 'submitted' but the manager hasn't approved it for N days.
      // In our model, we'll track the delay from the goal_setting window close date for simplicity, 
      // or we can track it from gs.updated_at. Let's use the window close date if it's strictly a cycle rule.
      if (goalSettingWin && !goalSettingWin.is_active && goalSettingWin.closes_at && new Date(goalSettingWin.closes_at) < new Date()) {
        const pendingApprovals = await query(`
          SELECT gs.id as sheet_id, u.id, u.email, u.full_name, m.id as manager_id, m.email as manager_email, m.full_name as manager_name
          FROM goal_sheets gs
          JOIN users u ON gs.employee_id = u.id
          JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
          JOIN users m ON ur.manager_id = m.id
          WHERE gs.cycle_id = $1 AND gs.status = 'submitted'
        `, [cycle.id]);

        for (const row of pendingApprovals.rows) {
          await processEscalation(
            'approval_not_done', row.manager_id, cycle.id, null,
            row.manager_name, row.manager_email, null, null, // Manager is the target, they have no higher manager listed here
            new Date(goalSettingWin.closes_at)
          );
        }
      }

      // 3. Check for missed quarterly checkins
      for (const q of ['q1', 'q2', 'q3', 'q4']) {
        const win = windows.rows.find(w => w.window_type === q);
        if (win && !win.is_active && win.closes_at && new Date(win.closes_at) < new Date()) {
          const missingCheckins = await query(`
            SELECT u.id, u.email, u.full_name, m.email as manager_email, m.full_name as manager_name
            FROM users u
            LEFT JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
            LEFT JOIN users m ON ur.manager_id = m.id
            JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
            LEFT JOIN quarterly_checkins qc ON gs.id = qc.goal_sheet_id AND qc.quarter = $2
            WHERE u.role IN ('employee', 'manager') AND u.is_active = TRUE 
              AND gs.status IN ('approved', 'locked') 
              AND (qc.id IS NULL OR qc.employee_status != 'submitted')
          `, [cycle.id, q]);

          for (const row of missingCheckins.rows) {
            await processEscalation(
              'checkin_not_completed', row.id, cycle.id, q,
              row.full_name, row.email, row.manager_name, row.manager_email,
              new Date(win.closes_at)
            );
          }
        }
      }
    }
    console.log('Deadline check complete.');
  } catch (error) {
    console.error('Error checking deadlines:', error);
  }
}

// Allow standalone execution
if (require.main === module) {
  checkDeadlines().then(() => process.exit(0)).catch(() => process.exit(1));
}
