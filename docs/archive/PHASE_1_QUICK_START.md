# Phase 1 Quick Start Guide 🚀

**Get your attendance system running in 15 minutes!**

---

## Prerequisites

✅ Node.js 18+ installed  
✅ npm or pnpm installed  
✅ Supabase account (free tier works)  
✅ Basic understanding of environment variables

---

## Step 1: Supabase Setup (5 minutes)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Set a strong database password (save it!)
5. Select region closest to you
6. Click "Create New Project" (wait 2-3 minutes)

### 1.2 Get API Credentials
1. In Supabase Dashboard → Settings → API
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (anon key won't work - use service_role!)

### 1.3 Run Database Migration
1. In Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy **entire content** from `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click "Run" ▶️
6. Wait for success message (should see "Migration 001 completed successfully!")

**Verify:** Go to Table Editor - you should see 9 tables created.

---

## Step 2: Environment Configuration (2 minutes)

### 2.1 Create `.env.local` File
```bash
cp .env.example .env.local
```

### 2.2 Edit `.env.local`
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (generate a strong 32+ character string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# Application
NEXT_PUBLIC_APP_NAME="My Company Attendance"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate JWT Secret:**
```bash
# Option 1: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using openssl
openssl rand -hex 32

# Option 3: Manual (use a password manager)
# Make it 32+ characters, random mix of letters, numbers, symbols
```

---

## Step 3: Face Recognition Models (3 minutes)

### 3.1 Download Models
```bash
./scripts/download-face-models.sh
```

**This downloads:**
- TinyFaceDetector (fast face detection)
- Face Landmark 68 (facial points)
- Face Recognition (128D descriptors)
- SSD MobileNet (optional, better accuracy)

**Verify:** Check `public/models/` directory - should have 10+ files.

---

## Step 4: Install Dependencies (2 minutes)

```bash
# Using npm
npm install

# Or using pnpm
pnpm install
```

---

## Step 5: Create Admin User (2 minutes)

### Option A: Using Supabase SQL Editor
```sql
-- Run this in Supabase SQL Editor
INSERT INTO public.users (
  id, email, password_hash, name, role, 
  department, position, employee_id, is_active
) VALUES (
  gen_random_uuid(),
  'admin@company.com',
  '$2a$10$YourHashedPasswordHere', -- See note below
  'System Administrator',
  'admin',
  'IT',
  'System Admin',
  'ADM001',
  true
);
```

**Note:** For password hashing, use bcrypt:
```bash
# Install bcrypt-cli globally
npm install -g bcrypt-cli

# Hash your password
bcrypt-cli "YourPassword123" 10
```

### Option B: Using Seed API (Recommended)
```bash
# Start the dev server first
npm run dev

# Then in another terminal:
curl -X POST http://localhost:3000/api/admin/seed
```

This creates default admin: `admin@test.com` / `admin123`

---

## Step 6: Start Development Server (1 minute)

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## Step 7: Test Your Setup ✅

### 7.1 Test Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Should return: { "success": true, "token": "...", "user": {...} }
```

### 7.2 Test Dashboard Stats API
```bash
# Use the token from login
curl -X GET http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return user counts and attendance stats
```

### 7.3 Test Employee Management
```bash
# Get all employees
curl -X GET http://localhost:3000/api/admin/employees \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7.4 Test Face Enrollment (Optional)
```bash
# Enroll a face embedding
curl -X POST http://localhost:3000/api/admin/face/embeddings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "descriptor": [0.1, 0.2, ...], # 128 numbers
    "quality": 0.9
  }'
```

---

## Troubleshooting 🔧

### Problem: "Missing Supabase credentials"
**Solution:** Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Problem: "JWT_SECRET is not configured"
**Solution:** Add `JWT_SECRET` to `.env.local` (32+ characters)

### Problem: "Database connection failed"
**Solution:**
1. Verify Supabase project is active
2. Check URL and key are correct
3. Ensure service_role key (not anon key!)
4. Check if database migration ran successfully

### Problem: "No face models found"
**Solution:**
```bash
chmod +x scripts/download-face-models.sh
./scripts/download-face-models.sh
```

### Problem: "Unauthorized" on API calls
**Solution:**
1. Check if you're sending `Authorization: Bearer TOKEN` header
2. Verify token is valid (not expired)
3. Check user has correct role for endpoint

### Problem: Face recognition not working
**Solution:**
1. Ensure face models are downloaded
2. Check descriptor is exactly 128 dimensions
3. Verify at least one face embedding exists in DB
4. Check confidence threshold (default 0.6)

---

## Next Steps 🎯

Now that Phase 1 is running:

1. **Test All Endpoints**
   - Employee CRUD
   - Attendance CRUD
   - Face enrollment
   - Face check-in
   - Report generation

2. **Create More Users**
   - Add HR users
   - Add managers
   - Add employees
   - Enroll their faces

3. **Configure Settings**
   - Update company info in database
   - Set working hours
   - Configure attendance rules
   - Set up notifications

4. **Move to Phase 2**
   - Update frontend components
   - Connect UI to real APIs
   - Implement face enrollment modal
   - Create face check-in page
   - See `PHASE_1_IMPLEMENTATION_COMPLETE.md`

---

## Quick Reference 📚

### Important Files
```
.env.local                          # Your configuration
supabase/migrations/001_*.sql       # Database schema
lib/supabase-db.ts                  # Database manager
lib/api-auth-middleware.ts          # Authentication
lib/face-matching.ts                # Face recognition
lib/report-generator.ts             # Reports
scripts/download-face-models.sh     # Model downloader
```

### Key API Endpoints
```
POST   /api/auth/login              # Login
GET    /api/admin/dashboard/stats   # Dashboard data
GET    /api/admin/employees         # List employees
POST   /api/admin/employees         # Create employee
GET    /api/admin/attendance        # List attendance
POST   /api/attendance/face-checkin # Face check-in
POST   /api/admin/face/embeddings   # Enroll face
POST   /api/admin/reports/generate  # Generate report
```

### Database Tables
```
users                    # Employee accounts
attendance_records       # Check-in/out records
face_embeddings         # Face recognition data
schedules               # Work schedules
schedule_assignments    # User schedule assignments
settings                # System configuration
audit_logs              # Security audit trail
notifications           # User notifications
reports                 # Saved reports
```

---

## Support 💬

**Found an issue?**
1. Check troubleshooting section above
2. Review `PHASE_1_IMPLEMENTATION_COMPLETE.md`
3. Check Supabase logs for errors
4. Verify all environment variables are set

**Need help with Phase 2?**
- See `DOCUMENTATION_INDEX.md`
- Follow `IMPLEMENTATION_PHASES.md`

---

## Success Checklist ✅

Before moving to Phase 2, ensure:

- [ ] Supabase project created and active
- [ ] Database migration completed (9 tables)
- [ ] Environment variables configured
- [ ] Face models downloaded (10+ files)
- [ ] Dependencies installed
- [ ] Admin user created
- [ ] Dev server running
- [ ] Login API works
- [ ] Dashboard stats API works
- [ ] Employee API works
- [ ] Face enrollment tested (optional but recommended)

---

**Congratulations! 🎉**  
You've successfully completed Phase 1 setup. Your attendance system backend is now production-ready with:
- ✅ Persistent database
- ✅ Secure authentication
- ✅ Face recognition capability
- ✅ Report generation
- ✅ Real-time statistics

**Time to Phase 2:** Update the UI! 🚀
