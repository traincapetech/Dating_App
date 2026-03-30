import mongoose from 'mongoose';

/**
 * Notification log model.
 * Stores a record of every broadcast push notification sent via the admin panel.
 * The `data` field is a flexible JSON object so future interaction types don't
 * require schema migrations.
 */
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },

    /**
     * High-level notification category.
     * "timer"   → Live countdown / sale timer push
     * "general" → Standard informational push
     */
    type: {
      type: String,
      enum: ['general', 'timer', 'promo', 'announcement'],
      default: 'general',
    },

    /**
     * Audience selector sent from the admin panel.
     * "all" | "Premium" | "Free" | "custom"
     */
    audience: { type: String, default: 'all' },

    /** Whether this was sent with high-priority FCM flags */
    isHighPriority: { type: Boolean, default: false },

    /**
     * Arbitrary key/value payload forwarded to the mobile client.
     * For type=timer this will contain: { type, endTime, actionText }
     */
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    /** Number of tokens the broadcast was dispatched to */
    recipientCount: { type: Number, default: 0 },

    /** Optional: admin ID who triggered the broadcast */
    sentBy: { type: String },
  },
  { timestamps: true },
);

const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);

export default Notification;
