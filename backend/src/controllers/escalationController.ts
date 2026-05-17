import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getEscalations = async (req: AuthRequest, res: Response) => {
  try {
    const { status, trigger_type } = req.query;
    let queryStr = `
      SELECT e.*, 
             u.full_name as target_user_name, u.email as target_user_email, u.role as target_user_role,
             rc.name as cycle_name
      FROM escalations e
      JOIN users u ON e.target_user_id = u.id
      JOIN review_cycles rc ON e.cycle_id = rc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      queryStr += ` AND e.status = $${params.length}`;
    }
    
    if (trigger_type) {
      params.push(trigger_type);
      queryStr += ` AND e.trigger_type = $${params.length}`;
    }
    
    queryStr += ` ORDER BY e.created_at DESC`;
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching escalations' });
  }
};

export const getEscalationById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT e.*, 
             u.full_name as target_user_name, u.email as target_user_email, u.role as target_user_role,
             rc.name as cycle_name,
             r.full_name as resolved_by_name
      FROM escalations e
      JOIN users u ON e.target_user_id = u.id
      JOIN review_cycles rc ON e.cycle_id = rc.id
      LEFT JOIN users r ON e.resolved_by = r.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Escalation not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching escalation' });
  }
};

export const resolveEscalation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user?.userId;
  
  try {
    const result = await query(`
      UPDATE escalations 
      SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, notes = COALESCE($2, notes), updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [adminId, notes, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Escalation not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error resolving escalation' });
  }
};

export const ignoreEscalation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user?.userId;
  
  try {
    const result = await query(`
      UPDATE escalations 
      SET status = 'ignored', resolved_at = NOW(), resolved_by = $1, notes = COALESCE($2, notes), updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [adminId, notes, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Escalation not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error ignoring escalation' });
  }
};
