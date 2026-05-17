import { Router } from 'express';
import { chatWithAI } from '../controllers/chatbotController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Secure chatbot communications using the JWT auth middleware
router.use(authMiddleware);

// POST /api/chatbot/chat
router.post('/chat', chatWithAI);

export default router;
