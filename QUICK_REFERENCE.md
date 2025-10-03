# ⚡ Quick Reference Guide

**For developers who want answers fast.**

---

## 🚀 Essential Commands

### Development
\`\`\`bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run linter
npm test             # Run tests
\`\`\`

### Database
\`\`\`bash
npx supabase db push              # Push schema to database
node scripts/seed-database.js     # Seed test data
\`\`\`

### Testing
\`\`\`bash
npm test                          # Unit tests
npx playwright test               # E2E tests
npx playwright test --ui          # E2E with UI
\`\`\`

### Deployment
\`\`\`bash
./scripts/deploy.sh               # Automated deployment
vercel --prod                     # Deploy to Vercel
./scripts/health-check.sh <URL>   # Health check
./scripts/rollback.sh             # Emergency rollback
\`\`\`

---

## 📂 Key Files

### Configuration
\`\`\`
.env.local                        # Environment variables (create from .env.example)
next.config.mjs                   # Next.js configuration
tsconfig.json                     # TypeScript configuration
supabase/migrations/              # Database migrations
\`\`\`

### Core Modules
\`\`\`
lib/supabase-db.ts               # Database manager (850 lines)
lib/face-matching.ts             # Face recognition engine
lib/report-generator.ts          # Report generation
lib/api-client.ts                # API client utility
lib/server-db.ts                 # Server-side DB utilities
\`\`\`

### API Routes
\`\`\`
app/api/auth/login/              # Authentication
app/api/admin/dashboard/stats/   # Dashboard stats
app/api/admin/employees/         # Employee CRUD
app/api/attendance/face-checkin/ # Face check-in
app/api/admin/reports/generate/  # Report generation
\`\`\`

---

## 🔑 Test Credentials

\`\`\`
Admin:    admin@test.com    / admin123
HR:       hr@test.com       / admin123
Manager:  manager@test.com  / admin123
Employee: employee@test.com / admin123
\`\`\`

---

## 🌐 Important URLs

\`\`\`
Homepage:          http://localhost:3000
Admin Login:       http://localhost:3000/admin/login
Dashboard:         http://localhost:3000/admin/dashboard
Employees:         http://localhost:3000/admin/employees
Attendance:        http://localhost:3000/admin/attendance
Face Check-in:     http://localhost:3000/face-checkin
Reports:           http://localhost:3000/admin/reports/generate
\`\`\`

---

## 🔧 Environment Variables

\`\`\`env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
JWT_SECRET=your-32-char-secret

# Optional
NEXT_PUBLIC_APP_NAME="Attendance System"
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

---

## 📊 Database Tables

\`\`\`
users              # Employee accounts
attendance         # Check-in/out records
face_embeddings    # Face data (128D vectors)
schedules          # Work schedules
user_schedules     # Schedule assignments
notifications      # System notifications
audit_logs         # Activity tracking
reports            # Report metadata
settings           # System config
\`\`\`

---

## 🐛 Quick Fixes

### "Cannot connect to database"
\`\`\`bash
# Check environment variables
cat .env.local

# Test connection
npx supabase db ping
\`\`\`

### "Face models not found"
\`\`\`bash
# Download models
./scripts/download-face-models.sh

# Verify
ls -la public/models/
\`\`\`

### "Build warnings"
\`\`\`
These are expected prerendering warnings.
Build still succeeds. Pages render dynamically.
\`\`\`

### "Camera not working"
\`\`\`
Grant camera permissions in browser settings.
HTTPS required in production.
\`\`\`

---

## 📚 Documentation Quick Links

- **Setup**: [START_HERE.md](./START_HERE.md)
- **Overview**: [README.md](./README.md)
- **Status**: [STATUS.md](./STATUS.md)
- **Deploy**: [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)
- **Security**: [SECURITY.md](./SECURITY.md)
- **Testing**: [TESTING.md](./TESTING.md)
- **Navigation**: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

---

## 🎯 Common Tasks

### Add New Employee
\`\`\`bash
# Via UI: Dashboard → Employees → Add Employee
# Via API: POST /api/admin/employees
\`\`\`

### Enroll Face
\`\`\`bash
# Via UI: Employee row → "Enroll Face" button
# Opens camera modal, detects face, saves 128D descriptor
\`\`\`

### Check-in with Face
\`\`\`bash
# Via UI: /face-checkin page
# Camera detects face → matches → creates attendance record
\`\`\`

### Generate Report
\`\`\`bash
# Via UI: Reports → Generate → Select dates & format
# Downloads PDF/Excel/CSV/JSON
\`\`\`

---

## 🔐 Security Checklist

- [x] JWT authentication
- [x] RBAC (4 roles)
- [x] Row-level security
- [x] Password hashing (bcrypt)
- [x] Audit logging
- [x] Input validation
- [x] SQL injection prevention
- [x] CORS configuration

---

## 📈 Performance Tips

### Database
- Use indexes (already optimized)
- Enable connection pooling
- Use read replicas for reports

### Frontend
- Images optimized with Next.js Image
- Code splitting automatic
- Face recognition client-side

### API
- Serverless (auto-scales)
- Response caching ready
- Rate limiting ready

---

## 🆘 Need Help?

1. Check [README.md](./README.md) troubleshooting
2. Review [STATUS.md](./STATUS.md) known issues
3. Search [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
4. Check archived docs in \`docs/archive/\`
5. Open GitHub issue

---

**Last Updated**: December 2024  
**Version**: 1.0.0
