import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, password]
 *             properties:
 *               full_name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [employee, manager, admin] }
 *     responses:
 *       201: { description: User created successfully }
 *       409: { description: Email already registered }
 */
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in successfully }
 *       401: { description: Invalid email or password }
 *       429: { description: Too many requests }
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profile data }
 *       401: { description: Unauthorized }
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.employee_code, u.full_name, u.email, u.role, u.designation, u.department_id, u.is_active, u.created_at,
              m.full_name as manager_name
       FROM users u
       LEFT JOIN user_reporting ur ON u.id = ur.employee_id AND ur.is_active = TRUE
       LEFT JOIN users m ON ur.manager_id = m.id
       WHERE u.id = $1`,
      [req.user?.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

export default router;
