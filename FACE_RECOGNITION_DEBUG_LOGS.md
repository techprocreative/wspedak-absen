# 📊 FACE RECOGNITION DEBUG LOGGING FOR VERCEL

## Overview
Comprehensive debug logging system untuk face recognition yang akan muncul di Vercel logs untuk monitoring dan troubleshooting.

## Files Created:

### 1. **lib/vercel-logger.ts**
Core logger yang optimized untuk Vercel dengan features:
- Structured logging dengan levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Session tracking untuk correlate logs
- Performance metrics tracking
- Automatic batching untuk client-side logs
- Environment info capture

### 2. **app/api/logs/face-recognition/route.ts**
API endpoint untuk menerima logs dari client-side:
- Edge runtime untuk better performance
- Forwards client logs ke server console (visible di Vercel)
- Batch processing support
- Log level mapping

### 3. **lib/face-recognition-logger.ts**
Specialized logger untuk face recognition dengan methods:
- Model loading lifecycle tracking
- Face detection metrics
- Face matching results
- Attendance actions logging
- Session summaries
- Environment diagnostics

### 4. **app/face-checkin/page-with-debug.tsx**
Example implementation dengan full debug logging

## Usage:

### Basic Implementation:

```typescript
import { 
  frLogger, 
  logFRModelLoading, 
  logFRDetection, 
  logFRMatching,
  logFRAttendance,
  logFRSession 
} from '@/lib/face-recognition-logger'

// Log environment info on start
logFRSession.environment()

// Model loading
logFRModelLoading.start('tinyFaceDetector')
// ... load model ...
logFRModelLoading.success('tinyFaceDetector')

// Face detection
logFRDetection.start()
// ... detect face ...
logFRDetection.detected(0.95, 0.8, 1) // confidence, quality, count

// Face matching
logFRMatching.start(10) // number of candidates
// ... match face ...
logFRMatching.matched('user123', 0.92, 0.6) // userId, confidence, threshold

// Attendance action
logFRAttendance.checkIn('user123', 'John Doe', true)

// Session summary (on unmount)
logFRSession.summary()
```

## Log Format in Vercel:

```
[2024-01-15T10:30:45.123Z] [INFO] [FR-1234567890-abc] Model Loading: start {"action":"model_loading","component":"face-api","metadata":{"model":"tinyFaceDetector"}}
[2024-01-15T10:30:46.456Z] [INFO] [FR-1234567890-abc] Model Loading: success {"action":"model_loading","component":"face-api","metadata":{"model":"tinyFaceDetector","loadTime":1333}}
[2024-01-15T10:30:47.789Z] [INFO] [FR-1234567890-abc] Face Detection: detected {"action":"face_detection","component":"camera","metadata":{"confidence":0.95,"quality":0.8,"faceCount":1,"detectionTime":245}}
[2024-01-15T10:30:48.012Z] [INFO] [FR-1234567890-abc] Face Matching: matched {"action":"face_matching","component":"recognition","userId":"user123","metadata":{"confidence":0.92,"threshold":0.6,"matchingTime":189}}
```

## Environment Variables:

Add to `.env.local`:
```env
# Log levels: DEBUG, INFO, WARN, ERROR, FATAL
NEXT_PUBLIC_LOG_LEVEL=INFO
LOG_LEVEL=INFO
```

## Viewing Logs in Vercel:

1. **Vercel Dashboard:**
   - Go to your project → Functions tab
   - Select the function (e.g., `face-checkin`)
   - View real-time logs

2. **Vercel CLI:**
   ```bash
   vercel logs --follow
   ```

3. **Filter Face Recognition Logs:**
   ```bash
   vercel logs --follow | grep "FR-"
   ```

## Log Analysis Queries:

### Find all errors:
```bash
vercel logs | grep "\[ERROR\].*FR-"
```

### Find slow model loading:
```bash
vercel logs | grep "Model Loading.*loadTime" | jq 'select(.metadata.loadTime > 5000)'
```

### Find low confidence matches:
```bash
vercel logs | grep "Face Matching" | jq 'select(.metadata.confidence < 0.7)'
```

## Performance Monitoring:

The logger tracks key metrics:
- **Model Load Time**: Time to load face-api.js models
- **Detection Time**: Time to detect faces in image
- **Matching Time**: Time to match against database
- **Session Duration**: Total time user spent

