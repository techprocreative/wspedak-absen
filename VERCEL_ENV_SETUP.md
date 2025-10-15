# 🔐 Vercel Environment Variables - Quick Reference

Copy-paste template untuk setup environment variables di Vercel Dashboard.

---

## 📋 Required Environment Variables

### 1. Database (Supabase)

**NEXT_PUBLIC_SUPABASE_URL**
```
Value: https://xxxxxxxxxxxxx.supabase.co
Environment: Production, Preview, Development
```
*Get from: Supabase Dashboard > Settings > API > Project URL*

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
Value: [your-anon-key-from-supabase-dashboard]
Environment: Production, Preview, Development
```
*Get from: Supabase Dashboard > Settings > API > Project API keys > anon public*

**SUPABASE_SERVICE_ROLE_KEY**
```
Value: [your-service-role-key-from-supabase-dashboard]
Environment: Production, Preview, Development
```
*Get from: Supabase Dashboard > Settings > API > Project API keys > service_role*
⚠️ **KEEP THIS SECRET! Never expose to client-side code**

---

### 2. Authentication & Security

**JWT_SECRET**
```
Value: [generate random string min 32 characters]
Environment: Production, Preview, Development
```
*Generate dengan: `openssl rand -base64 32` atau https://generate-secret.vercel.app*

**SESSION_SECRET**
```
Value: [generate random string min 32 characters]
Environment: Production, Preview, Development
```
*Generate dengan: `openssl rand -base64 32`*

---

### 3. Application Configuration (Optional)

**NEXT_PUBLIC_APP_NAME**
```
Value: Attendance System
Environment: Production, Preview, Development
```

**NEXT_PUBLIC_APP_URL**
```
Value: https://your-project-name.vercel.app
Environment: Production (update after first deployment)
```

**NODE_ENV**
```
Value: production
Environment: Production only
```

---

## 🚀 How to Add in Vercel

### Via Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** > **Environment Variables**
4. For each variable:
   - Click **Add**
   - Name: `VARIABLE_NAME`
   - Value: `your-value`
   - Environments: Check all (Production, Preview, Development)
   - Click **Save**

### Via Vercel CLI

```bash
# Login
vercel login

# Link project
vercel link

# Add variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste value when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste value when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste value when prompted

vercel env add JWT_SECRET production
# Paste value when prompted

vercel env add SESSION_SECRET production
# Paste value when prompted
```

---

## ✅ Verification Checklist

After adding all variables:

- [ ] All 5 required variables added
- [ ] Values don't have extra spaces or quotes
- [ ] SUPABASE_SERVICE_ROLE_KEY is set to Production only (for security)
- [ ] JWT_SECRET and SESSION_SECRET are strong (32+ chars)
- [ ] Redeploy triggered after adding variables

---

## 🧪 Test Environment Variables

After deployment, test if env vars are working:

```bash
# Visit your Vercel deployment URL
https://your-project.vercel.app/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

If you see errors, check:
1. Environment variables spelling
2. Supabase project is active
3. API keys are correct
4. Redeploy after adding variables

---

## 🔒 Security Best Practices

### DO ✅
- Use strong random secrets (32+ characters)
- Keep SUPABASE_SERVICE_ROLE_KEY secret
- Set Production-only for sensitive keys
- Rotate secrets periodically (every 90 days)
- Use different values for Production vs Preview

### DON'T ❌
- Commit .env files to git
- Share service role keys
- Use weak secrets like "password123"
- Use same secrets across projects
- Expose secrets in client-side code

---

## 🔄 Update Environment Variables

To update a variable:

```bash
# Via Dashboard
1. Settings > Environment Variables
2. Click "..." on variable
3. Click "Edit"
4. Update value
5. Save
6. Redeploy

# Via CLI
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
# Enter new value
```

**⚠️ Always redeploy after updating environment variables!**

---

## 🐛 Troubleshooting

### Error: "Cannot read SUPABASE_URL"

**Cause**: Environment variable not set or typo in name

**Fix**:
```bash
1. Check spelling: NEXT_PUBLIC_SUPABASE_URL (exact match)
2. Verify value has no extra spaces
3. Redeploy after adding variable
```

### Error: "Database connection failed"

**Cause**: Invalid Supabase credentials

**Fix**:
```bash
1. Verify SUPABASE_URL is correct
2. Check SUPABASE_SERVICE_ROLE_KEY is valid
3. Ensure Supabase project is active
4. Test connection: curl https://xxxxx.supabase.co
```

### Error: "JWT malformed"

**Cause**: Invalid JWT_SECRET or SESSION_SECRET

**Fix**:
```bash
1. Generate new secret: openssl rand -base64 32
2. Update JWT_SECRET in Vercel
3. Redeploy
4. Clear browser cookies and re-login
```

---

## 📞 Need Help?

- Check: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- Vercel Docs: https://vercel.com/docs/environment-variables
- Supabase Docs: https://supabase.com/docs/guides/api

---

**Last Updated**: December 2024
