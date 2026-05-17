import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Helper to calculate weighted progress score for active goals
 */
function calculateWeightedProgress(goals: any[], progressEntries: any[]): { score: number; bar: string } {
  let totalWeight = 0;
  let weightedScoreSum = 0;

  goals.forEach(goal => {
    const weight = parseFloat(goal.weightage) || 0;
    totalWeight += weight;

    // Find the latest progress entry score for this goal
    // We look across all quarters and take the maximum or average, 
    // or let's find the latest quarter check-in entry that has a computed score
    const goalEntries = progressEntries.filter(e => e.goal_id === goal.id);
    let latestScore = 0;
    if (goalEntries.length > 0) {
      // Sort entries by quarter (q4 > q3 > q2 > q1) to get the most recent progress
      const quartersOrder = { q4: 4, q3: 3, q2: 2, q1: 1 };
      goalEntries.sort((a, b) => (quartersOrder[b.quarter as keyof typeof quartersOrder] || 0) - (quartersOrder[a.quarter as keyof typeof quartersOrder] || 0));

      const latestEntry = goalEntries.find(e => e.computed_progress_score !== null);
      if (latestEntry) {
        latestScore = parseFloat(latestEntry.computed_progress_score) || 0;
      }
    }

    weightedScoreSum += (latestScore * weight);
  });

  const overallScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) : 0;
  const percentage = Math.min(100, Math.round(overallScore * 100));

  // Create visual progress bar
  const filledLength = Math.round(percentage / 10);
  const bar = '█'.repeat(filledLength) + '░'.repeat(10 - filledLength);

  return {
    score: percentage,
    bar: `[${bar}] ${percentage}%`
  };
}

