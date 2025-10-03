# 🚀 Setup Guide - Attendance System

## ✅ Build Status: SUKSES!

Project sudah berhasil di-build dan siap untuk dijalankan. Ikuti langkah-langkah berikut untuk setup lengkap.

---

## 📋 LANGKAH 1: Verifikasi Environment Variables

### Cek file .env.local sudah diisi dengan benar:

```bash
cat .env.local
```

### Pastikan sudah ada values untuk:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - URL project Supabase Anda
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key dari Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key dari Supabase
- ✅ `JWT_SECRET` - Random string 32+ karakter
- ✅ `ENCRYPTION_KEY` - Random string tepat 32 karakter
- ✅ `ADMIN_EMAIL` - Email untuk admin pertama
- ✅ `ADMIN_PASSWORD` - Password untuk admin pertama
- ✅ `ADMIN_SEED_TOKEN` - Token untuk endpoint seeding

### Generate Secret Keys (jika belum ada):

```bash
# Generate JWT_SECRET (32+ karakter)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (tepat 32 karakter)
openssl rand -hex 16

# Generate ADMIN_SEED_TOKEN
openssl rand -base64 24
```

---

## 📋 LANGKAH 2: Setup Database di Supabase

### Option A: Via Supabase Dashboard (Recommended)

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com
   - Pilih project Anda
   
2. **Buka SQL Editor**
   - Klik "SQL Editor" di sidebar
   - Klik "New Query"

3. **Jalankan Schema**
   ```bash
   # Copy seluruh isi file schema
   cat supabase/schema.sql
   ```
   - Paste ke SQL Editor
   - Klik "Run" atau tekan Ctrl+Enter

4. **Verifikasi Tables**
   - Buka "Table Editor"
   - Pastikan tables berikut sudah terbuat:
     - ✅ users
     - ✅ attendance_policies
     - ✅ daily_attendance_records
     - ✅ attendance
     - ✅ face_embeddings
     - ✅ audit_logs
     - ✅ schedules
     - ✅ schedule_shifts
     - ✅ schedule_assignments

### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_ID

# Push schema
supabase db push --file supabase/schema.sql
```

### Verifikasi Database Setup

```sql
-- Jalankan di SQL Editor untuk cek tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected output:**
- attendance
- attendance_policies
- audit_logs
- daily_attendance_records
- face_embeddings
- schedule_assignments
- schedule_shifts
- schedules
- users

---

## 📋 LANGKAH 3: Create Admin User

### Option A: Via Supabase Auth Dashboard (Recommended)

