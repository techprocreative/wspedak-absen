# Panduan Deploy Sistem Attendance di Windows 10

## 📋 Prasyarat

### Software yang Dibutuhkan:
1. **Node.js** (versi 18.x atau lebih baru)
   - Download dari: https://nodejs.org/
   - Pilih LTS version untuk stabilitas

2. **Git**
   - Download dari: https://git-scm.com/download/win
   - Install dengan opsi default

3. **Visual Studio Code** (direkomendasikan)
   - Download dari: https://code.visualstudio.com/

4. **Akun Supabase**
   - Daftar gratis di: https://supabase.com/
   - Diperlukan untuk database dan backend services

### Spesifikasi Minimum Sistem:
- **OS**: Windows 10 (versi 1903 atau lebih baru)
- **RAM**: 4GB (direkomendasikan 8GB)
- **Storage**: 20GB ruang kosong
- **Processor**: Dual-core 2.0 GHz (direkomendasikan Quad-core)

---

## 🔧 Langkah 1: Persiapan Environment

### 1.1 Install Node.js
1. Download installer Node.js LTS dari website resmi
2. Jalankan installer dengan opsi default
3. Verifikasi instalasi dengan membuka Command Prompt (CMD) atau PowerShell:
   ```cmd
   node --version
   npm --version
   ```
   Pastikan versi Node.js adalah 18.x atau lebih baru

### 1.2 Install Git
1. Download Git for Windows dari website resmi
2. Jalankan installer dengan opsi default
3. Verifikasi instalasi:
   ```cmd
   git --version
   ```

### 1.3 Install Supabase CLI
1. Buka Command Prompt sebagai Administrator
2. Jalankan perintah:
   ```cmd
   npm install -g supabase
   ```
3. Verifikasi instalasi:
   ```cmd
   supabase --version
   ```

---

## 📥 Langkah 2: Clone Project

### 2.1 Clone Repository
1. Buka Command Prompt atau PowerShell
2. Navigasi ke direktori tempat Anda ingin menyimpan project:
   ```cmd
   cd C:\projects\
   ```
3. Clone repository:
   ```cmd
   git clone <URL-REPOSITORY-ANDA>
   cd v0-attendance
   ```

---

## ⚙️ Langkah 3: Setup Environment Variables

### 3.1 Buat File Environment
1. Di root directory project, buat file baru bernama `.env.local`
2. Salin konten dari file `.env.example` (jika ada) ke `.env.local`

### 3.2 Konfigurasi Supabase
1. Login ke dashboard Supabase: https://app.supabase.com/
2. Buat project baru atau gunakan project yang sudah ada
3. Dapatkan kredensial dari Settings → API:
   - Project URL
   - anon public key
   - service_role key

### 3.3 Isi Environment Variables
Edit file `.env.local` dan tambahkan konfigurasi berikut:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication
JWT_SECRET=your-secure-random-secret-minimum-32-characters

# App Configuration
NEXT_PUBLIC_APP_NAME="Attendance System"
NEXT_PUBLIC_APP_URL=http://[IP-ADDRESS-PC]:3000

