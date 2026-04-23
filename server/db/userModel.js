/**
 * User Model - CRUD operations for PostgreSQL
 * Handles all database interactions for users
 */

const pool = require('./db');

const UserModel = {

  /**
   * Get all users (for admin panel)
   */
  async getAll() {
    const result = await pool.query(
      `SELECT id, first_name, last_name, phone, email, 
              created_at, last_scan_at, scan_count, is_active
       FROM users 
       WHERE is_active = TRUE 
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all users with face descriptors for comparison
   */
  async getAllWithFaceData() {
    const result = await pool.query(
      `SELECT id, first_name, last_name, phone, email, 
              face_descriptor, face_image_path, scan_count
       FROM users 
       WHERE is_active = TRUE`
    );
    return result.rows;
  },

  /**
   * Create new user with face data
   */
  async create({ first_name, last_name, phone, email, face_descriptor, face_image_path }) {
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, phone, email, face_descriptor, face_image_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, phone, email, created_at`,
      [first_name, last_name, phone, email, JSON.stringify(face_descriptor), face_image_path]
    );
    return result.rows[0];
  },

  /**
   * Update last scan time and increment scan count
   */
  async updateScanInfo(id) {
    const result = await pool.query(
      `UPDATE users 
       SET last_scan_at = NOW(), scan_count = scan_count + 1
       WHERE id = $1
       RETURNING id, first_name, last_name, phone, email, scan_count, last_scan_at`,
      [id]
    );
    return result.rows[0];
  },

  /**
   * Update user data
   */
  async update(id, { first_name, last_name, phone, email }) {
    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, email = $4
       WHERE id = $5
       RETURNING id, first_name, last_name, phone, email`,
      [first_name, last_name, phone, email, id]
    );
    return result.rows[0];
  },

  /**
   * Soft delete user
   */
  async delete(id) {
    await pool.query(
      'UPDATE users SET is_active = FALSE WHERE id = $1',
      [id]
    );
    return { success: true };
  },

  /**
   * Get total user count
   */
  async getCount() {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Get scan statistics
   */
  async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(scan_count) as total_scans,
        MAX(last_scan_at) as last_scan,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_today
      FROM users 
      WHERE is_active = TRUE
    `);
    return result.rows[0];
  }
};

module.exports = UserModel;
