# 🚀 START HERE - Quick Setup Guide

Welcome! This guide will get your attendance system running in **5 minutes**.

---

## ⚡ Super Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Setup database
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
node scripts/seed-database.js

# 4. Download face models
chmod +x scripts/download-face-models.sh
./scripts/download-face-models.sh

# 5. Start!
npm run dev
```

Open http://localhost:3000 and login with:
- **Email**: admin@test.com
- **Password**: admin123

---

## 📋 What You Need

Before starting, make sure you have:

- ✅ Node.js 18+ installed
- ✅ Supabase account (free tier is fine)
- ✅ Git installed

---

## 🗄️ Database Setup (Important!)

### Option 1: Using Supabase Dashboard

1. Go to https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Copy content from `supabase/migrations/001_initial_schema.sql`
5. Execute SQL
6. Copy content from `supabase/seed.sql`
7. Execute SQL

### Option 2: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref <your-project-ref>

# Push schema
npx supabase db push

# Seed data
node scripts/seed-database.js
```

---

## 🔑 Environment Variables

Create `.env.local` file in root:

```env
# Get these from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate random 32+ character string
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Optional
NEXT_PUBLIC_APP_NAME="Attendance System"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Generate JWT Secret

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🤖 Face Recognition Models

The system needs face-api.js models:

```bash
# Download models (13MB)
chmod +x scripts/download-face-models.sh
./scripts/download-face-models.sh
```

This downloads to `public/models/`:
- tiny_face_detector
- face_landmark_68
- face_recognition

---

## ✅ Verify Installation

After setup, test everything works:

```bash
# 1. Build project
npm run build

# 2. Start dev server
npm run dev

# 3. Open browser
# http://localhost:3000

# 4. Login with test credentials
# Email: admin@test.com
# Password: admin123
```

### What to Check:
- [ ] Login page loads
- [ ] Can login successfully
- [ ] Dashboard shows statistics
- [ ] Can access Employees page
- [ ] Can access Attendance page
- [ ] Face check-in page loads camera
- [ ] Can generate reports

---

## 🎯 Next Steps

Once running:

1. **Explore the Dashboard** - http://localhost:3000/admin/dashboard
2. **Try Face Check-in** - http://localhost:3000/face-checkin
3. **Manage Employees** - http://localhost:3000/admin/employees
4. **Generate Reports** - http://localhost:3000/admin/reports/generate

---

## 🐛 Common Issues

### "Cannot connect to database"
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify Supabase project is active
- Check API keys are valid

### "Face models not found"
- Run `./scripts/download-face-models.sh`
- Check `public/models/` folder exists
- Verify models downloaded (13MB total)

### "Build errors with useContext"
- These are warnings, not errors
- Build will still succeed
- Pages render dynamically at runtime

### "Camera not working"
- Grant camera permissions in browser
- Use HTTPS in production (required for camera)
- Check browser supports getUserMedia

---

## 📚 Documentation

- **README.md** - Complete project overview
- **DEPLOYMENT_READY.md** - Production deployment guide
- **STATUS.md** - Current project status
- **ALL_PHASES_COMPLETE.md** - Implementation details

---

## 🚀 Ready to Deploy?

When ready for production:

```bash
# Quick deploy to Vercel
npm i -g vercel
vercel --prod

# Or use deployment script
./scripts/deploy.sh
```

See [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) for complete guide.

---

## 🆘 Need Help?

- Check [README.md](./README.md) troubleshooting section
- Review [STATUS.md](./STATUS.md) for known issues
- Open issue on GitHub

---

**That's it! You're ready to go! 🎉**