# Development
NODE_ENV=development
```

**Penting:**
- Ganti `your-project-id` dengan ID project Supabase Anda
- Ganti kunci-kunci di atas dengan kunci actual dari dashboard Supabase
- Buat JWT secret yang aman (minimal 32 karakter)

---

## 🗄️ Langkah 4: Setup Database

### 4.1 Install Supabase CLI (jika belum)
```cmd
npm install -g supabase
```

### 4.2 Login ke Supabase
```cmd
supabase login
```

### 4.3 Link Project
```cmd
supabase link --project-ref your-project-id
```

### 4.4 Push Database Schema
```cmd
supabase db push
```

### 4.5 Seed Database (Opsional)
Jika ada file seed:
```cmd
node scripts/seed-database.js
```

---

## 📦 Langkah 5: Install Dependencies

### 5.1 Install Node.js Dependencies
1. Buka Command Prompt di directory project
2. Jalankan perintah:
   ```cmd
   npm install
   ```

### 5.2 Download Face Recognition Models
1. Jalankan script download models:
   ```cmd
   chmod +x scripts/download-face-models.sh
   ./scripts/download-face-models.sh
   ```
   *Catatan: Jika perintah di atas tidak berjalan di Windows, gunakan:*
   ```cmd
   powershell -ExecutionPolicy Bypass -File scripts/download-face-models.ps1
   ```
   *Atau download manual dari link yang tersedia di dokumentasi project*

---

## 🚀 Langkah 6: Jalankan Aplikasi

### 6.1 Mode Development
1. Jalankan development server:
   ```cmd
   npm run dev
   ```
2. Buka browser dan navigasi ke: http://localhost:3000

### 6.2 Mode Production
1. Build aplikasi:
   ```cmd
   npm run build
   ```
2. Jalankan production server:
   ```cmd
   npm start
   ```
3. Buka browser dan navigasi ke: http://localhost:3000

---

## 🔐 Login Default

Gunakan kredensial berikut untuk login pertama kali:

```
Email: admin@test.com
Password: admin123
```

**Penting:** Ganti password default ini setelah login pertama untuk keamanan.

---

## 🛠️ Troubleshooting Umum

### Masalah 1: Port 3000 Sudah Digunakan
**Solusi:**
1. Cari proses yang menggunakan port 3000:
   ```cmd
   netstat -ano | findstr :3000
   ```
2. Hentikan proses tersebut dengan Task Manager atau:
   ```cmd
   taskkill /PID <PID-PROSES> /F
   ```
3. Atau jalankan aplikasi di port lain:
   ```cmd
   npm run dev -- -p 3001
   ```

### Masalah 2: Error "Cannot find module"
**Solusi:**
1. Hapus node_modules dan package-lock.json:
   ```cmd
   rmdir /s node_modules
   del package-lock.json
   ```
2. Install ulang dependencies:
   ```cmd
   npm install
   ```

### Masalah 3: Koneksi Database Gagal
**Solusi:**
1. Periksa environment variables di `.env.local`
2. Pastikan URL Supabase benar
3. Verifikasi kunci API masih valid
4. Cek koneksi internet

### Masalah 4: Face Recognition Tidak Berfungsi
**Solusi:**
1. Pastikan face recognition models sudah diunduh
2. Periksa folder `public/models/` harus berisi file model
3. Pastikan browser memiliki izin kamera
4. Gunakan browser yang mendukung WebRTC (Chrome, Firefox, Edge)

### Masalah 5: Build Error
**Solusi:**
1. Pastikan semua dependencies terinstall:
   ```cmd
   npm install
   ```
2. Periksa error log untuk detail masalah
3. Coba hapus cache Next.js:
   ```cmd
   rmdir /s .next
   npm run build
   ```

---

## 📝 Tips Tambahan

### 1. Menggunakan PowerShell
Disarankan menggunakan PowerShell instead of Command Prompt untuk pengalaman terminal yang lebih baik di Windows.

### 2. Environment Variables
Simpan `.env.local` dengan aman dan jangan pernah commit ke version control.

### 3. Performance
Untuk performa lebih baik, pastikan:
- Windows Update terbaru
- Antivirus tidak memblokir Node.js
- Cukup RAM tersedia
- SSD untuk storage (direkomendasikan)

### 4. Backup
Reguler backup database melalui dashboard Supabase.

---

## 🌐 Mengakses Aplikasi dari Jaringan Lokal

### Opsi 1: Akses LAN (Local Area Network)

#### 1.1 Konfigurasi Next.js untuk Accept Remote Connections
1. Edit file [`package.json`](package.json:1) dan tambahkan script baru:
   ```json
   "scripts": {
     "dev:network": "next dev -H 0.0.0.0",
     "start:network": "next start -H 0.0.0.0"
   }
   ```

#### 1.2 Jalankan Server dengan Network Access
1. Untuk mode development:
   ```cmd
   npm run dev:network
   ```
2. Untuk mode production:
   ```cmd
   npm run build
   npm run start:network
   ```

#### 1.3 Temukan IP Address PC Anda
1. Buka Command Prompt
2. Jalankan perintah:
   ```cmd
   ipconfig
   ```
3. Cari "IPv4 Address" (biasanya dimulai dengan 192.168.x.x atau 10.0.x.x)

#### 1.4 Akses dari Perangkat Lain
Dari perangkat lain di jaringan yang sama, buka browser dan akses:
```
http://[IP-ADDRESS-PC]:3000
```
Contoh: `http://192.168.1.100:3000`

### Opsi 2: Menggunakan PM2 untuk Production Server

#### 2.1 Install PM2
```cmd
npm install -g pm2
```

#### 2.2 Buat File Konfigurasi PM2
Buat file `ecosystem.config.js` di root project:
```javascript
module.exports = {
  apps: [{
    name: 'attendance-system',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000
    }
  }]
};
```

#### 2.3 Jalankan dengan PM2
```cmd
npm run build
pm2 start ecosystem.config.js
```

#### 2.4 Manajemen PM2
```cmd
# Lihat status
pm2 status

# Lihat logs
pm2 logs

# Restart aplikasi
pm2 restart attendance-system

# Stop aplikasi
pm2 stop attendance-system
```

### Opsi 3: Setup Windows Service (Auto-start on Boot)

#### 3.1 Install Node Windows
```cmd
npm install -g node-windows
```

