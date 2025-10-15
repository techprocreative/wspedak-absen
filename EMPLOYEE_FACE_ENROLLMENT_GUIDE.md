# 👥 Employee Management & Face Enrollment Guide

## 📋 Overview

Sistem memiliki **complete employee management** dengan integrasi **face enrollment** untuk face recognition attendance.

---

## 🎯 Features

### 1. Employee Management (CRUD)
- ✅ Create new employees
- ✅ Edit employee data
- ✅ Delete employees (single & bulk)
- ✅ View employee details
- ✅ Search & filter employees
- ✅ Export employee data (CSV/JSON)
- ✅ Pagination support

### 2. Face Enrollment
- ✅ Enroll face untuk setiap employee
- ✅ Multiple face samples (default: 3 samples)
- ✅ Quality validation
- ✅ Real-time camera preview
- ✅ Face detection confidence feedback
- ✅ Progress tracking
- ✅ Maximum 5 embeddings per user

---

## 🚀 How to Use

### A. Managing Employees

#### 1. Access Admin Panel
```
Navigate to: /admin/employees
Role required: admin, hr, atau manager
```

#### 2. Create New Employee

**Steps**:
1. Click tombol **"Tambah Karyawan"** (Plus icon)
2. Fill form dengan data:
   - **Informasi Pribadi**:
     - Nama Lengkap (required)
     - Email (required, unique)
     - Telepon
   - **Informasi Pekerjaan**:
     - Role: employee, manager, hr, atau admin
     - Departemen
     - Posisi
     - ID Karyawan
   - **Informasi Tambahan**:
     - Manager (select from dropdown)
     - Tanggal Mulai
     - Alamat
3. Click **"Simpan"**

**API Call**:
```http
POST /api/admin/employees
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "employee",
  "department": "Engineering",
  "position": "Software Developer",
  "phone": "+6281234567890",
  "employeeId": "EMP001",
  "startDate": "2024-01-01",
  "address": "Jakarta, Indonesia"
}
```

#### 3. Edit Employee

**Steps**:
1. Click **⋮** menu di row employee
2. Select **"Edit"**
3. Update data yang diperlukan
4. Click **"Simpan Perubahan"**

**API Call**:
```http
PUT /api/admin/employees/{id}
Content-Type: application/json

{
  "name": "John Doe Updated",
  "department": "Product"
}
```

#### 4. Delete Employee

**Steps**:
1. Click **⋮** menu di row employee
2. Select **"Hapus"**
3. Confirm deletion

**API Call**:
```http
DELETE /api/admin/employees/{id}
```

#### 5. View Employee Details

**Steps**:
1. Click **⋮** menu di row employee
2. Select **"Lihat Detail"**
3. View all employee information
4. Optional: Click **"Enroll Face"** atau **"Edit"**

---

### B. Face Enrollment

#### 1. Access Face Enrollment

**Method A - From Employee List**:
1. Navigate to `/admin/employees`
2. Click **⋮** menu di row employee
3. Select **"Enroll Face"** (Camera icon)

**Method B - From Employee Detail**:
1. View employee detail
2. Click **"Enroll Face"** button di modal detail

#### 2. Enrollment Process

**Steps**:
1. **Grant Camera Permission**
   - Browser akan meminta izin akses camera
   - Click "Allow"

2. **Position Your Face**
   - Pastikan wajah terlihat jelas di preview
   - Jarak ideal: 30-60cm dari camera
   - Lighting harus cukup terang
   - Wajah harus frontal (tidak miring)

3. **Capture Samples**
   - System akan otomatis detect face
   - Ketika quality bagus, akan auto-capture
   - Progress: "1 / 3", "2 / 3", "3 / 3"
   - **Tips**: Ubah sedikit posisi/ekspresi untuk variasi

4. **Completion**
   - Setelah 3 samples berhasil
   - Akan tampil: "Enrollment selesai"
   - Click **"Tutup"**

**Technical Details**:
```javascript
// Face Enrollment Modal Component
<FaceEnrollmentModal
  userId={selectedUser.id}
  userName={selectedUser.name}
  onClose={() => setIsEnrollModalOpen(false)}
  targetSamples={3}  // Jumlah sampel yang diperlukan
/>
```

#### 3. Face Quality Requirements

**Minimum Requirements**:
- Confidence level: > 0.8 (80%)
- Face descriptor: 128-dimensional vector
- Clear face detection (no obstructions)

**Best Practices**:
- Good lighting (tidak terlalu gelap/terang)
- Remove glasses/hat jika memungkinkan
- Look directly at camera
- Neutral expression untuk sample pertama
- Vary expression slightly untuk samples berikutnya

