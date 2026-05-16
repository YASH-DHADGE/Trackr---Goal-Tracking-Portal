import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// ---------- REGISTER ----------
router.post('/register', async (req: Request, res: Response) => {
  const { full_name, email, password, role, employee_code, department_id, designation } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email and password are required' });
  }

  try {
    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // Simple: store password as-is (no bcrypt to avoid native deps in hackathon)
    const code = employee_code || `EMP-${Date.now()}`;
    const userRole = role || 'employee';

    const result = await query(
      `INSERT INTO users (employee_code, full_name, email, password_hash, role, department_id, designation)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, employee_code, full_name, email, role, designation`,
      [code, full_name, email, password, userRole, department_id || null, designation || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret_for_dev',
      { expiresIn: '8h' }
    );

    res.status(201).json({ token, role: user.role, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during registration' });
  }
});

// ---------- LOGIN ----------
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret_for_dev',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      role: user.role,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        employee_code: user.employee_code,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ---------- ME (current user profile) ----------
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, employee_code, full_name, email, role, designation, department_id, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user?.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

export default router;
