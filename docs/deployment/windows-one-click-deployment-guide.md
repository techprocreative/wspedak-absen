# Panduan One-Click Deployment Sistem Attendance di Windows 10

## 🎯 Overview

Solusi one-click deployment yang mengubah PC Windows 10 Anda menjadi server attendance system hanya dengan satu klik, tanpa perlu instalasi manual yang rumit. Mirip dengan Docker di Linux, tapi lebih sederhana dan khusus untuk aplikasi ini.

## 🚀 Cara Penggunaan (3 Langkah Saja)

### Langkah 1: Download Installer atau Gunakan File Lokal

**Opsi A: Download dari Repository**
Download file installer dari:
- Repository: `scripts/deploy/one-click-deploy.bat` (rekomendasi)
- Atau download langsung dari release page

**Opsi B: Gunakan File Lokal**
Jika Anda sudah memiliki file project di folder:
- Gunakan file `local-deploy.bat` (khusus untuk deployment dari folder lokal)
- Atau jalankan `windows-one-click-deploy.bat` langsung dari folder project

### Langkah 2: Konfigurasi Sebelum Instalasi
1. Jalankan installer yang telah Anda download
2. Installer akan otomatis memeriksa apakah konfigurasi sudah ada
3. Jika belum ada, **Configuration Wizard akan otomatis terbuka**
4. Isi semua credential yang dibutuhkan:
   - Supabase URL dan API Keys
   - JWT Secret (minimal 32 karakter)
   - Nama aplikasi
   - Port aplikasi
   - Konfigurasi email (opsional)
5. Verifikasi konfigurasi dan simpan

### Langkah 3: Pilih Tipe Deployment
1. Setelah konfigurasi selesai, pilih tipe deployment:
   - **Local Deployment** (dari folder saat ini)
   - **Full Deployment** (download versi terbaru)
2. Tunggu proses instalasi otomatis (sekitar 5-10 menit)

### Langkah 4: Akses Aplikasi
Setelah instalasi selesai, aplikasi akan otomatis terbuka di browser dan siap digunakan!

### Langkah 3: Akses Aplikasi
Setelah instalasi selesai, aplikasi akan otomatis terbuka di browser dan dapat diakses dari:
- **PC lokal**: `http://localhost:3000`
- **Perangkat lain**: `http://[IP-ADDRESS]:3000`

Login dengan:
```
Email: admin@test.com
Password: admin123
```

## 📋 Apa yang Diinstall Secara Otomatis?

### Software Dependencies
- ✅ **Node.js 18.19.0 LTS** (jika belum ada)
- ✅ **Git 2.42.0** (jika belum ada)
- ✅ **PM2 Process Manager** (untuk auto-restart dan monitoring)

### Aplikasi
- ✅ **Copy file dari folder lokal** atau **download** source code terbaru
- ✅ **Install dependencies** (npm packages)
- ✅ **Download face recognition models**
- ✅ **Build aplikasi** untuk production
- ✅ **Konfigurasi environment** production

### Server Configuration
- ✅ **Setup PM2** untuk process management
- ✅ **Create Windows Service** (auto-start saat boot)
- ✅ **Configure Firewall** (allow port 3000)
- ✅ **Setup network access** (dari perangkat lain)
- ✅ **Create logs directory**

## 🌐 Akses dari Perangkat Lain

Setelah instalasi, aplikasi dapat diakses dari:

### Desktop/Laptop
Buka browser dan akses: `http://[IP-ADDRESS]:3000`

### Smartphone (Android)
1. Buka Chrome
2. Ketik: `http://[IP-ADDRESS]:3000`
3. Tap menu (3 titik) → "Add to Home screen"
4. Beri nama "Attendance System"
5. Tap "Add"

### Smartphone (iOS)
1. Buka Safari
2. Ketik: `http://[IP-ADDRESS]:3000`
3. Tap share icon → "Add to Home Screen"
4. Beri nama "Attendance System"
5. Tap "Add"

### Tablet
Sama seperti smartphone, gunakan browser default dan akses URL aplikasi.

## ⚙️ Konfigurasi Pasca-Instalasi

### 1. Update Supabase Credentials
Edit file `C:\attendance-system\.env.production`:
```env
# Ganti dengan kunci Supabase Anda
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Ganti dengan secret yang aman
JWT_SECRET=your-secure-random-secret-minimum-32-characters
```

### 2. Restart Aplikasi
Buka Command Prompt sebagai Administrator:
```cmd
pm2 restart attendance-system
```

## 🔧 Management Commands

Buka Command Prompt sebagai Administrator dan jalankan:

