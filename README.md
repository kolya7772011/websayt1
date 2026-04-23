# FaceScan Pro — Yuz Tanish Tizimi

## 🚀 Loyiha haqida

Premium dark mode glassmorphism dizaynli, face-api.js va PostgreSQL asosidagi biometrik identifikatsiya tizimi.

## 📁 Project Struktura

```
web sayt/
├── package.json              # NPM konfiguratsiya
├── .env                      # Muhit o'zgaruvchilari
├── server/
│   ├── server.js             # Asosiy Express server
│   ├── db/
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── setup.js          # DB schema yaratish
│   │   ├── userModel.js      # User CRUD
│   │   └── scanLogModel.js   # Scan log CRUD
│   ├── routes/
│   │   ├── scanRoutes.js     # /api/scan, /api/check-user
│   │   └── userRoutes.js     # /api/register, /api/users
│   └── services/
│       ├── faceMatchService.js  # Euclidean face matching
│       └── worldFileService.js  # world.json boshqaruv
├── public/
│   ├── index.html            # Asosiy HTML (1 sahifa SPA)
│   ├── css/
│   │   └── style.css         # Premium glassmorphism CSS
│   └── js/
│       ├── faceScanner.js    # face-api.js wrapper
│       ├── api.js            # Backend API calls
│       └── app.js            # Asosiy UI controller
├── data/
│   └── world.json            # Skan yozuvlari (auto yaratiladi)
└── uploads/
    └── faces/                # Yuz rasmlari (auto yaratiladi)
```

## ⚡ O'rnatish va ishga tushirish

### 1. Node.js o'rnatish
[Node.js](https://nodejs.org) dan LTS versiyasini yuklab o'rnating.

### 2. PostgreSQL o'rnatish
[PostgreSQL](https://www.postgresql.org/download/) yuklab o'rnating.
`facescan_db` nomli database yarating:
```sql
CREATE DATABASE facescan_db;
```

### 3. `.env` faylini sozlash
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facescan_db
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
```

### 4. Dependencies o'rnatish
```bash
npm install
```

### 5. Database setup
```bash
npm run setup-db
```

### 6. Serverni ishga tushirish
```bash
npm run dev       # Development (nodemon bilan)
# yoki
npm start         # Production
```

### 7. Brauzerda ochish
```
http://localhost:3000
```

## 🔌 API Endpoints

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | `/api/scan` | Yuzni skanerlash va taqqoslash |
| POST | `/api/register` | Yangi foydalanuvchi ro'yxatdan o'tkazish |
| POST | `/api/check-user` | Email orqali tekshirish |
| POST | `/api/save-user` | world.json ga saqlash |
| GET | `/api/users` | Barcha foydalanuvchilar |
| DELETE | `/api/users/:id` | Foydalanuvchini o'chirish |
| GET | `/api/stats` | Statistika |
| GET | `/api/world` | world.json ma'lumotlari |
| GET | `/api/health` | Server holati |
| GET | `/api/scan/logs` | Scan loglari |

## 🗄️ PostgreSQL Schema

```sql
-- Foydalanuvchilar jadvali
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(255) UNIQUE,
  face_descriptor JSONB NOT NULL,   -- 128-dim float array
  face_image_path VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW(),
  last_scan_at TIMESTAMP,
  scan_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE
);

-- Scan loglari
CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50),               -- 'found' | 'not_found'
  match_confidence FLOAT,
  ip_address VARCHAR(50),
  device_info TEXT
);
```

## 🧠 Yuz tanish algoritmi

1. **face-api.js** → `tinyFaceDetector` bilan yuzni topadi
2. **faceLandmark68Net** → 68 ta yuz nuqtasini belgilaydi
3. **faceRecognitionNet** → 128 o'lchamli float array (descriptor) yaratadi
4. **Euclidean distance** → Yangi descriptor bilan DB dagi barcha descriptorlarni solishtiradi
5. **Threshold = 0.5** → Agar masofa ≤ 0.5 bo'lsa — TOPILDI

## 📄 world.json format

```json
{
  "scans": [
    {
      "id": 1,
      "user_id": "uuid",
      "first_name": "Sardor",
      "last_name": "Rahimov",
      "full_name": "Sardor Rahimov",
      "phone": "+998901234567",
      "email": "sardor@email.com",
      "scanned_at": "2024-01-15T10:30:00.000Z",
      "scan_count": 3
    }
  ],
  "last_updated": "2024-01-15T10:30:00.000Z",
  "total_scans": 1
}
```

## 🎨 Dizayn xususiyatlari

- **Dark mode** — `#030712` asosiy fon
- **Glassmorphism** — `backdrop-filter: blur(20px)` + shaffof cardlar
- **Neon blue** — `#0ea5e9` asosiy rang
- **Animatsiyalar** — hover effects, scan pulse, toast notifications, floating orbs
- **Fontlar** — Inter + Space Grotesk (Google Fonts)
- **Responsiv** — Mobile first, 3 breakpoint

## 🔧 Texnologiyalar

- **Frontend**: HTML5, Vanilla CSS, Vanilla JS, face-api.js
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg driver)
- **Face AI**: face-api.js (TensorFlow.js asosida)
- **File I/O**: fs-extra (world.json)
