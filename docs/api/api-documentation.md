# API Documentation

This document provides comprehensive information about the Attendance System REST API, including endpoints, authentication, request/response formats, and error handling.

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Common Response Format](#common-response-format)
5. [Error Handling](#error-handling)
6. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Attendance](#attendance-endpoints)
   - [Face Recognition](#face-recognition-endpoints)
   - [Sync](#sync-endpoints)
   - [System](#system-endpoints)
7. [Webhooks](#webhooks)
8. [SDKs and Libraries](#sdks-and-libraries)

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

The API uses JSON Web Tokens (JWT) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to get a new access token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Token Structure

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["attendance:read", "attendance:write"],
  "iat": 1640995200,
  "exp": 1640998800
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **File upload endpoints**: 20 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Common Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {
      // Additional error details
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request data validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `FACE_RECOGNITION_ERROR` | Face recognition processing failed |
| `SYNC_CONFLICT` | Data synchronization conflict |
| `STORAGE_QUOTA_EXCEEDED` | Storage quota exceeded |

## API Endpoints

### Authentication Endpoints

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "avatar": "https://example.com/avatar.jpg",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 3600
    }
  }
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token",
    "expiresIn": 3600
  }
}
```

#### Register

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "User registered successfully"
}
```

### Users Endpoints

#### Get Current User

```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar": "https://example.com/avatar.jpg",
    "permissions": ["attendance:read", "attendance:write"],
    "settings": {
      "notifications": true,
      "theme": "light"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User Profile

```http
PUT /api/users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg",
  "settings": {
    "notifications": false,
    "theme": "dark"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Smith",
    "avatar": "https://example.com/new-avatar.jpg",
    "settings": {
      "notifications": false,
      "theme": "dark"
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

#### Get Users (Admin Only)

```http
GET /api/users?page=1&limit=20&search=john&role=user
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search term for name/email
- `role` (string): Filter by role (user, admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "user",
        "avatar": "https://example.com/avatar.jpg",
        "isActive": true,
        "lastLogin": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### Attendance Endpoints

#### Get Attendance Records

```http
GET /api/attendance?userId=user-id&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (string): Filter by user ID (admin only)
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `status` (string): Filter by status (present, absent, late)
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "attendance-id",
        "userId": "user-id",
        "date": "2024-01-01",
        "checkIn": "2024-01-01T09:00:00.000Z",
        "checkOut": "2024-01-01T17:00:00.000Z",
        "status": "present",
        "location": "Office",
        "notes": "Regular workday",
        "syncStatus": "synced",
        "createdAt": "2024-01-01T09:00:00.000Z",
        "updatedAt": "2024-01-01T17:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    },
    "summary": {
      "totalDays": 25,
      "presentDays": 23,
      "absentDays": 2,
      "lateDays": 3
    }
  }
}
```

#### Create Attendance Record

```http
POST /api/attendance
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-01",
  "checkIn": "2024-01-01T09:00:00.000Z",
  "checkOut": "2024-01-01T17:00:00.000Z",
  "status": "present",
  "location": "Office",
  "notes": "Regular workday"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "attendance-id",
    "userId": "user-id",
    "date": "2024-01-01",
    "checkIn": "2024-01-01T09:00:00.000Z",
    "checkOut": "2024-01-01T17:00:00.000Z",
    "status": "present",
    "location": "Office",
    "notes": "Regular workday",
    "syncStatus": "pending",
    "createdAt": "2024-01-01T09:00:00.000Z",
    "updatedAt": "2024-01-01T09:00:00.000Z"
  },
  "message": "Attendance record created successfully"
}
```

#### Update Attendance Record

```http
PUT /api/attendance/{id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "checkOut": "2024-01-01T18:00:00.000Z",
  "notes": "Overtime work"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "attendance-id",
    "checkOut": "2024-01-01T18:00:00.000Z",
    "notes": "Overtime work",
    "updatedAt": "2024-01-01T18:00:00.000Z"
  },
  "message": "Attendance record updated successfully"
}
```

#### Delete Attendance Record

```http
DELETE /api/attendance/{id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance record deleted successfully"
}
```

### Face Recognition Endpoints

#### Enroll Face

```http
POST /api/face-recognition/enroll
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
- `image`: Face image file (JPEG/PNG, max 5MB)
- `userId`: User ID (optional, defaults to current user)

**Response:**
```json
{
  "success": true,
  "data": {
    "faceId": "face-id",
    "userId": "user-id",
    "encoding": "base64-encoded-face-data",
    "confidence": 0.95,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Face enrolled successfully"
}
```

#### Verify Face

```http
POST /api/face-recognition/verify
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
- `image`: Face image file (JPEG/PNG, max 5MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "userId": "user-id",
    "confidence": 0.92,
    "matchedAt": "2024-01-01T09:00:00.000Z"
  },
  "message": "Face verified successfully"
}
```

#### Delete Face Data

```http
DELETE /api/face-recognition/{faceId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Face data deleted successfully"
}
```

### Sync Endpoints

#### Get Sync Status

```http
GET /api/sync/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isOnline": true,
    "lastSync": "2024-01-01T00:00:00.000Z",
    "pendingOperations": 5,
    "conflicts": 0,
    "syncInProgress": false
  }
}
```

#### Trigger Sync

```http
POST /api/sync/trigger
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "sync-id",
    "startedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Sync started successfully"
}
```

#### Get Sync History

```http
GET /api/sync/history?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncs": [
      {
        "id": "sync-id",
        "type": "full",
        "status": "completed",
        "startedAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:05:00.000Z",
        "recordsProcessed": 150,
        "errors": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### System Endpoints

#### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "storage": "healthy",
      "faceRecognition": "healthy"
    }
  }
}
```

#### System Metrics

```http
GET /api/metrics
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "cpu": 45.2,
      "memory": 67.8,
      "disk": 23.4
    },
    "usage": {
      "activeUsers": 25,
      "totalAttendance": 1500,
      "apiRequests": 5000
    },
    "errors": {
      "rate": 0.02,
      "total": 10
    }
  }
}
```

## Webhooks

The system supports webhooks for real-time notifications:

### Configure Webhook

```http
POST /api/webhooks
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "url": "https://your-webhook-url.com/endpoint",
  "events": ["attendance.created", "user.updated"],
  "secret": "webhook-secret"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook-id",
    "url": "https://your-webhook-url.com/endpoint",
    "events": ["attendance.created", "user.updated"],
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Webhook configured successfully"
}
```

### Webhook Payload

```json
{
  "event": "attendance.created",
  "data": {
    "id": "attendance-id",
    "userId": "user-id",
    "status": "present"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "signature": "sha256=signature"
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @attendance-system/sdk
```

```javascript
import { AttendanceClient } from '@attendance-system/sdk';

const client = new AttendanceClient({
  baseURL: 'https://your-domain.com/api',
  token: 'your-jwt-token'
});

// Get attendance records
const records = await client.attendance.getRecords({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Create attendance record
const record = await client.attendance.create({
  date: '2024-01-01',
  checkIn: new Date(),
  status: 'present'
});
```

### Python

```bash
pip install attendance-system-sdk
```

```python
from attendance_system import AttendanceClient

client = AttendanceClient(
    base_url='https://your-domain.com/api',
    token='your-jwt-token'
)

# Get attendance records
records = client.attendance.get_records(
    start_date='2024-01-01',
    end_date='2024-01-31'
)

# Create attendance record
record = client.attendance.create(
    date='2024-01-01',
    check_in=datetime.now(),
    status='present'
)
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Security**: Store tokens securely and refresh them regularly
3. **Input Validation**: All inputs are validated and sanitized
4. **Rate Limiting**: Respect rate limits to avoid being blocked
5. **Permissions**: Only request permissions you need
6. **Data Privacy**: Handle user data according to privacy regulations

## Testing

### Testing Endpoints

Use the provided test endpoints for development:

```http
POST /api/test/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test-password"
}
```

### Mock Data

For testing purposes, you can use the mock data endpoints:

```http
GET /api/test/mock/attendance
GET /api/test/mock/users
POST /api/test/mock/attendance
```

## Changelog

### Version 1.0.0
- Initial API release
- Authentication endpoints
- Attendance management
- Face recognition
- Sync functionality
- System monitoring

---

For additional support or questions, please contact our API support team at api-support@your-domain.com.