# 📁 Photo-Based Social Interaction System: Final Architectural Blueprint (v4)

This final version incorporates **Micro-Fixes for production robustness**, covering idempotency, strict ordering, memory management, and rate limiting.

---

## 1. 🏗️ Backend Architecture & Hardened Data Model

### 🧩 Data Model: `PhotoInteraction`
Optimized for high-cardinality social engagement data.

```javascript
// Model: PhotoInteraction
{
  senderId: ObjectId,       
  targetUserId: ObjectId,   
  photoId: String,          // DETERMINISTIC: Same hash/ID across all screens
  photoUrl: String,         // FALLBACK: Stable CDN URL
  type: String,             // Enum: ['like', 'comment']
  text: String,             
  createdAt: Date
}
```

### ❗ Database & Transactional Integrity
1.  **❗ Atomic Toggle Idempotency**: To prevent state drift from rapid-taps, use `findOneAndUpdate` for likes:
    ```javascript
    // Like logic
    const existing = await PhotoInteraction.findOneAndDelete({ senderId, photoId, type: 'like' });
    if (!existing) await PhotoInteraction.create({ senderId, photoId, type: 'like', ... });
    ```
2.  **❗ Strict Event Ordering**: When fetching or appending comments, use a tie-breaker for timestamp collisions:
    *   **Spec**: `sort: { createdAt: -1, _id: -1 }`
3.  **Unique Constraints**: Preserve the unique compound index on `{ senderId: 1, photoId: 1, type: 1 }`.

---

## 2. 🔌 API Layer, Security & Rate Limiting

### ❗ Social Anti-Abuse (Rate Limiting)
Prevent comment-spamming at the route level using the existing rate-limiter infrastructure:
*   **Rule**: `max: 10 comments / minute / user` for the `/photo-social/comment` endpoint.

### ❗ Authorization & API Guards
*   **Encapsulation**: `if (req.user.id !== targetUserId) { comments = comments.map(c => ({ ...c, text: null })); }`
*   **Privacy**: This ensures the content is never leaked via direct REST calls, while the counts remain public.

---

## 3. ⚡ Real-Time Strategy: "Social Sync Engine"

### Room Design: `profile_social:${targetUserId}`
Consistent room joining/leaving strategy across `HomeScreen` (Modal) and `UserProfileViewScreen`.

### ❗ Granular Socket Payloads
The backend now emits an **Action Identifier** to allow the frontend to perform targeted state patches:
```json
{
  "action": "liked" | "unliked" | "commented", // 👈 Granular action for UI logic
  "photoId": "f78a...",
  "type": "like",
  "counts": {
    "likes": 501, 
    "comments": 24
  }
}
```

---

## 4. 🧠 Frontend Memory & Interaction Management

### ❗ Safe Memory Lifecycle
Ensure high-performance cleanup in the `usePhotoSocial(targetUserId)` hook:
*   **Cleanup Phase**: 
    1. `socket.off("photo:interaction")`: Kill the specific listener.
    2. `socket.leave(room)`: Exit the profile social room.
*   **Result**: No duplicate state updates or memory leaks across navigation cycles.

### ❗ Deterministic Identity Strategy
*   **photoId**: Must be consistent. If the backend doesn't provide it, use `hash(photoUrl)` to ensure the Heart icon on the `HomeScreen` represents the same social data as the one in the `UserProfileViewScreen` gallery.

---

## 5. 🎯 Implementation Roadmap (Final)

| File Path | Status | Task |
| :--- | :--- | :--- |
| `server/src/models/PhotoInteraction.js` | **NEW** | Added indices + Deterministic ID handling. |
| `server/src/controllers/photoSocial.js` | **NEW** | **Atomic Toggle** + Aggregation + **Rate Limiting**. |
| `server/src/routes/photoSocialRoutes.js` | **NEW** | Guarded routes with social authorization logic. |
| `src/hooks/usePhotoSocial.js` | **NEW** | Implements **Safe Memory Cleanup** + Local Cache. |
| `src/components/profile/PhotoInteractionViewer.jsx`| **MOD** | **Tie-Breaker Sort** for comment ordering. |

---

## 🚀 Final Scalability Decisions
*   **Notification Spacing**: Group notifications into summaries (debounced) to maintain engagement without fatigue.
*   **Database Scaling**: Cursor-based pagination is mandatory to prevent O(N) memory pressure on the node process.

---

## 🧭 Final Decision Record
*   **Swipe Engine**: **100% ISOLATED**. No side-effects on Match creation.
*   **Data Integrity**: **ATOMIC**. Toggles and Counts are backend-authoritative.
*   **Privacy**: **STRICT**. Social comments are owner-eyes-only by default.