#### 3.2 Buat Service Script
Buat file `install-service.js`:
```javascript
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Attendance System',
  description: 'Attendance System with Face Recognition',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: ['--max-old-space-size=1024'],
  env: [{
    name: 'NODE_ENV',
    value: 'production'
  }, {
    name: 'HOST',
    value: '0.0.0.0'
  }, {
    name: 'PORT',
    value: '3000'
  }]
});

svc.on('install', () => {
  svc.start();
  console.log('Service installed and started');
});

svc.install();
```

#### 3.3 Install Service
```cmd
node install-service.js
```

### Opsi 4: Menggunakan Nginx sebagai Reverse Proxy

#### 4.1 Install Nginx untuk Windows
1. Download dari: http://nginx.org/en/download.html
2. Extract ke `C:\nginx\`
3. Buka Command Prompt sebagai Administrator
4. Navigasi ke folder nginx:
   ```cmd
   cd C:\nginx\
   ```

#### 4.2 Konfigurasi Nginx
Edit file `C:\nginx\conf\nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

#### 4.3 Jalankan Nginx
```cmd
start nginx
```

#### 4.4 Kontrol Nginx
```cmd
# Stop nginx
nginx -s stop

# Reload configuration
nginx -s reload

# Quit nginx
nginx -s quit
```

---

## 🔐 Konfigurasi Firewall Windows

### Mengizinkan Akses ke Port 3000
1. Buka Windows Defender Firewall dengan Advanced Security
2. Klik "Inbound Rules" di panel kiri
3. Klik "New Rule..." di panel kanan
4. Pilih "Port" → Next
5. Pilih "TCP" dan "Specific local ports"
6. Masukkan "3000" → Next
7. Pilih "Allow the connection" → Next
8. Pilih semua profil (Domain, Private, Public) → Next
9. Beri nama "Attendance System" → Finish

---

## 📱 Akses dari Smartphone/Tablet

### 1. Pastikan di Jaringan yang Sama
- Smartphone/tablet harus terhubung ke WiFi yang sama dengan PC server

### 2. Akses melalui Browser
Buka browser di smartphone/tablet dan masukkan:
```
http://[IP-ADDRESS-PC]:3000
```

### 3. Buat Shortcut di Homescreen (Android)
1. Buka Chrome dan akses URL aplikasi
2. Tap menu (3 titik) → "Add to Home screen"
3. Beri nama "Attendance System"
4. Tap "Add"

### 4. Buat Shortcut di Homescreen (iOS)
1. Buka Safari dan akses URL aplikasi
2. Tap share icon → "Add to Home Screen"
3. Beri nama "Attendance System"
4. Tap "Add"

---

## 🔄 Update Aplikasi

Untuk mengupdate aplikasi ke versi terbaru:

1. Pull changes terbaru:
   ```cmd
   git pull origin main
   ```
2. Update dependencies:
   ```cmd
   npm install
   ```
3. Build ulang aplikasi:
   ```cmd
   npm run build
   ```
4. Restart server:
   ```cmd
   npm start
   ```

---

## 📞 Bantuan

Jika mengalami masalah yang tidak tercantum di atas:

1. Cek dokumentasi lengkap di folder `docs/`
2. Lihat error log di console browser
3. Periksa log server di Command Prompt/PowerShell
4. Buka issue di repository GitHub project

---

## 📊 Struktur Project Penting

```
v0-attendance/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── admin/             # Admin Dashboard
│   └── face-checkin/      # Face Check-in Interface
├── components/            # React Components
├── lib/                   # Utility Libraries
├── public/                # Static Assets
│   └── models/            # Face Recognition Models
├── scripts/               # Automation Scripts
├── supabase/              # Database Schema
└── docs/                  # Documentation
```

---

## 🔒 Keamanan

1. **Jangan pernah** commit `.env.local` ke version control
2. **Ganti password default** setelah login pertama
3. **Gunakan HTTPS** di production environment
4. **Backup reguler** data penting
5. **Update dependencies** secara berkala

---

## 🐧 Alternatif: Menggunakan WSL (Windows Subsystem for Linux)

Jika Anda lebih familiar dengan lingkungan Linux:

1. Install WSL2 dari Microsoft Store
2. Install Ubuntu distro
3. Ikuti panduan Linux deployment di dokumentasi

---

## 📚 Referensi Tambahan

- [Dokumentasi Utama](../README.md)
- [Panduan API](../api/api-documentation.md)
- [Panduan Pengguna](../user/user-guide.md)
- [Panduan Administrator](../admin/administrator-guide.md)

---

Selamat mengdeploy! Jika ada pertanyaan atau masalah, jangan ragu untuk bertanya melalui issue tracker atau dokumentasi yang tersedia.