---

## 🔧 Technical Architecture

### API Endpoints

#### Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/employees` | List employees (with pagination, filters) |
| POST | `/api/admin/employees` | Create new employee |
| GET | `/api/admin/employees/{id}` | Get single employee |
| PUT | `/api/admin/employees/{id}` | Update single employee |
| DELETE | `/api/admin/employees/{id}` | Delete single employee |
| PUT | `/api/admin/employees` | Bulk update (body: `{updates, ids}`) |
| DELETE | `/api/admin/employees` | Bulk delete (body: `{ids}`) |
| GET | `/api/admin/employees/export` | Export data (CSV/JSON) |

#### Face Enrollment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/face/embeddings` | Save face embedding |
| GET | `/api/admin/face/embeddings?userId={id}` | Get user's embeddings |
| GET | `/api/admin/face/embeddings/user/{userId}` | Get user's embeddings (alternative) |
| DELETE | `/api/admin/face/embeddings/{id}` | Delete specific embedding |

### Data Models

#### Employee (User)
```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'hr' | 'manager' | 'employee'
  department?: string
  position?: string
  employeeId?: string
  phone?: string
  address?: string
  startDate?: Date
  managerId?: string
  faceDescriptor?: string  // Deprecated: use face_embeddings table
  createdAt: Date
  updatedAt: Date
}
```