1. **Create Auth User**
   - Buka Supabase → Authentication → Users
   - Klik "Add user" → "Create new user"
   - Email: `admin@yourcompany.com` (atau sesuai .env.local)
   - Password: Set password yang kuat
   - Auto-confirm: Centang agar tidak perlu email confirmation
   - Klik "Create user"
   - **COPY USER ID** yang muncul (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

2. **Insert ke Users Table**
   - Buka SQL Editor
   - Jalankan query berikut (ganti `YOUR_USER_ID` dengan ID yang di-copy):

   ```sql
   INSERT INTO public.users (id, email, name, role, department, position)
   VALUES (
     'YOUR_USER_ID',  -- Ganti dengan User ID dari step 1
     'admin@yourcompany.com',
     'System Administrator',
     'admin',
     'IT',
     'Administrator'
   );
   ```

3. **Verifikasi**
   ```sql
   SELECT * FROM public.users WHERE role = 'admin';
   ```

### Option B: Via API Endpoint

1. **Pastikan server sudah jalan**
   ```bash
   npm run dev
   ```

2. **Call Seed Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed \
     -H "Authorization: Bearer YOUR_ADMIN_SEED_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@yourcompany.com",
       "password": "YourStrongPassword123!",
       "name": "System Administrator"
     }'
   ```

3. **Expected Response**
   ```json
   {
     "success": true,
     "message": "Admin user created successfully",
     "user": {
       "id": "...",
       "email": "admin@yourcompany.com",
       "role": "admin"
     }
   }
   ```

---

## 📋 LANGKAH 4: Jalankan Development Server

```bash
# Start development server
npm run dev
```

**Output yang diharapkan:**
```
✓ Ready in 1.7s
Local: http://localhost:3000
```

### Buka Browser

Navigasi ke: **http://localhost:3000**

---

## 📋 LANGKAH 5: Test Login

1. **Akses Login Page**
   - Buka: http://localhost:3000/admin/login
   - Atau klik tombol login di homepage

2. **Login dengan Admin Credentials**
   - Email: `admin@yourcompany.com` (sesuai yang dibuat)
   - Password: Password yang Anda set

3. **Verify Dashboard**
   - Setelah login, Anda harus redirect ke `/admin`
   - Dashboard admin harus muncul dengan navigation menu

---

## 📋 LANGKAH 6: Test Fitur-Fitur Utama

### A. Employee Management
1. Buka **Admin → Employees**
2. Klik "Add Employee"
3. Isi form dan create employee baru
4. Verifikasi employee muncul di list

### B. Attendance Tracking
1. Buka **Homepage** (logout dulu atau buka incognito)
2. Test face recognition atau manual attendance
3. Check attendance records di **Admin → Attendance**

### C. Reports
1. Buka **Admin → Reports**
2. Generate report (misal: Attendance Summary)
3. Verifikasi data muncul

### D. Settings
1. Buka **Admin → Settings**
2. Update company information
3. Save dan verify changes

---

## 🐳 BONUS: Docker Deployment (Optional)

### Build Docker Image

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

### Access Application
- URL: http://localhost:3000
- Health Check: http://localhost:3000/api/health

---

## 🔧 Troubleshooting

### Problem: "Unable to connect to Supabase"

**Solution:**
1. Check .env.local credentials
2. Verify Supabase project is active
3. Check network/firewall

```bash
# Test Supabase connection
curl https://YOUR_PROJECT_ID.supabase.co/rest/v1/
```

### Problem: "Login failed"

**Solution:**
1. Verify user exists in auth.users
2. Verify user exists in public.users
3. Check password is correct
4. Check JWT_SECRET is set

```sql
-- Check user
SELECT * FROM auth.users WHERE email = 'admin@yourcompany.com';
SELECT * FROM public.users WHERE email = 'admin@yourcompany.com';
```

### Problem: "Build failed"

**Solution:**
```bash
# Clean build cache
rm -rf .next node_modules/.cache

# Reinstall dependencies
npm install

# Try build again
npm run build
```

### Problem: "Database tables not found"

**Solution:**
1. Make sure schema.sql was executed successfully
2. Check Supabase logs for errors
3. Re-run schema.sql

---

## 📊 Verification Checklist

Sebelum production deployment, pastikan:

- [ ] ✅ Build sukses (`npm run build`)
- [ ] ✅ Development server jalan (`npm run dev`)
- [ ] ✅ Database schema ter-deploy
- [ ] ✅ Admin user berhasil dibuat
- [ ] ✅ Bisa login sebagai admin
- [ ] ✅ Dashboard admin muncul
- [ ] ✅ Bisa create employee
- [ ] ✅ Bisa mark attendance
- [ ] ✅ Bisa generate reports
- [ ] ✅ Environment variables sudah lengkap
- [ ] ✅ JWT_SECRET & ENCRYPTION_KEY sudah di-set

---

## 🎯 Next Steps

Setelah semua setup sukses:

1. **Configure System Settings**
   - Company information
   - Work hours
   - Attendance policies

2. **Import Employees**
   - Bulk import via CSV/Excel
   - Or create manually

3. **Setup Face Recognition**
   - Enroll faces untuk employees
   - Test recognition

4. **Configure Permissions**
   - Create HR users
   - Create Manager users
   - Test role-based access

5. **Production Deployment**
   - Deploy via Docker
   - Or deploy to Vercel
   - Setup monitoring

---

## 📞 Support

Jika ada masalah, check:
- Documentation di `/docs`
- API endpoints di `/api/*`
- Health check: `/api/health`
- System metrics: `/api/metrics`

---

**Setup Guide v1.0**  
Last updated: 2024
