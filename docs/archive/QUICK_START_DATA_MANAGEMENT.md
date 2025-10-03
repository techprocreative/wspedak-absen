# ⚡ QUICK START: Data Management

## 🚀 Setup in 10 Minutes

### Step 1: Run SQL Scripts (5 min)

**Open Supabase SQL Editor, run these in order:**

```sql
-- 1. Add audit logs table
-- File: supabase/add-audit-logs-table.sql
-- Copy and paste entire file, then run

-- 2. Setup storage buckets
-- File: supabase/setup-storage-buckets.sql
-- Copy and paste entire file, then run

-- 3. Verify setup
-- File: supabase/verify-setup.sql
-- Copy and paste entire file, then run
-- Should see: ✅ PASS for all checks
```

### Step 2: Create Admin User (2 min)

**In Supabase Dashboard:**

1. **Authentication → Users → Add User**
   - Email: admin@yourcompany.com
   - Password: (set strong password)
   - ✅ Auto Confirm User
   - Click "Create user"
   - **Copy the User ID**

2. **SQL Editor, run:**
```sql
INSERT INTO public.users (id, email, name, role)
VALUES (
  'PASTE_USER_ID_HERE',  -- Replace with copied ID
  'admin@yourcompany.com',
  'System Administrator',
  'admin'
);
```

### Step 3: Test Features (3 min)

```bash
# Terminal
npm run dev

# Browser
1. Open: http://localhost:3000/admin/login
2. Login with admin credentials
3. Go to: Admin → Data Management
4. Test Export → Select "Employees" → CSV → Export
5. Should download CSV file ✅
```

---

## 🎯 What You Can Do Now

### Export Data
```bash
POST /api/admin/data-management/export
{
  "exportType": "employees",
  "format": "csv",
  "fields": ["name", "email", "role"]
}
```

### Import Data
```bash
POST /api/admin/data-management/import
FormData:
  - file: employees.csv
  - importType: employees
  - mode: upsert
```

### Create Backup
```bash
POST /api/admin/data-management/backup
{
  "type": "full",
  "compression": true
}
```

### Restore Backup
```bash
POST /api/admin/data-management/restore
{
  "filename": "backup-full-1234567890.zip",
  "conflictResolution": "skip"
}
```

---

## 📊 Features Available

✅ Export to CSV, Excel, JSON  
✅ Import from CSV, Excel, JSON  
✅ Database backup & restore  
✅ Field selection & filtering  
✅ Data validation  
✅ Rate limiting  
✅ Audit logging  
✅ Admin/HR only access  

---

## 🔗 Links

- **Full Guide:** `DATA_MANAGEMENT_COMPLETE.md`
- **Setup Instructions:** `FINAL_SETUP_INSTRUCTIONS.md`
- **API Details:** `DATA_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- **Action Plan:** `DATA_MANAGEMENT_ACTION_PLAN.md`

---

## ⚠️ Troubleshooting

**Error: "Bucket not found"**  
→ Run `supabase/setup-storage-buckets.sql`

**Error: "Unauthorized"**  
→ Make sure you're logged in as admin

**Error: "Table audit_logs does not exist"**  
→ Run `supabase/add-audit-logs-table.sql`

---

## ✅ Success Checklist

- [ ] SQL scripts executed (3 files)
- [ ] Admin user created
- [ ] Can login to admin panel
- [ ] Can export data to CSV
- [ ] File downloaded successfully
- [ ] Audit log visible in database

**All checked? You're ready! 🎉**

---

**Status:** Production Ready  
**Build:** Successful  
**Version:** 1.0
