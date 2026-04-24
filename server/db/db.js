/**
 * Database Connection Pool
 * Manages PostgreSQL connection using pg library
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create connection pool
// Connection config
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  host: !connectionString ? (process.env.DB_HOST || 'localhost') : undefined,
  port: !connectionString ? (parseInt(process.env.DB_PORT) || 5432) : undefined,
  database: !connectionString ? (process.env.DB_NAME || 'facescan_db') : undefined,
  user: !connectionString ? (process.env.DB_USER || 'postgres') : undefined,
  password: !connectionString ? (process.env.DB_PASSWORD || 'password') : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Test connection on startup
pool.on('connect', () => {
  console.log('📦 PostgreSQL pool connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

module.exports = pool;
