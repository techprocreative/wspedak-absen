# 🚀 PRODUCTION READY ROADMAP
## Attendance System - Complete Implementation Plan

**Document Version:** 1.0  
**Last Updated:** 2024-01-08  
**Status:** Implementation Guide  
**Estimated Timeline:** 4-6 Weeks

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Critical Issues & Solutions](#critical-issues--solutions)
3. [Implementation Phases](#implementation-phases)
4. [Technical Specifications](#technical-specifications)
5. [Database Schema](#database-schema)
6. [API Specifications](#api-specifications)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)

---

## 🎯 EXECUTIVE SUMMARY

### Current Status
- **Overall Completion:** 75%
- **Production Ready Modules:** 2 (Employees, Attendance basic)
- **Partial Implementation:** 4 modules
- **Missing Implementation:** 5 modules

### Goals
- Achieve 100% functional system
- Replace all mock data with real database operations
- Implement missing core features (Face Recognition, Reports)
- Complete all UI pages
- Add comprehensive testing
- Deploy to production

### Success Criteria
✅ All features working with real data  
✅ Face recognition functional  
✅ Reports generation working  
✅ All UI pages completed  
✅ 80%+ test coverage  
✅ Production deployment successful

---

## 🔥 CRITICAL ISSUES & SOLUTIONS

### Issue 1: Data Not Persisting (CRITICAL)

**Problem:**
```typescript
// server-db.ts uses in-memory Map storage
private users: Map<string, ServerUser> = new Map()
private attendanceRecords: Map<string, ServerAttendanceRecord> = new Map()
```
Data is lost on server restart!

**Solution:**

**Step 1: Setup Supabase Tables**

Create migration file: `supabase/migrations/001_initial_schema.sql`

```sql
-- Users/Employees Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    department VARCHAR(255),
    position VARCHAR(255),
    manager_id UUID REFERENCES public.users(id),
    employee_id VARCHAR(100) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    start_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'hr', 'manager', 'employee'))
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(50) NOT NULL,
    location JSONB,
    photo_url TEXT,
    notes TEXT,
    status VARCHAR(50),
    verified BOOLEAN DEFAULT false,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_type CHECK (type IN ('check-in', 'check-out', 'break-start', 'break-end')),
    CONSTRAINT valid_status CHECK (status IN ('present', 'late', 'absent', 'early_leave', 'on_leave'))
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location JSONB,
    assigned_users UUID[],
    assigned_departments VARCHAR(255)[],
    is_active BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_type CHECK (type IN ('regular', 'overtime', 'holiday', 'weekend', 'special'))
);

-- Schedule Assignments Table
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned',
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('assigned', 'confirmed', 'completed', 'absent', 'cancelled')),
    UNIQUE(schedule_id, user_id, date)
);

-- Face Embeddings Table
CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    embedding FLOAT8[] NOT NULL,
    quality FLOAT4,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section VARCHAR(100) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_type CHECK (type IN ('info', 'warning', 'error', 'success')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_employee_id ON public.users(employee_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_department ON public.users(department);

CREATE INDEX idx_attendance_user_id ON public.attendance_records(user_id);
CREATE INDEX idx_attendance_timestamp ON public.attendance_records(timestamp);
CREATE INDEX idx_attendance_type ON public.attendance_records(type);
CREATE INDEX idx_attendance_status ON public.attendance_records(status);
CREATE INDEX idx_attendance_user_timestamp ON public.attendance_records(user_id, timestamp);

CREATE INDEX idx_schedules_date_range ON public.schedules(start_date, end_date);
CREATE INDEX idx_schedules_is_active ON public.schedules(is_active);
CREATE INDEX idx_schedules_created_by ON public.schedules(created_by);

CREATE INDEX idx_schedule_assignments_user ON public.schedule_assignments(user_id);
CREATE INDEX idx_schedule_assignments_date ON public.schedule_assignments(date);
CREATE INDEX idx_schedule_assignments_schedule ON public.schedule_assignments(schedule_id);

CREATE INDEX idx_face_embeddings_user ON public.face_embeddings(user_id);
CREATE INDEX idx_face_embeddings_active ON public.face_embeddings(is_active);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Basic - needs customization based on requirements)
-- Users can view their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'hr')
        )
    );

-- Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON public.attendance_records
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager')
        )
    );

-- Create Functions for Updated At Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.schedule_assignments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.face_embeddings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Step 2: Update server-db.ts to use Supabase**

Create new file: `lib/supabase-db.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { 
  ServerUser, 
  ServerAttendanceRecord, 
  ServerSchedule,
  ServerScheduleAssignment,
  ServerSettings,
  ServerFaceEmbedding
} from './server-db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export class SupabaseDbManager {
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  async getUsers(options?: {
    role?: string
    department?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<ServerUser[]> {
    let query = supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
    
    if (options?.role) {
      query = query.eq('role', options.role)
    }
    
    if (options?.department) {
      query = query.eq('department', options.department)
    }
    
    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,employee_id.ilike.%${options.search}%`)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }
    
    return data as ServerUser[]
  }
  
  async getUser(id: string): Promise<ServerUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching user:', error)
      return null
    }
    
    return data as ServerUser
  }
  
  async getUserByEmail(email: string): Promise<ServerUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching user by email:', error)
      return null
    }
    
    return data as ServerUser
  }
  
  async saveUser(user: ServerUser): Promise<ServerUser> {
    const { data, error } = await supabase
      .from('users')
      .upsert(user)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving user:', error)
      throw error
    }
    
    return data as ServerUser
  }
  
  async deleteUser(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting user:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // ATTENDANCE OPERATIONS
  // ============================================
  
  async getAttendanceRecords(options?: {
    userId?: string
    startDate?: Date
    endDate?: Date
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<ServerAttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*')
    
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }
    
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString())
    }
    
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString())
    }
    
    if (options?.type) {
      query = query.eq('type', options.type)
    }
    
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    query = query.order('timestamp', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching attendance records:', error)
      throw error
    }
    
    return data as ServerAttendanceRecord[]
  }
  
  async getAttendanceRecord(id: string): Promise<ServerAttendanceRecord | null> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching attendance record:', error)
      return null
    }
    
    return data as ServerAttendanceRecord
  }
  
  async saveAttendanceRecord(record: ServerAttendanceRecord): Promise<ServerAttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(record)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving attendance record:', error)
      throw error
    }
    
    return data as ServerAttendanceRecord
  }
  
  async deleteAttendanceRecord(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting attendance record:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // SCHEDULE OPERATIONS
  // ============================================
  
  async getSchedules(options?: {
    isActive?: boolean
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<ServerSchedule[]> {
    let query = supabase
      .from('schedules')
      .select('*')
    
    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive)
    }
    
    if (options?.startDate && options?.endDate) {
      query = query
        .gte('start_date', options.startDate.toISOString())
        .lte('end_date', options.endDate.toISOString())
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching schedules:', error)
      throw error
    }
    
    return data as ServerSchedule[]
  }
  
  async getSchedule(id: string): Promise<ServerSchedule | null> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching schedule:', error)
      return null
    }
    
    return data as ServerSchedule
  }
  
  async saveSchedule(schedule: ServerSchedule): Promise<ServerSchedule> {
    const { data, error } = await supabase
      .from('schedules')
      .upsert(schedule)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving schedule:', error)
      throw error
    }
    
    return data as ServerSchedule
  }
  
  async deleteSchedule(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting schedule:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // SETTINGS OPERATIONS
  // ============================================
  
  async getSettings(section?: string): Promise<ServerSettings | null> {
    if (section) {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('section', section)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null
        console.error('Error fetching settings:', error)
        return null
      }
      
      return data?.data as ServerSettings
    }
    
    // Get all settings and merge
    const { data, error } = await supabase
      .from('settings')
      .select('*')
    
    if (error) {
      console.error('Error fetching settings:', error)
      return null
    }
    
    const merged: any = {}
    data.forEach(item => {
      merged[item.section] = item.data
    })
    
    return merged as ServerSettings
  }
  
  async saveSettings(section: string, data: any): Promise<boolean> {
    const { error } = await supabase
      .from('settings')
      .upsert({
        section,
        data,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error saving settings:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // FACE EMBEDDINGS OPERATIONS
  // ============================================
  
  async getFaceEmbeddings(userId: string): Promise<ServerFaceEmbedding[]> {
    const { data, error } = await supabase
      .from('face_embeddings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching face embeddings:', error)
      return []
    }
    
    return data as ServerFaceEmbedding[]
  }
  
  async saveFaceEmbedding(embedding: ServerFaceEmbedding): Promise<ServerFaceEmbedding> {
    const { data, error } = await supabase
      .from('face_embeddings')
      .upsert(embedding)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving face embedding:', error)
      throw error
    }
    
    return data as ServerFaceEmbedding
  }
  
  async deleteFaceEmbedding(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('face_embeddings')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting face embedding:', error)
      return false
    }
    
    return true
  }
  
  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================
  
  async createAuditLog(log: {
    userId?: string
    action: string
    resource: string
    resourceId?: string
    details?: any
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: log.userId,
        action: log.action,
        resource: log.resource,
        resource_id: log.resourceId,
        details: log.details,
        ip_address: log.ipAddress,
        user_agent: log.userAgent
      })
    
    if (error) {
      console.error('Error creating audit log:', error)
    }
  }
}

// Export singleton instance
export const supabaseDb = new SupabaseDbManager()
```

**Step 3: Update API Routes to use Supabase**

Update `app/api/admin/employees/route.ts`:

```typescript
import { supabaseDb } from '@/lib/supabase-db'

// Replace all serverDbManager calls with supabaseDb
export async function GET(request: NextRequest) {
  // ... auth check ...
  
  const users = await supabaseDb.getUsers({
    role: query.role,
    department: query.department,
    search: query.search,
    limit: query.limit,
    offset,
  })
  
  // ... rest of code ...
}
```

---

### Issue 2: Face Recognition Not Working (CRITICAL)

**Solution:**

**Step 1: Install face-api.js and models**

```bash
npm install face-api.js
```

**Step 2: Download face-api models**

Create script: `scripts/download-face-models.sh`

```bash
#!/bin/bash

# Create models directory
mkdir -p public/models

# Download models
cd public/models

# Download required models
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2

echo "Models downloaded successfully!"
```

**Step 3: Update FaceEnrollmentModal**

Update `components/admin/FaceEnrollmentModal.tsx`:

```typescript
"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, X, Check, AlertCircle, RefreshCw } from "lucide-react"
import * as faceapi from 'face-api.js'

interface FaceEnrollmentModalProps {
  userId: string
  userName: string
  onClose: () => void
  targetSamples?: number
}

export function FaceEnrollmentModal({
  userId,
  userName,
  onClose,
  targetSamples = 3
}: FaceEnrollmentModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedSamples, setCapturedSamples] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        setModelsLoaded(true)
        console.log('Face-api models loaded successfully')
      } catch (err) {
        console.error('Error loading face-api models:', err)
        setError('Failed to load face recognition models')
      }
    }
    
    loadModels()
  }, [])

  // Initialize camera
  useEffect(() => {
    if (!modelsLoaded) return
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error('Error accessing camera:', err)
        setError('Failed to access camera. Please allow camera access.')
        setIsLoading(false)
      }
    }
    
    initCamera()
    
    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [modelsLoaded])

  // Capture face sample
  const captureSample = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return
    
    setIsCapturing(true)
    setError(null)
    
    try {
      // Detect face
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      if (!detection) {
        setError('No face detected. Please position your face in the frame.')
        setIsCapturing(false)
        return
      }
      
      // Check detection quality
      const detectionScore = detection.detection.score
      if (detectionScore < 0.5) {
        setError('Face detection confidence too low. Please ensure good lighting.')
        setIsCapturing(false)
        return
      }
      
      // Get face descriptor (embedding)
      const descriptor = detection.descriptor
      
      // Draw detection on canvas
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0)
        
        // Draw detection box
        const box = detection.detection.box
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 2
        ctx.strokeRect(box.x, box.y, box.width, box.height)
      }
      
      // Save to backend
      const response = await fetch('/api/admin/face/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          embedding: Array.from(descriptor),
          quality: detectionScore,
          metadata: {
            timestamp: new Date().toISOString(),
            captureIndex: capturedSamples.length + 1
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save face embedding')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCapturedSamples(prev => [...prev, detectionScore])
      } else {
        throw new Error(data.error || 'Failed to save face embedding')
      }
      
    } catch (err: any) {
      console.error('Error capturing face sample:', err)
      setError(err.message || 'Failed to capture face sample')
    } finally {
      setIsCapturing(false)
    }
  }, [userId, capturedSamples, isCapturing])

  // Auto-complete when target samples reached
  useEffect(() => {
    if (capturedSamples.length >= targetSamples) {
      setTimeout(() => {
        onClose()
      }, 1500)
    }
  }, [capturedSamples, targetSamples, onClose])

  const progress = (capturedSamples.length / targetSamples) * 100

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800 border-slate-700 max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Face Enrollment</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{userName}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                Samples: {capturedSamples.length} / {targetSamples}
              </span>
              <span className="text-slate-400">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white">Loading camera...</div>
              </div>
            )}
            
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            
            {/* Face detection guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-emerald-500 rounded-full opacity-50" />
            </div>
            
            {/* Capture overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                <div className="text-white text-lg font-medium">
                  Capturing...
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong>Instructions:</strong>
            </p>
            <ul className="text-sm text-slate-400 mt-2 space-y-1 list-disc list-inside">
              <li>Position your face within the circle</li>
              <li>Ensure good lighting</li>
              <li>Look directly at the camera</li>
              <li>Click capture {targetSamples} times from different angles</li>
            </ul>
          </div>

          {/* Samples */}
          {capturedSamples.length > 0 && (
            <div className="flex gap-2">
              {capturedSamples.map((quality, index) => (
                <Badge
                  key={index}
                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Sample {index + 1} ({(quality * 100).toFixed(0)}%)
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={captureSample}
              disabled={isLoading || isCapturing || capturedSamples.length >= targetSamples || !modelsLoaded}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCapturing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Sample
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {capturedSamples.length >= targetSamples ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Update Face API Endpoint**

Update `app/api/admin/face/embeddings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseDb } from '@/lib/supabase-db'
import { hasAnyServerRole } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

// POST - Save face embedding
export async function POST(request: NextRequest) {
  try {
    if (!hasAnyServerRole(['admin', 'hr'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, embedding, quality, metadata } = body

    if (!userId || !embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Validate embedding dimensions (should be 128 for face-api.js)
    if (embedding.length !== 128) {
      return NextResponse.json(
        { success: false, error: 'Invalid embedding dimensions' },
        { status: 400 }
      )
    }

    const faceEmbedding = {
      id: crypto.randomUUID(),
      userId,
      embedding,
      quality: quality || 0.5,
      metadata: metadata || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await supabaseDb.saveFaceEmbedding(faceEmbedding)

    return NextResponse.json({
      success: true,
      data: faceEmbedding,
      message: 'Face embedding saved successfully'
    })
  } catch (error) {
    console.error('Error saving face embedding:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save face embedding' },
      { status: 500 }
    )
  }
}

// GET - Get face embeddings for user
export async function GET(request: NextRequest) {
  try {
    if (!hasAnyServerRole(['admin', 'hr', 'employee'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    const embeddings = await supabaseDb.getFaceEmbeddings(userId)

    return NextResponse.json({
      success: true,
      data: embeddings
    })
  } catch (error) {
    console.error('Error fetching face embeddings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch face embeddings' },
      { status: 500 }
    )
  }
}
```

---

### Issue 3: Reports Not Functional (CRITICAL)

**Solution:**

Create `lib/report-generator.ts`:

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { supabaseDb } from './supabase-db'

export interface ReportConfig {
  type: 'attendance' | 'performance' | 'employee' | 'custom'
  dataSource: string
  dateRange: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  fields: string[]
  format: 'pdf' | 'excel' | 'csv' | 'json'
  groupBy?: string
  aggregations?: {
    field: string
    function: 'sum' | 'avg' | 'count' | 'min' | 'max'
  }[]
}

export class ReportGenerator {
  async generateReport(config: ReportConfig): Promise<Buffer | string> {
    // Fetch data based on config
    const data = await this.fetchReportData(config)
    
    // Generate report in specified format
    switch (config.format) {
      case 'pdf':
        return this.generatePDF(data, config)
      case 'excel':
        return this.generateExcel(data, config)
      case 'csv':
        return this.generateCSV(data, config)
      case 'json':
        return this.generateJSON(data, config)
      default:
        throw new Error('Unsupported format')
    }
  }

  private async fetchReportData(config: ReportConfig): Promise<any[]> {
    switch (config.type) {
      case 'attendance':
        return this.fetchAttendanceData(config)
      case 'employee':
        return this.fetchEmployeeData(config)
      default:
        throw new Error('Unsupported report type')
    }
  }

  private async fetchAttendanceData(config: ReportConfig): Promise<any[]> {
    const records = await supabaseDb.getAttendanceRecords({
      startDate: config.dateRange.start,
      endDate: config.dateRange.end
    })

    // Get user details for each record
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const user = await supabaseDb.getUser(record.userId)
        return {
          ...record,
          userName: user?.name,
          userEmail: user?.email,
          department: user?.department,
          position: user?.position
        }
      })
    )

    // Apply filters
    let filteredRecords = enrichedRecords
    if (config.filters) {
      filteredRecords = filteredRecords.filter(record => {
        return Object.entries(config.filters!).every(([key, value]) => {
          if (value === 'all') return true
          return record[key] === value
        })
      })
    }

    // Apply grouping and aggregations if needed
    if (config.groupBy) {
      return this.applyGrouping(filteredRecords, config)
    }

    return filteredRecords
  }

  private async fetchEmployeeData(config: ReportConfig): Promise<any[]> {
    const users = await supabaseDb.getUsers(config.filters)
    return users
  }

  private applyGrouping(data: any[], config: ReportConfig): any[] {
    if (!config.groupBy) return data

    const grouped = data.reduce((acc, item) => {
      const key = item[config.groupBy!]
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<string, any[]>)

    // Apply aggregations
    if (config.aggregations) {
      return Object.entries(grouped).map(([key, items]) => {
        const result: any = { [config.groupBy!]: key }
        
        config.aggregations!.forEach(agg => {
          const values = items.map(item => item[agg.field])
          
          switch (agg.function) {
            case 'count':
              result[`${agg.field}_count`] = values.length
              break
            case 'sum':
              result[`${agg.field}_sum`] = values.reduce((a, b) => a + b, 0)
              break
            case 'avg':
              result[`${agg.field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length
              break
            case 'min':
              result[`${agg.field}_min`] = Math.min(...values)
              break
            case 'max':
              result[`${agg.field}_max`] = Math.max(...values)
              break
          }
        })
        
        return result
      })
    }

    return Object.entries(grouped).map(([key, items]) => ({
      [config.groupBy!]: key,
      items
    }))
  }

  private generatePDF(data: any[], config: ReportConfig): Buffer {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text('Attendance Report', 14, 20)
    
    // Add metadata
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
    doc.text(`Period: ${config.dateRange.start.toLocaleDateString()} - ${config.dateRange.end.toLocaleDateString()}`, 14, 36)
    
    // Prepare table data
    const headers = config.fields.map(field => field.toUpperCase())
    const rows = data.map(item => 
      config.fields.map(field => {
        const value = item[field]
        if (value instanceof Date) {
          return value.toLocaleString()
        }
        return value?.toString() || '-'
      })
    )
    
    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 }
    })
    
    return Buffer.from(doc.output('arraybuffer'))
  }

  private generateExcel(data: any[], config: ReportConfig): Buffer {
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Prepare data
    const preparedData = data.map(item => {
      const row: any = {}
      config.fields.forEach(field => {
        const value = item[field]
        if (value instanceof Date) {
          row[field] = value.toLocaleString()
        } else {
          row[field] = value
        }
      })
      return row
    })
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(preparedData)
    
    // Add metadata sheet
    const metadata = [
      ['Report Type', config.type],
      ['Generated', new Date().toLocaleString()],
      ['Start Date', config.dateRange.start.toLocaleString()],
      ['End Date', config.dateRange.end.toLocaleString()],
      ['Total Records', data.length]
    ]
    const metaWs = XLSX.utils.aoa_to_sheet(metadata)
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata')
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    
    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return buf
  }

  private generateCSV(data: any[], config: ReportConfig): string {
    const headers = config.fields.join(',')
    const rows = data.map(item => 
      config.fields.map(field => {
        const value = item[field]
        if (value instanceof Date) {
          return `"${value.toLocaleString()}"`
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value?.toString() || ''
      }).join(',')
    )
    
    return [headers, ...rows].join('\n')
  }

  private generateJSON(data: any[], config: ReportConfig): string {
    const report = {
      metadata: {
        type: config.type,
        generated: new Date().toISOString(),
        dateRange: {
          start: config.dateRange.start.toISOString(),
          end: config.dateRange.end.toISOString()
        },
        totalRecords: data.length
      },
      data: data.map(item => {
        const row: any = {}
        config.fields.forEach(field => {
          row[field] = item[field]
        })
        return row
      })
    }
    
    return JSON.stringify(report, null, 2)
  }
}

export const reportGenerator = new ReportGenerator()
```

Create API endpoint: `app/api/admin/reports/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { reportGenerator, ReportConfig } from '@/lib/report-generator'
import { hasAnyServerRole } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!hasAnyServerRole(['admin', 'hr', 'manager'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config: ReportConfig = await request.json()

    // Validate config
    if (!config.type || !config.format || !config.dateRange) {
      return NextResponse.json(
        { success: false, error: 'Invalid report configuration' },
        { status: 400 }
      )
    }

    // Convert date strings to Date objects
    config.dateRange.start = new Date(config.dateRange.start)
    config.dateRange.end = new Date(config.dateRange.end)

    // Generate report
    const report = await reportGenerator.generateReport(config)

    // Set appropriate headers based on format
    const headers: Record<string, string> = {
      'Content-Disposition': `attachment; filename=report-${Date.now()}.${config.format === 'excel' ? 'xlsx' : config.format}`
    }

    if (config.format === 'pdf') {
      headers['Content-Type'] = 'application/pdf'
    } else if (config.format === 'excel') {
      headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (config.format === 'csv') {
      headers['Content-Type'] = 'text/csv'
    } else if (config.format === 'json') {
      headers['Content-Type'] = 'application/json'
    }

    return new NextResponse(report, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
```

---

*[Document continues with Issues 4-10, implementation phases, testing strategies, and deployment plans...]*

**Due to character limits, this is Part 1 of the documentation. Would you like me to continue with:**
- Part 2: Implementation Phases & Timeline
- Part 3: Testing & Quality Assurance
- Part 4: Deployment & Monitoring