export const chatWithAI = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const userEmail = req.user?.email;
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required as a string.' });
  }

  try {
    // 1. Query User Profile & Department & Manager
    const userResult = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.designation, u.employee_code,
             d.name as department_name, 
             m.full_name as manager_name, m.email as manager_email
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
      LEFT JOIN users m ON ur.manager_id = m.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const userProfile = userResult.rows[0];

    // 2. Query Goal Sheets
    const sheetResult = await query(`
      SELECT gs.id as sheet_id, gs.status as sheet_status, gs.rework_note, rc.name as cycle_name, gs.cycle_id
      FROM goal_sheets gs
      JOIN review_cycles rc ON gs.cycle_id = rc.id
      WHERE gs.employee_id = $1
      ORDER BY gs.created_at DESC
      LIMIT 1
    `, [userId]);

    let goalSheet = null;
    let goals: any[] = [];
    let checkins: any[] = [];

    if (sheetResult.rows.length > 0) {
      const rawSheet = sheetResult.rows[0];
      goalSheet = {
        id: rawSheet.sheet_id,
        status: rawSheet.sheet_status,
        reworkNote: rawSheet.rework_note || 'None',
        cycle: rawSheet.cycle_name,
        cycle_id: rawSheet.cycle_id
      };

      // Query Goals for this sheet
      const goalsResult = await query(`
        SELECT * FROM goals 
        WHERE goal_sheet_id = $1 
        ORDER BY sort_order ASC, created_at ASC
      `, [goalSheet.id]);
      goals = goalsResult.rows;

      // Query Quarterly Checkins & Progress Entries for this sheet/cycle
      const checkinsResult = await query(`
        SELECT qc.id as checkin_id, qc.quarter, qc.employee_status, qc.manager_status,
               gpe.goal_id, gpe.actual_value_numeric, gpe.actual_value_text, 
               gpe.status as progress_status, gpe.computed_progress_score, gpe.remarks
        FROM quarterly_checkins qc
        LEFT JOIN goal_progress_entries gpe ON qc.id = gpe.checkin_id
        WHERE qc.employee_id = $1 AND qc.cycle_id = $2
        ORDER BY qc.quarter ASC
      `, [userId, goalSheet.cycle_id]);
      checkins = checkinsResult.rows;
    }

    // 3. Assemble complete context object
    const systemRules = {
      portalName: 'Trackr Goal Setting & Tracking Portal',
      goalsLimit: 'Maximum 8 goals per employee per review cycle.',
      minWeightage: 'Minimum 10% weightage required per individual goal.',
      totalWeightage: 'Total weightage across all goals in a goal sheet must equal exactly 100% before submission.',
      workflow: 'Draft -> Submitted -> Approved (locked for updates) OR Rework Requested (requires editing).',
      unlocking: 'Once approved, goals are locked. Only Admins can unlock goal sheets for edits, which logs an audit trail.',
      sharedGoals: 'Managers/Admins can push Shared Goals (departmental KPIs). Primary owner achievements sync to recipients as read-only goals.'
    };

    const conversationContext = {
      user: {
        name: userProfile.full_name,
        email: userProfile.email,
        role: userProfile.role,
        designation: userProfile.designation || 'N/A',
        department: userProfile.department_name || 'N/A',
        employeeCode: userProfile.employee_code,
        managerName: userProfile.manager_name || 'None Assigned',
        managerEmail: userProfile.manager_email || 'N/A'
      },
      goalSheet: goalSheet ? {
        status: goalSheet.status,
        cycle: goalSheet.cycle,
        reworkNote: goalSheet.reworkNote || 'None'
      } : null,
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        thrustArea: g.thrust_area,
        weightage: `${g.weightage}%`,
        uomType: g.uom_type,
        target: g.target_value_numeric || g.target_value_text || g.deadline_date,
        isLocked: g.is_locked,
        isShared: g.is_shared
      })),
      checkins: checkins.reduce((acc: any[], curr: any) => {
        let q = acc.find(item => item.quarter === curr.quarter);
        if (!q) {
          q = {
            quarter: curr.quarter.toUpperCase(),
            employeeStatus: curr.employee_status,
            managerStatus: curr.manager_status,
            entries: []
          };
          acc.push(q);
        }
        if (curr.goal_id) {
          const matchingGoal = goals.find(g => g.id === curr.goal_id);
          q.entries.push({
            goalTitle: matchingGoal ? matchingGoal.title : 'Unknown Goal',
            actual: curr.actual_value_numeric || curr.actual_value_text || curr.completion_date || 'N/A',
            status: curr.progress_status,
            score: curr.computed_progress_score !== null ? `${Math.round(parseFloat(curr.computed_progress_score) * 100)}%` : 'N/A',
            remarks: curr.remarks || 'No remarks'
          });
        }
        return acc;
      }, []),
      systemRules
    };

    // 4. Try Mistral AI API if key is available
    const mistralKey = process.env.MISTRAL_API_KEY;

    if (mistralKey) {
      try {
        const systemPrompt = `You are "Trackr AI", an elegant, helpful, and highly intelligent virtual assistant inside the Trackr Goal Setting & Tracking Portal.
Your goal is to answer ANY question the employee asks. You must provide warm, professional, clear responses.
Use rich Markdown styling for formatting (bold, bullet points, headers, or inline code blocks). Keep your answers focused, engaging, and reasonably concise.

Here is the LIVE context of the currently logged-in user and the portal rules:
${JSON.stringify(conversationContext, null, 2)}

Instructions for answering:
1. Always address the user warmly by their name (${userProfile.full_name}) when appropriate.
2. If they ask about their goals, list them clearly with details like weightage, UOM, and target, using clean Markdown.
3. If they ask about their progress, calculate or summarize based on check-ins provided.
4. If they ask about their manager, list their manager's details.
5. If they ask how to use the portal or system rules, refer to the systemRules provided.
6. If they ask anything else (e.g. general questions or career advice), answer intelligently while gently relating it back to their professional development and active goals on Trackr.
7. If their goal sheet is in "rework_requested" status, gently remind them they have a pending rework request from their manager with comments.`;

        const response = await fetch(
          `https://api.mistral.ai/v1/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
              model: 'mistral-large-latest',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                {
                  role: 'user',
                  content: message
                }
              ],
              temperature: 0.3,
              max_tokens: 800
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const replyText = data.choices?.[0]?.message?.content;
          if (replyText) {
            return res.json({ response: replyText });
          }
        } else {
          const errText = await response.text();
          console.error('Mistral API call failed with status:', response.status, errText);
        }
        console.error('Mistral API call returned empty response. Falling back to local agent.');
      } catch (mistralError) {
        console.error('Error calling Mistral API, falling back to local agent:', mistralError);
      }
    }

    // 5. Fallback: Intelligent Local Rule-based NLP Agent
    const queryLower = message.toLowerCase().trim();
    let reply = '';

    // Intent 1: Greeting
    if (
      queryLower === 'hi' ||
      queryLower === 'hello' ||
      queryLower === 'hey' ||
      queryLower.startsWith('greetings') ||
      queryLower.startsWith('good morning') ||
      queryLower.startsWith('good afternoon')
    ) {
      reply = `### Hello, **${userProfile.full_name}**! 👋

Welcome to **Trackr AI**, your personal portal companion. I'm here to answer anything about the portal or your active performance goals!

Here are some things you can ask me:
* 📊 **"Show my goals"** - I will display a detailed breakdown of your current goals.
* 📈 **"What is my progress?"** - I will calculate your weighted progress and show a visual progress bar.
* 📋 **"Check-in status"** - Review your quarterly check-ins (Q1 - Q4).
* 👤 **"Who is my manager?"** - View your supervisor's profile.
* ⚙️ **"What are the rules?"** - Review portal constraints (weightage, goal counts).

How can I assist you today?`;
    }

    // Intent 2: Goals Summary / List
    else if (
      queryLower.includes('goal') ||
      queryLower.includes('thrust') ||
      queryLower.includes('my list') ||
      queryLower.includes('target')
    ) {
      if (goals.length === 0) {
        reply = `### Your Goals 📊

Hello **${userProfile.full_name}**, you do not have any goals registered in your active cycle (${goalSheet?.cycle || 'FY2026'}).

To get started:
1. Navigate to the **"My Goals"** dashboard.
2. Click **"Add Goal"** to define your KPIs.
3. Make sure you set a target value, select the correct Unit of Measure (UOM), and assign a weightage (minimum 10%).
4. Add between 1 and 8 goals, totaling exactly **100% weightage** to submit for review.`;
      } else {
        const sheetStatusLabel = goalSheet ? goalSheet.status.toUpperCase().replace(/_/g, ' ') : 'DRAFT';

        reply = `### Your Active Goals 📊\n`;
        reply += `**Cycle**: \`${goalSheet?.cycle || 'FY2026'}\` | **Sheet Status**: \`${sheetStatusLabel}\`\n\n`;

        if (goalSheet?.status === 'rework_requested') {
          reply += `⚠️ **Rework Requested by Manager**:\n> "${goalSheet.reworkNote}"\n\n`;
        }

        reply += `Here is your current list of goals:\n\n`;

        goals.forEach((g, idx) => {
          const lockedStatus = g.is_locked ? '🔒 Locked' : '📝 Editable';
          const sharedStatus = g.is_shared ? '👥 Shared KPI' : '👤 Individual';
          const deadline = g.deadline_date ? ` due by **${new Date(g.deadline_date).toLocaleDateString()}**` : '';

          reply += `${idx + 1}. **${g.title}** \`[${g.weightage}%]\`\n`;
          reply += `   * **Thrust Area**: ${g.thrust_area}\n`;
          if (g.description) reply += `   * **Description**: ${g.description}\n`;
          reply += `   * **UOM**: \`${g.uom_type}\` | **Target**: \`${g.target_value_numeric || g.target_value_text || 'N/A'}\` ${deadline}\n`;
          reply += `   * **Flags**: \`${lockedStatus}\` | \`${sharedStatus}\`\n\n`;
        });

        const totalWeight = goals.reduce((sum, g) => sum + parseFloat(g.weightage), 0);
        reply += `**Total Goals**: ${goals.length}/8 | **Total Weightage**: \`${totalWeight}%\` / \`100%\``;
      }
    }

    // Intent 3: Progress Calculation
    else if (
      queryLower.includes('progress') ||
      queryLower.includes('achieve') ||
      queryLower.includes('score') ||
      queryLower.includes('complete') ||
      queryLower.includes('perform')
    ) {
      if (goals.length === 0) {
        reply = `### Progress Summary 📈\n\nYou don't have any goals set up yet! Go ahead and add some goals in the **My Goals** dashboard to track your performance.`;
      } else {
        const { score, bar } = calculateWeightedProgress(goals, checkins);

        reply = `### Your Overall Progress 📈\n\n`;
        reply += `**Weighted Completion Score**:\n`;
        reply += `### \`${bar}\`\n\n`;

        reply += `**Goal-wise Progress Breakdown**:\n\n`;

        goals.forEach((g, idx) => {
          const goalEntries = checkins.filter(c => c.goal_id === g.id);

          let latestProgress = 'No quarterly records submitted yet';
          let latestScoreStr = 'N/A';
          let latestRemarks = '';

          if (goalEntries.length > 0) {
            // Find latest active entry
            const quartersOrder = { q4: 4, q3: 3, q2: 2, q1: 1 };
            goalEntries.sort((a, b) => (quartersOrder[b.quarter as keyof typeof quartersOrder] || 0) - (quartersOrder[a.quarter as keyof typeof quartersOrder] || 0));
            const latestEntry = goalEntries.find(e => e.computed_progress_score !== null);

            if (latestEntry) {
              const actualVal = latestEntry.actual_value_numeric || latestEntry.actual_value_text || 'N/A';
              const progressScore = Math.round(parseFloat(latestEntry.computed_progress_score) * 100);

              latestProgress = `Q${latestEntry.quarter.toUpperCase().replace('Q', '')} Actual: \`${actualVal}\` (Status: \`${latestEntry.progress_status}\`)`;
              latestScoreStr = `\`${progressScore}%\``;
              if (latestEntry.remarks) {
                latestRemarks = `\n      * *Remarks*: "${latestEntry.remarks}"`;
              }
            }
          }

          reply += `${idx + 1}. **${g.title}** \`[${g.weightage}%]\`\n`;
          reply += `   * **Progress Score**: ${latestScoreStr}\n`;
          reply += `   * **Current State**: ${latestProgress}${latestRemarks}\n\n`;
        });

        reply += `💡 *Tip: Update your targets and actual progress in the quarterly check-in tabs during open check-in windows to improve your completion scores!*`;
      }
    }

    // Intent 4: Checkin statuses
    else if (
      queryLower.includes('checkin') ||
      queryLower.includes('check-in') ||
      queryLower.includes('quarter') ||
      queryLower.includes('q1') ||
      queryLower.includes('q2') ||
      queryLower.includes('q3') ||
      queryLower.includes('q4')
    ) {
      if (checkins.length === 0) {
        reply = `### Quarterly Check-in Status 📋\n\nNo check-ins are currently configured or started. Check-ins begin once your goal sheet is **Approved** by your manager and the admin opens the quarterly review window.`;
      } else {
        // Group check-ins
        const groupedCheckins: Record<string, any> = {};
        checkins.forEach(c => {
          const q = c.quarter.toUpperCase();
          if (!groupedCheckins[q]) {
            groupedCheckins[q] = {
              quarter: q,
              emp: c.employee_status,
              mgr: c.manager_status,
              count: 0,
              scored: 0
            };
          }
          if (c.goal_id) {
            groupedCheckins[q].count++;
            if (c.computed_progress_score !== null) {
              groupedCheckins[q].scored++;
            }
          }
        });

        reply = `### Quarterly Review & Check-in Status 📋\n\n`;
        reply += `Here is the current state of your check-ins:\n\n`;

        Object.values(groupedCheckins).forEach((q: any) => {
          const empBadge = q.emp === 'submitted' ? '🟢 Submitted' : q.emp === 'in_progress' ? '🟡 In Progress' : '⚪ Not Started';
          const mgrBadge = q.mgr === 'completed' ? '🟢 Reviewed by Mgr' : '⚪ Pending Mgr Review';

          reply += `* **${q.quarter} Review**:\n`;
          reply += `  * Employee Status: ${empBadge}\n`;
          reply += `  * Manager Review: ${mgrBadge}\n`;
          if (q.count > 0) {
            reply += `  * Progress Recorded: \`${q.scored} / ${q.count}\` goals updated.\n`;
          }
          reply += `\n`;
        });
      }
    }

    // Intent 5: Manager details
    else if (
      queryLower.includes('manager') ||
      queryLower.includes('boss') ||
      queryLower.includes('reporting') ||
      queryLower.includes('supervisor')
    ) {
      reply = `### Reporting Structure 👤\n\n`;
      reply += `Hi **${userProfile.full_name}**, here are your current workplace reporting details:\n\n`;
      reply += `* **Your Manager**: **${userProfile.manager_name || 'None Assigned'}**\n`;
      reply += `* **Manager Email**: \`${userProfile.manager_email || 'N/A'}\`\n\n`;
      reply += `**Work Profile Summary**:\n`;
      reply += `* Department: \`${userProfile.department_name || 'N/A'}\`\n`;
      reply += `* Designation: \`${userProfile.designation || 'N/A'}\`\n`;
      reply += `* Employee Code: \`${userProfile.employee_code}\`\n\n`;
      reply += `💡 *If your manager assignment is incorrect, please request the Admin to update your reporting mapping in the Reporting Hierarchy Panel.*`;
    }

    // Intent 6: Portal Rules & Guidelines
    else if (
      queryLower.includes('rule') ||
      queryLower.includes('constraint') ||
      queryLower.includes('limit') ||
      queryLower.includes('weight') ||
      queryLower.includes('minimum') ||
      queryLower.includes('maximum')
    ) {
      reply = `### Trackr Organizational Goals Rules ⚙️\n\n`;
      reply += `To maintain consistency and rigorous performance standards, **Trackr** enforces several business rules in the database and API layer:\n\n`;
      reply += `1. 📦 **Goal Sheet Capacity**: You can create a **maximum of 8 goals** per review cycle.\n`;
      reply += `2. ⚖️ **Minimum Weightage**: Each individual goal must have a **minimum weightage of 10%**.\n`;
      reply += `3. 💯 **Submission Constraint**: The combined weightage of all goals on your sheet must sum to **exactly 100%** before you can submit it to your manager.\n`;
      reply += `4. 🔒 **Locking Mechanism**: As soon as your manager **Approves** your goal sheet, all goals are locked and become read-only to prevent unauthorized alterations.\n`;
      reply += `5. 🔓 **Unlocking Requests**: If exceptional modifications are needed after approval, only an **Admin** can unlock your goal sheet. This action triggers a formal entry in the **audit logs** for governance.\n`;
      reply += `6. 👥 **Shared Goals**: Departmental KPIs pushed by managers are read-only for recipient employees. The primary owner is responsible for progress updates, which sync dynamically to your sheet!`;
    }

    // Intent 7: About Trackr / General Help
    else if (
      queryLower.includes('about') ||
      queryLower.includes('trackr') ||
      queryLower.includes('help') ||
      queryLower.includes('capabilities') ||
      queryLower.includes('what can you do')
    ) {
      reply = `### About Trackr & AI Assistant 🤖\n\n`;
      reply += `**Trackr** is an in-house Goal Setting and Tracking Portal designed to streamline annual performance reviews, departmental KPI alignment, and quarterly progress updates.\n\n`;
      reply += `As **Trackr AI**, I am fully integrated into the backend and can query your actual, live employee records securely! I can answer:\n\n`;
      reply += `* 📋 **Goal details**: What goals you have set, their weightages, thrust areas, and deadline status.\n`;
      reply += `* 📈 **Performance & Progress**: Overall weighted scores, individual goal achievements, and missing targets.\n`;
      reply += `* 👤 **Supervisor & Org Profile**: Your manager, department designation, and active cycles.\n`;
      reply += `* ⏳ **Quarterly reviews**: Review cycle timelines and check-in statuses (Q1 to Q4).\n`;
      reply += `* 🛡️ **Company rules**: Key guardrails like maximum goals, minimum weightages, and locking guidelines.\n\n`;
      reply += `Just type a natural question, e.g. *"Show my goals"* or *"How am I progressing on Q1?"* and I will retrieve the answers for you!`;
    }

    // General fallback: Profile and sheet overview
    else {
      const sheetStatusLabel = goalSheet ? goalSheet.status.toUpperCase().replace(/_/g, ' ') : 'NONE';
      const goalsCount = goals.length;

      reply = `### Hello, **${userProfile.full_name}**! 👋\n\n`;
      reply += `I am **Trackr AI**, and I'm ready to answer any question about the portal or your specific goals.\n\n`;
      reply += `**Your Current Overview**:\n`;
      reply += `* Department: \`${userProfile.department_name || 'N/A'}\` | Designation: \`${userProfile.designation || 'N/A'}\`\n`;
      reply += `* Manager: **${userProfile.manager_name || 'None Assigned'}**\n`;
      reply += `* Active Cycle: \`${goalSheet?.cycle || 'FY2026'}\` | Sheet Status: **${sheetStatusLabel}**\n`;
      reply += `* Active Goals Defined: **${goalsCount} / 8**\n\n`;

      if (goalSheet?.status === 'rework_requested') {
        reply += `⚠️ **Rework Requested by Manager**:\n> "${goalSheet.reworkNote}"\n\n`;
      }

      if (goalsCount > 0) {
        const { score } = calculateWeightedProgress(goals, checkins);
        reply += `📊 Your current computed progress is **${score}%**.\n\n`;
      }

      reply += `Please ask me something specific, such as:\n`;
      reply += `* *"What are my active goals?"*\n`;
      reply += `* *"Check my Q1 progress"* \n`;
      reply += `* *"What are the portal constraints?"*\n\n`;
      reply += `How can I help you today?`;
    }

    return res.json({ response: reply });

  } catch (error: any) {
    console.error('Error in chatbot controller:', error);
    return res.status(500).json({ error: error.message || 'Server error processing chat request.' });
  }
};
