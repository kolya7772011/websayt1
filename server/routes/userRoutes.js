/**
 * User Routes - /api/register, /api/save-user, /api/users
 * Handles user registration and management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const UserModel = require('../db/userModel');
const WorldFileService = require('../services/worldFileService');

// Multer storage config for face images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/faces'));
  },
  filename: (req, file, cb) => {
    const unique = `face_${uuidv4()}_${Date.now()}.jpg`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayl qabul qilinadi'), false);
    }
  }
});

/**
 * POST /api/register
 * Register a new user with face data
 * Body: { first_name, last_name, phone, email, faceDescriptor, faceImage (base64) }
 */
router.post('/register', upload.single('faceImage'), async (req, res) => {
  try {
    const { first_name, last_name, phone, email, faceDescriptor } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'Ism, familiya va yuz ma\'lumoti talab qilinadi'
      });
    }

    // Parse face descriptor
    let parsedDescriptor;
    try {
      parsedDescriptor = typeof faceDescriptor === 'string'
        ? JSON.parse(faceDescriptor)
        : faceDescriptor;
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Yuz ma\'lumoti noto\'g\'ri formatda'
      });
    }

    // Check if email already exists
    if (email) {
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Bu email bilan foydalanuvchi allaqachon ro\'yxatdan o\'tgan'
        });
      }
    }

    // Get face image path if uploaded
    const faceImagePath = req.file ? `/uploads/faces/${req.file.filename}` : null;

    // Save to PostgreSQL
    const newUser = await UserModel.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone || null,
      email: email ? email.toLowerCase().trim() : null,
      face_descriptor: parsedDescriptor,
      face_image_path: faceImagePath
    });

    // Save to world.json as well
    await WorldFileService.saveUser(newUser);

    return res.status(201).json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!',
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        email: newUser.email,
        created_at: newUser.created_at
      }
    });

  } catch (err) {
    console.error('❌ /api/register error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xatolik',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/save-user
 * Save/update user info to world.json (called after successful scan)
 */
router.post('/save-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId talab qilinadi' });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    await WorldFileService.saveUser(user);

    return res.json({
      success: true,
      message: 'Foydalanuvchi ma\'lumotlari world.json ga saqlandi',
      filePath: process.env.WORLD_FILE || './data/world.json'
    });

  } catch (err) {
    console.error('❌ /api/save-user error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

/**
 * GET /api/users
 * Get all users list (admin panel)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.getAll();
    const stats = await UserModel.getStats();

    res.json({
      success: true,
      count: users.length,
      stats,
      users
    });
  } catch (err) {
    console.error('❌ /api/users error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('❌ /api/users/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

/**
 * DELETE /api/users/:id
 * Soft delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    await UserModel.delete(req.params.id);
    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' });
  } catch (err) {
    console.error('❌ DELETE /api/users/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
