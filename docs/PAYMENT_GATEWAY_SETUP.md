# Payment Gateway Setup Guide - Global App

## 🌍 Payment Gateway Recommendation

### For Global App: **Stripe (Primary) + Razorpay (India) + In-App Purchases**

**Why not just Razorpay?**
- ❌ Razorpay is **India-only** (primarily for Indian businesses)
- ❌ Only processes payments in **INR**
- ❌ Limited global reach
- ✅ Great for Indian users (UPI, local payment methods)

**Recommended Multi-Gateway Approach:**
1. **Stripe** - Primary for global users (135+ currencies, worldwide)
2. **Razorpay** - For Indian users (better local payment methods)
3. **In-App Purchases** - For iOS/Android app stores (required for app store compliance)

---

## 💳 Payment Gateway Comparison

| Gateway | Coverage | Currencies | Best For | Setup Complexity |
|---------|----------|------------|----------|-----------------|
| **Stripe** | Global (40+ countries) | 135+ currencies | Global users | Easy |
| **Razorpay** | India only | INR only | Indian users | Easy |
| **In-App Purchase** | Global (via stores) | All (via stores) | Mobile apps | Medium |
| **PayPal** | Global | 25+ currencies | Alternative | Easy |

---

## 🚀 Implementation Strategy

### Option 1: Auto-Detect (Recommended)

**How it works:**
- Detect user's country/currency
- Automatically select best gateway:
  - India (INR) → Razorpay
  - Rest of world → Stripe
  - Mobile apps → In-App Purchase

**Code:**
```javascript
const gateway = detectPaymentGateway(currency, country);
// Returns: 'razorpay' for India, 'stripe' for others
```

### Option 2: User Selection

Let users choose their preferred payment method:
- Credit/Debit Card (Stripe)
- UPI/Net Banking (Razorpay - India only)
- In-App Purchase (iOS/Android)

### Option 3: Platform-Based

- **Web App:** Stripe + Razorpay
- **iOS App:** In-App Purchase (required by Apple)
- **Android App:** In-App Purchase (recommended by Google)

---

## 📦 Stripe Setup (Global - Primary)

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Complete business verification
4. Get API keys from Dashboard

### 2. Install Stripe SDK

```bash
cd server
npm install stripe
```

### 3. Configure Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_... # Test key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Test key
STRIPE_WEBHOOK_SECRET=whsec_... # For webhooks
```

### 4. Update Payment Service

The payment service is already set up with Stripe support. Just uncomment and configure:

```javascript
// In server/src/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeOrder(userId, planId, amount, currency) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // in cents
    currency: currency.toLowerCase(),
    metadata: { userId, planId },
  });
  
  return {
    success: true,
    gateway: 'stripe',
    orderId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    amount,
    currency,
  };
}
```

### 5. Frontend Integration

**React Native:**
```bash
npm install @stripe/stripe-react-native
```

**Example:**
```javascript
import {StripeProvider, useStripe} from '@stripe/stripe-react-native';

// In your subscription screen
const {initPaymentSheet, presentPaymentSheet} = useStripe();

// Initialize payment sheet
await initPaymentSheet({
  paymentIntentClientSecret: clientSecret,
});

// Present payment sheet
const {error} = await presentPaymentSheet();
```

---

## 🇮🇳 Razorpay Setup (India)

### 1. Create Razorpay Account

1. Go to [razorpay.com](https://razorpay.com)
2. Sign up (India business required)
3. Complete KYC
4. Get API keys from Dashboard

### 2. Install Razorpay SDK

```bash
cd server
npm install razorpay
```

### 3. Configure Environment Variables

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret_key
```

### 4. Update Payment Service

Uncomment Razorpay code in `paymentService.js`:

```javascript
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

### 5. Frontend Integration

**React Native:**
```bash
npm install react-native-razorpay
```

---

## 📱 In-App Purchase Setup (iOS/Android)

### Why In-App Purchases?

- **Apple Requirement:** iOS apps MUST use App Store payments
- **Google Recommendation:** Android apps should use Play Billing
- **Better UX:** Native payment flow
- **No Payment Gateway Fees:** Only app store commission

### iOS Setup

1. **App Store Connect:**
   - Create subscription products
   - Set prices for different regions
   - Configure subscription groups

2. **React Native:**
```bash
npm install react-native-iap
```

3. **Product IDs:**
```javascript
const products = [
  'com.pryvo.premium.1week',
  'com.pryvo.premium.1month',
  'com.pryvo.premium.3months',
  'com.pryvo.premium.6months',
];
```

### Android Setup

1. **Google Play Console:**
   - Create subscription products
   - Set prices
   - Configure base plans

2. **React Native:**
```bash
npm install react-native-iap
```

3. **Product IDs:**
```javascript
const products = [
  'premium_1week',
  'premium_1month',
  'premium_3months',
  'premium_6months',
];
```

---

## 🔄 Multi-Gateway Flow

### Backend Flow

```
User selects plan
    ↓
