# One-Click Deployment for Windows 10

## 🎯 Overview

Solusi one-click deployment untuk Windows 10 yang menginstall semua dependensi dan menjalankan aplikasi attendance system secara otomatis, mirip dengan Docker di Linux.

## 📋 Fitur

- **Otomatis Install Node.js** (jika belum ada)
- **Otomatis Install Git** (jika belum ada)
- **Download dan Setup Aplikasi**
- **Install PM2 Process Manager**
- **Konfigurasi Environment Production**
- **Build Aplikasi**
- **Setup Windows Service dengan PM2**
- **Konfigurasi Firewall Otomatis**
- **Auto-start saat Boot**
- **Akses Jaringan Lokal**

## 🚀 Cara Penggunaan

### Metode 1: Download dan Jalankan

1. Download file `windows-one-click-deploy.bat`
2. Klik kanan → "Run as administrator"
3. Tunggu proses instalasi selesai
4. Aplikasi akan otomatis terbuka di browser

### Metode 2: Clone Repository dan Jalankan

1. Clone repository:
   ```cmd
   git clone <URL-REPOSITORY>
   cd v0-attendance
   ```
2. Jalankan installer:
   ```cmd
   scripts\deploy\windows-one-click-deploy.bat
   ```

## 📋 Proses Instalasi

Installer akan melakukan langkah-langkah berikut secara otomatis:

1. ✅ **Check Administrator Privileges**
2. ✅ **Create Installation Directory** (`C:\attendance-system`)
3. ✅ **Install Node.js** (v18.19.0 LTS)
4. ✅ **Install Git** (v2.42.0)
5. ✅ **Install PM2** (Process Manager)
6. ✅ **Download Application Files**
7. ✅ **Install Dependencies**
8. ✅ **Download Face Recognition Models**
9. ✅ **Create Environment Configuration**
10. ✅ **Build Application**
11. ✅ **Create PM2 Configuration**
12. ✅ **Start Application with PM2**
13. ✅ **Setup Auto-start on Boot**
14. ✅ **Configure Firewall**
15. ✅ **Get IP Address for Network Access**

## 🌐 Akses Aplikasi

Setelah instalasi selesai, aplikasi dapat diakses melalui:

- **Local**: `http://localhost:3000`
- **Network**: `http://[IP-ADDRESS]:3000`

### Login Default
```
Email: admin@test.com
Password: admin123
```

## ⚙️ Konfigurasi

### Update Supabase Credentials
Edit file `C:\attendance-system\.env.production` dan update:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Security
JWT_SECRET=your-secure-random-secret-minimum-32-characters
```

### Management Commands
```cmd
# Check status
pm2 status

# View logs
pm2 logs attendance-system

# Restart application
pm2 restart attendance-system

# Stop application
pm2 stop attendance-system

# Start application
pm2 start attendance-system
```

## 📁 Struktur Instalasi

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
├── package.json            # Dependencies
└── node_modules\           # Installed Dependencies
```

## 🔧 Troubleshooting

### Masalah 1: "Please run this script as Administrator"
- Klik kanan pada file `windows-one-click-deploy.bat`
- Pilih "Run as administrator"

### Masalah 2: Node.js/Git Installation Failed
- Pastikan koneksi internet stabil
- Coba jalankan ulang installer
- Jika masih gagal, install manual dari website resmi

### Masalah 3: Aplikasi Tidak Bisa Diakses
- Cek status dengan `pm2 status`
- Lihat logs dengan `pm2 logs attendance-system`
- Pastikan firewall mengizinkan port 3000
- Restart dengan `pm2 restart attendance-system`

### Masalah 4: Supabase Connection Error
- Edit file `.env.production`
- Update kredensial Supabase
- Restart aplikasi dengan `pm2 restart attendance-system`

## 🔄 Update Aplikasi

Untuk mengupdate aplikasi ke versi terbaru:

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

## 🗑️ Uninstall

Untuk menghapus aplikasi:

1. Stop aplikasi:
   ```cmd
   pm2 delete attendance-system
   pm2 save
   ```
2. Hapus instalasi directory:
   ```cmd
   rmdir /s /q C:\attendance-system
   ```
3. Hapus firewall rule:
   ```cmd
   netsh advfirewall firewall delete rule name="Attendance System"
   ```

## 📱 Akses dari Mobile

Setelah instalasi, aplikasi dapat diakses dari perangkat mobile:

1. Pastikan mobile dan PC terhubung ke WiFi yang sama
2. Buka browser di mobile
3. Akses `http://[IP-ADDRESS]:3000`
4. Buat shortcut di homescreen untuk akses mudah

## 🔒 Keamanan

1. **Ganti password default** setelah login pertama
2. **Update JWT secret** di `.env.production`
3. **Gunakan HTTPS** jika diakses dari internet publik
4. **Backup reguler** database Supabase

## 📞 Support

Jika mengalami masalah:

1. Cek logs di `C:\attendance-system\logs\`
2. Verifikasi konfigurasi dengan `pm2 status`
3. Restart aplikasi dengan `pm2 restart attendance-system`
4. Lihat dokumentasi lengkap di folder `docs/`

---

**Dengan one-click deployment ini, Anda dapat dengan mudah menginstall dan menjalankan sistem attendance di Windows 10 tanpa perlu konfigurasi manual yang rumit!**