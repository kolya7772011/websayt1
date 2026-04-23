/**
 * World File Service
 * Saves recognized user data to world.json file
 * Each scan appends a record with timestamp
 */

const fs = require('fs-extra');
const path = require('path');

// Path to world.json data file
const WORLD_FILE_PATH = path.resolve(
  process.env.WORLD_FILE || path.join(__dirname, '../../data/world.json')
);

const WorldFileService = {

  /**
   * Initialize world.json if it doesn't exist
   */
  async init() {
    await fs.ensureDir(path.dirname(WORLD_FILE_PATH));
    const exists = await fs.pathExists(WORLD_FILE_PATH);
    if (!exists) {
      await fs.writeJson(WORLD_FILE_PATH, { scans: [] }, { spaces: 2 });
      console.log(`📄 world.json created at: ${WORLD_FILE_PATH}`);
    }
  },

  /**
   * Save user scan record to world.json
   * @param {Object} user - User object with id, first_name, last_name, etc.
   */
  async saveUser(user) {
    try {
      await this.init();

      // Read existing data
      let data = await fs.readJson(WORLD_FILE_PATH);
      if (!data.scans) data.scans = [];

      // Create scan record
      const scanRecord = {
        id: data.scans.length + 1,
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        phone: user.phone || null,
        email: user.email || null,
        scanned_at: new Date().toISOString(),
        scan_count: user.scan_count || 1
      };

      // Add to scans array
      data.scans.unshift(scanRecord); // newest first

      // Keep only last 1000 records to prevent huge file
      if (data.scans.length > 1000) {
        data.scans = data.scans.slice(0, 1000);
      }

      // Update metadata
      data.last_updated = new Date().toISOString();
      data.total_scans = data.scans.length;

      // Write back to file
      await fs.writeJson(WORLD_FILE_PATH, data, { spaces: 2 });

      console.log(`✅ Saved to world.json: ${user.first_name} ${user.last_name}`);
      return scanRecord;

    } catch (err) {
      console.error('❌ WorldFileService.saveUser error:', err.message);
      throw err;
    }
  },

  /**
   * Read all records from world.json
   */
  async getAll() {
    try {
      await this.init();
      const data = await fs.readJson(WORLD_FILE_PATH);
      return data;
    } catch (err) {
      console.error('❌ WorldFileService.getAll error:', err.message);
      return { scans: [] };
    }
  },

  /**
   * Clear all records (admin action)
   */
  async clear() {
    await fs.writeJson(WORLD_FILE_PATH, {
      scans: [],
      cleared_at: new Date().toISOString()
    }, { spaces: 2 });
    console.log('🗑️ world.json cleared');
  }
};

module.exports = WorldFileService;
