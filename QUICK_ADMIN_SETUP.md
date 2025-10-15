# 🚀 Quick Admin Setup Guide

Pilih salah satu cara:

---

## Cara 1: Edit & Run Script (TERMUDAH) ⭐

### Step 1: Edit Config
Buka file: `scripts/quick-setup-admin.js`

Cari bagian ini dan edit:
```javascript
const ADMIN_CONFIG = {
  email: 'admin@yourcompany.com',      // ⚠️ GANTI INI
  password: 'ChangeMe123!',            // ⚠️ GANTI INI  
  name: 'System Administrator',        // ⚠️ GANTI INI
  department: 'IT',
  position: 'System Administrator',
  employeeId: 'ADM001',
  phone: '+6281234567890'
}
```

Ganti dengan data asli Anda:
```javascript
const ADMIN_CONFIG = {
  email: 'john.doe@mycompany.com',     // Email asli
  password: 'StrongPassword123!',      // Password kuat
  name: 'John Doe',                    // Nama lengkap
  department: 'IT',
  position: 'IT Director',
  employeeId: 'EMP001',
  phone: '+628123456789'
}
```

### Step 2: Run Script
```bash
cd D:\edo\v0-attendance
node scripts/quick-setup-admin.js
```

**Output:**
```
🚀 Quick Admin Setup
================================================
📋 Configuration:
   Email:       john.doe@mycompany.com
   Name:        John Doe
   Department:  IT
   ...

🗑️  Step 1/4: Removing demo users...
✅ Removed 4 demo users

🔍 Step 2/4: Checking existing users...
✅ Email available

🔐 Step 3/4: Creating auth user...
✅ Auth user created: abc-123-def

💾 Step 4/4: Creating database user...
✅ Database user created

🎉 SUCCESS! Admin User Created
================================================
Login Credentials:
   Email:    john.doe@mycompany.com
   Password: StrongPassword123!

🌐 Login at: http://localhost:3000/admin/login
```

### Step 3: Test Login
1. Buka browser: `http://localhost:3000/admin/login`
2. Login dengan email & password yang Anda buat
3. Jika berhasil, admin user sudah siap!

---

## Cara 2: Interactive Script

```bash
cd D:\edo\v0-attendance
node scripts/create-real-admin.js
```

Jawab pertanyaan satu per satu:
- Email
- Password
- Name
- Department
- Position
- Employee ID
- Phone

---

## Cara 3: Via Supabase Dashboard (Manual)

### Step 1: Hapus Demo Users
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Go to **SQL Editor**
4. Paste & run:
```sql
DELETE FROM users WHERE email LIKE '%@test.com';
```

### Step 2: Create Auth User
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Masukkan:
   - Email: `youremail@company.com`
   - Password: `YourStrongPassword`
   - Auto confirm: ✅ YES
4. Copy **User ID** yang muncul

### Step 3: Create Database User
1. Go to **SQL Editor**
2. Paste & edit (ganti [USER_ID] dan data lainnya):
```sql
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  department,
  position,
  employee_id,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  '[USER_ID]',                           -- ⚠️ PASTE USER ID dari Auth
  'youremail@company.com',               -- ⚠️ GANTI
  '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe',
  'Your Full Name',                      -- ⚠️ GANTI
  'admin',
  'IT',
  'System Administrator',
  'ADM001',
  '+628123456789',                       -- ⚠️ GANTI
  true,
  NOW(),
  NOW()
);
```
3. Run query
4. Verify:
```sql
SELECT email, name, role, is_active FROM users;
```

---

## ✅ Verification

Setelah create admin, verify dengan:

```bash
# Check di database
node scripts/cleanup-demo-data.js

# Atau check via SQL
SELECT email, name, role, employee_id, is_active 
FROM users 
ORDER BY created_at DESC;
```

Expected output:
```
youremail@company.com | Your Name | admin | ADM001 | true
```

---

## 🧹 Cleanup Demo Credentials from README

Edit `README.md`, hapus section ini:

```markdown
## 📱 Demo Credentials    ← DELETE THIS

Admin:
  Email: admin@test.com
  Password: admin123
...
```

---

## 🔐 Security Checklist

After setup, verify:

- [ ] Demo users (@test.com) removed
- [ ] Real admin user created with company email
- [ ] Strong password used (not admin123)
- [ ] Can login at /admin/login
- [ ] Demo credentials removed from README.md
- [ ] Script password changed or deleted

---

## 🆘 Troubleshooting

### Error: "User already exists"
```bash
# Check existing users
node -e "require('./.env.local'); const {createClient} = require('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); s.from('users').select('email').then(d => console.log(d.data))"
```

### Error: "Missing Supabase credentials"
Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Can't login
1. Check user exists: Go to Supabase Dashboard → Authentication → Users
2. Check password correct
3. Clear browser cache
4. Try incognito mode

---

**Choose the easiest method for you!**
- 🌟 **Recommended:** Cara 1 (Edit & Run Script)
- ⚡ **Quick:** Cara 2 (Interactive)
- 🔧 **Manual:** Cara 3 (Supabase Dashboard)
