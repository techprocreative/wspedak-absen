// Minimal checker: pings admin pages and reports status.
// Usage:
//   BASE_URL=http://localhost:3000 node scripts/check-admin-pages.mjs
//   AUTH_COOKIE='auth_session={...}' node scripts/check-admin-pages.mjs
//   Or provide AUTH_SESSION_JSON='{...}' and the script will build Cookie header.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const AUTH_COOKIE = process.env.AUTH_COOKIE || null
const AUTH_SESSION_JSON = process.env.AUTH_SESSION_JSON || null

const COOKIE = AUTH_COOKIE
  ? AUTH_COOKIE
  : AUTH_SESSION_JSON
    ? `auth_session=${AUTH_SESSION_JSON}`
    : null

const paths = [
  '/admin',
  '/admin/dashboard',
  '/admin/employees',
  '/admin/attendance',
  '/admin/schedules',
  '/admin/settings',
  '/admin/data-management',
  '/admin/data-management/import',
  '/admin/data-management/export',
  '/admin/data-management/backup',
  '/admin/analytics',
  '/admin/alerts',
  '/admin/monitoring',
  '/admin/reports',
]

const fetchOpts = {
  redirect: 'manual',
  headers: COOKIE ? { Cookie: COOKIE } : {},
}

const main = async () => {
  const results = []
  for (const p of paths) {
    const url = BASE_URL.replace(/\/$/, '') + p
    try {
      const res = await fetch(url, fetchOpts)
      const status = res.status
      const location = res.headers.get('location') || ''

      // Pass conditions:
      // - If authenticated (cookie provided): expect 200
      // - If unauthenticated: allow 302/307 redirect to /admin/login
      const isAuthed = !!COOKIE
      const ok = isAuthed
        ? status === 200
        : status === 200 || ((status === 302 || status === 307) && location.includes('/admin/login'))

      results.push({ path: p, status, location, ok })
    } catch (err) {
      results.push({ path: p, status: 'ERR', location: '', ok: false, error: String(err) })
    }
  }

  const failed = results.filter(r => !r.ok)
  for (const r of results) {
    const marker = r.ok ? 'OK ' : 'FAIL'
    const extra = r.location ? ` -> ${r.location}` : ''
    console.log(`${marker}  ${r.status}  ${r.path}${extra}`)
  }

  if (failed.length) {
    process.exitCode = 1
  }
}

main()

