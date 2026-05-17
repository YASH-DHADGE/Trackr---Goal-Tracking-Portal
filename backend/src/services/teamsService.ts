export async function sendTeamsCard(payload: any): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[TeamsService] TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[TeamsService] Teams responded with status ${response.status}: ${body}`);
    } else {
      console.log('[TeamsService] Notification sent successfully to Teams.');
    }
  } catch (error) {
    console.error('[TeamsService] Failed to send notification to Teams:', error);
  }
}

interface GoalSubmissionTeamsOptions {
  employeeName: string;
  managerName: string;
  cycleName: string;
  sheetUrl: string;
}

export async function notifyGoalSubmissionToTeams(options: GoalSubmissionTeamsOptions): Promise<void> {
  const { employeeName, cycleName, sheetUrl } = options;

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: 'New Goal Sheet Submitted',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Good'
            },
            {
              type: 'TextBlock',
              text: `${employeeName} has submitted their goal sheet for ${cycleName}.`,
              wrap: true
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Review in GoalForge',
              url: sheetUrl
            }
          ]
        }
      }
    ]
  };

  await sendTeamsCard(payload);
}

interface GoalApprovedTeamsOptions {
  employeeName: string;
  cycleName: string;
  sheetUrl: string;
}

export async function notifyGoalApprovedToTeams(options: GoalApprovedTeamsOptions): Promise<void> {
  const { employeeName, cycleName, sheetUrl } = options;

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: 'Goal Sheet Approved',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Good'
            },
            {
              type: 'TextBlock',
              text: `${employeeName}'s goal sheet for ${cycleName} has been approved.`,
              wrap: true
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Goal Sheet',
              url: sheetUrl
            }
          ]
        }
      }
    ]
  };

  await sendTeamsCard(payload);
}

interface GoalReworkTeamsOptions {
  employeeName: string;
  cycleName: string;
  sheetUrl: string;
}

export async function notifyGoalReworkToTeams(options: GoalReworkTeamsOptions): Promise<void> {
  const { employeeName, cycleName, sheetUrl } = options;

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: 'Goal Sheet Rework Requested',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Attention'
            },
            {
              type: 'TextBlock',
              text: `A rework has been requested on ${employeeName}'s goal sheet for ${cycleName}.`,
              wrap: true
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Edit Goal Sheet',
              url: sheetUrl
            }
          ]
        }
      }
    ]
  };

  await sendTeamsCard(payload);
}
