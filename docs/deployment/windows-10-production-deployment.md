# Panduan Production Deploy Sistem Attendance di Windows 10

## 🎯 Overview

Panduan ini akan mengubah PC Windows 10 Anda menjadi server production yang dapat diakses dari seluruh jaringan lokal. Aplikasi akan berjalan sebagai service otomatis saat boot dan dapat diakses melalui browser dari perangkat apa pun di jaringan yang sama.

## 📋 Prasyarat Sistem

### Spesifikasi Minimum
- **OS**: Windows 10 Pro/Enterprise (versi 1903 atau lebih baru)
- **RAM**: 8GB (minimum 4GB)
- **Storage**: 50GB ruang kosong (SSD direkomendasikan)
- **Processor**: Quad-core 2.5 GHz (minimum Dual-core 2.0 GHz)
- **Network**: Gigabit Ethernet dengan koneksi stabil

### Software yang Dibutuhkan
1. **Node.js** 18.x LTS: https://nodejs.org/
2. **Git**: https://git-scm.com/download/win
3. **PM2**: Process Manager untuk Node.js
4. **Nginx**: Reverse Proxy (opsional tapi direkomendasikan)
5. **Akun Supabase**: https://supabase.com/

---

## 🔧 Langkah 1: Persiapan Sistem

### 1.1 Install Node.js
1. Download Node.js 18.x LTS dari website resmi
2. Install dengan opsi default
3. Verifikasi instalasi:
   ```cmd
   node --version
   npm --version
   ```

### 1.2 Install Git
1. Download Git for Windows
2. Install dengan opsi default
3. Verifikasi instalasi:
   ```cmd
   git --version
   ```

### 1.3 Install PM2 Global
```cmd
npm install -g pm2
```

### 1.4 Konfigurasi IP Statis (Direkomendasikan)
1. Buka Control Panel → Network and Sharing Center
2. Klik "Change adapter settings"
3. Klik kanan pada adapter → Properties
4. Pilih "Internet Protocol Version 4 (TCP/IPv4)" → Properties
5. Pilih "Use the following IP address":
   - IP address: `192.168.1.100` (atau sesuai jaringan)
   - Subnet mask: `255.255.255.0`
   - Default gateway: `192.168.1.1`
   - DNS server: `192.168.1.1` dan `8.8.8.8`

---

## 📥 Langkah 2: Setup Project

### 2.1 Clone Repository
```cmd
cd C:\
mkdir attendance-server
cd attendance-server
git clone <URL-REPOSITORY-ANDA> .
```

### 2.2 Install Dependencies
```cmd
npm install --production
```

### 2.3 Download Face Recognition Models
```cmd
powershell -ExecutionPolicy Bypass -File scripts/download-face-models.ps1
```

---

## ⚙️ Langkah 3: Konfigurasi Production

### 3.1 Buat File Environment Production
Buat file `.env.production` di root project:

```env
# Production Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Security
JWT_SECRET=your-secure-random-secret-minimum-32-characters-please-change-this-in-production

# App Configuration
NEXT_PUBLIC_APP_NAME="Attendance System"
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000

# Performance
NODE_OPTIONS="--max-old-space-size=2048"
ENABLE_COMPRESSION=true
ENABLE_CACHING=true

# Logging
LOG_LEVEL=warn
LOG_FILE=C:\attendance-server\logs\app.log
```

**Penting:**
- Ganti `192.168.1.100` dengan IP statis yang Anda konfigurasi
- Ganti semua kunci Supabase dengan kunci actual
- Buat JWT secret yang unik dan aman

### 3.2 Update package.json untuk Production
Tambahkan script berikut di [`package.json`](package.json:1):

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "start:production": "NODE_ENV=production next start -H 0.0.0.0",
    "pm2:start": "pm2 start ecosystem.config.js --env production",
    "pm2:stop": "pm2 stop attendance-system",
    "pm2:restart": "pm2 restart attendance-system",
    "pm2:logs": "pm2 logs attendance-system"
  }
}
```

### 3.3 Buat Konfigurasi PM2
Buat file `ecosystem.config.js` di root project:

```javascript
const path = require('path');

