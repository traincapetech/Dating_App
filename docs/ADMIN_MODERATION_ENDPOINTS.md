# Admin Moderation & Report Handling Endpoints

## 📋 Overview

This document describes the backend API endpoints for **Profile Moderation** and **Report Handling** in the Admin Panel. These endpoints are designed to be used by a web-based admin dashboard.

---

## 🔐 Authentication

All endpoints require admin authentication via JWT token in the Authorization header:

```
Authorization: Bearer <admin_jwt_token>
```

**Required Permissions:**
- `view_reports` - For report management endpoints
- `moderate_content` - For profile moderation endpoints

---

## 📊 REPORT MANAGEMENT ENDPOINTS

### 1. Get All Reports

**Endpoint:** `GET /api/admin/reports`

**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `reviewed`, `resolved`, `dismissed`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Example Request:**
```
GET /api/admin/reports?status=pending&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "report_123",
      "reporterId": "user_456",
      "reportedId": "user_789",
      "matchId": "match_abc",
      "reason": "harassment",
      "description": "User sent inappropriate messages",
      "status": "pending",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "resolvedAt": null,
      "reporter": {
        "id": "user_456",
        "email": "reporter@example.com",
        "fullName": "John Doe",
        "photo": "https://..."
      },
      "reported": {
        "id": "user_789",
        "email": "reported@example.com",
        "fullName": "Jane Smith",
        "photo": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Report Reasons:**
- `harassment`
- `spam`
- `inappropriate_content`
- `fake_profile`
- `underage`
- `other`

**Report Statuses:**
- `pending` - Awaiting review
- `reviewed` - Under review
- `resolved` - Action taken
- `dismissed` - No action needed

---

### 2. Get Report Details

**Endpoint:** `GET /api/admin/reports/:reportId`

**Example Request:**
```
GET /api/admin/reports/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "507f1f77bcf86cd799439011",
    "reporterId": "user_456",
    "reportedId": "user_789",
    "matchId": "match_abc",
    "reason": "harassment",
    "description": "User sent inappropriate messages repeatedly",
    "status": "pending",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "resolvedAt": null,
    "adminNotes": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "reporter": {
      "id": "user_456",
      "email": "reporter@example.com",
      "fullName": "John Doe",
      "photo": "https://..."
    },
    "reported": {
      "id": "user_789",
      "email": "reported@example.com",
      "fullName": "Jane Smith",
      "photo": "https://..."
    }
  }
}
```

---

### 3. Update Report Status

**Endpoint:** `PUT /api/admin/reports/:reportId/status`

**Request Body:**
```json
{
  "status": "resolved",
  "adminNotes": "User has been warned and profile reviewed. No further action needed."
}
```

**Status Values:**
- `pending` - Reset to pending
- `reviewed` - Mark as under review
- `resolved` - Mark as resolved (action taken)
- `dismissed` - Dismiss the report (no action)

**Example Request:**
```
PUT /api/admin/reports/507f1f77bcf86cd799439011/status
Content-Type: application/json

{
  "status": "resolved",
  "adminNotes": "User warned. Profile reviewed and found compliant."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report status updated successfully"
}
```

**What Happens:**
- Status is updated
- `resolvedAt` is set automatically if status is `resolved`
- `reviewedBy` is set to current admin ID
- `reviewedAt` is set to current timestamp
- `adminNotes` are saved for future reference

---

## 👤 PROFILE MODERATION ENDPOINTS

### 1. Get Pending Profiles

**Endpoint:** `GET /api/admin/profiles/pending`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Description:**
Returns profiles that need moderation (new profiles without moderation status, flagged profiles, or profiles with pending status).

**Example Request:**
```
GET /api/admin/profiles/pending?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "profile_123",
      "userId": "user_456",
      "basicInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "dob": "1995-05-15",
        "gender": "Man"
      },
      "media": {
        "media": [
          {
            "url": "https://...",
            "type": "photo",
            "order": 0
          }
        ]
      },
      "moderationStatus": null,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**Profiles Included:**
- New profiles without `moderationStatus`
- Profiles with `moderationStatus: "flagged"`
- Profiles with `moderationStatus: "pending"`

---

### 2. Get Flagged Profiles

**Endpoint:** `GET /api/admin/profiles/flagged`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Description:**
Returns all profiles that have been flagged for review.

**Example Request:**
```
GET /api/admin/profiles/flagged?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "profile_123",
      "userId": "user_456",
      "basicInfo": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "moderationStatus": "flagged",
      "moderatedAt": "2025-01-14T15:30:00.000Z",
      "moderatedBy": "admin_789",
      "moderationReason": "Suspicious activity reported",
      "adminNotes": "Multiple reports from different users"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### 3. Moderate Profile

**Endpoint:** `POST /api/admin/profiles/:profileId/moderate`

**Note:** `profileId` is the `userId` (not the profile document ID)

**Request Body:**
```json
{
  "action": "approve",
  "reason": "Profile complies with community guidelines",
  "adminNotes": "All photos verified. Profile approved."
}
```

**Action Values:**
- `approve` - Approve the profile (sets `moderationStatus: "approved"`)
- `reject` - Reject the profile (sets `moderationStatus: "rejected"` and suspends user)
- `flag` - Flag for further review (sets `moderationStatus: "flagged"`)

**Example Requests:**

**Approve Profile:**
```
POST /api/admin/profiles/user_456/moderate
Content-Type: application/json