```cmd
# Navigasi ke direktori instalasi
cd C:\attendance-system

# Cek status aplikasi
pm2 status

# Lihat logs real-time
pm2 logs attendance-system

# Restart aplikasi
pm2 restart attendance-system

# Stop aplikasi
pm2 stop attendance-system

# Start aplikasi
pm2 start attendance-system
```

## 📱 Mobile Shortcut

### Android
1. Buka Chrome → `http://[IP-ADDRESS]:3000`
2. Tap menu (3 titik) → "Add to Home screen"
3. Beri nama "Attendance System"
4. Tap "Add"

### iOS
1. Buka Safari → `http://[IP-ADDRESS]:3000`
2. Tap share icon → "Add to Home Screen"
3. Beri nama "Attendance System"
4. Tap "Add"

## 🔄 Update Aplikasi

Untuk mengupdate ke versi terbaru:

1. Buka Command Prompt sebagai Administrator
2. Navigasi ke direktori instalasi:
   ```cmd
   cd C:\attendance-system
   ```
3. Pull changes terbaru:
   ```cmd
   git pull origin main
   ```
4. Update dependencies:
   ```cmd
   npm install --production
   ```
5. Build ulang:
   ```cmd
   npm run build
   ```
6. Restart aplikasi:
   ```cmd
   pm2 restart attendance-system
   ```

## 🛠️ Troubleshooting

### Masalah 1: "Please run this script as Administrator"
**Solusi**: Klik kanan pada file installer → "Run as administrator"

### Masalah 2: Installation Failed
**Solusi**:
1. Pastikan koneksi internet stabil
2. Matikan antivirus sementara
3. Coba jalankan ulang installer

### Masalah 3: Aplikasi Tidak Bisa Diakses
**Solusi**:
1. Cek status: `pm2 status`
2. Lihat logs: `pm2 logs attendance-system`
3. Restart: `pm2 restart attendance-system`
4. Pastikan IP address benar

### Masalah 4: Database Connection Error
**Solusi**:
1. Edit file `C:\attendance-system\.env.production`
2. Update kredensial Supabase
3. Restart aplikasi: `pm2 restart attendance-system`

## 🗑️ Uninstall Aplikasi

Untuk menghapus lengkap:

1. Buka Command Prompt sebagai Administrator
2. Stop aplikasi:
   ```cmd
   pm2 delete attendance-system
   pm2 save
   ```
3. Hapus instalasi directory:
   ```cmd
   rmdir /s /q C:\attendance-system
   ```
4. Hapus firewall rule:
   ```cmd
   netsh advfirewall firewall delete rule name="Attendance System"
   ```

## 📁 Lokasi Instalasi

```
C:\attendance-system\
├── app\                    # Next.js App Router
├── components\             # React Components
├── lib\                    # Utility Libraries
├── public\                 # Static Assets
├── scripts\                # Automation Scripts
├── logs\                   # Application Logs
├── .env.production         # Environment Configuration
├── ecosystem.config.js     # PM2 Configuration
└── node_modules\           # Installed Dependencies
```

## 🔒 Keamanan

1. **Ganti password default** setelah login pertama
2. **Update JWT secret** di `.env.production`
3. **Backup reguler** database Supabase
4. **Jangan share** file `.env.production`

## 📊 Keuntungan One-Click Deployment

### ✅ Kemudahan
- Tidak perlu instalasi manual
- Tidak perlu konfigurasi rumit
- Semua otomatis terinstall

### ✅ Kecepatan
- Instalasi selesai dalam 5-10 menit
- Tidak perlu download dependencies satu per satu
- Otomatis konfigurasi server

### ✅ Reliability
- Auto-restart jika crash
- Auto-start saat boot
- Monitoring dengan PM2

### ✅ Accessibility
- Akses dari semua perangkat di jaringan
- Mobile-friendly interface
- Shortcut di homescreen

## 🎯 Use Cases

### 1. Kantor Kecil-Menengah
- Install di satu PC sebagai server
- Akses dari semua komputer kantor
- Tidak perlu IT khusus untuk maintenance

### 2. Sekolah/Universitas
- Install di lab komputer
- Akses dari laptop guru/staff
- Monitoring attendance real-time

### 3. Workshop/Event
- Setup cepat untuk attendance
- Akses dari smartphone peserta
- Tidak perlu infrastruktur kompleks

---

**Dengan one-click deployment ini, siapa pun dapat dengan mudah menginstall dan menjalankan sistem attendance di Windows 10 tanpa perlu keahlian teknis khusus!**