#### Face Embedding
```typescript
interface FaceEmbedding {
  id: string
  userId: string
  embedding: number[]  // 128-dimensional descriptor
  quality: number      // 0.0 - 1.0
  metadata: {
    quality?: number
    timestamp?: string
    deviceInfo?: any
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Components

#### 1. Admin Employees Page
**File**: `app/admin/employees/page.tsx`

**Features**:
- AdminDataTable with sorting, filtering, pagination
- AdminForm for create/edit
- Action buttons: View, Edit, Delete, Enroll Face
- SearchFilter with role & department filters
- ExportButton for CSV/JSON export
- Bulk operations support

**State Management**:
```typescript
const [users, setUsers] = useState<UserWithId[]>([])
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
const [isEditModalOpen, setIsEditModalOpen] = useState(false)
const [isViewModalOpen, setIsViewModalOpen] = useState(false)
const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null)
```

#### 2. Face Enrollment Modal
**File**: `components/admin/FaceEnrollmentModal.tsx`

**Props**:
```typescript
interface FaceEnrollmentModalProps {
  userId: string
  userName?: string
  onClose: () => void
  targetSamples?: number  // default: 3
}
```

**Features**:
- Camera preview
- Progress indicator
- Quality feedback
- Error handling
- Success notification

#### 3. Face Recognition Camera
**File**: `components/face-recognition-camera.tsx`

**Modes**:
- `capture`: Simple photo capture
- `verification`: Verify against enrolled faces
- `enrollment`: Enroll new face samples

**Features**:
- Hardware optimization options
- Memory monitoring
- Face quality metrics
- Real-time detection feedback

---

## 🧪 Testing Guide

### Test Scenario 1: Create & Enroll Employee

1. **Create Employee**:
   ```
   Navigate: /admin/employees
   Click: "Tambah Karyawan"
   Fill: All required fields
   Submit: Click "Simpan"
   Verify: Employee appears in table
   ```

2. **Enroll Face**:
   ```
   Click: ⋮ menu on new employee row
   Select: "Enroll Face"
   Grant: Camera permission
   Position: Face in camera view
   Wait: Auto-capture 3 samples
   Verify: "Enrollment selesai" message
   Close: Modal
   ```

3. **Test Face Recognition**:
   ```
   Navigate: /face-checkin
   Grant: Camera permission
   Wait: Face identification
   Verify: User recognized correctly
   ```

### Test Scenario 2: Edit Employee Data

1. **Edit Information**:
   ```
   Click: ⋮ menu → "Edit"
   Update: Department to "Sales"
   Submit: Click "Simpan Perubahan"
   Verify: Changes reflected in table
   ```

2. **Verify Face Still Works**:
   ```
   Test: Face check-in still recognizes user
   Verify: No re-enrollment needed
   ```

### Test Scenario 3: Multiple Face Samples

1. **Enroll First Sample**:
   ```
   Enroll face: Sample 1/3 captured
   ```

2. **Change Position**:
   ```
   Slightly rotate head
   Enroll: Sample 2/3 captured
   ```

3. **Complete Enrollment**:
   ```
   Change expression slightly
   Enroll: Sample 3/3 captured
   Verify: "Enrollment selesai"
   ```

### Test Scenario 4: Error Handling

#### No Camera Access:
```
Expected: "Tidak dapat mengakses kamera" error
Action: Show camera permission guide
```

#### Poor Lighting:
```
Expected: Quality warning
Action: Suggest better lighting
```

#### User Not Found:
```
Expected: 404 error from API
Action: Show error message
```

#### Maximum Embeddings Reached:
```
Expected: "Maximum 5 embeddings reached" error
Action: Suggest deleting old embeddings first
```

---

## 🐛 Troubleshooting

### Issue 1: Face Enrollment Fails

**Symptoms**: 
- Modal stuck at "capturing"
- No progress after granting camera

**Solutions**:
1. Check browser console for errors
2. Verify camera permissions granted
3. Check network tab for API errors
4. Verify face-api.js models loaded
5. Try different lighting conditions

**Debug Commands**:
```javascript
// In browser console
console.log('Camera active:', !!document.querySelector('video').srcObject)
console.log('Models loaded:', !!window.faceapi?.nets?.tinyFaceDetector)
```

### Issue 2: API Returns 400 "Invalid descriptor"

**Cause**: Descriptor format incorrect

**Check**:
```javascript
// Descriptor must be:
- Array of numbers
- Length exactly 128
- Values between -1 and 1
```

**Fixed**: Field name mismatch sudah diperbaiki di `lib/face-service.ts`

### Issue 3: "Maximum embeddings reached"

**Solution A - Delete Old Embeddings**:
```javascript
// Call delete API for old embeddings
await faceService.deleteEmbedding(oldEmbeddingId)
```

**Solution B - Increase Limit** (if needed):
```typescript
// In: app/api/admin/face/embeddings/route.ts
// Change line ~92:
if (existingEmbeddings.length >= 10) { // Increased from 5
  // ...
}
```

### Issue 4: Camera Shows Black Screen

**Causes**:
- Camera in use by another app
- Browser doesn't support getUserMedia
- HTTPS required (camera only works on HTTPS/localhost)

**Solutions**:
1. Close other apps using camera
2. Use modern browser (Chrome, Firefox, Edge)
3. Ensure site is HTTPS or localhost

---

## 🔐 Security Considerations

### 1. Authentication & Authorization
- All endpoints protected with `withAdminAuth`
- Only admin/hr/manager can manage employees
- Only admin/hr/manager can enroll faces

### 2. Data Privacy
- Face embeddings stored as numerical descriptors, not images
- No actual photos saved
- Embeddings encrypted in database
- User data follows GDPR guidelines

### 3. Input Validation
- All inputs validated with Zod schemas
- Email uniqueness enforced
- Descriptor format strictly validated
- SQL injection protected

---

## 📊 Database Schema

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  position VARCHAR(100),
  employee_id VARCHAR(50),
  phone VARCHAR(20),
  address TEXT,
  start_date DATE,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### face_embeddings table
```sql
CREATE TABLE face_embeddings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,  -- 128-dimensional array
  quality FLOAT DEFAULT 0.8,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX idx_face_embeddings_is_active ON face_embeddings(is_active);
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Verify all API endpoints respond correctly
- [ ] Test employee CRUD operations
- [ ] Test face enrollment flow end-to-end
- [ ] Check camera permissions on production domain
- [ ] Ensure HTTPS enabled (required for camera)
- [ ] Verify face-api.js models accessible
- [ ] Test on multiple browsers/devices

### Post-Deployment Monitoring
- [ ] Monitor API error rates
- [ ] Track enrollment success rate
- [ ] Monitor face recognition accuracy
- [ ] Check database growth (embeddings)
- [ ] Set up alerts for high error rates

---

## 📚 Related Documentation

- `FACE_RECOGNITION_FIX_SUMMARY.md` - Face recognition timeout fixes
- `FACE_RECOGNITION_ERROR_HANDLING.md` - Error handling guide
- `FACE_RECOGNITION_DEBUG_GUIDE.md` - Debug procedures
- `QUICK_FACE_RECOGNITION_CHECKLIST.md` - Quick testing guide

---

## 🔄 Recent Changes

### December 2024
- ✅ Fixed field name mismatch in `face-service.ts` (embedding → descriptor)
- ✅ Added comprehensive error handling in face enrollment
- ✅ Improved UI feedback during enrollment process
- ✅ Added timeout protection for all face operations
- ✅ Enhanced employee management with bulk operations

---

**Status**: ✅ Production Ready
**Last Updated**: December 2024
**Priority**: HIGH - Core business functionality