{
  "action": "approve",
  "reason": "Profile verified and compliant",
  "adminNotes": "All photos are appropriate. Bio is clear."
}
```

**Reject Profile:**
```
POST /api/admin/profiles/user_456/moderate
Content-Type: application/json

{
  "action": "reject",
  "reason": "Inappropriate content in photos",
  "adminNotes": "Profile contains explicit images. User suspended."
}
```

**Flag Profile:**
```
POST /api/admin/profiles/user_456/moderate
Content-Type: application/json

{
  "action": "flag",
  "reason": "Suspicious activity",
  "adminNotes": "Multiple reports. Needs further investigation."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile approved successfully"
}
```

**What Happens:**

1. **Approve:**
   - Sets `moderationStatus: "approved"`
   - Records moderation details
   - Profile becomes visible in discovery

2. **Reject:**
   - Sets `moderationStatus: "rejected"`
   - **Automatically suspends the user** (`isSuspended: true`)
   - Sets `suspensionReason` from the `reason` field
   - Profile is hidden from discovery

3. **Flag:**
   - Sets `moderationStatus: "flagged"`
   - Records moderation details
   - Profile remains visible but marked for review

**All Actions Record:**
- `moderatedAt` - Timestamp
- `moderatedBy` - Admin ID
- `moderationReason` - Reason provided
- `adminNotes` - Additional notes

---

## 🔗 Related Endpoints

### Get User Details (for context)
**Endpoint:** `GET /api/admin/users/:userId`

Use this to get full user information when reviewing reports or moderating profiles.

### Suspend User (if needed)
**Endpoint:** `POST /api/admin/users/:userId/suspend`

Use this to suspend a user if moderation action requires it.

---

## 📝 Usage Examples

### Workflow: Reviewing a Report

1. **Get pending reports:**
   ```
   GET /api/admin/reports?status=pending
   ```

2. **Get report details:**
   ```
   GET /api/admin/reports/:reportId
   ```

3. **Get reported user's profile:**
   ```
   GET /api/admin/users/:reportedId
   ```

4. **Update report status:**
   ```
   PUT /api/admin/reports/:reportId/status
   {
     "status": "resolved",
     "adminNotes": "User warned. Profile reviewed."
   }
   ```

5. **If needed, moderate profile:**
   ```
   POST /api/admin/profiles/:reportedId/moderate
   {
     "action": "flag",
     "reason": "Multiple reports",
     "adminNotes": "Keep monitoring"
   }
   ```

### Workflow: Moderating New Profiles

1. **Get pending profiles:**
   ```
   GET /api/admin/profiles/pending
   ```

2. **Review profile details:**
   ```
   GET /api/admin/users/:userId
   ```

3. **Approve or reject:**
   ```
   POST /api/admin/profiles/:userId/moderate
   {
     "action": "approve",
     "reason": "Profile verified",
     "adminNotes": "All good"
   }
   ```

---

## ⚠️ Important Notes

1. **Profile ID vs User ID:**
   - The moderation endpoint uses `userId` (not profile document ID)
   - Use the `userId` field from the profile object

2. **Automatic Suspension:**
   - Rejecting a profile automatically suspends the user
   - Use `POST /api/admin/users/:userId/suspend` to manually suspend if needed

3. **Permissions:**
   - Ensure admin has `view_reports` permission for report endpoints
   - Ensure admin has `moderate_content` permission for moderation endpoints

4. **Pagination:**
   - All list endpoints support pagination
   - Default: 50 items per page
   - Maximum recommended: 100 items per page

5. **Error Responses:**
   ```json
   {
     "success": false,
     "message": "Error description"
   }
   ```

---

## 🚀 Next Steps for Web Admin UI

1. **Reports Dashboard:**
   - List all reports with filters (status, date)
   - View report details with user information
   - Update report status with notes
   - Link to user profiles

2. **Moderation Dashboard:**
   - List pending profiles
   - Review profile details (photos, bio, prompts)
   - Approve/reject/flag with reason
   - View flagged profiles queue

3. **Integration:**
   - Connect reports to user profiles
   - Show report history on user detail page
   - Quick actions (suspend, warn, approve)

---

## 📊 Status Summary

✅ **Backend Complete:**
- All report management endpoints
- All profile moderation endpoints
- User enrichment in responses
- Pagination support
- Permission-based access control

⏳ **Pending:**
- Web admin UI implementation
- Email notifications for moderation actions
- Automated moderation rules (future)

