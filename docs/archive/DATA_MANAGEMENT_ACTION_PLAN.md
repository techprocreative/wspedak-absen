# 🚀 Data Management - Action Plan to Production

## 📋 Quick Summary

**Current Status:** 70% Ready (UI Perfect, Backend Mock)  
**Time to Production:** 2-4 weeks  
**Priority:** HIGH  

---

## 🎯 Phase 1: Critical Fixes (Week 1-2) - MUST DO

### 1.1 Install Missing Dependencies

```bash
# CSV handling
npm install papaparse
npm install @types/papaparse

# Excel handling  
npm install xlsx

# PDF generation
npm install jspdf jspdf-autotable

# Compression
npm install jszip
npm install archiver
npm install @types/archiver

# Authentication (if not using Supabase)
npm install next-auth
npm install @types/next-auth
```

### 1.2 Fix Authentication

**File:** All API routes in `/app/api/admin/data-management/`

**Replace:**
```typescript
// ❌ Current (Mock)
async function checkAuth() {
  return true
}
```

**With:**
```typescript
// ✅ Real implementation
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function checkAuth(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return false
  
  // Check if user is admin
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  return user?.role === 'admin'
}
```

### 1.3 Implement Real Export (QUICK WIN)

**File:** `/app/api/admin/data-management/export/route.ts`

**Implementation:**
```typescript
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  // 1. Auth check
  const isAuth = await checkAuth(request)
  if (!isAuth) return unauthorized()
  
  // 2. Parse request
  const { exportType, format, fields, filters } = await request.json()
  
  // 3. Get real data from Supabase
  const supabase = createServerSupabaseClient()
  let query = supabase.from(exportType).select(fields.join(','))
  
  // Apply filters
  if (filters) {
    filters.forEach(filter => {
      query = query.filter(filter.field, filter.operator, filter.value)
    })
  }
  
  const { data, error } = await query
  if (error) throw error
  
  // 4. Format data
  let fileContent: string | Buffer
  let contentType: string
  let extension: string
  
  switch (format) {
    case 'csv':
      fileContent = Papa.unparse(data)
      contentType = 'text/csv'
      extension = 'csv'
      break
      
    case 'excel':
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      fileContent = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      extension = 'xlsx'
      break
      
    case 'json':
      fileContent = JSON.stringify(data, null, 2)
      contentType = 'application/json'
      extension = 'json'
      break
      
    default:
      throw new Error('Unsupported format')
  }
  
  // 5. Upload to Supabase Storage
  const filename = `${exportType}-${Date.now()}.${extension}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('exports')
    .upload(filename, fileContent, {
      contentType,
      cacheControl: '3600'
    })
  
  if (uploadError) throw uploadError
  
  // 6. Get download URL
  const { data: { publicUrl } } = supabase.storage
    .from('exports')
    .getPublicUrl(filename)
  
  // 7. Log activity
  await supabase.from('audit_logs').insert({
    user_id: session.user.id,
    action: 'DATA_EXPORT',
    resource: exportType,
    details: { filename, records: data.length, format }
  })
  
  return NextResponse.json({
    success: true,
    downloadUrl: publicUrl,
    filename,
    totalRecords: data.length,
    fileSize: fileContent.length
  })
}
```

### 1.4 Setup Supabase Storage Buckets

```sql
-- Run in Supabase SQL Editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('exports', 'exports', true),
  ('imports', 'imports', false),
  ('backups', 'backups', false);

-- Set storage policies
CREATE POLICY "Admins can upload to exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admins can read from exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
```

### 1.5 Add File Size Validation

**All upload endpoints:**
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

// Validate file
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: 'File too large. Maximum size is 10MB' },
    { status: 400 }
  )
}

if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json(
    { error: 'Invalid file type. Only CSV, Excel, and JSON allowed' },
    { status: 400 }
  )
}
```

---

## 🎯 Phase 2: Essential Features (Week 3)

### 2.1 Implement Real Import

