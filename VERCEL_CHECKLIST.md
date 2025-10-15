# ✅ Vercel Auto-Deployment Checklist

Quick checklist untuk setup auto-deployment ke Vercel. Print atau bookmark halaman ini!

---

## 🎯 Step 1: Supabase Setup (15 menit)

- [ ] **Create Supabase Account**: https://app.supabase.com
- [ ] **Create New Project**
  - Name: `attendance-system`
  - Password: [Generate & save securely]
  - Region: Southeast Asia (Singapore)
- [ ] **Wait for Project Creation** (~2 minutes)
- [ ] **Get API Credentials**
  - Go to: Settings > API
  - Copy: Project URL
  - Copy: anon/public key
  - Copy: service_role key (keep secret!)
- [ ] **Setup Database Schema**
  - SQL Editor > New Query
  - Run: `supabase/migrations/20240101000000_initial_schema.sql`
- [ ] **Seed Demo Data** (optional)
  - SQL Editor > New Query
  - Run: `supabase/seed.sql`

**✅ Supabase Ready!**

---

## 🐙 Step 2: GitHub Setup (5 menit)

- [ ] **Create GitHub Repository**
  - Go to: https://github.com/new
  - Name: `v0-attendance` (atau nama lain)
  - Private atau Public
  - DON'T initialize with README
- [ ] **Push Code to GitHub**
  ```bash
  git remote add origin https://github.com/yourusername/v0-attendance.git
  git branch -M main
  git push -u origin main
  ```
- [ ] **Verify .env NOT Committed**
  ```bash
  git log -1 --stat | grep .env
  # Should show nothing!
  ```

**✅ GitHub Ready!**

---

## 🌐 Step 3: Vercel Setup (10 menit)

- [ ] **Create Vercel Account**: https://vercel.com/signup
- [ ] **Connect GitHub**
  - Login with GitHub
  - Authorize Vercel
- [ ] **Import Project**
  - New Project > Import Git Repository
  - Select: `v0-attendance`
  - Click Import
- [ ] **Configure Build Settings**
  - Framework: Next.js ✅ (auto-detected)
  - Root Directory: `./` ✅
  - Build Command: `npm run build` ✅
  - Output Directory: `.next` ✅
  
**DON'T CLICK DEPLOY YET!**

---

## 🔐 Step 4: Environment Variables (10 menit)

Add these in Vercel Dashboard > Environment Variables:

- [ ] **NEXT_PUBLIC_SUPABASE_URL**
  - Value: `https://xxxxx.supabase.co`
  - Environment: Production, Preview, Development
  
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Environment: Production, Preview, Development
  
- [ ] **SUPABASE_SERVICE_ROLE_KEY**
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Environment: Production, Preview, Development
  
- [ ] **JWT_SECRET**
  - Generate: `openssl rand -base64 32`
  - Value: [paste generated secret]
  - Environment: Production, Preview, Development
  
- [ ] **SESSION_SECRET**
  - Generate: `openssl rand -base64 32`
  - Value: [paste generated secret]
  - Environment: Production, Preview, Development

**✅ All 5 variables added!**

---

## 🚀 Step 5: First Deployment (5 menit)

- [ ] **Click "Deploy" button**
- [ ] **Wait for Build** (~2-3 minutes)
  - Watch build logs
  - Should see: "Build Successful ✅"
- [ ] **Get Deployment URL**
  - Example: `https://v0-attendance-abc123.vercel.app`
  - Copy this URL
- [ ] **Update NEXT_PUBLIC_APP_URL**
  - Settings > Environment Variables
  - Add new variable:
    - Name: `NEXT_PUBLIC_APP_URL`
    - Value: `https://your-project.vercel.app`
    - Environment: Production
- [ ] **Redeploy**
  - Deployments > ... > Redeploy

**✅ First Deployment Complete!**

---

## 🔄 Step 6: Test Auto-Deployment (2 menit)

- [ ] **Make a Test Change**
  ```bash
  echo "# Test auto-deployment" >> test.md
  git add test.md
  git commit -m "test: vercel auto deployment"
  git push origin main
  ```
- [ ] **Watch Vercel Dashboard**
  - New deployment should start automatically!
  - Wait ~2 minutes
  - Should auto-deploy to production
  
**✅ Auto-Deployment Working!**

---

## ✨ Step 7: Post-Deployment (5 menit)

