# Developer Guide

This comprehensive guide is designed for developers working on the Attendance System, covering architecture, development workflow, coding standards, and best practices.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Development Environment Setup](#development-environment-setup)
4. [Development Workflow](#development-workflow)
5. [Code Structure](#code-structure)
6. [Coding Standards](#coding-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Performance Optimization](#performance-optimization)
9. [Debugging Guide](#debugging-guide)
10. [Contribution Process](#contribution-process)

## Project Overview

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Form Handling**: React Hook Form with Zod validation

#### Backend
- **Runtime**: Node.js 18+
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Supabase Auth
- **API**: Next.js API Routes
- **File Storage**: Supabase Storage

#### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Testing**: Jest with React Testing Library
- **E2E Testing**: Playwright
- **Build Tool**: Next.js built-in bundler

#### Deployment
- **Containerization**: Docker with Docker Compose
- **Platform**: Supports Docker, Synology NAS, and cloud platforms
- **CI/CD**: GitHub Actions (optional)

### Key Features

1. **Offline-First Architecture**: Full functionality without internet connection
2. **Face Recognition**: Client-side facial recognition for attendance
3. **Real-time Synchronization**: Automatic sync with Supabase
4. **Progressive Web App**: Installable PWA with native-like experience
5. **Conflict Resolution**: Intelligent handling of data conflicts
6. **Performance Optimization**: Adaptive quality based on device capabilities

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Pages         │  │   API Routes    │  │   Middleware    │  │
│  │   (SSR/CSR)     │  │   (Backend)     │  │   (Auth/Valid)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Components    │  │   Hooks         │  │   Utilities     │  │
│  │   (UI/Logic)    │  │   (State)       │  │   (Helpers)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Service       │  │   IndexedDB     │  │   Cache API     │  │
│  │   Worker        │  │   (Local Data)  │  │   (Assets)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Supabase      │  │   Sync Manager  │  │   Conflict      │  │
│  │   (Cloud DB)    │  │   (Offline)     │  │   Resolver      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│   Component     │───▶│   Hook/State    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Update     │◀───│   Re-render     │◀───│   State Change  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Store   │───▶│   Sync Queue    │───▶│   Supabase      │
│   (IndexedDB)   │    │   (Background)  │    │   (Cloud)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Layout                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Header        │  │   Sidebar       │  │   Main Content  │  │
│  │   (Navigation)  │  │   (Menu)        │  │   (Pages)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Provider      │  │   Modals        │  │   Notifications │  │
│  │   (Context)     │  │   (Overlays)    │  │   (Toasts)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Development Environment Setup

### Prerequisites

- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Git**: 2.x or later
- **VS Code**: Recommended IDE with extensions

### IDE Setup

#### VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Project Setup

#### 1. Clone Repository

```bash
git clone https://github.com/your-username/attendance-system.git
cd attendance-system
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Configuration

```bash
# Copy environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

#### 4. Database Setup

```bash
# Install Supabase CLI (optional)
npm install -g supabase

# Start local Supabase (optional)
supabase start
```

#### 5. Start Development Server

```bash
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "db:reset": "supabase db reset",
    "db:push": "supabase db push",
    "db:diff": "supabase db diff"
  }
}
```

## Development Workflow

### Git Workflow

#### Branch Strategy

```
main (production)
├── develop (staging)
│   ├── feature/face-recognition
│   ├── feature/offline-sync
│   └── feature/user-management
├── release/v1.0.0
└── hotfix/critical-bug-fix
```

#### Branch Naming Conventions

- `feature/feature-name`: New features
- `bugfix/bug-description`: Bug fixes
- `hotfix/critical-fix`: Critical production fixes
- `release/version-number`: Release preparation
- `docs/documentation-updates`: Documentation changes

#### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add two-factor authentication

Implement TOTP-based two-factor authentication
for enhanced security.

Closes #123
```

### Development Process

#### 1. Create Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

#### 2. Development

```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

#### 3. Code Quality Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Tests
npm run test
npm run test:e2e
```

#### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat(component): add new attendance feature"

# Push to remote
git push origin feature/your-feature-name
```

#### 5. Create Pull Request

1. **Create PR** from feature branch to `develop`
2. **Fill PR template** with description
3. **Request reviews** from team members
4. **Address feedback** and update PR
5. **Merge PR** after approval

#### 6. Release Process

```bash
# Merge develop to main
git checkout main
git merge develop

# Create release tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push to remote
git push origin main --tags
```

### Code Review Guidelines

#### Review Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No sensitive data is exposed
- [ ] Performance is considered
- [ ] Security is reviewed
- [ ] Accessibility is maintained

#### Review Process

1. **Self-review** before creating PR
2. **Peer review** from at least one team member
3. **Lead review** for significant changes
4. **Approval** required before merge
5. **Feedback** should be constructive and specific

## Code Structure

### Directory Structure

```
attendance-system/
├── public/                     # Static assets
│   ├── icons/                 # PWA icons
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── src/                       # Source code
│   ├── app/                   # Next.js app directory
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── attendance/        # Attendance components
│   │   ├── auth/              # Authentication components
│   │   └── face-recognition/  # Face recognition components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── api/               # API utilities
│   │   ├── db/                # Database utilities
│   │   ├── auth/              # Authentication utilities
│   │   └── utils/             # General utilities
│   ├── types/                 # TypeScript type definitions
│   └── styles/                # Style files
├── __tests__/                 # Test files
│   ├── components/            # Component tests
│   ├── hooks/                 # Hook tests
│   ├── lib/                   # Library tests
│   └── e2e/                   # End-to-end tests
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
├── config/                    # Configuration files
└── .env.example               # Environment template
```

### Component Structure

#### Component Template

```typescript
// components/example/ExampleComponent.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExampleComponentProps {
  title: string;
  onAction?: () => void;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  onAction,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onAction?.();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleClick} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Action'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExampleComponent;
```

#### Component Index

```typescript
// components/example/index.ts
export { ExampleComponent } from './ExampleComponent';
export type { ExampleComponentProps } from './ExampleComponent';
```

### Hook Structure

#### Hook Template

```typescript
// hooks/use-example.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

interface UseExampleOptions {
  autoFetch?: boolean;
}

interface UseExampleReturn {
  data: any;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useExample = (options: UseExampleOptions = {}): UseExampleReturn => {
  const { autoFetch = true } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.get('/example');
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};
```

### API Structure

#### API Client

```typescript
// lib/api/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const apiClient = {
  get: async (url: string, options?: RequestInit) => {
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      ...options,
    });
    return response.json();
  },
  
  post: async (url: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return response.json();
  },
  
  put: async (url: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return response.json();
  },
  
  delete: async (url: string, options?: RequestInit) => {
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
      ...options,
    });
    return response.json();
  },
};
```

#### API Route Template

```typescript
// pages/api/example.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth/middleware';
import { validateRequest } from '@/lib/validation/middleware';
import { exampleSchema } from '@/lib/validation/schemas';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch data
    const data = await fetchData();
    
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('GET error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch data',
      },
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create data
    const data = await createData(req.body);
    
    return res.status(201).json({
      success: true,
      data,
      message: 'Created successfully',
    });
  } catch (error) {
    console.error('POST error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create data',
      },
    });
  }
}

// Export with middleware
export default withAuth(validateRequest(handler, exampleSchema));
```

## Coding Standards

### TypeScript Guidelines

#### Type Definitions

```typescript
// types/attendance.ts
export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late';
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceFilters {
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceRecord['status'];
}

export type AttendanceStatus = AttendanceRecord['status'];
```

#### Generic Types

```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### React Guidelines

#### Component Patterns

```typescript
// Prefer functional components with hooks
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState(initialState);
  const { data, isLoading } = useCustomHook();
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Handle click
  }, []);
  
  // Effects
  useEffect(() => {
    // Side effect
  }, [dependency]);
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

#### Props Interface

```typescript
interface ComponentProps {
  // Required props first
  requiredProp: string;
  
  // Optional props with defaults
  optionalProp?: number;
  
  // Event handlers
  onClick?: (event: React.MouseEvent) => void;
  
  // Children
  children?: React.ReactNode;
}
```

### CSS/Styling Guidelines

#### Tailwind CSS Patterns

```typescript
// Use utility classes for styling
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>

// For complex components, use CSS-in-JS with styled-components
const StyledCard = styled.div`
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;
```

#### Responsive Design

```typescript
// Use responsive prefixes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>

// Use responsive utilities
<div className="hidden sm:block">
  {/* Content visible on small screens and up */}
</div>
```

### File Naming Conventions

#### Components
- `PascalCase.tsx` for component files
- `PascalCase.test.tsx` for test files
- `PascalCase.stories.tsx` for Storybook files

#### Utilities
- `kebab-case.ts` for utility files
- `kebab-case.test.ts` for test files

#### Hooks
- `useCamelCase.ts` for custom hooks
- `useCamelCase.test.ts` for test files

### Import/Export Guidelines

#### Import Order

```typescript
// 1. React and Next.js
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';

// 2. Third-party libraries
import { Button } from '@/components/ui/button';
import { z } from 'zod';

// 3. Internal modules (absolute imports)
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api/client';

// 4. Relative imports
import { ChildComponent } from './ChildComponent';
import { LocalType } from './types';
```

#### Export Patterns

```typescript
// Named exports for utilities
export const utilityFunction = () => {
  // Implementation
};

export type UtilityType = {
  // Type definition
};

// Default export for main component
const Component: React.FC = () => {
  // Implementation
};

export default Component;

// Re-exports in index files
export { Component } from './Component';
export type { ComponentProps } from './Component';
```

## Testing Guidelines

### Unit Testing

#### Component Testing

```typescript
// __tests__/components/ExampleComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExampleComponent } from '@/components/example/ExampleComponent';

// Mock external dependencies
jest.mock('@/hooks/use-example', () => ({
  useExample: () => ({
    data: { id: '1', name: 'Test' },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('ExampleComponent', () => {
  const defaultProps = {
    title: 'Test Title',
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with props', () => {
    render(<ExampleComponent {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', async () => {
    render(<ExampleComponent {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    
    await waitFor(() => {
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state when isLoading is true', () => {
    jest.mocked(useExample).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ExampleComponent {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

#### Hook Testing

```typescript
// __tests__/hooks/useExample.test.ts
import { renderHook, act } from '@testing-library/react';
import { useExample } from '@/hooks/use-example';

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('useExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches data on mount', async () => {
    const mockData = { id: '1', name: 'Test' };
    jest.mocked(apiClient.get).mockResolvedValue(mockData);

    const { result } = renderHook(() => useExample());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Test error');
    jest.mocked(apiClient.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useExample());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/attendance-flow.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendancePage } from '@/app/attendance/page';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Attendance Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('allows user to check in and out', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AttendancePage />
      </QueryClientProvider>
    );

    // Check initial state
    expect(screen.getByText('Check In')).toBeInTheDocument();

    // Check in
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(screen.getByText('Check Out')).toBeInTheDocument();
    });

    // Check out
    fireEvent.click(screen.getByText('Check Out'));

    await waitFor(() => {
      expect(screen.getByText('Check In')).toBeInTheDocument();
    });
  });
});
```

### End-to-End Testing

```typescript
// e2e/attendance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can check in with face recognition', async ({ page }) => {
    await page.goto('/attendance');
    
    // Click check in with face
    await page.click('[data-testid=check-in-face-button]');
    
    // Mock camera permission
    await page.context().grantPermissions(['camera']);
    
    // Wait for face recognition
    await expect(page.locator('[data-testid=check-in-success]')).toBeVisible();
    
    // Verify attendance record
    await page.goto('/attendance/history');
    await expect(page.locator('[data-testid=attendance-record]')).toHaveCount(1);
  });

  test('user can view attendance history', async ({ page }) => {
    await page.goto('/attendance/history');
    
    // Check if history table is visible
    await expect(page.locator('[data-testid=history-table]')).toBeVisible();
    
    // Filter by date
    await page.fill('[data-testid=start-date]', '2024-01-01');
    await page.fill('[data-testid=end-date]', '2024-01-31');
    await page.click('[data-testid=filter-button]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid=attendance-record]')).toBeVisible();
  });
});
```

### Testing Best Practices

#### Test Structure

```typescript
describe('Component/Feature', () => {
  // Setup
  beforeEach(() => {
    // Common setup
  });

  // Tests
  it('should do X when Y', () => {
    // Arrange
    // Act
    // Assert
  });

  // Cleanup
  afterEach(() => {
    // Common cleanup
  });
});
```

#### Test Naming

- Use descriptive test names
- Follow "should [expected behavior] when [condition]" pattern
- Use `it` for single behavior tests
- Use `describe` for grouping related tests

#### Mocking Guidelines

```typescript
// Mock external dependencies
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock return values
jest.mocked(apiClient.get).mockResolvedValue(mockData);

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for components
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Usage with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <LazyComponent />
</Suspense>
```

### Image Optimization

```typescript
// Next.js Image component
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false} // Load above the fold images first
  placeholder="blur" // Add blur placeholder
/>
```

### Memoization

```typescript
// React.memo for components
const MemoizedComponent = React.memo(({ prop1, prop2 }) => {
  return <div>{prop1} {prop2}</div>;
});

// useMemo for expensive calculations
const ExpensiveComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveCalculation(item));
  }, [data]);

  return <div>{/* Render processed data */}</div>;
};

// useCallback for event handlers
const Component = ({ onClick }) => {
  const handleClick = useCallback((event) => {
    onClick(event.target.value);
  }, [onClick]);

  return <button onClick={handleClick}>Click</button>;
};
```

### Bundle Optimization

```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

## Debugging Guide

### Debugging Tools

#### React DevTools

```typescript
// Add debug information to components
const Component = ({ prop1, prop2 }) => {
  // Debug props
  React.useEffect(() => {
    console.log('Component props:', { prop1, prop2 });
  }, [prop1, prop2]);

  return <div>{/* Component JSX */}</div>;
};
```

#### Redux DevTools (if using Redux)

```typescript
// Store configuration with DevTools
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});
```

#### Performance Profiling

```typescript
// Use React Profiler
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('Component render:', { id, phase, actualDuration });
};

<Profiler id="Component" onRender={onRenderCallback}>
  <Component />
</Profiler>
```

### Common Debugging Scenarios

#### State Issues

```typescript
// Debug state changes
const [state, setState] = useState(initialState);

const updateState = (newState) => {
  console.log('State before:', state);
  console.log('State after:', newState);
  setState(newState);
};
```

#### API Issues

```typescript
// Debug API calls
const fetchData = async () => {
  try {
    console.log('Fetching data...');
    const response = await apiClient.get('/endpoint');
    console.log('API response:', response);
    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};
```

#### Performance Issues

```typescript
// Debug performance with console.time
const expensiveFunction = (data) => {
  console.time('expensiveFunction');
  const result = data.map(item => heavyCalculation(item));
  console.timeEnd('expensiveFunction');
  return result;
};
```

### Browser DevTools

#### Network Tab

```typescript
// Add request logging
const apiClient = {
  get: async (url) => {
    console.log(`GET ${url}`);
    const start = performance.now();
    const response = await fetch(`/api${url}`);
    const end = performance.now();
    console.log(`GET ${url} completed in ${end - start}ms`);
    return response.json();
  },
};
```

#### Console Tab

```typescript
// Add structured logging
const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${message}`, data);
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error);
  },
};
```

## Contribution Process

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** for your changes
4. **Set up your development environment** as described above

### Making Changes

1. **Follow the coding standards** outlined in this guide
2. **Write tests** for new functionality
3. **Update documentation** as needed
4. **Ensure all tests pass** before submitting

### Submitting Changes

1. **Push your changes** to your fork
2. **Create a pull request** to the main repository
3. **Fill out the PR template** with detailed information
4. **Request reviews** from the team
5. **Address feedback** and make necessary changes

### Code Review Process

1. **Self-review** your code before submitting
2. **Peer review** from at least one team member
3. **Address all feedback** before merging
4. **Ensure CI/CD checks** pass
5. **Merge PR** after approval

### Release Process

1. **Update version numbers** in package.json
2. **Update CHANGELOG.md** with new features
3. **Create a release tag** on GitHub
4. **Deploy to staging** for final testing
5. **Deploy to production** after approval

---

## Additional Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools

- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Postman](https://www.postman.com/)

### Community

- [GitHub Discussions](https://github.com/your-username/attendance-system/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/attendance-system)
- [Discord Server](https://discord.gg/your-server)

---

Last updated: January 1, 2024