module.exports = {
  apps: [{
    name: 'attendance-system',
    script: 'npm',
    args: 'start',
    cwd: path.resolve(__dirname),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000
    },
    error_file: 'C:/attendance-server/logs/err.log',
    out_file: 'C:/attendance-server/logs/out.log',
    log_file: 'C:/attendance-server/logs/combined.log',
    time: true
  }]
};
```

---

## 🚀 Langkah 4: Build dan Deploy

### 4.1 Build Aplikasi
```cmd
npm run build
```

### 4.2 Buat Direktori Logs
```cmd
mkdir C:\attendance-server\logs
```

### 4.3 Jalankan dengan PM2
```cmd
npm run pm2:start
```

### 4.4 Verifikasi Status
```cmd
pm2 status
pm2 logs attendance-system
```

### 4.5 Setup PM2 Startup
```cmd
pm2 startup
pm2 save
```

---

## 🌐 Langkah 5: Konfigurasi Jaringan

### 5.1 Konfigurasi Firewall
1. Buka Windows Defender Firewall dengan Advanced Security
2. Klik "Inbound Rules" → "New Rule..."
3. Pilih "Port" → Next
4. Pilih "TCP" → "Specific local ports" → masukkan "3000"
5. Pilih "Allow the connection" → Next
6. Pilih semua profil (Domain, Private, Public) → Next
7. Beri nama "Attendance System" → Finish

### 5.2 Verifikasi Akses Jaringan
1. Temukan IP address PC Anda:
   ```cmd
   ipconfig
   ```
2. Dari perangkat lain di jaringan, buka browser dan akses:
   ```
   http://192.168.1.100:3000
   ```

---

## 🔄 Opsi 1: Menggunakan Nginx Reverse Proxy (Direkomendasikan)

### 1.1 Install Nginx
1. Download Nginx dari: http://nginx.org/en/download.html
2. Extract ke `C:\nginx\`
3. Buka Command Prompt sebagai Administrator

### 1.2 Konfigurasi Nginx
Buat file `C:\nginx\conf\attendance.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name 192.168.1.100;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
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

        # Main application
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

### 1.3 Jalankan Nginx
```cmd
cd C:\nginx\
nginx -c conf/attendance.conf
```

### 1.4 Setup Nginx sebagai Windows Service
1. Download NSSM (Non-Sucking Service Manager): https://nssm.cc/download
2. Extract dan jalankan:
   ```cmd
   nssm install Nginx
   ```
3. Konfigurasi:
   - Path: `C:\nginx\nginx.exe`
   - Arguments: `-c conf/attendance.conf`
   - Startup directory: `C:\nginx\`
4. Klik "Install service"

---

## 🔄 Opsi 2: Windows Service dengan node-windows

### 2.1 Install node-windows
```cmd
npm install -g node-windows
```

### 2.2 Buat Service Installer
Buat file `install-service.js`:

```javascript
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Attendance System',
  description: 'Attendance System with Face Recognition',
  script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
  nodeOptions: ['--max-old-space-size=2048'],
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

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed');
});

svc.install();
```

### 2.3 Install Service
```cmd
node install-service.js
```

---

## 📱 Akses dari Perangkat Mobile

### Android
1. Buka Chrome
2. Akses `http://192.168.1.100`
3. Tap menu (3 titik) → "Add to Home screen"
4. Beri nama "Attendance System"
5. Tap "Add"

### iOS
1. Buka Safari
2. Akses `http://192.168.1.100`
3. Tap share icon → "Add to Home Screen"
4. Beri nama "Attendance System"
5. Tap "Add"

---

## 🔐 Keamanan Production

### 1. Password Default
**PENTING:** Login pertama kali dengan:
```
Email: admin@test.com
Password: admin123
```
Langsung ganti password default setelah login!

### 2. SSL/TLS (Opsional)
Untuk HTTPS, gunakan:
1. Self-signed certificate (untuk internal)
2. Let's Encrypt (jika memiliki domain)
3. Cloudflare tunnel (gratis)

