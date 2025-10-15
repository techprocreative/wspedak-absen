# 🔧 Face Recognition Debug Guide - Step by Step

## 📋 Quick Diagnostic Checklist

Jalankan checks ini satu per satu untuk identify masalah:

### ✅ Step 1: Check Face Models

**Test in Browser Console (F12)**:
```javascript
// Check if models directory accessible
fetch('/models/tiny_face_detector_model-weights_manifest.json')
  .then(r => r.json())
  .then(d => console.log('✅ Models accessible:', d))
  .catch(e => console.error('❌ Models not found:', e))
```

**Expected**: Should show JSON with model info  
**If fails**: Models tidak ada atau path salah

**Fix**: Download models from https://github.com/justadudewhohacks/face-api.js-models

---

### ✅ Step 2: Check Database Face Embeddings

**Test via API**:
```javascript
// Check if any users have enrolled faces
fetch('/api/admin/employees')
  .then(r => r.json())
  .then(d => {
    const usersWithFaces = d.data?.filter(u => u.faceDescriptor)
    console.log('Users with enrolled faces:', usersWithFaces?.length || 0)
    if (!usersWithFaces || usersWithFaces.length === 0) {
      console.error('❌ No users have enrolled faces!')
    } else {
      console.log('✅ Face embeddings exist')
    }
  })
```

**Expected**: At least 1 user dengan face enrolled  
**If fails**: Perlu enroll face dulu

**Fix**: Enroll face via `/admin/face-enrollment` atau `/face-enrollment`

---

### ✅ Step 3: Test Face Detection

**Test in Browser Console**:
```javascript
// Get video element
const video = document.querySelector('video')

if (!video) {
  console.error('❌ Video element not found')
} else {
  console.log('✅ Video element exists')
  
  // Check if face-api loaded
  if (typeof faceapi === 'undefined') {
    console.error('❌ face-api.js not loaded')
  } else {
    console.log('✅ face-api.js loaded')
    
    // Try face detection
    faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()
      .then(detection => {
        if (detection) {
          console.log('✅ Face detected!', {
            confidence: detection.detection.score,
            descriptor: detection.descriptor.length
          })
        } else {
          console.error('❌ No face detected')
        }
      })
      .catch(err => console.error('❌ Detection failed:', err))
  }
}
```

**Expected**: Should detect face dengan confidence > 0.5  
**If fails**: Face detection not working

---

### ✅ Step 4: Test API Endpoint

**Test Identify API**:
```javascript
// Create dummy descriptor for testing
const dummyDescriptor = Array(128).fill(0.5)

fetch('/api/face/identify-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ descriptor: dummyDescriptor })
})
  .then(r => r.json())
  .then(d => {
    console.log('API Response:', d)
    if (d.success) {
      console.log('✅ API working, user identified:', d.data?.userName)
    } else {
      console.error('❌ API error:', d.error)
    }
  })
  .catch(e => console.error('❌ API call failed:', e))
```

**Expected**: Should return user data or "Face not recognized"  
**If fails**: API endpoint bermasalah

---

## 🔍 Common Issues & Solutions

### Issue 1: "No enrolled faces found"

**Symptoms**:
- API returns 404
- Error message: "No enrolled faces found"

**Solution**:
```bash
1. Enroll at least one face first
2. Go to: https://absen.wstoserba.my.id/admin/employees
3. Click user → "Enroll Face"
4. Or use: https://absen.wstoserba.my.id/face-enrollment
```

---

### Issue 2: Models not loading (404 errors)

**Symptoms**:
- Browser console shows: "Failed to load model"
- Network tab shows 404 for /models/

**Solution A - Download Models**:
```bash
1. Go to: https://github.com/justadudewhohacks/face-api.js-models
2. Download these folders:
   - tiny_face_detector
   - face_landmark_68
   - face_recognition
3. Place in: D:\edo\v0-attendance\public\models\
```

**Solution B - Use CDN**:
Update `app/face-checkin/page.tsx`:
```typescript
// Load from CDN instead
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
```

---

### Issue 3: Camera works but no detection

**Symptoms**:
- Camera aktif
- Video stream terlihat
- Tapi stuck di "Identifying..."

**Check Lighting**:
- Pastikan wajah cukup terang
- Hadap langsung ke kamera
- Jarak 30-60cm dari kamera

