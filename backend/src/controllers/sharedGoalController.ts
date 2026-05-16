import { Response } from 'express';
import { query, getClient } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { writeAuditLog } from '../utils/auditLogger';

export const createSharedGoalGroup = async (req: AuthRequest, res: Response) => {
  const { 
    cycle_id, title, description, thrust_area, uom_type, 
    master_target_numeric, master_target_text, master_deadline_date, 
    primary_owner_id 
  } = req.body;
  const createdBy = req.user?.userId;

  try {
    const result = await query(
      `INSERT INTO shared_goal_groups (
        cycle_id, title, description, thrust_area, uom_type, 
        master_target_numeric, master_target_text, master_deadline_date, 
        primary_owner_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        cycle_id, title, description, thrust_area, uom_type, 
        master_target_numeric, master_target_text, master_deadline_date || null, 
        primary_owner_id, createdBy
      ]
    );
    const group = result.rows[0];

    await writeAuditLog({
      entityType: 'shared_goal_group',
      entityId: group.id,
      fieldName: 'all',
      oldValue: null,
      newValue: group,
      changedBy: createdBy!,
      changeReason: 'Initial creation of shared goal group'
    });

    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating shared goal group' });
  }
};

export const assignSharedGoal = async (req: AuthRequest, res: Response) => {
  const { shared_goal_group_id, employee_ids } = req.body;
  const adminId = req.user?.userId;

  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }

  try {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get group details
      const groupRes = await client.query(`SELECT * FROM shared_goal_groups WHERE id = $1`, [shared_goal_group_id]);
      if (groupRes.rows.length === 0) {
        throw new Error('Shared goal group not found');
      }
      const group = groupRes.rows[0];

      const results = [];

      for (const empId of employee_ids) {
        // 1. Get or create goal sheet for this employee in this cycle
        let sheetRes = await client.query(
          `SELECT id FROM goal_sheets WHERE employee_id = $1 AND cycle_id = $2`,
          [empId, group.cycle_id]
        );
        
        let sheetId;
        if (sheetRes.rows.length === 0) {
          const newSheet = await client.query(
            `INSERT INTO goal_sheets (employee_id, cycle_id) VALUES ($1, $2) RETURNING id`,
            [empId, group.cycle_id]
          );
          sheetId = newSheet.rows[0].id;
        } else {
          sheetId = sheetRes.rows[0].id;
        }

        // 2. Create individual goal entry
        const goalRes = await client.query(
          `INSERT INTO goals (
            goal_sheet_id, shared_goal_group_id, primary_owner_id, 
            thrust_area, title, description, uom_type, 
            target_value_numeric, target_value_text, deadline_date, 
            weightage, is_shared, can_edit_weightage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
          [
            sheetId, group.id, group.primary_owner_id,
            group.thrust_area, group.title, group.description, group.uom_type,
            group.master_target_numeric, group.master_target_text, group.master_deadline_date,
            10, // Default weightage
            true,
            empId !== group.primary_owner_id // Primary owner can't edit weightage if they manage the master? 
            // Actually design says "FALSE for primary owner of shared goal"
          ]
        );
        const goalId = goalRes.rows[0].id;

        // 3. Create assignment link
        await client.query(
          `INSERT INTO shared_goal_assignments (shared_goal_group_id, goal_id, employee_id)
           VALUES ($1, $2, $3)`,
          [group.id, goalId, empId]
        );

        results.push({ employee_id: empId, goal_id: goalId });
      }

      await client.query('COMMIT');

      await writeAuditLog({
        entityType: 'shared_goal_assignment',
        entityId: shared_goal_group_id,
        fieldName: 'employee_ids',
        oldValue: null,
        newValue: employee_ids,
        changedBy: adminId!,
        changeReason: `Assigned shared goal to ${employee_ids.length} employees`
      });

      res.json({ success: true, assignments: results });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error assigning shared goal' });
  }
};

export const getSharedGoals = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.params;
  try {
    const result = await query(
      `SELECT s.*, u.full_name as primary_owner_name 
       FROM shared_goal_groups s
       JOIN users u ON s.primary_owner_id = u.id
       WHERE s.cycle_id = $1`,
      [cycleId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching shared goals' });
  }
};
