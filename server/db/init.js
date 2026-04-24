const pool = require('./db');

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking database tables...');
    
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

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);

    console.log('✅ Database tables are ready');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  } finally {
    client.release();
  }
};

module.exports = initDb;
