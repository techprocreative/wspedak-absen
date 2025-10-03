# 🚀 Data Management - Quick Setup Guide

## ⚡ Setup in 5 Minutes

Phase 1 (Export Feature) sudah diimplementasikan. Ikuti langkah berikut untuk setup:

---

## Step 1: Run SQL Setup (2 menit)

1. **Login ke Supabase Dashboard**
   - https://supabase.com
   - Pilih project Anda

2. **Buka SQL Editor**
   - Klik "SQL Editor" di sidebar
   - Klik "New Query"

3. **Run Storage Setup**
   ```bash
   # Copy file ini:
   cat supabase/setup-storage-buckets.sql
   ```
   - Paste ke SQL Editor
   - Klik "Run" atau Ctrl+Enter

4. **Verify Buckets Created**
   ```sql
   SELECT id, name, public, file_size_limit 
   FROM storage.buckets 
   WHERE id IN ('exports', 'imports', 'backups');
   ```
   **Expected:** 3 rows (exports, imports, backups)

---

## Step 2: Test Export Feature (3 menit)

### Option A: Via Frontend (Recommended)

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Login as Admin**
   - Open: http://localhost:3000/admin/login
   - Login dengan admin credentials

3. **Go to Data Management**
   - Navigate to: Admin → Data Management
   - Click "Data Export"

4. **Test Export**
   - Select: Export Type = "Employees"
   - Select: Format = "CSV"
   - Select fields: name, email, role
   - Click "Export"
   - Download file should start

### Option B: Via API (For Testing)

```bash
# Get your auth token first (from browser DevTools → Application → Cookies → sb-access-token)
export AUTH_TOKEN="your-token-here"

# Test export
curl -X POST http://localhost:3000/api/admin/data-management/export \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=$AUTH_TOKEN" \
  -d '{
    "exportType": "users",
    "format": "csv",
    "fields": ["name", "email", "role"]
  }'

# Expected response:
{
  "success": true,
  "downloadUrl": "https://...signed-url...",
  "filename": "users-1234567890.csv",
  "totalRecords": 10,
  "fileSize": 1234
}
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] ✅ Buckets created in Supabase Storage
- [ ] ✅ Policies created (9 total)
- [ ] ✅ Export API returns success
- [ ] ✅ File uploaded to 'exports' bucket
- [ ] ✅ Download URL works
- [ ] ✅ Audit log created in database
- [ ] ✅ File expires after 1 hour

---

## 🧪 Test Cases

### Test 1: CSV Export
```bash
POST /api/admin/data-management/export
{
  "exportType": "users",
  "format": "csv",
  "fields": ["name", "email"]
}
Expected: ✅ CSV file with 2 columns
```

### Test 2: Excel Export
```bash
POST /api/admin/data-management/export
{
  "exportType": "users",
  "format": "excel",
  "fields": ["name", "email", "role", "department"]
}
Expected: ✅ Excel file (.xlsx) with 4 columns
```

### Test 3: JSON Export
```bash
POST /api/admin/data-management/export
{
  "exportType": "users",
  "format": "json",
  "fields": ["id", "name", "email"]
}
Expected: ✅ JSON file with array of objects
```

### Test 4: With Filters
```bash
POST /api/admin/data-management/export
{
  "exportType": "users",
  "format": "csv",
  "fields": ["name", "email"],
  "filters": [
    { "field": "role", "operator": "equals", "value": "admin" }
  ]
}
Expected: ✅ Only admin users exported
```

### Test 5: Unauthorized Access
```bash
# Without auth token
curl -X POST http://localhost:3000/api/admin/data-management/export \
  -H "Content-Type: application/json" \
  -d '{"exportType":"users","format":"csv","fields":["name"]}'

Expected: ❌ 401 Unauthorized
```

---

## 🔧 Troubleshooting

### Problem: "Bucket not found"
**Solution:**
```sql
-- Check if buckets exist
SELECT * FROM storage.buckets;

-- If not, run setup script again
-- File: supabase/setup-storage-buckets.sql
```

### Problem: "Unauthorized"
**Solution:**
1. Make sure you're logged in
2. Check user role is 'admin' or 'hr'
```sql
SELECT id, email, role FROM users WHERE email = 'your@email.com';
```

### Problem: "No data found"
**Solution:**
```sql
-- Check if data exists
SELECT COUNT(*) FROM users;

-- If no data, create test user
INSERT INTO users (id, email, name, role)
SELECT gen_random_uuid(), 'test@example.com', 'Test User', 'employee'
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);
```

### Problem: "Failed to upload file"
**Solution:**
1. Check SUPABASE_SERVICE_ROLE_KEY in .env.local
2. Verify bucket policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

---

## 📊 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Export CSV** | ✅ Working | Fully tested |
| **Export Excel** | ✅ Working | Fully tested |
| **Export JSON** | ✅ Working | Fully tested |
| **Filters** | ✅ Working | equals, contains, gt, lt, in |
| **Auth** | ✅ Working | Admin/HR only |
| **Storage** | ✅ Working | Signed URLs, 1hr expiry |
| **Audit Log** | ✅ Working | All exports logged |
| **Import** | ⏳ Pending | Not yet implemented |
| **Backup** | ⏳ Pending | Not yet implemented |

---

## 🎯 What's Next?

After verifying export works:

1. **Phase 2: Import Feature** (Next)
   - File upload
   - Data validation
   - Batch insert

2. **Phase 3: Backup Feature**
   - Database export
   - Compression
   - Restore

See `DATA_MANAGEMENT_ACTION_PLAN.md` for details.

---

## 📞 Need Help?

**Documentation:**
- Implementation Summary: `DATA_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- Action Plan: `DATA_MANAGEMENT_ACTION_PLAN.md`
- Analysis: `ANALISIS_DATA_MANAGEMENT.md`

**Quick Check:**
```bash
# Verify dependencies installed
npm list papaparse xlsx jspdf jszip archiver

# Check Supabase connection
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test build
npm run build
```

---

**Setup Guide v1.0**  
Last updated: 2024-10-03
