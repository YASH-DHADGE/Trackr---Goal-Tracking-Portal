import fs from 'fs';
import path from 'path';
import { getClient } from './db';

export const runMigrations = async () => {
  console.log('🚀 Checking for database migrations...');
  const client = await getClient();
  
  try {
    // 1. Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn('⚠️ Migrations directory not found:', migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // 3. Get executed migrations
    const { rows } = await client.query('SELECT name FROM _migrations');
    const executed = new Set(rows.map(r => r.name));

    // Special case: if _migrations is empty but 'users' table already exists, 
    // mark the initial migration as done to avoid errors.
    if (executed.size === 0) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `);
      if (tableCheck.rows[0].exists) {
        console.log('  ℹ️  Existing tables detected. Seeding migration history...');
        // We assume 001_initial_schema.sql was the one that created these.
        const initialFile = files.find(f => f.includes('initial_schema'));
        if (initialFile) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [initialFile]);
          executed.add(initialFile);
          console.log(`  ✅ Marked ${initialFile} as already executed.`);
        }
      }
    }

    // 4. Run new migrations
    for (const file of files) {
      if (!executed.has(file)) {
        console.log(`  📄 Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
          await client.query('BEGIN');
          // Split by semi-colon if needed, but pg can handle multiple statements in one query call
          // However, some complex SQL might need careful handling. 
          // For simple schemas, client.query(sql) works fine for multiple statements.
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`  ✅ Migration ${file} completed.`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  ❌ Error in migration ${file}:`, err);
          throw err;
        }
      }
    }
    
    console.log('✅ All migrations are up to date.');
  } catch (err) {
    console.error('❌ Migration runner failed:', err);
    throw err;
  } finally {
    client.release();
  }
};
