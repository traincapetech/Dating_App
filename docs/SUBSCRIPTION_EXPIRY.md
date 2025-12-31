# Subscription Expiry & Lifecycle Management

## 🔄 Subscription Lifecycle

### States
1. **Active** - Subscription is active and user has premium access
2. **Cancelled** - User cancelled, but still has access until expiry
3. **Expired** - Subscription period ended, premium revoked
4. **Payment Failed** - Auto-renewal failed, will expire at end of period
5. **Refunded** - Subscription was refunded, premium revoked immediately

---

## ⏰ Expiry Handling

### Automatic Expiry Check

**Cron Job:** `server/src/scripts/subscriptionExpiryCron.js`

**Runs:** Daily at midnight (if node-cron installed)

**What it does:**
1. Checks all active subscriptions
2. Marks expired subscriptions (expiresAt < now) as "expired"
3. Revokes premium status from users
4. Syncs all premium statuses to fix inconsistencies

**Setup Option 1: Using node-cron (Recommended)**
```bash
cd server
npm install node-cron
```

The cron jobs will automatically start when the server starts.

**Setup Option 2: System Cron**
```bash
# Add to crontab
0 0 * * * cd /path/to/project && node server/src/scripts/subscriptionExpiryCron.js
```

**Setup Option 3: Manual Execution**
```bash
# Run manually when needed
node server/src/scripts/subscriptionExpiryCron.js
```

---

## 🚫 Cancellation Handling

### When User Cancels

1. **Subscription Status:** Changes to "cancelled"
2. **Auto-Renewal:** Disabled
3. **Premium Access:** User keeps premium until `expiresAt`
4. **After Expiry:** Premium automatically revoked by expiry cron

**Example:**
- User cancels on Jan 15
- Subscription expires on Jan 30
- User has premium until Jan 30
- On Jan 31, expiry cron revokes premium

---

## ❌ Auto-Renewal Failure Handling

### When Renewal Fails

1. **Subscription Status:** Changes to "payment_failed"
2. **Auto-Renewal:** Disabled
3. **Premium Access:** User keeps premium until `expiresAt`
4. **After Expiry:** Premium automatically revoked

**Failure Reasons:**
- Payment method declined
- Insufficient funds
- Payment gateway error
- Card expired

**User Experience:**
- User notified of payment failure
- Can update payment method
- Subscription expires at end of period if not fixed

---

## ✅ Premium Status Updates

### Automatic Updates

Premium status is automatically updated when:
- ✅ Subscription is created
- ✅ Subscription is extended
- ✅ Subscription expires (via cron or on check)
- ✅ Subscription is cancelled
- ✅ Auto-renewal fails
- ✅ Payment is verified

### Real-Time Expiry Check

**Every time `isUserPremium()` is called:**
1. Checks subscription status
2. Validates expiry date
3. If expired, immediately:
   - Marks subscription as expired
   - Revokes premium status
   - Returns false

**This means:** Even if cron fails, premium is revoked on next check!

---

## 🔒 Protection Against Unlimited Subscriptions

### Multiple Safeguards

1. **Expiry Date Check (Real-Time):**
   - Every `isUserPremium()` call checks `expiresAt`
   - If expired, immediately revokes premium
   - **This prevents unlimited subscriptions even if cron fails**

2. **Daily Expiry Cron:**
   - Runs daily to catch any missed expirations
   - Marks expired subscriptions
   - Revokes premium status
   - Syncs all premium statuses

3. **Status Validation:**
   - Only "active" status grants premium
   - "cancelled", "expired", "payment_failed" don't grant premium
   - Status is checked on every premium check

4. **Premium Status Sync:**
   - `updateUserPremiumStatus()` ensures consistency
   - Called on every subscription change
   - Validates expiry date

5. **Cancellation Handling:**
   - Cancelled subscriptions expire at `expiresAt`
   - Auto-renewal disabled on cancellation
   - Premium revoked when expiry date passes

---

## 📋 Subscription Status Flow

```
ACTIVE → (expiresAt passes) → EXPIRED → Premium Revoked
  ↓
  (user cancels)
  ↓
CANCELLED → (expiresAt passes) → EXPIRED → Premium Revoked

ACTIVE → (auto-renewal fails) → PAYMENT_FAILED → (expiresAt passes) → EXPIRED → Premium Revoked
```

