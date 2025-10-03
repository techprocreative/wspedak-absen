# Testing Framework Documentation

This document provides comprehensive information about the testing framework implemented for the attendance system.

## Table of Contents

1. [Overview](#overview)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [E2E Tests](#e2e-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [Accessibility Tests](#accessibility-tests)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

The attendance system uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test how different parts of the system work together
- **E2E Tests**: Test complete user workflows from start to finish
- **Performance Tests**: Test system performance under load
- **Security Tests**: Test for security vulnerabilities
- **Accessibility Tests**: Test for WCAG compliance

## Testing Infrastructure

### Dependencies

The following testing dependencies are included in `package.json`:

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.5",
    "@playwright/test": "^1.40.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "msw": "^1.3.0",
    "supertest": "^6.3.3"
  }
}
```

### Configuration

- **Jest Configuration**: `jest.config.js`
- **Playwright Configuration**: `playwright.config.ts`
- **Test Setup**: `jest.setup.js`
- **Polyfills**: `jest.polyfills.js`

### Mocks and Utilities

- **Test Utils**: `__tests__/utils/test-utils.tsx`
- **Supabase Mocks**: `__tests__/mocks/supabase.mock.ts`
- **IndexedDB Mocks**: `__tests__/mocks/indexeddb.mock.ts`
- **MSW Handlers**: `__mocks__/handlers.js`

## Unit Tests

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Structure

Unit tests are organized in the `__tests__` directory:

```
__tests__/
├── lib/                    # Library function tests
│   ├── storage.test.ts
│   ├── sync-manager.test.ts
│   └── supabase.test.ts
├── components/             # Component tests
│   ├── auth/
│   ├── attendance/
│   └── face-recognition/
├── hooks/                  # Hook tests
│   ├── use-storage.test.ts
│   └── use-sync.test.ts
├── utils/                  # Test utilities
│   └── test-utils.tsx
└── mocks/                  # Mock implementations
    ├── supabase.mock.ts
    └── indexeddb.mock.ts
```

### Example Unit Test

```typescript
import { StorageService } from '@/lib/storage'

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = new StorageService()
  })

  it('should cache data with TTL', async () => {
    const mockData = [{ id: '1', name: 'Test' }]
    const result = await storageService.getAttendanceRecords()
    expect(result).toEqual(mockData)
  })
})
```

## Integration Tests

### Running Integration Tests

Integration tests are included in the unit test suite and can be run with the same commands.

### API Route Tests

```typescript
import request from 'supertest'
import { app } from '@/app'

describe('/api/health', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)
    
    expect(response.body).toHaveProperty('status', 'healthy')
  })
})
```

### Component Integration Tests

```typescript
import { render, screen } from '@/test-utils'
import { AttendanceRecorder } from '@/components/attendance/AttendanceRecorder'

describe('AttendanceRecorder Integration', () => {
  it('should record attendance successfully', async () => {
    render(<AttendanceRecorder />)
    
    const recordButton = screen.getByTestId('record-attendance')
    await userEvent.click(recordButton)
    
    expect(screen.getByTestId('success-message')).toBeInTheDocument()
  })
})
```

## E2E Tests

### Running E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific browser tests
npx playwright test --project=chromium
```

### Structure

E2E tests are organized in the `e2e` directory:

```
e2e/
├── auth.spec.ts            # Authentication flows
├── attendance.spec.ts      # Attendance recording flows
├── offline.spec.ts         # Offline functionality
├── sync.spec.ts           # Data synchronization
├── face-recognition.spec.ts # Face recognition flows
├── global-setup.ts        # Global test setup
└── global-teardown.ts     # Global test cleanup
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test'

test('should record attendance successfully', async ({ page }) => {
  // Login
  await page.goto('/')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')
  
  // Record attendance
  await page.click('[data-testid="record-attendance"]')
  
  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

## Performance Tests

### Running Performance Tests

```bash
# Run performance tests
npm run test:performance

