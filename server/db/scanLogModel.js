/**
 * Scan Log Model - CRUD for scan_logs table
 */

const pool = require('./db');

const ScanLogModel = {

  /**
   * Create a new scan log entry
   */
  async create({ user_id, status, match_confidence, ip_address, device_info }) {
    const result = await pool.query(
      `INSERT INTO scan_logs (user_id, status, match_confidence, ip_address, device_info)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, status, match_confidence, ip_address, device_info]
    );
    return result.rows[0];
  },

  /**
   * Get recent scan logs with user info
   */
  async getRecent(limit = 50) {
    const result = await pool.query(
      `SELECT 
        sl.id, sl.status, sl.match_confidence, sl.scanned_at, sl.ip_address,
        u.first_name, u.last_name, u.email
       FROM scan_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       ORDER BY sl.scanned_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  /**
   * Get total scan count
   */
  async getTotalCount() {
    const result = await pool.query('SELECT COUNT(*) as count FROM scan_logs');
    return parseInt(result.rows[0].count);
  }
};

module.exports = ScanLogModel;
