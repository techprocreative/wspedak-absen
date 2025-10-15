# 🔄 Logger Migration Guide

Quick guide for replacing console statements with the new production-grade logger.

---

## 📖 Quick Reference

### Import the Logger
```typescript
import { logger } from '@/lib/logger';
```

### Basic Usage

#### Before → After

**Info/Debug Messages:**
```typescript
// Before
console.log('User logged in:', userId);
console.log('Processing data', { count: 10, type: 'users' });

// After
logger.info('User logged in', { userId });
logger.info('Processing data', { count: 10, type: 'users' });
```

**Errors:**
```typescript
// Before
console.error('Database error:', error);
console.error('Failed to fetch users');

// After
logger.error('Database error', error);
logger.error('Failed to fetch users');
```

**Warnings:**
```typescript
// Before
console.warn('Deprecated API used');

// After
logger.warn('Deprecated API used');
```

**Debug Messages:**
```typescript
// Before
console.debug('Cache hit for key:', key);

// After
logger.debug('Cache hit for key', { key });
```

---

## 🎯 Common Patterns

### API Routes

**Before:**
```typescript
export async function GET(request: NextRequest) {
  console.log('Fetching users');
  try {
    const users = await db.getUsers();
    console.log('Found users:', users.length);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { logger, logApiRequest, logApiError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  logger.debug('Fetching users');
  try {
    const users = await db.getUsers();
    logger.info('Users fetched', { count: users.length });
    logApiRequest('GET', '/api/users', 200);
    return NextResponse.json({ users });
  } catch (error) {
    logApiError('GET', '/api/users', error as Error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Authentication

**Before:**
```typescript
async function handleLogin(email: string, password: string) {
  console.log('Login attempt:', email);
  const user = await authenticate(email, password);
  if (user) {
    console.log('Login successful:', user.id);
    return user;
  }
  console.error('Login failed');
  throw new Error('Invalid credentials');
}
```

**After:**
```typescript
import { logger, logAuthEvent } from '@/lib/logger';

async function handleLogin(email: string, password: string) {
  logger.info('Login attempt', { email });
  try {
    const user = await authenticate(email, password);
    logAuthEvent('login', user.id, true);
    return user;
  } catch (error) {
    logAuthEvent('login', email, false);
    throw new Error('Invalid credentials');
  }
}
```

### Database Operations

**Before:**
```typescript
async function fetchData(query: string) {
  console.log('Running query:', query);
  const start = Date.now();
  const result = await db.query(query);
  console.log(`Query completed in ${Date.now() - start}ms`);
  return result;
}
```

**After:**
```typescript
import { logger, logDatabaseQuery } from '@/lib/logger';

async function fetchData(query: string) {
  const start = Date.now();
  try {
    const result = await db.query(query);
    const duration = Date.now() - start;
    logDatabaseQuery(query, duration);
    return result;
  } catch (error) {
    logger.error('Query failed', error as Error, { query });
    throw error;
  }
}
```

### Component Lifecycle

**Before:**
```typescript
useEffect(() => {
  console.log('Component mounted');
  fetchData();
  return () => console.log('Component unmounted');
}, []);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

useEffect(() => {
  logger.debug('Component mounted', { component: 'UserList' });
  fetchData();
  return () => logger.debug('Component unmounted', { component: 'UserList' });
}, []);
```

---

## 🔍 Special Cases

### Keep Some Console Statements

These are allowed in production:
```typescript
// Critical errors (allowed)
console.error('Critical system failure', error);

// Important warnings (allowed)
console.warn('Deprecated feature used');

// Remove these (not allowed)
console.log('Debug info');      // ❌ Replace with logger.debug()
console.info('Info message');   // ❌ Replace with logger.info()
console.debug('Debug message'); // ❌ Replace with logger.debug()
```

### Complex Objects

**Before:**
```typescript
console.log('User data:', user, 'Settings:', settings, 'Timestamp:', Date.now());
```

**After:**
```typescript
logger.info('User data loaded', {
  user: {
    id: user.id,
    email: user.email,
    // Don't log sensitive data like passwords
  },
  settings,
  timestamp: Date.now(),
});
```

### Performance Monitoring

**Before:**
```typescript
console.time('operation');
await expensiveOperation();
console.timeEnd('operation');
```

**After:**
```typescript
const start = Date.now();
await expensiveOperation();
const duration = Date.now() - start;
logger.info('Operation completed', { operation: 'expensive', duration });
```

---

## 🚀 Bulk Migration Strategy

### 1. Find All Console Statements
```bash
npm run check:console
```

### 2. Prioritize by Criticality
1. **High Priority:** API routes, authentication, database
2. **Medium Priority:** Business logic, services
3. **Low Priority:** UI components, dev utilities

### 3. Replace in Batches
```bash
# Example: Replace in one directory at a time
# api/auth/* first
# Then api/admin/*
# Then components/*
```

### 4. Test After Each Batch
```bash
npm run build
npm test
```

### 5. Verify No Console Statements
```bash
npm run check:console
```

---

## 🛠️ VS Code Snippets

Add these to `.vscode/typescript.json`:

```json
{
  "Logger Info": {
    "prefix": "loginfo",
    "body": [
      "logger.info('$1', { $2 });"
    ]
  },
  "Logger Error": {
    "prefix": "logerror",
    "body": [
      "logger.error('$1', error, { $2 });"
    ]
  },
  "Logger Debug": {
    "prefix": "logdebug",
    "body": [
      "logger.debug('$1', { $2 });"
    ]
  },
  "API Request Log": {
    "prefix": "logapi",
    "body": [
      "logApiRequest('$1', '$2', $3);"
    ]
  }
}
```

---

## 📊 Progress Tracking

Create a checklist:

```markdown
- [ ] API Routes (50 files)
  - [ ] /api/admin/* (20 files)
  - [ ] /api/auth/* (5 files)
  - [ ] /api/attendance/* (10 files)
  - [ ] Other API routes (15 files)
- [ ] Library Functions (50 files)
  - [ ] lib/auth.ts
  - [ ] lib/db.ts
  - [ ] lib/supabase-db.ts
  - [ ] Other lib files (47 files)
- [ ] Components (50 files)
- [ ] Scripts (15 files)
- [ ] Other (10 files)
```

---

## ✅ Verification

After migration, run:

```bash
# Should return 0 console statements
npm run check:console

# Build should succeed
npm run build

# All tests should pass
npm test
```

---

## 💡 Tips

1. **Use meaningful messages:** Describe what happened, not how
   ```typescript
   // Good
   logger.info('User authentication successful', { userId, method: 'email' });
   
   // Bad
   logger.info('Authenticated', { userId });
   ```

2. **Include context:** Add relevant data to understand the log
   ```typescript
   logger.error('Payment failed', error, {
     userId,
     amount,
     currency,
     paymentMethod,
   });
   ```

3. **Use appropriate levels:**
   - `debug` - Development details
   - `info` - General information
   - `warn` - Warning conditions
   - `error` - Error conditions

4. **Don't log sensitive data:**
   ```typescript
   // ❌ Bad
   logger.info('Login', { email, password });
   
   // ✅ Good
   logger.info('Login attempt', { email });
   ```

---

## 🔗 Related Files

- `lib/logger.ts` - Logger implementation
- `scripts/check-console-logs.js` - Detection script
- `.eslintrc.json` - ESLint rules
- `SECURITY_FIXES.md` - Security improvements

---

**Happy logging!** 🎉
