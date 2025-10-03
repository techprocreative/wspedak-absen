# Solusi Production Build Errors

## Masalah

Project tidak bisa di-build untuk production karena error:
1. `Cannot read properties of null (reading 'useContext')` - Terjadi pada banyak pages
2. `<Html> should not be imported outside of pages/_document` - Terjadi pada error pages

## Solusi Quick Fix

### Option 1: Disable Static Optimization (Paling Mudah)

Tambahkan di `next.config.mjs`:

```javascript
const nextConfig = {
  // ... existing config
  
  // Disable static optimization to avoid prerender errors
  generateStaticParams: false,
  
  // Or set all routes to dynamic
  experimental: {
    dynamicIO: true,
  },
}
```

### Option 2: Fix Each Page (Lebih Proper)

Tambahkan di setiap page yang error:

```typescript
// Di awal file, setelah imports
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0
```

**Files yang perlu ditambahkan:**
- `app/page.tsx`
- `app/offline/page.tsx`
- `app/admin/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/admin/employees/page.tsx`
- `app/admin/attendance/page.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/schedules/page.tsx`
- `app/admin/settings/page.tsx`
- `app/admin/settings/security/page.tsx`
- `app/admin/monitoring/page.tsx`
- `app/admin/alerts/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/data-management/page.tsx`
- `app/admin/data-management/import/page.tsx`
- `app/admin/data-management/export/page.tsx`
- `app/admin/data-management/backup/page.tsx`
- `app/admin/login/page.tsx`

### Option 3: Gunakan Docker untuk Production (Paling Praktis)

Karena Docker akan menjalankan dalam production mode dengan server-side rendering, error ini kemungkinan tidak akan muncul. Build langsung di Docker:

```bash
docker-compose build
docker-compose up -d
```

## Fix untuk Html Import Error

Cari file yang mengimport Html dari next/document dan hapus:

```bash
# Cari files yang import Html
grep -r "import.*Html.*from.*next" app/

# Biasanya ada di error pages atau custom pages
# Hapus import tersebut atau pindahkan ke _document.tsx
```

## Rekomendasi

**UNTUK SAAT INI:** Gunakan development mode untuk testing dan development.

```bash
npm run dev
```

**UNTUK PRODUCTION:** Gunakan Docker deployment yang sudah dikonfigurasi dengan baik.

```bash
docker-compose up -d
```

Docker sudah dikonfigurasi dengan:
- Resource limits untuk Synology
- Health checks
- Logging configuration
- Security settings

## Catatan

Error ini terjadi karena Next.js 14 melakukan static generation secara agresif, dan beberapa component menggunakan Context API yang membutuhkan runtime.

Development mode tidak melakukan static generation, jadi tidak ada masalah.

Production build mencoba pre-render semua pages, yang menyebabkan error pada component yang butuh runtime context.

Solusi terbaik untuk production adalah:
1. Gunakan Docker (recommended)
2. Atau deploy ke Vercel/Netlify yang handle edge cases ini dengan baik
3. Atau fix manual dengan menambahkan `export const dynamic = 'force-dynamic'` di semua pages
