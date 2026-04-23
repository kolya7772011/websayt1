/**
 * Scan Routes - /api/scan, /api/check-user
 * Handles face scanning and user matching logic
 */

const express = require('express');
const router = express.Router();
const UserModel = require('../db/userModel');
const ScanLogModel = require('../db/scanLogModel');
const WorldFileService = require('../services/worldFileService');
const FaceMatchService = require('../services/faceMatchService');

/**
 * POST /api/scan
 * Main scan endpoint: receives face descriptor, finds match in DB
 * Returns user data if found, or 'not_found' status
 */
router.post('/scan', async (req, res) => {
  try {
    const { faceDescriptor, deviceInfo } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate face descriptor
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Yuz ma\'lumoti (face descriptor) talab qilinadi'
      });
    }

    // Load all users with face data from DB
    const allUsers = await UserModel.getAllWithFaceData();

    if (allUsers.length === 0) {
      // No users in DB at all
      await ScanLogModel.create({
        user_id: null,
        status: 'not_found',
        match_confidence: 0,
        ip_address: ipAddress,
        device_info: deviceInfo
      });

      return res.json({
        success: true,
        status: 'not_found',
        message: 'Foydalanuvchi topilmadi. Ro\'yxatdan o\'ting.'
      });
    }

    // Find best match using euclidean distance
    const match = FaceMatchService.findBestMatch(faceDescriptor, allUsers);

    if (match.found) {
      // User found — update scan info in DB
      const updatedUser = await UserModel.updateScanInfo(match.user.id);

      // Save user info to world.json file
      await WorldFileService.saveUser(updatedUser);

      // Log the scan
      await ScanLogModel.create({
        user_id: match.user.id,
        status: 'found',
        match_confidence: match.confidence,
        ip_address: ipAddress,
        device_info: deviceInfo
      });

      return res.json({
        success: true,
        status: 'found',
        message: 'Xush kelibsiz!',
        user: {
          id: updatedUser.id,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
          email: updatedUser.email,
          scan_count: updatedUser.scan_count,
          last_scan_at: updatedUser.last_scan_at
        },
        confidence: match.confidence
      });
    } else {
      // No match found
      await ScanLogModel.create({
        user_id: null,
        status: 'not_found',
        match_confidence: match.confidence,
        ip_address: ipAddress,
        device_info: deviceInfo
      });

      return res.json({
        success: true,
        status: 'not_found',
        message: 'Foydalanuvchi topilmadi. Ro\'yxatdan o\'ting.'
      });
    }

  } catch (err) {
    console.error('❌ /api/scan error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/check-user
 * Check if user exists by email (quick lookup)
 */
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email talab qilinadi'
      });
    }

    const user = await UserModel.findByEmail(email);

    return res.json({
      success: true,
      exists: !!user,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      } : null
    });

  } catch (err) {
    console.error('❌ /api/check-user error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

/**
 * GET /api/scan/logs
 * Get recent scan logs (admin)
 */
router.get('/scan/logs', async (req, res) => {
  try {
    const logs = await ScanLogModel.getRecent(50);
    res.json({ success: true, logs });
  } catch (err) {
    console.error('❌ /api/scan/logs error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
