/**
 * Integration Tests for Dashboard API
 */

import { NextRequest } from 'next/server'

// Mock the middleware to bypass auth
jest.mock('@/lib/api-auth-middleware', () => ({
  withAdminAuth: (handler: any) => handler
}))

// Mock serverDbManager
jest.mock('@/lib/server-db', () => ({
  serverDbManager: {
    getUsers: jest.fn().mockResolvedValue([
      {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin',
        department: 'IT',
        isActive: true
      },
      {
        id: '2',
        email: 'employee@test.com',
        name: 'Employee',
        role: 'employee',
        department: 'Engineering',
        isActive: true
      }
    ]),
    getAttendanceRecords: jest.fn().mockResolvedValue([
      {
        id: '1',
        userId: '2',
        timestamp: new Date(),
        type: 'check-in'
      }
    ])
  }
}))

describe('/api/admin/dashboard/stats', () => {
  it('should return dashboard statistics', async () => {
    // Import after mocks are set up
    const { GET } = await import('@/app/api/admin/dashboard/stats/route')
    
    const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats')
    
    const response = await GET(request as any)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('total')
    expect(data.data).toHaveProperty('attendance')
    expect(data.data.total).toBe(2)
  })
})
