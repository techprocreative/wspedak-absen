import { rest } from 'msw'

// Mock data
const mockUsers = [
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

const mockAttendanceRecords = [
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

// Supabase auth handlers
export const handlers = [
  // Auth endpoints
  rest.post('https://*/auth/v1/token', (req, res, ctx) => {
    const { email, password } = req.body
    
    if (email === 'john@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          user: mockUsers[0],
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    )
  }),

  rest.post('https://*/auth/v1/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({})
    )
  }),

  rest.get('https://*/auth/v1/user', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization')
    
    if (authHeader === 'Bearer mock-access-token') {
      return res(
        ctx.status(200),
        ctx.json(mockUsers[0])
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Unauthorized' })
    )
  }),

  // Database endpoints
  rest.get('https://*/rest/v1/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockUsers)
    )
  }),

  rest.get('https://*/rest/v1/users/:id', (req, res, ctx) => {
    const { id } = req.params
    const user = mockUsers.find(u => u.id === id)
    
    if (user) {
      return res(
        ctx.status(200),
        ctx.json(user)
      )
    }
    
    return res(
      ctx.status(404),
      ctx.json({ error: 'User not found' })
    )
  }),

  rest.post('https://*/rest/v1/users', (req, res, ctx) => {
    const newUser = {
      id: '3',
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    return res(
      ctx.status(201),
      ctx.json(newUser)
    )
  }),

  rest.put('https://*/rest/v1/users/:id', (req, res, ctx) => {
    const { id } = req.params
    const userIndex = mockUsers.findIndex(u => u.id === id)
    
    if (userIndex !== -1) {
      const updatedUser = {
        ...mockUsers[userIndex],
        ...req.body,
        updated_at: new Date().toISOString(),
      }
      
      return res(
        ctx.status(200),
        ctx.json(updatedUser)
      )
    }
    
    return res(
      ctx.status(404),
      ctx.json({ error: 'User not found' })
    )
  }),

  rest.delete('https://*/rest/v1/users/:id', (req, res, ctx) => {
    return res(
      ctx.status(204)
    )
  }),

  // Attendance endpoints
  rest.get('https://*/rest/v1/attendance', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockAttendanceRecords)
    )
  }),

  rest.get('https://*/rest/v1/attendance/:id', (req, res, ctx) => {
    const { id } = req.params
    const record = mockAttendanceRecords.find(r => r.id === id)
    
    if (record) {
      return res(
        ctx.status(200),
        ctx.json(record)
      )
    }
    
    return res(
      ctx.status(404),
      ctx.json({ error: 'Attendance record not found' })
    )
  }),

  rest.post('https://*/rest/v1/attendance', (req, res, ctx) => {
    const newRecord = {
      id: '3',
      ...req.body,
      synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    return res(
      ctx.status(201),
      ctx.json(newRecord)
    )
  }),

  rest.put('https://*/rest/v1/attendance/:id', (req, res, ctx) => {
    const { id } = req.params
    const recordIndex = mockAttendanceRecords.findIndex(r => r.id === id)
    
    if (recordIndex !== -1) {
      const updatedRecord = {
        ...mockAttendanceRecords[recordIndex],
        ...req.body,
        updated_at: new Date().toISOString(),
      }
      
      return res(
        ctx.status(200),
        ctx.json(updatedRecord)
      )
    }
    
    return res(
      ctx.status(404),
      ctx.json({ error: 'Attendance record not found' })
    )
  }),

  rest.delete('https://*/rest/v1/attendance/:id', (req, res, ctx) => {
    return res(
      ctx.status(204)
    )
  }),

  // Health check endpoint
  rest.get('http://localhost:3000/api/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
      })
    )
  }),

  // Metrics endpoint
  rest.get('http://localhost:3000/api/metrics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalUsers: mockUsers.length,
        totalAttendance: mockAttendanceRecords.length,
        activeUsers: 1,
        systemHealth: 'good',
      })
    )
  }),

  // Attendance stats endpoint
  rest.get('http://localhost:3000/api/attendance/stats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalRecords: mockAttendanceRecords.length,
        todayRecords: 2,
        thisWeekRecords: 10,
        thisMonthRecords: 40,
        averageHoursPerDay: 8,
        punctualityRate: 95,
      })
    )
  }),

  // Attendance export endpoint
  rest.get('http://localhost:3000/api/attendance/export', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/csv'),
      ctx.body('ID,Name,Timestamp,Type,Location\n1,John Doe,2023-10-01T09:00:00Z,check_in,Office\n2,John Doe,2023-10-01T17:00:00Z,check_out,Office')
    )
  }),

  // Attendance policy endpoint
  rest.get('http://localhost:3000/api/attendance/policy', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        workingHours: {
          start: '09:00',
          end: '17:00',
          breakDuration: 60,
        },
        overtime: {
          enabled: true,
          maxHoursPerDay: 12,
          rate: 1.5,
        },
        leavePolicy: {
          annualLeave: 21,
          sickLeave: 10,
          personalLeave: 5,
        },
      })
    )
  }),

  // Error simulation handlers
  rest.get('https://*/rest/v1/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    )
  }),

  rest.get('https://*/rest/v1/network-error', (req, res, ctx) => {
    return res.networkError('Network error')
  }),

  // Realtime subscription mock
  rest.ws('wss://*/realtime/v1/websocket', (req, res, ctx) => {
    return res(
      ctx.websocket()
    )
  }),
]