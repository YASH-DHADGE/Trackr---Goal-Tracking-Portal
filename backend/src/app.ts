import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';
import { swaggerSpec } from './config/swagger';
import { checkDeadlines } from './jobs/check-deadlines';

// Routes
import cycleRoutes from './routes/cycleRoutes';
import goalSheetRoutes from './routes/goalSheetRoutes';
import goalRoutes from './routes/goalRoutes';
import checkinRoutes from './routes/checkinRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import sharedGoalRoutes from './routes/sharedGoalRoutes';
import chatbotRoutes from './routes/chatbotRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Goal Tracking Portal API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/goal-sheets', goalSheetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shared-goals', sharedGoalRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Schedule night batch jobs
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled deadline check...');
    checkDeadlines();
  });
}

export default app;
