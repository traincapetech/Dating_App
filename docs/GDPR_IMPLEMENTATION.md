# GDPR Compliance Implementation

## Overview

This document describes the GDPR compliance features implemented in the Pryvo dating app backend.

## ✅ Implemented Features

### 1. Right to Data Portability (Article 20)
**Endpoint:** `GET /api/gdpr/export` or `GET /api/gdpr/export/:userId`

Users can export all their personal data in a structured, machine-readable format (JSON).

**What's included:**
- User account information
- Complete profile data
- All matches
- All messages (sent and received)
- Likes (sent and received)
- Passes
- Blocks
- Reports
- Subscriptions
- Notification tokens
- Metadata and statistics

**Usage:**
```bash
# User exports their own data
GET /api/gdpr/export
Authorization: Bearer <token>

# Admin exports any user's data
GET /api/gdpr/export/:userId
Authorization: Bearer <admin_token>
```

**Response:**
- JSON file download with complete user data
- Includes export timestamp
- Machine-readable format

---

### 2. Right to Erasure (Article 17)
**Endpoint:** `POST /api/gdpr/delete-request`

Users can request deletion of their personal data with a grace period for account recovery.

**Features:**
- 30-day grace period (configurable)
- Profile paused during grace period
- Can be cancelled before deletion date
- Complete data deletion after grace period

**Usage:**
```bash
POST /api/gdpr/delete-request
Authorization: Bearer <token>
Content-Type: application/json

{
  "gracePeriodDays": 30  // Optional, default: 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data deletion request received. Your account will be permanently deleted after the grace period.",
  "deletionDate": "2024-02-15T00:00:00.000Z",
  "gracePeriodDays": 30,
  "canCancelUntil": "2024-02-15T00:00:00.000Z"
}
```

---

### 3. Cancel Scheduled Deletion
**Endpoint:** `POST /api/gdpr/cancel-deletion`

Users can cancel their scheduled deletion during the grace period.

**Usage:**
```bash
POST /api/gdpr/cancel-deletion
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduled deletion cancelled successfully"
}
```

---

### 4. Immediate Deletion (Admin Only)
**Endpoint:** `DELETE /api/gdpr/delete-immediate/:userId`

Admin can immediately delete user data (bypasses grace period).

**Usage:**
```bash
DELETE /api/gdpr/delete-immediate/:userId
Authorization: Bearer <admin_token>
```

---

## 🔄 Automated Deletion Process

### Cron Job
A daily cron job runs at 2:00 AM to process scheduled deletions:

**Location:** `server/src/scripts/gdprDeletionCron.js`

**What it does:**
1. Finds all users scheduled for deletion (grace period passed)
2. Permanently deletes:
   - User account
   - Profile data
   - All media files from storage
   - All matches
   - All messages
   - All likes/passes
   - All blocks/reports
   - All subscriptions
   - All notification tokens
   - All other related data

**Manual execution:**
```bash
node server/src/scripts/gdprDeletionCron.js
```

**Scheduled execution:**
- Automatically runs daily at 2:00 AM via node-cron
- Can be configured in `server/src/index.js`

---

## 📋 Data Deletion Policy

### Grace Period
- **Default:** 30 days
- **Purpose:** Allow users to recover their account
- **During grace period:**
  - Profile is paused (not visible to others)
  - User can cancel deletion
  - Data is retained but hidden

### After Grace Period
- All data is permanently deleted
- Cannot be recovered
- Includes:
  - User account
  - Profile
  - Media files
  - All relationships (matches, messages, etc.)

### Data Retention
- Active accounts: Retained indefinitely
- Deleted accounts: Removed after grace period
- Inactive accounts: Can be scheduled for deletion (future enhancement)

---

## 🔒 Security & Authorization

### Access Control
- Users can only export/delete their own data
- Admins can access any user's data
- All endpoints require authentication

### Data Protection
- All endpoints use JWT authentication
- User ID verification on all requests
- Admin role check for admin-only operations

---

## 📊 GDPR Compliance Checklist

✅ **Right to Access (Article 15)**
- Users can export all their data via `/api/gdpr/export`

✅ **Right to Data Portability (Article 20)**
- Data export in machine-readable JSON format
- Includes all user data

✅ **Right to Erasure (Article 17)**
- Users can request data deletion
- Grace period for account recovery
- Complete data deletion after grace period

✅ **Right to Rectification (Article 16)**
- Users can update their profile data
- Existing profile update endpoints

✅ **Data Minimization (Article 5)**
- Only necessary data is collected
- Data is deleted when no longer needed

✅ **Storage Limitation (Article 5)**
- Data retention policy implemented
- Automated deletion after grace period

---

## 🚀 Future Enhancements

1. **Right to Object (Article 21)**
   - Allow users to object to data processing
   - Opt-out of certain data uses

2. **Right to Restriction (Article 18)**
   - Temporarily restrict data processing
   - Keep data but don't process it

3. **Data Breach Notification**
   - Notify users of data breaches
   - Log security incidents

4. **Privacy Dashboard**
   - Frontend UI for GDPR requests
   - Data export/download interface
   - Deletion request management

5. **Audit Logging**
   - Log all GDPR requests
   - Track data access and modifications
   - Compliance reporting

---

## 📝 API Documentation

### Export Data
```http
GET /api/gdpr/export
Authorization: Bearer <token>
```

### Request Deletion
```http
POST /api/gdpr/delete-request
Authorization: Bearer <token>
Content-Type: application/json

{
  "gracePeriodDays": 30
}
```

### Cancel Deletion
```http
POST /api/gdpr/cancel-deletion
Authorization: Bearer <token>
```

### Immediate Deletion (Admin)
```http
DELETE /api/gdpr/delete-immediate/:userId
Authorization: Bearer <admin_token>
```

---

## 🔧 Configuration

### Grace Period
Default: 30 days
Can be customized per request via `gracePeriodDays` parameter

### Cron Schedule
Default: Daily at 2:00 AM
Can be modified in `server/src/index.js`

---

## ✅ Testing

### Test Data Export
```bash
curl -X GET http://localhost:3000/api/gdpr/export \
  -H "Authorization: Bearer <user_token>"
```

### Test Deletion Request
```bash
curl -X POST http://localhost:3000/api/gdpr/delete-request \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"gracePeriodDays": 30}'
```

### Test Cancel Deletion
```bash
curl -X POST http://localhost:3000/api/gdpr/cancel-deletion \
  -H "Authorization: Bearer <user_token>"
```

---

## 📚 References

- [GDPR Official Text](https://gdpr-info.eu/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)

