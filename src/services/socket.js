// client/src/services/socket.js
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api";

let socket = null;

export const initSocket = (userId = null) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      
      // Authenticate if userId is provided
      if (userId) {
        socket.emit("authenticate", { userId });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.log("🔌 Socket connection error:", error.message);
    });

    socket.on("error", (error) => {
      console.log("🔌 Socket error:", error);
    });
  } else if (userId && socket.connected) {
    // Re-authenticate if already connected
    socket.emit("authenticate", { userId });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper functions for common socket operations
export const joinChatRoom = (matchId, userId) => {
  if (socket) {
    socket.emit("joinRoom", { matchId, userId });
  }
};

export const leaveChatRoom = (matchId) => {
  if (socket) {
    socket.emit("leaveRoom", { matchId });
  }
};

export const emitTyping = (matchId, userId) => {
  if (socket) {
    socket.emit("typing", { matchId, userId });
  }
};

export const emitStopTyping = (matchId, userId) => {
  if (socket) {
    socket.emit("stopTyping", { matchId, userId });
  }
};

export const emitMessageSeen = (matchId, userId, messageIds) => {
  if (socket) {
    socket.emit("messageSeen", { matchId, userId, messageIds });
  }
};

export const sendMessageViaSocket = (messageData) => {
  if (socket) {
    socket.emit("sendMessage", messageData);
  }
};
