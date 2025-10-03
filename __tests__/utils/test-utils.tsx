import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ConflictResolutionProvider } from '@/components/conflict-resolution/ConflictResolutionProvider'
import { ThemeProvider } from '@/components/theme-provider'

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Test providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ConflictResolutionProvider>
            {children}
          </ConflictResolutionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AllTheProviders>
        {children}
      </AllTheProviders>
    ),
    ...options,
  })
}

// Mock data factories
export const createMockUser = (overrides: Record<string, any> = {}) => ({
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'employee',
  department: 'Engineering',
  photo: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockAttendanceRecord = (overrides: Record<string, any> = {}) => ({
  id: 'test-attendance-id',
  userId: 'test-user-id',
  timestamp: new Date(),
  type: 'check_in',
  location: 'Office',
  photo: null,
  synced: false,
  ...overrides,
})

export const createMockSyncConflict = (overrides: Record<string, any> = {}) => ({
  id: 'test-conflict-id',
  type: 'attendance',
  localData: createMockAttendanceRecord(),
  remoteData: createMockAttendanceRecord({
    id: 'remote-attendance-id',
    timestamp: new Date(Date.now() + 1000),
  }),
  resolution: undefined,
  resolvedAt: undefined,
  ...overrides,
})

export const createMockAuthState = (overrides: Record<string, any> = {}) => ({
  user: createMockUser(),
  session: {
    access_token: 'test-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    user: createMockUser(),
  },
  isLoading: false,
  error: null,
  ...overrides,
})

// Test helpers
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0))

export const mockNetworkOnline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  })
  window.dispatchEvent(new Event('online'))
}

export const mockNetworkOffline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  })
  window.dispatchEvent(new Event('offline'))
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }