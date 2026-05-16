import app from './app';
import dotenv from 'dotenv';
import { pool } from './config/db';
import { runMigrations } from './config/migrate';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Only avoid app.listen if we are explicitly in a Vercel/Serverless environment
// that handles the entry point itself.
const isServerless = process.env.VERCEL === '1';

if (!isServerless) {
  app.listen(PORT, async () => {
    try {
      console.log('🚀 Checking for database migrations...');
      await runMigrations();
      
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
    } catch (err) {
      console.error('❌ Startup error:', err);
    }
    console.log(`📡 Server is running on port ${PORT}`);
  });
}

export default app;
