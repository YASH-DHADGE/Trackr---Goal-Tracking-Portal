import app from './app';
import dotenv from 'dotenv';
import { pool } from './config/db';
import { runMigrations } from './config/migrate';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Start server if not running as a serverless function
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production') {
  app.listen(PORT, async () => {
    try {
      await runMigrations();
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
    } catch (err) {
      console.error('❌ Database connection error:', err);
    }
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
