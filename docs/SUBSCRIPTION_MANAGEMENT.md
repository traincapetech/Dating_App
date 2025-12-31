# Subscription Management Guide

## 📋 Table of Contents
1. [Price Management](#price-management)
2. [Payment Integration](#payment-integration)
3. [Auto-Renewal System](#auto-renewal-system)
4. [Premium Features](#premium-features)
5. [Testing Subscriptions](#testing-subscriptions)

---

## 💰 Price Management

### Where to Change Prices

**Location:** `server/src/config/subscriptionPlans.js`

This is the **single source of truth** for all subscription pricing. Update prices here and they will automatically reflect across:
- Backend API responses
- Frontend subscription screen
- Payment processing

### How to Update Prices

1. Open `server/src/config/subscriptionPlans.js`
2. Modify the `price` field for the desired plan:

```javascript
export const SUBSCRIPTION_PLANS = {
  '1month': {
    id: '1month',
    name: '1 Month Premium',
    label: '1 month',
    duration: 30,
    price: 1699,  // ← Change this price
    currency: 'INR',
    period: 'mo',
    popular: true,
    features: [...],
  },
  // ... other plans
};
```

3. **Restart the server** for changes to take effect

### Price Structure

- **1 Week**: ₹899
- **1 Month**: ₹1,699 (Popular)
- **3 Months**: ₹3,499 (Save 50%)
- **6 Months**: ₹4,899 (Save 79%)

---

## 💳 Payment Integration

### Current Status

**Payment Gateway:** Placeholder (Ready for Razorpay/Stripe integration)

### Integration Steps

#### For Razorpay (Recommended for India):

1. **Install Razorpay SDK:**
```bash
npm install razorpay
```

2. **Update `server/src/services/paymentService.js`:**
```javascript
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function createPaymentOrder(userId, planId, amount, currency = 'INR') {
  const options = {
    amount: amount, // in paise
    currency: currency,
    receipt: `receipt_${userId}_${Date.now()}`,
    notes: {
      userId,
      planId,
    },
  };
  
  const order = await razorpay.orders.create(options);
  return {
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    // Return order object for frontend
  };
}

export async function verifyPayment(orderId, paymentId, signature) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(orderId + '|' + paymentId);
  const generatedSignature = hmac.digest('hex');
  
  return {
    success: generatedSignature === signature,
    verified: generatedSignature === signature,
    paymentId,
    orderId,
  };
}
```

3. **Add Environment Variables:**
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

4. **Frontend Integration:**
   - Install Razorpay React Native SDK
   - Update `SubscriptionUpsellScreen.jsx` to use Razorpay Checkout

#### For Stripe (International):

Similar process but using Stripe SDK instead.

---

## 🔄 Auto-Renewal System

### How It Works

1. **Subscription Creation:**
   - When a subscription is created, `autoRenew` is set to `true` by default
   - Subscription includes `expiresAt` date

2. **Renewal Process:**
   - Cron job runs daily (configured in `server/src/scripts/subscriptionRenewalCron.js`)
   - Checks subscriptions expiring within 24 hours
   - Attempts to charge saved payment method
   - Extends subscription if payment succeeds
   - Marks as `payment_failed` if payment fails

3. **User Control:**
   - Users can enable/disable auto-renewal via API:
   ```
   POST /api/subscription/auto-renew/:subscriptionId
   Body: { enabled: true/false }
   ```

### Setting Up Cron Job

**Option 1: Using node-cron (Recommended)**

```javascript
// server/src/index.js
import cron from 'node-cron';
import runRenewalCron from './scripts/subscriptionRenewalCron.js';

// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  runRenewalCron();
});
```

**Option 2: Using PM2**

```bash
pm2 start server/src/scripts/subscriptionRenewalCron.js --cron "0 0 * * *"
```

**Option 3: Using System Cron**

```bash
# Add to crontab
0 0 * * * cd /path/to/project && node server/src/scripts/subscriptionRenewalCron.js
```

---

## ✨ Premium Features

### Available Features

All features are automatically gated based on subscription status:

1. **Unlimited Likes** (`unlimited_likes`)
   - Free: 50 likes/day
   - Premium: Unlimited

2. **See Who Liked You** (`see_who_liked_you`)
   - Free: Count only (if `LIKES_VISIBLE_FREE = false`)
   - Premium: Full list with profiles

3. **Advanced Filters** (`advanced_filters`)
   - Premium only

4. **Priority Matching** (`priority_matching`)
   - Premium only

5. **Boost Profile** (`boost_profile`)
   - 3+ month plans only

6. **Undo Swipe** (`undo_swipe`)
   - 6 month plan only

### Feature Gating

**Backend:** Automatically checked in:
- `likeController.js` - Unlimited likes
- `likeController.js` - See who liked you
- All premium features check `isUserPremium(userId)`

**Frontend:** Use `premiumUtils.js`:
```javascript
import {isUserPremium, hasPremiumFeature, PREMIUM_FEATURES} from '../utils/premiumUtils';

// Check if user is premium
const isPremium = await isUserPremium();

// Check specific feature
const canBoost = await hasPremiumFeature(PREMIUM_FEATURES.BOOST_PROFILE);
```

---

## 🧪 Testing Subscriptions

### Test Subscription Creation (Bypass Payment)

```bash
POST /api/subscription/create
{
  "userId": "user123",
  "planId": "1month",
  "paymentMethod": "test",
  "transactionId": "test_123",
  "autoRenew": true
}
```

### Check Subscription Status

```bash
GET /api/subscription/status/:userId
```

### Verify Premium Features

1. Create test subscription
2. Check `isPremium` status
3. Test unlimited likes (should not hit limit)
4. Test "see who liked you" (should show full list)

---

## 📊 API Endpoints

### Subscription Management

- `GET /api/subscription/plans` - Get all available plans
- `GET /api/subscription/status/:userId` - Get user's subscription status
- `POST /api/subscription/payment/order` - Create payment order
- `POST /api/subscription/payment/verify` - Verify payment and create subscription
- `POST /api/subscription/create` - Create subscription (testing)
- `POST /api/subscription/cancel/:subscriptionId` - Cancel subscription
- `POST /api/subscription/auto-renew/:subscriptionId` - Enable/disable auto-renewal

---

## 🔧 Configuration

### Environment Variables

```env
# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Or Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Feature Flags

In `server/src/controllers/likeController.js`:
```javascript
const LIKES_VISIBLE_FREE = true; // Set to false to require premium
```

---

## ✅ Checklist for Production

- [ ] Integrate payment gateway (Razorpay/Stripe)
- [ ] Set up cron job for auto-renewal
- [ ] Configure environment variables
- [ ] Test payment flow end-to-end
- [ ] Test auto-renewal process
- [ ] Set `LIKES_VISIBLE_FREE = false` if monetizing
- [ ] Add payment webhook handlers
- [ ] Set up payment failure notifications
- [ ] Test subscription cancellation
- [ ] Verify all premium features are gated

---

## 📝 Notes

- Prices are managed in one place: `server/src/config/subscriptionPlans.js`
- Auto-renewal requires payment gateway integration
- All premium features automatically check subscription status
- Frontend and backend are fully integrated
- Payment processing is ready for Razorpay/Stripe integration

