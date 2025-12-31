# Admin Panel Documentation

## 📋 Overview

The Admin Panel is a **web-based dashboard** (separate from the mobile app) that allows administrators to manage:
- Payments & Subscriptions
- Refunds
- Users
- Analytics & Reports
- Content Moderation

**Recommendation:** Build as a **separate web application** (React/Vue dashboard) that connects to these admin APIs. This is more practical than in-app admin features.

---

## 🔐 Admin Authentication

### Creating Admin Account

**First Time Setup:**
```bash
cd server
node src/scripts/createAdmin.js admin@pryvo.com password123 "Admin Name"
```

This creates a super admin with all permissions.

### Admin Login

**Endpoint:** `POST /api/admin/login`

**Request:**
```json
{
  "email": "admin@pryvo.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "admin": {
    "id": "admin_123",
    "email": "admin@pryvo.com",
    "name": "Admin Name",
    "role": "super_admin",
    "permissions": [...]
  },
  "token": "jwt_token_here"
}
```

**Use the token in subsequent requests:**
```
Authorization: Bearer <token>
```

---

## 💳 Payment & Subscription Management

### Get All Subscriptions

**Endpoint:** `GET /api/admin/subscriptions`

**Query Parameters:**
- `status` - Filter by status (active, cancelled, expired, refunded)
- `userId` - Filter by user ID
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Example:**
```
GET /api/admin/subscriptions?status=active&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "subscriptions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Subscription Details

**Endpoint:** `GET /api/admin/subscriptions/:subscriptionId`

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "userId": "user_456",
    "planId": "1month",
    "status": "active",
    "price": 1699,
    "currency": "INR",
    "expiresAt": "2025-02-15T00:00:00.000Z",
    "autoRenew": true,
    "transactionId": "pay_789",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### Process Refund

**Endpoint:** `POST /api/admin/subscriptions/:subscriptionId/refund`

**Request:**
```json
{
  "amount": 1699,  // Optional: full refund if not specified
  "reason": "Customer requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "refund": {
    "refundId": "refund_123",
    "amount": 1699,
    "subscriptionId": "sub_123"
  }
}
```

**What happens:**
1. Refund is processed through payment gateway
2. Subscription status changes to "refunded"
3. User's premium status is revoked
4. Refund details are recorded

### Cancel Subscription (Admin)

**Endpoint:** `POST /api/admin/subscriptions/:subscriptionId/cancel`

**Request:**
```json
{
  "reason": "Policy violation"
}
```

### Get Payment Statistics

**Endpoint:** `GET /api/admin/payments/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 500,
    "active": 350,
    "cancelled": 50,
    "expired": 80,
    "refunded": 20,
    "totalRevenue": 850000,
    "monthlyRevenue": 150000,
    "byPlan": {
      "1month": {"count": 200, "revenue": 339800},
      "3months": {"count": 100, "revenue": 349900},
      "6months": {"count": 50, "revenue": 244950}
    }
  }
}
```

---

## 👥 User Management

### Get All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `search` - Search by email, name, or phone
- `isPremium` - Filter by premium status (true/false)

**Example:**
```
GET /api/admin/users?search=john&isPremium=true&page=1&limit=20
```

### Get User Details

**Endpoint:** `GET /api/admin/users/:userId`

**Response includes:**
- User profile information
- All user's subscriptions
- Account status

### Suspend/Activate User

**Endpoint:** `POST /api/admin/users/:userId/suspend`

**Request:**
```json
{
  "suspended": true,
  "reason": "Violation of terms"
}
```

### Delete User

**Endpoint:** `DELETE /api/admin/users/:userId`

**Request:**
```json
{
  "reason": "Account deletion requested"
}
```

---

## 📊 Analytics & Dashboard

### Get Dashboard Analytics

**Endpoint:** `GET /api/admin/dashboard/analytics`

**Response:**
```json
{
  "success": true,
  "analytics": {
    "users": {
      "total": 10000,
      "active": 9500,
      "suspended": 500,
      "premium": 1500,
      "newLast30Days": 500
    },
    "subscriptions": {
      "total": 2000,
      "active": 1500,
      "revenue": {
        "total": 3400000,
        "last30Days": 500000
      }
    },
    "plans": [
      {
        "id": "1month",
        "name": "1 Month Premium",
        "price": 1699,
        "count": 1000
      }
    ]
  }
}
```

---

## 🔒 Permissions System

### Available Permissions

- `view_users` - View user list and details
- `manage_users` - Suspend, activate, delete users
- `view_subscriptions` - View subscriptions and payments
- `manage_subscriptions` - Cancel subscriptions
- `process_refunds` - Process refunds
- `view_reports` - View user reports
- `moderate_content` - Moderate profiles and content
- `view_analytics` - View analytics dashboard

### Admin Roles

- **super_admin** - Has all permissions
- **admin** - Standard admin with assigned permissions
- **moderator** - Limited permissions (content moderation only)

---

## 🌐 Web Dashboard Implementation

### Recommended Stack

**Frontend:**
- React + TypeScript
- Material-UI or Ant Design
- React Query for API calls
- React Router for navigation

**Example Structure:**
```
admin-dashboard/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Subscriptions.jsx
│   │   ├── Users.jsx
│   │   └── Analytics.jsx
│   ├── services/
│   │   └── adminApi.js
│   └── components/
│       ├── SubscriptionTable.jsx
│       ├── UserCard.jsx
│       └── RefundModal.jsx
```

### API Client Example

```javascript
// adminApi.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api.com/api/admin',
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  login: (email, password) => api.post('/login', {email, password}),
  getSubscriptions: (params) => api.get('/subscriptions', {params}),
  processRefund: (subscriptionId, data) => 
    api.post(`/subscriptions/${subscriptionId}/refund`, data),
  getUsers: (params) => api.get('/users', {params}),
  getAnalytics: () => api.get('/dashboard/analytics'),
};
```

---

## 🚀 Quick Start

### 1. Create Admin Account

```bash
cd server
node src/scripts/createAdmin.js admin@pryvo.com SecurePassword123 "Admin Name"
```

### 2. Test Login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pryvo.com","password":"SecurePassword123"}'
```

### 3. Use Token for Admin Requests

```bash
curl -X GET http://localhost:3000/api/admin/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Features Implemented

- ✅ Admin authentication (JWT)
- ✅ Permission-based access control
- ✅ View all subscriptions
- ✅ Process refunds
- ✅ Cancel subscriptions
- ✅ Payment statistics
- ✅ User management (view, suspend, delete)
- ✅ Dashboard analytics
- ✅ Search and filtering
- ✅ Pagination

---

## 📝 Notes

- **Web-based recommended:** Admin panel should be a separate web app, not in the mobile app
- **Security:** All admin endpoints require authentication token
- **Permissions:** Fine-grained permission system for different admin roles
- **Refunds:** Integrated with payment service (ready for Razorpay/Stripe)
- **Analytics:** Real-time dashboard with key metrics

---

## 🔄 Next Steps

1. **Build Web Dashboard:**
   - Create React/Vue admin dashboard
   - Connect to admin APIs
   - Add charts for analytics

2. **Add More Features:**
   - Content moderation endpoints
   - Report handling
   - Email notifications for admin actions
   - Audit logs

3. **Security Enhancements:**
   - Two-factor authentication
   - IP whitelisting
   - Rate limiting for admin endpoints

