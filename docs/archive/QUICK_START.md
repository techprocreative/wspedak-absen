# ⚡ Quick Start Guide

Setup lengkap dalam 5 menit!

---

## 🚀 Step 1: Generate Secrets (1 menit)

```bash
./scripts/generate-secrets.sh
```

Copy output ke `.env.local` Anda.

---

## 🗄️ Step 2: Setup Database (2 menit)

1. Login ke https://supabase.com
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy isi file `supabase/schema.sql`
5. Paste dan **Run**

---

## 👤 Step 3: Create Admin User (1 menit)

### Option A: Via Supabase Dashboard

1. **Authentication → Users → Add user**
   - Email: dari .env.local
   - Password: set password
   - Auto-confirm: ✅ centang
   - **Copy User ID**

2. **SQL Editor:**
   ```sql
   INSERT INTO public.users (id, email, name, role)
   VALUES (
     'PASTE_USER_ID_HERE',
     'admin@yourcompany.com',
     'Administrator',
     'admin'
   );
   ```

### Option B: Via Script (Automated)

```bash
# Start server first
npm run dev

# In another terminal
./scripts/seed-admin.sh
```

---

## 🎯 Step 4: Test Application (1 menit)

```bash
# Start server (if not already running)
npm run dev

# Open browser
open http://localhost:3000/admin/login
```

**Login dengan:**
- Email: dari .env.local
- Password: yang Anda set

---

## ✅ Verification

Jika sukses, Anda akan melihat:
- ✅ Admin dashboard
- ✅ Navigation menu (Employees, Attendance, Reports, dll)
- ✅ Welcome message dengan nama Anda

---

## 🎉 Done!

Selamat! Aplikasi siap digunakan.

**Next Steps:**
- Add employees
- Configure settings
- Test attendance tracking
- Generate reports

**Full Guide:** Lihat [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## 🆘 Troubleshooting

### Cannot connect to database
```bash
# Check .env.local
cat .env.local | grep SUPABASE
```

### Login failed
```sql
-- Check user in Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your@email.com';
SELECT * FROM public.users WHERE email = 'your@email.com';
```

### Build errors
```bash
npm run build
# Should see: ✓ Compiled successfully
```

---

**Quick Start v1.0**
