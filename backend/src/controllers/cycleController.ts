import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllCycles = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM review_cycles ORDER BY start_date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching cycles' });
  }
};

export const createCycle = async (req: AuthRequest, res: Response) => {
  const { name, start_date, end_date } = req.body;
  const createdBy = req.user?.userId;

  try {
    const result = await query(
      `INSERT INTO review_cycles (name, start_date, end_date, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, start_date, end_date, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating cycle' });
  }
};

export const updateCycleStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'draft', 'active', 'closed'

  try {
    const result = await query(
      `UPDATE review_cycles SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cycle not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating cycle' });
  }
};

export const getCycleWindows = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM cycle_windows WHERE cycle_id = $1 ORDER BY window_type', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching cycle windows' });
  }
};

export const createOrUpdateWindow = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { window_type, opens_at, closes_at, is_active } = req.body;

  try {
    const result = await query(
      `INSERT INTO cycle_windows (cycle_id, window_type, opens_at, closes_at, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cycle_id, window_type) 
       DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at, is_active = EXCLUDED.is_active, updated_at = NOW()
       RETURNING *`,
      [id, window_type, opens_at, closes_at, is_active || false]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating window' });
  }
};
