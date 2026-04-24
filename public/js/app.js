/**
 * App.js — Main Application Controller
 * Wires together FaceScanner + API + UI
 */

/* ── State ── */
let currentFaceData = null; // { descriptor, imageDataUrl }
let cameraActive = false;

/* ═══════════════════ SECTION NAVIGATION ═══════════════════ */

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === name);
  });
  // Reset result when navigating away from scan
  if (name !== 'scan') {
    document.getElementById('result-section').style.display = 'none';
  }
}

/* ═══════════════════ TOAST NOTIFICATIONS ═══════════════════ */

function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-text">${message}</span>
    <span class="toast-close" onclick="removeToast(this.parentElement)">✕</span>
  `;
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(el) {
  el.classList.add('hide');
  setTimeout(() => el.remove(), 300);
}

/* ═══════════════════ SERVER HEALTH ═══════════════════ */

async function checkHealth() {
  const dot = document.getElementById('serverDot');
  const statusEl = document.getElementById('serverStatus');
  const dbText = document.getElementById('dbStatusText');
  try {
    const data = await API.health();
    if (data.database === 'connected') {
      dot.style.background = '#10b981';
      statusEl.textContent = 'Online';
      dbText.textContent = 'PostgreSQL ulangan ✓ — ' + new Date().toLocaleTimeString();
    } else {
      dot.style.background = '#f59e0b';
      statusEl.textContent = 'DB offline';
      dbText.textContent = 'Database ulana olmadi — serverni tekshiring';
    }
    // Load stats for hero
    loadStats();
  } catch {
    dot.style.background = '#ef4444';
    statusEl.textContent = 'Offline';
    dbText.textContent = 'Server ishlamayapti — npm run dev';
  }
}

/* ═══════════════════ STATS ═══════════════════ */

async function loadStats() {
  try {
    const { stats } = await API.stats();
    animateNumber('statUsers', stats.total_users || 0);
    animateNumber('statScans', stats.total_scans || 0);
    animateNumber('statWorldRecords', stats.world_file_records || 0);
    animateNumber('statToday', stats.new_today || 0);
  } catch { /* server offline — keep dashes */ }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ═══════════════════ CAMERA ═══════════════════ */

async function startCamera() {
  const statusText = document.getElementById('cameraStatusText');
  const btnStart = document.getElementById('btnStartCamera');
  const btnScan = document.getElementById('btnScan');
  const btnStop = document.getElementById('btnStopCamera');

  try {
    statusText.textContent = 'Modellar yuklanmoqda...';
    btnStart.disabled = true;
    btnStart.innerHTML = '<span class="spinner"></span> Yuklanmoqda...';

    // Load face-api models
    await FaceScanner.loadModels((msg) => { statusText.textContent = msg });

    // Start webcam
    const video = document.getElementById('videoElement');
    const canvas = document.getElementById('canvas');
    await FaceScanner.startCamera(video);

    cameraActive = true;
    FaceScanner.startLiveDetection(video, canvas);

    // Update UI
    btnStart.style.display = 'none';
    btnScan.style.display = 'flex';
    btnStop.style.display = 'flex';

    document.querySelector('.status-dot', '#cameraWrapper').style.background = '#10b981';
    statusText.textContent = 'Kamera yoqildi — yuzingizni ko\'rsating';
    document.getElementById('cameraStatus').querySelector('.status-dot').style.background = '#10b981';

    showToast('Kamera yoqildi! Yuzingizni freymga joylashtiring.', 'info');

  } catch (err) {
    console.error(err);
    let errorMsg = 'Kameraga ruxsat berilmagan!';
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      errorMsg = 'Kamera uchun HTTPS xavfsiz ulanish talab qilinadi!';
    } else if (err.name === 'NotAllowedError') {
      errorMsg = 'Kameraga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMsg = 'Kamera topilmadi.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMsg = 'Kamera boshqa ilova tomonidan ishlatilmoqda.';
    }

    statusText.textContent = errorMsg;
    btnStart.disabled = false;
    btnStart.innerHTML = '📷 Kamerani yoqish';
    showToast(errorMsg, 'error');
  }
}

function stopCamera() {
  FaceScanner.stopCamera();
  FaceScanner.stopLiveDetection();
  cameraActive = false;

  const video = document.getElementById('videoElement');
  video.srcObject = null;
  const ctx = document.getElementById('canvas').getContext('2d');
  ctx.clearRect(0, 0, 640, 480);

  document.getElementById('btnStartCamera').style.display = 'flex';
  document.getElementById('btnStartCamera').disabled = false;
  document.getElementById('btnStartCamera').innerHTML = '📷 Kamerani yoqish';
  document.getElementById('btnScan').style.display = 'none';
  document.getElementById('btnStopCamera').style.display = 'none';
  document.getElementById('cameraStatusText').textContent = 'Kamera o\'chiq';
  document.getElementById('scanOverlay').style.display = 'none';
  document.getElementById('scanStatusMsg').textContent = '';

  currentFaceData = null;
}

/* ═══════════════════ SCAN ═══════════════════ */

async function doScan() {
  const btnScan = document.getElementById('btnScan');
  const overlay = document.getElementById('scanOverlay');
  const statusMsg = document.getElementById('scanStatusMsg');

  try {
    overlay.style.display = 'flex';
    btnScan.disabled = true;
    btnScan.innerHTML = '<span class="spinner"></span> Skanerlanyapti...';
    statusMsg.textContent = '🔍 Yuz aniqlanmoqda...';

    const video = document.getElementById('videoElement');
    const canvas = document.getElementById('canvas');
    FaceScanner.stopLiveDetection();

    // Detect face
    const faceData = await FaceScanner.detectFace(video, canvas);

    if (!faceData) {
      overlay.style.display = 'none';
      btnScan.disabled = false;
      btnScan.innerHTML = '🔬 Skaner qilish';
      statusMsg.textContent = '';
      FaceScanner.startLiveDetection(video, canvas);
      showToast('Yuz aniqlanmadi. Yuzingizni kameraga to\'g\'ri qarating!', 'error');
      return;
    }

    currentFaceData = faceData;
    statusMsg.textContent = '☁️ Server tekshirilmoqda...';

    // Send to backend
    const result = await API.scan(
      faceData.descriptor,
      navigator.userAgent
    );

    overlay.style.display = 'none';
    btnScan.disabled = false;
    btnScan.innerHTML = '🔬 Skaner qilish';
    statusMsg.textContent = '';

    if (result.status === 'found') {
      showScanResult(result);
    } else {
      // Not found — open registration modal
      showToast('Yangi foydalanuvchi! Iltimos ro\'yxatdan o\'ting.', 'info');
      openRegistrationModal(faceData.imageDataUrl);
    }

    FaceScanner.startLiveDetection(video, canvas);

  } catch (err) {
    console.error('Scan error:', err);
    overlay.style.display = 'none';
    btnScan.disabled = false;
    btnScan.innerHTML = '🔬 Skaner qilish';
    statusMsg.textContent = '';
    showToast('Server bilan bog\'lanib bo\'lmadi. Backend ishlaydimi?', 'error');
    FaceScanner.startLiveDetection(document.getElementById('videoElement'), document.getElementById('canvas'));
  }
}

/* ═══════════════════ RESULT ═══════════════════ */

function showScanResult(result) {
  const { user, confidence } = result;
  const section = document.getElementById('result-section');
  section.style.display = 'block';

  document.getElementById('resultName').textContent = `${user.first_name} ${user.last_name}`;
  document.getElementById('resultEmail').textContent = user.email || user.phone || '';
  document.getElementById('resultAvatar').textContent = user.first_name.charAt(0).toUpperCase();

  // Meta badges
  const meta = document.getElementById('resultMeta');
  meta.innerHTML = `
    <span class="result-badge">📸 ${user.scan_count} ta skan</span>
    <span class="result-badge">✅ Topildi</span>
    <span class="result-badge">🎯 ${confidence}% aniqlik</span>
  `;

  // Confidence bar
  setTimeout(() => {
    document.getElementById('confidenceFill').style.width = confidence + '%';
  }, 100);
  document.getElementById('confidenceText').textContent = `Yuz mos keldi: ${confidence}%`;

  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast(`Xush kelibsiz, ${user.first_name}! Ma'lumotlar world.json ga saqlandi.`, 'success', 5000);
}

