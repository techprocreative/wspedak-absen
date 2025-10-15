# 🚀 Vercel Auto-Deployment Guide

Panduan lengkap untuk setup auto-deployment ke Vercel setiap kali push ke GitHub.

---

## 📋 Prerequisites

1. ✅ Akun GitHub (free tier cukup)
2. ✅ Akun Vercel (free tier cukup) - https://vercel.com
3. ✅ Akun Supabase (free tier cukup) - https://supabase.com
4. ✅ Git installed di komputer

---

## 🔧 Step 1: Setup Supabase Database

### 1.1 Create Supabase Project
```bash
1. Buka https://app.supabase.com
2. Klik "New Project"
3. Isi:
   - Name: attendance-system (atau nama lain)
   - Database Password: [buat password kuat, SIMPAN!]
   - Region: Southeast Asia (Singapore)
4. Tunggu project selesai dibuat (~2 menit)
```

### 1.2 Get API Keys
```bash
1. Klik project yang baru dibuat
2. Pergi ke Settings > API
3. Catat:
   - Project URL: https://xxxxx.supabase.co
   - anon/public key: eyJhbGc...
   - service_role key: eyJhbGc... (jangan share ini!)
```

### 1.3 Setup Database Schema
```bash
1. Di Supabase Dashboard, klik "SQL Editor"
2. Klik "New query"
3. Copy isi dari file: supabase/migrations/20240101000000_initial_schema.sql
4. Paste ke SQL Editor
5. Klik "Run"
6. Tunggu sampai selesai
```

### 1.4 Seed Data (Optional - untuk testing)
```bash
1. Di SQL Editor, buat query baru
2. Copy isi dari file: supabase/seed.sql
3. Paste dan Run
4. Ini akan membuat admin user default:
   - Email: admin@test.com
   - Password: admin123
```

---

## 🐙 Step 2: Push Project ke GitHub

### 2.1 Create GitHub Repository
```bash
1. Buka https://github.com/new
2. Isi:
   - Repository name: v0-attendance (atau nama lain)
   - Visibility: Private (recommended) atau Public
3. JANGAN centang "Initialize with README" (sudah ada)
4. Klik "Create repository"
```

### 2.2 Connect Local Repository
```bash
# Di terminal, di folder project:

# 1. Pastikan .env tidak ter-commit
git status

# 2. Add remote origin (ganti <username> dengan GitHub username Anda)
git remote add origin https://github.com/<username>/v0-attendance.git

# atau jika sudah ada remote, update:
git remote set-url origin https://github.com/<username>/v0-attendance.git

# 3. Push ke GitHub
git branch -M main
git push -u origin main
```

**⚠️ PENTING**: Pastikan file `.env` dan `.env.local` TIDAK ter-commit! Cek `.gitignore` sudah benar.

---

## 🌐 Step 3: Deploy ke Vercel

### 3.1 Connect Vercel dengan GitHub
```bash
1. Buka https://vercel.com/login
2. Klik "Continue with GitHub"
3. Authorize Vercel untuk akses GitHub
```

### 3.2 Import Project
```bash
1. Di Vercel Dashboard, klik "Add New..." > "Project"
2. Di "Import Git Repository", cari "v0-attendance"
3. Klik "Import" di repository Anda
```

### 3.3 Configure Project
```bash
Framework Preset: Next.js (auto-detected)
Root Directory: ./ (default)
Build Command: npm run build (default)
Output Directory: .next (default)
Install Command: npm install (default)
```
**Klik "Deploy" JANGAN DULU! Setup environment variables dulu.**

### 3.4 Setup Environment Variables
```bash
Klik "Environment Variables"

Tambahkan satu per satu:

# Database (dari Supabase Step 1.2)
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://xxxxx.supabase.co
Environment: Production, Preview, Development

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGc... (anon key dari Supabase)
Environment: Production, Preview, Development

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc... (service_role key dari Supabase)
Environment: Production, Preview, Development

# Security (generate random 32+ char string)
Name: JWT_SECRET
Value: [generate dengan: openssl rand -base64 32]
Environment: Production, Preview, Development

Name: SESSION_SECRET
Value: [generate dengan: openssl rand -base64 32]
Environment: Production, Preview, Development

# App Config (optional)
Name: NEXT_PUBLIC_APP_NAME
Value: Attendance System
Environment: Production, Preview, Development

Name: NEXT_PUBLIC_APP_URL
Value: https://your-project.vercel.app (akan dapat setelah deploy)
Environment: Production, Preview, Development
```

### 3.5 Deploy!
```bash
1. Setelah semua env variables diisi
2. Klik "Deploy"
3. Tunggu build selesai (~2-3 menit)
4. Jika sukses, klik "Visit" untuk lihat site
```

---

## 🔄 Step 4: Setup Auto-Deployment

**Good news: Sudah otomatis aktif!** 🎉

Vercel secara otomatis akan:
- ✅ Deploy setiap kali push ke `main` branch → Production
- ✅ Deploy setiap kali push ke branch lain → Preview deployment
- ✅ Deploy setiap kali ada Pull Request → Preview deployment

### Test Auto-Deployment
```bash
# Di local project:
# 1. Buat perubahan kecil
echo "# Test" >> test.md

# 2. Commit
git add test.md
git commit -m "test: vercel auto deployment"

# 3. Push
git push origin main

# 4. Buka Vercel Dashboard
# Lihat deployment baru otomatis dimulai!
# Tunggu ~2 menit, akan otomatis live
```

---

## ⚙️ Step 5: Post-Deployment Setup

### 5.1 Update CORS di Supabase
```bash
1. Buka Supabase Dashboard
2. Settings > API > CORS Configuration
3. Tambahkan domain Vercel:
   https://your-project.vercel.app
   https://your-project-*.vercel.app (untuk preview deployments)
```

