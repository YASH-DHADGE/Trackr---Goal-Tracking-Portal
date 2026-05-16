import { getClient, query } from '../src/config/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const seed = async () => {
  console.log('🌱 Seeding sample data...');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Create Department
    const deptRes = await client.query(`
      INSERT INTO departments (name, code) 
      VALUES ('Engineering', 'ENG') 
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW() 
      RETURNING id
    `);
    const deptId = deptRes.rows[0].id;

    // 2. Create Users
    // Admin
    const adminRes = await client.query(`
      INSERT INTO users (employee_code, full_name, email, password_hash, role, designation, department_id)
      VALUES ('ADM-001', 'System Admin', 'admin@gmail.com', 'admin@123', 'admin', 'IT Administrator', $1)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [deptId]);
    const adminId = adminRes.rows[0].id;

    // Manager
    const managerRes = await client.query(`
      INSERT INTO users (employee_code, full_name, email, password_hash, role, designation, department_id)
      VALUES ('MGR-001', 'Marketing Manager', 'manager@gmail.com', 'manager@123', 'manager', 'Team Lead', $1)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [deptId]);
    const managerId = managerRes.rows[0].id;

    // Employee
    const empRes = await client.query(`
      INSERT INTO users (employee_code, full_name, email, password_hash, role, designation, department_id)
      VALUES ('EMP-001', 'John Doe', 'emp@gmail.com', 'emp@123', 'employee', 'Senior Developer', $1)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [deptId]);
    const empId = empRes.rows[0].id;

    // 3. Reporting Relationship
    await client.query(`
      INSERT INTO user_reporting (employee_id, manager_id, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT DO NOTHING
    `, [empId, managerId]);

    // 4. Review Cycle
    const cycleRes = await client.query(`
      INSERT INTO review_cycles (name, start_date, end_date, status, created_by)
      VALUES ('FY 2026', '2025-04-01', '2026-03-31', 'active', $1)
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [adminId]);
    const cycleId = cycleRes.rows[0].id;

    // 5. Cycle Windows
    const windows = [
      { type: 'goal_setting', active: true },
      { type: 'q1', active: false },
      { type: 'q2', active: false },
      { type: 'q3', active: false },
      { type: 'q4', active: false }
    ];

    for (const w of windows) {
      await client.query(`
        INSERT INTO cycle_windows (cycle_id, window_type, opens_at, closes_at, is_active)
        VALUES ($1, $2, NOW() - INTERVAL '1 month', NOW() + INTERVAL '1 month', $3)
        ON CONFLICT (cycle_id, window_type) DO UPDATE SET is_active = $3
      `, [cycleId, w.type, w.active]);
    }

    // 6. Goal Sheet
    const sheetRes = await client.query(`
      INSERT INTO goal_sheets (employee_id, cycle_id, status)
      VALUES ($1, $2, 'draft')
      ON CONFLICT (employee_id, cycle_id) DO NOTHING
      RETURNING id
    `, [empId, cycleId]);
    
    if (sheetRes.rows.length > 0) {
      const sheetId = sheetRes.rows[0].id;

      // 7. Goals
      const goals = [
        { title: 'Project X Delivery', thrust_area: 'Delivery', uom: 'timeline', target: null, deadline: '2025-06-30', weight: 40 },
        { title: 'Customer Satisfaction Score', thrust_area: 'Quality', uom: 'max_numeric', target: 4.5, deadline: null, weight: 30 },
        { title: 'Cost Reduction %', thrust_area: 'Efficiency', uom: 'min_numeric', target: 10, deadline: null, weight: 30 }
      ];

      for (const g of goals) {
        await client.query(`
          INSERT INTO goals (goal_sheet_id, primary_owner_id, thrust_area, title, uom_type, target_value_numeric, deadline_date, weightage)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [sheetId, empId, g.thrust_area, g.title, g.uom, g.target, g.deadline, g.weight]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    process.exit();
  }
};

seed();