function resetScan() {
  document.getElementById('result-section').style.display = 'none';
  document.getElementById('confidenceFill').style.width = '0%';
  currentFaceData = null;
}

/* ═══════════════════ REGISTRATION MODAL ═══════════════════ */

function openRegistrationModal(imageDataUrl) {
  const modal = document.getElementById('regModal');
  const preview = document.getElementById('facePreviewImg');

  // Show face snapshot in modal
  if (imageDataUrl) {
    preview.src = imageDataUrl;
    document.getElementById('facePreviewWrapper').style.display = 'block';
  } else {
    document.getElementById('facePreviewWrapper').style.display = 'none';
  }

  // Clear form
  document.getElementById('regForm').reset();
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('regModal').classList.remove('active');
}

// Close modal on backdrop click
document.getElementById('regModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

async function submitRegistration(e) {
  e.preventDefault();
  const btn = document.getElementById('regSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saqlanmoqda...';

  try {
    const data = {
      first_name: document.getElementById('regFirstName').value.trim(),
      last_name: document.getElementById('regLastName').value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      faceDescriptor: currentFaceData ? currentFaceData.descriptor : [],
      faceImageBase64: currentFaceData ? currentFaceData.imageDataUrl : null
    };

    const result = await API.register(data);

    if (result.success) {
      closeModal();
      showToast(`${data.first_name} muvaffaqiyatli ro'yxatdan o'tdi!`, 'success', 5000);
      // Show success result
      showScanResult({
        user: { ...result.user, scan_count: 1 },
        confidence: 100
      });
      loadStats(); // Refresh stats
    } else {
      showToast(result.message || 'Ro\'yxatdan o\'tishda xato', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>✅ Saqlash</span>';
    }
  } catch (err) {
    console.error(err);
    showToast('Server xatosi. Backend ishlaydimi?', 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>✅ Saqlash</span>';
  }
}

/* ═══════════════════ ADMIN PANEL ═══════════════════ */

async function loadAdminData() {
  try {
    const [usersRes, statsRes, worldRes] = await Promise.all([
      API.getUsers(),
      API.stats(),
      API.getWorldData()
    ]);

    // Stats
    if (statsRes.stats) {
      document.getElementById('adminStatUsers').textContent = statsRes.stats.total_users || 0;
      document.getElementById('adminStatScans').textContent = statsRes.stats.total_scans || 0;
      document.getElementById('adminStatToday').textContent = statsRes.stats.new_today || 0;
      document.getElementById('adminStatWorld').textContent = statsRes.stats.world_file_records || 0;
    }

    // Users table
    const tbody = document.getElementById('usersTableBody');
    document.getElementById('adminUserCount').textContent = (usersRes.users || []).length + ' ta';

    if (!usersRes.users || usersRes.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Foydalanuvchilar yo'q</td></tr>`;
    } else {
      tbody.innerHTML = usersRes.users.map(u => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar-sm">${u.first_name.charAt(0)}</div>
              <span style="color:var(--text-primary);font-weight:500">${u.first_name} ${u.last_name}</span>
            </div>
          </td>
          <td>${u.email || '—'}</td>
          <td>${u.phone || '—'}</td>
          <td><span class="result-badge">${u.scan_count || 0}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString('uz-UZ')}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}','${u.first_name}')">🗑️</button>
          </td>
        </tr>
      `).join('');
    }

    // World log
    const logEl = document.getElementById('adminWorldLog');
    const scans = (worldRes.data && worldRes.data.scans) ? worldRes.data.scans : [];
    if (scans.length === 0) {
      logEl.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px">World.json bo'sh</div>`;
    } else {
      logEl.innerHTML = scans.slice(0, 20).map(s => `
        <div class="world-log-item">
          <div>
            <div class="world-log-name">${s.full_name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${s.email || s.phone || 'ID: '+s.user_id}</div>
          </div>
          <div class="world-log-time">${new Date(s.scanned_at).toLocaleString('uz-UZ')}</div>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Admin data error:', err);
    showToast('Admin ma\'lumotlari yuklanmadi. Backend ishlaydimi?', 'error');
  }
}

async function deleteUser(id, name) {
  if (!confirm(`${name}ni o'chirmoqchimisiz?`)) return;
  try {
    await API.deleteUser(id);
    showToast(`${name} o'chirildi`, 'success');
    loadAdminData();
  } catch {
    showToast('O\'chirishda xato', 'error');
  }
}

/* ═══════════════════ WORLD LOG (HOME) ═══════════════════ */

async function loadWorldLog() {
  const card = document.getElementById('worldLogCard');
  const list = document.getElementById('worldLogList');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
  if (card.style.display === 'none') return;

  try {
    const { data } = await API.getWorldData();
    const scans = data && data.scans ? data.scans : [];
    if (scans.length === 0) {
      list.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px">Hali skan yo'q</div>`;
    } else {
      list.innerHTML = scans.slice(0, 10).map(s => `
        <div class="world-log-item">
          <div class="world-log-name">${s.full_name}</div>
          <div class="world-log-time">${new Date(s.scanned_at).toLocaleString('uz-UZ')}</div>
        </div>
      `).join('');
    }
  } catch {
    list.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px">Server offline</div>`;
  }
}

/* ═══════════════════ INIT ═══════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  setTimeout(loadStats, 1000);
});