# Run with custom configuration
TEST_URL=https://your-app.com node scripts/performance-test.js
```

### Configuration

Performance tests can be configured in `scripts/performance-test.js`:

```javascript
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  concurrentUsers: 10,
  requestsPerUser: 50,
  testDuration: 30000, // 30 seconds
  endpoints: [
    '/api/health',
    '/api/metrics',
    '/api/attendance/stats',
  ],
}
```

### Metrics

Performance tests measure:

- Response times (average, median, 95th percentile, 99th percentile)
- Requests per second
- Error rates
- Throughput

## Security Tests

### Running Security Tests

```bash
# Run security audit
npm audit

# Run security tests
npm run test:security
```

### Security Test Coverage

- Dependency vulnerability scanning
- Authentication bypass testing
- Input validation testing
- XSS prevention testing
- CSRF protection testing

## Accessibility Tests

### Running Accessibility Tests

```bash
# Install axe CLI
npm install -g @axe-core/cli

# Run accessibility tests
axe http://localhost:3000 --tags wcag2a,wcag2aa
```

### Accessibility Test Coverage

- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation
- Color contrast
- Focus management

## CI/CD Integration

### GitHub Actions Workflow

The testing framework is integrated with GitHub Actions in `.github/workflows/test.yml`:

- **Unit Tests**: Run on all pull requests and pushes
- **E2E Tests**: Run on all pull requests and pushes
- **Performance Tests**: Run on main branch pushes
- **Security Tests**: Run on all pull requests and pushes
- **Accessibility Tests**: Run on all pull requests and pushes

### Test Results

- **Coverage Reports**: Uploaded to Codecov
- **Test Artifacts**: Stored in GitHub Actions
- **Performance Reports**: Stored as artifacts
- **Security Reports**: Stored as artifacts

## Best Practices

### Writing Tests

1. **Arrange, Act, Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **One Assertion Per Test**: Focus on one behavior per test
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Test both happy path and error scenarios

### Test Data

1. **Factory Pattern**: Use factories for creating test data
2. **Consistent Data**: Use consistent test data across tests
3. **Cleanup**: Clean up test data after each test
4. **Isolation**: Ensure tests don't depend on each other

### Performance

1. **Parallel Execution**: Run tests in parallel when possible
2. **Selective Testing**: Run only relevant tests during development
3. **Mock Heavy Operations**: Mock expensive operations
4. **Test Environment**: Use dedicated test environment

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values or optimize test performance
2. **Mock Failures**: Verify mock implementations and configurations
3. **Environment Issues**: Ensure test environment is properly set up
4. **Dependency Conflicts**: Resolve version conflicts between dependencies

### Debugging

1. **Console Logging**: Use console.log for debugging test issues
2. **Test Debuggers**: Use Jest or Playwright debuggers
3. **Test Reports**: Review detailed test reports
4. **Screenshots**: Use screenshots for E2E test failures

### Performance Issues

1. **Test Optimization**: Optimize slow-running tests
2. **Resource Management**: Properly manage test resources
3. **Parallel Execution**: Use parallel test execution
4. **Test Isolation**: Ensure proper test isolation

## Coverage Requirements

The testing framework enforces the following coverage requirements:

- **Branch Coverage**: 70%
- **Function Coverage**: 70%
- **Line Coverage**: 70%
- **Statement Coverage**: 70%

## Test Data Management

### Test Databases

- Use separate test databases
- Reset databases between test runs
- Use transactions for test isolation

### Mock Data

- Store mock data in dedicated files
- Use consistent mock data across tests
- Version control mock data

## Continuous Improvement

### Test Metrics

- Track test execution time
- Monitor test failure rates
- Measure code coverage trends
- Analyze test effectiveness

### Test Maintenance

- Regular test reviews
- Update tests for new features
- Remove obsolete tests
- Refactor test code

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [Accessibility Testing](https://www.deque.com/axe/)