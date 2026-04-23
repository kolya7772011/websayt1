/**
 * API Service Module
 * Handles all communication with the backend REST API
 */

const API_BASE = '/api';

const API = {

  /** Check server health */
  async health() {
    const r = await fetch(`${API_BASE}/health`);
    return r.json();
  },

  /** Get site statistics */
  async stats() {
    const r = await fetch(`${API_BASE}/stats`);
    return r.json();
  },

  /**
   * POST /api/scan
   * Send face descriptor to backend for matching
   */
  async scan(faceDescriptor, deviceInfo) {
    const r = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceDescriptor, deviceInfo })
    });
    return r.json();
  },

  /**
   * POST /api/register
   * Register new user with face data
   */
  async register({ first_name, last_name, phone, email, faceDescriptor, faceImageBase64 }) {
    const formData = new FormData();
    formData.append('first_name', first_name);
    formData.append('last_name', last_name);
    if (phone) formData.append('phone', phone);
    if (email) formData.append('email', email);
    formData.append('faceDescriptor', JSON.stringify(faceDescriptor));

    // Convert base64 to blob if provided
    if (faceImageBase64) {
      const blob = await fetch(faceImageBase64).then(r => r.blob());
      formData.append('faceImage', blob, 'face.jpg');
    }

    const r = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      body: formData
    });
    return r.json();
  },

  /**
   * POST /api/check-user
   * Check if user exists by email
   */
  async checkUser(email) {
    const r = await fetch(`${API_BASE}/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return r.json();
  },

  /**
   * POST /api/save-user
   * Trigger save to world.json for a userId
   */
  async saveUser(userId) {
    const r = await fetch(`${API_BASE}/save-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return r.json();
  },

  /** GET /api/users — all users list */
  async getUsers() {
    const r = await fetch(`${API_BASE}/users`);
    return r.json();
  },

  /** DELETE /api/users/:id */
  async deleteUser(id) {
    const r = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    return r.json();
  },

  /** GET /api/world — world.json data */
  async getWorldData() {
    const r = await fetch(`${API_BASE}/world`);
    return r.json();
  },

  /** GET /api/scan/logs */
  async getScanLogs() {
    const r = await fetch(`${API_BASE}/scan/logs`);
    return r.json();
  }
};