### 3. Backup Otomatis
Buat script backup `backup.bat`:
```batch
@echo off
set BACKUP_DIR=C:\attendance-server\backups
set DATE=%date:~-4%-%date:~4,2%-%date:~7,2%
set TIME=%time:~0,2%-%time:~3,2%-%time:~6,2%
mkdir %BACKUP_DIR%\%DATE%-%TIME%
xcopy C:\attendance-server %BACKUP_DIR%\%DATE%-%TIME% /E /I /H /Y
echo Backup completed: %BACKUP_DIR%\%DATE%-%TIME%
```

Schedule dengan Task Manager untuk backup harian.

---

## 🛠️ Monitoring dan Maintenance

### 1. Monitoring dengan PM2
```cmd
# Lihat status
pm2 status

# Lihat logs real-time
pm2 logs attendance-system

# Monitoring dashboard
pm2 monit

# Restart service
pm2 restart attendance-system
```

### 2. Performance Monitoring
Buat file `monitor.js`:
```javascript
const os = require('os');
const fs = require('fs');

setInterval(() => {
  const usage = {
    timestamp: new Date(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    system: {
      free: os.freemem(),
      total: os.totalmem(),
      load: os.loadavg()
    }
  };
  
  fs.appendFileSync('C:/attendance-server/logs/performance.log', JSON.stringify(usage) + '\n');
}, 60000); // Setiap menit
```

Jalankan dengan PM2:
```cmd
pm2 start monitor.js --name attendance-monitor
```

---

## 🚨 Troubleshooting Production

### Masalah 1: Service Tidak Start
```cmd
# Cek PM2 status
pm2 status

# Cek error logs
pm2 logs attendance-system --err

# Restart service
pm2 restart attendance-system
```

### Masalah 2: Tidak Bisa Diakses dari Jaringan
1. Verifikasi IP address: `ipconfig`
2. Cek firewall: Windows Defender Firewall
3. Test lokal: `http://localhost:3000`
4. Test dari PC lain: `http://192.168.1.100:3000`

### Masalah 3: Performance Lambat
1. Cek resource usage: Task Manager
2. Cek logs: `pm2 logs attendance-system`
3. Restart service: `pm2 restart attendance-system`
4. Optimize Next.js build: `npm run build`

### Masalah 4: Database Connection
1. Verifikasi environment variables
2. Test koneksi ke Supabase
3. Cek quota di dashboard Supabase
4. Verify API keys masih valid

---

## 📊 Update Aplikasi

### 1. Update Code
```cmd
# Pull changes terbaru
git pull origin main

# Update dependencies
npm install --production

# Build ulang
npm run build

# Restart service
pm2 restart attendance-system
```

### 2. Update Otomatis dengan Webhook
Buat file `update-server.js`:
```javascript
const { exec } = require('child_process');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/update', (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== 'your-webhook-secret') {
    return res.status(401).send('Unauthorized');
  }

  exec('git pull origin main && npm install --production && npm run build && pm2 restart attendance-system', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return res.status(500).send('Update failed');
    }
    console.log(`Output: ${stdout}`);
    res.send('Update successful');
  });
});

app.listen(3001, () => {
  console.log('Update server listening on port 3001');
});
```

---

## 🎯 Verifikasi Production

### Checklist Final:
- [ ] Aplikasi berjalan sebagai service
- [ ] Dapat diakses dari jaringan lokal
- [ ] Firewall dikonfigurasi dengan benar
- [ ] PM2 monitoring aktif
- [ ] Backup terjadwal
- [ ] Password default diganti
- [ ] Logs berfungsi
- [ ] Performance monitoring aktif

### Test dari Perangkat Berbeda:
1. **Desktop/Laptop**: Buka browser → `http://192.168.1.100`
2. **Android**: Chrome → `http://192.168.1.100`
3. **iOS**: Safari → `http://192.168.1.100`
4. **Tablet**: Browser apa pun → `http://192.168.1.100`

---

## 📞 Support

Jika mengalami masalah:
1. Cek logs: `C:\attendance-server\logs\`
2. Verifikasi konfigurasi PM2: `pm2 status`
3. Test koneksi jaringan: `ping 192.168.1.100`
4. Restart service: `pm2 restart attendance-system`

---

**Selamat! PC Windows Anda sekarang berfungsi sebagai server production yang dapat diakses dari seluruh jaringan lokal.**