Example session summary:
```
📊 Face Recognition Session Summary:
- Duration: 120s
- Model Load Time: 2345ms
- Detections: 15
- Matches: 12
- Errors: 1
```

## Error Tracking:

Critical errors are logged with full context:
```typescript
try {
  // ... face recognition code ...
} catch (error) {
  logFRSession.criticalError(error as Error, 'Face Detection')
  // This will log:
  // - Error message
  // - Stack trace
  // - Context
  // - Environment info
}
```

## Debug Tips:

### 1. Enable Debug Mode:
```typescript
// In development
process.env.NEXT_PUBLIC_LOG_LEVEL = 'DEBUG'
```

### 2. Track Specific User:
```typescript
// Add userId to all logs
vercelLogger.info('Action', {
  userId: 'user123',
  component: 'face-recognition'
})
```

### 3. Measure Performance:
```typescript
const stopTimer = vercelLogger.startTimer('face-detection')
// ... do detection ...
const duration = stopTimer() // Automatically logs duration
```

### 4. Correlate Sessions:
Each session has unique ID format: `FR-{timestamp}-{random}`
Use this to track all logs from one session:
```bash
vercel logs | grep "FR-1704894645123-abc"
```

## Troubleshooting Common Issues:

### Issue: "Initializing AI model" stuck
**Logs to check:**
```bash
vercel logs | grep "Model Loading"
```
Look for:
- Timeout errors
- Network failures
- Missing model files

### Issue: Face not detected
**Logs to check:**
```bash
vercel logs | grep "Face Detection"
```
Look for:
- Low confidence scores
- No face detected warnings
- Camera permission errors

### Issue: Wrong person matched
**Logs to check:**
```bash
vercel logs | grep "Face Matching"
```
Look for:
- Confidence scores
- Threshold values
- Candidate counts

## Integration with Monitoring Services:

### Sentry Integration:
```typescript
import * as Sentry from '@sentry/nextjs'

// In vercel-logger.ts
if (event.level >= LogLevel.ERROR) {
  Sentry.captureException(event.error, {
    tags: {
      component: 'face-recognition',
      sessionId: this.sessionId
    },
    extra: event.context
  })
}
```

### DataDog Integration:
```typescript
// Send metrics to DataDog
if (window.DD_RUM) {
  DD_RUM.addAction('face_recognition', {
    ...event.context,
    duration: event.timing?.duration
  })
}
```

## Best Practices:

1. **Log at appropriate levels:**
   - DEBUG: Detailed flow information
   - INFO: Important events (successful detection, match)
   - WARN: Potential issues (low confidence, retry needed)
   - ERROR: Failures that can be recovered
   - FATAL: Critical failures requiring immediate attention

2. **Include context:**
   Always include relevant context like userId, confidence scores, timing

3. **Use structured logging:**
   Use the provided methods instead of console.log for consistency

4. **Monitor performance:**
   Track timing for all operations to identify bottlenecks

5. **Clean up:**
   Call `logFRSession.summary()` on component unmount

## Testing:

### Local Testing:
```javascript
// In browser console
const testLog = async () => {
  const response = await fetch('/api/logs/face-recognition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      logs: [{
        timestamp: new Date().toISOString(),
        level: 1, // INFO
        message: 'Test log from browser',
        context: { test: true }
      }],
      sessionId: 'test-session'
    })
  })
  console.log('Log sent:', await response.json())
}
testLog()
```

### Verify in Vercel:
```bash
# Should see the test log
vercel logs --follow | grep "test-session"
```

## Migration Guide:

### Replace existing logging:
```typescript
// OLD
console.log('Models loaded')
logger.info('Face detected')

// NEW
logFRModelLoading.success()
logFRDetection.detected(confidence)
```

### Add to existing components:
```typescript
// In face-checkin/page.tsx
import { logFRSession } from '@/lib/face-recognition-logger'

// Add at component start
useEffect(() => {
  logFRSession.environment()
}, [])

// Add at component end
useEffect(() => {
  return () => {
    logFRSession.summary()
  }
}, [])
```

## Status:
✅ Vercel-optimized logger created
✅ Face recognition specific logging implemented
✅ API endpoint for client logs
✅ Example implementation provided
✅ Full documentation

The debug logging system is ready to be deployed and will provide comprehensive visibility into face recognition operations in Vercel logs!