- [ ] **Update Supabase CORS**
  - Supabase Dashboard > Settings > API
  - Add to allowed origins:
    - `https://your-project.vercel.app`
    - `https://your-project-*.vercel.app`
    
- [ ] **Test Application**
  - [ ] Visit: `https://your-project.vercel.app`
  - [ ] Should see login page
  - [ ] Login: `admin@test.com` / `admin123`
  - [ ] Dashboard loads ✅
  - [ ] Face check-in works ✅
  - [ ] Camera permission granted ✅
  
- [ ] **Test API Health**
  ```bash
  curl https://your-project.vercel.app/api/health
  # Should return: {"status":"healthy","database":"connected"}
  ```

**✅ Fully Deployed!**

---

## 🔒 Step 8: Security Hardening (10 menit)

**CRITICAL - Do Before Production Use!**

- [ ] **Change Default Passwords**
  ```sql
  -- Di Supabase SQL Editor:
  UPDATE users SET password = crypt('NewSecurePassword123!', gen_salt('bf'))
  WHERE email = 'admin@test.com';
  ```
  
- [ ] **Disable Demo Credentials**
  - Vercel > Environment Variables
  - Remove: `ALLOW_DEMO_CREDENTIALS` (if exists)
  
- [ ] **Review Security Settings**
  - [ ] JWT_SECRET is strong (32+ chars) ✅
  - [ ] SESSION_SECRET is strong (32+ chars) ✅
  - [ ] SUPABASE_SERVICE_ROLE_KEY not exposed ✅
  - [ ] CORS only allows your domain ✅
  
- [ ] **Enable RLS** (Row Level Security)
  ```sql
  -- Should already be enabled from migration
  -- Verify in Supabase > Authentication > Policies
  ```

**✅ Production Secure!**

---

## 📊 Step 9: Monitoring Setup (5 menit)

- [ ] **Enable Vercel Analytics**
  - Project Settings > Analytics
  - Enable (free tier available)
  
- [ ] **Setup Alerts**
  - Vercel > Integrations > Notifications
  - Connect Slack or Email
  - Enable deployment notifications
  
- [ ] **Monitor First Week**
  - Check daily for errors
  - Monitor performance metrics
  - Review user feedback

**✅ Monitoring Active!**

---

## 🎓 Step 10: Documentation & Training (10 menit)

- [ ] **Share URLs with Team**
  - Production: `https://your-project.vercel.app`
  - Admin login credentials (changed password)
  
- [ ] **Create User Guide**
  - How to login
  - How to check-in with face
  - How to view attendance
  
- [ ] **Train Admins**
  - Employee management
  - Report generation
  - System settings

**✅ Team Ready!**

---

## 🎯 Total Time: ~60 minutes

---

## 📝 Quick Reference

### Production URL
```
https://your-project-name.vercel.app
```

### Admin Login (Change this!)
```
Email: admin@test.com
Password: admin123
```

### Important Links
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- GitHub Repository: https://github.com/yourusername/v0-attendance

---

## 🔄 Daily Workflow (After Setup)

```bash
# 1. Make changes locally
npm run dev
# Test changes

# 2. Commit changes
git add .
git commit -m "feat: new feature"

# 3. Push to GitHub
git push origin main

# 4. Auto-deploys to Vercel! 🎉
# No manual deployment needed!
```

---

## 🆘 Emergency Procedures

### Rollback Deployment
```
1. Vercel Dashboard > Deployments
2. Find last working deployment
3. Click "..." > "Promote to Production"
4. Instant rollback!
```

### Database Backup
```
1. Supabase Dashboard > Database
2. Backups > Download Backup
3. Save locally
```

### Check Logs
```
Vercel: Dashboard > Project > Logs
Supabase: Dashboard > Logs > Postgres Logs
```

---

## ✅ Final Checklist

Before going to production:

- [ ] All environment variables set
- [ ] Database schema migrated
- [ ] Default passwords changed
- [ ] CORS configured
- [ ] Security settings reviewed
- [ ] Auto-deployment tested
- [ ] Application tested end-to-end
- [ ] Team trained
- [ ] Monitoring enabled
- [ ] Backup strategy in place

---

## 📞 Get Help

- **Full Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Env Variables**: [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support

---

**🎉 Congratulations! Your attendance system is live with auto-deployment!**

Print this checklist and check off items as you complete them.

Last Updated: December 2024
