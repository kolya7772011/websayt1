/**
 * FaceScan Pro - Main Express Server
 * Entry point for the backend API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');

// Route modules
const scanRoutes = require('./routes/scanRoutes');
const userRoutes = require('./routes/userRoutes');

// Services
const WorldFileService = require('./services/worldFileService');

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ─────────────────────────────────────────── */

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for development
  crossOriginEmbedderPolicy: false
}));

// CORS - allow frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan('dev'));

// JSON body parser (50mb for base64 face images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ── Static Files ───────────────────────────────────────── */

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded face images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ── Ensure required directories exist ─────────────────── */
const ensureDirs = async () => {
  await fs.ensureDir(path.join(__dirname, '../uploads/faces'));
  await fs.ensureDir(path.join(__dirname, '../data'));
  await WorldFileService.init();
  console.log('📁 Required directories ready');
};

/* ── API Routes ─────────────────────────────────────────── */

// API health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db/db');
    await pool.query('SELECT 1');
    res.json({
      success: true,
      status: 'online',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'online',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Stats endpoint for admin panel
app.get('/api/stats', async (req, res) => {
  try {
    const UserModel = require('./db/userModel');
    const ScanLogModel = require('./db/scanLogModel');
    const worldData = await WorldFileService.getAll();

    const stats = await UserModel.getStats();
    const totalScans = await ScanLogModel.getTotalCount();

    res.json({
      success: true,
      stats: {
        ...stats,
        total_scans: totalScans,
        world_file_records: worldData.scans ? worldData.scans.length : 0
      }
    });
  } catch (err) {
    console.error('❌ /api/stats error:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// World file endpoint
app.get('/api/world', async (req, res) => {
  try {
    const data = await WorldFileService.getAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'World fayl o\'qilmadi' });
  }
});

// Mount route modules
app.use('/api', scanRoutes);
app.use('/api', userRoutes);

/* ── Frontend fallback ───────────────────────────────────── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ── Error handler ───────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Server xatosi yuz berdi',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* ── Start server ─────────────────────────────────────────── */
const startServer = async () => {
  await ensureDirs();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║      FaceScan Pro Server             ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  🚀 Running: http://localhost:${PORT}   ║`);
    console.log(`║  📦 Database: PostgreSQL              ║`);
    console.log(`║  📄 World file: data/world.json       ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
