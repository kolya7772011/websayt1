/**
 * Database Setup Script
 * PostgreSQL schema creation for Face Scan System
 * Run: node server/db/setup.js
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'facescan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Setting up database...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255) UNIQUE,
        face_descriptor JSONB NOT NULL,
        face_image_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_scan_at TIMESTAMP,
        scan_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // Create scan_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) NOT NULL,
        match_confidence FLOAT,
        ip_address VARCHAR(50),
        device_info TEXT
      );
    `);

    // Create indexes for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON scan_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at);
    `);

    // Create update trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database setup complete!');
    console.log('📊 Tables created: users, scan_logs');
    console.log('📌 Indexes created for performance');
  } catch (err) {
    console.error('❌ Database setup error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

setupDatabase();
