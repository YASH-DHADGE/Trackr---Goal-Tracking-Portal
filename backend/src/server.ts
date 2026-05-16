import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pool } from './config/db';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
import cycleRoutes from './routes/cycleRoutes';
import goalSheetRoutes from './routes/goalSheetRoutes';
import goalRoutes from './routes/goalRoutes';
import checkinRoutes from './routes/checkinRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

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


// Start server
app.listen(PORT, async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
  console.log(`Server is running on port ${PORT}`);
});

