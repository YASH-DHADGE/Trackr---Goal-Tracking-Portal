import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.designation, u.is_active, u.created_at,
              ur.manager_id
       FROM users u
       LEFT JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['employee', 'manager', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, role`,
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating user' });
  }
};

export const toggleUserActive = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, full_name, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error toggling user' });
  }
};
