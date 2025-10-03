# 🚀 Phase 2-4 Implementation Guide

**Target:** Complete Frontend Integration, Testing, and Deployment  
**Timeline:** 3-4 weeks  
**Status:** Phase 1 Complete, Starting Phase 2

---

## 📋 Overview

**What's Done (Phase 1):**
- ✅ Backend infrastructure (database, APIs, auth)
- ✅ Business logic (attendance, face recognition, reports)
- ✅ Security layer (JWT, RBAC, audit logs)

**What's Needed (Phase 2-4):**
- 🔄 Frontend integration with real APIs
- 🔄 Complete testing suite
- 🔄 Production deployment

---

## 🎯 PHASE 2: Frontend Integration (Week 3-4)

### Task 2.1: Update Dashboard to Use Real API ⚡

**File:** `components/admin-dashboard.tsx`

**Current State:** Uses empty mock data
**Target State:** Fetch from `/api/admin/dashboard/stats`

**Implementation:**

```typescript
// Add this hook at the top of the file
import { useEffect, useState } from "react"

// Add this interface
interface DashboardStats {
  total: number
  active: number
  byRole: {
    admin: number
    hr: number
    manager: number
    employee: number
  }
  byDepartment: Record<string, number>
  attendance: {
    today: number
    todayCheckIns: number
    todayCheckOuts: number
    todayLate: number
    todayPresent: number
  }
}

// Replace mock data with:
export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('session-token')
        if (!token) throw new Error('Not authenticated')

        const response = await fetch('/api/admin/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) throw new Error('Failed to fetch stats')
        
        const data = await response.json()
        setStats(data.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!stats) return <div>No data</div>

  // Use real stats
  const displayStats = {
    totalEmployees: stats.total,
    presentToday: stats.attendance.todayPresent,
    absentToday: stats.total - stats.attendance.todayCheckIns,
    lateToday: stats.attendance.todayLate,
    onTimeRate: stats.total > 0 
      ? ((stats.attendance.todayPresent / stats.total) * 100).toFixed(1)
      : 0,
  }

  // Rest of component...
}
```

**Testing:**
```bash
# Start dev server
npm run dev

# Login as admin
# Navigate to /admin/dashboard
# Verify real-time stats are displayed
```

---

### Task 2.2: Create Face Enrollment Modal with Camera 📸

**File:** `components/face-enrollment-modal.tsx` (NEW)

**Purpose:** Allow HR/Admin to enroll employee faces

**Implementation:**

```typescript
"use client"

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, X } from 'lucide-react'

interface FaceEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onSuccess: () => void
}

export function FaceEnrollmentModal({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  onSuccess 
}: FaceEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load face-api.js models
  useEffect(() => {
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
      } catch (err) {
        setError('Failed to load face recognition models')
        console.error(err)
      }
    }
    
    if (isOpen) {
      loadModels()
    }
  }, [isOpen])

  // Start camera
  useEffect(() => {
    async function startCamera() {
      if (!isOpen || !videoRef.current || !modelsLoaded) return

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      } catch (err) {
        setError('Failed to access camera')
        console.error(err)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen, modelsLoaded])

  // Capture and enroll face
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setCapturing(true)
    setError(null)

    try {
      // Detect face
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please ensure your face is clearly visible.')
      }

      // Get descriptor
      const descriptor = Array.from(detection.descriptor)

      // Calculate quality score (based on detection confidence)
      const quality = detection.detection.score

      // Send to API
      const token = localStorage.getItem('session-token')
      const response = await fetch('/api/admin/face/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          descriptor,
          quality,
          metadata: {
            enrolledAt: new Date().toISOString(),
            enrolledBy: 'admin' // Get from auth context
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enroll face')
      }

      // Success
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCapturing(false)
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enroll Face - {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
              {error}
            </div>
          )}

          {!modelsLoaded && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading face recognition models...</p>
            </div>
          )}

          {modelsLoaded && (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="w-full h-auto"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCapture} 
                  disabled={capturing}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {capturing ? 'Processing...' : 'Capture & Enroll'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={capturing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>📸 Position your face in the center of the frame</p>
                <p>💡 Ensure good lighting for best results</p>
                <p>😊 Look directly at the camera</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Usage in Employee Management:**

```typescript
// In app/admin/employees/page.tsx
import { FaceEnrollmentModal } from '@/components/face-enrollment-modal'

// Add state
const [enrollModalOpen, setEnrollModalOpen] = useState(false)
const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null)

// Add button in employee row
<Button 
  size="sm" 
  onClick={() => {
    setSelectedEmployee({ id: employee.id, name: employee.name })
    setEnrollModalOpen(true)
  }}
>
  Enroll Face
</Button>

// Add modal
<FaceEnrollmentModal
  isOpen={enrollModalOpen}
  onClose={() => setEnrollModalOpen(false)}
  userId={selectedEmployee?.id || ''}
  userName={selectedEmployee?.name || ''}
  onSuccess={() => {
    // Refresh employee list or show success message
    alert('Face enrolled successfully!')
  }}