**Steps:**
1. Parse file dengan `papaparse` atau `xlsx`
2. Validate data dengan Zod schemas
3. Insert ke database dalam batches
4. Return validation errors
5. Log import activity

### 2.2 Implement Backup

**Steps:**
1. Query all tables data
2. Create JSON backup
3. Compress dengan `jszip`
4. Upload to Supabase Storage
5. Store backup metadata
6. Schedule automatic backups

### 2.3 Add Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit'

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many uploads. Try again in 15 minutes'
})
```

---

## 🎯 Phase 3: Advanced Features (Week 4)

### 3.1 Background Jobs

```bash
npm install bull
npm install @bull-board/express
```

### 3.2 Email Notifications

```bash
npm install nodemailer
npm install @types/nodemailer
```

### 3.3 Scheduled Tasks

```bash
npm install node-cron
npm install @types/node-cron
```

---

## 📝 Testing Checklist

### Export Testing
- [ ] Export 10 employees to CSV
- [ ] Export 10 employees to Excel
- [ ] Export 10 employees to JSON
- [ ] Export with filters
- [ ] Export large dataset (1000+ records)
- [ ] Test download link expires after 1 hour
- [ ] Test unauthorized access blocked

### Import Testing
- [ ] Import valid CSV file
- [ ] Import valid Excel file
- [ ] Import with validation errors
- [ ] Import duplicate records
- [ ] Import large file (5MB+)
- [ ] Test file size limit (11MB should fail)
- [ ] Test invalid file type blocked

### Backup Testing
- [ ] Create full backup
- [ ] Download backup file
- [ ] Restore from backup
- [ ] Verify data integrity after restore
- [ ] Test scheduled backup
- [ ] Test backup retention (old backups deleted)

---

## 🔒 Security Checklist

- [ ] Real authentication implemented
- [ ] Role-based access (admin only)
- [ ] File size limits (10MB)
- [ ] File type validation
- [ ] Rate limiting (5 uploads per 15 min)
- [ ] CORS configured
- [ ] HTTPS only (in production)
- [ ] Audit logging all operations
- [ ] Sanitize filenames
- [ ] Validate all inputs
- [ ] No SQL injection possible
- [ ] Session timeout configured
- [ ] Storage bucket permissions correct

---

## 📊 Progress Tracking

### Week 1
- [ ] Day 1-2: Install dependencies, setup Supabase Storage
- [ ] Day 3-4: Implement real authentication
- [ ] Day 5: Implement export feature (CSV, JSON)

### Week 2
- [ ] Day 1-2: Implement export (Excel, PDF)
- [ ] Day 3-4: Implement import feature
- [ ] Day 5: Testing and bug fixes

### Week 3
- [ ] Day 1-2: Implement backup feature
- [ ] Day 3: Implement restore feature
- [ ] Day 4-5: Add rate limiting and security

### Week 4
- [ ] Day 1-2: Implement background jobs
- [ ] Day 3: Implement email notifications
- [ ] Day 4-5: Final testing and deployment

---

## 🚀 Quick Start Commands

```bash
# Week 1 Setup
npm install papaparse @types/papaparse xlsx jspdf jspdf-autotable jszip archiver @types/archiver

# Create Supabase buckets
# Run SQL script above in Supabase SQL Editor

# Test export feature
curl -X POST http://localhost:3000/api/admin/data-management/export \
  -H "Content-Type: application/json" \
  -d '{"exportType":"users","format":"csv","fields":["name","email"]}'

# Verify download link works
# Check Supabase Storage bucket has file
```

---

## 📞 Support

**Documentation:**
- Main analysis: `ANALISIS_DATA_MANAGEMENT.md`
- Supabase docs: https://supabase.com/docs/guides/storage
- Papa Parse: https://www.papaparse.com/docs
- XLSX: https://docs.sheetjs.com/

**Questions?**
- Check existing code in `/lib` folder for structure
- Review Supabase auth examples
- Test with small datasets first

---

**Action Plan v1.0**  
Last updated: 2024-10-03
