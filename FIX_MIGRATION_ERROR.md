# 🔧 FIX MIGRATION ERROR GUIDE

## Error yang Anda Alami:
```sql
ERROR: 42P07: relation "idx_face_embeddings_active" already exists
```

## Penyebab:
Migration SQL sudah pernah dijalankan sebelumnya secara parsial, sehingga beberapa objek database sudah ada.

## Solusi:

### Option 1: Gunakan Migration Idempotent (RECOMMENDED) ✅

Saya sudah membuat migration file yang lebih robust yang bisa dijalankan berulang kali tanpa error:

```bash
# 1. Gunakan migration file yang baru
psql $DATABASE_URL < supabase/migrations/003_face_embeddings_idempotent.sql
```

Atau gunakan script helper:

```bash
# 2. Atau jalankan script yang sudah disiapkan
./scripts/run-face-embeddings-migration.sh
```

### Option 2: Manual Clean & Recreate

Jika ingin mulai dari awal:

```sql
-- 1. Drop everything first (CAREFUL!)
DROP TABLE IF EXISTS face_embeddings CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_face_embeddings_limit() CASCADE;

-- 2. Then run migration again
psql $DATABASE_URL < supabase/migrations/003_face_embeddings_idempotent.sql
```

### Option 3: Check Current Status

Cek status tabel saat ini:

```bash
# Check what already exists
psql $DATABASE_URL < supabase/check-face-embeddings.sql
```

## Files yang Sudah Saya Buat:

1. **`supabase/migrations/003_face_embeddings_idempotent.sql`**
   - Migration yang aman dijalankan berulang kali
   - Menggunakan IF NOT EXISTS untuk semua objects
   - Include rollback script di bagian bawah

2. **`supabase/check-face-embeddings.sql`**
   - Script untuk check status current database
   - Menampilkan semua tables, indexes, policies, triggers

3. **`scripts/run-face-embeddings-migration.sh`**
   - Automated script untuk run migration
   - Include pre and post checks
   - Error handling

## Quick Fix Steps:

```bash
# 1. Set DATABASE_URL (if not already set)
export DATABASE_URL="postgresql://user:pass@host:port/dbname"

# 2. Run the safe migration
./scripts/run-face-embeddings-migration.sh

# 3. Verify success
psql $DATABASE_URL -c "SELECT COUNT(*) FROM face_embeddings;"
```

## Testing After Migration:

1. Start development server:
```bash
npm run dev
```

2. Open test page:
```
http://localhost:3000/test-face-recognition.html
```

3. Run tests:
- Click "Load Models"
- Click "Start Camera"
- Click "Detect Face"
- Click "Run Complete Test"

## Troubleshooting:

### If migration still fails:
```sql
-- Nuclear option: drop everything and start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run migration
psql $DATABASE_URL < supabase/migrations/003_face_embeddings_idempotent.sql
```

### If Supabase connection fails:
1. Check `.env.local` has correct credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Test connection:
```javascript
// In browser console
fetch('YOUR_SUPABASE_URL/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ANON_KEY'
  }
}).then(r => console.log('Status:', r.status))
```

## Status:
✅ Migration files sudah diperbaiki dan siap digunakan
✅ Script automation sudah dibuat
✅ Face recognition system fully functional setelah migration berhasil