**Check Face Detection Threshold**:
Lower threshold di `app/face-checkin/page.tsx`:
```typescript
// Line 197 - lower confidence threshold
if (confidence < 0.3) { // Changed from 0.5
  setError('Face detection confidence too low. Please improve lighting.')
  setIdentifying(false)
  return
}
```

---

### Issue 4: Stuck at "Identifying..." forever

**Symptoms**:
- Spinner terus berputar
- Tidak ada error message
- Tidak ada progress

**Root Cause**: Request timeout atau unhandled error

**Fix - Add Timeout Handling**:

Update `app/face-checkin/page.tsx` → `identifyUser()` function:

```typescript
const identifyUser = async () => {
  if (!videoRef.current) return

  setIdentifying(true)
  setError(null)

  // ADD TIMEOUT
  const timeoutId = setTimeout(() => {
    setError('Face identification timeout. Please try again.')
    setIdentifying(false)
  }, 15000) // 15 second timeout

  try {
    logger.info('Identifying user...')

    // ... existing detection code ...

    const response = await ApiClient.identifyFaceStatus({ descriptor })

    // CLEAR TIMEOUT on success
    clearTimeout(timeoutId)

    logger.info('User identified:', { data: response.data })
    setUserStatus(response.data)
    setError(null)
  } catch (err: any) {
    // CLEAR TIMEOUT on error
    clearTimeout(timeoutId)
    
    logger.error('Identification failed', err as Error)
    setError(err.message || 'Failed to identify user. Please try again.')
  } finally {
    setIdentifying(false)
  }
}
```

---

## 🛠️ Advanced Debugging

### Enable Verbose Logging

Add to `app/face-checkin/page.tsx` at top:
```typescript
// Enable debug mode
const DEBUG = true

// Add logging wrapper
const debugLog = (stage: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Face Recognition] ${stage}`, data)
  }
}

// Use throughout code:
debugLog('Models loading started')
debugLog('Face detection started', { videoReady: !!videoRef.current })
debugLog('Face detected', { confidence, descriptor: descriptor.length })
debugLog('API call started', { endpoint: '/api/face/identify-status' })
debugLog('User identified', userStatus)
```

### Monitor Performance

Add performance tracking:
```typescript
const identifyUser = async () => {
  const perfStart = performance.now()
  
  // ... identification code ...
  
  const perfEnd = performance.now()
  console.log(`Identification took ${perfEnd - perfStart}ms`)
}
```

### Check Memory Usage

```javascript
// In browser console
if (performance.memory) {
  console.log({
    usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
    totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
    limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
  })
}
```

---

## 📊 Testing Workflow

### Pre-Deployment Checklist

- [ ] Face models downloaded and placed in `/public/models/`
- [ ] At least 1 user with enrolled face in database
- [ ] Camera permission granted in browser
- [ ] API endpoint `/api/face/identify-status` returns 200
- [ ] Face detection works (console shows detection result)
- [ ] Identification completes within 10 seconds
- [ ] Error states display properly
- [ ] Timeout works (test by blocking API)

### Test Scenarios

**Scenario 1: Happy Path**
1. Load page
2. Grant camera permission
3. Position face in frame
4. Wait for "Welcome, [Name]"
5. See action buttons

**Scenario 2: No Face Enrolled**
1. Load page
2. Grant camera
3. Should show: "Face not recognized. Please enroll first."

**Scenario 3: Poor Lighting**
1. Load page in dark room
2. Should show: "Face detection confidence too low"

**Scenario 4: Network Error**
1. Disconnect internet
2. Should show: "Failed to identify user" after timeout

---

## 🔥 Emergency Quick Fix

Jika semua gagal, gunakan fallback ke manual check-in:

**Add to `app/face-checkin/page.tsx`**:
```typescript
// Add button for fallback
{error && (
  <div className="mt-4">
    <Button
      onClick={() => router.push('/employee/dashboard')}
      variant="outline"
      className="w-full"
    >
      Use Manual Check-In Instead
    </Button>
  </div>
)}
```

---

## 📞 Support Contact

If all else fails:
1. Check FACE_RECOGNITION_ANALYSIS.md for detailed technical analysis
2. Review browser console for specific errors
3. Check Network tab for failed requests
4. Verify database has face embeddings

---

**Last Updated**: December 2024