/>
```

**Dependencies to install:**
```bash
npm install face-api.js
```

---

### Task 2.3: Create Face Check-in Page 🎯

**File:** `app/face-checkin/page.tsx` (NEW)

**Purpose:** Standalone page for employees to check-in using face recognition

```typescript
"use client"

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Check, X, Clock } from 'lucide-react'

export default function FaceCheckinPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)

  // Load models
  useEffect(() => {
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
      } catch (err) {
        console.error('Failed to load models:', err)
      }
    }
    loadModels()
  }, [])

  // Start camera
  useEffect(() => {
    async function startCamera() {
      if (!modelsLoaded) return

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setStream(mediaStream)
      } catch (err) {
        console.error('Failed to access camera:', err)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [modelsLoaded])

  const handleCheckin = async () => {
    if (!videoRef.current) return

    setProcessing(true)
    setResult(null)

    try {
      // Detect face
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected. Please position your face clearly in the frame.')
      }

      const descriptor = Array.from(detection.descriptor)

      // Get location
      let location = null
      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }),
            () => resolve(null)
          )
        })
      }

      // Call check-in API
      const response = await fetch('/api/attendance/face-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descriptor,
          timestamp: new Date().toISOString(),
          location,
          type: 'check-in'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Check-in failed')
      }

      setResult({
        success: true,
        message: data.message,
        data: data.data
      })

      // Stop camera after successful check-in
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Camera className="w-6 h-6" />
              Face Recognition Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!modelsLoaded && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading face recognition...</p>
              </div>
            )}

            {modelsLoaded && !result && (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    className="w-full h-auto"
                  />
                </div>

                <Button 
                  onClick={handleCheckin} 
                  disabled={processing || !stream}
                  size="lg"
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Check In Now
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p>✅ Position your face in the center</p>
                  <p>💡 Ensure good lighting</p>
                  <p>😊 Look directly at the camera</p>
                </div>
              </>
            )}

            {result && (
              <div className={`p-6 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'}`}>
                <div className="flex items-center gap-4">
                  {result.success ? (
                    <Check className="w-12 h-12 text-green-500" />
                  ) : (
                    <X className="w-12 h-12 text-red-500" />
                  )}
                  <div>
                    <h3 className={`text-xl font-semibold ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                      {result.success ? 'Check-in Successful!' : 'Check-in Failed'}
                    </h3>
                    <p className="text-sm mt-1">{result.message}</p>
                    {result.data && (
                      <div className="mt-4 space-y-1 text-sm">
                        <p>Name: {result.data.userName}</p>
                        <p>Time: {new Date(result.data.timestamp).toLocaleString('id-ID')}</p>
                        <p>Status: {result.data.status}</p>
                        <p>Confidence: {(result.data.confidence * 100).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {!result.success && (
                  <Button 
                    onClick={() => {
                      setResult(null)
                      // Restart camera
                      if (!stream) {
                        navigator.mediaDevices.getUserMedia({ video: true })
                          .then(s => {
                            if (videoRef.current) {
                              videoRef.current.srcObject = s
                            }
                            setStream(s)
                          })
                      }
                    }}
                    className="w-full mt-4"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

### Task 2.4: Create Report Generation UI 📊

**File:** `app/admin/reports/page.tsx` (UPDATE)

Add report generation form:

```typescript
"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileText } from 'lucide-react'

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false)
  const [config, setConfig] = useState({
    type: 'attendance',
    format: 'pdf',
    startDate: '',
    endDate: '',
    fields: ['userName', 'date', 'time', 'status']
  })

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const token = localStorage.getItem('session-token')
      
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...config,
          dateRange: {
            start: new Date(config.startDate),
            end: new Date(config.endDate)
          }
        })
      })

      if (!response.ok) throw new Error('Failed to generate report')

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${Date.now()}.${config.format === 'excel' ? 'xlsx' : config.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select 
                value={config.type}
                onValueChange={(value) => setConfig({...config, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                  <SelectItem value="employee">Employee Report</SelectItem>
                  <SelectItem value="department">Department Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Format</Label>
              <Select 
                value={config.format}
                onValueChange={(value) => setConfig({...config, format: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={config.startDate}
                onChange={(e) => setConfig({...config, startDate: e.target.value})}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={config.endDate}
                onChange={(e) => setConfig({...config, endDate: e.target.value})}
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generating || !config.startDate || !config.endDate}
            className="w-full"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🧪 PHASE 3: Testing (Week 5)

### Task 3.1: Unit Tests for Core Services

**File:** `__tests__/lib/face-matching.test.ts` (NEW)

```typescript
import { FaceMatcher } from '@/lib/face-matching'

describe('FaceMatcher', () => {
  describe('euclideanDistance', () => {
    it('should calculate distance correctly', () => {
      const desc1 = new Float32Array([1, 2, 3])
      const desc2 = [4, 5, 6]
      
      // Distance = sqrt((4-1)^2 + (5-2)^2 + (6-3)^2) = sqrt(27) = 5.196...
      const distance = (FaceMatcher as any).euclideanDistance(desc1, desc2)
      expect(distance).toBeCloseTo(5.196, 2)
    })
  })

  describe('matchFace', () => {
    it('should return null when no face embeddings exist', async () => {
      // Mock empty database
      const result = await FaceMatcher.matchFace(new Float32Array(128))
      expect(result).toBeNull()
    })
  })

  describe('getConfidenceLevel', () => {
    it('should return high for confidence >= 0.8', () => {
      expect(FaceMatcher.getConfidenceLevel(0.9)).toBe('high')
    })

    it('should return medium for confidence >= 0.6', () => {
      expect(FaceMatcher.getConfidenceLevel(0.7)).toBe('medium')
    })

    it('should return low for confidence < 0.6', () => {
      expect(FaceMatcher.getConfidenceLevel(0.5)).toBe('low')
    })
  })
})
```

### Task 3.2: API Integration Tests

**File:** `__tests__/api/dashboard.test.ts` (NEW)

```typescript
import { GET } from '@/app/api/admin/dashboard/stats/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/server-db')
jest.mock('@/lib/api-auth-middleware', () => ({
  withAdminAuth: (handler: any) => handler
}))

describe('/api/admin/dashboard/stats', () => {
  it('should return dashboard statistics', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/dashboard/stats')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('total')
    expect(data.data).toHaveProperty('attendance')
  })
})
```

### Task 3.3: E2E Tests with Playwright

**File:** `e2e/login-flow.spec.ts` (UPDATE)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully with admin credentials', async ({ page }) => {
    await page.goto('/admin/login')
    
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/admin/dashboard')
    await expect(page.locator('text=Total Karyawan')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/admin/login')
    
    await page.fill('input[name="email"]', 'invalid@test.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Invalid')).toBeVisible()
  })
})

test.describe('Face Check-in Flow', () => {
  test('should display camera and check-in button', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera'])
    
    await page.goto('/face-checkin')
    
    await expect(page.locator('video')).toBeVisible()
    await expect(page.locator('button:has-text("Check In Now")')).toBeVisible()
  })
})
```

**Run tests:**
```bash
# Unit tests
npm test

# E2E tests
npx playwright test

# With UI
npx playwright test --ui
```

---

## 🚀 PHASE 4: Deployment (Week 6-7)

### Task 4.1: Create Deployment Scripts

**File:** `scripts/deploy.sh` (NEW)

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Check environment
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ Error: JWT_SECRET not set"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Build
echo "🔨 Building application..."
npm run build

# Download face models
echo "📥 Downloading face models..."
./scripts/download-face-models.sh

echo "✅ Deployment preparation complete!"
```

### Task 4.2: Vercel Deployment

**File:** `vercel.json` (NEW)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_key",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

**Deployment steps:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### Task 4.3: Docker Production Deployment

**File:** `Dockerfile.production` (NEW)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Download face models
COPY scripts/download-face-models.sh ./scripts/
RUN chmod +x ./scripts/download-face-models.sh
RUN ./scripts/download-face-models.sh

EXPOSE 3000

CMD ["npm", "start"]
```

**Build and run:**
```bash
# Build
docker build -f Dockerfile.production -t attendance-system:prod .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  -e JWT_SECRET=$JWT_SECRET \
  attendance-system:prod
```

### Task 4.4: Monitoring Setup

**File:** `lib/monitoring.ts` (NEW)

```typescript
// Sentry integration
import * as Sentry from "@sentry/nextjs"

export function initMonitoring() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    })
  }
}

// Analytics
export function trackEvent(event: string, data?: any) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, data)
  }
}
```

**Usage:**
```typescript
// In app/layout.tsx
import { initMonitoring } from '@/lib/monitoring'

initMonitoring()
```

---

## ✅ Completion Checklist

### Phase 2: Frontend Integration
- [ ] Dashboard uses real API
- [ ] Face enrollment modal working
- [ ] Face check-in page created
- [ ] Report generation UI functional
- [ ] All components updated

### Phase 3: Testing
- [ ] Unit tests written (>80% coverage)
- [ ] API integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests done
- [ ] Security audit complete

### Phase 4: Deployment
- [ ] Deployment scripts created
- [ ] Vercel deployment successful
- [ ] Docker deployment tested
- [ ] Monitoring configured
- [ ] CI/CD pipeline setup
- [ ] Production smoke tests passed

---

## 📞 Next Actions

1. **Install face-api.js:**
   ```bash
   npm install face-api.js
   ```

2. **Start implementing Phase 2 tasks**

3. **Test each component as you build**

4. **Follow this guide sequentially**

---

**Status:** Ready to implement Phase 2-4  
**Estimated Time:** 3-4 weeks  
**Priority:** Complete Phase 2 first