### 5.2 Update Vercel Environment Variable
```bash
1. Di Vercel Dashboard > Settings > Environment Variables
2. Edit NEXT_PUBLIC_APP_URL
3. Set value: https://your-project.vercel.app
4. Save
5. Redeploy (Deployments > ... > Redeploy)
```

### 5.3 Test Face Recognition
```bash
1. Buka https://your-project.vercel.app
2. Login dengan admin@test.com / admin123
3. Pergi ke "Face Check-In"
4. Allow camera access
5. Pastikan face detection bekerja
```

---

## 🎯 Deployment Workflow (Sudah Aktif!)

```
┌─────────────────────┐
│  Local Development  │
│                     │
│  npm run dev        │
│  Make changes       │
└──────────┬──────────┘
           │
           │ git push origin main
           ▼
┌─────────────────────┐
│      GitHub         │
│                     │
│  Repository Updated │
└──────────┬──────────┘
           │
           │ Webhook triggers
           ▼
┌─────────────────────┐
│      Vercel         │
│                     │
│  1. Pull code       │
│  2. Install deps    │
│  3. Run build       │
│  4. Deploy          │
└──────────┬──────────┘
           │
           │ 2-3 minutes
           ▼
┌─────────────────────┐
│   Live Production   │
│                     │
│  ✅ Auto-deployed!  │
└─────────────────────┘
```

---

## 🔐 Security Checklist

**SEBELUM PRODUCTION:**

- [ ] Ganti default admin password dari `admin123`
- [ ] Generate JWT_SECRET yang kuat (min 32 karakter)
- [ ] Pastikan `.env` tidak ter-commit di git
- [ ] Set CORS di Supabase hanya untuk domain production
- [ ] Enable RLS (Row Level Security) di semua Supabase tables
- [ ] Set Vercel Environment Variables hanya untuk Production
- [ ] Nonaktifkan demo credentials (set `ALLOW_DEMO_CREDENTIALS=false`)
- [ ] Review audit logs untuk aktivitas mencurigakan

---

## 📊 Monitoring & Logs

### Vercel Logs
```bash
1. Vercel Dashboard > Your Project > Deployments
2. Klik deployment yang ingin dilihat
3. Tab "Logs" untuk runtime logs
4. Tab "Build Logs" untuk build errors
```

### Supabase Logs
```bash
1. Supabase Dashboard > Your Project
2. Logs > Postgres Logs (database queries)
3. Logs > API Logs (authentication & API calls)
```

### Performance Monitoring
```bash
Vercel Dashboard > Analytics:
- Page load times
- Core Web Vitals
- Error rates
- Traffic analytics
```

---

## 🐛 Troubleshooting

### Build Failed
**Error**: `npm ERR! code ELIFECYCLE`
```bash
Solution:
1. Check Build Logs di Vercel
2. Pastikan semua dependencies di package.json
3. Coba build local: npm run build
4. Fix errors, commit, push lagi
```

### Environment Variables Not Working
**Error**: `Cannot read SUPABASE_URL`
```bash
Solution:
1. Vercel Dashboard > Settings > Environment Variables
2. Pastikan variable ada di "Production"
3. Redeploy: Deployments > ... > Redeploy
```

### Database Connection Failed
**Error**: `Could not connect to database`
```bash
Solution:
1. Check Supabase project masih aktif
2. Verify SUPABASE_URL dan keys correct
3. Check CORS settings di Supabase
4. Test connection: curl https://xxxxx.supabase.co
```

### Face Recognition Models Not Loading
**Error**: `Failed to load face models`
```bash
Solution:
1. Pastikan folder public/models/ ter-commit
2. Check di Vercel deployment files include models
3. Redeploy jika perlu
```

---

## 💡 Best Practices

### Branch Strategy
```bash
main (production)
  ├── develop (staging)
  └── feature/* (preview deployments)

# Workflow:
1. Create feature branch: git checkout -b feature/new-feature
2. Develop & test locally
3. Push: git push origin feature/new-feature
4. Creates preview deployment di Vercel
5. Test di preview URL
6. Merge to main via PR
7. Auto-deploys to production
```

### Rollback Strategy
```bash
Jika ada bug di production:

1. Vercel Dashboard > Deployments
2. Cari deployment yang stable (sebelum bug)
3. Klik "..." > "Promote to Production"
4. Instant rollback!
```

### Monitoring
```bash
Setup monitoring untuk production:
1. Vercel Analytics (included)
2. Supabase Monitoring (included)
3. Setup alerts untuk errors
4. Monitor build times & success rates
```

---

## 🎓 Next Steps

Setelah deployment sukses:

1. ✅ Test semua fitur di production URL
2. ✅ Setup custom domain (optional)
3. ✅ Configure email notifications
4. ✅ Setup backup strategy
5. ✅ Create admin documentation
6. ✅ Train users
7. ✅ Monitor for 1 week

---

## 📞 Support

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Supabase Issues:**
- Docs: https://supabase.com/docs
- Support: https://supabase.com/support

**Project Issues:**
- GitHub Issues: Create issue di repository Anda
- Check docs/root-docs/ untuk detailed documentation

---

## ✅ Deployment Checklist

- [ ] Supabase project created & configured
- [ ] Database schema migrated
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel account connected to GitHub
- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Auto-deployment tested (push to trigger)
- [ ] Custom domain configured (optional)
- [ ] CORS updated in Supabase
- [ ] Face recognition tested in production
- [ ] Default passwords changed
- [ ] Security settings reviewed
- [ ] Monitoring setup
- [ ] Team trained

---

**🎉 Congratulations! Your attendance system is now live with auto-deployment!**

Every push to GitHub `main` branch will automatically deploy to production.