Backend detects currency/country
    ↓
Selects gateway:
  - INR/India → Razorpay
  - Others → Stripe
  - Mobile app → In-App Purchase
    ↓
Create payment order
    ↓
Return gateway-specific data
    ↓
Frontend handles payment
    ↓
Verify payment
    ↓
Create subscription
```

### Frontend Flow

```javascript
// 1. Get payment order from backend
const order = await createPaymentOrder(userId, planId);

// 2. Handle payment based on gateway
if (order.gateway === 'stripe') {
  // Use Stripe SDK
  await stripe.presentPaymentSheet();
} else if (order.gateway === 'razorpay') {
  // Use Razorpay SDK
  await RazorpayCheckout.open(options);
} else if (order.gateway === 'in_app') {
  // Use In-App Purchase
  await RNIap.requestSubscription(productId);
}

// 3. Verify payment
await verifyPaymentAndCreateSubscription(...);
```

---

## 💰 Pricing Strategy

### Multi-Currency Pricing

**Current (INR only):**
- 1 Week: ₹899
- 1 Month: ₹1,699
- 3 Months: ₹3,499
- 6 Months: ₹4,899

**Recommended Global Pricing:**

| Plan | USD | EUR | GBP | INR (Razorpay) |
|------|-----|-----|-----|----------------|
| 1 Week | $9.99 | €9.99 | £7.99 | ₹899 |
| 1 Month | $19.99 | €19.99 | £15.99 | ₹1,699 |
| 3 Months | $49.99 | €49.99 | £39.99 | ₹3,499 |
| 6 Months | $79.99 | €79.99 | £59.99 | ₹4,899 |

**Update:** `server/src/config/subscriptionPlans.js` to support multiple currencies.

---

## 🔧 Configuration

### Environment Variables

```env
# Payment Gateway Selection
PAYMENT_GATEWAY=auto  # 'stripe', 'razorpay', 'in_app', or 'auto'

# Stripe (Global)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay (India)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# In-App Purchases
IAP_ENABLED=true
```

### Update Subscription Plans Config

Add multi-currency support to `server/src/config/subscriptionPlans.js`:

```javascript
export const SUBSCRIPTION_PLANS = {
  '1month': {
    id: '1month',
    name: '1 Month Premium',
    duration: 30,
    prices: {
      USD: 1999, // $19.99 in cents
      EUR: 1999, // €19.99 in cents
      GBP: 1599, // £15.99 in pence
      INR: 1699, // ₹1,699 in paise
    },
    currency: 'USD', // Default
    // ... rest
  },
};
```

---

## ✅ Recommended Setup for Global App

### Phase 1: Launch (Minimum)
1. ✅ **Stripe** - For web and global users
2. ✅ **In-App Purchases** - For iOS/Android apps

### Phase 2: Expansion
3. ✅ **Razorpay** - For Indian users (better local payment methods)

### Phase 3: Optimization
4. ✅ Add more regional gateways if needed (PayPal, etc.)

---

## 📊 Current Implementation Status

✅ **Multi-gateway detection** - Implemented
✅ **Stripe support** - Ready (needs SDK integration)
✅ **Razorpay support** - Ready (needs SDK integration)
✅ **In-App Purchase support** - Ready (needs SDK integration)
✅ **Auto-gateway selection** - Implemented
✅ **Refund processing** - Ready for all gateways

---

## 🚀 Quick Start

### For Global Launch:

1. **Set up Stripe:**
   ```bash
   npm install stripe
   # Add STRIPE_SECRET_KEY to .env
   ```

2. **Set up In-App Purchases:**
   ```bash
   npm install react-native-iap
   # Configure in App Store Connect / Play Console
   ```

3. **Update payment service:**
   - Uncomment Stripe code
   - Configure webhooks
   - Test payment flow

4. **For India (optional):**
   ```bash
   npm install razorpay
   # Add RAZORPAY_KEY_ID to .env
   ```

---

## 📝 Summary

**For a global app:**
- ✅ **Use Stripe** as primary (global, 135+ currencies)
- ✅ **Add Razorpay** for India (better local payment methods)
- ✅ **Use In-App Purchases** for mobile apps (required by stores)
- ✅ **Auto-detect** gateway based on user location/currency

**Razorpay alone is NOT sufficient** for a global app - it's India-only. Use Stripe for global reach!

