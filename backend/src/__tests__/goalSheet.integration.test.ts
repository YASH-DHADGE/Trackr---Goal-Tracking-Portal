import request from 'supertest';
import express from 'express';
import goalSheetRoutes from '../routes/goalSheetRoutes';

jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'user-123', role: 'employee' };
    next();
  }
}));

jest.mock('../middleware/roleGuard', () => ({
  roleGuard: () => (req: any, res: any, next: any) => next()
}));

jest.mock('../middleware/windowGuard', () => ({
  windowGuard: () => (req: any, res: any, next: any) => next()
}));

jest.mock('../utils/emailService', () => ({
  sendNotification: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  writeAuditLog: jest.fn()
}));

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

jest.mock('../config/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  getClient: () => mockGetClient()
}));

const app = express();
app.use(express.json());
app.use('/api/goal-sheets', goalSheetRoutes);

describe('Goal Sheet Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const client = {
      query: mockQuery,
      release: jest.fn()
    };
    mockGetClient.mockResolvedValue(client);
  });

  describe('POST /api/goal-sheets/:id/submit', () => {
    it('returns 400 if weightage validation fails', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sheet-1' }] }); // check sheet status
      mockQuery.mockResolvedValueOnce({ rows: [{ weightage: 50 }, { weightage: 40 }] }); // check goals
      
      const response = await request(app).post('/api/goal-sheets/sheet-1/submit');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/must be exactly 100%/);
    });

    it('returns 200 and updates status if validation passes', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'sheet-1' }] }) // check sheet status
        .mockResolvedValueOnce({ rows: [{ weightage: 50 }, { weightage: 50 }] }) // check goals
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'sheet-1', status: 'submitted' }] }) // UPDATE sheet
        .mockResolvedValueOnce({ rows: [] }) // INSERT approval
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [{ email: 'mgr@test.com', full_name: 'Mgr', employee_name: 'Emp' }] }); // Get manager (using top-level query)
      
      const response = await request(app).post('/api/goal-sheets/sheet-1/submit');
      
      if (response.status !== 200) {
        console.log(response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('submitted');
    });
  });
});
