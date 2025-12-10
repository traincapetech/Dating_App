import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String },
  mediaUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false }
});

export default mongoose.model("Message", MessageSchema);