---

## 🛠️ Implementation Details

### Key Functions

**`isUserPremium(userId)`**
- Checks subscription status
- Validates expiry date in real-time
- Auto-updates expired subscriptions
- Revokes premium if expired
- Returns false if expired or not active
- **This is the primary safeguard against unlimited subscriptions**

**`processExpiredSubscriptions()`**
- Finds all expired subscriptions
- Marks them as expired
- Revokes premium status
- Returns list of expired subscriptions
- Called by daily cron

**`updateUserPremiumStatus(userId)`**
- Syncs user's premium status with subscription
- Grants premium if subscription is active and not expired
- Revokes premium if subscription is expired/cancelled
- Called on every subscription change

**`handleSubscriptionCancellation(subscriptionId, reason)`**
- Marks subscription as cancelled
- Disables auto-renewal
- Keeps premium until expiry
- Premium revoked when expiry date passes

**`handleRenewalFailure(subscriptionId, reason)`**
- Marks subscription as payment_failed
- Disables auto-renewal
- Keeps premium until expiry
- Premium revoked when expiry date passes

---

## 🧪 Testing

### Test Expiry

```bash
# Create test subscription
POST /api/subscription/create
{
  "userId": "user123",
  "planId": "1week",
  "paymentMethod": "test"
}

# Manually expire (for testing)
# Set expiresAt to past date in database

# Check premium status - should auto-expire
GET /api/subscription/status/user123
# Should return isPremium: false (expired automatically)

# Or run expiry cron
node server/src/scripts/subscriptionExpiryCron.js
```

### Test Cancellation

```bash
# Cancel subscription
POST /api/subscription/cancel/:subscriptionId
{
  "userId": "user123"
}

# Check status - should still be premium until expiry
GET /api/subscription/status/user123
# isPremium: true (until expiresAt)

# After expiresAt passes, check again
# isPremium: false (automatically revoked)
```

### Test Renewal Failure

```bash
# Simulate payment failure in renewal service
# Subscription should be marked as payment_failed
# Premium should remain until expiry
# After expiry, premium automatically revoked
```

---

## ⚠️ Important Notes

1. **Real-Time Expiry Check:**
   - `isUserPremium()` validates expiry on EVERY call
   - Even if cron fails, premium is revoked on next check
   - **This is the primary protection against unlimited subscriptions**

2. **Expiry Cron is Backup:**
   - Runs daily to catch any edge cases
   - Syncs all premium statuses
   - Not critical because of real-time checks

3. **Cancelled Subscriptions:**
   - Remain active until expiry
   - User keeps premium until end of period
   - This is standard practice (like Netflix, Spotify)

4. **Payment Failures:**
   - User is notified
   - Can update payment method
   - Subscription expires if not fixed
   - Premium revoked at expiry

5. **No Unlimited Subscriptions:**
   - ✅ Expiry date is checked on every premium check
   - ✅ Status must be "active" for premium
   - ✅ Daily cron expires subscriptions
   - ✅ Multiple safeguards prevent unlimited access

---

## 📊 Monitoring

### Key Metrics to Monitor

- Number of expired subscriptions per day
- Number of payment failures
- Premium status inconsistencies
- Cron job execution status

### Alerts

Set up alerts for:
- Expiry cron not running (but not critical due to real-time checks)
- High number of payment failures
- Premium status sync issues

---

## ✅ Summary

**Subscriptions CANNOT run unlimited:**
- ✅ **Real-time expiry check** on every `isUserPremium()` call
- ✅ Expiry date is always validated
- ✅ Daily cron expires subscriptions (backup)
- ✅ Premium status is validated on every check
- ✅ Cancelled subscriptions expire at end of period
- ✅ Payment failures result in expiry
- ✅ Multiple safeguards prevent unlimited access

**All scenarios are handled:**
- ✅ Subscription expiry → Premium revoked immediately on check
- ✅ Cancellation → Expires at end of period
- ✅ Auto-renewal failure → Expires at end of period
- ✅ Premium status always synced
- ✅ No way for subscriptions to run unlimited

**Critical Protection:**
The `isUserPremium()` function checks expiry date in real-time. Even if the cron job fails, premium is automatically revoked the next time the system checks. This is the primary safeguard against unlimited subscriptions.
