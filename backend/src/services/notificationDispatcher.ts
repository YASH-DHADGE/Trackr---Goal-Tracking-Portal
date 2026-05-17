import { sendEmail } from './emailService';
import { 
  buildGoalSubmissionEmail, 
  buildGoalApprovedEmail, 
  buildGoalReworkEmail, 
  buildCheckinReminderEmail 
} from './emailTemplates';
import { 
  notifyGoalSubmissionToTeams, 
  notifyGoalApprovedToTeams, 
  notifyGoalReworkToTeams 
} from './teamsService';
import { query } from '../config/db'; // Assuming standard DB export

interface NotificationBaseContext {
  cycleName: string;
}

interface GoalSubmissionContext extends NotificationBaseContext {
  employeeId: string;
  managerId: string;
  goalSheetId: string;
}

interface GoalApprovalContext extends NotificationBaseContext {
  employeeId: string;
  managerId: string;
  goalSheetId: string;
}

interface GoalReworkContext extends NotificationBaseContext {
  employeeId: string;
  managerId: string;
  goalSheetId: string;
  managerComment: string;
}

interface CheckinReminderContext extends NotificationBaseContext {
  employeeId: string;
  quarterName: string;
  deadlineText: string;
}

// Helper to get user profile from DB
async function getUserProfile(userId: string) {
  const result = await query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export async function notifyGoalSubmission(ctx: GoalSubmissionContext): Promise<void> {
  try {
    const employee = await getUserProfile(ctx.employeeId);
    const manager = await getUserProfile(ctx.managerId);
    if (!employee || !manager) return;

    const approveUrl = `${FRONTEND_URL}/manager/approve/${ctx.goalSheetId}`;

    // 1. Create In-App Notification (Supabase DB)
    await query(`
      INSERT INTO notifications (recipient_id, notification_type, title, body, deep_link, status, sent_at)
      VALUES ($1, 'goal_submitted', $2, $3, $4, 'sent', NOW())
    `, [
      ctx.managerId, 
      `Action Required: Goal Sheet Submitted for ${ctx.cycleName}`,
      `${employee.full_name} has submitted their goal sheet for the ${ctx.cycleName} cycle. It is now pending your review and approval.`,
      approveUrl
    ]);

    // 2. Send Email to Manager
    const emailHtml = buildGoalSubmissionEmail({
      employeeName: employee.full_name,
      managerName: manager.full_name,
      cycleName: ctx.cycleName,
      approveUrl
    });

    await sendEmail({
      to: manager.email,
      subject: `Action Required: Goal Sheet Submitted for ${ctx.cycleName}`,
      html: emailHtml
    });

    // 3. Notify Teams
    await notifyGoalSubmissionToTeams({
      employeeName: employee.full_name,
      managerName: manager.full_name,
      cycleName: ctx.cycleName,
      sheetUrl: approveUrl
    });

  } catch (error) {
    console.error('[NotificationDispatcher] Failed in notifyGoalSubmission:', error);
  }
}

export async function notifyGoalApproved(ctx: GoalApprovalContext): Promise<void> {
  try {
    const employee = await getUserProfile(ctx.employeeId);
    if (!employee) return;

    const sheetUrl = `${FRONTEND_URL}/employee/goals/${ctx.goalSheetId}`;

    // 1. Create In-App Notification (Supabase DB)
    await query(`
      INSERT INTO notifications (recipient_id, notification_type, title, body, deep_link, status, sent_at)
      VALUES ($1, 'goal_approved', $2, $3, $4, 'sent', NOW())
    `, [
      ctx.employeeId,
      `Goal Sheet Approved for ${ctx.cycleName}`,
      `Great news! Your goal sheet for the ${ctx.cycleName} cycle has been approved by your manager.`,
      sheetUrl
    ]);

    // 2. Send Email to Employee
    const emailHtml = buildGoalApprovedEmail({
      employeeName: employee.full_name,
      cycleName: ctx.cycleName,
      sheetUrl
    });

    await sendEmail({
      to: employee.email,
      subject: `Goal Sheet Approved for ${ctx.cycleName}`,
      html: emailHtml
    });

    // 3. Notify Teams
    await notifyGoalApprovedToTeams({
      employeeName: employee.full_name,
      cycleName: ctx.cycleName,
      sheetUrl
    });

  } catch (error) {
    console.error('[NotificationDispatcher] Failed in notifyGoalApproved:', error);
  }
}

export async function notifyGoalRework(ctx: GoalReworkContext): Promise<void> {
  try {
    const employee = await getUserProfile(ctx.employeeId);
    const manager = await getUserProfile(ctx.managerId);
    if (!employee || !manager) return;

    const sheetUrl = `${FRONTEND_URL}/employee/goals/${ctx.goalSheetId}`;

    // 1. Create In-App Notification (Supabase DB)
    await query(`
      INSERT INTO notifications (recipient_id, notification_type, title, body, deep_link, status, sent_at)
      VALUES ($1, 'goal_rework', $2, $3, $4, 'sent', NOW())
    `, [
      ctx.employeeId,
      `Rework Requested: Goal Sheet for ${ctx.cycleName}`,
      `Your manager (${manager.full_name}) has requested a rework on your goal sheet for the ${ctx.cycleName} cycle. Comment: "${ctx.managerComment}"`,
      sheetUrl
    ]);

    // 2. Send Email to Employee
    const emailHtml = buildGoalReworkEmail({
      employeeName: employee.full_name,
      managerName: manager.full_name,
      cycleName: ctx.cycleName,
      comment: ctx.managerComment,
      sheetUrl
    });

    await sendEmail({
      to: employee.email,
      subject: `Rework Requested: Goal Sheet for ${ctx.cycleName}`,
      html: emailHtml
    });

    // 3. Notify Teams
    await notifyGoalReworkToTeams({
      employeeName: employee.full_name,
      cycleName: ctx.cycleName,
      sheetUrl
    });

  } catch (error) {
    console.error('[NotificationDispatcher] Failed in notifyGoalRework:', error);
  }
}

export async function notifyCheckinReminder(ctx: CheckinReminderContext): Promise<void> {
  try {
    const employee = await getUserProfile(ctx.employeeId);
    if (!employee) return;

    const checkinUrl = `${FRONTEND_URL}/employee/checkins/${ctx.quarterName.toLowerCase()}`;

    // 1. Create In-App Notification (Supabase DB)
    await query(`
      INSERT INTO notifications (recipient_id, notification_type, title, body, deep_link, status, sent_at)
      VALUES ($1, 'checkin_reminder', $2, $3, $4, 'sent', NOW())
    `, [
      ctx.employeeId,
      `Reminder: ${ctx.quarterName} Check-in Due Soon`,
      `This is a friendly reminder that your ${ctx.quarterName} check-in is due by ${ctx.deadlineText}.`,
      checkinUrl
    ]);

    // 2. Send Email to Employee
    const emailHtml = buildCheckinReminderEmail({
      employeeName: employee.full_name,
      quarterName: ctx.quarterName,
      deadlineText: ctx.deadlineText,
      checkinUrl
    });

    await sendEmail({
      to: employee.email,
      subject: `Reminder: ${ctx.quarterName} Check-in Due Soon`,
      html: emailHtml
    });

  } catch (error) {
    console.error('[NotificationDispatcher] Failed in notifyCheckinReminder:', error);
  }
}
