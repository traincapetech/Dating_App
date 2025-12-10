// client/src/services/socket.js
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api";

let socket;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
  }
  return socket;
};

export const getSocket = () => socket;
