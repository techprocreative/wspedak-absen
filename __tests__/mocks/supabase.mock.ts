// Jest globals are available in test environment

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
      remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
  realtime: {
    subscribe: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  },
  removeChannel: jest.fn(),
  removeAllChannels: jest.fn(),
}

// Mock Supabase service
export const mockSupabaseService = {
  getClient: jest.fn(() => mockSupabaseClient),
  getNetworkStatus: jest.fn(() => ({ isOnline: true })),
  getAuthState: jest.fn(() => ({
    user: null,
    session: null,
    isLoading: false,
    error: null,
  })),
  isOnline: jest.fn(() => true),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  executeWithRetry: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  unsubscribeAll: jest.fn(),
  destroy: jest.fn(),
}

// Mock data
export const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'employee',
    department: 'Engineering',
    photo: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin',
    department: 'HR',
    photo: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

export const mockAttendanceRecords = [
  {
    id: '1',
    user_id: '1',
    timestamp: '2023-10-01T09:00:00Z',
    type: 'check_in',
    location: 'Office',
    photo: null,
    synced: true,
    created_at: '2023-10-01T09:00:00Z',
    updated_at: '2023-10-01T09:00:00Z',
  },
  {
    id: '2',
    user_id: '1',
    timestamp: '2023-10-01T17:00:00Z',
    type: 'check_out',
    location: 'Office',
    photo: null,
    synced: true,
    created_at: '2023-10-01T17:00:00Z',
    updated_at: '2023-10-01T17:00:00Z',
  },
]

// Helper functions to setup mock responses
export const setupMockAuthSuccess = () => {
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
    data: {
      user: mockUsers[0],
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: mockUsers[0],
      },
    },
    error: null,
  })

  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: mockUsers[0],
      },
    },
    error: null,
  })

  mockSupabaseService.getAuthState.mockReturnValue({
    user: mockUsers[0],
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      user: mockUsers[0],
    },
    isLoading: false,
    error: null,
  })
}

export const setupMockAuthError = () => {
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
    data: null,
    error: { message: 'Invalid credentials' },
  })

  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })

  mockSupabaseService.getAuthState.mockReturnValue({
    user: null,
    session: null,
    isLoading: false,
    error: { message: 'Invalid credentials' },
  })
}

export const setupMockDatabaseSuccess = () => {
  const mockQueryBuilder = {
    select: jest.fn(() => mockQueryBuilder),
    eq: jest.fn(() => mockQueryBuilder),
    single: jest.fn(() => Promise.resolve({ data: mockUsers[0], error: null })),
    order: jest.fn(() => mockQueryBuilder),
    limit: jest.fn(() => Promise.resolve({ data: mockUsers, error: null })),
    in: jest.fn(() => Promise.resolve({ data: mockUsers, error: null })),
    gte: jest.fn(() => mockQueryBuilder),
    lte: jest.fn(() => Promise.resolve({ data: mockAttendanceRecords, error: null })),
    insert: jest.fn(() => Promise.resolve({ data: mockUsers[0], error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: mockUsers[0], error: null })),
    update: jest.fn(() => mockQueryBuilder),
    delete: jest.fn(() => mockQueryBuilder),
  }

  mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)
}

export const setupMockDatabaseError = () => {
  const mockQueryBuilder = {
    select: jest.fn(() => mockQueryBuilder),
    eq: jest.fn(() => mockQueryBuilder),
    single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
    order: jest.fn(() => mockQueryBuilder),
    limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } })),
    in: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } })),
    gte: jest.fn(() => mockQueryBuilder),
    lte: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Insert error' } })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Upsert error' } })),
    update: jest.fn(() => mockQueryBuilder),
    delete: jest.fn(() => mockQueryBuilder),
  }

  mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)
}