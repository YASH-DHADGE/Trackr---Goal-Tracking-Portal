import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connect to PostgreSQL (Supabase provides a connection string via DATABASE_URL)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  }
});

// Register error listener on the pool to handle errors on idle clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL client:', err);
});


// A helper for querying the DB (one-off queries)
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// A helper for transactions (manual client checkout)
export const getClient = () => {
  return pool.connect();
};
