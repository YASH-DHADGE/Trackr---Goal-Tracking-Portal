import { query, getClient } from '../src/config/db';
import { sendNotification } from '../src/utils/emailService';

async function checkDeadlines() {
  console.log('Running deadline check...');
  try {
    // Check for missed goal_setting
    const activeCycles = await query(`SELECT * FROM review_cycles WHERE status = 'active'`);
    for (const cycle of activeCycles.rows) {
      const windows = await query(`SELECT * FROM cycle_windows WHERE cycle_id = $1`, [cycle.id]);
      
      const goalSettingWin = windows.rows.find(w => w.window_type === 'goal_setting');
      if (goalSettingWin && !goalSettingWin.is_active && goalSettingWin.closes_at && new Date(goalSettingWin.closes_at) < new Date()) {
        // Goal setting is closed. Find users who haven't submitted
        const missingSheets = await query(`
          SELECT u.id, u.email, u.full_name, m.email as manager_email, m.full_name as manager_name
          FROM users u
          JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
          JOIN users m ON ur.manager_id = m.id
          LEFT JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
          WHERE (u.role = 'employee' OR u.role = 'manager') AND (gs.id IS NULL OR gs.status = 'draft')
        `, [cycle.id]);

        for (const row of missingSheets.rows) {
          console.log(`Sending escalation to ${row.email} for missed goal setting.`);
          sendNotification(row.email, 'URGENT: Goal Setting Deadline Missed', `Hi ${row.full_name},\n\nThe goal setting window for ${cycle.name} has closed and you have not submitted your goals. Please contact your manager immediately.`);
          sendNotification(row.manager_email, 'ESCALATION: Team Member Missed Goal Setting', `Hi ${row.manager_name},\n\nYour team member ${row.full_name} has missed the goal setting deadline for ${cycle.name}.`);
        }
      }

      // Check for missed quarters
      for (const q of ['q1', 'q2', 'q3', 'q4']) {
        const win = windows.rows.find(w => w.window_type === q);
        if (win && !win.is_active && win.closes_at && new Date(win.closes_at) < new Date()) {
          const missingCheckins = await query(`
            SELECT u.id, u.email, u.full_name, m.email as manager_email, m.full_name as manager_name
            FROM users u
            JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
            JOIN users m ON ur.manager_id = m.id
            JOIN goal_sheets gs ON u.id = gs.employee_id AND gs.cycle_id = $1
            LEFT JOIN quarterly_checkins qc ON gs.id = qc.goal_sheet_id AND qc.quarter = $2
            WHERE (u.role = 'employee' OR u.role = 'manager') AND gs.status IN ('approved', 'locked') AND (qc.id IS NULL OR qc.employee_status != 'submitted')
          `, [cycle.id, q]);

          for (const row of missingCheckins.rows) {
            console.log(`Sending escalation to ${row.email} for missed ${q} check-in.`);
            sendNotification(row.email, `URGENT: ${q.toUpperCase()} Check-in Deadline Missed`, `Hi ${row.full_name},\n\nThe ${q.toUpperCase()} check-in window for ${cycle.name} has closed and you have not submitted your check-in. Please contact your manager immediately.`);
            sendNotification(row.manager_email, `ESCALATION: Team Member Missed ${q.toUpperCase()} Check-in`, `Hi ${row.manager_name},\n\nYour team member ${row.full_name} has missed the ${q.toUpperCase()} check-in deadline for ${cycle.name}.`);
          }
        }
      }
    }
    console.log('Deadline check complete.');
  } catch (error) {
    console.error('Error checking deadlines:', error);
  } finally {
    process.exit(0);
  }
}

checkDeadlines();
