interface GoalSubmissionEmailOptions {
  employeeName: string;
  managerName: string;
  cycleName: string;
  approveUrl: string;
}

export function buildGoalSubmissionEmail(options: GoalSubmissionEmailOptions): string {
  const { employeeName, managerName, cycleName, approveUrl } = options;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #059669; margin-bottom: 16px;">GoalForge Notification</h2>
      <p style="color: #374151; font-size: 16px;">Hi <strong>${managerName}</strong>,</p>
      <p style="color: #374151; font-size: 16px;">
        <strong>${employeeName}</strong> has submitted their goal sheet for the <strong>${cycleName}</strong> cycle. 
        It is now pending your review and approval.
      </p>
      <div style="margin: 30px 0;">
        <a href="${approveUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Review Goal Sheet
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Thank you,<br/>
        The GoalForge Team
      </p>
    </div>
  `;
}

interface GoalApprovedEmailOptions {
  employeeName: string;
  cycleName: string;
  sheetUrl: string;
}

export function buildGoalApprovedEmail(options: GoalApprovedEmailOptions): string {
  const { employeeName, cycleName, sheetUrl } = options;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #059669; margin-bottom: 16px;">GoalForge Notification</h2>
      <p style="color: #374151; font-size: 16px;">Hi <strong>${employeeName}</strong>,</p>
      <p style="color: #374151; font-size: 16px;">
        Great news! Your goal sheet for the <strong>${cycleName}</strong> cycle has been approved by your manager.
      </p>
      <div style="margin: 30px 0;">
        <a href="${sheetUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Goal Sheet
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Thank you,<br/>
        The GoalForge Team
      </p>
    </div>
  `;
}

interface GoalReworkEmailOptions {
  employeeName: string;
  managerName: string;
  cycleName: string;
  comment: string;
  sheetUrl: string;
}

export function buildGoalReworkEmail(options: GoalReworkEmailOptions): string {
  const { employeeName, managerName, cycleName, comment, sheetUrl } = options;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #ea580c; margin-bottom: 16px;">GoalForge Action Required</h2>
      <p style="color: #374151; font-size: 16px;">Hi <strong>${employeeName}</strong>,</p>
      <p style="color: #374151; font-size: 16px;">
        Your manager (<strong>${managerName}</strong>) has requested a rework on your goal sheet for the <strong>${cycleName}</strong> cycle.
      </p>
      <div style="background-color: #f3f4f6; padding: 16px; border-left: 4px solid #ea580c; margin: 20px 0; border-radius: 4px;">
        <p style="color: #374151; margin: 0; font-style: italic;">"${comment}"</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="${sheetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Edit Goal Sheet
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Thank you,<br/>
        The GoalForge Team
      </p>
    </div>
  `;
}

interface CheckinReminderEmailOptions {
  employeeName: string;
  quarterName: string;
  deadlineText: string;
  checkinUrl: string;
}

export function buildCheckinReminderEmail(options: CheckinReminderEmailOptions): string {
  const { employeeName, quarterName, deadlineText, checkinUrl } = options;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">GoalForge Check-in Reminder</h2>
      <p style="color: #374151; font-size: 16px;">Hi <strong>${employeeName}</strong>,</p>
      <p style="color: #374151; font-size: 16px;">
        This is a friendly reminder that your <strong>${quarterName}</strong> check-in is due by <strong>${deadlineText}</strong>.
      </p>
      <p style="color: #374151; font-size: 16px;">
        Please log in to update your progress against your targets.
      </p>
      <div style="margin: 30px 0;">
        <a href="${checkinUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Check-in
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Thank you,<br/>
        The GoalForge Team
      </p>
    </div>
  `;
}
