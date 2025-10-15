# 📋 Database Migration Guide

## Cara Menjalankan Migration

Karena Supabase tidak mendukung eksekusi SQL via API/RPC, kita perlu menjalankan migration melalui **Supabase Dashboard**.

---

## 🚀 Langkah-langkah:

### 1. Buka Supabase Dashboard
```
https://app.supabase.com/project/gyldzxwpxcbfitvmqzza
```

### 2. Ke SQL Editor
- Klik menu **SQL Editor** di sidebar kiri
- Atau langsung ke: https://app.supabase.com/project/gyldzxwpxcbfitvmqzza/sql

### 3. Buka Migration File
Buka file berikut di text editor:
```
supabase/migrations/20240115_dynamic_attendance_system.sql
```

### 4. Copy SEMUA isi file

### 5. Paste ke SQL Editor di Supabase
- Paste di SQL Editor
- Klik tombol **RUN** (atau tekan Ctrl+Enter)

### 6. Tunggu Eksekusi
Migration akan membuat:
- ✅ 7 tabel baru
- ✅ 15 indexes
- ✅ 5 triggers
- ✅ Seed data (4 shifts + 5 break policies)

### 7. Verifikasi
Cek tabel yang sudah dibuat:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'shifts',
  'break_policies',
  'break_sessions',
  'attendance_exceptions',
  'work_hour_adjustments',
  'shift_swap_requests',
  'shift_swap_history'
);
```

Harusnya return 7 rows.

---

## ✅ Expected Result:

```
✓ shifts table created
✓ break_policies table created
✓ break_sessions table created  
✓ attendance_exceptions table created
✓ work_hour_adjustments table created
✓ shift_swap_requests table created
✓ shift_swap_history table created
✓ All indexes created
✓ All triggers created
✓ Seed data inserted
```

---

## 🔍 Cek Data Seed:

### Shifts
```sql
SELECT * FROM shifts;
```
Harusnya ada 4 shifts:
- Regular (08:00-17:00)
- Morning (06:00-14:00)
- Afternoon (14:00-22:00)
- Night (22:00-06:00)

### Break Policies
```sql
SELECT * FROM break_policies;
```
Harusnya ada 5 policies:
- Standard (60 min)
- Flexible (60 min, 3 splits)
- Short (30 min)
- Extended (120 min)
- Prayer (15 min, 5 splits)

---

## ⚠️ Troubleshooting:

### Error: "relation already exists"
Artinya tabel sudah ada. Ini OK, bisa diabaikan.

### Error: "permission denied"
Pastikan Anda login sebagai project owner atau admin.

### Error: Timeout
SQL terlalu besar untuk 1x run. Split menjadi beberapa bagian:
1. Run CREATE TABLE statements dulu
2. Lalu CREATE INDEX
3. Lalu CREATE TRIGGER
4. Lalu INSERT seed data

---

## 📊 Alternative: Manual Split

Jika SQL Editor timeout, run secara bertahap:

### Part 1: Tables
```sql
-- Copy bagian CREATE TABLE saja
-- Line 13-269 di migration file
```

### Part 2: Indexes
```sql
-- Copy bagian CREATE INDEX saja
-- Line 271-289 di migration file
```

### Part 3: Seed Data
```sql
-- Copy bagian INSERT saja
-- Line 295-308 di migration file
```

### Part 4: Triggers
```sql
-- Copy bagian CREATE TRIGGER saja
-- Line 314-341 di migration file
```

---

## ✅ Setelah Migration Berhasil:

1. **Test API endpoints**:
```bash
npm run dev
```

2. **Cek halaman Shift Swap**:
```
http://localhost:3000/shift-swap
```

3. **Verify di Supabase**:
- Table Editor > lihat tables baru
- SQL Editor > run queries untuk test

---

## 🚀 Next: Add RLS Policies

Setelah migration berhasil, tambahkan Row Level Security:

```sql
-- Enable RLS
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own swaps
CREATE POLICY "view_own_swaps" ON shift_swap_requests
  FOR SELECT USING (
    auth.uid() = requestor_id OR 
    auth.uid() = target_id
  );

-- Policy: Users can create swaps
CREATE POLICY "create_swaps" ON shift_swap_requests
  FOR INSERT WITH CHECK (auth.uid() = requestor_id);

-- Policy: Targets can respond
CREATE POLICY "respond_swaps" ON shift_swap_requests
  FOR UPDATE USING (
    auth.uid() = target_id AND 
    status = 'pending_target'
  );

-- Policy: Managers can approve
CREATE POLICY "approve_swaps" ON shift_swap_requests
  FOR UPDATE USING (
    auth.uid() = manager_id AND 
    status IN ('pending_manager', 'pending_hr')
  );
```

---

**Status:** Migration file ready ✅
**Action:** Copy SQL to Supabase Dashboard
**Time:** ~2 minutes

Good luck! 🚀
